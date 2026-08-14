-- Experiencia (espelha experience.data.js + experience.en.js), bucket de documento e o
-- certificado. Roda DEPOIS de 0006.

-- PERIODO -------------------------------------------------------------------
-- O repo guarda o periodo como rotulo ('2025' ou '03/2025') e imprime literal, e o produto
-- mantem isso. Coluna date obrigaria o comprador a informar um DIA que ele nao lembra, e
-- todo mundo escolheria o dia 1, o que e dado falso com cara de dado preciso. Entao o
-- rotulo continua sendo o dado, e a comparacao vira chave derivada 'AAAAMM': e ela que
-- permite um CHECK dizer "o fim veio antes do inicio" em vez de deixar isso para o front.
-- period_end NULO significa ATUAL, e esse e o unico significado dele.
create or replace function myportifolio.periodo_valido(p_valor text) returns boolean
language sql immutable as $$
  select p_valor is null or p_valor ~ '^([0-9]{4}|(0[1-9]|1[0-2])/[0-9]{4})$';
$$;

-- p_fim existe porque ano solto significa coisas diferentes nas duas pontas: '2024' como
-- inicio e o comeco de 2024, como fim e o fim de 2024. Sem isso, "03/2024 a 2024" seria
-- recusado como fim antes do inicio, que e uma linha de curriculo perfeitamente normal.
create or replace function myportifolio.periodo_chave(p_valor text, p_fim boolean default false)
returns text language sql immutable as $$
  select case
    when p_valor is null then null
    when p_valor ~ '^[0-9]{4}$' then p_valor || case when p_fim then '12' else '01' end
    else substr(p_valor, 4, 4) || substr(p_valor, 1, 2)
  end;
$$;
-- Regra do fim de 4.8, aplicada tambem a validador: o Postgres concede EXECUTE a PUBLIC
-- por padrao e o PostgREST expoe qualquer funcao de public como /rpc/<nome>. Quem escreve
-- na tabela e authenticated, e e so ele que precisa avaliar o CHECK.
revoke execute on function myportifolio.periodo_valido(text) from public, anon;
revoke execute on function myportifolio.periodo_chave(text, boolean) from public, anon;
grant execute on function myportifolio.periodo_valido(text) to authenticated;
grant execute on function myportifolio.periodo_chave(text, boolean) to authenticated;

create table if not exists myportifolio.portfolio_experiences (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid not null references myportifolio.portfolios(id) on delete cascade,

  slug text not null,
  org text not null,
  -- 'work' e trabalho, 'education' cobre faculdade, curso e certificacao. E o mesmo par
  -- que experience.data.js ja usa, e o render decide o selo de formacao por ele.
  kind text not null default 'work' check (kind in ('work','education')),
  role_i18n jsonb not null default '{"pt": ""}'::jsonb,

  period_start text not null,
  period_end   text,
  location_i18n jsonb,

  logo_path text,
  logo_mime text,   -- mesma razao de projects.image_mime: nunca confiar na extensao
  -- Cor da placa atras da logo. E do bump has_custom, igual a plate_bg dos projetos, e
  -- guardada pelo trigger portfolio_experiences_guarda mais abaixo.
  plate_bg text not null default '#0b0b12',

  highlights_i18n jsonb not null default '{"pt": []}'::jsonb,
  note_i18n jsonb,

  certificate_path text,
  certificate_mime text,
  certificate_label_i18n jsonb,
  -- CONSENTIMENTO, e nao preferencia de layout. Certificado e documento pessoal: diploma,
  -- declaracao e certificado de curso costumam trazer nome completo, CPF, data de
  -- nascimento e assinatura. Enquanto isto for falso o arquivo existe, conta cota e e
  -- legivel pelo dono, e NAO aparece em lugar nenhum publico, nem como caminho. Quem liga
  -- e so o titular, nunca o operador do bump de facilitacao (trigger de guarda abaixo).
  certificate_public boolean not null default false,

  position integer not null default 0,
  is_visible boolean not null default true,
  is_sample  boolean not null default false,
  en_status  text check (en_status in ('auto','human')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint experiences_slug_unico unique (portfolio_id, slug),
  constraint experiences_slug_formato check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
                                             and char_length(slug) between 2 and 60),
  constraint experiences_org_ok       check (char_length(org) between 1 and 60),
  constraint experiences_role_ok      check (myportifolio.i18n_texto_valido(role_i18n, 80)),
  constraint experiences_local_ok     check (myportifolio.i18n_texto_valido(location_i18n, 60)),
  constraint experiences_destaques_ok check (myportifolio.i18n_lista_valida(highlights_i18n, 6, 300)),
  constraint experiences_nota_ok      check (myportifolio.i18n_texto_valido(note_i18n, 700)),
  -- plate_bg entra CRU em style="..." no template da placa, igual ao dos projetos.
  constraint experiences_plate_ok     check (myportifolio.cor_hex_valida(plate_bg)),
  constraint experiences_inicio_ok    check (myportifolio.periodo_valido(period_start)),
  constraint experiences_fim_ok       check (myportifolio.periodo_valido(period_end)),
  constraint experiences_ordem_ok     check (period_end is null
    or myportifolio.periodo_chave(period_end, true) >= myportifolio.periodo_chave(period_start)),
  -- ACHADO 17 outra vez, agora em dois arquivos por linha. media_path_valido ja recusa
  -- ':', '//' inicial e segmento '.' ou '..'; o like e o confinamento na pasta do tenant.
  constraint experiences_logo_ok check (
    logo_path is null or (myportifolio.media_path_valido(logo_path)
                          and logo_path like portfolio_id::text || '/%')),
  constraint experiences_cert_ok check (
    certificate_path is null or (myportifolio.media_path_valido(certificate_path)
                                 and certificate_path like portfolio_id::text || '/%')),
  constraint experiences_cert_mime_ok check (
    certificate_path is null
    or certificate_mime in ('application/pdf','image/webp','image/png','image/jpeg')),
  constraint experiences_cert_label_ok check (myportifolio.i18n_texto_valido(certificate_label_i18n, 40)),
  -- Consentimento sem arquivo e flag ligada apontando para o nada, e e o estado que faz o
  -- payload publicar 'certificatePath': null e o front desenhar um botao morto.
  constraint experiences_cert_consentimento check (
    not certificate_public or certificate_path is not null)
);

