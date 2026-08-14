-- 0006_operacao_e_juridico.sql
--
-- Tabelas e funcoes que nascem do FLUXO (secao 5 do plano) e do pacote juridico (5.9).
-- O plano nao junta isso num bloco unico de proposito: cada objeto e escrito na secao que
-- o explica. Este arquivo e a montagem desses blocos na ordem de dependencia, extraida de
-- 5.3, 5.4, 5.7 e 5.9.
--
-- O pacote juridico NAO e opcional antes da primeira venda: sem termos aceitos, sem
-- exportar e sem apagar conta, o produto hospeda dado pessoal de terceiro (o campo `client`
-- de um projeto traz nome de cliente do comprador) sem cumprir a LGPD art. 18 e 20 nem o
-- CDC art. 49.


-- ===== vindo da secao 5.3 do plano =====
create or replace view myportifolio.compras_incompletas as
select ma.email, ma.has_main, ma.has_custom, ma.has_setup, ma.created_at,
       (select array_agg(distinct he.type) from myportifolio.hubla_events he
         where he.email = ma.email) as eventos
from myportifolio.member_access ma
where not ma.has_main and (ma.has_custom or ma.has_setup)
  and ma.created_at < now() - interval '15 minutes';

-- ===== vindo da secao 5.4 do plano =====
create table if not exists myportifolio.access_throttle (
  scope text not null check (scope in ('ip','email','global','preview','read')),
  -- O teto de tamanho existe porque esta tabela e escrita por caminho anonimo (a previa e
  -- a leitura publica). Chave sem limite e convite para inflar linha e indice com texto
  -- controlado por quem chama, num banco de 1 GB. Nos dois escopos anonimos a chave e um
  -- portfolio_id ja resolvido, nunca o texto que chegou.
  key text not null check (char_length(key) between 1 and 200),
  bucket timestamptz not null,          -- date_trunc por 10 minutos
  hits int not null default 0,
  primary key (scope, key, bucket)
);
alter table myportifolio.access_throttle enable row level security;
revoke all on myportifolio.access_throttle from anon, authenticated;

create or replace function myportifolio.consume_access_quota(
  p_scope text, p_key text, p_limit int
) returns boolean
language plpgsql security definer set search_path = myportifolio, public as $$
declare
  v_bucket timestamptz := to_timestamp(floor(extract(epoch from now()) / 600) * 600);
  v_key text := lower(trim(p_key));
  v_total int;
begin
  insert into myportifolio.access_throttle (scope, key, bucket, hits)
  values (p_scope, v_key, v_bucket, 1)
  on conflict (scope, key, bucket) do update set hits = access_throttle.hits + 1;

  select coalesce(sum(hits), 0) into v_total from myportifolio.access_throttle
  where scope = p_scope and key = v_key and bucket > now() - interval '1 hour';

  return v_total <= p_limit;
end;
$$;
revoke execute on function myportifolio.consume_access_quota(text, text, int)
  from public, anon, authenticated;
grant execute on function myportifolio.consume_access_quota(text, text, int) to service_role;

-- Esta funcao devolve "passou do teto?" e NADA MAIS. Quem decide o que fazer com o false
-- e quem chama, e a decisao e diferente por escopo: em 'ip', 'email' e 'preview' o false
-- recusa; em 'read' ele degrada (a borda serve a copia de socorro, o visitante nao ve
-- erro); em 'global' o false NUNCA recusa, ele alarma e atrasa (5.4). Recusa dura no
-- escopo global derruba o login de toda a base, que e o oposto do que este rate limit
-- existe para proteger.

-- faxina, senao a tabela cresce para sempre
select cron.schedule('limpa-access-throttle', '17 * * * *', $$
  delete from myportifolio.access_throttle where bucket < now() - interval '2 hours';
$$);

