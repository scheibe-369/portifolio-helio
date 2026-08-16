// Abre uma sessao de editor para uma conta de demonstracao, sem passar por caixa de e-mail.
//
// POR QUE ISTO EXISTE: o login do produto e codigo de 8 digitos enviado por e-mail, e um
// agente automatizado nao le e-mail. A saida ja estava no codigo: a Edge Function
// request-access-code usa `auth.admin.generateLink()`, que com a service role DEVOLVE o
// codigo em `properties.email_otp` e NAO dispara mensagem nenhuma. Aqui e o mesmo caminho,
// so que o codigo em vez de ir para o Resend e trocado por uma sessao na hora.
//
// O QUE ELE NAO TESTA, e isso e deliberado: o portao de login. Turnstile, rate limit, piso
// de resposta e resposta uniforme continuam cobertos por scripts/testar-no-ar.mjs. Aqui o
// alvo e o EDITOR, e gastar cada demo digitando codigo seria atrito sem achado.
//
//   node scripts/sessao-demo.mjs --slug demo-chef        uma conta
//   node scripts/sessao-demo.mjs --todos                 as dez
//   node scripts/sessao-demo.mjs --todos --json          so o JSON, para outro script ler
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { DEMOS, porSlug } from './demos.config.mjs';

const args = process.argv.slice(2);
const pegar = (nome, padrao = null) => {
  const i = args.indexOf(nome);
  return i >= 0 && args[i + 1] ? args[i + 1] : padrao;
};
const SO_JSON = args.includes('--json');
const log = (...a) => { if (!SO_JSON) console.log(...a); };

const env = Object.fromEntries(
  (await readFile(resolve(process.cwd(), '.env.local'), 'utf8'))
    .split('\n').filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
);

const URL_SUPA = env.VITE_SUPABASE_URL;
const ANON = env.VITE_SUPABASE_PUBLISHABLE_KEY;
const SVC = env.SUPABASE_SERVICE_ROLE_KEY;
const REF = env.SUPABASE_PROJECT_REF;
const TOKEN = env.SUPABASE_ACCESS_TOKEN;

for (const [nome, v] of [['VITE_SUPABASE_URL', URL_SUPA], ['VITE_SUPABASE_PUBLISHABLE_KEY', ANON],
  ['SUPABASE_SERVICE_ROLE_KEY', SVC], ['SUPABASE_PROJECT_REF', REF], ['SUPABASE_ACCESS_TOKEN', TOKEN]]) {
  if (!v) { console.error(`falta ${nome} no .env.local`); process.exit(1); }
}

// A concessao vai pela Management API, e nao pela RPC de admin, de proposito: a RPC exige
// uma SESSAO de administrador, e pedir sessao de admin para poder criar sessao de demo e uma
// volta desnecessaria num script de operacao. Aqui e o mesmo caminho que o seed-helio.mjs
// usa. `source` e 'cortesia', que e o mesmo valor que a concessao manual do painel forca,
// exatamente para uma conta de teste nunca se disfarcar de venda na conciliacao.
async function sql(query) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' },
    body: JSON.stringify({ query }),
  });
  const t = await r.text();
  let d;
  try { d = JSON.parse(t); } catch { throw new Error('resposta nao-json: ' + t.slice(0, 200)); }
  if (!Array.isArray(d)) throw new Error(d.message || JSON.stringify(d).slice(0, 300));
  return d;
}

const lit = (s) => `'${String(s).replace(/'/g, "''")}'`;

const admin = createClient(URL_SUPA, SVC, { auth: { autoRefreshToken: false, persistSession: false } });

async function prepararConta(demo) {
  // 1. Acesso. has_main e o que o portao de login le; has_custom entra tambem porque metade
  //    do que estamos testando (cor, selo, rotulo do botao) vive atras do bump, e uma demo
  //    sem ele nao consegue exercitar o que precisa ser exercitado.
  for (const produto of ['main', 'custom']) {
    await sql(`select myportifolio.grant_or_revoke_member_access(${lit(demo.email)}, ${lit(produto)}, true, 'cortesia');`);
  }

  // 2. Conta no Auth. Conta ja existente e o caso NORMAL da segunda vez em diante, e nao um
  //    erro. A mensagem real do Supabase e "A user with this email address has already been
  //    registered", que nao casa com um teste ingenuo por "exist": por isso o codigo
  //    `email_exists` vem primeiro, e o texto e so a rede embaixo.
  const { error: erroUser } = await admin.auth.admin.createUser({ email: demo.email, email_confirm: true });
  const jaExiste = erroUser && (erroUser.code === 'email_exists' || /already|exist|registered/i.test(erroUser.message || ''));
  if (erroUser && !jaExiste) throw new Error(`createUser: ${erroUser.message}`);

  // 3. O codigo, sem e-mail nenhum saindo.
  const { data: link, error: erroLink } = await admin.auth.admin.generateLink({ type: 'magiclink', email: demo.email });
  const codigo = link?.properties?.email_otp;
  if (erroLink || !codigo) throw new Error(`generateLink: ${erroLink?.message || 'sem email_otp'}`);

  // 4. Troca o codigo por uma sessao. Cliente anonimo de proposito: e a mesma troca que o
  //    navegador do comprador faz, entao o que sai daqui e uma sessao de usuario comum, com
  //    as mesmas policies por cima. Uma sessao de service role nao provaria nada.
  const anon = createClient(URL_SUPA, ANON, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: sess, error: erroOtp } = await anon.auth.verifyOtp({ email: demo.email, token: codigo, type: 'email' });
  if (erroOtp || !sess?.session) throw new Error(`verifyOtp: ${erroOtp?.message || 'sem sessao'}`);

  return {
    slug: demo.slug,
    email: demo.email,
    nome: demo.nome,
    profissao: demo.profissao,
    userId: sess.user.id,
    accessToken: sess.session.access_token,
    refreshToken: sess.session.refresh_token,
    expiresAt: sess.session.expires_at,
  };
}

const alvo = pegar('--slug');
const lista = args.includes('--todos') ? DEMOS : (alvo ? [porSlug(alvo)].filter(Boolean) : []);
if (!lista.length) {
  console.error('use --slug <slug> ou --todos. Slugs: ' + DEMOS.map((d) => d.slug).join(', '));
  process.exit(1);
}

const saida = [];
for (const demo of lista) {
  try {
    const s = await prepararConta(demo);
    saida.push(s);
    log(`ok   ${demo.slug.padEnd(16)} ${demo.email}`);
  } catch (e) {
    log(`FALHOU ${demo.slug.padEnd(14)} ${e.message}`);
    saida.push({ slug: demo.slug, email: demo.email, erro: e.message });
  }
}

if (SO_JSON) {
  console.log(JSON.stringify(saida, null, 2));
} else {
  const ok = saida.filter((s) => !s.erro).length;
  console.log(`\n${ok}/${lista.length} sessoes abertas`);
  console.log('Para usar no navegador, injete a sessao no localStorage antes de abrir /app:');
  console.log(`  chave: sb-${new URL(URL_SUPA).hostname.split('.')[0]}-auth-token`);
  if (saida.some((s) => s.erro)) process.exit(1);
}
