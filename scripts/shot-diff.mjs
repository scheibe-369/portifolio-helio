// Baseline visual: tira print em tres larguras e depois compara pixel a pixel.
//
// POR QUE ISSO EXISTE: o dom-diff prova que a ARVORE nao mudou, e isso e a maior parte da
// garantia. Mas ele nao ve CSS: uma classe Tailwind com valor arbitrario que o scanner do v4
// nao gera (o caso do object-[50%_36%] do hero, item 6 da fase 0) some do CSS sem mexer em
// um no sequer do DOM. O print pega isso e o dom-diff nao.
//
// Um criterio anterior dizia "o site esta visualmente igual", que nao tem oraculo nenhum e
// nao reprova ninguem. Este tem: tolerancia declarada em porcentagem de pixel.
//
//   node scripts/shot-diff.mjs --capture https://host/ --larguras 360,768,1440
//   node scripts/shot-diff.mjs --compare https://host/ --larguras 360,768,1440 --tolerancia 0.2
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import { PNG } from 'pngjs';

const args = process.argv.slice(2);
const pegar = (n, p) => { const i = args.indexOf(n); return i >= 0 && args[i + 1] ? args[i + 1] : p; };
const modo = args.includes('--compare') ? 'compare' : 'capture';
const url = pegar(modo === 'compare' ? '--compare' : '--capture', null);
const larguras = pegar('--larguras', '360,768,1440').split(',').map(Number);
const tolerancia = Number(pegar('--tolerancia', '0.2')); // % de pixels que podem diferir
const dirBase = resolve(process.cwd(), pegar('--dir', 'snapshot/shots'));
const dirNovo = resolve(process.cwd(), pegar('--dir-novo', 'out/shots'));

if (!url) {
  console.error('uso: node scripts/shot-diff.mjs --capture|--compare <url> [--larguras 360,768,1440] [--tolerancia 0.2]');
  process.exit(2);
}

const destino = modo === 'capture' ? dirBase : dirNovo;
await mkdir(destino, { recursive: true });

const navegador = await chromium.launch();
try {
  for (const w of larguras) {
    const pag = await navegador.newPage({ viewport: { width: w, height: 900 }, deviceScaleFactor: 1 });
    // Cache buster: logo depois de um deploy, sem isso o print e da versao anterior.
    const alvo = new URL(url);
    alvo.searchParams.set('_sd', Date.now().toString(36));
    await pag.goto(alvo.toString(), { waitUntil: 'domcontentloaded', timeout: 45000 });
    // networkidle nao serve aqui: o embed do YouTube mantem conexao viva e a pagina nunca
    // fica ociosa, entao esperar por ele trava. domcontentloaded mais o forcar de imagens
    // abaixo ja garante que tudo que aparece no print carregou.
    // O marquee das stacks e o shine metalico sao animacoes infinitas: sem congelar, dois
    // prints do MESMO site diferem e o teste vira moeda.
    await pag.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important}' });

    // O print de pagina inteira rola a tela, e rolar dispara o loading="lazy" das imagens
    // abaixo da dobra. Sem forcar isso ANTES, cada execucao pega um conjunto diferente de
    // imagens ja carregadas: medido, dava 2% de diferenca do site contra ele mesmo em 768px.
    await pag.evaluate(async () => {
      const espera = (ms) => new Promise((r) => setTimeout(r, ms));
      const alturaTotal = document.body.scrollHeight;
      for (let y = 0; y < alturaTotal; y += 600) {
        window.scrollTo(0, y);
        await espera(50);
      }
      window.scrollTo(0, 0);
      // Cada imagem ganha um teto proprio. Sem isso, uma unica imagem que nunca dispara
      // load nem error (iframe de terceiro, request abortado) trava o script para sempre,
      // que foi o que aconteceu na primeira versao.
      await Promise.all(
        [...document.images]
          .filter((img) => !img.complete)
          .map((img) => Promise.race([
            new Promise((r) => { img.onload = img.onerror = r; }),
            espera(3000),
          ])),
      );
    });
    await pag.waitForTimeout(800);
    await pag.screenshot({ path: resolve(destino, `${w}.png`), fullPage: true });
    console.log(`  ${w}px -> ${w}.png`);
    await pag.close();
  }
} finally {
  await navegador.close();
}

if (modo === 'capture') {
  console.log(`baseline visual gravado em ${destino}`);
  process.exit(0);
}

// Comparacao. pngjs le o PNG cru; a diferenca e contada por pixel com uma folga por canal,
// para nao reprovar por ruido de compressao.
let falhou = false;
for (const w of larguras) {
  const aArq = resolve(dirBase, `${w}.png`);
  const bArq = resolve(dirNovo, `${w}.png`);
  if (!existsSync(aArq)) { console.log(`  ${w}px: SEM BASELINE (${aArq})`); falhou = true; continue; }
  const a = PNG.sync.read(await readFile(aArq));
  const b = PNG.sync.read(await readFile(bArq));
  if (a.width !== b.width || a.height !== b.height) {
    console.log(`  ${w}px: TAMANHO MUDOU ${a.width}x${a.height} -> ${b.width}x${b.height}`);
    falhou = true;
    continue;
  }
  let diferentes = 0;
  for (let i = 0; i < a.data.length; i += 4) {
    if (Math.abs(a.data[i] - b.data[i]) > 8 ||
        Math.abs(a.data[i + 1] - b.data[i + 1]) > 8 ||
        Math.abs(a.data[i + 2] - b.data[i + 2]) > 8) diferentes++;
  }
  const total = a.width * a.height;
  const pct = (diferentes / total) * 100;
  const ok = pct <= tolerancia;
  if (!ok) falhou = true;
  console.log(`  ${w}px: ${pct.toFixed(3)}% de pixels diferentes (tolerancia ${tolerancia}%) ${ok ? 'ok' : 'REPROVOU'}`);
}
console.log(falhou ? '\nREPROVOU' : '\nOK: nenhuma largura passou da tolerancia');
process.exit(falhou ? 1 : 0);
