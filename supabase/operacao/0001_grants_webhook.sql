-- PRE REQUISITO DE DEPLOY DA hubla-webhook. Sem este arquivo aplicado, TODA venda do
-- MyPortifolio falha, e falha do jeito caro: 500, laco de retentativa, comprador pagando e
-- nao entrando.
--
-- POR QUE ISTO NAO ESTA EM supabase/migrations/: as migrations 0001 a 0007 ja foram
-- escritas e aplicadas, e mexer nelas depois de aplicadas num banco COMPARTILHADO com um
-- produto pago e o tipo de coisa que se faz uma vez e se lamenta por seis meses. Este
-- arquivo e aditivo, so concede privilegio, e pode ser rodado quantas vezes for preciso.
--
-- Rodar com: node supabase/operacao/aplicar.mjs supabase/operacao/0001_grants_webhook.sql

-- ---------------------------------------------------------------------------
-- 1. A RPC de concessao, para o service_role
-- ---------------------------------------------------------------------------
-- A migration 0001 faz, e com razao:
--   revoke execute on function myportifolio.grant_or_revoke_member_access(...)
--     from public, anon, authenticated;
-- O Postgres concede EXECUTE a PUBLIC em funcao nova, e sem esse revoke qualquer visitante
-- com a anon key se autoconcede acesso vitalicio. So que o revoke a PUBLIC tirou tambem o
-- service_role, que herdava por PUBLIC e nao por grant proprio.
--
-- Medido em 2026-08-13 no projeto fxchcqlbjszichhbllzm:
--   myportifolio.grant_or_revoke_member_access  proacl = {postgres=X/postgres}
--   public.grant_or_revoke_member_access        proacl = {postgres=X/postgres,service_role=X/postgres}
-- Ou seja: a do AI Block tem o grant explicito, a nossa nao. A Edge Function roda como
-- service_role, entao ela receberia "permission denied for function".
grant execute on function
  myportifolio.grant_or_revoke_member_access(text, text, boolean, text)
  to service_role;

-- ---------------------------------------------------------------------------
-- 2. As tabelas que a function escreve
-- ---------------------------------------------------------------------------
-- service_role tem BYPASSRLS, entao policy nao o barra. GRANT de tabela barra, e nao havia
-- nenhum: a migration 0001 faz `revoke all ... from anon, authenticated` e nunca chegou a
-- conceder nada ao service_role (medido: zero linhas para service_role em
-- information_schema.table_privileges no schema myportifolio).
--
-- Privilegio minimo de verdade: a function insere o evento, le processed_at/attempts e
-- atualiza o desfecho. Ela nunca apaga nada, entao DELETE fica de fora.
grant select, insert, update on myportifolio.hubla_events to service_role;

-- A fila de facilitacao: a function abre a linha quando aplica a flag 'setup'. O upsert com
-- ignoreDuplicates faz INSERT ... on conflict do nothing, entao UPDATE nao seria obrigatorio,
-- mas fica concedido porque o painel de admin (mesma service role) mexe no status.
grant select, insert, update on myportifolio.setup_requests to service_role;

-- Leitura de member_access: a function nao le direto (quem le e a RPC, que e security
-- definer), mas a conciliacao de 5.11 le, e ela roda com a mesma credencial.
grant select on myportifolio.member_access to service_role;

-- ---------------------------------------------------------------------------
-- 3. O passo que NAO e SQL, e sem ele nada acima adianta
-- ---------------------------------------------------------------------------
-- O PostgREST so aceita as tabelas e funcoes dos schemas listados em db_schema, e o
-- @supabase/supabase-js fala com o banco exclusivamente pelo PostgREST. Medido em
-- 2026-08-13 neste projeto:
--
--   GET https://api.supabase.com/v1/projects/fxchcqlbjszichhbllzm/postgrest
--   -> {"db_schema":"public,graphql_public", ...}
--
-- O schema `myportifolio` NAO esta exposto. Enquanto nao estiver, toda chamada
-- .schema('myportifolio') volta com "The schema must be one of the following: public,
-- graphql_public" (PGRST106) e nenhuma venda do MyPortifolio libera acesso.
--
-- O passo, a rodar UMA vez, antes de deployar a function:
--
--   curl -X PATCH "https://api.supabase.com/v1/projects/$SUPABASE_PROJECT_REF/postgrest" \
--     -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
--     -H "Content-Type: application/json" \
--     --data '{"db_schema":"public,graphql_public,myportifolio"}'
--
-- POR QUE ISTO E SEGURO PARA O AI BLOCK: `public` continua primeiro na lista, entao segue
-- sendo o schema padrao de quem nao manda header de profile, que e exatamente o que o
-- caminho do AI Block faz. Acrescentar schema nao remove nem reordena nada dele.
--
-- POR QUE ISTO E SEGURO PARA O MYPORTIFOLIO: todas as tabelas do schema tem RLS ligada, as
-- sensiveis (hubla_events, admin_users, access_aliases) tem `revoke all from anon,
-- authenticated` e as funcoes de escrita tem revoke de anon e authenticated. Expor o schema
-- nao concede nada: quem concede e o GRANT, e ele continua fechado.
--
-- Este passo tambem e pre requisito do Worker de render, que le o portfolio publicado por
-- fetch puro em /rest/v1/rpc/get_published_portfolio.

-- ---------------------------------------------------------------------------
-- 4. Conferencia, executavel e capaz de reprovar
-- ---------------------------------------------------------------------------
-- Depois de aplicar, as tres devem passar:
--
--   -- (a) service_role executa a RPC. Deve aparecer service_role=X
--   select proacl::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--   where n.nspname = 'myportifolio' and proname = 'grant_or_revoke_member_access';
--
--   -- (b) service_role escreve na auditoria. Deve devolver 3 linhas (SELECT/INSERT/UPDATE)
--   select privilege_type from information_schema.table_privileges
--   where table_schema = 'myportifolio' and table_name = 'hubla_events'
--     and grantee = 'service_role';
--
--   -- (c) o AI Block nao perdeu nada. Deve continuar com service_role=X
--   select proacl::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--   where n.nspname = 'public' and proname = 'grant_or_revoke_member_access';
