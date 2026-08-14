-- 0010_admin_acessos.sql
--
-- Duas coisas que faltavam para o dono conseguir OPERAR o produto, e nao so olhar:
--
--   1. conceder e revogar acesso pelo painel, sem SQL na mao;
--   2. um is_admin() que ele consiga satisfazer.
--
-- O SEGUNDO ERA UM IMPASSE SILENCIOSO: o e-mail do dono ja estava em admin_users desde o
-- primeiro dia, mas is_admin() exigia `mfa_confirmado_em is not null` e NADA no produto
-- preenchia essa coluna. Nenhuma tela de admin abria, e o sintoma nao era erro: era lista
-- vazia. A trava estava certa em intencao (a conta que derruba o portfolio de um cliente
-- pagante nao pode entrar so com codigo de e-mail) e errada em execucao, porque exigia uma
-- prova que o sistema nao tinha como produzir.

-- 1. IS_ADMIN OLHA O FATOR DE VERDADE ----------------------------------------
-- Em vez de um carimbo que alguem preenche na mao (e que, preenchido na mao, e uma trava de
-- mentira), a pergunta passa a ser feita a `auth.mfa_factors`: existe um segundo fator
-- VERIFICADO para este usuario? Isso e estado que so o proprio Supabase Auth escreve, e so
-- depois de a pessoa provar um codigo TOTP.
--
-- mfa_confirmado_em continua existindo, mas vira o que ele sempre deveria ter sido: registro
-- de DESDE QUANDO, para auditoria. Ele nao decide mais nada, entao preenche-lo por engano
-- (ou de proposito) nao abre porta nenhuma.
create or replace function myportifolio.is_admin()
returns boolean
language sql
stable
security definer
set search_path = myportifolio, public
as $$
  select exists (
    select 1 from myportifolio.admin_users a
    where a.email = (select myportifolio.current_login_email())
  )
  and exists (
    select 1 from auth.mfa_factors f
    where f.user_id = (select auth.uid()) and f.status = 'verified'
  );
$$;

-- Carimba o "desde quando". Idempotente e sem parametro: ela so grava o que ela mesma
-- consegue conferir, e por isso nao aceita ser convencida de nada.
create or replace function myportifolio.admin_confirmar_mfa()
returns timestamptz
language plpgsql
security definer
set search_path = myportifolio, public
as $$
declare
  v_email text := (select myportifolio.current_login_email());
  v_tem boolean;
begin
  if v_email is null then raise exception 'sem sessao'; end if;
  if not exists (select 1 from myportifolio.admin_users where email = v_email) then
    raise exception 'este e-mail nao e de administrador';
  end if;

  select exists (
    select 1 from auth.mfa_factors f
    where f.user_id = (select auth.uid()) and f.status = 'verified'
  ) into v_tem;
  if not v_tem then raise exception 'nenhum segundo fator verificado nesta conta'; end if;

  update myportifolio.admin_users
     set mfa_confirmado_em = coalesce(mfa_confirmado_em, now())
   where email = v_email;

  return (select mfa_confirmado_em from myportifolio.admin_users where email = v_email);
end;
$$;

revoke execute on function myportifolio.admin_confirmar_mfa() from public, anon;
grant execute on function myportifolio.admin_confirmar_mfa() to authenticated;

-- Diz ao front em que pe esta a conta, SEM depender de is_admin() (que e justamente o que
-- ainda nao passa). Sem isto, a tela de MFA teria que adivinhar por que foi recusada, e o
-- dono veria "nao autorizado" sem saber se falta e-mail na lista ou falta o fator.
create or replace function myportifolio.admin_status()
returns jsonb
language sql
stable
security definer
set search_path = myportifolio, public
as $$
  select jsonb_build_object(
    'email', (select myportifolio.current_login_email()),
    'naListaDeAdmin', exists (
      select 1 from myportifolio.admin_users a
      where a.email = (select myportifolio.current_login_email())),
    'temSegundoFator', exists (
      select 1 from auth.mfa_factors f
      where f.user_id = (select auth.uid()) and f.status = 'verified'),
    'confirmadoEm', (select a.mfa_confirmado_em from myportifolio.admin_users a
                     where a.email = (select myportifolio.current_login_email())),
    'ehAdmin', myportifolio.is_admin()
  );
$$;

revoke execute on function myportifolio.admin_status() from public, anon;
grant execute on function myportifolio.admin_status() to authenticated;

