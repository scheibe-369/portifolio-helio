// Prova de ponta a ponta do starter kit: passa pelo wizard escolhendo uma area e confere que
// o portfolio nasce MONTADO, e nao em branco.
import { abrirEditor, esperar, textoDaTela } from './base.mjs';
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { porSlug } from '../demos.config.mjs';

const demo = porSlug('demo-kit');
const [s] = JSON.parse(execFileSync(process.execPath, ['scripts/sessao-demo.mjs', '--slug', 'demo-kit', '--json'], { encoding: 'utf8' }));
const nav = await chromium.launch({ headless: true });
const ctx = await nav.newContext({ viewport: { width: 1440, height: 1000 } });
await ctx.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch {} },
  ['sb-fxchcqlbjszichhbllzm-auth-token', JSON.stringify({
    access_token: s.accessToken, refresh_token: s.refreshToken, expires_at: s.expiresAt,
    token_type: 'bearer', user: { id: s.userId, email: s.email } })]);
const p = await ctx.newPage();
p.on('pageerror', (e) => console.log('PAGEERROR:', String(e).slice(0, 200)));
await p.goto(`https://myportifolio.com.br/app?cb=${Date.now()}`, { waitUntil: 'networkidle' });

if (await p.locator('#termos-aceite').count()) {
  await p.check('#termos-aceite');
  await p.click('#termos-continuar');
  await p.waitForSelector('#wz-nome, #ed-canvas', { timeout: 60000 });
}

if (!(await p.locator('#wz-nome').count())) {
  console.log('portfolio ja existe; apague com limpar-demos para refazer o teste');
  await nav.close();
  process.exit(1);
}

// A pergunta nova precisa existir e estar populada pelo banco.
// `state: 'attached'`: <option> nunca conta como visivel para o Playwright, entao esperar
// por visibilidade aqui expira mesmo com a lista carregada.
await p.waitForSelector('#wz-kit option[value="confeitaria"]', { state: 'attached', timeout: 20000 });
const opcoes = await p.$$eval('#wz-kit option', (os) => os.map((o) => o.textContent.trim()));
console.log(`o wizard oferece ${opcoes.length - 1} areas:`, opcoes.slice(1, 4).join(', '), '...');

await p.fill('#wz-nome', demo.nome);
await p.fill('#wz-slug', demo.slug);
await p.fill('#wz-role', demo.role);
await p.selectOption('#wz-kit', 'confeitaria');
await esperar(2500);
await p.locator('button', { hasText: /Criar meu portf/i }).first().click();
await p.waitForSelector('#ed-canvas', { timeout: 60000 });
await esperar(2500);

const texto = await textoDaTela(p);
const tem = (t) => texto.includes(t);
const checagens = [
  ['o selo ja vem preenchido', tem('Confeiteira')],
  ['os titulos ja sao os da area', tem('MINHAS ESPECIALIDADES') || tem('Minhas especialidades')],
  ['a secao de trabalhos ja tem nome proprio', tem('MEUS DOCES') || tem('Meus doces')],
  ['as especialidades ja vieram', tem('Bolo de casamento')],
  ['ha um exemplo para trocar', tem('Bolo de casamento de três andares') || tem('encomendas')],
  ['NAO diz Stacks Dominadas', !tem('Stacks Dominadas')],
];
let falhas = 0;
for (const [nome, ok] of checagens) {
  console.log(`${ok ? 'ok  ' : 'FALHOU'} ${nome}`);
  if (!ok) falhas += 1;
}
await p.screenshot({ path: 'out/kit-recem-criado.png', clip: { x: 0, y: 0, width: 1440, height: 900 } });
console.log('print: out/kit-recem-criado.png');
await nav.close();
process.exit(falhas ? 1 : 0);
