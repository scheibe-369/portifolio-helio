// Abre o editor JA LOGADO como uma conta de demonstracao, num navegador de verdade.
//
// POR QUE UM SCRIPT E NAO "cole no console": a sessao precisa existir ANTES do primeiro
// script da pagina rodar, senao o boot do editor ja decidiu que nao ha ninguem logado e
// pintou o portao de login. Por isso ela entra por addInitScript, e nao por evaluate.
//
// A LICAO 4 VALE AQUI: curl le bytes, navegador executa. Conferir que o editor abriu e
// procurar no HTML por uma marca do editor, e nao aceitar 200 como prova.
//
//   node scripts/abrir-editor-demo.mjs --slug demo-chef            abre e deixa aberto
//   node scripts/abrir-editor-demo.mjs --slug demo-chef --conferir abre, confere e fecha
//   node scripts/abrir-editor-demo.mjs --slug demo-chef --base http://localhost:5173
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { porSlug } from './demos.config.mjs';

const args = process.argv.slice(2);
const pegar = (nome, padrao = null) => {
  const i = args.indexOf(nome);
  return i >= 0 && args[i + 1] ? args[i + 1] : padrao;
};

const slug = pegar('--slug');
const demo = slug ? porSlug(slug) : null;
if (!demo) { console.error('use --slug <slug de scripts/demos.config.mjs>'); process.exit(1); }

const BASE = pegar('--base', 'https://myportifolio.com.br');
const CONFERIR = args.includes('--conferir');

// A sessao sai do mesmo script que os agentes usam, para nao haver dois caminhos de login.
const bruto = execFileSync(process.execPath, ['scripts/sessao-demo.mjs', '--slug', slug, '--json'], { encoding: 'utf8' });
const [sessao] = JSON.parse(bruto);
if (!sessao || sessao.erro) { console.error(`sessao falhou: ${sessao?.erro || 'sem retorno'}`); process.exit(1); }

const refProjeto = 'fxchcqlbjszichhbllzm';
const CHAVE = `sb-${refProjeto}-auth-token`;

const navegador = await chromium.launch({ headless: CONFERIR });
const contexto = await navegador.newContext({ viewport: { width: 1440, height: 900 } });

// O supabase-js le a sessao do localStorage nesta forma. `expires_at` em segundos.
await contexto.addInitScript(
  ([chave, valor]) => { try { window.localStorage.setItem(chave, valor); } catch {} },
  [CHAVE, JSON.stringify({
    access_token: sessao.accessToken,
    refresh_token: sessao.refreshToken,
    expires_at: sessao.expiresAt,
    token_type: 'bearer',
    user: { id: sessao.userId, email: sessao.email },
  })],
);

const pagina = await contexto.newPage();
const errosConsole = [];
pagina.on('console', (m) => { if (m.type() === 'error') errosConsole.push(m.text()); });
pagina.on('pageerror', (e) => errosConsole.push(String(e)));

const alvo = BASE.includes('localhost') ? `${BASE}/app.html` : `${BASE}/app`;
await pagina.goto(`${alvo}?cb=${Date.now()}`, { waitUntil: 'networkidle' });

const texto = await pagina.evaluate(() => document.body.innerText);
const pediuLogin = /c[oó]digo|entrar|e-mail de compra|seu e-mail/i.test(texto) && !/publicar|seu endere[cç]o|editar/i.test(texto);

console.log(`slug     ${demo.slug}`);
console.log(`persona  ${demo.nome} (${demo.profissao})`);
console.log(`url      ${alvo}`);
console.log(`estado   ${pediuLogin ? 'PORTAO DE LOGIN (a sessao nao pegou)' : 'editor aberto'}`);
if (errosConsole.length) console.log(`console  ${errosConsole.length} erro(s):\n  ${errosConsole.slice(0, 5).join('\n  ')}`);

if (CONFERIR) {
  await pagina.screenshot({ path: `out/demo-${demo.slug}.png`, fullPage: false });
  console.log(`print    out/demo-${demo.slug}.png`);
  await navegador.close();
  process.exit(pediuLogin ? 1 : 0);
} else {
  console.log('\nnavegador aberto. Ctrl+C para fechar.');
  await new Promise(() => {});
}
