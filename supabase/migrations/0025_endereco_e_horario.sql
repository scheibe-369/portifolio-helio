-- 0025_endereco_e_horario.sql
--
-- ENDERECO FISICO E HORARIO DE FUNCIONAMENTO.
--
-- E o buraco de template mais reaproveitavel que o experimento das catorze personas achou, e
-- ele so apareceu quando entrou no teste alguem com PONTO FISICO. Um funileiro precisa dizer
-- onde fica a oficina e que abre sabado ate meio-dia, e o produto nao tinha um campo sequer:
-- 36 campos de perfil, 19 de trabalho, zero de endereco ou horario.
--
-- O contorno disponivel era "Suas redes", que exige um link em toda linha. Endereco nao tem
-- link, horario menos ainda, e o valor daquela lista e truncado na pagina: o endereco dele
-- precisava de 267px numa caixa de 126px, e saia cortado ate em tela de 1440.
--
-- Vale para muito mais gente do que oficina: salao, barbearia, pet shop, restaurante,
-- consultorio, estudio de tatuagem, escritorio de advocacia. Metade das profissoes que compram
-- este produto atende presencialmente em algum lugar.
--
-- TEXTO LIVRE, e nao um par de campos estruturados por dia da semana. Horario comercial
-- brasileiro tem almoco, sabado ate meio-dia, feriado e "ou combine pelo WhatsApp", e uma
-- grade de sete linhas com dois horarios cada seria um formulario maior que o resto do perfil
-- para preencher uma informacao que cabe em duas linhas escritas na mao.

alter table myportifolio.portfolios
  add column if not exists endereco text,
  add column if not exists horario text;

alter table myportifolio.portfolios
  add constraint portfolios_endereco_ok check (endereco is null or length(endereco) <= 160),
  add constraint portfolios_horario_ok check (horario is null or length(horario) <= 160);

grant update (endereco, horario) on myportifolio.portfolios to authenticated;

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
    'registro', v_pf.registro_profissional,
    'endereco', v_pf.endereco,
    'horario', v_pf.horario,
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
    'imagePosition', o.image_position,
    'gallery', case when jsonb_array_length(coalesce(o.gallery,'[]'::jsonb)) > 0 then o.gallery end,
    -- ACHADO 12 outra vez, no ultimo lugar onde ele sobrevivia: o snapshot guarda o ID de
    -- 11 caracteres, que e o dado, e nunca a URL, que e apresentacao e pertence ao Worker.
    -- Congelar 'https://youtu.be/<id>' significa que trocar o host de embed (para
    -- youtube-nocookie, que o parser de 6.6 ja aceita) ou anexar parametro de privacidade
    -- vira republish_all() sobre a base inteira por causa de uma string.
    'videoId', o.youtube_id,
    'videoOrientation', o.youtube_orientation,
    'tagline', o.tagline_i18n ->> 'pt',
    'highlight', o.highlight_i18n ->> 'pt',
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
    'logoPath', x.logo_path,
    'logoPosition', x.logo_position,      -- caminho relativo, o Worker resolve (achado 12)
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
    'sections', v_pf.sections,
    -- 'preset' fica FORA da normalizacao por bump de proposito: ele e da base, e o bloco
    -- 'if not v_custom' acima zera accent e plateBg mas nunca o preset.
    'theme', jsonb_strip_nulls(jsonb_build_object(
               'accent', v_pf.theme_accent, 'plateBg', v_pf.theme_plate_bg,
               'preset', v_pf.theme_preset,
               'background', case when v_pf.background_kind = 'none' then null else
                 jsonb_strip_nulls(jsonb_build_object(
                   'kind', v_pf.background_kind,
                   'path', v_pf.background_path,
                   'overlay', v_pf.background_overlay)) end)),
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
$function$
;
