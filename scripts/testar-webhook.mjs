// Bate na Edge Function do webhook da Hubla e confere o efeito NO BANCO, nao so o status HTTP.
//
// POR QUE ESTE SCRIPT EXISTE: esta function serve DOIS produtos que dividem o mesmo projeto
// Supabase, e um deles (AI Block) ja tem cliente pagando. Deployar por cima e "ver se da
// certo" significa testar em producao de um produto vivo. Entao a sequencia e: sobe uma copia
// com outro nome, roda isto contra a copia, e so depois promove.
//
//   node scripts/testar-webhook.mjs                  roda contra hubla-webhook-teste
//   node scripts/testar-webhook.mjs --alvo <nome>    roda contra outra function
//   node scripts/testar-webhook.mjs --limpar         so apaga o rastro do e-mail de teste
//
// O QUE NAO E TESTADO AQUI, DE PROPOSITO: a concessao real do AI Block. O ramo dele e codigo
// que nao mudou uma linha, e exercita-lo de verdade escreveria numa tabela de produto vivo
// (public.member_access) para um e-mail que nao existe. O que interessa provar e que evento
// do AI Block NAO ENTRA no caminho do MyPortifolio, e isso da para observar sem conceder
// nada: se ele entrasse, nasceria linha em myportifolio.hubla_events.
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { randomUUID, randomBytes } from 'node:crypto';

const env = Object.fromEntries(
  (await readFile(resolve(process.cwd(), '.env.local'), 'utf8'))
    .split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
);
const REF = env.SUPABASE_PROJECT_REF;
const TOKEN_ADMIN = env.SUPABASE_ACCESS_TOKEN;

const iAlvo = process.argv.indexOf('--alvo');
const ALVO = iAlvo >= 0 ? process.argv[iAlvo + 1] : 'hubla-webhook-teste';
const URL_FN = `https://${REF}.supabase.co/functions/v1/${ALVO}`;

const TOKEN_MP = (
  await readFile(
    'C:/Users/HELINH~1/AppData/Local/Temp/claude/D--Projetos-vibeocding-eu-portifolio-helio/3070095b-f879-4daf-8a70-f1c66a7c3166/scratchpad/mp_token.txt',
    'utf8',
  )
).trim();

const EMAIL = 'webhook-teste-mp@methodgrowthhub.com.br';
const ID_MAIN = 'dol37hflBB4LloFHpGab';
const ID_SETUP = 'q7IxDLHWM6OI8EBmrreo';
// Id inventado que nao esta em nenhum dos dois mapas. E o ensaio do bump de personalizacao,
// que so vai ganhar id de verdade no primeiro evento real com o bump marcado.
const ID_DESCONHECIDO = 'bumpFake' + randomBytes(6).toString('hex');
// Um id REAL do AI Block, lido do mapa dele. Serve so para provar o desvio de caminho.
const ID_AIBLOCK = Object.keys(
  JSON.parse(
    JSON.stringify(
      Object.fromEntries(
        (await readFile(resolve(process.cwd(), 'supabase/functions/hubla-webhook/productTiers.ts'), 'utf8'))
          .split('\n')
          .map((l) => l.match(/^\s*['"]?([A-Za-z0-9_-]{12,})['"]?\s*:\s*['"]/))
          .filter(Boolean)
          .map((m) => [m[1], 1]),
      ),
    ),
  ),
)[0];