-- 2. CONCEDER ACESSO ---------------------------------------------------------
-- A origem e SEMPRE 'cortesia', e isso nao e um parametro de proposito.
--
-- 'hubla' significa "existe uma venda no extrato que explica esta linha", e e sobre isso que
-- a conciliacao de 5.11 pergunta toda semana. Deixar o painel escolher a origem seria
-- permitir que uma concessao manual se disfarcasse de venda, que e exatamente o rastro que a
-- conciliacao existe para achar. Cortesia declarada nao vira divergencia; cortesia disfarcada
-- de venda vira uma venda que ninguem consegue encontrar no extrato.
create or replace function myportifolio.admin_grant_member_access(
  p_email text,
  p_main boolean default true,
  p_custom boolean default false,
  p_setup boolean default false,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = myportifolio, public
as $$
declare
  v_ator text := (select myportifolio.current_login_email());
  v_email text := lower(trim(p_email));
begin
  if not myportifolio.is_admin() then raise exception 'apenas admin'; end if;
  if v_email is null or v_email = '' then raise exception 'e-mail obrigatorio'; end if;
  -- Formato minimo. Nao e validacao de e-mail de verdade (essa quem faz e a caixa postal, na
  -- hora de entregar o codigo), e sim recusa de erro de digitacao obvio antes de virar uma
  -- linha de acesso para um endereco que nao existe.
  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'e-mail invalido: %', v_email;
  end if;
  if not (p_main or p_custom or p_setup) then
    raise exception 'nenhum acesso selecionado';
  end if;

  -- Uma chamada por flag, porque a RPC concede uma por vez. Ela ja recusa sozinha se a conta
  -- estiver bloqueada, e essa recusa deve subir: desbloquear e decisao separada e deliberada.
  if p_main then
    perform myportifolio.grant_or_revoke_member_access(v_email, 'main', true, 'cortesia');
  end if;
  if p_custom then
    perform myportifolio.grant_or_revoke_member_access(v_email, 'custom', true, 'cortesia');
  end if;
  if p_setup then
    perform myportifolio.grant_or_revoke_member_access(v_email, 'setup', true, 'cortesia');
  end if;

  insert into myportifolio.moderation_log (actor_email, action, target_email, reason, detalhe)
  values (v_ator, 'grant_access', v_email, p_reason,
          jsonb_build_object('main', p_main, 'custom', p_custom, 'setup', p_setup));

  return (select to_jsonb(x) from (
    select ma.email, ma.has_main, ma.has_custom, ma.has_setup, ma.blocked, ma.source,
           ma.granted_at
    from myportifolio.member_access ma where ma.email = v_email) x);
end;
$$;

revoke execute on function myportifolio.admin_grant_member_access(text, boolean, boolean, boolean, text)
  from public, anon;
grant execute on function myportifolio.admin_grant_member_access(text, boolean, boolean, boolean, text)
  to authenticated;

-- 3. REVOGAR -----------------------------------------------------------------
-- Revogar NAO e apagar. A linha continua, com revoked_at carimbado, porque o historico de
-- quem teve acesso e quando e o que responde reclamacao tres meses depois. Quem apaga dado
-- de pessoa e a exclusao de conta do titular (LGPD), que e outro caminho e tem outro dono.
create or replace function myportifolio.admin_revoke_member_access(
  p_email text,
  p_main boolean default true,
  p_custom boolean default true,
  p_setup boolean default true,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = myportifolio, public
as $$
declare
  v_ator text := (select myportifolio.current_login_email());
  v_email text := lower(trim(p_email));
begin
  if not myportifolio.is_admin() then raise exception 'apenas admin'; end if;
  if not exists (select 1 from myportifolio.member_access where email = v_email) then
    raise exception 'nao existe acesso para %', v_email;
  end if;

  if p_main then
    perform myportifolio.grant_or_revoke_member_access(v_email, 'main', false, 'cortesia');
  end if;
  if p_custom then
    perform myportifolio.grant_or_revoke_member_access(v_email, 'custom', false, 'cortesia');
  end if;
  if p_setup then
    perform myportifolio.grant_or_revoke_member_access(v_email, 'setup', false, 'cortesia');
  end if;

  insert into myportifolio.moderation_log (actor_email, action, target_email, reason, detalhe)
  values (v_ator, 'revoke_access', v_email, p_reason,
          jsonb_build_object('main', p_main, 'custom', p_custom, 'setup', p_setup));

  return (select to_jsonb(x) from (
    select ma.email, ma.has_main, ma.has_custom, ma.has_setup, ma.blocked, ma.source,
           ma.revoked_at
    from myportifolio.member_access ma where ma.email = v_email) x);
end;
$$;

revoke execute on function myportifolio.admin_revoke_member_access(text, boolean, boolean, boolean, text)
  from public, anon;
grant execute on function myportifolio.admin_revoke_member_access(text, boolean, boolean, boolean, text)
  to authenticated;

-- 4. LISTAR ------------------------------------------------------------------
-- Uma funcao e nao um select direto na tabela: assim a tela nao depende de a policy de RLS
-- de member_access deixar admin ler tudo, e o que a tela ve fica escrito em UM lugar. O
-- portfolio e o slug entram porque a pergunta real do dono nunca e "quem tem acesso", e sim
-- "quem tem acesso e o que essa pessoa ja publicou".
create or replace function myportifolio.admin_listar_acessos(p_busca text default null)
returns table (
  email text,
  has_main boolean,
  has_custom boolean,
  has_setup boolean,
  blocked boolean,
  source text,
  quota_code text,
  granted_at timestamptz,
  revoked_at timestamptz,
  slug text,
  publicado boolean,
  tem_login boolean
)
language sql
stable
security definer
set search_path = myportifolio, public
as $$
  select ma.email, ma.has_main, ma.has_custom, ma.has_setup, ma.blocked, ma.source,
         ma.quota_code, ma.granted_at, ma.revoked_at,
         p.slug, p.first_published_at is not null as publicado,
         exists (select 1 from auth.users u where lower(u.email) = ma.email) as tem_login
  from myportifolio.member_access ma
  left join myportifolio.portfolios p on p.owner_email = ma.email
  where myportifolio.is_admin()
    and (p_busca is null or p_busca = '' or ma.email ilike '%' || p_busca || '%')
  order by ma.granted_at desc nulls last
  limit 200;
$$;

revoke execute on function myportifolio.admin_listar_acessos(text) from public, anon;
grant execute on function myportifolio.admin_listar_acessos(text) to authenticated;
