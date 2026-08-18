// Medida do corte. A linha de preco e a UNICA que carrega dado estruturado na grade, e no
// celular ela e truncada. Este script mede quanto de cada uma sobrevive em 390px e em 1440px,
// para o relatorio ter numero e nao impressao.
//
// Uso: node scripts/_demos/demo-corretor-medir.mjs <url-de-previa>
import { chromium } from 'playwright';
import { writeFile, readFile } from 'node:fs/promises';

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
let url = process.argv[2];
if (!url) {
  const salvo = await readFile('out/corretor-previa-url.txt', 'utf8').catch(() => '');
  url = (salvo.match(/https?:\/\/\S+previa=\S+/) || [])[0] || '';
}
if (!url) throw new Error('passe a URL de previa (out/corretor-previa-url.txt esta vazio)');

const navegador = await chromium.launch({ headless: true });
const pagina = await (await navegador.newContext({ viewport: { width: 1440, height: 900 } })).newPage();

const medir = async (largura) => {
  await pagina.setViewportSize({ width: largura, height: 900 });
  await pagina.goto(url, { waitUntil: 'networkidle' });
  await esperar(3500);
  await pagina.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 400) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 90)); }
  });
  await esperar(1200);
  return pagina.evaluate(() => [...document.querySelectorAll('.project-card')].map((c) => {
    const p = [...c.querySelectorAll('p')].find((x) => /R\$|VENDIDO/i.test(x.textContent));
    if (!p) return null;
    // scrollWidth > clientWidth e a assinatura exata de `truncate` cortando texto.
    const cortado = p.scrollWidth > p.clientWidth + 1;
    const proporcao = p.scrollWidth ? Math.round((p.clientWidth / p.scrollWidth) * 100) : 100;
    return { slug: c.dataset.slug, texto: p.textContent.trim(), cortado, visivel: `${proporcao}%` };
  }).filter(Boolean));
};

const linhas = [];
for (const w of [1440, 768, 390]) {
  const r = await medir(w);
  linhas.push(`\n=== ${w}px ===`);
  for (const x of r) {
    linhas.push(`${x.cortado ? 'CORTADO' : '  ok   '} ${x.visivel.padStart(4)} visivel :: "${x.texto}" (${x.slug})`);
  }
}
console.log(linhas.join('\n'));
await writeFile('out/corretor-medida-preco.txt', `${linhas.join('\n')}\n`, 'utf8');
await navegador.close();
