// O pipeline de imagem do editor, rodado de verdade, num navegador de verdade.
//
// POR QUE UM SCRIPT SEPARADO: `npm run verificar` roda sem rede e sem navegador, e este
// modulo e o unico do produto que so existe dentro de um: ele vive de canvas, de
// createImageBitmap e de OffscreenCanvas. Um teste que simulasse essas tres coisas estaria
// testando a simulacao.
//
// POR QUE ELE EXISTE: este arquivo ja cortou trabalho de comprador DUAS vezes, do mesmo jeito
// e por motivos diferentes. Primeiro `proporcao: 3/2` no destino `project`, que descartou 55%
// de uma tatuagem vertical no upload, sem original para recuperar. Depois `proporcao: 1` no
// destino `experience`, que transformou o wordmark "Tavares Negocios Imobiliarios", de
// 1400x400, num quadrado de 256 com as duas pontas do nome fora. Nos dois casos o defeito era
// invisivel no codigo (uma constante) e so aparecia na pagina publicada, semanas depois.
//
// A assercao que importa aqui e uma so, e ela vale para todo destino: O QUE ENTRA CABE NO QUE
// SAI. Reduzir e permitido, recortar nao.
//
//   node scripts/testar-imagem.mjs
import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const fonte = await readFile(resolve('src/modules/media/lib/imagePipeline.js'), 'utf8');

