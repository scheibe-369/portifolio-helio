-- Base: keep-alive, cotas, entitlement por produto, alias de login, auditoria de
-- pagamento, admin, configuracao.

-- Supabase free pausa o projeto apos dias de inatividade, e projeto pausado significa
-- portfolio de cliente pagante fora do ar.
-- ATENCAO: isto e paliativo e e SUPOSICAO NAO VERIFICADA (S5). Cliente pagante nao fica
-- em projeto Free (decisao 9.4), e no projeto de desenvolvimento o ping de verdade e um
-- Cron Trigger de Worker batendo no PostgREST: bloco "triggers" do wrangler.jsonc mais o
-- handler scheduled, entregavel da fase 1 item 3. Este cron.schedule e a segunda linha, e
-- nao substitui aquele: escrita interna do Postgres pode nao contar como atividade.
--
-- A propria existencia do pg_cron aqui e suposicao S21: se a extensao nao puder ser criada
-- pela migration, os seis jobs deste plano viram rotas do mesmo Cron Trigger.
create table if not exists myportifolio.ativacao_supabase (
  id bigint primary key,
  atualiza boolean default false,
  last_ping timestamptz default now()
);
insert into myportifolio.ativacao_supabase (id, atualiza) values (1, false)
on conflict (id) do nothing;

create extension if not exists pg_cron;
grant usage on schema cron to postgres;
select cron.schedule('keep-supabase-alive-job', '0 * * * *', $$
  update myportifolio.ativacao_supabase set atualiza = not atualiza, last_ping = now() where id = 1;
$$);

create or replace function myportifolio.set_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

-- OPERACAO CONFIAVEL -------------------------------------------------------
-- Algumas colunas de portfolios sao proibidas ao cliente (owner_email, slug,
-- preview_token_hash, contadores). Quem PRECISA escrever nelas sao RPCs nossas, que rodam
-- security definer mas continuam disparando o trigger de guarda. A RPC marca a
-- transacao como confiavel com set_config(..., true) = escopo de transacao, e o
-- trigger le essa marca. O controle PRIMARIO continua sendo a ausencia de
-- grant update naquelas colunas: isto aqui e a segunda camada, nao a primeira.
create or replace function myportifolio.em_operacao_confiavel() returns boolean
language sql stable as $$
  select coalesce(current_setting('app.escrita_confiavel', true), '') = 'on';
$$;
grant execute on function myportifolio.em_operacao_confiavel() to authenticated;
revoke execute on function myportifolio.em_operacao_confiavel() from public, anon;

-- COTAS --------------------------------------------------------------------
-- Substitui a tabela plans do v1. NAO existe rank, NAO existe ordem entre cotas, e
-- mudar um teto continua sendo UPDATE em vez de deploy. 'interno' existe porque o
-- portfolio do proprio Helio tem 20 projetos hoje.
-- Os numeros de 'padrao' vieram do achado 18: 20 imagens com orcamento de 90 KB mais
-- avatar e hero da ~2 MB reais, entao 20 MB e folga de 10x e ainda flagra abuso.
-- Os 50 MB do v1 nao protegiam nada.
create table if not exists myportifolio.quotas (
  code text primary key,
  label text not null,
  max_projects int not null,
  max_media_files int not null,
  max_media_bytes bigint not null,
  created_at timestamptz not null default now()
);
insert into myportifolio.quotas (code, label, max_projects, max_media_files, max_media_bytes)
values
  ('padrao', 'Padrao',  24,  60,   20971520),
  ('interno','Interno', 200, 600, 1073741824)
on conflict (code) do nothing;

alter table myportifolio.quotas enable row level security;
revoke all on myportifolio.quotas from anon;
grant select on myportifolio.quotas to authenticated;
create policy "logado le as cotas" on myportifolio.quotas
  for select to authenticated using (true);

