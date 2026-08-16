// Medicao da pagina publica do professor em tres larguras. Existe porque "parece apertado" nao
// e achado: numero de pixel estourado e.
//
// Uso: node scripts/_demos/demo-professor-medir.mjs
import { chromium } from 'playwright';
import { readFile, writeFile, mkdir } from 'node:fs/promises';

await mkdir('out', { recursive: true });
const url = (await readFile('out/prof-previa-url.txt', 'utf8')).trim();
const linhas = [];
const log = (...a) => { const s = a.join(' '); linhas.push(s); console.log(s); };

const navegador = await chromium.launch({ headless: true });
log(`# MEDICAO da pagina publica de Adriano Peçanha\n${url}\n`);

for (const [rot, w, h] of [['desktop', 1440, 900], ['tablet', 768, 1000], ['celular', 375, 800]]) {
  const ctx = await navegador.newContext({ viewport: { width: w, height: h } });
  const p = await ctx.newPage();
  await p.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
  await p.waitForTimeout(2500);
  log(`\n## ${rot} (${w}px)`);

  const d = await p.evaluate(() => {
    const medir = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {
        texto: (el.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 60),
        largura: Math.round(r.width), altura: Math.round(r.height),
        estouraX: el.scrollWidth > el.clientWidth + 1 ? el.scrollWidth - el.clientWidth : 0,
        estouraY: el.scrollHeight > el.clientHeight + 1 ? el.scrollHeight - el.clientHeight : 0,
      };
    };
    const h1 = document.querySelector('h1');
    const papel = h1?.nextElementSibling;
    const cta = document.querySelector('.bookmarkBtn .btn-text');
    const avatar = document.querySelector('.rounded-full.object-cover, [aria-label][class*="rounded-full"]');
    return {
      corpoEstouraX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      nome: medir(h1),
      papel: medir(papel),
      cta: cta ? { ...medir(cta), clipado: cta.scrollWidth > cta.clientWidth + 1 } : null,
      avatar: avatar ? { largura: Math.round(avatar.getBoundingClientRect().width), altura: Math.round(avatar.getBoundingClientRect().height) } : null,
      sociais: [...document.querySelectorAll('.glass-button')].slice(0, 4).map((a) => ({
        texto: (a.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 40),
        estouraX: a.scrollWidth > a.clientWidth + 1 ? a.scrollWidth - a.clientWidth : 0,
      })),
      stats: [...document.querySelectorAll('h1')].length,
      experiencia: medir(document.querySelector('#experiencia')),
      certificados: document.querySelectorAll('#experiencia a[href*="/certificado/"]').length,
    };
  });

  log(`  corpo estoura no eixo X: ${d.corpoEstouraX}px`);
  log(`  <h1> nome: ${JSON.stringify(d.nome)}`);
  log(`  linha do papel: ${JSON.stringify(d.papel)}`);
  log(`  avatar: ${JSON.stringify(d.avatar)}  (o CSS pede 56x56)`);
  log(`  botao principal: ${JSON.stringify(d.cta)}`);
  d.sociais.forEach((s) => log(`  social "${s.texto}" estoura ${s.estouraX}px`));
  log(`  secao de experiencia: ${d.experiencia?.largura}x${d.experiencia?.altura}, ${d.certificados} botoes de certificado`);

  await p.screenshot({ path: `out/prof-medir-${rot}.png`, fullPage: false });
  const card = p.locator('h1').first().locator('xpath=ancestor::div[contains(@class,"glass-card")][1]');
  if (await card.count()) await card.screenshot({ path: `out/prof-medir-${rot}-card.png` });
  await ctx.close();
}

await writeFile('out/prof-medicao.txt', linhas.join('\n'), 'utf8');
console.log('\n>>> out/prof-medicao.txt');
await navegador.close();