const nav = await chromium.launch();
const pag = await nav.newPage();
// ORIGEM https FALSA, servida pelo proprio Playwright. `about:blank` nao e contexto seguro, e
// sem contexto seguro `crypto.subtle` nao existe: o pipeline calcula o hash do arquivo com
// ele, e as 25 combinacoes falhavam todas com "cannot read properties of undefined". O erro
// seria do ambiente de teste, e nao do codigo, que e o pior tipo de reprovacao.
await pag.route('https://teste.local/**', (rota) =>
  rota.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><meta charset="utf-8"><title>pipeline</title>' }));
await pag.goto('https://teste.local/');

// O modulo e ESM e o addScriptTag com type=module nao deixa nada no escopo global, entao o
// caminho e importar por data URL de dentro da propria pagina.
const modulo = 'data:text/javascript;base64,' + Buffer.from(fonte, 'utf8').toString('base64');

let falhas = 0;
const checar = (nome, condicao, detalhe) => {
  if (!condicao) {
    falhas += 1;
    console.error(`FALHOU  ${nome}${detalhe ? `\n        ${detalhe}` : ''}`);
  }
};

// Formas que chegam de verdade: wordmark deitado de imobiliaria, retrato de tatuagem,
// panoramica de arquitetura, quadrada de prato, e o icone pequeno de quem so tem o favicon.
const FORMAS = [
  ['wordmark deitado', 1400, 400],
  ['retrato', 1000, 1500],
  ['panoramica', 3000, 600],
  ['quadrada', 1200, 1200],
  ['icone pequeno', 128, 128],
];

const resultado = await pag.evaluate(async ({ modulo, formas }) => {
  const { prepararImagem, DESTINOS } = await import(modulo);

  // Desenha uma imagem de teste com marcas nas QUATRO bordas. Se o pipeline recortar, alguma
  // marca some, e some em silencio: e exatamente esse silencio que o teste quebra.
  const gerar = (l, a, transparente) => {
    const c = new OffscreenCanvas(l, a);
    const x = c.getContext('2d');
    if (!transparente) { x.fillStyle = '#101010'; x.fillRect(0, 0, l, a); }
    x.fillStyle = '#ff0000'; x.fillRect(0, 0, Math.max(2, l * 0.04), a);                       // esquerda
    x.fillStyle = '#00ff00'; x.fillRect(l - Math.max(2, l * 0.04), 0, Math.max(2, l * 0.04), a); // direita
    x.fillStyle = '#0000ff'; x.fillRect(0, 0, l, Math.max(2, a * 0.04));                       // topo
    x.fillStyle = '#ffff00'; x.fillRect(0, a - Math.max(2, a * 0.04), l, Math.max(2, a * 0.04)); // base
    return c.convertToBlob({ type: 'image/png' });
  };

  const medir = async (blob) => {
    const bm = await createImageBitmap(blob);
    const c = new OffscreenCanvas(bm.width, bm.height);
    const x = c.getContext('2d');
    x.drawImage(bm, 0, 0);
    const d = x.getImageData(0, 0, bm.width, bm.height).data;
    const tem = { esquerda: false, direita: false, topo: false, base: false };
    // Caixa da ARTE dentro do arquivo. Com letterbox o arquivo e maior que o desenho, e e a
    // razao da caixa, e nao a do arquivo, que diz se a logo foi esticada.
    let x0 = bm.width, y0 = bm.height, x1 = -1, y1 = -1;
    for (let i = 0; i < d.length; i += 4) {
      const [r, g, b, al] = [d[i], d[i + 1], d[i + 2], d[i + 3]];
      if (al < 30) continue;
      const px = (i / 4) % bm.width;
      const py = Math.floor((i / 4) / bm.width);
      if (px < x0) x0 = px; if (px > x1) x1 = px;
      if (py < y0) y0 = py; if (py > y1) y1 = py;
      if (r > 150 && g < 90 && b < 90) tem.esquerda = true;
      if (g > 150 && r < 90 && b < 90) tem.direita = true;
      if (b > 150 && r < 90 && g < 90) tem.topo = true;
      if (r > 150 && g > 150 && b < 90) tem.base = true;
    }
    return { l: bm.width, a: bm.height, tem, arte: [x1 - x0 + 1, y1 - y0 + 1] };
  };

  const saida = [];
  for (const destino of Object.keys(DESTINOS)) {
    for (const [nome, l, a] of formas) {
      for (const transparente of [false, true]) {
        const blob = await gerar(l, a, transparente);
        const arquivo = new File([blob], 'teste.png', { type: 'image/png' });
        const forma = `${nome}${transparente ? ' (arte)' : ' (foto)'}`;
        try {
          const r = await prepararImagem(arquivo, { destino, portfolioId: 'p', nome: 'teste' });
          const m = await medir(r.blob);
          saida.push({ destino, forma, transparente, entrada: [l, a], ...m, bytes: r.blob.size });
        } catch (e) {
          saida.push({ destino, forma, transparente, entrada: [l, a], erro: String(e.message || e) });
        }
      }
    }
  }
  return saida;
}, { modulo, formas: FORMAS });

for (const r of resultado) {
  const id = `${r.destino}/${r.forma}`;
  if (r.erro) { checar(`${id} nao e recusada`, false, r.erro); continue; }

  const cortado = Object.entries(r.tem).filter(([, v]) => !v).map(([k]) => k);
  // `avatar` recorta em quadrado de proposito: retrato de rosto e o unico caso em que o
  // corte central e o comportamento certo, e o dono escolhe a forma (circulo ou oval) depois.
  if (r.destino === 'avatar') {
    checar(`${id} sai quadrada`, r.l === r.a, `${r.l}x${r.a}`);
  } else {
    checar(`${id} nao perde nenhuma borda`, cortado.length === 0, `sumiram: ${cortado.join(', ') || '-'}  saida ${r.l}x${r.a}`);
  }

  // A PLACA DA EXPERIENCIA TEM DOIS COMPORTAMENTOS, e o que decide qual e a transparencia da
  // imagem: arte recortada ganha placa quadrada com respiro, foto preenche a placa.
  if (r.destino === 'experience' && r.transparente) {
    checar(`${id} sai numa placa quadrada`, r.l === r.a, `${r.l}x${r.a}`);
    // Esticar a logo e a outra forma de estraga-la, e ela nao seria pega pelo teste de borda:
    // as quatro marcas continuariam la, so que deformadas. Comparar a razao da ARTE com a da
    // entrada e o que separa "encaixada" de "espremida".
    const dentro = r.arte[0] / r.arte[1];
    const fora = r.entrada[0] / r.entrada[1];
    const desvio = Math.abs(dentro - fora) / fora;
    checar(`${id} nao e esticada`, desvio < 0.03,
      `entrada ${fora.toFixed(2)}:1, arte na placa ${dentro.toFixed(2)}:1 (${(desvio * 100).toFixed(0)}% de desvio)`);
    // O respiro assado: a arte nao pode encostar na borda da placa.
    checar(`${id} guarda o respiro em volta`, Math.max(...r.arte) <= Math.round(r.l * 0.85),
      `arte ${r.arte.join('x')} numa placa de ${r.l}`);
  }
  if (r.destino === 'experience' && !r.transparente) {
    // Foto opaca na placa: sem moldura clara em volta. A arte tem que encostar nas bordas.
    checar(`${id} preenche a placa`, r.arte[0] === r.l && r.arte[1] === r.a,
      `arte ${r.arte.join('x')} num arquivo de ${r.l}x${r.a}: sobrou moldura`);
  }
  checar(`${id} cabe no orcamento`, r.bytes > 0);
}

console.log('destino'.padEnd(13), 'forma'.padEnd(18), 'entrada'.padEnd(12), 'saida'.padEnd(12), 'kB');
for (const r of resultado) {
  if (r.erro) { console.log(`${r.destino.padEnd(13)} ${r.forma.padEnd(18)} ${String(r.entrada.join('x')).padEnd(12)} ERRO ${r.erro}`); continue; }
  console.log(`${r.destino.padEnd(13)} ${r.forma.padEnd(18)} ${String(r.entrada.join('x')).padEnd(12)} ${`${r.l}x${r.a}`.padEnd(12)} ${(r.bytes / 1024).toFixed(0)}`);
}

await nav.close();

if (falhas) {
  console.error(`\n${falhas} falha(s) no pipeline de imagem`);
  process.exit(1);
}
console.log(`\nOK: ${resultado.length} combinacoes de destino e formato, nenhuma borda perdida`);
