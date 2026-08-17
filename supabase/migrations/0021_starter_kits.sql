-- 0021_starter_kits.sql
--
-- O PORTFOLIO DEIXA DE NASCER VAZIO.
--
-- Ate aqui `create_my_portfolio` inseria uma linha e mais nada, e o comprador caia num editor
-- com o canvas em branco. O proprio plano ja chamava isso de "o pior momento do produto: o
-- comprador acabou de pagar e ve um esqueleto", e a saida escrita la sempre foi a mesma:
-- resolve-se com DADOS, e nao com texto motivacional.
--
-- A INFRAESTRUTURA JA EXISTIA E ESTAVA MORTA, e isso e o mais caro dessa historia:
-- `portfolios.starter_kit` e `onboarding_step` existem desde a 0002, `is_sample` existe em
-- projetos desde a 0003 e em experiencias desde a 0007, `montar_payload_portfolio` ja filtrava
-- `not is_sample` e o rascunho do editor tambem. Faltava exatamente uma coisa: alguem escrever
-- nelas. O wizard passava `p_kit => null` em toda chamada, todo esse maquinario ficou parado
-- por meses, e o comprador pagou para ver uma tela em branco.
--
-- O CONTEUDO DOS KITS NAO FOI INVENTADO AQUI. Ele saiu de dez portfolios reais, construidos e
-- publicados por dez profissoes diferentes em 16/08/2026, e da lista de vocabulario que aqueles
-- dez produziram. "Tecnicas da casa", "Meus pratos" e "pratos" nao sao um chute do que uma chef
-- diria: e o que a pagina da chef publicou.
--
-- POR QUE UMA TABELA E NAO UM ARQUIVO NO BUNDLE: a lista cresce com o marketing, e crescer
-- precisa ser INSERT e nao deploy do front. E a mesma razao de `reserved_slugs` e
-- `slug_denylist` serem tabela.
--
-- A APLICACAO E IDEMPOTENTE E NUNCA PISA EM TRABALHO DE VERDADE: se ja existe qualquer projeto
-- que nao seja exemplo, ela devolve sem tocar em nada, e cada campo so e preenchido se estiver
-- vazio. Isso importa porque a mesma funcao pode ser chamada de novo por engano, e porque
-- exemplo que sobrescreve texto escrito pelo comprador seria pior do que nao existir.

create table if not exists myportifolio.starter_kits (
  kit text primary key check (kit ~ '^[a-z][a-z0-9-]{1,23}$'),
  label text not null,
  ordem smallint not null default 0,
  ativo boolean not null default true,
  definition jsonb not null,
  created_at timestamptz not null default now()
);

alter table myportifolio.starter_kits enable row level security;
revoke all on myportifolio.starter_kits from anon, authenticated;

-- O wizard so precisa de kit + rotulo, e le por RPC. A tabela inteira nunca vai para o
-- PostgREST: `definition` e conteudo nosso, e nao ha razao para o navegador baixar os dez.
create or replace function myportifolio.list_starter_kits()
returns table (kit text, label text)
language sql security definer set search_path = myportifolio, public stable as $fn$
  select k.kit, k.label from myportifolio.starter_kits k where k.ativo order by k.ordem, k.label;
$fn$;
revoke execute on function myportifolio.list_starter_kits() from public, anon;
grant execute on function myportifolio.list_starter_kits() to authenticated;

create or replace function myportifolio.apply_starter_kit(p_portfolio_id uuid, p_kit text)
returns void
language plpgsql security definer set search_path = myportifolio, public as $fn$
declare
  v_pf myportifolio.portfolios%rowtype;
  v_def jsonb;
  v_item jsonb;
  v_i int := 0;
