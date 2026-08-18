// Sonda: por que a janela do imovel nao abriu no clique. Zona de investigacao, nao de
// preenchimento. Ela olha se o card esta dentro de um iframe, se #project-modal existe e o
// que acontece com ele depois do clique.
//
// Uso: node scripts/_demos/demo-corretor-janela2.mjs
import { abrirEditor, esperar } from './base.mjs';
import { writeFile } from 'node:fs/promises';

const { pagina, navegador, erros, APEX } = await abrirEditor('demo-corretor', { headless: true });
await pagina.goto(`${APEX}/app?cb=${Date.now()}`, { waitUntil: 'networkidle' });
await esperar(3000);
const ver = pagina.locator('[data-abrir="ver-visitante"], button:has-text("Ver como visitante")').first();
if (await ver.count()) { await ver.click(); await esperar(5000); }

console.log(`url atual: ${pagina.url()}`);
console.log(`iframes: ${pagina.frames().length}`);
for (const f of pagina.frames()) console.log(`  frame: ${f.url()}`);

const antes = await pagina.evaluate(() => {
  const mo = document.getElementById('project-modal');
  return { existe: Boolean(mo), classe: mo?.className || '', cards: document.querySelectorAll('.project-card').length };
});
console.log('antes do clique:', JSON.stringify(antes));

await pagina.evaluate(async () => {
  for (let y = 0; y < document.body.scrollHeight; y += 400) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 100)); }
});
await esperar(1200);
await pagina.locator('.project-card').first().scrollIntoViewIfNeeded();
await esperar(600);
await pagina.locator('.project-card').first().click({ force: true });
await esperar(2500);

const depois = await pagina.evaluate(() => {
  const mo = document.getElementById('project-modal');
  return {
    classe: mo?.className || '(nao existe)',
    vazio: (mo?.innerHTML || '').length,
    texto: (mo?.innerText || '').slice(0, 2000),
    dialog: Boolean(document.querySelector('[role="dialog"]')),
  };
});
console.log('depois do clique:', JSON.stringify({ classe: depois.classe, tamanhoHTML: depois.vazio, dialog: depois.dialog }));
console.log(`\n--- texto da janela ---\n${depois.texto || '(vazio)'}`);
await writeFile('out/corretor-janela-sonda.txt', `${JSON.stringify(depois, null, 2)}`, 'utf8');
await pagina.screenshot({ path: 'out/corretor-janela-sonda.png', fullPage: false });

// Teclado, que e o outro caminho de abertura (role=button, tabindex=0).
if (!depois.dialog) {
  await pagina.locator('.project-card').first().focus();
  await pagina.keyboard.press('Enter');
  await esperar(2000);
  const t = await pagina.evaluate(() => document.querySelector('[role="dialog"]')?.innerText || '(nada)');
  console.log(`\n--- por Enter no teclado ---\n${t.slice(0, 1500)}`);
  await writeFile('out/corretor-janela-teclado.txt', t, 'utf8');
  await pagina.screenshot({ path: 'out/corretor-janela-teclado.png' });
}

console.log(`\nerros: ${[...new Set(erros)].join('\n') || '(nenhum)'}`);
await navegador.close();
