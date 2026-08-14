-- Projetos (espelha projects.data.js + projects.en.js) e registro de midia.

-- FORMATO DAS CHAVES DE FILTRO ----------------------------------------------
-- O plano escreve esta regra direto dentro do CHECK de projects_groups_ok, com um
-- "not exists (select ... from unnest(groups))". O Postgres RECUSA subquery em check
-- constraint (0A000), entao o predicado tem que morar numa funcao immutable, que e
-- exatamente o que i18n_lista_valida ja faz com o mesmo tipo de varredura em 0002.
-- A regra em si nao muda: chave de filtro e slug minusculo, no maximo 32 caracteres.
create or replace function myportifolio.grupos_validos(p_groups text[]) returns boolean
language sql immutable as $$
  select not exists (select 1 from unnest(p_groups) g
                     where g !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or char_length(g) > 32);
$$;
-- Mesma razao de 0007: o Postgres concede EXECUTE a PUBLIC por padrao, e quem precisa
-- avaliar o CHECK e so quem escreve na tabela.
revoke execute on function myportifolio.grupos_validos(text[]) from public, anon;
grant execute on function myportifolio.grupos_validos(text[]) to authenticated;

create table if not exists myportifolio.portfolio_projects (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid not null references myportifolio.portfolios(id) on delete cascade,

  slug text not null,
  name_i18n jsonb not null default '{"pt": ""}'::jsonb,
  client text,
  category_i18n jsonb not null default '{"pt": ""}'::jsonb,
  year text,

  -- accent e plate_bg por projeto tambem sao do bump has_custom (secao 6.10), guardados
  -- pelo trigger portfolio_projects_guarda mais abaixo.
  accent text not null default '#7C5CFC',
  plate_bg text not null default '#0b0b12',
  image_fit text not null default 'contain' check (image_fit in ('cover','contain')),
  image_path text,
  image_mime text,   -- canvas.toBlob cai em image/png em silencio: nunca confiar na extensao

  -- Guarda o ID de 11 caracteres, nao a URL.
  youtube_id text,
  youtube_orientation text check (youtube_orientation in ('horizontal','portrait')),

  tagline_i18n jsonb not null default '{"pt": ""}'::jsonb,
  -- summary NAO e renderizado por nenhum componente hoje (conferido por grep). Continua
  -- no schema porque e o texto certo para og:description por case, mas fica fora do
  -- payload publico e fora do editor na v1.
  summary_i18n jsonb,
  problem_i18n jsonb,
  solution_i18n jsonb,
  features_i18n jsonb not null default '{"pt": []}'::jsonb,
  stack_i18n    jsonb not null default '{"pt": []}'::jsonb,

  link_url text,
  link_note_i18n jsonb,

  groups text[] not null default '{}',

  position integer not null default 0,
  is_visible boolean not null default true,
  is_sample  boolean not null default false,
  en_status  text check (en_status in ('auto','human')),

  has_video boolean generated always as (youtube_id is not null and youtube_id <> '') stored,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint projects_slug_unico unique (portfolio_id, slug),
  constraint projects_slug_formato check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
                                          and char_length(slug) between 2 and 60),
  constraint projects_name_ok     check (myportifolio.i18n_texto_valido(name_i18n, 60)),
  constraint projects_client_ok   check (client is null or char_length(client) <= 60),
  constraint projects_category_ok check (myportifolio.i18n_texto_valido(category_i18n, 40)),
  constraint projects_year_ok     check (year is null or year ~ '^[0-9]{4}(-[0-9]{4})?$'),
  -- accent e plate_bg entram CRUS em style="..." no template. Sem este check,
  -- "red; background: url(...)" e injecao de CSS num portfolio no nosso dominio.
  constraint projects_accent_ok   check (myportifolio.cor_hex_valida(accent)),
  constraint projects_plate_ok    check (myportifolio.cor_hex_valida(plate_bg)),
  constraint projects_youtube_ok  check (youtube_id is null or youtube_id ~ '^[A-Za-z0-9_-]{11}$'),
  constraint projects_tagline_ok  check (myportifolio.i18n_texto_valido(tagline_i18n, 280)),
  constraint projects_summary_ok  check (myportifolio.i18n_texto_valido(summary_i18n, 700)),
  constraint projects_problem_ok  check (myportifolio.i18n_texto_valido(problem_i18n, 2500)),
  constraint projects_solution_ok check (myportifolio.i18n_texto_valido(solution_i18n, 2500)),
  constraint projects_features_ok check (myportifolio.i18n_lista_valida(features_i18n, 12, 200)),
  constraint projects_stack_ok    check (myportifolio.i18n_lista_valida(stack_i18n, 16, 60)),
  constraint projects_link_ok     check (myportifolio.url_https_valida(link_url)),
  constraint projects_note_ok     check (myportifolio.i18n_texto_valido(link_note_i18n, 40)),
  constraint projects_groups_ok   check (
    coalesce(array_length(groups, 1), 0) <= 4
    and myportifolio.grupos_validos(groups)),
  -- ACHADO 17: confinamento na pasta do tenant.
  constraint projects_image_ok check (
    image_path is null or (myportifolio.media_path_valido(image_path)
                           and image_path like portfolio_id::text || '/%'))
);

