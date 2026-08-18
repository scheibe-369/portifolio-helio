// Abre a janela de cada casamento na PRÉVIA (o render de verdade) e mede onde o depoimento
// e a data foram parar. Sem isso o relatório só teria a grade, e é dentro da janela que os
// seis esconderijos de depoimento vivem.
//
// Uso: node scripts/_demos/demo-eventos-janela.mjs "https://demo-eventos.myportifolio.com.br/?previa=..."
import { chromium } from 'playwright';
import { writeFile } from 'node:fs/promises';

const LINK = process.argv[2];
if (!LINK) throw new Error('passe o link de prévia');
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

const navegador = await chromium.launch({ headless: true });
const ctx = await navegador.newContext({ viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage();
await p.goto(LINK, { waitUntil: 'networkidle' });
await esperar(3000);

// O que a grade mostra de cada card, campo a campo.
const grade = await p.evaluate(() => [...document.querySelectorAll('.project-card')].map((c) => ({
  slug: c.dataset.slug || '',
  texto: c.innerText.replace(/\n+/g, ' | ').trim(),
  caixa: (() => { const b = c.getBoundingClientRect(); return `${Math.round(b.width)}x${Math.round(b.height)}`; })(),
  img: (() => { const i = c.querySelector('img'); return i ? `${i.naturalWidth}x${i.naturalHeight} -> ${Math.round(i.getBoundingClientRect().width)}x${Math.round(i.getBoundingClientRect().height)}` : '(sem imagem)'; })(),
})));
console.log('== A GRADE ==');
grade.forEach((g) => console.log(`  [${g.slug}] caixa ${g.caixa} img ${g.img}\n     ${g.texto}`));
await writeFile('out/eventos-grade.json', JSON.stringify(grade, null, 2), 'utf8');

const total = await p.locator('.project-card').count();
const saida = [];
for (let i = 0; i < total; i++) {
  await p.locator('.project-card').nth(i).click({ force: true });
  await esperar(2200);
  const txt = await p.evaluate(() => {
    const m = [...document.querySelectorAll('div,section,dialog,aside')]
      .filter((e) => /fixed|modal|drawer/i.test(String(e.className)) && e.offsetHeight > 300)
      .sort((a, b) => b.innerText.length - a.innerText.length)[0];
    return m ? m.innerText : '(sem janela)';
  });
  const fotos = await p.evaluate(() => {
    const m = [...document.querySelectorAll('div,section,dialog,aside')]
      .filter((e) => /fixed|modal|drawer/i.test(String(e.className)) && e.offsetHeight > 300)
      .sort((a, b) => b.innerText.length - a.innerText.length)[0];
    return m ? [...m.querySelectorAll('img')].map((x) => `${x.naturalWidth}x${x.naturalHeight}`) : [];
  });
  console.log(`\n== JANELA ${i + 1} == (${fotos.length} imagens: ${fotos.join(', ')})`);
  console.log(txt.slice(0, 2200));
  saida.push({ i: i + 1, fotos, texto: txt });
  if (i === 0) await p.screenshot({ path: 'out/eventos-janela-1.png', fullPage: true });
  if (i === 2) await p.screenshot({ path: 'out/eventos-janela-3.png', fullPage: true });
  await p.keyboard.press('Escape');
  await esperar(1200);
}
await writeFile('out/eventos-janelas.json', JSON.stringify(saida, null, 2), 'utf8');

// A grade no celular, que é de onde a noiva chega pelo link do Instagram.
await p.setViewportSize({ width: 390, height: 844 });
await esperar(2000);
await p.evaluate(async () => {
  for (let y = 0; y < document.body.scrollHeight; y += 400) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 100)); }
  window.scrollTo(0, 0);
});
await esperar(1500);
await p.screenshot({ path: 'out/eventos-previa-celular.png', fullPage: true });
const cel = await p.evaluate(() => [...document.querySelectorAll('.project-card')].map((c) => {
  const b = c.getBoundingClientRect(); const i = c.querySelector('img');
  const ib = i?.getBoundingClientRect();
  return { caixa: `${Math.round(b.width)}x${Math.round(b.height)}`, img: ib ? `${Math.round(ib.width)}x${Math.round(ib.height)}` : '-' };
}));
console.log('\n== CELULAR 390 ==');
console.log(JSON.stringify(cel));

await navegador.close();
