// Revisao 2 da pagina publica do Caio (demo-fotografo). So LE, nao escreve nada.
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';

const URL = 'https://demo-fotografo.myportifolio.com.br';
mkdirSync('out', { recursive: true });
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const linhas = [];
const log = (...a) => { const s = a.map((x) => (typeof x === 'string' ? x : JSON.stringify(x, null, 2))).join(' '); linhas.push(s); console.log(s); };

const nav = await chromium.launch({ headless: true });

for (const [rot, vw, vh] of [['1440', 1440, 900], ['375', 375, 812]]) {
  const ctx = await nav.newContext({ viewport: { width: vw, height: vh }, deviceScaleFactor: 1 });
  const pg = await ctx.newPage();
  const erros = [];
  pg.on('pageerror', (e) => erros.push(`pageerror: ${String(e).slice(0, 200)}`));
  pg.on('console', (m) => { if (m.type() === 'error') erros.push(`console: ${m.text().slice(0, 200)}`); });
  await pg.goto(`${URL}/?cb=${Date.now()}`, { waitUntil: 'networkidle' });
  await esperar(2500);
  await pg.screenshot({ path: `out/rev2-foto-${rot}-topo.png` });
  await pg.screenshot({ path: `out/rev2-foto-${rot}-inteiro.png`, fullPage: true });
  log(`\n===== VIEWPORT ${rot} =====`);
  log('ERROS:', JSON.stringify(erros));

  const txt = await pg.evaluate(() => document.body.innerText);
  writeFileSync(`out/rev2-foto-${rot}-texto.txt`, txt, 'utf8');
  log('--- TEXTO DA TELA ---');
  log(txt);

  // Todas as imagens: natural vs render, object-fit, object-position
  const imgs = await pg.evaluate(() => [...document.querySelectorAll('img')].map((i) => {
    const r = i.getBoundingClientRect(); const cs = getComputedStyle(i);
    return {
      src: i.currentSrc.split('/').slice(-1)[0].slice(0, 60),
      nat: `${i.naturalWidth}x${i.naturalHeight}`,
      natRatio: (i.naturalWidth / i.naturalHeight).toFixed(3),
      box: `${Math.round(r.width)}x${Math.round(r.height)}`,
      boxRatio: (r.width / r.height).toFixed(3),
      fit: cs.objectFit, pos: cs.objectPosition,
      loading: i.getAttribute('loading'), fetchpriority: i.getAttribute('fetchpriority'),
      alt: i.getAttribute('alt'),
      parentRatio: getComputedStyle(i.parentElement).aspectRatio,
    };
  }));
  log('--- IMAGENS ---'); log(imgs);

  // Redes: folga entre rotulo e valor
  const redes = await pg.evaluate(() => [...document.querySelectorAll('a,li,div')]
    .filter((e) => e.children.length === 2 && [...e.children].every((c) => c.tagName === 'SPAN'))
    .map((e) => {
      const [a, b] = [...e.children].map((c) => c.getBoundingClientRect());
      return { txt: e.innerText.replace(/\n/g, ' | ').slice(0, 60), gap: Math.round(b.left - a.right), dy: Math.round(b.top - a.top) };
    }));
  log('--- PARES ROTULO/VALOR ---'); log(redes);

  log('--- RODAPE ---');
  log(await pg.evaluate(() => document.querySelector('footer')?.innerText || '(sem footer)'));
  log('Method Growth Hub na pagina?', String(txt.includes('Method Growth')));

  // Overflow horizontal
  log('scrollWidth vs innerWidth:', await pg.evaluate(() => `${document.documentElement.scrollWidth} vs ${window.innerWidth}`));

  // Clicar no primeiro card
  const cards = await pg.evaluate(() => [...document.querySelectorAll('[data-projeto],[data-modal],article,.card')].slice(0, 12).map((e) => ({ tag: e.tagName, attrs: e.getAttributeNames().join(','), t: e.innerText.slice(0, 50).replace(/\n/g, ' / ') })));
  log('--- CANDIDATOS A CARD ---'); log(cards);

  const alvo = pg.locator('text=Quem fotografa').first();
  if (await alvo.count()) {
    await alvo.click();
    await esperar(2000);
    await pg.screenshot({ path: `out/rev2-foto-${rot}-modal.png` });
    await pg.screenshot({ path: `out/rev2-foto-${rot}-modal-inteiro.png`, fullPage: true });
    const mtxt = await pg.evaluate(() => {
      const m = document.querySelector('[role="dialog"], .modal, #modal, [data-modal-root]') || document.body;
      return m.innerText;
    });
    log('--- MODAL TEXTO ---'); log(mtxt);
    const mimgs = await pg.evaluate(() => {
      const m = document.querySelector('[role="dialog"], .modal, #modal, [data-modal-root]') || document.body;
      return [...m.querySelectorAll('img')].map((i) => {
        const r = i.getBoundingClientRect(); const cs = getComputedStyle(i);
        return { src: i.currentSrc.split('/').slice(-1)[0].slice(0, 50), nat: `${i.naturalWidth}x${i.naturalHeight}`, natRatio: (i.naturalWidth / i.naturalHeight).toFixed(3), box: `${Math.round(r.width)}x${Math.round(r.height)}`, boxRatio: (r.width / r.height).toFixed(3), fit: cs.objectFit, pos: cs.objectPosition, loading: i.getAttribute('loading'), clickable: !!i.closest('a,button,[role=button]') };
      });
    });
    log('--- MODAL IMAGENS (galeria) ---'); log(mimgs);
    log('--- MODAL HTML (recorte) ---');
    log(await pg.evaluate(() => {
      const m = document.querySelector('[role="dialog"], .modal, #modal, [data-modal-root]');
      return m ? m.outerHTML.slice(0, 6000) : '(sem dialog)';
    }));
    // tentar clicar numa foto da galeria (lightbox?)
    const g = pg.locator('[role="dialog"] img, .modal img').nth(1);
    if (await g.count()) {
      const antes = await pg.evaluate(() => document.querySelectorAll('img').length);
      await g.click({ force: true }).catch(() => {});
      await esperar(1200);
      const depois = await pg.evaluate(() => document.querySelectorAll('img').length);
      await pg.screenshot({ path: `out/rev2-foto-${rot}-galeria-click.png` });
      log(`clique numa foto da galeria: imgs antes=${antes} depois=${depois}`);
    }
  } else {
    log('!! card "Quem fotografa" nao encontrado');
  }
  await ctx.close();
}
await nav.close();
writeFileSync('out/rev2-foto-publico.txt', linhas.join('\n'), 'utf8');
console.log('\nOK -> out/rev2-foto-publico.txt');
