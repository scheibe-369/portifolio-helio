-- CONCILIACAO DE VENDAS (secao 5.11 do plano). Item 12 da fase 1.
--
-- O PROBLEMA QUE ISTO RESOLVE, dito sem eufemismo: nada no webhook prova que existiu
-- pagamento. A autenticacao e um segredo compartilhado no header, o corpo do evento e
-- confiado inteiro (o e-mail e os productIds vem de quem postou), e nao existe consulta de
-- volta a Hubla confirmando o pedido. Sob assinatura isso se autocorrigia: a fraude morria
-- na renovacao que nunca chegava. Sob pagamento UNICO e VITALICIO, um unico POST forjado
-- concede acesso permanente e nada nunca desfaz.
--
-- As duas telas que ja existiam olhavam so o sentido oposto (compras_incompletas e "tem bump
-- e nao tem has_main"). Aqui entra o sentido que faltava: concessao que ninguem pagou.
--
-- Rodar com: node supabase/operacao/aplicar.mjs supabase/operacao/0002_vendas_conferidas.sql

-- ---------------------------------------------------------------------------
-- A tabela do extrato
-- ---------------------------------------------------------------------------
-- Ela e um ESPELHO do extrato da Hubla, nao uma fonte de verdade nossa. Quem escreve e a
-- importacao semanal (supabase/operacao/conciliar.mjs --importar), e a importacao apaga e
-- regrava a janela que esta importando, para o extrato corrigido pela Hubla corrigir aqui
-- tambem.
--
-- PK composta porque uma venda com order bump pode chegar com o mesmo pedido_id para
-- produtos diferentes, e cada produto precisa casar com a flag dele.
create table if not exists myportifolio.vendas_conferidas (
  pedido_id text not null,
  produto text not null check (produto in ('main', 'custom', 'setup')),
  email text not null,
  valor numeric(12, 2),
  vendido_em timestamptz,
  -- 'extrato-hubla' e o caso normal. Fica como coluna porque um dia vai existir linha
  -- lancada na mao (venda por pix fora do gateway, permuta), e ela precisa se declarar,
  -- pela mesma razao que member_access.source se declara: relatorio que acusa gente honesta
  -- de fraude e desligado na segunda semana, e e assim que controle de verdade morre.
  fonte text not null default 'extrato-hubla',
  importado_em timestamptz not null default now(),
  primary key (pedido_id, produto),
  constraint vendas_email_minusculo check (email = lower(email))
);

create index if not exists vendas_conferidas_email_idx
  on myportifolio.vendas_conferidas (email, produto);
create index if not exists vendas_conferidas_data_idx
  on myportifolio.vendas_conferidas (vendido_em);

-- Extrato de vendas e dado financeiro do dono, nao do comprador. Ninguem logado le isto.
alter table myportifolio.vendas_conferidas enable row level security;
revoke all on myportifolio.vendas_conferidas from anon, authenticated;
grant select, insert, update, delete on myportifolio.vendas_conferidas to service_role;

-- ---------------------------------------------------------------------------
-- 1. Concessao sem venda: a consulta que existe para dar ZERO
-- ---------------------------------------------------------------------------
-- Toda linha aqui e um acesso vitalicio que ninguem pagou. Zero e o unico resultado
-- aceitavel. O filtro por source = 'hubla' e o que impede a cortesia e a concessao manual de
-- aparecerem como fraude: elas se declaram na hora da concessao (4.2) e ficam de fora.
create or replace view myportifolio.concessoes_sem_venda
with (security_invoker = true) as
select
  ma.email,
  ma.main_granted_at,
  ma.source,
  ma.blocked,
  (select array_agg(distinct he.id) from myportifolio.hubla_events he
    where he.email = ma.email and not he.is_sandbox) as eventos
from myportifolio.member_access ma
left join myportifolio.vendas_conferidas v
  on v.email = ma.email and v.produto = 'main'
where ma.has_main
  and ma.source = 'hubla'
  and v.email is null;

-- ---------------------------------------------------------------------------
-- 2. Venda sem concessao: o outro lado, que pega quem pagou e nao entrou
-- ---------------------------------------------------------------------------
-- Hoje esse caso so aparece quando o comprador reclama. Aqui ele aparece na segunda de manha.
--
-- main_revoked_at e blocked vem na saida DE PROPOSITO, em vez de virarem filtro: reembolso e
-- chargeback produzem legitimamente "venda no extrato e flag desligada", e esconder isso da
-- consulta esconderia junto o caso em que a revogacao foi indevida. Quem julga e humano, e
-- ele precisa ver a data.
create or replace view myportifolio.vendas_sem_concessao
with (security_invoker = true) as
select
  v.email,
  v.produto,
  v.pedido_id,
  v.valor,
  v.vendido_em,
  ma.email is not null as tem_linha_de_acesso,
  ma.blocked,
  ma.main_revoked_at
from myportifolio.vendas_conferidas v
left join myportifolio.member_access ma on ma.email = v.email
where ma.email is null
   or (v.produto = 'main'   and not ma.has_main)
   or (v.produto = 'custom' and not ma.has_custom)
   or (v.produto = 'setup'  and not ma.has_setup);

-- ---------------------------------------------------------------------------
-- 3. Alarme de volume: o detector que roda sozinho
-- ---------------------------------------------------------------------------
-- O dono conhece as vendas do dia de cabeca. Mandar o numero de concessoes das ultimas 24
-- horas transforma esse conhecimento em deteccao: qualquer divergencia salta sem nenhum
-- sistema novo. Custo total: uma consulta e um e-mail.
create or replace view myportifolio.alarme_volume_24h
with (security_invoker = true) as
select
  (select count(*) from myportifolio.member_access
    where has_main and main_granted_at >= now() - interval '24 hours') as main_24h,
  (select count(*) from myportifolio.member_access
    where has_custom and granted_at >= now() - interval '24 hours') as custom_24h,
  (select count(*) from myportifolio.member_access
    where has_setup and granted_at >= now() - interval '24 hours') as setup_24h,
  -- Evento que entrou e nunca concluiu. Com o achado 5 no lugar, cada um destes e uma venda
  -- que a Hubla ainda esta retentando ou ja desistiu de entregar.
  (select count(*) from myportifolio.hubla_events
    where processed_at is null and not is_sandbox
      and received_at < now() - interval '15 minutes') as eventos_travados,
  (select count(*) from myportifolio.concessoes_sem_venda) as concessoes_sem_venda,
  (select count(*) from myportifolio.compras_incompletas) as compras_incompletas;

grant select on myportifolio.concessoes_sem_venda to service_role;
grant select on myportifolio.vendas_sem_concessao to service_role;
grant select on myportifolio.alarme_volume_24h to service_role;

-- ---------------------------------------------------------------------------
-- Por que o alarme diario NAO e um pg_cron aqui dentro
-- ---------------------------------------------------------------------------
-- Mandar e-mail do Postgres exige pg_net, e a extensao NAO esta instalada neste projeto
-- (verificado em 2026-08-13: pg_cron, pg_stat_statements, pgcrypto, plpgsql, supabase_vault,
-- uuid-ossp, e mais nenhuma). Instalar extensao num banco compartilhado com produto pago,
-- so para agendar um e-mail, e risco desproporcional ao ganho.
--
-- Quem dispara e o conciliar.mjs, chamado uma vez por dia pelo Cron Trigger do Worker (o
-- mesmo que ja faz o keep-alive) ou por um workflow agendado. A consulta mora aqui, no banco,
-- que e o que importa: trocar o disparador nao reescreve regra nenhuma.
