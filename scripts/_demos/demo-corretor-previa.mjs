// A pagina de verdade, pelo link de previa. Existe porque "Ver como visitante" NAO e a
// pagina: ele so liga uma classe no body do editor e nunca liga as interacoes do render
// publico, entao nem a janela do imovel abre nem a barra de filtro funciona ali.
//
// E pelo link de previa que se ve o que o cliente do Wilson vai receber, ja que a primeira
// publicacao ficou na fila de conferencia.
//
// Uso: node scripts/_demos/demo-corretor-previa.mjs
import { abrirEditor, esperar } from './base.mjs';
import { writeFile } from 'node:fs/promises';

const { pagina, navegador, erros } = await abrirEditor('demo-corretor', { headless: true });

await pagina.click('[data-abrir="publicar"]');
await esperar(1500);
const gerar = pagina.locator('#ed-gaveta button', { hasText: /Gerar link de pr/i }).first();
if (!(await gerar.count())) throw new Error('nao achei "Gerar link de prévia"');
await gerar.click();
await esperar(6000);

const url = await pagina.evaluate(() => {
  const g = document.querySelector('#ed-gaveta');
  // O link mora num <input readonly>, e nao num <a>: o valor nao aparece no innerText.
  const inp = g.querySelector('[data-previa-url]');
  if (inp?.value) return inp.value;
  const a = [...g.querySelectorAll('a[href]')].find((x) => /previa|preview|token/i.test(x.href));
  if (a) return a.href;
  const mt = g.innerText.match(/https?:\/\/\S+/);
  return mt ? mt[0] : '';
});
console.log(`link de previa: ${url || '(nao achei)'}`);
await writeFile('out/corretor-previa-url.txt', `${url}\n\n${await pagina.evaluate(() => document.querySelector('#ed-gaveta')?.innerText || '')}`, 'utf8');
if (!url) { await navegador.close(); process.exit(1); }

await pagina.goto(url, { waitUntil: 'networkidle' });
await esperar(4000);
await pagina.evaluate(async () => {
  for (let y = 0; y < document.body.scrollHeight; y += 400) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 110)); }
  window.scrollTo(0, 0);
});
await esperar(2000);
await pagina.screenshot({ path: 'out/corretor-previa.png', fullPage: true });
const texto = await pagina.evaluate(() => document.body.innerText);
await writeFile('out/corretor-previa.txt', texto, 'utf8');
console.log(`\n--- pagina (${texto.length} chars) ---\n${texto.slice(0, 1200)}`);

// A BARRA DE FILTRO: para um corretor ela e "Venda / Locação", que e a primeira pergunta
// que um cliente faz. Ela funciona na pagina de verdade?
const filtros = await pagina.evaluate(() =>
  [...document.querySelectorAll('.filter-option')].map((f) => f.innerText.trim()));
console.log(`\nfiltros: ${filtros.join(' | ') || '(nenhum)'}`);
if (filtros.length) {
  // O filtro vive atras de um botao de ICONE, sem rotulo nenhum. Para um corretor esse
  // menu e "Venda ou locação?", que e a primeira pergunta de todo cliente, e ele esta
  // escondido num icone no canto.
  await pagina.locator('#project-filter-toggle').first().scrollIntoViewIfNeeded();
  await pagina.locator('#project-filter-toggle').first().click();
  await esperar(1000);
  await pagina.screenshot({ path: 'out/corretor-previa-menu-filtro.png' });
  const alvo = pagina.locator('.filter-option[data-filter="locacao"]').first();
  if (await alvo.count()) {
    await alvo.click();
    await esperar(1500);
    const visiveis = await pagina.evaluate(() =>
      [...document.querySelectorAll('.project-card')].filter((c) => c.offsetParent !== null).map((c) => c.dataset.slug));
    console.log(`  depois de filtrar por Locação: ${visiveis.length} cards -> ${visiveis.join(', ')}`);
    await pagina.screenshot({ path: 'out/corretor-previa-filtro-locacao.png', fullPage: true });
  }
}

// A JANELA DO IMOVEL, onde a ficha tecnica foi parar.
// Desliga o filtro que ficou ligado, senao os cards escondidos nao abrem.
const desligar = pagina.locator('.filter-option[data-filter="locacao"].is-active').first();
if (await desligar.count()) { await desligar.click(); await esperar(1200); }
await pagina.evaluate(() => document.getElementById('project-filter-menu')?.classList.remove('is-open'));
await pagina.evaluate(() => window.scrollTo(0, 0));
await esperar(800);
const slugs = await pagina.evaluate(() =>
  [...document.querySelectorAll('.project-card')].filter((c) => c.offsetParent !== null).map((c) => c.dataset.slug));
for (const slug of slugs.slice(0, 2)) {
  const card = pagina.locator(`.project-card[data-slug="${slug}"]`).first();
  await card.scrollIntoViewIfNeeded();
  await esperar(500);
  await card.click();
  await esperar(2500);
  const t = await pagina.evaluate(() => document.querySelector('[role="dialog"]')?.innerText || '(nao abriu)');
  await writeFile(`out/corretor-previa-janela-${slug}.txt`, t, 'utf8');
  await pagina.screenshot({ path: `out/corretor-previa-janela-${slug}.png` });
  console.log(`\n===== JANELA: ${slug} =====\n${t}`);
  const imgs = await pagina.evaluate(() =>
    [...(document.querySelector('[role="dialog"]')?.querySelectorAll('img') || [])].map((i) => `${i.naturalWidth}x${i.naturalHeight}`));
  console.log(`  fotos na janela: ${imgs.join(' | ') || '(nenhuma)'}`);
  await pagina.keyboard.press('Escape');
  await esperar(1200);
}

// No celular, que e de onde o cliente abre o link do WhatsApp.
await pagina.setViewportSize({ width: 390, height: 844 });
await esperar(2500);
await pagina.evaluate(async () => {
  for (let y = 0; y < document.body.scrollHeight; y += 400) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 110)); }
  window.scrollTo(0, 0);
});
await esperar(1500);
await pagina.screenshot({ path: 'out/corretor-previa-celular.png', fullPage: true });
if (slugs[0]) {
  const c = pagina.locator(`.project-card[data-slug="${slugs[0]}"]`).first();
  await c.scrollIntoViewIfNeeded();
  await esperar(500);
  await c.click();
  await esperar(2500);
  await pagina.screenshot({ path: 'out/corretor-previa-janela-celular.png' });
}

console.log(`\nerros: ${[...new Set(erros)].join('\n') || '(nenhum)'}`);
await navegador.close();