-- ===== vindo da secao 5.7 do plano =====
create table if not exists myportifolio.setup_requests (
  email text primary key references myportifolio.member_access(email) on delete cascade,
  status text not null default 'aguardando_material'
    check (status in ('aguardando_material','material_recebido','em_producao',
                      'aguardando_aprovacao','entregue','cancelado')),
  material_url text,           -- link do Drive/WeTransfer que o comprador cola
  material_notes text,
  whatsapp text,
  portfolio_id uuid references myportifolio.portfolios(id) on delete set null,
  opened_at timestamptz not null default now(),
  first_touch_at timestamptz,  -- primeiro contato nosso: e o SLA que vai nos termos
  delivered_at timestamptz,
  operator_notes text,
  -- AUTORIZACAO DO TITULAR. Comprar facilitacao e comprar "alguem entra na minha conta e
  -- monta", e isso e razoavel, mas nao pode ser PRESUMIDO: sem um ato do titular com data e
  -- IP, o produto simplesmente assume que outra pessoa pode editar e publicar em nome dele.
  -- Nenhuma concessao de escopo (setup_grants, 4.3) abre sem estas tres colunas
  -- preenchidas, e o titular retira a autorizacao quando quiser.
  authorized_at timestamptz,
  authorized_ip inet,
  authorized_terms text,       -- versao do texto que ele aceitou, igual em terms_consents
  updated_at timestamptz not null default now(),
  constraint setup_email_minusculo check (email = lower(email))
);
alter table myportifolio.setup_requests enable row level security;

create policy "comprador le a propria solicitacao" on myportifolio.setup_requests
  for select to authenticated
  using (email = (select myportifolio.current_purchase_email()));
create policy "comprador atualiza o proprio material" on myportifolio.setup_requests
  for update to authenticated
  using (email = (select myportifolio.current_purchase_email()))
  with check (email = (select myportifolio.current_purchase_email()));
create policy "admin gerencia a fila" on myportifolio.setup_requests
  for all to authenticated using (myportifolio.is_admin()) with check (myportifolio.is_admin());

-- O revoke seguido de grant por coluna e o achado 2 aplicado aqui: RLS NAO e
-- column-level, e sem isso o comprador marca a propria solicitacao como 'entregue'.
revoke update on myportifolio.setup_requests from authenticated;
grant select on myportifolio.setup_requests to authenticated;
grant update (material_url, material_notes, whatsapp) on myportifolio.setup_requests to authenticated;

-- Entregar (ou cancelar) FECHA o acesso. Sem isto, a concessao so morreria pelo prazo, e o
-- pedido saindo da fila nao revogava nada: quem montou o portfolio continuava com escrita
-- na conta do comprador depois do trabalho terminado.
create or replace function myportifolio.admin_set_setup_status(p_email text, p_status text)
returns void language plpgsql security definer set search_path = myportifolio, public as $$
declare v_pf uuid;
begin
  if not myportifolio.is_admin() then raise exception 'apenas admin'; end if;
  update myportifolio.setup_requests
  set status = p_status,
      first_touch_at = coalesce(first_touch_at, now()),
      delivered_at = case when p_status = 'entregue' then now() else delivered_at end,
      updated_at = now()
  where email = lower(trim(p_email))
  returning portfolio_id into v_pf;
  if not found then raise exception 'sem pedido de facilitacao para %', p_email; end if;

  if p_status in ('entregue', 'cancelado') and v_pf is not null then
    update myportifolio.setup_grants set revoked_at = now()
    where portfolio_id = v_pf and revoked_at is null;
  end if;
  perform myportifolio.registrar_moderacao('setup_status', p_email, v_pf, p_status);
end;
$$;
revoke execute on function myportifolio.admin_set_setup_status(text, text) from public, anon;
grant execute on function myportifolio.admin_set_setup_status(text, text) to authenticated;