begin
  if not myportifolio.owns_portfolio(p_portfolio_id) then
    raise exception 'sem permissao';
  end if;

  select * into v_pf from myportifolio.portfolios where id = p_portfolio_id for update;
  if not found then return; end if;

  -- Trabalho de verdade manda. Kit e para portfolio novo.
  if exists (select 1 from myportifolio.portfolio_projects
              where portfolio_id = v_pf.id and not is_sample) then
    return;
  end if;

  select k.definition into v_def from myportifolio.starter_kits k where k.kit = p_kit and k.ativo;
  -- Kit desconhecido nao e erro: o portfolio simplesmente nasce vazio, como nascia antes.
  if v_def is null then return; end if;

  delete from myportifolio.portfolio_projects where portfolio_id = v_pf.id and is_sample;
  delete from myportifolio.portfolio_experiences where portfolio_id = v_pf.id and is_sample;

  -- starter_kit e coluna PROTEGIDA pelo trigger de guarda (0002:450). A marca de escrita
  -- confiavel e a unica porta, e ela e desligada no MESMO corpo: marca que atravessa
  -- transacao vira porta destrancada para o proximo update.
  perform set_config('app.escrita_confiavel', 'on', true);
  update myportifolio.portfolios set
    starter_kit  = p_kit,
    theme_preset = coalesce(theme_preset, v_def ->> 'theme_preset'),
    background_kind = case when background_kind = 'none'
                           then coalesce(v_def ->> 'background_kind', 'none')
                           else background_kind end,
    badge_label  = coalesce(badge_label, v_def #>> '{badge,label}'),
    badge_icon   = coalesce(badge_icon,  v_def #>> '{badge,icon}'),
    ui_labels    = case when ui_labels = '{}'::jsonb
                        then coalesce(v_def -> 'ui_labels', '{}'::jsonb) else ui_labels end,
    stacks       = case when coalesce(array_length(stacks, 1), 0) = 0
                        then coalesce((select array_agg(x #>> '{}')
                                         from jsonb_array_elements(v_def -> 'stacks') x), '{}')
                        else stacks end,
    bio_i18n     = case when coalesce(bio_i18n ->> 'pt', '') = ''
                        then jsonb_build_object('pt', coalesce(v_def ->> 'bio', ''))
                        else bio_i18n end,
    onboarding_step = greatest(onboarding_step, 1)
  where id = v_pf.id;
  perform set_config('app.escrita_confiavel', 'off', true);

  -- Os exemplos entram com is_sample = true, e essa flag e o contrato inteiro: o payload
  -- publicado ja os filtra (0004:118), entao eles aparecem no editor, mostram a pessoa como a
  -- pagina dela vai ficar, e NUNCA vao ao ar por engano.
  for v_item in select value from jsonb_array_elements(coalesce(v_def -> 'projects', '[]'::jsonb)) loop
    insert into myportifolio.portfolio_projects
      (portfolio_id, slug, name_i18n, category_i18n, tagline_i18n, position, is_sample)
    values (v_pf.id, v_item ->> 'slug',
            jsonb_build_object('pt', v_item ->> 'name'),
            jsonb_build_object('pt', v_item ->> 'category'),
            jsonb_build_object('pt', v_item ->> 'tagline'),
            v_i, true)
    on conflict (portfolio_id, slug) do nothing;
    v_i := v_i + 1;
  end loop;

  v_i := 0;
  for v_item in select value from jsonb_array_elements(coalesce(v_def -> 'experiences', '[]'::jsonb)) loop
    insert into myportifolio.portfolio_experiences
      (portfolio_id, slug, org, kind, role_i18n, period_start, position, is_sample)
    values (v_pf.id, v_item ->> 'slug', v_item ->> 'org',
            coalesce(v_item ->> 'kind', 'work'),
            jsonb_build_object('pt', v_item ->> 'role'),
            v_item ->> 'period_start', v_i, true)
    on conflict (portfolio_id, slug) do nothing;
    v_i := v_i + 1;
  end loop;
end;
$fn$;
revoke execute on function myportifolio.apply_starter_kit(uuid, text) from public, anon;
grant execute on function myportifolio.apply_starter_kit(uuid, text) to authenticated;

insert into myportifolio.starter_kits (kit, label, ordem, definition) values ('chef', 'Chef / Gastronomia', 10, '{"theme_preset": "brasa", "background_kind": "brilho", "badge": {"label": "Chef de cozinha", "icon": "chef-hat"}, "ui_labels": {"stacks": {"pt": "Técnicas da casa"}, "projects": {"pt": "Meus pratos"}, "cases": {"pt": "pratos"}, "experience": {"pt": "Onde eu cozinhei"}, "challenge": {"pt": "A ideia"}, "solution": {"pt": "Como eu faço"}, "features": {"pt": "O que vai no prato"}, "stackLabel": {"pt": "Ingredientes"}, "visit": {"pt": "Ver o menu"}}, "stacks": ["Cozinha autoral", "Menu degustação", "Fermentação", "Peixes e frutos do mar"], "bio": "Conte em três linhas onde você aprendeu a cozinhar, o que você faz hoje e o que não abre mão no prato.", "projects": [{"slug": "exemplo-prato", "name": "Menu degustação de sete tempos", "category": "Menu autoral", "tagline": "Troque por um trabalho seu: uma foto, o nome do prato e uma frase."}, {"slug": "exemplo-jantar", "name": "Jantar fechado para vinte", "category": "Evento", "tagline": "Um segundo exemplo, para você ver como a grade fica com dois."}], "experiences": [{"slug": "exemplo-cozinha", "org": "Restaurante Exemplo", "kind": "work", "role": "Chef de cozinha", "period_start": "2022"}]}'::jsonb) on conflict (kit) do update set label = excluded.label, ordem = excluded.ordem, definition = excluded.definition, ativo = true;
insert into myportifolio.starter_kits (kit, label, ordem, definition) values ('advocacia', 'Advocacia / Direito', 20, '{"theme_preset": "ouro", "background_kind": "grid", "badge": {"label": "Advogada", "icon": "scale"}, "ui_labels": {"stacks": {"pt": "Áreas de atuação"}, "projects": {"pt": "Casos e atuações"}, "cases": {"pt": "casos"}, "experience": {"pt": "Trajetória"}, "challenge": {"pt": "A situação"}, "solution": {"pt": "A tese e a estratégia"}, "features": {"pt": "O que foi feito"}, "stackLabel": {"pt": "Matérias envolvidas"}, "visit": {"pt": "Ler mais"}}, "stacks": ["Direito do trabalho", "Contencioso", "Consultivo", "Negociação coletiva"], "bio": "Diga a sua área, há quanto tempo atua e como você trabalha. Lembre do número da OAB.", "projects": [{"slug": "exemplo-caso", "name": "Reclamatória trabalhista", "category": "Contencioso", "tagline": "Descreva o caso sem identificar o cliente. Nem todo trabalho tem imagem, e tudo bem."}], "experiences": [{"slug": "exemplo-formacao", "org": "Universidade Exemplo", "kind": "education", "role": "Bacharelado em Direito", "period_start": "2014"}]}'::jsonb) on conflict (kit) do update set label = excluded.label, ordem = excluded.ordem, definition = excluded.definition, ativo = true;
insert into myportifolio.starter_kits (kit, label, ordem, definition) values ('fotografia', 'Fotografia', 30, '{"theme_preset": "prata", "background_kind": "grao", "badge": {"label": "Fotógrafo", "icon": "camera"}, "ui_labels": {"stacks": {"pt": "Equipamento e processo"}, "projects": {"pt": "Ensaios"}, "cases": {"pt": "ensaios"}, "experience": {"pt": "Trajetória"}, "challenge": {"pt": "O contexto"}, "solution": {"pt": "O olhar"}, "features": {"pt": "O que está incluso"}, "stackLabel": {"pt": "Equipamento"}, "visit": {"pt": "Ver a galeria"}}, "stacks": ["Retrato", "Documental", "Luz natural", "Edição própria"], "bio": "Fotógrafo fala pouco e mostra muito. Duas ou três linhas bastam.", "projects": [{"slug": "exemplo-ensaio", "name": "Ensaio na rua", "category": "Documental", "tagline": "Cada trabalho aceita até oito fotos: elas aparecem quando alguém clica no card."}], "experiences": [{"slug": "exemplo-estudio", "org": "Estúdio Exemplo", "kind": "work", "role": "Fotógrafo", "period_start": "2019"}]}'::jsonb) on conflict (kit) do update set label = excluded.label, ordem = excluded.ordem, definition = excluded.definition, ativo = true;
insert into myportifolio.starter_kits (kit, label, ordem, definition) values ('personal', 'Personal trainer / Saúde', 40, '{"theme_preset": "limao", "background_kind": "mesh", "badge": {"label": "Personal trainer", "icon": "dumbbell"}, "ui_labels": {"stacks": {"pt": "Especialidades"}, "projects": {"pt": "Programas e resultados"}, "cases": {"pt": "programas"}, "experience": {"pt": "Formação e certificações"}, "challenge": {"pt": "O ponto de partida"}, "solution": {"pt": "O plano"}, "features": {"pt": "O que está incluso"}, "stackLabel": {"pt": "Métodos"}, "visit": {"pt": "Quero treinar"}}, "stacks": ["Hipertrofia", "Emagrecimento", "Treino online", "Avaliação de movimento"], "bio": "Diga para quem você treina, como acompanha e o que te diferencia.", "projects": [{"slug": "exemplo-programa", "name": "Programa de doze semanas", "category": "Consultoria online", "tagline": "Vídeo vertical funciona: cole o link de um Short e ele aparece na proporção certa."}], "experiences": [{"slug": "exemplo-formacao", "org": "Faculdade Exemplo", "kind": "education", "role": "Bacharelado em Educação Física", "period_start": "2018"}]}'::jsonb) on conflict (kit) do update set label = excluded.label, ordem = excluded.ordem, definition = excluded.definition, ativo = true;
insert into myportifolio.starter_kits (kit, label, ordem, definition) values ('arquitetura', 'Arquitetura / Interiores', 50, '{"theme_preset": "terra", "background_kind": "vinheta", "badge": {"label": "Arquiteta", "icon": "ruler"}, "ui_labels": {"stacks": {"pt": "Serviços"}, "projects": {"pt": "Projetos"}, "cases": {"pt": "projetos"}, "experience": {"pt": "Trajetória"}, "challenge": {"pt": "O programa"}, "solution": {"pt": "O partido"}, "features": {"pt": "Escopo entregue"}, "stackLabel": {"pt": "Ferramentas"}, "visit": {"pt": "Ver o projeto"}}, "stacks": ["Residencial", "Reforma", "Interiores", "Projeto executivo"], "bio": "Fale do seu partido, do tipo de obra que você assina e de como é trabalhar com você.", "projects": [{"slug": "exemplo-residencia", "name": "Residência de 120 m2", "category": "Residencial", "tagline": "Use a galeria para planta, maquete e os ângulos da obra pronta."}], "experiences": [{"slug": "exemplo-escritorio", "org": "Escritório Exemplo", "kind": "work", "role": "Arquiteta", "period_start": "2020"}]}'::jsonb) on conflict (kit) do update set label = excluded.label, ordem = excluded.ordem, definition = excluded.definition, ativo = true;
insert into myportifolio.starter_kits (kit, label, ordem, definition) values ('psicologia', 'Psicologia / Terapia', 60, '{"theme_preset": "lavanda", "background_kind": "mesh", "badge": {"label": "Psicóloga", "icon": "brain"}, "ui_labels": {"stacks": {"pt": "Abordagens e público"}, "projects": {"pt": "Trabalhos"}, "cases": {"pt": "trabalhos"}, "experience": {"pt": "Formação"}, "challenge": {"pt": "O contexto"}, "solution": {"pt": "Como trabalho"}, "features": {"pt": "O que está incluso"}, "stackLabel": {"pt": "Abordagens"}, "visit": {"pt": "Saiba mais"}}, "stacks": ["Terapia cognitivo-comportamental", "Adultos", "Atendimento online", "Ansiedade"], "bio": "Escreva de forma acolhedora: quem você atende, como é a sessão e como marcar. Lembre do número do CRP.", "projects": [], "experiences": [{"slug": "exemplo-formacao", "org": "Universidade Exemplo", "kind": "education", "role": "Graduação em Psicologia", "period_start": "2015"}, {"slug": "exemplo-especializacao", "org": "Instituto Exemplo", "kind": "education", "role": "Especialização em TCC", "period_start": "2018"}]}'::jsonb) on conflict (kit) do update set label = excluded.label, ordem = excluded.ordem, definition = excluded.definition, ativo = true;
insert into myportifolio.starter_kits (kit, label, ordem, definition) values ('musica', 'Música / Áudio', 70, '{"theme_preset": "magenta", "background_kind": "mesh", "badge": {"label": "Produtora musical", "icon": "music"}, "ui_labels": {"stacks": {"pt": "O que eu faço"}, "projects": {"pt": "Discografia"}, "cases": {"pt": "faixas"}, "experience": {"pt": "Trajetória"}, "challenge": {"pt": "O briefing"}, "solution": {"pt": "A produção"}, "features": {"pt": "O que entreguei"}, "stackLabel": {"pt": "Estúdio e equipamento"}, "visit": {"pt": "Ouvir"}}, "stacks": ["Produção musical", "Mixagem", "Trilha", "Gravação"], "bio": "Diga que som você faz, com quem já trabalhou e como é o seu processo.", "projects": [{"slug": "exemplo-faixa", "name": "Single produzido", "category": "Produção", "tagline": "Hoje o campo de mídia aceita vídeo do YouTube. Um vídeo com a faixa resolve enquanto isso."}], "experiences": [{"slug": "exemplo-estudio", "org": "Estúdio Exemplo", "kind": "work", "role": "Produtora musical", "period_start": "2017"}]}'::jsonb) on conflict (kit) do update set label = excluded.label, ordem = excluded.ordem, definition = excluded.definition, ativo = true;
insert into myportifolio.starter_kits (kit, label, ordem, definition) values ('confeitaria', 'Confeitaria / Food', 80, '{"theme_preset": "rosa", "background_kind": "dots", "badge": {"label": "Confeiteira", "icon": "cake"}, "ui_labels": {"stacks": {"pt": "Minhas especialidades"}, "projects": {"pt": "Meus doces"}, "cases": {"pt": "encomendas"}, "experience": {"pt": "Cursos e formação"}, "challenge": {"pt": "A festa"}, "solution": {"pt": "O que eu fiz"}, "features": {"pt": "O que vai junto"}, "stackLabel": {"pt": "Sabores"}, "visit": {"pt": "Encomendar"}}, "stacks": ["Bolo de casamento", "Mesa de doces", "Brigadeiro gourmet", "Kit festa"], "bio": "Escreva do seu jeito: o que você faz, para que tipo de festa e como as pessoas encomendam.", "projects": [{"slug": "exemplo-bolo", "name": "Bolo de casamento de três andares", "category": "Encomenda", "tagline": "Ponha o preço a partir de quanto e o prazo de encomenda aqui na frase."}], "experiences": [{"slug": "exemplo-curso", "org": "Escola Exemplo", "kind": "education", "role": "Curso de confeitaria", "period_start": "2021"}]}'::jsonb) on conflict (kit) do update set label = excluded.label, ordem = excluded.ordem, definition = excluded.definition, ativo = true;
insert into myportifolio.starter_kits (kit, label, ordem, definition) values ('educacao', 'Professor / Educação', 90, '{"theme_preset": "oceano", "background_kind": "grid", "badge": {"label": "Professor", "icon": "graduation-cap"}, "ui_labels": {"stacks": {"pt": "Disciplinas"}, "projects": {"pt": "Cursos e materiais"}, "cases": {"pt": "cursos"}, "experience": {"pt": "Titulação e aprovações"}, "challenge": {"pt": "A dificuldade"}, "solution": {"pt": "Como eu ensino"}, "features": {"pt": "O que o aluno recebe"}, "stackLabel": {"pt": "Conteúdo"}, "visit": {"pt": "Ver o curso"}}, "stacks": ["Direito constitucional", "Preparatório", "Aula ao vivo", "Material próprio"], "bio": "Fale da sua titulação, de quantos alunos já passaram por você e de como é a sua aula.", "projects": [{"slug": "exemplo-curso", "name": "Curso preparatório completo", "category": "Curso", "tagline": "Anexe o certificado nas suas formações: ele aparece como botão no card."}], "experiences": [{"slug": "exemplo-mestrado", "org": "Universidade Exemplo", "kind": "education", "role": "Mestrado", "period_start": "2016"}, {"slug": "exemplo-cursinho", "org": "Cursinho Exemplo", "kind": "work", "role": "Professor", "period_start": "2019"}]}'::jsonb) on conflict (kit) do update set label = excluded.label, ordem = excluded.ordem, definition = excluded.definition, ativo = true;
insert into myportifolio.starter_kits (kit, label, ordem, definition) values ('tatuagem', 'Tatuagem / Arte', 100, '{"theme_preset": "sangue", "background_kind": "vinheta", "badge": {"label": "Tatuador", "icon": "pen-tool"}, "ui_labels": {"stacks": {"pt": "Estilos"}, "projects": {"pt": "Trabalhos"}, "cases": {"pt": "tattoos"}, "experience": {"pt": "Trajetória"}, "challenge": {"pt": "A ideia do cliente"}, "solution": {"pt": "Como ficou"}, "features": {"pt": "O que está incluso"}, "stackLabel": {"pt": "Técnica"}, "visit": {"pt": "Ver no Instagram"}}, "stacks": ["Blackwork", "Fineline", "Pontilhismo", "Desenho autoral"], "bio": "Curto e no seu tom: o que você tatua, como agenda e o que não faz.", "projects": [{"slug": "exemplo-tattoo", "name": "Fechamento de braço", "category": "Blackwork", "tagline": "Foto vertical funciona: escolha preencher o card e ajuste o enquadramento."}], "experiences": [{"slug": "exemplo-estudio", "org": "Estúdio Exemplo", "kind": "work", "role": "Tatuador", "period_start": "2020"}]}'::jsonb) on conflict (kit) do update set label = excluded.label, ordem = excluded.ordem, definition = excluded.definition, ativo = true;

CREATE OR REPLACE FUNCTION myportifolio.create_my_portfolio(p_slug text, p_display_name text, p_role text DEFAULT NULL::text, p_kit text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'myportifolio', 'public'
AS $function$
declare v_email text := (select myportifolio.current_purchase_email()); v_id uuid;
begin
  if (select myportifolio.current_login_email()) is null then
    raise exception 'confirme o e-mail antes de criar o portfolio';
  end if;
  if v_email is null then raise exception 'nenhuma compra encontrada para este e-mail'; end if;
  if not myportifolio.has_active_access() then raise exception 'compra inativa ou bloqueada'; end if;
  if not myportifolio.slug_available(p_slug) then raise exception 'endereco indisponivel: %', p_slug; end if;

  select id into v_id from myportifolio.portfolios where owner_email = v_email;
  if v_id is not null then raise exception 'este e-mail ja tem portfolio'; end if;

  insert into myportifolio.portfolios (owner_email, owner_id, slug, display_name, role_i18n, starter_kit)
  values (v_email, (select auth.uid()), lower(trim(p_slug)), p_display_name,
          jsonb_build_object('pt', coalesce(p_role, '')), p_kit)
  returning id into v_id;

  -- O KIT E APLICADO AQUI, e este era o elo que faltava: a coluna starter_kit, a flag
  -- is_sample e o filtro do payload existiam desde a 0002 e a 0003, e o wizard passava
  -- p_kit => null em toda chamada. O maquinario inteiro ficou parado, e o comprador
  -- pagou para cair num editor em branco.
  if p_kit is not null then
    perform myportifolio.apply_starter_kit(v_id, p_kit);
  end if;

  return v_id;
end;
$function$
;
