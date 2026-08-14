-- 0008_juridico_faltante.sql
--
-- Fecha tres buracos que so apareceram quando o front foi escrito contra o banco. Os tres
-- estavam DESCRITOS no plano (secoes 5.6 e 5.9) mas nao tinham SQL, porque o plano os
-- descreve campo a campo em vez de escrever a funcao. Sem eles, o pacote juridico da fase 1
-- tem botao que nao funciona, e o pacote juridico e pre requisito da primeira venda.

-- 1. VERSAO VIGENTE DOS TERMOS ----------------------------------------------
-- Ela morava so no bundle (legal.config.js). Isso significa que o servidor nao tinha como
-- saber qual versao esta valendo, e portanto nao tinha como recusar quem aceitou uma versao
-- antiga. Consentimento que so o cliente conhece nao serve de prova de nada.
insert into myportifolio.app_settings (key, value)
values ('terms_version', '2026-08-14')
on conflict (key) do nothing;

-- 2. EXPORTAR MEUS DADOS (LGPD art. 18 e 20) ---------------------------------
-- Devolve TUDO que esta amarrado ao e-mail de compra de quem chama, em jsonb. O filtro e
-- current_purchase_email() e nao o e-mail de login: quem tem login divergente (5.6) precisa
-- exportar os dados da COMPRA, senao a exportacao vem vazia justamente para quem mais
-- precisa dela.
--
-- Portabilidade de verdade significa formato que a pessoa consegue usar noutro lugar, entao
-- sai o conteudo (perfil, projetos, experiencias), e nao so o cadastro.
create or replace function myportifolio.export_my_data()
returns jsonb
language plpgsql
stable
security definer
set search_path = myportifolio, public
as $$
declare
  v_email text := (select myportifolio.current_purchase_email());
  v_pf uuid;
begin
  if v_email is null then raise exception 'sem conta para exportar'; end if;
  select p.id into v_pf from myportifolio.portfolios p where p.owner_email = v_email;

  return jsonb_build_object(
    'geradoEm', now(),
    'emailDaCompra', v_email,
    'acesso', (select to_jsonb(x) from (
        select ma.email, ma.has_main, ma.has_custom, ma.has_setup, ma.quota_code,
               ma.granted_at, ma.main_granted_at, ma.blocked
        from myportifolio.member_access ma where ma.email = v_email) x),
    'emailsDeLogin', coalesce((select jsonb_agg(al.login_email)
        from myportifolio.access_aliases al where al.purchase_email = v_email), '[]'::jsonb),
    'termosAceitos', coalesce((select jsonb_agg(jsonb_build_object(
          'versao', tc.terms_version, 'aceitoEm', tc.accepted_at, 'ip', tc.ip))
        from myportifolio.terms_consents tc where tc.email = v_email), '[]'::jsonb),
    'pedidosDeReembolso', coalesce((select jsonb_agg(to_jsonb(rr))
        from myportifolio.refund_requests rr where rr.email = v_email), '[]'::jsonb),
    'portfolio', (select to_jsonb(x) from (
        select p.slug, p.display_name, p.role_i18n, p.bio_i18n, p.contact_email,
               p.socials, p.stats, p.stacks, p.cta_url, p.avatar_path, p.hero_path,
               p.created_at, p.first_published_at
        from myportifolio.portfolios p where p.id = v_pf) x),
    'projetos', coalesce((select jsonb_agg(to_jsonb(pj) order by pj.position)
        from myportifolio.portfolio_projects pj where pj.portfolio_id = v_pf), '[]'::jsonb),
    'experiencias', coalesce((select jsonb_agg(to_jsonb(pe) order by pe.position)
        from myportifolio.portfolio_experiences pe where pe.portfolio_id = v_pf), '[]'::jsonb),
    -- Os caminhos da midia entram para a pessoa saber O QUE existe. Os bytes ela busca pela
    -- URL publica (bucket de midia) ou pela rota assinada (bucket de documento).
    'arquivos', coalesce((select jsonb_agg(jsonb_build_object(
          'bucket', m.bucket, 'caminho', m.path, 'tipo', m.kind, 'bytes', m.bytes))
        from myportifolio.portfolio_media m where m.portfolio_id = v_pf), '[]'::jsonb)
  );
end;
$$;

