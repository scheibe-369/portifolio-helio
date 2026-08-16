// Mede o que o print do canvas mostrou: rotulo do botao principal e as pilulas de rede
// estourando a propria caixa. Numero em vez de "parece cortado".
import { abrirEditor, esperar } from './base.mjs';
import { writeFile } from 'node:fs/promises';

const { pagina, navegador } = await abrirEditor('demo-musica', { headless: true });
await esperar(2000);

const medir = async (largura) => {
  await pagina.setViewportSize({ width: largura, height: 1000 });
  await esperar(1200);
  return pagina.evaluate(() => {
    const fora = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {
        texto: el.innerText.replace(/\s+/g, ' ').trim().slice(0, 40),
        larguraCaixa: Math.round(r.width),
        larguraConteudo: el.scrollWidth,
        estoura: el.scrollWidth > Math.ceil(r.width) + 1,
      };
    };
    const canvas = document.getElementById('ed-canvas');
    const cta = [...canvas.querySelectorAll('a, button')].find((a) => /falar sobre seu disco/i.test(a.innerText));
    const pilulas = [...canvas.querySelectorAll('a[target="_blank"]')]
      .filter((a) => /spotify|instagram|youtube|soundcloud|whatsapp/i.test(a.innerText))
      .map((a) => {
        const r = a.getBoundingClientRect();
        const spans = [...a.querySelectorAll('span')].map((s) => {
          const sr = s.getBoundingClientRect();
          return { txt: s.innerText.trim().slice(0, 30), w: Math.round(sr.width), scroll: s.scrollWidth, corta: s.scrollWidth > Math.ceil(sr.width) + 1 };
        });
        return { rede: a.innerText.replace(/\s+/g, ' ').trim().slice(0, 40), altura: Math.round(r.height), spans };
      });
    return { cta: fora(cta), pilulas };
  });
};

const saida = {};
for (const w of [1440, 768, 375]) {
  saida[w] = await medir(w);
  console.log(`\n=== viewport ${w} ===`);
  console.log('CTA :', JSON.stringify(saida[w].cta));
  for (const p of saida[w].pilulas) console.log('rede:', JSON.stringify(p));
  await pagina.screenshot({ path: `out/musica-medidas-${w}.png`, fullPage: false });
}
await writeFile('out/musica-medidas.json', JSON.stringify(saida, null, 2), 'utf8');

// O que o visitante ve ao abrir um case: o unico player possivel e o iframe do YouTube, e
// so nos dois cases que tinham video. Nos outros quatro nao ha nada que toque.
await pagina.setViewportSize({ width: 1440, height: 1000 });
await esperar(1000);
const abrirCase = async (titulo, arquivo) => {
  await pagina.evaluate((t) => {
    const card = [...document.querySelectorAll('#ed-canvas [data-projeto], #ed-canvas a, #ed-canvas article, #ed-canvas button')]
      .find((e) => e.innerText && e.innerText.toUpperCase().includes(t.toUpperCase()));
    card?.click();
  }, titulo);
  await esperar(2500);
  const r = await pagina.evaluate(() => {
    const modal = document.querySelector('[role="dialog"], .fixed.inset-0');
    if (!modal) return { achou: false };
    const ifr = modal.querySelector('iframe');
    return {
      achou: true,
      iframe: ifr ? { src: ifr.src, classe: ifr.parentElement?.className || '' } : null,
      botoes: [...modal.querySelectorAll('a')].map((a) => a.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 6),
      texto: modal.innerText.replace(/\s+/g, ' ').slice(0, 260),
    };
  });
  console.log(`\n--- case "${titulo}" ---`);
  console.log(JSON.stringify(r, null, 2));
  await pagina.screenshot({ path: `out/musica-${arquivo}.png` });
  await pagina.keyboard.press('Escape');
  await esperar(1200);
  return r;
};
const casos = {
  comVideo: await abrirCase('MARÉ DE DENTRO', 'case-com-video'),
  semVideo: await abrirCase('CÂMBIO PRETO', 'case-sem-video'),
};
await writeFile('out/musica-cases.json', JSON.stringify(casos, null, 2), 'utf8');
await navegador.close();
