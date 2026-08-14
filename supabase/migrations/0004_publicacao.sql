-- Publicacao com historico, leitura publica por RPC, ciclo de vida do comprador.

-- ACHADO 13: uma linha por VERSAO, nao uma linha por portfolio. O v1 sobrescrevia, e
-- o cliente que apagou metade dos cases e publicou nao tinha como voltar. No Supabase
-- Free nao ha PITR, entao ou o historico esta aqui ou nao existe.
--
-- O indice parcial unique (portfolio_id) where is_live garante "no maximo uma versao no
-- ar por portfolio". O unique (slug) where is_live garante que dois tenants nao
-- respondem pelo mesmo subdominio.
create table if not exists myportifolio.portfolio_publications (
  portfolio_id uuid not null references myportifolio.portfolios(id) on delete cascade,
  version bigint not null,
  slug text not null,
  payload jsonb not null,
  -- ACHADO 12: o leitor precisa saber com qual formato de payload esta lidando, e no v1
  -- se escrevia 'v', 1 dentro do payload e ninguem lia. Agora e coluna, indexavel,
  -- e o Worker recusa versao desconhecida em vez de renderizar torto.
  payload_v smallint not null default 2,
  content_hash text not null,
  is_live boolean not null default true,
  -- POR QUE saiu do ar, e nao so QUE saiu. Sem esta coluna, o ramo de "devolve ao ar" do
  -- trigger de acesso nao distingue "saiu porque foi revogado" de "saiu porque o dono
  -- despublicou" nem de "saiu porque o titular pediu exclusao", e um desbloqueio ou uma
  -- reconcessao republica conteudo que o dono tirou do ar de proposito. No caso do pedido
  -- de exclusao isso seria republicar dado de quem exerceu o art. 18 da LGPD.
  unlive_reason text check (unlive_reason in ('revogado','dono','exclusao')),
  published_at timestamptz not null default now(),
  primary key (portfolio_id, version)
);
create unique index if not exists publications_uma_no_ar_idx
  on myportifolio.portfolio_publications (portfolio_id) where is_live;
create unique index if not exists publications_slug_no_ar_idx
  on myportifolio.portfolio_publications (slug) where is_live;
create index if not exists publications_pf_versao_idx
  on myportifolio.portfolio_publications (portfolio_id, version desc);

alter table myportifolio.portfolio_publications enable row level security;

-- ACHADO 6: sem isto, GET /rest/v1/portfolio_publications?select=payload devolve a
-- base inteira de clientes com dado pessoal, sem autenticacao. O acesso anonimo passa
-- a ser EXCLUSIVAMENTE a RPC get_published_portfolio(slug), um tenant por chamada.
revoke all on myportifolio.portfolio_publications from anon;
grant select on myportifolio.portfolio_publications to authenticated;

create policy "dono le as proprias publicacoes" on myportifolio.portfolio_publications
  for select to authenticated using (myportifolio.owns_portfolio(portfolio_id));
create policy "admin le todas as publicacoes" on myportifolio.portfolio_publications
  for select to authenticated using (myportifolio.is_admin());
-- Sem policy de insert/update para NINGUEM, nem para o dono nem para o admin: escrever aqui
-- direto seria publicar (ou despublicar) sem passar por publish_portfolio(),
-- unpublish_portfolio() e admin_takedown_portfolio(), que sao as unicas portas e as unicas
-- que gravam unlive_reason e registram moderacao. "Ser admin" nunca e, sozinho, permissao
-- de virar a chave do que esta no ar na conta de um cliente.

-- MONTAGEM DO PAYLOAD ------------------------------------------------------
-- Extraida para funcao propria porque publish_portfolio() e a RPC de previa
-- get_draft_portfolio() precisam montar EXATAMENTE a mesma coisa (achado 26). Duas
-- montagens divergem no primeiro mes, e "na previa estava certo" vira categoria de
-- ticket.
--
-- ACHADO 12, tres mudancas em relacao ao v1:
--   1. 'avatarPath', 'mainImagePath' e 'imagePath' saem como CAMINHO RELATIVO no
--      bucket. Quem monta a URL absoluta e o Worker, que ja sabe o host. Migrar a midia
--      para R2 ou mudar o formato de URL passa a ser deploy do Worker, nao
--      republicacao de N tenants.
--   2. 'canonical' SAI do payload. O canonical de um tenant e https://<slug>.<apex>,
--      derivavel do request.
--   3. payload_v virou coluna.
--
-- NORMALIZACAO DO BUMP (secao 6.10): quando has_custom e falso no momento da montagem,
-- as colunas do bump saem com o DEFAULT, independentemente do que estiver gravado.
-- E isso que faz "comprou o bump, estornou o bump" voltar ao visual base no proximo
-- publish sem apagar dado do cliente, e voltar a cor se ele recomprar.
create or replace function myportifolio.montar_payload_portfolio(p_portfolio_id uuid)
returns jsonb language plpgsql security definer set search_path = myportifolio, public stable as $$
declare
  v_pf myportifolio.portfolios%rowtype;
  v_custom boolean;
  v_profile jsonb; v_projects jsonb; v_projects_en jsonb; v_filters jsonb;
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
    'seo', jsonb_build_object(
      'title', coalesce(v_pf.seo_title_i18n,
                        jsonb_build_object('pt', v_pf.display_name, 'en', v_pf.display_name)),
      'description', coalesce(v_pf.seo_description_i18n, v_pf.role_i18n),
      -- caminho relativo, o Worker resolve. Nunca URL absoluta (achado 12).
      'ogImagePath', coalesce(v_pf.hero_path, v_pf.avatar_path)));
end;
$$;
revoke execute on function myportifolio.montar_payload_portfolio(uuid) from public, anon, authenticated;

