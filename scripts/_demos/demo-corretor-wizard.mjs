// PASSO ZERO do corretor: o wizard, e a pergunta "Sua área".
//
// Por que este arquivo existe em vez de usar abrirEditor() direto: base.mjs preenche os tres
// campos do wizard e DEIXA "Sua área" vazio, ou seja, decide por "Prefiro começar do zero" em
// nome da persona. Para esta persona essa decisao E o teste: a lista tem dez areas e nenhuma
// e imoveis. O que um corretor faz diante disso e exatamente o que se quer medir, entao a
// escolha e feita aqui, a mao, e registrada.
//
// A DECISAO: escolher a mais proxima. Um corretor que acabou de pagar nao escolhe "começar do
// zero" quando ha uma lista na frente dele; ele procura a que menos o exclui. "Arquitetura /
// Interiores" e a unica das dez que fala de imovel, mesmo que fale do lado de quem projeta e
// nao de quem vende.
//
// Uso: node scripts/_demos/demo-corretor-wizard.mjs
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { writeFile, mkdir } from 'node:fs/promises';
import { porSlug } from '../demos.config.mjs';

const CHAVE_SESSAO = 'sb-fxchcqlbjszichhbllzm-auth-token';
const APEX = 'https://myportifolio.com.br';
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const ESCOLHA = process.argv[2] || 'arquitetura';

await mkdir('out', { recursive: true });
const demo = porSlug('demo-corretor');
const bruto = execFileSync(process.execPath, ['scripts/sessao-demo.mjs', '--slug', 'demo-corretor', '--json'], { encoding: 'utf8' });
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
pagina.on('console', (mm) => { if (mm.type() === 'error') erros.push(`console: ${mm.text().slice(0, 300)}`); });

const t0 = Date.now();
await pagina.goto(`${APEX}/app?cb=${Date.now()}`, { waitUntil: 'networkidle' });

// TERMOS. Cronometrado de proposito: o botao so troca para "Registrando..." e nao ha barra
// de progresso nenhuma, e o relatorio precisa do numero.
if (await pagina.locator('#termos-aceite').count()) {
  const tt = Date.now();
  await pagina.check('#termos-aceite');
  await pagina.click('#termos-continuar');
  await pagina.waitForSelector('#wz-nome, #ed-canvas', { timeout: 60000 });
  console.log(`aceite dos termos: ${Math.round((Date.now() - tt) / 1000)}s sem indicacao de progresso`);
}

if (!(await pagina.locator('#wz-nome').count())) {
  console.log('o wizard ja passou nesta conta: o portfolio existe. Nada a fazer aqui.');
  await navegador.close();
  process.exit(0);
}

await pagina.screenshot({ path: 'out/corretor-wizard.png', fullPage: true });

const areas = await pagina.evaluate(() =>
  [...document.querySelectorAll('#wz-kit option')].map((o) => `${o.value || '(vazio)'} = ${o.textContent.trim()}`));
console.log('\n== "Sua área": as opcoes oferecidas ==');
console.log(areas.join('\n'));
await writeFile('out/corretor-areas-wizard.txt', `${areas.join('\n')}\n\nescolhida: ${ESCOLHA}\n`, 'utf8');

const temImovel = areas.some((a) => /im[oó]ve|corret|creci|imobili/i.test(a));
console.log(`\nexiste opcao de imoveis? ${temImovel ? 'SIM' : 'NAO'}`);

await pagina.fill('#wz-nome', demo.nome);
await pagina.fill('#wz-slug', demo.slug);
await pagina.fill('#wz-role', demo.role);
await pagina.selectOption('#wz-kit', ESCOLHA);
await esperar(2500);
await pagina.screenshot({ path: 'out/corretor-wizard-preenchido.png', fullPage: true });
await pagina.locator('button', { hasText: /Criar meu portf/i }).first().click();
await pagina.waitForSelector('#ed-canvas', { timeout: 60000 });
await esperar(3000);

// O QUE O KIT ERRADO INSTALOU. E o dado do relatorio: quanto do que ele montou serve, e
// quanto o corretor vai ter que desfazer a mao.
const canvas = await pagina.evaluate(() => document.getElementById('ed-canvas')?.innerText || '');
await writeFile('out/corretor-canvas-com-kit.txt', canvas, 'utf8');
await pagina.screenshot({ path: 'out/corretor-canvas-com-kit.png', fullPage: true });
console.log('\n== O QUE O KIT "arquitetura" MONTOU ==');
console.log(canvas.slice(0, 2500));

console.log(`\ntempo ate ter um portfolio: ${Math.round((Date.now() - t0) / 1000)}s`);
console.log(`\nerros: ${[...new Set(erros)].join('\n') || '(nenhum)'}`);
await navegador.close();