-- ENTITLEMENT POR PRODUTO --------------------------------------------------
-- A chave e o EMAIL DA COMPRA, nao o user_id: o webhook chega ANTES de existir linha
-- em auth.users.
--
-- Tres flags independentes, e nao um plan_code escalar, porque a Hubla manda UM EVENTO
-- POR PRODUTO: compra com dois bumps sao tres chamadas de webhook, com idempotency
-- distinto e ordem nao garantida. Um member_removed do bump de personalizacao nao pode
-- apagar o has_main concedido por outro evento. Padrao identico ao member_access do
-- AI Block, que ja roda em producao.
--   has_main   -> o portfolio em si, vitalicio
--   has_custom -> bump de personalizacao (cor de destaque e variacoes visuais)
--   has_setup  -> bump de facilitacao (nos montamos o portfolio: e servico humano)
create table if not exists myportifolio.member_access (
  email text primary key,
  user_id uuid references auth.users(id) on delete set null,

  has_main   boolean not null default false,
  has_custom boolean not null default false,
  has_setup  boolean not null default false,

  -- Unica forma de tirar alguem do ar sob pagamento vitalicio: reembolso, chargeback
  -- ou banimento por abuso. Ver admin_block_member() abaixo.
  blocked boolean not null default false,
  blocked_reason text,
  blocked_at timestamptz,

  quota_code text not null default 'padrao' references myportifolio.quotas(code),

  -- granted_at/revoked_at valem para "qualquer produto". main_granted_at e a marca zero
  -- do prazo do CDC art. 49 (secao 5.9): o botao de arrependimento le ESTA coluna, nao
  -- granted_at, senao comprar um bump depois reabre um prazo que ja venceu.
  -- source e declarada por quem concede (parametro de grant_or_revoke_member_access) e nao
  -- e enfeite: a conciliacao de 5.11 so pergunta "esta linha tem venda na Hubla?" para as
  -- linhas 'hubla'. Se cortesia e concessao manual entrassem como 'hubla', o relatorio
  -- acusaria fraude toda semana e seria desligado, que e como controle de verdade morre.
  source text not null default 'hubla' check (source in ('hubla','manual','cortesia')),
  granted_at timestamptz,
  revoked_at timestamptz,
  main_granted_at timestamptz,
  main_revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint member_access_email_minusculo check (email = lower(email))
);

create trigger member_access_set_updated_at before update on myportifolio.member_access
  for each row execute function myportifolio.set_updated_at();

-- ACHADO 3: o e-mail da compra e a chave do dinheiro. Se ele puder mudar, o
-- member_removed da Hubla (que chega com o e-mail da COMPRA) deixa de casar linha
-- nenhuma, e reembolso vira no-op silencioso. Trocar o e-mail passa a ser erro duro.
create or replace function myportifolio.member_access_email_imutavel() returns trigger
language plpgsql as $$
begin
  if new.email is distinct from old.email then
    raise exception 'e-mail de compra e imutavel: use access_aliases para e-mail de login diferente';
  end if;
  return new;
end;
$$;
create trigger member_access_email_travado before update on myportifolio.member_access
  for each row execute function myportifolio.member_access_email_imutavel();

-- ALIAS DE LOGIN -----------------------------------------------------------
-- O comprador que pagou com um e-mail e quer entrar com outro. O v1 resolvia isso
-- reescrevendo member_access.email, que e exatamente o buraco do achado 3.
-- Aqui o e-mail de compra fica intocado (revogacao continua funcionando) e o e-mail
-- de login vira uma segunda chave que APONTA para ele.
--
-- Quem cria a linha: a Edge Function link-login-email (fluxo self, secao 5.6), DEPOIS de
-- o comprador provar posse do e-mail da COMPRA com um codigo enviado para ele; ou o
-- admin, na mao. O usuario logado NUNCA insere aqui direto: se pudesse, apontaria o
-- proprio login para a compra de um terceiro e roubaria o portfolio dele.
create table if not exists myportifolio.access_aliases (
  login_email text primary key,
  purchase_email text not null references myportifolio.member_access(email) on delete cascade,
  reason text,
  created_by text,             -- 'self' ou o e-mail do admin que criou
  created_at timestamptz not null default now(),
  constraint alias_login_minusculo check (login_email = lower(login_email)),
  constraint alias_compra_minusculo check (purchase_email = lower(purchase_email)),
  -- Alias nao pode apontar para si mesmo nem encadear: resolucao e de um salto so.
  constraint alias_sem_cadeia check (login_email <> purchase_email)
);
-- UNIQUE, e nao indice comum: uma compra tem no maximo UM login alternativo. Sem isso,
-- duas pessoas entram no mesmo portfolio e a primeira briga de suporte custa mais que a
-- constraint.
create unique index if not exists access_aliases_uma_compra_um_login
  on myportifolio.access_aliases (purchase_email);