create index if not exists portfolio_experiences_pf_idx
  on myportifolio.portfolio_experiences (portfolio_id, position);
create trigger portfolio_experiences_set_updated_at before update on myportifolio.portfolio_experiences
  for each row execute function myportifolio.set_updated_at();

-- TITULAR, QUE NAO E A MESMA PERGUNTA QUE POSSE -----------------------------
-- owns_portfolio() responde "sim" tambem para o operador do bump de facilitacao com
-- concessao viva (0002), e isso e CERTO para montar o portfolio do cliente. E errado para
-- uma coisa so: consentir a exposicao publica de um documento pessoal do cliente. Esta
-- funcao existe exatamente para essa diferenca e nao substitui owns_portfolio em lugar
-- nenhum.
create or replace function myportifolio.eh_titular_do_portfolio(p_portfolio_id uuid) returns boolean
language sql security definer set search_path = myportifolio, public stable as $$
  select exists (select 1 from myportifolio.portfolios p
    where p.id = p_portfolio_id
      and (p.owner_id = (select auth.uid())
        or p.owner_email = (select myportifolio.current_purchase_email())));
$$;
grant execute on function myportifolio.eh_titular_do_portfolio(uuid) to authenticated;
revoke execute on function myportifolio.eh_titular_do_portfolio(uuid) from public, anon;

