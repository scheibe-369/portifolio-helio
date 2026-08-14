// Reproduz uma venda REAL, com o payload que a Hubla mandou de verdade, contra a function
// que a gente quiser.
//
// POR QUE ISTO E DIFERENTE DE scripts/testar-webhook.mjs: aquele monta um corpo minimo, do
// jeito que EU acho que a Hubla manda. Foi exatamente essa suposicao que escondeu o defeito
// das ofertas: o corpo inventado nunca teve `products[].offers[]`, entao o teste passava com
// nota cheia enquanto o codigo ignorava o campo que decide o que a pessoa comprou.
//
// Aqui o corpo vem de myportifolio.hubla_events, ou seja, bytes que a Hubla enviou.
//
//   node scripts/replay-venda.mjs --alvo hubla-webhook-teste --email teste@x.com
//       replica as duas ofertas trocando o e-mail, para nao mexer na compra de verdade
//
//   node scripts/replay-venda.mjs --alvo hubla-webhook --reprocessar
//       reabre os eventos REAIS (processed_at = null) e reenvia com o MESMO idempotency,
//       que e o caminho de recuperacao que o proprio codigo preve
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { lerEnv, consultar } from '../supabase/operacao/lib/db.mjs';

const args = process.argv.slice(2);
const pega = (n, padrao) => {
  const i = args.indexOf(n);
  return i >= 0 ? args[i + 1] : padrao;
};
const ALVO = pega('--alvo', 'hubla-webhook-teste');
const EMAIL_NOVO = pega('--email', null);
const REPROCESSAR = args.includes('--reprocessar');

const local = Object.fromEntries(
  (await readFile('.env.local', 'utf8'))
    .split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
);
const REF = local.SUPABASE_PROJECT_REF;
const TOKEN = local.HUBLA_WEBHOOK_TOKEN;
if (!TOKEN) {
  console.error('falta HUBLA_WEBHOOK_TOKEN em .env.local');
  process.exit(2);
}
const URL_FN = `https://${REF}.supabase.co/functions/v1/${ALVO}`;
const env = await lerEnv();

const eventos = await consultar(
  env,
  `select id, email, payload from myportifolio.hubla_events
   where payload is not null order by received_at asc;`,
);
if (!eventos.length) {
  console.error('nao ha evento gravado para reproduzir');
  process.exit(2);
}
console.log(`alvo: ${URL_FN}`);
console.log(`${eventos.length} evento(s) reais no banco\n`);

for (const ev of eventos) {
  const corpo = typeof ev.payload === 'string' ? JSON.parse(ev.payload) : ev.payload;
  const ofertas = (corpo?.event?.products ?? []).flatMap((p) =>
    (p.offers ?? []).map((o) => `${o.name}:${o.id}`),
  );

  // Trocar o e-mail e o que permite exercitar o payload de verdade sem encostar na compra
  // de verdade. O `user.email` e o unico campo que o webhook le para identificar a pessoa.
  if (EMAIL_NOVO) {
    corpo.event.user.email = EMAIL_NOVO;
    if (corpo.event.subscription?.payer) corpo.event.subscription.payer.email = EMAIL_NOVO;
  }

  // Com --reprocessar, reabre a linha e reenvia com o MESMO idempotency. E o caminho de
  // recuperacao desenhado no proprio webhook: processed_at nulo faz a retentativa
  // reprocessar em vez de ser engolida pelo dedupe.
  const idem = REPROCESSAR ? ev.id : randomUUID();
  if (REPROCESSAR) {
    await consultar(
      env,
      `update myportifolio.hubla_events
         set processed_at = null, processed_result = null, applied_flags = '{}',
             processing_error = null
       where id = '${ev.id}';`,
    );
  }

  const r = await fetch(URL_FN, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-hubla-token': TOKEN,
      'x-hubla-idempotency': idem,
    },
    body: JSON.stringify(corpo),
  });
  const resposta = await r.json().catch(() => null);
  console.log(`  ofertas: ${ofertas.join(', ') || '(nenhuma)'}`);
  console.log(`  -> ${r.status}  ${JSON.stringify(resposta?.appliedFlags ?? resposta?.status)}\n`);
}

const alvoEmail = EMAIL_NOVO ?? eventos[0].email;
const acesso = await consultar(
  env,
  `select email, has_main, has_custom, has_setup, source from myportifolio.member_access
   where email = '${alvoEmail}';`,
);
console.log('ACESSO RESULTANTE:', JSON.stringify(acesso[0] ?? null));

const esperado = acesso[0]?.has_main === true && acesso[0]?.has_custom === true;
console.log(
  esperado
    ? '\nOK: principal E personalizacao concedidas, que e o que a venda pagou.'
    : '\nREPROVOU: a venda pagou as duas ofertas e o acesso nao reflete isso.',
);
process.exit(esperado ? 0 : 1);
