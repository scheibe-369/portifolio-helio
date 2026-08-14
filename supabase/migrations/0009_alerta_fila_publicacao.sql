-- 0009_alerta_fila_publicacao.sql
--
-- O item 11 da fase 1 pede "alerta por e-mail a cada entrada" na fila de primeira
-- publicacao. A fila em si ja existia (publish_reviews) e a tela tambem, mas fila que
-- ninguem sabe que encheu e fila parada: o comprador paga, pede para publicar, e fica
-- esperando ate o dono abrir o painel por acaso.
--
-- POR QUE O ALERTA NAO SAI DO BANCO: pg_net nao esta instalado neste projeto (conferido em
-- 14/08/2026, as extensoes sao pg_cron, pg_stat_statements, pgcrypto, plpgsql,
-- supabase_vault e uuid-ossp). Sem pg_net o Postgres nao fala com o mundo, entao quem manda
-- o e-mail e o cron do Worker, que ja existe e ja tem a service role key.
--
-- POR QUE UMA COLUNA E NAO UMA JANELA DE TEMPO: a alternativa barata seria o cron perguntar
-- "quem entrou nos ultimos 15 minutos". Ela erra nos dois sentidos, e os dois doem: se um
-- disparo do cron falhar, aquela entrada nunca e alertada e o cliente espera para sempre; se
-- a janela for alargada para compensar, o dono recebe o mesmo alerta varias vezes, e caixa
-- de entrada com alerta repetido e caixa de entrada que para de ser lida. Uma marca por
-- linha resolve os dois de uma vez.

alter table myportifolio.publish_reviews
  add column if not exists alerted_at timestamptz;

-- Indice parcial: a consulta do cron so olha o que ainda nao foi decidido nem alertado, e
-- essa fatia e quase sempre vazia. Sem o parcial, o indice cresceria junto com o historico
-- inteiro de publicacoes para servir uma pergunta que quase sempre responde "nenhuma".
create index if not exists publish_reviews_a_alertar
  on myportifolio.publish_reviews (requested_at)
  where decided_at is null and alerted_at is null;

-- RESERVA E CARIMBA NO MESMO PASSO. Isto e o que torna o alerta seguro de repetir: dois
-- disparos simultaneos do cron (retentativa da plataforma, deploy no meio do tiro) nao podem
-- mandar o mesmo aviso duas vezes. O `for update skip locked` faz o segundo enxergar zero
-- linha em vez de esperar pelo primeiro e depois mandar tudo de novo.
--
-- O carimbo vai ANTES de o e-mail sair, e essa ordem e escolhida de olhos abertos: se o
-- Resend falhar depois do carimbo, aquele aviso se perde. O contrario (mandar e carimbar
-- depois) perde o carimbo quando o Worker morre no meio, e ai o dono recebe o mesmo alerta a
-- cada 15 minutos, para sempre, ate abrir o painel. Alerta perdido tem rede: a linha continua
-- na fila, aparecendo na tela com o tempo de espera do lado. Alerta em laco nao tem rede
-- nenhuma, porque ele destroi a confianca em todos os outros alertas junto.
create or replace function myportifolio.claim_reviews_to_alert()
returns table (
  portfolio_id uuid,
  slug text,
  display_name text,
  owner_email text,
  requested_at timestamptz
)
language sql
security definer
set search_path = myportifolio, public
as $$
  with alvo as (
    select r.portfolio_id
    from myportifolio.publish_reviews r
    where r.decided_at is null and r.alerted_at is null
    order by r.requested_at
    limit 50
    for update skip locked
  ),
  marcadas as (
    update myportifolio.publish_reviews r
    set alerted_at = now()
    from alvo
    where r.portfolio_id = alvo.portfolio_id
    returning r.portfolio_id, r.requested_at
  )
  select m.portfolio_id, p.slug, p.display_name, p.owner_email, m.requested_at
  from marcadas m
  join myportifolio.portfolios p on p.id = m.portfolio_id
  order by m.requested_at;
$$;

-- So o service_role. Quem chama e o cron do Worker, que ja carrega essa chave para assinar
-- URL de certificado. Deixar aberto para authenticated daria a qualquer comprador logado o
-- poder de carimbar a propria entrada como ja alertada e passar despercebido, que e
-- exatamente o que a fila existe para impedir.
revoke execute on function myportifolio.claim_reviews_to_alert() from public, anon, authenticated;
grant execute on function myportifolio.claim_reviews_to_alert() to service_role;