-- GUARDA DE COLUNA ----------------------------------------------------------
-- Um trigger por tabela, cobrindo bump e coluna protegida, igual ao par que ja existe em
-- portfolios e portfolio_projects. Duas diferencas em relacao ao dos projetos, as duas
-- deliberadas:
--
-- 1. Ele e BEFORE INSERT OR UPDATE, e nao so before update. O guarda dos projetos pode ser
--    so de update porque a unica coisa que ele protege (accent, plate_bg) tambem e
--    NORMALIZADA na saida de montar_payload_portfolio: um valor que entrou no insert sem o
--    bump nunca chega a aparecer na pagina. certificate_public nao tem normalizacao
--    equivalente, porque ele nao e apresentacao, e sim a propria decisao de publicar; um
--    insert ja nasceria com o documento exposto.
-- 2. A pergunta do certificado e eh_titular_do_portfolio, e nao portfolio_tem_custom nem
--    owns_portfolio. Consentimento de expor documento pessoal e do titular, e nao de quem
--    esta montando o portfolio para ele, ainda que a concessao seja legitima e esteja viva.
--    O operador continua podendo SUBIR o certificado (isso e o servico que foi vendido),
--    so nao pode decidir publicar.
--
-- A porta de fuga continua sendo unica e a mesma: a marca de transacao, ligada dentro das
-- RPCs privilegiadas do proprio schema.
create or replace function myportifolio.portfolio_experiences_guarda_colunas() returns trigger
language plpgsql security definer set search_path = myportifolio, public as $$
begin
  if myportifolio.em_operacao_confiavel() then return new; end if;

  if tg_op = 'UPDATE'
     and new.plate_bg is distinct from old.plate_bg
     and not myportifolio.portfolio_tem_custom(new.portfolio_id) then
    raise exception 'personalizacao nao liberada nesta conta';
  end if;

  -- Ramos separados de proposito: OLD nao existe em INSERT, e a ordem de avaliacao de um
  -- AND nao e garantida, entao "tg_op = 'INSERT' or not old.x" e uma armadilha.
  if new.certificate_public and not myportifolio.eh_titular_do_portfolio(new.portfolio_id) then
    if tg_op = 'INSERT' then
      raise exception 'so o titular publica o proprio certificado';
    elsif not old.certificate_public then
      raise exception 'so o titular publica o proprio certificado';
    end if;
  end if;
  return new;
end;
$$;
create trigger portfolio_experiences_guarda before insert or update on myportifolio.portfolio_experiences
  for each row execute function myportifolio.portfolio_experiences_guarda_colunas();

-- COTA DE EXPERIENCIA -------------------------------------------------------
-- Teto proprio, e nao dividindo o teto de projeto: um curriculo honesto passa de doze
-- entradas sem abuso nenhum, e somar as duas faria cadastrar experiencia comer a cota de
-- case, que e o que o comprador veio comprar. Trigger e nao "with check" de RLS pela mesma
-- razao de 4.4: aqui o erro sobe com o numero do teto, que e o que o editor mostra na tela.
alter table myportifolio.quotas add column if not exists max_experiences int not null default 20;
update myportifolio.quotas set max_experiences = 20  where code = 'padrao';
update myportifolio.quotas set max_experiences = 100 where code = 'interno';

create or replace function myportifolio.enforce_experience_limit() returns trigger
language plpgsql security definer set search_path = myportifolio, public as $$
declare v_max int; v_count int;
begin
  select (myportifolio.quota_do_portfolio(new.portfolio_id)).max_experiences into v_max;
  select count(*) into v_count from myportifolio.portfolio_experiences
   where portfolio_id = new.portfolio_id;
  if v_count >= v_max then
    raise exception 'limite atingido: maximo de % experiencias', v_max;
  end if;
  return new;
end;
$$;
create trigger portfolio_experiences_limite before insert on myportifolio.portfolio_experiences
  for each row execute function myportifolio.enforce_experience_limit();