-- AUTORIZACAO DO TITULAR, E A CONCESSAO QUE ELA ABRE -------------------------
-- Quem chama e o proprio comprador, logado. p_ip vem da Edge Function (CF-Connecting-IP):
-- o browser nao sabe o proprio IP publico, e aceitar um texto qualquer do cliente aqui
-- transformaria a prova em campo livre.
create or replace function myportifolio.authorize_setup_access(p_ip inet, p_terms text)
returns timestamptz language plpgsql security definer set search_path = myportifolio, public as $$
declare v_email text := (select myportifolio.current_purchase_email());
begin
  if v_email is null then raise exception 'sem compra para este e-mail'; end if;
  if not coalesce((select ma.has_setup and not ma.blocked from myportifolio.member_access ma
                   where ma.email = v_email), false) then
    raise exception 'esta conta nao tem o bump de facilitacao';
  end if;
  update myportifolio.setup_requests
  set authorized_at = now(), authorized_ip = p_ip, authorized_terms = p_terms,
      updated_at = now()
  where email = v_email;
  if not found then raise exception 'sem pedido de facilitacao para esta conta'; end if;
  return now();
end;
$$;
revoke execute on function myportifolio.authorize_setup_access(inet, text) from public, anon;
grant execute on function myportifolio.authorize_setup_access(inet, text) to service_role;

-- Retirar a autorizacao e direito do titular e vale IMEDIATAMENTE: derruba as concessoes
-- vivas na mesma transacao, em vez de esperar o prazo de 72 horas vencer.
create or replace function myportifolio.revoke_setup_access() returns void
language plpgsql security definer set search_path = myportifolio, public as $$
declare v_email text := (select myportifolio.current_purchase_email()); v_pf uuid;
begin
  if v_email is null then raise exception 'sem compra para este e-mail'; end if;
  update myportifolio.setup_requests
  set authorized_at = null, updated_at = now()
  where email = v_email
  returning portfolio_id into v_pf;
  update myportifolio.setup_grants set revoked_at = now()
  where portfolio_id = v_pf and revoked_at is null;
  perform myportifolio.registrar_moderacao('setup_autorizacao_retirada', v_email, v_pf);
end;
$$;
revoke execute on function myportifolio.revoke_setup_access() from public, anon;
grant execute on function myportifolio.revoke_setup_access() to authenticated;

-- A concessao de escopo: um portfolio, um prazo curto, um motivo e uma linha de log. Ela
-- so abre com has_setup vivo E com autorizacao do titular gravada, e e ela que substitui o
-- is_admin() global no caminho de facilitacao (4.3).
create or replace function myportifolio.admin_open_setup_grant(
  p_portfolio_id uuid, p_reason text, p_horas int default 72)
returns bigint language plpgsql security definer set search_path = myportifolio, public as $$
declare v_email text; v_id bigint; v_horas int := least(greatest(coalesce(p_horas, 72), 1), 168);
begin
  if not myportifolio.is_admin() then raise exception 'apenas admin'; end if;
  select pf.owner_email into v_email from myportifolio.portfolios pf where pf.id = p_portfolio_id;
  if v_email is null then raise exception 'portfolio inexistente'; end if;
  if not coalesce((select ma.has_setup and not ma.blocked from myportifolio.member_access ma
                   where ma.email = v_email), false) then
    raise exception 'este comprador nao tem o bump de facilitacao';
  end if;
  if not exists (select 1 from myportifolio.setup_requests sr
                 where sr.email = v_email and sr.authorized_at is not null) then
    raise exception 'sem autorizacao do titular: peca a ele para autorizar no painel';
  end if;

  insert into myportifolio.setup_grants (admin_email, portfolio_id, expires_at, reason)
  values ((select myportifolio.current_login_email()), p_portfolio_id,
          now() + make_interval(hours => v_horas), p_reason)
  returning id into v_id;

  update myportifolio.setup_requests set portfolio_id = p_portfolio_id, updated_at = now()
  where email = v_email and portfolio_id is null;

  perform myportifolio.registrar_moderacao('setup_grant_aberta', v_email, p_portfolio_id, p_reason,
    jsonb_build_object('expira_em_horas', v_horas));
  return v_id;