-- AUDITORIA DE PAGAMENTO ---------------------------------------------------
-- A PK e o header x-hubla-idempotency: dedupe pelo proprio banco.
-- processed_at, processed_result, applied_flags, attempts e last_attempt_at NAO
-- existiam no v1, e sao o achado 5: sem eles o 23505 do insert e tratado como "ja
-- processado, responde 200", e a retentativa que o webhook provocou de proposito (500
-- quando nenhum produto foi aplicado) e engolida.
-- Regra para o codigo do webhook: 23505 SO vira 200 quando a linha existente tem
-- processed_at not null. Caso contrario, reprocessa (o grant e idempotente).
create table if not exists myportifolio.hubla_events (
  id uuid primary key,
  type text not null,
  product_ids text[] not null default '{}',
  email text,
  is_sandbox boolean not null default false,
  processing_error text,
  processed_at timestamptz,
  processed_result text check (processed_result in ('ok','ignorado','falhou')),
  applied_flags text[] not null default '{}',
  attempts int not null default 1,
  last_attempt_at timestamptz not null default now(),
  payload jsonb not null,
  received_at timestamptz not null default now()
);
create index if not exists hubla_events_email_idx on myportifolio.hubla_events (email);
create index if not exists hubla_events_pendentes_idx on myportifolio.hubla_events (received_at)
  where processed_at is null;

-- A caixa de e-mail listada aqui e a chave do reino: e ela que passa em is_admin(), que
-- abre o painel de moderacao e que autoriza a concessao de facilitacao (0002). Com login
-- por codigo de 6 digitos e sem segundo fator, comprometer um Gmail e comprometer todo
-- portfolio pago do produto. Por isso a conta de admin exige segundo fator (suposicao S19)
-- e senha (5.5), e a exigencia e pre requisito do primeiro pedido de facilitacao atendido.
create table if not exists myportifolio.admin_users (
  email text primary key,
  mfa_confirmado_em timestamptz,
  created_at timestamptz not null default now()
);

-- REGISTRO DE MODERACAO -----------------------------------------------------
-- Toda acao de admin sobre dado de cliente entra aqui, e isto e o que separa "operacao"
-- de "acesso irrestrito nao observavel". Sem esta tabela, bloquear, desbloquear, vincular
-- login, editar o portfolio de um comprador e derrubar conteudo nao deixam rastro nenhum,
-- e o unico registro seria um campo de texto livre que ninguem le.
--
-- SEM foreign key de proposito, em nenhuma das colunas de alvo: o log precisa sobreviver a
-- purga da conta que ele descreve (5.9), senao apagar o alvo apaga a prova. Pela mesma
-- razao ele guarda o e-mail como texto e nunca e pseudonimizado junto com o resto.
create table if not exists myportifolio.moderation_log (
  id bigint generated always as identity primary key,
  actor_email text not null,
  action text not null,
  target_email text,
  target_portfolio_id uuid,
  reason text,
  detalhe jsonb,
  created_at timestamptz not null default now()
);
create index if not exists moderation_log_alvo_idx
  on myportifolio.moderation_log (target_email, created_at desc);
alter table myportifolio.moderation_log enable row level security;
revoke all on myportifolio.moderation_log from anon, authenticated;
-- A policy de leitura fica logo depois de is_admin() existir, mais abaixo nesta migration:
-- policy e validada na criacao e nao pode citar funcao que ainda nao foi criada.