-- O CERTIFICADO DENTRO DO ORCAMENTO DE BYTES QUE JA EXISTE -------------------
-- Um orcamento de espaco, nao dois. Dois numeros de espaco na mesma tela ("voce usou 8 de
-- 20 MB de imagem e 3 de 15 MB de documento") e um numero que ninguem entende e que
-- ninguem consegue planejar. O que muda e o teto, porque a conta de arquivos mudou de
-- tamanho:
--   24 imagens de case + avatar + hero .................. 26 arquivos, ~2,2 MB
--   20 logos de experiencia (mesmo orcamento de 90 KB) .. 20 arquivos, ~1,8 MB
--   20 certificados, uso real de ~400 KB cada ........... 20 arquivos, ~8,0 MB
-- Uso real somado da uns 12 MB. 40 MB continua sendo folga de mais de 3x e ainda flagra
-- abuso, e quem impede um PDF unico de 30 MB comer a cota sozinho e o file_size_limit do
-- bucket de documento (3 MB), que e a primeira barreira, igual ao de imagem em 4.6.
-- 130 arquivos deixa margem para o orfao que ainda espera a faxina de 24 horas (4.4).
update myportifolio.quotas set max_media_files = 130, max_media_bytes = 41943040 where code = 'padrao';

-- BUCKET DE DOCUMENTO, PRIVADO ----------------------------------------------
-- O certificado nao cabe em portfolio-media, e nao e so por causa do tipo de arquivo.
-- Aquele bucket e PUBLICO por decisao (4.6), porque o conteudo dele E a pagina publica.
-- Documento pessoal em bucket publico fica legivel por quem tiver a URL DESDE O UPLOAD,
-- antes de o comprador decidir qualquer coisa, e um upload que o proprio comprador
-- abandonou continuaria servindo CPF por tempo indeterminado. Isso e tratamento de dado
-- pessoal sem base legal (secao 5.9), e o bucket separado e o que torna o estado padrao
-- "fechado" em vez de "aberto ate alguem lembrar de fechar".
--
-- application/pdf entra na allowlist porque certificado quase sempre e PDF; imagem entra
-- porque muita declaracao chega como foto do papel. O tamanho e maior que o da imagem
-- (3 MB contra 2 MB) porque PDF de scan de duas paginas passa de 2 MB com facilidade, e
-- recusar o arquivo do cliente sem alternativa e pior do que guardar 1 MB a mais.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('portfolio-docs', 'portfolio-docs', false, 3145728,
        array['application/pdf','image/webp','image/png','image/jpeg'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- portfolio_media passa a contabilizar os dois buckets. Sem a coluna, o mesmo caminho nos
-- dois buckets colidiria no unique de path, e a soma da cota nao saberia de qual arquivo
-- esta falando.
alter table myportifolio.portfolio_media
  add column if not exists bucket text not null default 'portfolio-media';
alter table myportifolio.portfolio_media drop constraint if exists portfolio_media_bucket_ok;
alter table myportifolio.portfolio_media add constraint portfolio_media_bucket_ok
  check (bucket in ('portfolio-media','portfolio-docs'));
alter table myportifolio.portfolio_media drop constraint if exists portfolio_media_path_key;
alter table myportifolio.portfolio_media add constraint portfolio_media_bucket_path_unico
  unique (bucket, path);
alter table myportifolio.portfolio_media drop constraint if exists portfolio_media_kind_check;
alter table myportifolio.portfolio_media add constraint portfolio_media_kind_check
  check (kind in ('avatar','hero','project','experience','certificate'));

-- REGISTRO E COTA, AGORA NOS DOIS BUCKETS -----------------------------------
-- Corpo identico ao de 4.4 salvo os cinco pontos marcados com [0007]. O porque de cada
-- decisao que NAO mudou (cota que falha fechada no ramo sem metadata, orfao contando na
-- soma, suposicoes S9, S10 e S20) esta escrito em 4.4 e nao se repete aqui. O trigger
-- storage_objects_registra_midia continua o mesmo e nao e recriado: ele ja dispara para
-- qualquer bucket, e quem filtra e o corpo da funcao.
create or replace function myportifolio.storage_registrar_midia() returns trigger
language plpgsql security definer set search_path = myportifolio, public, storage as $$
declare
  v_folder text := (storage.foldername(new.name))[1];
  v_tipo   text := (storage.foldername(new.name))[2];
  v_pf uuid; v_bytes bigint; v_max bigint; v_max_files int;
  v_total bigint; v_files int;
begin
  -- [0007] 1: os dois buckets entram.
  if new.bucket_id not in ('portfolio-media','portfolio-docs') then return new; end if;

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

  -- [0007] 2: cada bucket tem o seu conjunto de pastas, e 'certificate' SO existe no
  -- privado. Sem este par, o vetor obvio e subir o PDF com CPF em <id>/certificate/ dentro
  -- de portfolio-media, que e publico, e o confinamento por pasta passaria liso.
  if (new.bucket_id = 'portfolio-media'
      and v_tipo not in ('avatar','hero','project','experience'))
     or (new.bucket_id = 'portfolio-docs' and v_tipo is distinct from 'certificate') then
    raise exception 'tipo de midia invalido no caminho: %', coalesce(v_tipo, '(vazio)');
  end if;

  select (myportifolio.quota_do_portfolio(v_pf)).max_media_bytes,
         (myportifolio.quota_do_portfolio(v_pf)).max_media_files
    into v_max, v_max_files;

  -- [0007] 3: a soma atravessa os dois buckets, porque o orcamento de bytes e um so.
  select coalesce(sum(m.bytes), 0), count(*) into v_total, v_files
  from myportifolio.portfolio_media m
  where m.portfolio_id = v_pf
    and not (m.bucket = new.bucket_id and m.path = new.name);

  if v_total + v_bytes > v_max then
    raise exception 'cota de midia excedida: % de % bytes', v_total + v_bytes, v_max;
  end if;
  if v_files + 1 > v_max_files then
    raise exception 'limite de arquivos atingido: maximo de %', v_max_files;
  end if;

  -- [0007] 4 e 5: bucket entra na linha e na chave do conflito.
  insert into myportifolio.portfolio_media (portfolio_id, bucket, path, kind, bytes, mime)
  values (v_pf, new.bucket_id, new.name, v_tipo, v_bytes, new.metadata ->> 'mimetype')
  on conflict (bucket, path) do update set
    bytes = excluded.bytes, mime = excluded.mime,
    is_orphan = false, orphan_since = null;

  return new;
end;
$$;

create or replace function myportifolio.storage_remover_midia() returns trigger
language plpgsql security definer set search_path = myportifolio, public as $$
begin
  if old.bucket_id in ('portfolio-media','portfolio-docs') then
    delete from myportifolio.portfolio_media
     where bucket = old.bucket_id and path = old.name;
  end if;
  return old;
end;
$$;

-- Faxina: a unica mudanca e casar o bucket pela coluna em vez do literal. Certificado
-- orfao precisa sair do bucket pelo mesmo motivo que imagem orfa, mais um: enquanto ele
-- existir, existe documento pessoal guardado sem ninguem apontando para ele.
create or replace function myportifolio.purgar_midia_orfa(
  p_idade interval default interval '24 hours',
  p_portfolio_id uuid default null)
returns int language plpgsql security definer set search_path = myportifolio, public, storage as $$
declare v_n int;
begin
  delete from storage.objects o
  using myportifolio.portfolio_media m
  where o.bucket_id = m.bucket
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

-- Apagar a experiencia marca os DOIS arquivos dela como orfaos, pela mesma razao de 4.4:
-- apagar objeto de dentro de trigger seria chamada externa dentro de transacao.
-- Trocar a logo sem apagar o arquivo antigo deixa o arquivo velho sem dono logico e sem
-- marca de orfao, exatamente como ja acontece com portfolio_projects.image_path: quem
-- apaga o objeto substituido e o editor, no mesmo passo do upload (6.5).
create or replace function myportifolio.marcar_midia_experiencia_orfa() returns trigger
language plpgsql security definer set search_path = myportifolio, public as $$
begin
  update myportifolio.portfolio_media
  set is_orphan = true, orphan_since = coalesce(orphan_since, now())
  where portfolio_id = old.portfolio_id
    and path in (old.logo_path, old.certificate_path);
  return old;
end;
$$;
create trigger portfolio_experiences_midia_orfa after delete on myportifolio.portfolio_experiences
  for each row execute function myportifolio.marcar_midia_experiencia_orfa();

-- POLICIES DE STORAGE -------------------------------------------------------
-- A de upload no bucket publico ganha a pasta 'experience'. Recriada inteira em vez de
-- alterada porque policy nao tem alter de expressao.
drop policy if exists "dono sobe midia na propria pasta" on storage.objects;
create policy "dono sobe midia na propria pasta" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'portfolio-media'
    and myportifolio.owns_portfolio_folder((storage.foldername(name))[1])
    and (storage.foldername(name))[2] in ('avatar','hero','project','experience')
    and myportifolio.pasta_tem_acesso_ativo((storage.foldername(name))[1]));

-- NAO existe policy de select publica para portfolio-docs, e essa ausencia E o desenho:
-- em bucket privado, quem nao tem policy nao le, inclusive anon com a anon key. Quem
-- entrega o arquivo ao visitante e a rota /certificado/ do Worker, com URL assinada de
-- vida curta (suposicao S28), e so quando certificate_public estiver ligado.
create policy "dono le o proprio documento" on storage.objects
  for select to authenticated
  using (bucket_id = 'portfolio-docs'
         and myportifolio.owns_portfolio_folder((storage.foldername(name))[1]));

create policy "dono sobe documento na propria pasta" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'portfolio-docs'
    and myportifolio.owns_portfolio_folder((storage.foldername(name))[1])
    and (storage.foldername(name))[2] = 'certificate'
    and myportifolio.pasta_tem_acesso_ativo((storage.foldername(name))[1]));

create policy "dono atualiza documento da propria pasta" on storage.objects
  for update to authenticated
  using (bucket_id = 'portfolio-docs'
         and myportifolio.owns_portfolio_folder((storage.foldername(name))[1]))
  with check (bucket_id = 'portfolio-docs'
         and myportifolio.owns_portfolio_folder((storage.foldername(name))[1])
         and myportifolio.pasta_tem_acesso_ativo((storage.foldername(name))[1]));

-- Delete NAO exige acesso ativo, mesma razao de 4.6, e aqui ela pesa mais: reter documento
-- pessoal de quem foi bloqueado, sem deixar a pessoa apagar, e refem de dado.
create policy "dono deleta documento da propria pasta" on storage.objects
  for delete to authenticated
  using (bucket_id = 'portfolio-docs'
         and myportifolio.owns_portfolio_folder((storage.foldername(name))[1]));

-- SEM policy de admin aqui, e isto e o que muda em relacao a 4.6. La o admin le a midia
-- porque midia e a pagina publica, que ele ja consegue ver com um navegador. Documento
-- pessoal nao e publico, e "ser admin" nao pode significar ler o CPF de qualquer cliente
-- sem escopo, sem prazo e sem rastro. Quem precisa abrir o arquivo por moderacao passa por
-- concessao viva (owns_portfolio_folder ja aceita), que tem prazo e fica registrada; e o
-- takedown nao depende de policy nenhuma, porque admin_takedown_portfolio e security
-- definer e chama purgar_midia_orfa (4.5).

-- RLS ----------------------------------------------------------------------
-- Copia exata do padrao de portfolio_projects (4.4), inclusive nas perguntas: owns_portfolio
-- para a posse (que ja inclui a concessao de facilitacao) e portfolio_tem_acesso_ativo para
-- a escrita, que pergunta pelo DONO DA LINHA e nao por quem esta logado. Nada aqui muda em
-- relacao aos projetos; o que e diferente na experiencia esta no trigger de guarda acima,
-- que e onde ele tem que estar.
alter table myportifolio.portfolio_experiences enable row level security;
revoke all on myportifolio.portfolio_experiences from anon;
grant select, insert, update, delete on myportifolio.portfolio_experiences to authenticated;

create policy "dono le experiencias" on myportifolio.portfolio_experiences for select to authenticated
  using (myportifolio.owns_portfolio(portfolio_id));
create policy "dono insere experiencias" on myportifolio.portfolio_experiences for insert to authenticated
  with check (myportifolio.owns_portfolio(portfolio_id)
              and myportifolio.portfolio_tem_acesso_ativo(portfolio_id));
create policy "dono atualiza experiencias" on myportifolio.portfolio_experiences for update to authenticated
  using (myportifolio.owns_portfolio(portfolio_id))
  with check (myportifolio.owns_portfolio(portfolio_id)
              and myportifolio.portfolio_tem_acesso_ativo(portfolio_id));
create policy "dono deleta experiencias" on myportifolio.portfolio_experiences for delete to authenticated
  using (myportifolio.owns_portfolio(portfolio_id));
create policy "admin le todas as experiencias" on myportifolio.portfolio_experiences for select
  to authenticated using (myportifolio.is_admin());

-- PAYLOAD COM EXPERIENCIA ---------------------------------------------------
-- Esta e a funcao de 4.5 reaplicada com create or replace, com o corpo IDENTICO ao de
-- 0004 mais os tres acrescimos de 4.7.1 (a declaracao das duas variaveis, o bloco que
-- monta v_experiences e a traducao EN, e as duas chaves no jsonb_build_object final).
-- O plano mostra so os acrescimos para nao existirem duas versoes do mesmo corpo no
-- documento; aqui eles PRECISAM vir fundidos, porque o Postgres nao remenda funcao: ou
-- se redefine ela inteira, ou nao se muda nada.
create or replace function myportifolio.montar_payload_portfolio(p_portfolio_id uuid)
returns jsonb language plpgsql security definer set search_path = myportifolio, public stable as $$
declare
  v_pf myportifolio.portfolios%rowtype;
  v_custom boolean;
  v_profile jsonb; v_projects jsonb; v_projects_en jsonb; v_filters jsonb;
  v_experiences jsonb; v_experiences_en jsonb;
begin
  select * into v_pf from myportifolio.portfolios where id = p_portfolio_id;
  if not found then raise exception 'portfolio inexistente'; end if;

  select coalesce(ma.has_custom and not ma.blocked, false) into v_custom
  from myportifolio.member_access ma where ma.email = v_pf.owner_email;

  if not v_custom then
    v_pf.theme_accent := null;
    v_pf.theme_plate_bg := null;
    v_pf.badge_label := 'VibeCoder';
    v_pf.badge_icon := 'code';
    v_pf.cta_label_i18n := null;
    v_pf.filter_labels := '{}'::jsonb;
  end if;

  v_profile := jsonb_build_object(
    'name', v_pf.display_name,
    'role', v_pf.role_i18n,
    'avatarPath', v_pf.avatar_path,
    'mainImagePath', v_pf.hero_path,
    'heroObjectPosition', v_pf.hero_object_position,
    'showOnlineDot', v_pf.show_online_dot,
    'badgeLabel', v_pf.badge_label,
    'badgeIcon', v_pf.badge_icon,
    'ctaUrl', v_pf.cta_url,
    'ctaLabel', v_pf.cta_label_i18n,
    'bio', v_pf.bio_i18n,
    -- ACHADO 6: e-mail de contato so vai para a pagina publica se o dono pediu.
    'email', case when v_pf.show_contact_email then v_pf.contact_email end,
    'socials', v_pf.socials,
    'stats', v_pf.stats);

  -- Ordem: video primeiro (invariante editorial do portfolio, e regra registrada na
  -- memoria do projeto), depois position, depois created_at.
  with ord as (
    select pj.*, row_number() over (
      order by case when v_pf.projects_video_first and not pj.has_video then 1 else 0 end,
               pj.position, pj.created_at) as rn
    from myportifolio.portfolio_projects pj
    where pj.portfolio_id = v_pf.id and pj.is_visible and not pj.is_sample
  )
  select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
    'slug', o.slug,
    'name', o.name_i18n ->> 'pt',
    'client', o.client,
    'category', o.category_i18n ->> 'pt',
    'year', o.year,
    'accent', case when v_custom then o.accent else '#7C5CFC' end,
    'plateBg', case when v_custom then o.plate_bg else '#0b0b12' end,
    'fit', case when o.image_fit = 'cover' then 'cover' end,
    'imagePath', o.image_path,
    -- ACHADO 12 outra vez, no ultimo lugar onde ele sobrevivia: o snapshot guarda o ID de
    -- 11 caracteres, que e o dado, e nunca a URL, que e apresentacao e pertence ao Worker.
    -- Congelar 'https://youtu.be/<id>' significa que trocar o host de embed (para
    -- youtube-nocookie, que o parser de 6.6 ja aceita) ou anexar parametro de privacidade
    -- vira republish_all() sobre a base inteira por causa de uma string.
    'videoId', o.youtube_id,
    'videoOrientation', o.youtube_orientation,
    'tagline', o.tagline_i18n ->> 'pt',
    'problem', o.problem_i18n ->> 'pt',
    'solution', o.solution_i18n ->> 'pt',
    'features', o.features_i18n -> 'pt',
    'stack', o.stack_i18n -> 'pt',
    'link', o.link_url,
    'linkNote', o.link_note_i18n ->> 'pt',
    'groups', to_jsonb(o.groups)
  )) order by o.rn), '[]'::jsonb) into v_projects from ord o;

  if v_pf.english_enabled then
    select coalesce(jsonb_object_agg(pj.slug, jsonb_strip_nulls(jsonb_build_object(
      'name', nullif(pj.name_i18n ->> 'en', ''),
      'category', nullif(pj.category_i18n ->> 'en', ''),
      'tagline', nullif(pj.tagline_i18n ->> 'en', ''),
      'problem', nullif(pj.problem_i18n ->> 'en', ''),
      'solution', nullif(pj.solution_i18n ->> 'en', ''),
      'features', pj.features_i18n -> 'en',
      'stack', pj.stack_i18n -> 'en',
      'linkNote', nullif(pj.link_note_i18n ->> 'en', '')))), '{}'::jsonb)
    into v_projects_en
    from myportifolio.portfolio_projects pj
    where pj.portfolio_id = v_pf.id and pj.is_visible and not pj.is_sample;
  else
    v_projects_en := '{}'::jsonb;
  end if;

  -- Ordem: position, e depois created_at para empate. Aqui NAO existe o equivalente do
  -- projects_video_first: a lista de experiencia e cronologica na cabeca de quem le, e a
  -- ordem e escolha do comprador (o repo ja guarda "mais recente primeiro" como convencao
  -- do array, e position e a traducao disso).
  select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
    'slug', x.slug,
    'org', x.org,
    'kind', x.kind,
    'role', x.role_i18n ->> 'pt',
    'start', x.period_start,
    'end', x.period_end,          -- ausente no payload significa "atual", igual ao repo
    'location', x.location_i18n ->> 'pt',
    'logoPath', x.logo_path,      -- caminho relativo, o Worker resolve (achado 12)
    'plateBg', case when v_custom then x.plate_bg else '#0b0b12' end,
    'highlights', x.highlights_i18n -> 'pt',
    'note', x.note_i18n ->> 'pt',
    -- LGPD, e e o unico ponto do payload com esta forma: sem o consentimento do titular,
    -- nem o CAMINHO sai daqui. Publicar o caminho de um documento privado ja e vazamento
    -- mesmo com o bucket fechado, porque o caminho e exatamente o que o assinador precisa,
    -- e o payload publicado e servido a qualquer visitante. Caminho relativo e nunca URL,
    -- pela regra do achado 12 e por uma razao a mais: URL assinada tem validade de minutos
    -- e o snapshot vive em cache por muito mais tempo do que isso.
    'certificatePath',  case when x.certificate_public then x.certificate_path end,
    'certificateMime',  case when x.certificate_public then x.certificate_mime end,
    'certificateLabel', case when x.certificate_public
                             then x.certificate_label_i18n ->> 'pt' end
  )) order by x.position, x.created_at), '[]'::jsonb) into v_experiences
  from myportifolio.portfolio_experiences x
  where x.portfolio_id = v_pf.id and x.is_visible and not x.is_sample;

  if v_pf.english_enabled then
    select coalesce(jsonb_object_agg(x.slug, jsonb_strip_nulls(jsonb_build_object(
      'role', nullif(x.role_i18n ->> 'en', ''),
      'location', nullif(x.location_i18n ->> 'en', ''),
      'highlights', x.highlights_i18n -> 'en',
      'note', nullif(x.note_i18n ->> 'en', ''),
      'certificateLabel', case when x.certificate_public
                               then nullif(x.certificate_label_i18n ->> 'en', '') end))),
      '{}'::jsonb)
    into v_experiences_en
    from myportifolio.portfolio_experiences x
    where x.portfolio_id = v_pf.id and x.is_visible and not x.is_sample;
  else
    v_experiences_en := '{}'::jsonb;
  end if;

  -- A barra de filtros e DERIVADA das chaves realmente usadas, na ordem de primeiro
  -- uso. Rotulo vem de filter_labels, com fallback para a propria chave.
  select coalesce(jsonb_agg(jsonb_build_object(
           'key', g.key,
           'label', coalesce(v_pf.filter_labels -> g.key,
                             jsonb_build_object('pt', g.key, 'en', g.key)))
         order by g.ord), '[]'::jsonb)
  into v_filters
  from (select gk as key, min(pj.position) as ord
        from myportifolio.portfolio_projects pj, unnest(pj.groups) gk
        where pj.portfolio_id = v_pf.id and pj.is_visible and not pj.is_sample
        group by gk) g;

  return jsonb_build_object(
    'slug', v_pf.slug,
    'lang', jsonb_build_object('default', v_pf.default_lang,
                               'englishEnabled', v_pf.english_enabled),
    'perPage', v_pf.projects_per_page,
    'theme', jsonb_strip_nulls(jsonb_build_object(
               'accent', v_pf.theme_accent, 'plateBg', v_pf.theme_plate_bg)),
    'profile', v_profile,
    'stacks', to_jsonb(v_pf.stacks),
    'filterGroups', v_filters,
    'projects', v_projects,
    'projectsEn', v_projects_en,
    'experiences', v_experiences,
    'experiencesEn', v_experiences_en,
    'seo', jsonb_build_object(
      'title', coalesce(v_pf.seo_title_i18n,
                        jsonb_build_object('pt', v_pf.display_name, 'en', v_pf.display_name)),
      'description', coalesce(v_pf.seo_description_i18n, v_pf.role_i18n),
      -- caminho relativo, o Worker resolve. Nunca URL absoluta (achado 12).
      'ogImagePath', coalesce(v_pf.hero_path, v_pf.avatar_path)));
end;
$$;
-- Reafirmado depois do create or replace pela mesma razao de 4.5: esta funcao monta o
-- payload inteiro sem olhar RLS, e quem a chama e publicar_interno e get_draft_portfolio.
revoke execute on function myportifolio.montar_payload_portfolio(uuid) from public, anon, authenticated;