end;
$$;
revoke execute on function myportifolio.admin_open_setup_grant(uuid, text, int) from public, anon;
grant execute on function myportifolio.admin_open_setup_grant(uuid, text, int) to authenticated;

create or replace function myportifolio.admin_close_setup_grant(p_portfolio_id uuid)
returns void language plpgsql security definer set search_path = myportifolio, public as $$
begin
  if not myportifolio.is_admin() then raise exception 'apenas admin'; end if;
  update myportifolio.setup_grants set revoked_at = now()
  where portfolio_id = p_portfolio_id
    and admin_email = (select myportifolio.current_login_email())
    and revoked_at is null;
  perform myportifolio.registrar_moderacao('setup_grant_fechada', null, p_portfolio_id);
end;
$$;
revoke execute on function myportifolio.admin_close_setup_grant(uuid) from public, anon;
grant execute on function myportifolio.admin_close_setup_grant(uuid) to authenticated;

-- ESTORNO DO BUMP TIRA O PEDIDO DA FILA --------------------------------------
-- Revogar has_setup mexia so em member_access. setup_requests nao tinha trigger nenhum, a
-- fila ordena por opened_at e nao olha flag, e o resultado era o dono entregando trabalho
-- humano de R$ 490 ja estornado, sem nada na tela avisando. Aqui a fila passa a saber que a
-- compra caiu, e a concessao de escrita cai junto: nao existe motivo para alguem continuar
-- com acesso a conta de quem pediu o dinheiro de volta.
create or replace function myportifolio.setup_request_sync_acesso() returns trigger
language plpgsql security definer set search_path = myportifolio, public as $$
declare v_pf uuid;
begin
  if new.has_setup or (tg_op = 'UPDATE' and old.has_setup = new.has_setup) then
    return new;
  end if;
  update myportifolio.setup_requests
  set status = 'cancelado', updated_at = now()
  where email = new.email and status <> 'entregue'
  returning portfolio_id into v_pf;
  if found then
    update myportifolio.setup_grants set revoked_at = now()
    where portfolio_id = v_pf and revoked_at is null;
    perform myportifolio.registrar_moderacao('setup_cancelado_por_estorno', new.email, v_pf);
  end if;
  return new;
end;
$$;
create trigger member_access_sync_setup
  after update of has_setup on myportifolio.member_access
  for each row execute function myportifolio.setup_request_sync_acesso();

-- ===== vindo da secao 5.9 do plano =====
create table if not exists myportifolio.terms_consents (
  email text not null,          -- e-mail de COMPRA, mesma chave de member_access
  terms_version text not null,
  accepted_at timestamptz not null default now(),
  ip inet,
  user_agent text,
  primary key (email, terms_version)
);
alter table myportifolio.terms_consents enable row level security;
revoke all on myportifolio.terms_consents from anon, authenticated;
create policy "titular le o proprio consentimento" on myportifolio.terms_consents
  for select to authenticated
  using (email = (select myportifolio.current_purchase_email()));
create policy "admin le os consentimentos" on myportifolio.terms_consents
  for select to authenticated using (myportifolio.is_admin());
grant select on myportifolio.terms_consents to authenticated;

-- Sem grant de insert: quem grava e a Edge Function, porque o IP confiavel e o
-- CF-Connecting-IP que ela ve, e nao um campo que o browser preenche.
create or replace function myportifolio.record_terms_consent(
  p_version text, p_ip inet, p_user_agent text)
returns timestamptz language plpgsql security definer set search_path = myportifolio, public as $$
declare v_email text := (select myportifolio.current_purchase_email());
begin
  if v_email is null then raise exception 'sem compra para este e-mail'; end if;
  insert into myportifolio.terms_consents (email, terms_version, ip, user_agent)
  values (v_email, p_version, p_ip, left(coalesce(p_user_agent, ''), 300))
  on conflict (email, terms_version) do nothing;
  return now();