// A API de gerenciamento fica atras da Cloudflare, que devolve 403 para user-agent de script.
async function sql(query) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN_ADMIN}`,
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    },
    body: JSON.stringify({ query }),
  });
  const t = await r.text();
  try {
    return JSON.parse(t);
  } catch {
    throw new Error(`sql nao-json: ${t.slice(0, 200)}`);
  }
}

async function limpar() {
  await sql(`
    delete from myportifolio.setup_requests where email = '${EMAIL}';
    delete from myportifolio.member_access where email = '${EMAIL}';
    delete from myportifolio.hubla_events where email = '${EMAIL}';
    delete from public.hubla_events where email = '${EMAIL}';
    delete from auth.users where email = '${EMAIL}';
  `);
}

// O corpo real da Hubla: type na raiz, e o resto pendurado em event.
function evento(tipo, ids, email = EMAIL) {
  return {
    type: tipo,
    event: { products: ids.map((id) => ({ id })), user: { email } },
  };
}

async function bater(corpo, { token = TOKEN_MP, idem = randomUUID(), sandbox = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token !== null) headers['x-hubla-token'] = token;
  if (idem !== null) headers['x-hubla-idempotency'] = idem;
  if (sandbox) headers['x-hubla-sandbox'] = 'true';
  const r = await fetch(URL_FN, { method: 'POST', headers, body: JSON.stringify(corpo) });
  let json = null;
  try {
    json = JSON.parse(await r.text());
  } catch {}
  return { status: r.status, json, idem };
}

const resultados = [];
function conferir(nome, passou, detalhe) {
  resultados.push({ nome, passou, detalhe });
  console.log(`${passou ? 'ok  ' : 'FALHOU'} ${nome}${detalhe ? `  (${detalhe})` : ''}`);
}

if (process.argv.includes('--limpar')) {
  await limpar();
  console.log('rastro do e-mail de teste apagado');
  process.exit(0);
}

console.log(`alvo: ${URL_FN}`);
console.log(`id do AI Block usado so para desvio: ${ID_AIBLOCK}\n`);
await limpar();

// 1. PORTA ------------------------------------------------------------------
{
  const r = await bater(evento('customer.member_added', [ID_MAIN]), { token: 'errado' });
  conferir('token invalido devolve 401', r.status === 401, `status ${r.status}`);
}
{
  const r = await bater(evento('customer.member_added', [ID_MAIN]), { token: null });
  conferir('sem token devolve 401', r.status === 401, `status ${r.status}`);
}
{
  const r = await bater(evento('customer.member_added', [ID_MAIN]), { idem: null });
  conferir('sem idempotency devolve 400', r.status === 400, `status ${r.status}`);
}
{
  const r = await bater(evento('customer.member_added', [ID_MAIN]), { idem: 'nao-e-uuid' });
  conferir('idempotency fora do formato devolve 400', r.status === 400, `status ${r.status}`);
}

// 2. SANDBOX NAO CONCEDE ----------------------------------------------------
{
  const r = await bater(evento('customer.member_added', [ID_MAIN]), { sandbox: true });
  const acesso = await sql(`select 1 from myportifolio.member_access where email = '${EMAIL}'`);
  conferir(
    'sandbox do MyPortifolio loga e nao concede',
    r.json?.status === 'sandbox-logged' && acesso.length === 0,
    `${r.json?.status}, ${acesso.length} linha de acesso`,
  );
  const linha = await sql(
    `select processed_result from myportifolio.hubla_events where id = '${r.idem}'`,
  );
  conferir(
    'sandbox deixa auditoria como ignorado',
    linha[0]?.processed_result === 'ignorado',
    JSON.stringify(linha[0] ?? null),
  );
}

// 3. DESVIO DE CAMINHO ------------------------------------------------------
// Evento do AI Block nao pode encostar em myportifolio.hubla_events.
{
  const r = await bater(evento('customer.member_added', [ID_AIBLOCK]), { sandbox: true });
  const mp = await sql(`select 1 from myportifolio.hubla_events where id = '${r.idem}'`);
  const pub = await sql(`select 1 from public.hubla_events where id = '${r.idem}'`);
  conferir(
    'evento do AI Block nao cria linha no MyPortifolio',
    mp.length === 0 && pub.length === 1,
    `mp ${mp.length}, public ${pub.length}`,
  );
  await sql(`delete from public.hubla_events where id = '${r.idem}'`);
}

// 4. VENDA DE VERDADE -------------------------------------------------------
let idemMain = null;
{
  const r = await bater(evento('customer.member_added', [ID_MAIN]));
  idemMain = r.idem;
  const a = await sql(
    `select has_main, has_custom, has_setup, blocked, source from myportifolio.member_access where email = '${EMAIL}'`,
  );
  conferir(
    'main concede has_main e so ele',
    r.status === 200 && a[0]?.has_main === true && a[0]?.has_custom === false && a[0]?.has_setup === false,
    JSON.stringify(a[0] ?? null),
  );
  conferir(
    'a flag aplicada volta na resposta',
    JSON.stringify(r.json?.appliedFlags) === JSON.stringify(['main']),
    JSON.stringify(r.json?.appliedFlags),
  );
  const u = await sql(
    `select email_confirmed_at is not null as confirmado from auth.users where email = '${EMAIL}'`,
  );
  conferir('a conta nasce ja confirmada', u[0]?.confirmado === true, JSON.stringify(u[0] ?? null));
  const h = await sql(
    `select processed_result, applied_flags, processed_at is not null as fechado
     from myportifolio.hubla_events where id = '${r.idem}'`,
  );
  conferir(
    'auditoria fecha como ok',
    h[0]?.processed_result === 'ok' && h[0]?.fechado === true,
    JSON.stringify(h[0] ?? null),
  );
}

// 5. DEDUPE -----------------------------------------------------------------
{
  const r = await bater(evento('customer.member_added', [ID_MAIN]), { idem: idemMain });
  const n = await sql(`select count(*)::int as n from myportifolio.hubla_events where id = '${idemMain}'`);
  conferir(
    'reenvio do mesmo evento nao duplica auditoria',
    r.status === 200 && n[0]?.n === 1,
    `status ${r.status}, ${n[0]?.n} linha`,
  );
}

// 6. ID DESCONHECIDO (o ensaio do bump) -------------------------------------
let idemBump = null;
{
  const r = await bater(evento('customer.member_added', [ID_DESCONHECIDO]));
  idemBump = r.idem;
  conferir(
    'id fora dos dois mapas devolve 500 para a Hubla retentar',
    r.status === 500 && r.json?.status === 'no-tier-applied',
    `status ${r.status}, ${r.json?.status}`,
  );
  const h = await sql(
    `select processed_at, attempts, processing_error from myportifolio.hubla_events where id = '${r.idem}'`,
  );
  conferir(
    'id desconhecido deixa linha visivel e ABERTA para reprocessar',
    h.length === 1 && h[0]?.processed_at === null,
    JSON.stringify(h[0] ?? null),
  );
}
{
  const r = await bater(evento('customer.member_added', [ID_DESCONHECIDO]), { idem: idemBump });
  const h = await sql(`select attempts from myportifolio.hubla_events where id = '${idemBump}'`);
  conferir(
    'a retentativa incrementa o contador em vez de ser engolida',
    r.status === 500 && (h[0]?.attempts ?? 0) >= 2,
    `attempts ${h[0]?.attempts}`,
  );
}

// 7. FACILITACAO ABRE FILA --------------------------------------------------
{
  const r = await bater(evento('customer.member_added', [ID_SETUP]));
  const a = await sql(
    `select has_main, has_setup from myportifolio.member_access where email = '${EMAIL}'`,
  );
  const f = await sql(`select status from myportifolio.setup_requests where email = '${EMAIL}'`);
  conferir(
    'setup concede has_setup sem derrubar has_main',
    a[0]?.has_setup === true && a[0]?.has_main === true,
    JSON.stringify(a[0] ?? null),
  );
  conferir('setup abre linha na fila', f.length === 1, JSON.stringify(f[0] ?? null));
}

// 8. REVOGACAO --------------------------------------------------------------
{
  await bater(evento('customer.member_removed', [ID_MAIN]));
  const a = await sql(
    `select has_main, has_setup from myportifolio.member_access where email = '${EMAIL}'`,
  );
  conferir(
    'member_removed tira has_main e preserva has_setup',
    a[0]?.has_main === false && a[0]?.has_setup === true,
    JSON.stringify(a[0] ?? null),
  );
}

// 9. TIPO NAO SUPORTADO -----------------------------------------------------
{
  const r = await bater(evento('invoice.created', [ID_MAIN]));
  conferir(
    'tipo fora dos dois suportados e ignorado sem erro',
    r.status === 200 && r.json?.status === 'ignored-unsupported-type',
    `${r.status} ${r.json?.status}`,
  );
}

// 10. EVENTO SEM E-MAIL -----------------------------------------------------
{
  const r = await bater(evento('customer.member_added', [ID_MAIN], ''));
  conferir(
    'evento sem e-mail nao explode',
    r.status === 200 && r.json?.status === 'ignored-missing-email',
    `${r.status} ${r.json?.status}`,
  );
  await sql(`delete from myportifolio.hubla_events where id = '${r.idem}'`);
  await sql(`delete from public.hubla_events where id = '${r.idem}'`);
}

await limpar();

const falhas = resultados.filter((r) => !r.passou);
console.log(`\n${resultados.length - falhas.length}/${resultados.length} passaram`);
if (falhas.length) {
  console.log('rastro do teste apagado mesmo com falha.');
  process.exit(1);
}
console.log('rastro do e-mail de teste apagado.');
