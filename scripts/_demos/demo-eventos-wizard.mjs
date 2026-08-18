// Agente de nicho, parte 1: a PERGUNTA "Sua área" para quem nao esta na lista.
//
// Clarice Bonfim e cerimonialista de casamentos. O wizard oferece dez areas e nenhuma delas e
// evento. Este script existe SO para medir esse momento, porque `base.mjs` passa reto por ele
// (ele preenche tres campos e nunca toca no seletor de kit, ou seja, toda persona anterior
// caiu no "Prefiro começar do zero" sem nem ver a pergunta).
//
// Aqui a lista e lida, fotografada, e a escolha e feita como uma pessoa faria: procurando a
// palavra da profissao dela e, ao nao achar, pegando a area mais proxima. O custo dessa
// escolha e o que o relatorio mede depois.
//
// Uso: node scripts/_demos/demo-eventos-wizard.mjs
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { porSlug } from '../demos.config.mjs';

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const CHAVE_SESSAO = 'sb-fxchcqlbjszichhbllzm-auth-token';
const APEX = 'https://myportifolio.com.br';
const SLUG = 'demo-eventos';

await mkdir('out', { recursive: true });
const demo = porSlug(SLUG);

const bruto = execFileSync(process.execPath, ['scripts/sessao-demo.mjs', '--slug', SLUG, '--json'], { encoding: 'utf8' });
const [s] = JSON.parse(bruto);
if (!s || s.erro) throw new Error(`sessao falhou: ${s?.erro || 'sem retorno'}`);

const navegador = await chromium.launch({ headless: true });
const contexto = await navegador.newContext({ viewport: { width: 1440, height: 900 } });
await contexto.addInitScript(([k, v]) => { try { window.localStorage.setItem(k, v); } catch {} },
  [CHAVE_SESSAO, JSON.stringify({
    access_token: s.accessToken, refresh_token: s.refreshToken, expires_at: s.expiresAt,
    token_type: 'bearer', user: { id: s.userId, email: s.email },
  })]);

const pagina = await contexto.newPage();
const erros = [];
pagina.on('pageerror', (e) => erros.push(`pageerror: ${String(e).slice(0, 300)}`));
pagina.on('console', (m) => { if (m.type() === 'error') erros.push(`console: ${m.text().slice(0, 300)}`); });

await pagina.goto(`${APEX}/app?cb=${Date.now()}`, { waitUntil: 'networkidle' });

// Termos.
const t0 = Date.now();
if (await pagina.locator('#termos-aceite').count()) {
  console.log('== TERMOS ==');
  await pagina.check('#termos-aceite');
  await pagina.click('#termos-continuar');
  await pagina.waitForSelector('#wz-nome, #ed-canvas', { timeout: 60000 });
  console.log(`  aceite levou ${Math.round((Date.now() - t0) / 1000)}s`);
}

if (!(await pagina.locator('#wz-nome').count())) {
  console.log('WIZARD JA PASSOU: o portfolio ja existe. Nada a medir aqui.');
  await navegador.close();
  process.exit(0);
}

console.log('\n== WIZARD ==');
await pagina.screenshot({ path: 'out/eventos-wizard.png', fullPage: true });

// A pergunta que interessa. Espera a RPC que popula o select.
await esperar(3000);
const opcoes = await pagina.evaluate(() =>
  [...document.querySelectorAll('#wz-kit option')].map((o) => ({ valor: o.value, rotulo: o.textContent.trim() })));
console.log(`  "Sua área" tem ${opcoes.length} opções:`);
opcoes.forEach((o, i) => console.log(`    ${i}. [${o.valor || '(vazio)'}] ${o.rotulo}`));
await writeFile('out/eventos-areas.json', JSON.stringify(opcoes, null, 2), 'utf8');

// O que a Clarice procuraria.
const PALAVRAS = /evento|casamento|cerimon|festa|noiv|assessor/i;
const acerto = opcoes.find((o) => o.valor && PALAVRAS.test(o.rotulo));
console.log(`\n  busca por evento/casamento/cerimonial/festa nos rótulos: ${acerto ? acerto.rotulo : 'NENHUMA'}`);

// Sem acerto, a decisao e humana. "Confeitaria / Food" e a unica cujo vocabulario encosta em
// festa de casamento (o proprio kit tem "Bolo de casamento" nas especialidades). Escolher ela
// e o comportamento realista de quem nao quer marcar "começar do zero" e ver tela em branco.
const escolhido = acerto ? acerto.valor : (opcoes.find((o) => o.valor === 'confeitaria') ? 'confeitaria' : '');
console.log(`  escolha: "${opcoes.find((o) => o.valor === escolhido)?.rotulo || 'Prefiro começar do zero'}" (valor=${escolhido || 'vazio'})`);

await pagina.fill('#wz-nome', demo.nome);
await pagina.fill('#wz-slug', demo.slug);
await pagina.fill('#wz-role', demo.role);
if (escolhido) await pagina.selectOption('#wz-kit', escolhido);
await esperar(2500);
await pagina.screenshot({ path: 'out/eventos-wizard-preenchido.png', fullPage: true });

await pagina.locator('button', { hasText: /Criar meu portf/i }).first().click();
await pagina.waitForSelector('#ed-canvas', { timeout: 60000 });
await esperar(2500);

// O que o kit trouxe: e disso que o relatorio calcula o custo de desfazer.
const canvas = await pagina.evaluate(() => document.getElementById('ed-canvas')?.innerText || '');
await writeFile('out/eventos-canvas-recem-nascido.txt', canvas, 'utf8');
console.log('\n== A PÁGINA RECÉM-NASCIDA (com o kit de confeitaria) ==');
console.log(canvas.slice(0, 2500));
await pagina.screenshot({ path: 'out/eventos-canvas-recem-nascido.png', fullPage: true });

console.log('\n== ERROS ==');
console.log(erros.length ? [...new Set(erros)].join('\n') : '(nenhum)');
await navegador.close();