-- Escrita so por aqui: security definer, sem grant de insert na tabela, e o ator nunca vem
-- de parametro (senao o registro seria assinavel por quem escreve nele).
create or replace function myportifolio.registrar_moderacao(
  p_action text, p_target_email text default null,
  p_target_portfolio_id uuid default null, p_reason text default null,
  p_detalhe jsonb default null)
returns void language plpgsql security definer set search_path = myportifolio, public as $$
begin
  insert into myportifolio.moderation_log
    (actor_email, action, target_email, target_portfolio_id, reason, detalhe)
  values (coalesce((select myportifolio.current_login_email()), 'sistema'),
          p_action, lower(nullif(trim(coalesce(p_target_email, '')), '')),
          p_target_portfolio_id, p_reason, p_detalhe);
end;
$$;
revoke execute on function
  myportifolio.registrar_moderacao(text, text, uuid, text, jsonb) from public, anon, authenticated;

alter table myportifolio.member_access enable row level security;
alter table myportifolio.access_aliases enable row level security;
alter table myportifolio.hubla_events enable row level security;
alter table myportifolio.admin_users enable row level security;
-- hubla_events, admin_users e access_aliases ficam SEM policy para o cliente: RLS ligada
-- sem policy nega tudo, e so a service_role (que ignora RLS) enxerga. Sao dados de
-- pagamento e de identidade.
revoke all on myportifolio.hubla_events from anon, authenticated;
revoke all on myportifolio.admin_users from anon, authenticated;
revoke all on myportifolio.access_aliases from anon, authenticated;

-- HELPERS DE IDENTIDADE ----------------------------------------------------
-- Le o e-mail de auth.users em vez de confiar no claim do JWT, e exige
-- email_confirmed_at. Retorna null para anon e para quem nao confirmou, e
-- "coluna = null" nunca e true, entao toda policy que usa isto falha fechada.
create or replace function myportifolio.current_login_email() returns text
language sql security definer set search_path = myportifolio, public stable as $$
  select lower(u.email) from auth.users u
  where u.id = (select auth.uid()) and u.email_confirmed_at is not null;
$$;
grant execute on function myportifolio.current_login_email() to authenticated;
revoke execute on function myportifolio.current_login_email() from public, anon;

-- ESTE e o e-mail que manda em tudo que envolve dinheiro e posse. Resolve o alias de
-- um salto so: se o e-mail de login ja e um e-mail de compra, e ele mesmo; senao,
-- procura em access_aliases.
create or replace function myportifolio.current_purchase_email() returns text
language sql security definer set search_path = myportifolio, public stable as $$
  select coalesce(
    (select ma.email from myportifolio.member_access ma
      where ma.email = (select myportifolio.current_login_email())),
    (select al.purchase_email from myportifolio.access_aliases al
      where al.login_email = (select myportifolio.current_login_email())));
$$;
grant execute on function myportifolio.current_purchase_email() to authenticated;
revoke execute on function myportifolio.current_purchase_email() from public, anon;

-- mfa_confirmado_em NAO e enfeite de auditoria: enquanto ele for nulo, is_admin() e falso e
-- o painel nao abre. A coluna e preenchida a mao (update admin_users set mfa_confirmado_em =
-- now()) depois que o segundo fator esta ligado de verdade na conta, e isso e uma atestacao
-- do dono, nao uma verificacao do banco: o Postgres nao enxerga o fator do Auth (suposicao
-- S19 diz como verificar, e o plano B se ele nao existir). O ganho de valer assim mesmo e
-- que a exigencia deixa de ser um paragrafo e passa a ter um estado que alguem tem que
-- mudar, e que aparece em consulta.
create or replace function myportifolio.is_admin() returns boolean
language sql security definer set search_path = myportifolio, public stable as $$
  select exists (select 1 from myportifolio.admin_users
                 where email = (select myportifolio.current_login_email())
                   and mfa_confirmado_em is not null);
$$;
grant execute on function myportifolio.is_admin() to authenticated;
revoke execute on function myportifolio.is_admin() from public, anon;

