// Medicao de layout da pagina da chef, na previa ja gerada (out/chef-previa-url.txt).
// Mede o que o olho acusou: o avatar espremido, a linha de redes sem respiro e o
// comportamento em 375 px.
import { chromium } from 'playwright';
import { readFile, writeFile } from 'node:fs/promises';

const url = (await readFile('out/chef-previa-url.txt', 'utf8')).trim();
console.log('previa:', url);
const nav = await chromium.launch({ headless: true });

async function medir(largura, altura, sufixo) {
  const ctx = await nav.newContext({ viewport: { width: largura, height: altura } });
  const p = await ctx.newPage();
  await p.goto(url, { waitUntil: 'networkidle' });
  await p.waitForTimeout(2500);
  const r = await p.evaluate(() => {
    const cx = (el) => {
      if (!el) return null;
      const b = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return {
        box: `${Math.round(b.width)}x${Math.round(b.height)}`,
        natural: el.naturalWidth ? `${el.naturalWidth}x${el.naturalHeight}` : undefined,
        fit: s.objectFit, pos: s.objectPosition, radius: s.borderRadius,
      };
    };
    const imgs = [...document.querySelectorAll('img')];
    const avatar = imgs.find((i) => /avatar/.test(i.src)) || null;
    const heroI = imgs.find((i) => /hero/.test(i.src)) || null;
    // As linhas de rede: rotulo e valor sao irmaos; mede a folga horizontal entre eles.
    const redes = [...document.querySelectorAll('a[href*="instagram"], a[href*="youtube"], a[href*="wa.me"], a[href*="linkedin"]')]
      .filter((a) => a.closest('aside, div'))
      .map((a) => {
        const filhos = [...a.children].map((c) => {
          const b = c.getBoundingClientRect();
          return { txt: c.textContent.trim().slice(0, 24), x1: Math.round(b.left), x2: Math.round(b.right), y: Math.round(b.top) };
        });
        const folga = filhos.length >= 2 ? filhos[1].x1 - filhos[0].x2 : null;
        return { href: a.getAttribute('href')?.slice(0, 34), filhos, folgaPx: folga };
      });
    // Os numeros da capa: os rotulos alinham na mesma linha de base?
    const stats = [...document.querySelectorAll('[class*="grid"] > div')].slice(0, 8)
      .map((d) => ({ txt: d.innerText.replace(/\n/g, ' / ').slice(0, 34), h: Math.round(d.getBoundingClientRect().height) }));
    return {
      avatar: cx(avatar), avatarSrc: avatar?.src.split('/').pop(),
      hero: cx(heroI), heroSrc: heroI?.src.split('/').pop(),
      redes, stats,
      rolagemHorizontal: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      larguraDoc: document.documentElement.scrollWidth,
    };
  });
  console.log(`\n=== ${largura}px ===`);
  console.log(JSON.stringify(r, null, 1));
  await p.screenshot({ path: `out/chef-layout-${sufixo}.png`, fullPage: sufixo === '375' });
  await writeFile(`out/chef-layout-${sufixo}.json`, JSON.stringify(r, null, 1), 'utf8');
  await ctx.close();
}

await medir(1440, 900, '1440');
await medir(375, 812, '375');
await nav.close();
