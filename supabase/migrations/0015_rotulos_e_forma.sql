-- 0015_rotulos_e_forma.sql
--
-- OS TITULOS DAS SECOES DEIXAM DE SER TEXTO DE INTERFACE E VIRAM DADO DO DONO DA PAGINA.
--
-- Ate aqui "Stacks Dominadas", "Meus Projetos", "cases", "O Desafio", "A Solucao",
-- "Recursos" e "Stack" moravam em src/app/i18n.js, iguais para todo mundo. O resultado, medido
-- em dez portfolios de profissoes diferentes: uma confeiteira publicou "STACKS DOMINADAS"
-- em cima de "Brigadeiro gourmet", uma advogada publicou "MEUS PROJETOS / 6 cases" para
-- descrever processos, e o modal de um prato de comida perguntava "O Desafio" e listava a
-- "Stack". Nao ha um conjunto de palavras que sirva a chef, advogada, tatuador e psicologa ao
-- mesmo tempo: a saida e a pessoa escrever as dela.
--
-- ui_labels e UM OBJETO SO, e nao sete colunas, porque o conjunto cresce a cada secao nova e
-- porque ele e escrito e lido sempre inteiro, do mesmo jeito que socials e stats ja sao
-- (0002:277-278). Chave ausente significa "usa o texto de hoje": e isso que mantem a pagina
-- do Helio, e a de todo tenant ja publicado, identica sem precisar escrever nada no banco.
--
-- avatar_shape existe porque o oval nasceu por acidente (sem shrink-0 o flex espremia a foto
-- e o retrato virava elipse, chegando a uma tira de 25px, dependendo do comprimento do nome).
-- O dono pediu para manter as duas formas, entao ela vira escolha deliberada com medida fixa
-- em vez de efeito colateral de layout.
--
-- Nenhuma das duas entra no bump: rotular a propria secao e dizer "Meus pratos" em vez de
-- "Meus Projetos" nao e estetica, e a pagina fazer sentido.
--
-- O corpo de montar_payload_portfolio abaixo foi extraido do BANCO com pg_get_functiondef e
-- teve APENAS duas linhas acrescentadas. Nao foi redigitado: o Postgres troca o corpo inteiro
-- a cada create or replace, e esta funcao ja foi reescrita por inteiro tres vezes.

alter table myportifolio.portfolios
  add column if not exists ui_labels jsonb not null default '{}'::jsonb,
  add column if not exists avatar_shape text;

-- Validador em plpgsql e nao em sql: funcao sql e inlinada no CHECK, e afrouxar a regra
-- depois nao revalida as linhas que ja passaram (motivo escrito em 0002:4-7).
--
-- O que ele aceita: objeto raso, no maximo 24 chaves, chave em letra e digito, e cada valor
-- um i18n de ate 40 caracteres. Nao valida a chave contra a lista do codigo DE PROPOSITO: a
-- lista cresce a cada secao nova, e um CHECK com literais viraria ALTER TABLE a cada deploy.
-- Quem descarta chave desconhecida e o render, sem lancar.
create or replace function myportifolio.rotulos_ui_validos(p jsonb) returns boolean
language plpgsql immutable as $fn$
declare v_k text;
begin
  if p is null then return true; end if;
  if jsonb_typeof(p) <> 'object' then return false; end if;
  if (select count(*) from jsonb_object_keys(p)) > 24 then return false; end if;
  for v_k in select k from jsonb_object_keys(p) k loop
    if v_k !~ '^[a-zA-Z][a-zA-Z0-9]{1,31}$' then return false; end if;
    if not myportifolio.i18n_texto_valido(p -> v_k, 40) then return false; end if;
  end loop;
  return true;
end; $fn$;

alter table myportifolio.portfolios
  add constraint portfolios_uilabels_ok check (myportifolio.rotulos_ui_validos(ui_labels)),
  add constraint portfolios_avatar_shape_ok check (avatar_shape is null or avatar_shape in ('circulo','oval'));

-- Camada 1 das tres do bump: o grant por coluna. As duas sao de conteudo e entram na base.
grant update (ui_labels, avatar_shape) on myportifolio.portfolios to authenticated;

CREATE OR REPLACE FUNCTION myportifolio.montar_payload_portfolio(p_portfolio_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'myportifolio', 'public'
AS $function$
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
    v_pf.cta_label_i18n := null;
    v_pf.filter_labels := '{}'::jsonb;
  end if;

  v_profile := jsonb_build_object(
    'name', v_pf.display_name,
    'role', v_pf.role_i18n,
    'avatarPath', v_pf.avatar_path,
    'mainImagePath', v_pf.hero_path,
    'heroObjectPosition', v_pf.hero_object_position,
    'avatarShape', v_pf.avatar_shape,
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
    'uiLabels', v_pf.ui_labels,
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
$function$;