-- ACHADO 10: blocked deixa de ser coluna morta. Quem esta bloqueado NAO tem acesso,
-- ponto, independente de has_main.
create or replace function myportifolio.has_active_access() returns boolean
language sql security definer set search_path = myportifolio, public stable as $$
  select coalesce((select ma.has_main and not ma.blocked from myportifolio.member_access ma
                   where ma.email = (select myportifolio.current_purchase_email())), false);
$$;
grant execute on function myportifolio.has_active_access() to authenticated;
revoke execute on function myportifolio.has_active_access() from public, anon;

-- Bump de personalizacao. Le-se no trigger de guarda de portfolios: sem has_custom, as
-- colunas do bump nao podem mudar. E o que faz o bump ser produto e nao enfeite.
create or replace function myportifolio.has_custom_access() returns boolean
language sql security definer set search_path = myportifolio, public stable as $$
  select coalesce((select ma.has_custom and not ma.blocked from myportifolio.member_access ma
                   where ma.email = (select myportifolio.current_purchase_email())), false);
$$;
grant execute on function myportifolio.has_custom_access() to authenticated;
revoke execute on function myportifolio.has_custom_access() from public, anon;

create policy "admin le o registro de moderacao" on myportifolio.moderation_log
  for select to authenticated using (myportifolio.is_admin());
grant select on myportifolio.moderation_log to authenticated;

create policy "member le a propria linha" on myportifolio.member_access
  for select to authenticated
  using (email = (select myportifolio.current_purchase_email()));
create policy "admin gerencia member_access" on myportifolio.member_access
  for all to authenticated using (myportifolio.is_admin()) with check (myportifolio.is_admin());
grant select on myportifolio.member_access to authenticated;
-- Sem grant de insert/update/delete: so a Edge Function (service_role) e as RPCs
-- security definer escrevem aqui.

-- RPC DO WEBHOOK -----------------------------------------------------------
-- Concede ou revoga UM produto por vez, sem tocar nos outros. Chamada uma vez por
-- produto extraido do evento. Traducao direta da funcao homonima do AI Block, com
-- duas adicoes: a guarda de blocked e a marca de main_granted_at.
--
-- NAO existe rebaixamento de plano, NAO existe rank, NAO existe reativacao por
-- pagamento: acesso e vitalicio (decisao 1). Um member_removed so chega em reembolso,
-- chargeback ou cancelamento manual, e cada um derruba exatamente o produto dele.
--
-- p_source existe porque a coluna source tinha um CHECK com tres valores e um unico
-- escritor gravando 'hubla' sempre, ou seja, coluna que finge politica (a doenca que o
-- achado 10 pegou em blocked). Quem chama declara a origem: a Edge Function do webhook
-- manda 'hubla', o painel de concessao manual manda 'manual' ou 'cortesia'. A conciliacao
-- semanal de 5.11 so consegue perguntar "esta linha tem venda?" para as linhas 'hubla'.
create or replace function myportifolio.grant_or_revoke_member_access(
  p_email text,
  p_product text,
  p_granted boolean,
  p_source text default 'hubla'
) returns void
language plpgsql security definer set search_path = myportifolio, public as $$
declare
  v_email text := lower(trim(p_email));
  v_blocked boolean;