create index if not exists portfolio_projects_pf_idx on myportifolio.portfolio_projects (portfolio_id, position);
create trigger portfolio_projects_set_updated_at before update on myportifolio.portfolio_projects
  for each row execute function myportifolio.set_updated_at();

-- Guarda do bump no nivel do projeto: sem has_custom, a cor do card nao muda. Mesma regra
-- do guarda de portfolios (0002): a marca de transacao e a unica porta de fuga, e a
-- pergunta e sobre o dono da linha, nao sobre quem esta logado.
create or replace function myportifolio.portfolio_projects_guarda_colunas() returns trigger
language plpgsql security definer set search_path = myportifolio, public as $$
begin
  if myportifolio.em_operacao_confiavel() then return new; end if;
  if (new.accent is distinct from old.accent
      or new.plate_bg is distinct from old.plate_bg)
     and not myportifolio.portfolio_tem_custom(new.portfolio_id) then
    raise exception 'personalizacao nao liberada nesta conta';
  end if;
  return new;
end;
$$;
create trigger portfolio_projects_guarda before update on myportifolio.portfolio_projects
  for each row execute function myportifolio.portfolio_projects_guarda_colunas();

-- MIDIA --------------------------------------------------------------------
-- ACHADO 7: esta tabela deixa de ser preenchida pelo front. O front nao informa mais
-- "bytes", porque o front mentia: inserir bytes = 1 para um arquivo de 2 MB derrubava
-- a cota inteira. Agora a linha e criada por trigger sobre storage.objects, lendo o
-- tamanho REAL que o storage gravou em metadata.
create table if not exists myportifolio.portfolio_media (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid not null references myportifolio.portfolios(id) on delete cascade,
  path text not null unique,
  kind text not null check (kind in ('avatar','hero','project')),
  bytes bigint not null check (bytes > 0),
  mime text,
  -- Orfao e arquivo que perdeu o dono logico (o projeto foi apagado) mas continua no
  -- bucket ocupando byte e servindo egress. orphan_since e a data em que ele virou
  -- orfao, e e o que a faxina le: sem ela, "faxina de orfao" nao tem criterio.
  is_orphan boolean not null default false,
  orphan_since timestamptz,
  created_at timestamptz not null default now(),
  -- Nome enderecado por conteudo e obrigatorio, nao recomendacao: o cache de asset
  -- aplica immutable de 1 ano, e ja houve incidente de cache envenenado neste projeto
  -- por trocar o conteudo mantendo o nome (tasks/lessons.md, memoria do projeto).
  constraint media_path_com_hash check (path ~ '-[0-9a-f]{8,}\.[a-z]{3,4}$'),
  constraint media_path_ok check (myportifolio.media_path_valido(path)
                                  and path like portfolio_id::text || '/%')
);
create index if not exists portfolio_media_pf_idx on myportifolio.portfolio_media (portfolio_id);

