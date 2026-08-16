// A pagina do Diego vista por quem NAO e o Diego: previa ou endereco publicado.
//
//   node scripts/_demos/demo-personal-publico.mjs "<url>" [sufixo]
//
// Ele abre a pagina, mede a moldura do video de cada case e tira o print do modal. A medida e
// o que decide a pergunta desta persona: o Short entra em 9:16 ou em 16:9 com tarja?
import { chromium } from 'playwright';
import { resolve } from 'node:path';

const URL_ALVO = process.argv[2];
const SUFIXO = process.argv[3] || '';
if (!URL_ALVO) throw new Error('passe a URL');

const TIRO = (n) => resolve(process.cwd(), `out/personal-${n}${SUFIXO}.png`);
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

const nav = await chromium.launch({ headless: true });
const LARGURA = Number(process.argv[4] || 1440);
const ctx = await nav.newContext({
  viewport: { width: LARGURA, height: LARGURA < 500 ? 812 : 1000 },
  isMobile: LARGURA < 500,
  hasTouch: LARGURA < 500,
  deviceScaleFactor: 1,
});
const p = await ctx.newPage();
const erros = [];
p.on('pageerror', (e) => erros.push('pageerror: ' + String(e).slice(0, 200)));
p.on('console', (m) => { if (m.type() === 'error') erros.push('console: ' + m.text().slice(0, 200)); });

const r = await p.goto(URL_ALVO, { waitUntil: 'networkidle' });
console.log(`HTTP ${r.status()} em ${URL_ALVO}`);
await esperar(2000);
// Rola a pagina inteira antes do print: as imagens dos cards sao loading="lazy" e um
// screenshot de pagina cheia sem rolar sai com a grade vazia.
await p.evaluate(async () => {
  const passo = window.innerHeight * 0.8;
  for (let y = 0; y < document.body.scrollHeight; y += passo) {
    window.scrollTo(0, y);
    await new Promise((r) => setTimeout(r, 250));
  }
  window.scrollTo(0, 0);
});
await esperar(2500);
await p.screenshot({ path: TIRO('publico'), fullPage: true });

// Quais cases tem video, na ordem da grade.
const cards = await p.$$eval('.project-card[data-slug]', (els) =>
  els.map((e) => ({ slug: e.dataset.slug, titulo: (e.innerText || '').split('\n')[0] })));
console.log('cards: ' + JSON.stringify(cards.map((c) => c.slug)));

for (const card of cards) {
  await p.locator(`.project-card[data-slug="${card.slug}"]`).first().click();
  await esperar(2200);
  const medida = await p.evaluate(() => {
    const frame = document.querySelector('#project-modal iframe');
    if (!frame) return null;
    const moldura = frame.parentElement;
    const c = frame.getBoundingClientRect();
    const m = moldura.getBoundingClientRect();
    return {
      classesDaMoldura: moldura.className,
      iframe: `${Math.round(c.width)}x${Math.round(c.height)}`,
      proporcaoIframe: (c.width / c.height).toFixed(3),
      moldura: `${Math.round(m.width)}x${Math.round(m.height)}`,
      src: frame.getAttribute('src'),
    };
  });
  if (medida) {
    console.log(`\n[${card.slug}]`);
    console.log('  ' + JSON.stringify(medida, null, 2).replace(/\n/g, '\n  '));
    await p.screenshot({ path: TIRO(`modal-${card.slug}`), fullPage: false });
  } else {
    console.log(`\n[${card.slug}] sem video no modal`);
  }
  await p.keyboard.press('Escape');
  await esperar(900);
}

console.log('\n--- erros ---');
[...new Set(erros)].slice(0, 20).forEach((e) => console.log(' - ' + e));
await nav.close();