end;
$$;
revoke execute on function myportifolio.record_terms_consent(text, inet, text)
  from public, anon, authenticated;
grant execute on function myportifolio.record_terms_consent(text, inet, text) to service_role;

-- ===== vindo da secao 5.9 do plano =====
create table if not exists myportifolio.refund_requests (
  email text primary key references myportifolio.member_access(email) on delete cascade,
  requested_at timestamptz not null default now(),
  reason text,
  within_cdc boolean not null,   -- calculado no insert, congela a prova do prazo
  processed_at timestamptz,
  processed_by text
);
alter table myportifolio.refund_requests enable row level security;
revoke all on myportifolio.refund_requests from anon, authenticated;

-- ===== vindo da secao 5.9 do plano =====
-- LGPD art. 18 (eliminacao) e achado 27: apagar a conta e direito do titular, com
-- carencia de 7 dias para arrependimento. A purga real e job, nao esta RPC.
create or replace function myportifolio.request_account_deletion() returns timestamptz
language plpgsql security definer set search_path = myportifolio, public as $$
declare v_email text := (select myportifolio.current_purchase_email()); v_prazo timestamptz;
begin
  if v_email is null then raise exception 'sem conta para apagar'; end if;
  v_prazo := now() + interval '7 days';
  -- Guardar a marca em app_settings e nao numa tabela propria e escolha de fase 1:
  -- quando houver mais de um tipo de pedido, vira tabela.
  insert into myportifolio.app_settings (key, value)
  values ('exclusao:' || v_email, v_prazo::text)
  on conflict (key) do update set value = excluded.value, updated_at = now();
  -- unlive_reason = 'exclusao': o motivo fica gravado para que NENHUM evento de acesso
  -- posterior (desbloqueio, reconcessao, reenvio de member_added) traga a pagina de volta
  -- ao ar durante a carencia. Republicar dado de quem pediu eliminacao seria violar o
  -- art. 18 da LGPD dentro da propria funcao escrita para atende-lo.
  update myportifolio.portfolio_publications pb
  set is_live = false, unlive_reason = 'exclusao'
  from myportifolio.portfolios pf
  where pf.id = pb.portfolio_id and pf.owner_email = v_email and pb.is_live;
  return v_prazo;
end;
$$;
revoke execute on function myportifolio.request_account_deletion() from public, anon;
grant execute on function myportifolio.request_account_deletion() to authenticated;

-- ===== vindo da secao 5.9 do plano =====
-- O par de request_account_deletion. Apaga a marca de prazo e devolve a pagina ao ar, e
-- SO ela: republica a ultima versao apenas se ela tiver saido do ar por 'exclusao'. Se o
-- dono ja tinha despublicado antes de pedir a exclusao, cancelar a exclusao nao pode
-- publicar o que ele nao queria no ar, que e a mesma distincao de unlive_reason que o
-- trigger de acesso faz (4.5).
create or replace function myportifolio.cancel_account_deletion() returns boolean
language plpgsql security definer set search_path = myportifolio, public as $$
declare v_email text := (select myportifolio.current_purchase_email()); v_havia boolean;
begin
  if v_email is null then raise exception 'sem conta para esta sessao'; end if;
  delete from myportifolio.app_settings where key = 'exclusao:' || v_email;
  get diagnostics v_havia = row_count;
  if not v_havia then return false; end if;

  update myportifolio.portfolio_publications pb
  set is_live = true, unlive_reason = null
  from myportifolio.portfolios pf
  where pf.id = pb.portfolio_id
    and pf.owner_email = v_email
    and pb.unlive_reason = 'exclusao'
    and pb.version = (select max(x.version) from myportifolio.portfolio_publications x
                      where x.portfolio_id = pf.id)
    and myportifolio.has_active_access();
  return true;
end;
$$;
revoke execute on function myportifolio.cancel_account_deletion() from public, anon;
grant execute on function myportifolio.cancel_account_deletion() to authenticated;