-- COTAS --------------------------------------------------------------------
-- Resolve a cota do dono do portfolio. Falha fechada: sem linha em member_access,
-- cai na cota 'padrao'.
create or replace function myportifolio.quota_do_portfolio(p_portfolio_id uuid)
returns myportifolio.quotas language sql security definer set search_path = myportifolio, public stable as $$
  -- 'select q' e nao 'select q.*': a funcao devolve UMA linha da tabela quotas, e
  -- subquery escalar so aceita uma coluna. O 'q' sozinho e a linha inteira como valor
  -- composto do tipo myportifolio.quotas, que e exatamente o que o returns pede.
  select coalesce(
    (select q from myportifolio.portfolios pf
       join myportifolio.member_access ma on ma.email = pf.owner_email
       join myportifolio.quotas q on q.code = ma.quota_code
      where pf.id = p_portfolio_id),
    (select q from myportifolio.quotas q where q.code = 'padrao'));
$$;
revoke execute on function myportifolio.quota_do_portfolio(uuid) from public, anon, authenticated;

-- Trigger e nao "with check" de RLS porque contar linhas dentro de policy roda a cada
-- avaliacao e nao devolve mensagem util. Aqui o erro sobe com o numero do teto, que e
-- o que o editor mostra na tela.
create or replace function myportifolio.enforce_project_limit() returns trigger
language plpgsql security definer set search_path = myportifolio, public as $$
declare v_max int; v_count int;
begin
  select (myportifolio.quota_do_portfolio(new.portfolio_id)).max_projects into v_max;
  select count(*) into v_count from myportifolio.portfolio_projects where portfolio_id = new.portfolio_id;
  if v_count >= v_max then
    raise exception 'limite atingido: maximo de % projetos', v_max;
  end if;
  return new;
end;
$$;
create trigger portfolio_projects_limite before insert on myportifolio.portfolio_projects
  for each row execute function myportifolio.enforce_project_limit();

-- COTA DE MIDIA APLICADA ONDE O CLIENTE NAO CONTROLA ------------------------
-- ACHADO 7, o coracao da correcao. A policy de INSERT em storage.objects so sabe
-- checar pasta e entitlement. Quem sabe o tamanho e o proprio storage, em
-- metadata->>'size', DEPOIS que o objeto entrou. Este trigger le esse numero,
-- soma a cota do tenant e levanta excecao acima do teto, o que aborta a transacao
-- do upload.
--
-- Dispara em INSERT e em UPDATE OF metadata porque o momento em que metadata fica
-- preenchido depende do tipo de upload (suposicao S9).
--
-- LIMITACAO CONHECIDA, escrita de proposito (suposicao S10): abortar o INSERT impede a
-- linha de metadados de existir, mas os bytes ja podem ter subido para o backing store.
-- Por isso o file_size_limit do bucket (0005) continua sendo a primeira barreira, e
-- este trigger e a segunda. Se S10 falhar, o plano B e a Edge Function media-upload.
--
-- ANTES DO COMPORTAMENTO, A PERMISSAO (suposicao S20): storage.objects pertence a
-- supabase_storage_admin, e criar trigger nela exige privilegio na tabela. S10 assume o que
-- o trigger FAZ; S20 assume que ele PODE SER CRIADO. Primeiro comando depois de aplicar
-- esta migration:
--   select tgname from pg_trigger where tgrelid = 'storage.objects'::regclass;
-- Se voltar vazio, a cota deste arquivo nao existe em producao e o entregavel 7 da fase 1
-- vira a Edge Function media-upload, com o cliente perdendo o insert direto no Storage.
create or replace function myportifolio.storage_registrar_midia() returns trigger
language plpgsql security definer set search_path = myportifolio, public, storage as $$
declare
  v_folder text := (storage.foldername(new.name))[1];
  v_tipo   text := (storage.foldername(new.name))[2];
  v_pf uuid; v_bytes bigint; v_max bigint; v_max_files int;
  v_total bigint; v_files int;