-- ATENCAO: esta funcao e reaplicada por 0007 (4.7.1) com create or replace, carregando
-- ESTE corpo inteiro mais tres acrescimos (as experiencias). Mexer aqui sem mexer la
-- desfaz o acrescimo na proxima migration.

-- PUBLICAR -----------------------------------------------------------------
-- O nucleo esta separado da autorizacao de proposito. Existe um caminho legitimo de
-- publicacao SEM usuario logado na frente: quando has_custom muda (compra ou estorno do
-- bump de personalizacao), o payload publicado precisa ser remontado na hora, e quem
-- dispara isso e um trigger. Chamar publish_portfolio de dentro do trigger nao funciona,
-- porque la auth.uid() e nulo e a propria funcao levantaria 'sem permissao'. Duplicar a
-- montagem em dois lugares divergiria no primeiro mes.
--
-- publicar_interno NAO verifica nada: quem chama e responsavel pela autorizacao. Por isso
-- ela e revogada de todo mundo e nunca vira endpoint do PostgREST.
create or replace function myportifolio.publicar_interno(p_portfolio_id uuid)
returns jsonb language plpgsql security definer set search_path = myportifolio, public as $$
declare
  v_pf myportifolio.portfolios%rowtype;
  v_payload jsonb; v_hash text; v_version bigint; v_hash_atual text;
begin
  select * into v_pf from myportifolio.portfolios where id = p_portfolio_id;
  if not found then raise exception 'portfolio inexistente'; end if;

  v_payload := myportifolio.montar_payload_portfolio(v_pf.id);
  v_hash := md5(v_payload::text || v_pf.slug);

  -- Nao cria versao nova quando nada mudou: o editor salva varias vezes seguidas, e
  -- versao nova sem conteudo novo joga fora o documento ja aquecido na borda. A chave de
  -- cache do Worker e /<portfolio_id>/<content_hash> (achado 11 e a correcao de colisao
  -- entre tenants), entao content_hash e dinheiro.
  select pb.content_hash, pb.version into v_hash_atual, v_version
  from myportifolio.portfolio_publications pb
  where pb.portfolio_id = v_pf.id and pb.is_live;

  if v_hash_atual = v_hash then
    return jsonb_build_object('slug', v_pf.slug, 'version', v_version,
                              'contentHash', v_hash, 'changed', false);
  end if;

  update myportifolio.portfolio_publications set is_live = false, unlive_reason = null
  where portfolio_id = v_pf.id and is_live;

  select coalesce(max(pb.version), 0) + 1 into v_version
  from myportifolio.portfolio_publications pb where pb.portfolio_id = v_pf.id;

  insert into myportifolio.portfolio_publications
    (portfolio_id, version, slug, payload, payload_v, content_hash, is_live, published_at)
  values (v_pf.id, v_version, v_pf.slug, v_payload, 2, v_hash, true, now());

  perform set_config('app.escrita_confiavel', 'on', true);
  update myportifolio.portfolios
  set first_published_at = coalesce(first_published_at, now())
  where id = v_pf.id;
  perform set_config('app.escrita_confiavel', 'off', true);

  return jsonb_build_object('slug', v_pf.slug, 'version', v_version,
                            'contentHash', v_hash, 'changed', true);
end;
$$;
revoke execute on function myportifolio.publicar_interno(uuid) from public, anon, authenticated;

-- CONFERENCIA DA PRIMEIRA PUBLICACAO ----------------------------------------
-- RISCO R8. A defesa contra phishing no nosso dominio era 100% reativa: denylist de
-- ENDERECO (0002), takedown depois do dano, e "se escalar, revisao manual". O sinal
-- previsto era o dono perceber sozinho. Com pagamento por impulso e provisionamento
-- automatico, 'nubank-verificacao' com conteudo de isca sai no ar sem nenhum humano ver, e
-- o custo do erro nao e o tenant: e o dominio pai marcado, levando junto a vitrine, o
-- checkout e TODOS os clientes vitalicios de uma vez.
--
-- O preco disso e delay na primeira publicacao de cada conta, e so nela. Ele e pago uma vez
-- por cliente, contra um dano que nao tem volta. A prevea (6.9) continua funcionando durante
-- a espera, entao o comprador ve o resultado na hora, e o que espera e o mundo ver.
create or replace function myportifolio.publish_portfolio(p_portfolio_id uuid)
returns jsonb language plpgsql security definer set search_path = myportifolio, public as $$
declare v_pf myportifolio.portfolios%rowtype; v_r jsonb;
begin
  -- security definer ignora RLS, entao a autorizacao tem que ser explicita aqui.
  if not (myportifolio.owns_portfolio(p_portfolio_id) or myportifolio.is_admin()) then
    raise exception 'sem permissao para publicar';
  end if;
  -- Sob pagamento vitalicio (decisao 1) esta e a UNICA recusa que existe, e ela vem
  -- de blocked (reembolso, chargeback, abuso) ou de nunca ter havido compra.
  if not (myportifolio.portfolio_tem_acesso_ativo(p_portfolio_id) or myportifolio.is_admin()) then
    raise exception 'sem compra ativa para este e-mail';
  end if;

  select * into v_pf from myportifolio.portfolios where id = p_portfolio_id;
  if v_pf.first_published_at is null and v_pf.first_publish_approved_at is null then
    -- NAO cria publicacao: nada de linha com is_live falso e nada de first_published_at,
    -- senao o endereco passaria a responder 410 (o ramo 'gone' de get_published_portfolio)
    -- por um portfolio que nunca esteve no ar. Enquanto espera, o endereco continua sendo
    -- "ainda esta livre" para o mundo, que e a verdade.
    insert into myportifolio.publish_reviews (portfolio_id, requested_at)
    values (p_portfolio_id, now())
    on conflict (portfolio_id) do update set requested_at = now(), decided_at = null;
    return jsonb_build_object('status', 'em_revisao', 'slug', v_pf.slug);
  end if;

  v_r := myportifolio.publicar_interno(p_portfolio_id);
  return v_r || jsonb_build_object('status', 'no_ar');