begin
  if p_product not in ('main', 'custom', 'setup') then
    raise exception 'produto invalido: %', p_product;
  end if;
  if p_source not in ('hubla', 'manual', 'cortesia') then
    raise exception 'origem invalida: %', p_source;
  end if;
  if v_email is null or v_email = '' then
    raise exception 'e-mail vazio no evento';
  end if;

  -- ACHADO 10, ramo de recusa: quem levou chargeback nao volta sozinho. Um
  -- member_added posterior (recompra, ou o mesmo evento reenviado) NAO reconcede.
  -- Desbloquear e decisao humana, por admin_unblock_member().
  select ma.blocked into v_blocked from myportifolio.member_access ma where ma.email = v_email;
  if p_granted and coalesce(v_blocked, false) then
    raise exception 'conta bloqueada: concessao exige desbloqueio manual';
  end if;

  insert into myportifolio.member_access (
    email, has_main, has_custom, has_setup, source, granted_at, main_granted_at)
  values (
    v_email,
    case when p_product = 'main'   then p_granted else false end,
    case when p_product = 'custom' then p_granted else false end,
    case when p_product = 'setup'  then p_granted else false end,
    p_source,
    case when p_granted then now() end,
    case when p_product = 'main' and p_granted then now() end)
  on conflict (email) do update set
    has_main   = case when p_product = 'main'   then p_granted else member_access.has_main end,
    has_custom = case when p_product = 'custom' then p_granted else member_access.has_custom end,
    has_setup  = case when p_product = 'setup'  then p_granted else member_access.has_setup end,
    source = case when p_granted then p_source else member_access.source end,
    -- O coalesce sozinho preserva a data da PRIMEIRA compra, e essa intencao esta certa
    -- para bump comprado depois: nao reabre um prazo que ja venceu. Mas ela transformava
    -- RECOMPRA em compra sem direito de arrependimento: quem comprou, foi reembolsado, e
    -- comprou de novo seis meses depois entrava com main_granted_at de seis meses atras, e
    -- o botao de 5.9 (CDC art. 49) nunca aparecia. Se existe revogacao POSTERIOR a
    -- concessao vigente, a compra e nova e o relogio recomeca agora.
    main_granted_at = case
      when p_product = 'main' and p_granted then
        case
          when member_access.main_revoked_at is not null
           and member_access.main_revoked_at > coalesce(member_access.main_granted_at, '-infinity'::timestamptz)
            then now()
          else coalesce(member_access.main_granted_at, now())
        end
      else member_access.main_granted_at end,
    main_revoked_at = case
      when p_product = 'main' and not p_granted then now()
      else member_access.main_revoked_at end,
    granted_at = case when p_granted then coalesce(member_access.granted_at, now())
                      else member_access.granted_at end,
    revoked_at = case when p_granted then member_access.revoked_at else now() end,
    updated_at = now();
end;
$$;

-- CRITICO: o Postgres concede EXECUTE para PUBLIC em funcao nova, e toda funcao em
-- public vira endpoint /rpc no PostgREST. Sem este revoke, qualquer visitante com a
-- anon key se autoconcede acesso vitalicio.
revoke execute on function myportifolio.grant_or_revoke_member_access(text, text, boolean, text)
  from public, anon, authenticated;

-- BLOQUEIO -----------------------------------------------------------------
-- ACHADO 10. Sob pagamento unico esta e a UNICA porta de saida. Quem chama:
--   (a) o admin, na mao, para chargeback confirmado, reembolso fraudulento ou abuso;
--   (b) o webhook, SE e QUANDO os tipos de evento de disputa da Hubla forem conhecidos
--       (suposicao S12). Ate la, bloqueio e operacao manual, assumido por escrito.
-- Quem le: has_active_access(), has_custom_access(), o ramo de concessao acima, e o
-- trigger member_access_sync_publicacao (0004), que derruba is_live na hora.
create or replace function myportifolio.admin_block_member(p_email text, p_reason text)
returns void language plpgsql security definer set search_path = myportifolio, public as $$
begin
  if not myportifolio.is_admin() then raise exception 'apenas admin'; end if;
  update myportifolio.member_access
  set blocked = true, blocked_reason = p_reason, blocked_at = now(), updated_at = now()
  where email = lower(trim(p_email));
  if not found then raise exception 'sem compra registrada para %', p_email; end if;
  perform myportifolio.registrar_moderacao('block', p_email, null, p_reason);
end;
$$;
revoke execute on function myportifolio.admin_block_member(text, text) from public, anon;
grant execute on function myportifolio.admin_block_member(text, text) to authenticated;

create or replace function myportifolio.admin_unblock_member(p_email text)
returns void language plpgsql security definer set search_path = myportifolio, public as $$
begin
  if not myportifolio.is_admin() then raise exception 'apenas admin'; end if;
  update myportifolio.member_access
  set blocked = false, blocked_reason = null, blocked_at = null, updated_at = now()
  where email = lower(trim(p_email));
  perform myportifolio.registrar_moderacao('unblock', p_email);