begin
  if new.bucket_id <> 'portfolio-media' then return new; end if;

  -- COTA QUE FALHA FECHADA. A versao anterior fazia "if v_bytes is null then return new",
  -- ou seja, se a suposicao S9 cair para o lado de "metadata vem nulo no INSERT", TODO
  -- upload passava sem contabilidade nenhuma, em silencio, e a cota virava enfeite. Agora
  -- o ramo nulo conta o PIOR CASO possivel, que e o file_size_limit do proprio bucket
  -- (0005), e o UPDATE OF metadata corrige para o tamanho real quando ele chegar. Um
  -- upload nunca deixa de contar: no maximo conta demais por alguns milissegundos.
  v_bytes := nullif(new.metadata ->> 'size', '')::bigint;
  if v_bytes is null then
    select b.file_size_limit into v_bytes from storage.buckets b where b.id = new.bucket_id;
    if v_bytes is null then
      raise exception 'bucket sem file_size_limit: nao da para aplicar cota com seguranca';
    end if;
  end if;

  select p.id into v_pf from myportifolio.portfolios p where p.id::text = v_folder;
  if v_pf is null then
    raise exception 'caminho fora de qualquer portfolio: %', new.name;
  end if;
  if v_tipo not in ('avatar','hero','project') then
    raise exception 'tipo de midia invalido no caminho: %', coalesce(v_tipo, '(vazio)');
  end if;

  select (myportifolio.quota_do_portfolio(v_pf)).max_media_bytes,
         (myportifolio.quota_do_portfolio(v_pf)).max_media_files
    into v_max, v_max_files;

  -- ORFAO CONTA. Excluir is_orphan da soma dava cota infinita em laco: subir ate o teto,
  -- apagar os projetos (o que so MARCA a midia como orfa, sem tirar nada do bucket),
  -- subir de novo, repetir. O sum voltava a zero a cada rodada e os arquivos continuavam
  -- no bucket, publicos, servindo egress, que e exatamente o risco R4. Byte ocupado conta
  -- ate a faxina levar o arquivo, e a faxina e entregavel da fase 1 por causa disto.
  select coalesce(sum(m.bytes), 0), count(*) into v_total, v_files
  from myportifolio.portfolio_media m
  where m.portfolio_id = v_pf and m.path <> new.name;

  if v_total + v_bytes > v_max then
    raise exception 'cota de midia excedida: % de % bytes', v_total + v_bytes, v_max;
  end if;
  if v_files + 1 > v_max_files then
    raise exception 'limite de arquivos atingido: maximo de %', v_max_files;
  end if;

  insert into myportifolio.portfolio_media (portfolio_id, path, kind, bytes, mime)
  values (v_pf, new.name, v_tipo, v_bytes, new.metadata ->> 'mimetype')
  on conflict (path) do update set
    bytes = excluded.bytes, mime = excluded.mime,
    is_orphan = false, orphan_since = null;

  return new;
end;
$$;
create trigger storage_objects_registra_midia
  after insert or update of metadata on storage.objects
  for each row execute function myportifolio.storage_registrar_midia();

-- Apagar o objeto tira a linha: sem isto a cota nunca desce e o cliente fica preso.
create or replace function myportifolio.storage_remover_midia() returns trigger
language plpgsql security definer set search_path = myportifolio, public as $$
begin
  if old.bucket_id = 'portfolio-media' then
    delete from myportifolio.portfolio_media where path = old.name;
  end if;
  return old;
end;
$$;
create trigger storage_objects_remove_midia after delete on storage.objects
  for each row execute function myportifolio.storage_remover_midia();

-- Apagar o projeto nao apaga o arquivo: marca como orfao para um job de faxina levar
-- depois. Apagar de dentro do trigger seria chamada externa dentro de transacao.
create or replace function myportifolio.marcar_midia_orfa() returns trigger
language plpgsql security definer set search_path = myportifolio, public as $$
begin
  if old.image_path is not null then
    update myportifolio.portfolio_media
    set is_orphan = true, orphan_since = coalesce(orphan_since, now())
    where portfolio_id = old.portfolio_id and path = old.image_path;
  end if;
  return old;
end;
$$;
create trigger portfolio_projects_midia_orfa after delete on myportifolio.portfolio_projects
  for each row execute function myportifolio.marcar_midia_orfa();