end;
$$;
revoke execute on function myportifolio.publish_portfolio(uuid) from public, anon;
grant execute on function myportifolio.publish_portfolio(uuid) to authenticated;

-- A fila de conferencia. Uma linha por portfolio, e ela some da fila quando o dono decide.
create table if not exists myportifolio.publish_reviews (
  portfolio_id uuid primary key references myportifolio.portfolios(id) on delete cascade,
  requested_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by text,
  decision text check (decision in ('aprovado','recusado'))
);
alter table myportifolio.publish_reviews enable row level security;
revoke all on myportifolio.publish_reviews from anon, authenticated;
create policy "dono le a propria conferencia" on myportifolio.publish_reviews
  for select to authenticated using (myportifolio.owns_portfolio(portfolio_id));
create policy "admin le a fila de conferencia" on myportifolio.publish_reviews
  for select to authenticated using (myportifolio.is_admin());
grant select on myportifolio.publish_reviews to authenticated;

-- Um clique: aprova e publica na mesma transacao. A aprovacao e por CONTA e nao por
-- versao, entao ela acontece uma vez na vida do cliente.
create or replace function myportifolio.admin_approve_first_publish(p_portfolio_id uuid)
returns jsonb language plpgsql security definer set search_path = myportifolio, public as $$
declare v_r jsonb;
begin
  if not myportifolio.is_admin() then raise exception 'apenas admin'; end if;
  perform set_config('app.escrita_confiavel', 'on', true);
  update myportifolio.portfolios
  set first_publish_approved_at = now(),
      first_publish_approved_by = (select myportifolio.current_login_email())
  where id = p_portfolio_id and first_publish_approved_at is null;
  perform set_config('app.escrita_confiavel', 'off', true);

  update myportifolio.publish_reviews
  set decided_at = now(), decided_by = (select myportifolio.current_login_email()),
      decision = 'aprovado'
  where portfolio_id = p_portfolio_id;

  v_r := myportifolio.publicar_interno(p_portfolio_id);
  perform myportifolio.registrar_moderacao('primeira_publicacao_aprovada', null, p_portfolio_id);
  return v_r;
end;
$$;
revoke execute on function myportifolio.admin_approve_first_publish(uuid) from public, anon;
grant execute on function myportifolio.admin_approve_first_publish(uuid) to authenticated;