end;
$$;
revoke execute on function myportifolio.admin_unblock_member(text) from public, anon;
grant execute on function myportifolio.admin_unblock_member(text) to authenticated;

-- ALIAS: caminho de admin. O caminho self (com prova de posse do e-mail da compra) e a
-- RPC link_login_email(), definida em 0006 junto com o rate limit que ela usa.
create or replace function myportifolio.admin_link_login_email(
  p_login_email text, p_purchase_email text, p_reason text)
returns void language plpgsql security definer set search_path = myportifolio, public as $$
declare v_login text := lower(trim(p_login_email));
        v_compra text := lower(trim(p_purchase_email));
begin
  if not myportifolio.is_admin() then raise exception 'apenas admin'; end if;
  if exists (select 1 from myportifolio.member_access where email = v_login) then
    raise exception '% ja e um e-mail de compra: nao pode virar alias', v_login;
  end if;
  if exists (select 1 from myportifolio.access_aliases where purchase_email = v_login) then
    raise exception '% ja e destino de alias: cadeia de alias nao e permitida', v_login;
  end if;
  insert into myportifolio.access_aliases (login_email, purchase_email, reason, created_by)
  values (v_login, v_compra, p_reason, (select myportifolio.current_login_email()))
  on conflict (login_email) do update set
    purchase_email = excluded.purchase_email, reason = excluded.reason;

  -- Vincular login alheio e a operacao de admin com maior potencial de sequestro de conta,
  -- entao ela e a que mais precisa de rastro. O owner_id antigo tambem cai aqui pelo mesmo
  -- motivo do caminho self (5.6): sem isso, o login velho continua dono para sempre.
  perform set_config('app.escrita_confiavel', 'on', true);
  update myportifolio.portfolios set owner_id = null where owner_email = v_compra;
  perform set_config('app.escrita_confiavel', 'off', true);
  perform myportifolio.registrar_moderacao('link_login', v_compra, null, p_reason,
                                     jsonb_build_object('login_email', v_login));
end;
$$;
revoke execute on function myportifolio.admin_link_login_email(text, text, text) from public, anon;
grant execute on function myportifolio.admin_link_login_email(text, text, text) to authenticated;

-- CONFIGURACAO -------------------------------------------------------------
-- O que sobrou aqui depois do achado 12: NAO existe mais media_base_url nem
-- canonical_pattern no payload publicado. O Worker sabe o host (esta no request) e
-- sabe a base da midia (esta no wrangler). O banco guarda so o que precisa existir
-- fora do deploy.
create table if not exists myportifolio.app_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);
insert into myportifolio.app_settings (key, value) values
  -- Usado por e-mail transacional e por relatorio, nunca pelo renderizador. E um dos
  -- DOIS unicos lugares onde o literal do dominio existe (o outro e APEX_HOST no
  -- wrangler.jsonc).
  ('apex_host', 'myportifolio.com.br'),
  ('payload_version_atual', '2')
on conflict (key) do nothing;

alter table myportifolio.app_settings enable row level security;
revoke all on myportifolio.app_settings from anon, authenticated;
create policy "admin gerencia configuracao" on myportifolio.app_settings
  for all to authenticated using (myportifolio.is_admin()) with check (myportifolio.is_admin());

-- Nasce com mfa_confirmado_em NULO de proposito: a primeira acao administrativa da vida do
-- projeto e ligar o segundo fator e confirmar isso por SQL. Ate la, is_admin() e falso para
-- todo mundo, e nenhum painel abre. Migration que ja nascesse confirmando anularia a regra.
insert into myportifolio.admin_users (email) values ('heliomonteiroprofissional@gmail.com')
on conflict (email) do nothing;

-- O portfolio do proprio Helio nao cabe na cota padrao (20 projetos hoje).
insert into myportifolio.member_access
  (email, has_main, has_custom, has_setup, quota_code, source, granted_at, main_granted_at)
values ('heliomonteiroprofissional@gmail.com', true, true, false, 'interno', 'manual',
        now(), now())
on conflict (email) do update set quota_code = 'interno';