-- FAXINA DE ORFAO, FASE 1 E NAO FASE 2 --------------------------------------
-- Enquanto o arquivo orfao continuar no bucket ele ocupa cota (a soma acima conta orfao)
-- e serve egress. Sem esta faxina, a cota do cliente honesto encolhe sozinha a cada
-- projeto apagado, e o abusador deixa lixo publico de graca. O prazo de 24 horas existe
-- porque apagar um projeto e a acao mais arrependivel do editor.
--
-- p_portfolio_id serve ao caminho de takedown (5.8), que precisa de purga IMEDIATA e
-- limitada a um tenant. Apagar a linha de storage.objects dispara storage_remover_midia(),
-- que limpa portfolio_media. Se a suposicao S17 cair, este DELETE vira chamada da API de
-- Storage numa Edge Function, e a assinatura desta funcao nao muda.
create or replace function myportifolio.purgar_midia_orfa(
  p_idade interval default interval '24 hours',
  p_portfolio_id uuid default null)
returns int language plpgsql security definer set search_path = myportifolio, public, storage as $$
declare v_n int;
begin
  delete from storage.objects o
  using myportifolio.portfolio_media m
  where o.bucket_id = 'portfolio-media'
    and o.name = m.path
    and m.is_orphan
    and coalesce(m.orphan_since, m.created_at) < now() - p_idade
    and (p_portfolio_id is null or m.portfolio_id = p_portfolio_id);
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;
revoke execute on function myportifolio.purgar_midia_orfa(interval, uuid)
  from public, anon, authenticated;

select cron.schedule('faxina-midia-orfa', '41 3 * * *', $$
  select myportifolio.purgar_midia_orfa(interval '24 hours');
$$);

-- RLS ----------------------------------------------------------------------
alter table myportifolio.portfolio_projects enable row level security;
alter table myportifolio.portfolio_media enable row level security;
revoke all on myportifolio.portfolio_projects, myportifolio.portfolio_media from anon;

grant select, insert, update, delete on myportifolio.portfolio_projects to authenticated;
-- ACHADO 7: o cliente LE a propria midia (o editor precisa listar e mostrar a barra de
-- cota) mas NAO insere nem escreve bytes. Quem cria a linha e o trigger sobre
-- storage.objects, que le o tamanho real.
grant select on myportifolio.portfolio_media to authenticated;
revoke insert, update, delete on myportifolio.portfolio_media from authenticated;

-- has_active_access() pergunta pelo comprador LOGADO, e quem monta o portfolio de um
-- comprador de facilitacao nao e ele. owns_portfolio ja aceita a concessao de escopo, e
-- portfolio_tem_acesso_ativo pergunta pelo dono da linha, que e a pergunta certa nos dois
-- casos: para o comprador editando o proprio portfolio as duas dao a mesma resposta.
create policy "dono le projetos" on myportifolio.portfolio_projects for select to authenticated
  using (myportifolio.owns_portfolio(portfolio_id));
create policy "dono insere projetos" on myportifolio.portfolio_projects for insert to authenticated
  with check (myportifolio.owns_portfolio(portfolio_id)
              and myportifolio.portfolio_tem_acesso_ativo(portfolio_id));
create policy "dono atualiza projetos" on myportifolio.portfolio_projects for update to authenticated
  using (myportifolio.owns_portfolio(portfolio_id))
  with check (myportifolio.owns_portfolio(portfolio_id)
              and myportifolio.portfolio_tem_acesso_ativo(portfolio_id));
create policy "dono deleta projetos" on myportifolio.portfolio_projects for delete to authenticated
  using (myportifolio.owns_portfolio(portfolio_id));
-- Admin le, e so. Escrita de operador entra pelas policies acima, que exigem concessao
-- viva: "ser admin" nunca e, sozinho, permissao de escrever na tabela de um cliente.
create policy "admin le todos os projetos" on myportifolio.portfolio_projects for select
  to authenticated using (myportifolio.is_admin());

create policy "dono le a propria midia" on myportifolio.portfolio_media for select to authenticated
  using (myportifolio.owns_portfolio(portfolio_id));
create policy "admin le toda a midia" on myportifolio.portfolio_media for select
  to authenticated using (myportifolio.is_admin());