-- Recusar nao apaga nada e nao bloqueia ninguem: devolve o pedido com motivo, e o
-- comprador corrige e pede de novo. Banir e outra RPC (admin_takedown_portfolio), com
-- outro peso, e confundir as duas transforma "escreveu bobagem" em "perdeu o que pagou".
create or replace function myportifolio.admin_reject_first_publish(p_portfolio_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = myportifolio, public as $$
begin
  if not myportifolio.is_admin() then raise exception 'apenas admin'; end if;
  update myportifolio.publish_reviews
  set decided_at = now(), decided_by = (select myportifolio.current_login_email()),
      decision = 'recusado'
  where portfolio_id = p_portfolio_id;
  perform myportifolio.registrar_moderacao('primeira_publicacao_recusada', null,
                                     p_portfolio_id, p_reason);
end;
$$;
revoke execute on function myportifolio.admin_reject_first_publish(uuid, text) from public, anon;
grant execute on function myportifolio.admin_reject_first_publish(uuid, text) to authenticated;

-- unlive_reason = 'dono': saiu do ar por vontade de quem manda na pagina. Nenhum evento
-- de acesso posterior pode desfazer isso sozinho.
create or replace function myportifolio.unpublish_portfolio(p_portfolio_id uuid) returns void
language plpgsql security definer set search_path = myportifolio, public as $$
begin
  if not (myportifolio.owns_portfolio(p_portfolio_id) or myportifolio.is_admin()) then
    raise exception 'sem permissao';
  end if;
  update myportifolio.portfolio_publications set is_live = false, unlive_reason = 'dono'
  where portfolio_id = p_portfolio_id and is_live;
end;
$$;
revoke execute on function myportifolio.unpublish_portfolio(uuid) from public, anon;
grant execute on function myportifolio.unpublish_portfolio(uuid) to authenticated;

-- ACHADO 13: voltar atras. Nao ressuscita o numero antigo: COPIA o payload antigo para
-- uma versao NOVA, porque version e a ordem do historico e reusar numero embaralharia a
-- linha do tempo que o botao de restaurar mostra. A invalidacao de borda nao depende
-- disso: a chave do documento e o content_hash (secao 2), e os tokens Cloudflare do dono
-- nao tem permissao de purge, entao a unica invalidacao possivel e mesmo trocar a chave.
create or replace function myportifolio.restore_publication(p_portfolio_id uuid, p_version bigint)
returns jsonb language plpgsql security definer set search_path = myportifolio, public as $$
declare
  v_old myportifolio.portfolio_publications%rowtype;
  v_new bigint; v_slug text; v_payload jsonb;
begin
  if not (myportifolio.owns_portfolio(p_portfolio_id) or myportifolio.is_admin()) then
    raise exception 'sem permissao';
  end if;
  if not myportifolio.portfolio_tem_acesso_ativo(p_portfolio_id) and not myportifolio.is_admin() then
    raise exception 'sem compra ativa para este e-mail';
  end if;
  select * into v_old from myportifolio.portfolio_publications
  where portfolio_id = p_portfolio_id and version = p_version;
  if not found then raise exception 'versao % inexistente', p_version; end if;

  update myportifolio.portfolio_publications set is_live = false, unlive_reason = null
  where portfolio_id = p_portfolio_id and is_live;

  select coalesce(max(version), 0) + 1 into v_new
  from myportifolio.portfolio_publications where portfolio_id = p_portfolio_id;

  -- O slug vem de portfolios, NUNCA de v_old.slug. v_old.slug e o endereco que aquela
  -- versao tinha, e restaurar conteudo nao pode restaurar endereco: quem publicou em
  -- 'joao', trocou para 'joao-silva' e depois restaurou uma versao antiga cairia com
  -- 'joao-silva' fora do ar (nenhuma publicacao is_live com esse slug) e com 'joao', que
  -- pode ja ter sido dado a outra pessoa, servindo este tenant. Restaurar e sobre payload.
  -- Pelo mesmo motivo o campo 'slug' de dentro do payload e reescrito e o content_hash e
  -- RECALCULADO: ele e a chave de cache, e chave calculada com o endereco velho e chave
  -- errada.
  select pf.slug into v_slug from myportifolio.portfolios pf where pf.id = p_portfolio_id;
  v_payload := jsonb_set(v_old.payload, '{slug}', to_jsonb(v_slug));

  insert into myportifolio.portfolio_publications
    (portfolio_id, version, slug, payload, payload_v, content_hash, is_live, published_at)
  values (p_portfolio_id, v_new, v_slug, v_payload, v_old.payload_v,
          md5(v_payload::text || v_slug), true, now());

  return jsonb_build_object('restoredFrom', p_version, 'version', v_new);
end;
$$;
revoke execute on function myportifolio.restore_publication(uuid, bigint) from public, anon;
grant execute on function myportifolio.restore_publication(uuid, bigint) to authenticated;

-- Retencao: 10 versoes por portfolio. Sem isto o historico cresce sem teto num plano
-- com 1 GB de banco.
select cron.schedule('faxina-publicacoes', '33 4 * * *', $$
  delete from myportifolio.portfolio_publications pb
  using (select portfolio_id, version,
                row_number() over (partition by portfolio_id order by version desc) as rn
           from myportifolio.portfolio_publications where not is_live) velhas
  where pb.portfolio_id = velhas.portfolio_id
    and pb.version = velhas.version
    and velhas.rn > 10;
$$);

-- RETENCAO DE ENDERECO, E QUEM DEVOLVE ELE AO ESTOQUE -----------------------
-- Reter sem liberar e reter para sempre. slug_available() consulta portfolios, a linha de
-- quem foi reembolsado continua la com o slug, e portanto CADA reembolso, chargeback e
-- banimento encolheria o namespace em definitivo. Num produto de nome curto vendido por
-- impulso, os nomes bons ('joao', 'design', 'fotografo') sao o estoque, e estoque que so
-- diminui e o sequestro de namespace do achado 16 entrando pela porta dos fundos, causado
-- justamente por quem pediu o dinheiro de volta.
--
-- Regra, e ela e a mesma escrita na secao 1 e na 5.8:
--   quem nunca publicou libera na hora (nao existe link impresso para preservar);
--   quem publicou libera 90 dias depois da revogacao ou do bloqueio.
-- O portfolio NAO e apagado: ele so troca de endereco para 'bloqueado-<8 hex>', que nao
-- casa termo nenhum da denylist e nao e rotulo que alguem queira. Apagar dado e a purga de
-- 5.9, que e outro prazo e outro direito, e misturar os dois transformaria "devolver um
-- nome ao estoque" em "destruir o backup de quem talvez volte".
--
-- A ordem das duas ultimas instrucoes importa: o trigger validar_slug_portfolio grava o
-- slug antigo em portfolio_slug_history quando ele chegou a estar no ar, e essa linha
-- reservaria o nome por mais 12 meses, ou seja, a funcao de liberar terminaria reservando.
-- Por isso o historico daquele portfolio e apagado LOGO DEPOIS do update: quem foi revogado
-- nao tem para onde redirecionar, e 301 para uma pagina fora do ar nao serve a ninguem.
create or replace function myportifolio.liberar_slug_retido() returns int
language plpgsql security definer set search_path = myportifolio, public, extensions as $$
declare r record; v_n int := 0; v_novo text;
begin
  for r in
    select pf.id, pf.slug
    from myportifolio.portfolios pf
    join myportifolio.member_access ma on ma.email = pf.owner_email
    where pf.slug not like 'bloqueado-%'
      and (ma.blocked or not ma.has_main)
      and (pf.first_published_at is null
           or coalesce(ma.main_revoked_at, ma.blocked_at, ma.updated_at)
              < now() - interval '90 days')
  loop
    v_novo := 'bloqueado-' || encode(gen_random_bytes(4), 'hex');
    perform set_config('app.escrita_confiavel', 'on', true);
    update myportifolio.portfolios set slug = v_novo where id = r.id;
    perform set_config('app.escrita_confiavel', 'off', true);
    delete from myportifolio.portfolio_slug_history where portfolio_id = r.id;
    perform myportifolio.registrar_moderacao('slug_liberado', null, r.id,
      'retencao vencida', jsonb_build_object('slug_liberado', r.slug, 'slug_novo', v_novo));
    v_n := v_n + 1;
  end loop;
  return v_n;
end;
$$;
revoke execute on function myportifolio.liberar_slug_retido() from public, anon, authenticated;

select cron.schedule('libera-slug-retido', '7 5 * * *',
  $$select myportifolio.liberar_slug_retido();$$);

-- ACHADO 12: corrigir um bug de derivacao (filtros, ordenacao, campo novo no payload)
-- exige rodar de novo sobre todos os tenants. Isso e custo real do snapshot, e ter a
-- RPC pronta desde a fase 1 e a diferenca entre um comando e um script improvisado.
create or replace function myportifolio.republish_all(p_apenas_payload_v smallint default null)
returns int language plpgsql security definer set search_path = myportifolio, public as $$
declare r record; v_n int := 0;
begin
  if not myportifolio.is_admin() then raise exception 'apenas admin'; end if;
  for r in
    select pb.portfolio_id from myportifolio.portfolio_publications pb
    where pb.is_live
      and (p_apenas_payload_v is null or pb.payload_v = p_apenas_payload_v)
  loop
    perform myportifolio.publish_portfolio(r.portfolio_id);
    v_n := v_n + 1;
  end loop;
  return v_n;
end;
$$;
revoke execute on function myportifolio.republish_all(smallint) from public, anon;
grant execute on function myportifolio.republish_all(smallint) to authenticated;

-- BLOQUEIO DERRUBA A PAGINA -------------------------------------------------
-- ACHADO 10. Em trigger, e nao no codigo do webhook, porque nenhum caminho de bloqueio
-- pode esquecer disso: chargeback, reembolso e banimento manual passam todos por
-- member_access. Nao existe reativacao por pagamento (decisao 1): desbloquear e ato
-- humano, e ele devolve a pagina no mesmo trigger.
--
-- has_custom entra no gatilho junto com has_main e blocked. Sem isso, o estorno do bump de
-- personalizacao nao tinha efeito nenhum: a normalizacao de montar_payload_portfolio so
-- vale no PROXIMO publish, e o cliente que pediu reembolso do bump simplesmente nunca mais
-- clica em Publicar. Sob pagamento unico nao existe cobranca seguinte que corrija isso, e
-- a personalizacao ficaria no ar para sempre, com o dinheiro devolvido. Vale para o outro
-- lado tambem: quem compra o bump depois quer ver a cor aparecer sem republicar na mao.
create or replace function myportifolio.sync_publicacao_por_acesso() returns trigger
language plpgsql security definer set search_path = myportifolio, public as $$
declare
  v_no_ar boolean := new.has_main and not new.blocked;
  v_custom_mudou boolean := false;
  r record;
begin
  -- OLD nao existe em INSERT, entao a comparacao vive aqui e nao na secao declare.
  if tg_op = 'INSERT' then
    v_custom_mudou := new.has_custom;
  elsif old.has_custom is distinct from new.has_custom then
    v_custom_mudou := true;
  end if;

  if tg_op = 'UPDATE'
     and old.has_main = new.has_main and old.blocked = new.blocked
     and old.has_custom = new.has_custom then
    return new;
  end if;

  if v_no_ar then
    -- Devolve ao ar a ultima versao publicada, e SO se ela tiver saido do ar por
    -- revogacao. Sem o filtro de unlive_reason, desbloquear alguem republicava o
    -- portfolio que o dono tinha despublicado de proposito, e pior: republicava tambem o
    -- de quem pediu exclusao de conta e ainda esta dentro da carencia de 7 dias, que e
    -- exatamente o direito que a secao 5.9 diz atender.
    update myportifolio.portfolio_publications pb
    set is_live = true, unlive_reason = null
    from myportifolio.portfolios pf
    where pf.id = pb.portfolio_id
      and pf.owner_email = new.email
      and pb.version = (select max(x.version) from myportifolio.portfolio_publications x
                        where x.portfolio_id = pf.id)
      and not pb.is_live
      and pb.unlive_reason = 'revogado'
      and pf.first_published_at is not null;
  else
    update myportifolio.portfolio_publications pb
    set is_live = false, unlive_reason = 'revogado'
    from myportifolio.portfolios pf
    where pf.id = pb.portfolio_id and pf.owner_email = new.email and pb.is_live;
  end if;

  -- Republica na hora quando o bump de personalizacao entra ou sai, para quem esta no ar.
  -- publicar_interno e idempotente por content_hash: se o payload nao mudou, nao cria
  -- versao nova nem invalida cache.
  if v_no_ar and v_custom_mudou then
    for r in select pb.portfolio_id
             from myportifolio.portfolio_publications pb
             join myportifolio.portfolios pf on pf.id = pb.portfolio_id
             where pf.owner_email = new.email and pb.is_live
    loop
      perform myportifolio.publicar_interno(r.portfolio_id);
    end loop;
  end if;
  return new;
end;
$$;
create trigger member_access_sync_publicacao
  after insert or update of has_main, has_custom, blocked
  on myportifolio.member_access for each row execute function myportifolio.sync_publicacao_por_acesso();

-- LEITURA PUBLICA ----------------------------------------------------------
-- ACHADO 6: junto com get_draft_portfolio, esta e uma das duas portas anonimas do schema
-- inteiro, e ela devolve UM tenant por chamada. security definer aqui e seguro e
-- proposital: de conteudo ela so LE, o filtro is_live esta cravado no corpo (nao vem de
-- parametro), e o efeito de ser definer e resolver slug antigo sem abrir
-- portfolio_slug_history para ninguem e consumir o balde de cota sem dar a tabela de cota
-- para anon. A unica escrita que ela faz e a do proprio balde, e ela e por portfolio_id
-- resolvido: nao existe caminho em que a entrada do visitante vire linha nova.
--
-- Devolve 'portfolioId' e 'contentHash' porque a chave de cache do Worker e
-- /<portfolio_id>/<content_hash> (achado 11, mais a colisao entre tenants que a chave por
-- slug produzia), 'version' porque o editor mostra o numero, e 'payloadV' porque o Worker
-- precisa recusar formato que nao conhece (achado 12). portfolio_id nao e segredo: ele ja
-- e a primeira pasta de toda URL publica de imagem do tenant.
--
-- QUATRO estados, e o quarto nao e enfeite. Com tres estados (ok, moved, not_found), um
-- portfolio banido ficava indistinguivel de slug que nunca existiu, e o Worker respondia
-- 404 com a pagina "este endereco ainda esta livre" mais o CTA de comprar o endereco de
-- quem acabou de ser banido. O 410 que a secao 2 e a 5.8 prometem so existe se o banco
-- souber dizer 'gone'. O quinto estado, 'throttled', e de custo e nao de conteudo.
--
-- POR QUE ESTA FUNCAO TEM TETO. Ela e anonima e a anon key e publica por construcao (o
-- bundle do editor precisa dela). Um laco de curl em /rest/v1/rpc/get_published_portfolio
-- NAO passa pela borda: ignora o cache inteiro da secao 2 e vai direto na unica alavanca de
-- custo variavel do produto, num modelo onde a receita ja entrou uma vez e o custo e eterno
-- (9.2). Cache que so protege quem passa por ele nao protege nada.
--
-- A ORDEM E SEGURANCA, nao estilo, e e a mesma de get_draft_portfolio: valida formato,
-- resolve o ponteiro barato (uma linha de indice, sem payload), e SO ENTAO consome cota
-- chaveada pelo portfolio_id RESOLVIDO, que e um conjunto fechado que o atacante nao
-- inventa. Chavear pelo texto que chegou daria uma linha nova de balde por requisicao, que
-- e a amplificacao de escrita que o teto existia para evitar.
--
-- Os ramos sem payload (moved, gone, not_found) nao consomem cota: sao resposta de tamanho
-- fixo custando um indice, e cobrar cota deles transformaria varredura de nome em negacao
-- de servico contra tenant que nem existe.
create or replace function myportifolio.get_published_portfolio(p_slug text) returns jsonb
language plpgsql security definer set search_path = myportifolio, public as $$
declare v_slug text := lower(trim(coalesce(p_slug, ''))); v_pf uuid; v_r jsonb;
begin
  if not myportifolio.slug_dns_valido(v_slug) then
    return jsonb_build_object('status','not_found');
  end if;

  select pb.portfolio_id into v_pf from myportifolio.portfolio_publications pb
  where pb.slug = v_slug and pb.is_live;

  if v_pf is null then
    return coalesce(
      (select jsonb_build_object('status','moved','slug',pb.slug)
       from myportifolio.portfolio_slug_history h
       join myportifolio.portfolio_publications pb
         on pb.portfolio_id = h.portfolio_id and pb.is_live
       where h.slug = v_slug and h.expires_at > now() limit 1),
      -- Endereco que ja esteve no ar e hoje nao esta: banimento, reembolso, chargeback,
      -- despublicacao pelo dono ou pedido de exclusao. Nenhum deles volta a ser oferta de
      -- compra, e todos merecem o sinal que tira a URL do indice. Depois que
      -- liberar_slug_retido() renomeia o portfolio, este ramo deixa de casar de proposito:
      -- ai o endereco esta de fato livre outra vez.
      (select jsonb_build_object('status','gone')
       from myportifolio.portfolios pf
       where pf.slug = v_slug and pf.first_published_at is not null),
      jsonb_build_object('status','not_found'));
  end if;

  -- 600 leituras por hora POR TENANT. E ordem de grandeza acima do trafego real do tenant
  -- mediano descrito na secao 2 ("muitos tenants, pouquissimas visitas cada") e ordem de
  -- grandeza abaixo do que um laco de curl produz num minuto. Quem paga a conta do excesso
  -- e o atacante: o visitante legitimo que cair na janela recebe a copia de socorro da
  -- borda, que e exatamente o caso em que ela vale mais.
  if not myportifolio.consume_access_quota('read', v_pf::text, 600) then
    return jsonb_build_object('status','throttled');
  end if;

  select jsonb_build_object('status','ok','slug',pb.slug,
                            'portfolioId',pb.portfolio_id,'version',pb.version,
                            'payloadV',pb.payload_v,'contentHash',pb.content_hash,
                            'publishedAt',pb.published_at,'payload',pb.payload)
  into v_r
  from myportifolio.portfolio_publications pb
  where pb.portfolio_id = v_pf and pb.is_live;

  return coalesce(v_r, jsonb_build_object('status','not_found'));
end;
$$;
grant execute on function myportifolio.get_published_portfolio(text) to anon, authenticated;

-- SITEMAP ------------------------------------------------------------------
-- ACHADO 6: a view published_portfolios do v1 estava com grant select para anon e era
-- o mesmo dump por outro nome. Ela SAI. O sitemap passa a ser gerado pelo Worker, que
-- e servidor, com a service role key guardada como secret do Worker (fase 3).
--
-- Regra de operacao: a service role key e usada EXCLUSIVAMENTE na rota /sitemap.xml do
-- apex. A rota de render de tenant usa a anon key e so chama get_published_portfolio.
-- Devolve so slug e data. Nunca payload, nunca e-mail.
create or replace function myportifolio.list_published_slugs(p_limit int default 5000)
returns table (slug text, published_at timestamptz)
language sql security definer set search_path = myportifolio, public stable as $$
  select pb.slug, pb.published_at from myportifolio.portfolio_publications pb
  where pb.is_live order by pb.published_at desc limit least(coalesce(p_limit, 5000), 20000);
$$;
revoke execute on function myportifolio.list_published_slugs(int) from public, anon, authenticated;
grant execute on function myportifolio.list_published_slugs(int) to service_role;

-- CICLO DE VIDA DO COMPRADOR -----------------------------------------------
create or replace function myportifolio.slug_available(p_slug text) returns boolean
language plpgsql security definer set search_path = myportifolio, public stable as $$
declare v_slug text := lower(trim(coalesce(p_slug, '')));
begin
  if not myportifolio.slug_dns_valido(v_slug) then return false; end if;
  if exists (select 1 from myportifolio.reserved_slugs where slug = v_slug) then return false; end if;
  if exists (select 1 from myportifolio.portfolios where slug = v_slug) then return false; end if;
  if exists (select 1 from myportifolio.portfolio_slug_history
             where slug = v_slug and expires_at > now()) then return false; end if;
  return true;
end;
$$;
-- So authenticated: aberta para anon, viraria scanner publico de slugs.
revoke execute on function myportifolio.slug_available(text) from public, anon;
grant execute on function myportifolio.slug_available(text) to authenticated;

-- ACHADO 9: o webhook NAO cria linha em portfolios. Motivos, em ordem:
--   1. no momento da compra ninguem escolheu endereco, e slug e display_name sao
--      not null com validacao de subdominio: o insert do v1 falhava SEMPRE;
--   2. chegam ate 3 eventos por compra, e o segundo insert bateria na
--      unique (owner_email), o webhook responderia 500, a Hubla retentaria e cairia no
--      buraco do achado 5;
--   3. elimina um estado do sistema (linha de portfolio sem endereco).
-- p_role e p_kit vem do wizard (secao 6.8): sao escritos AQUI porque starter_kit e
-- coluna protegida pelo trigger de guarda e o cliente nao pode escrever nela depois.
create or replace function myportifolio.create_my_portfolio(
  p_slug text, p_display_name text, p_role text default null, p_kit text default null)
returns uuid language plpgsql security definer set search_path = myportifolio, public as $$
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
  return v_id;
end;
$$;
revoke execute on function myportifolio.create_my_portfolio(text, text, text, text) from public, anon;
grant execute on function myportifolio.create_my_portfolio(text, text, text, text) to authenticated;

-- ACHADO 16: trocar de endereco e caro (quebra link distribuido) e e o vetor de
-- sequestro de namespace. Duas trocas por janela de 90 dias, contadas na propria linha.
create or replace function myportifolio.change_my_slug(p_portfolio_id uuid, p_slug text)
returns void language plpgsql security definer set search_path = myportifolio, public as $$
declare v_pf myportifolio.portfolios%rowtype;
begin
  if not (myportifolio.owns_portfolio(p_portfolio_id) or myportifolio.is_admin()) then
    raise exception 'sem permissao';
  end if;
  select * into v_pf from myportifolio.portfolios where id = p_portfolio_id for update;
  if not myportifolio.slug_available(p_slug) then raise exception 'endereco indisponivel: %', p_slug; end if;

  if not myportifolio.is_admin() then
    if v_pf.slug_window_started_at < now() - interval '90 days' then
      v_pf.slug_changes_count := 0;
      v_pf.slug_window_started_at := now();
    end if;
    if v_pf.slug_changes_count >= 2 then
      raise exception 'limite de 2 trocas de endereco a cada 90 dias atingido';
    end if;
  end if;

  perform set_config('app.escrita_confiavel', 'on', true);
  update myportifolio.portfolios
  set slug = lower(trim(p_slug)),
      slug_changes_count = v_pf.slug_changes_count + 1,
      slug_window_started_at = v_pf.slug_window_started_at
  where id = p_portfolio_id;
  -- a publicacao no ar passa a responder pelo endereco novo
  update myportifolio.portfolio_publications set slug = lower(trim(p_slug))
  where portfolio_id = p_portfolio_id and is_live;
  perform set_config('app.escrita_confiavel', 'off', true);
end;
$$;
revoke execute on function myportifolio.change_my_slug(uuid, text) from public, anon;
grant execute on function myportifolio.change_my_slug(uuid, text) to authenticated;

-- PREVIA (achado 26, desenho completo na secao 6.9) --------------------------
-- O token em claro e devolvido UMA vez por esta RPC e nunca mais. O banco guarda o
-- sha256. SQL nao tem comparacao em tempo constante, e fingir que tem seria pior:
-- comparar HASHES resolve de verdade, porque vazar o prefixo do hash do palpite do
-- atacante nao o aproxima do segredo.
create or replace function myportifolio.rotate_preview_token(p_portfolio_id uuid)
returns text language plpgsql security definer set search_path = myportifolio, public, extensions as $$
declare v_token text;
begin
  if not (myportifolio.owns_portfolio(p_portfolio_id) or myportifolio.is_admin()) then
    raise exception 'sem permissao';
  end if;
  v_token := encode(gen_random_bytes(24), 'hex');
  perform set_config('app.escrita_confiavel', 'on', true);
  update myportifolio.portfolios
  set preview_token_hash = encode(digest(v_token, 'sha256'), 'hex'),
      preview_token_rotated_at = now()
  where id = p_portfolio_id;
  perform set_config('app.escrita_confiavel', 'off', true);
  return v_token;
end;
$$;
revoke execute on function myportifolio.rotate_preview_token(uuid) from public, anon;
grant execute on function myportifolio.rotate_preview_token(uuid) to authenticated;

-- Devolve NULL quando nao casa, nunca erro: quem chama responde 404 igual ao de slug
-- inexistente. 403 diria "esse slug existe, o token e que esta errado".
-- consume_access_quota() vive em 0006 e e o rate limit por slug (60 por hora).
--
-- A ORDEM DAS INSTRUCOES AQUI E SEGURANCA, nao estilo. Esta e a unica funcao anonima que
-- ESCREVE no banco (o balde de cota), e a versao anterior consumia a cota com o texto cru
-- que o chamador mandou, antes de qualquer validacao. Com a anon key, que e publica, cada
-- requisicao com um slug aleatorio criava uma linha nova em access_throttle: o teto de 60
-- nunca era atingido (o balde e por chave) e cada chamada virava uma escrita no Postgres,
-- sem passar por Turnstile, porque a Edge Function nao esta neste caminho. Isso e
-- amplificacao de escrita no unico componente que o pagamento unico nao pode sobrecarregar.
--
-- Agora: valida formato, resolve o portfolio, e so entao consome cota chaveada pelo
-- portfolio_id, que e um conjunto fechado que o atacante nao inventa.
create or replace function myportifolio.get_draft_portfolio(p_slug text, p_token text)
returns jsonb language plpgsql security definer set search_path = myportifolio, public, extensions as $$
declare v jsonb; v_pf uuid;
begin
  if not myportifolio.slug_dns_valido(lower(trim(coalesce(p_slug, '')))) then
    return null;
  end if;

  select pf.id into v_pf
  from myportifolio.portfolios pf
  join myportifolio.member_access ma on ma.email = pf.owner_email
  where pf.slug = lower(trim(p_slug))
    and ma.has_main and not ma.blocked
    and pf.preview_token_hash is not null;
  if v_pf is null then return null; end if;

  if not myportifolio.consume_access_quota('preview', v_pf::text, 60) then
    return null;
  end if;

  select myportifolio.montar_payload_portfolio(pf.id) into v
  from myportifolio.portfolios pf
  where pf.id = v_pf
    and pf.preview_token_hash = encode(digest(p_token, 'sha256'), 'hex');

  return v;
end;
$$;
grant execute on function myportifolio.get_draft_portfolio(text, text) to anon, authenticated;

-- A ponte e-mail -> user_id, em trigger para nao depender do front. Roda uma vez.
-- Resolve alias: quem loga com e-mail alternativo tambem reivindica o portfolio certo.
create or replace function myportifolio.claim_portfolio_on_signup() returns trigger
language plpgsql security definer set search_path = myportifolio, public as $$
declare v_compra text;
begin
  select coalesce(
    (select ma.email from myportifolio.member_access ma where ma.email = lower(new.email)),
    (select al.purchase_email from myportifolio.access_aliases al where al.login_email = lower(new.email)))
  into v_compra;
  if v_compra is null then return new; end if;

  perform set_config('app.escrita_confiavel', 'on', true);
  update myportifolio.portfolios set owner_id = new.id
  where owner_email = v_compra and owner_id is null;
  perform set_config('app.escrita_confiavel', 'off', true);

  update myportifolio.member_access set user_id = new.id
  where email = v_compra and user_id is null;
  return new;
end;
$$;
create trigger claim_portfolio after insert on auth.users
  for each row execute function myportifolio.claim_portfolio_on_signup();

-- ACHADO 3: NAO existe sync_access_email. Trocar o e-mail em auth.users nao mexe em
-- member_access nem em portfolios.owner_email. O e-mail da compra e imutavel; quem
-- muda de e-mail ganha um alias (secao 5.6). Sem isto, bastava trocar o e-mail e pedir
-- reembolso para ficar com o produto de graca.

-- Reordenacao em UMA instrucao. Sem indice unico em (portfolio_id, position) de
-- proposito: unico obrigaria valor temporario a cada troca de dois cards.
create or replace function myportifolio.reorder_portfolio_projects(p_portfolio_id uuid, p_ids uuid[])
returns void language plpgsql security definer set search_path = myportifolio, public as $$
declare v_total int;
begin
  if not (myportifolio.owns_portfolio(p_portfolio_id) or myportifolio.is_admin()) then
    raise exception 'sem permissao';
  end if;
  select count(*) into v_total from myportifolio.portfolio_projects where portfolio_id = p_portfolio_id;
  if v_total <> coalesce(array_length(p_ids, 1), 0) then
    raise exception 'a lista de ordenacao nao cobre todos os projetos';
  end if;
  update myportifolio.portfolio_projects pj set position = (novo.ordem - 1)::int
  from unnest(p_ids) with ordinality as novo(id, ordem)
  where pj.id = novo.id and pj.portfolio_id = p_portfolio_id;
end;
$$;
revoke execute on function myportifolio.reorder_portfolio_projects(uuid, uuid[]) from public, anon;
grant execute on function myportifolio.reorder_portfolio_projects(uuid, uuid[]) to authenticated;

-- MODERACAO ----------------------------------------------------------------
-- Tirar do ar por abuso e um comando, nao um deploy. Note que isto NAO e suspensao por
-- pagamento, que nao existe (decisao 1): e moderacao de conteudo.
--
-- Takedown que deixa a midia no ar nao e takedown. O bucket e publico por decisao (4.6),
-- as URLs sao estaveis, e sem este passo as imagens do conteudo abusivo continuavam
-- servidas de infraestrutura nossa depois do banimento, com a pagina fora do ar dando a
-- falsa sensacao de resolvido. Marcar como orfa e purgar na mesma transacao resolve as
-- duas coisas: sai do ar e para de contar cota. O material de prova, se for preciso, se
-- baixa ANTES de rodar isto, e essa ordem esta no roteiro de moderacao de 5.8.
create or replace function myportifolio.admin_takedown_portfolio(p_portfolio_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = myportifolio, public as $$
declare v_email text;
begin
  if not myportifolio.is_admin() then raise exception 'apenas admin'; end if;
  select owner_email into v_email from myportifolio.portfolios where id = p_portfolio_id;
  update myportifolio.portfolio_publications set is_live = false, unlive_reason = 'revogado'
  where portfolio_id = p_portfolio_id and is_live;

  update myportifolio.portfolio_media
  set is_orphan = true, orphan_since = coalesce(orphan_since, now())
  where portfolio_id = p_portfolio_id;
  perform myportifolio.purgar_midia_orfa(interval '0 seconds', p_portfolio_id);

  perform myportifolio.admin_block_member(v_email, coalesce(p_reason, 'abuso'));
  perform myportifolio.registrar_moderacao('takedown', v_email, p_portfolio_id, p_reason);
end;
$$;
revoke execute on function myportifolio.admin_takedown_portfolio(uuid, text) from public, anon;
grant execute on function myportifolio.admin_takedown_portfolio(uuid, text) to authenticated;