revoke execute on function myportifolio.export_my_data() from public, anon;
grant execute on function myportifolio.export_my_data() to authenticated;

-- 3. VINCULO DE E-MAIL DE LOGIN (5.6) ----------------------------------------
-- Fecha o fluxo de quem comprou com um e-mail e quer entrar com outro. So o service_role
-- executa: a prova de posse acontece ANTES, na Edge Function, que manda um codigo para o
-- e-mail DA COMPRA. Deixar isto aberto para authenticated seria deixar qualquer pessoa
-- logada apontar o proprio login para a compra de outra.
--
-- Duas recusas que nao sao detalhe:
--   1. cadeia de alias (A aponta para B que aponta para C) nunca e criada, porque
--      current_purchase_email() resolve UM salto so e a cadeia viraria acesso invisivel;
--   2. login que ja e e-mail de compra nao vira alias de outra compra, senao a pessoa
--      perderia acesso ao proprio portfolio ao ganhar acesso ao de outro.
--
-- E o owner_id do portfolio e ZERADO no mesmo passo (achado 14): sem isso, o dono do login
-- ANTIGO continuaria com posse pelo ramo owner_id = auth.uid(), para sempre, e nao existe
-- nenhuma outra RPC que limpe esse campo. Os casos reais sao banais: e-mail de emprego
-- antigo, socio que saiu, ex-conjuge.
create or replace function myportifolio.link_login_email(p_purchase text, p_login text)
returns void
language plpgsql
security definer
set search_path = myportifolio, public
as $$
declare
  v_compra text := lower(trim(p_purchase));
  v_login  text := lower(trim(p_login));
begin
  if v_compra is null or v_login is null or v_compra = '' or v_login = '' then
    raise exception 'e-mail de compra e de login sao obrigatorios';
  end if;
  if v_compra = v_login then raise exception 'os dois e-mails sao o mesmo'; end if;

  if not exists (select 1 from myportifolio.member_access where email = v_compra) then
    raise exception 'nao existe compra para %', v_compra;
  end if;
  if exists (select 1 from myportifolio.member_access where email = v_login) then
    raise exception 'este e-mail ja e de uma compra propria';
  end if;
  if exists (select 1 from myportifolio.access_aliases where login_email = v_compra) then
    raise exception 'cadeia de alias: o e-mail de compra ja e alias de outro';
  end if;

  insert into myportifolio.access_aliases (login_email, purchase_email, reason, created_by)
  values (v_login, v_compra, 'vinculo self com prova de posse', 'self')
  on conflict (login_email) do update
    set purchase_email = excluded.purchase_email, reason = excluded.reason;

  perform set_config('app.escrita_confiavel', 'on', true);
  update myportifolio.portfolios set owner_id = null where owner_email = v_compra;
  perform set_config('app.escrita_confiavel', 'off', true);
end;
$$;

revoke execute on function myportifolio.link_login_email(text, text) from public, anon, authenticated;
grant execute on function myportifolio.link_login_email(text, text) to service_role;

-- 4. CONSENTIMENTO GRAVAVEL PELO SERVIDOR ------------------------------------
-- A record_terms_consent existente deriva o e-mail de current_purchase_email(), que le
-- auth.uid(). Chamada pela Edge Function com service_role, auth.uid() e nulo e ela levanta
-- "sem compra para este e-mail" mesmo para quem comprou. Esta sobrecarga recebe o e-mail
-- por parametro e so o service_role executa, que e quem ja provou a sessao antes de chamar.
create or replace function myportifolio.record_terms_consent(
  p_email text, p_version text, p_ip inet, p_user_agent text)
returns timestamptz
language plpgsql
security definer
set search_path = myportifolio, public
as $$
declare v_email text := lower(trim(p_email));
begin
  if not exists (select 1 from myportifolio.member_access where email = v_email) then
    raise exception 'sem compra para este e-mail';
  end if;
  insert into myportifolio.terms_consents (email, terms_version, ip, user_agent)
  values (v_email, p_version, p_ip, left(coalesce(p_user_agent, ''), 300))
  on conflict (email, terms_version) do nothing;
  return now();
end;
$$;

revoke execute on function myportifolio.record_terms_consent(text, text, inet, text)
  from public, anon, authenticated;
grant execute on function myportifolio.record_terms_consent(text, text, inet, text) to service_role;
