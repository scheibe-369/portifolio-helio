// Sobe de novo a imagem da placa de UMA experiencia, pelo editor de verdade, e publica.
//
// POR QUE EXISTE: o pipeline de imagem roda no navegador do comprador, no momento do upload, e
// grava um WebP no Storage. Consertar o pipeline nao conserta nenhum arquivo ja gravado: o que
// foi recortado continua recortado, e nao existe original para recuperar. Para provar o
// conserto numa pagina que ja esta no ar, a unica forma honesta e subir de novo.
//
//   node scripts/_demos/refazer-logo.mjs <slug> <indice-da-experiencia> <arquivo>
import path from 'node:path';
import { abrirEditor, esperar } from './base.mjs';

const [slug, indiceStr, arquivo] = process.argv.slice(2);
if (!slug || !arquivo) {
  console.error('uso: node scripts/_demos/refazer-logo.mjs <slug> <indice> <arquivo>');
  process.exit(2);
}
const indice = Number(indiceStr || 0);
const G = '#ed-gaveta';

const { pagina, navegador } = await abrirEditor(slug, { headless: true });
console.log(`editor aberto para ${slug}`);

await pagina.click('[data-abrir="experiencias"]');
await esperar(1500);

const itens = pagina.locator(`${G} [data-editar]`);
const n = await itens.count();
console.log(`${n} experiencias na lista`);
if (!n) { await navegador.close(); throw new Error('nenhuma experiencia'); }

await itens.nth(indice).click();
await esperar(1500);
await pagina.evaluate(() => document.querySelectorAll('#ed-gaveta details').forEach((d) => { d.open = true; }));
await esperar(400);

// O QUE SE ESPERA E A MUDANCA, e nao a presenca. A primeira versao deste script leu
// `naturalWidth` depois do upload, achou um numero, e declarou sucesso: era a imagem ANTIGA,
// que ja estava na tela desde antes. O sinal de que o upload terminou e o `src` da previa ser
// OUTRO, porque o nome do arquivo carrega o hash do conteudo.
const previa = () => pagina.evaluate(() => {
  const campo = document.querySelector('#ed-gaveta [data-campo="logo_path"], #ed-gaveta [data-campo="logo"]');
  const img = campo?.querySelector('.ed-drop-previa');
  return {
    src: img?.src || '',
    dim: img?.naturalWidth ? `${img.naturalWidth}x${img.naturalHeight}` : '',
    erro: campo?.querySelector('[data-erro]')?.textContent?.trim() || '',
  };
});
const antes = await previa();
console.log('placa antes:', antes.dim, antes.src.split('/').pop());

const inp = pagina.locator(`${G} [data-arquivo="logo"]`).first();
if (!(await inp.count())) { await navegador.close(); throw new Error('campo de arquivo "logo" nao existe'); }
await inp.setInputFiles(path.resolve(arquivo));

let depois = antes;
for (let i = 0; i < 60; i++) {
  await esperar(500);
  depois = await previa();
  if (depois.erro && !/convertendo|enviando/i.test(depois.erro)) { console.log('erro no upload:', depois.erro); break; }
  if (depois.src && depois.src !== antes.src && depois.dim) break;
}
console.log('placa depois:', depois.dim, depois.src.split('/').pop());
if (depois.src === antes.src) { await navegador.close(); throw new Error('a previa nao mudou: o upload nao aconteceu'); }

await pagina.evaluate(() => document.querySelectorAll('#ed-gaveta details').forEach((d) => { d.open = true; }));
await pagina.click('#ed-form-salvar');
await esperar(3000);
await pagina.keyboard.press('Escape');
await esperar(800);

await pagina.click('[data-abrir="publicar"]');
await esperar(1500);
const publicar = pagina.locator(`${G} [data-publicar]`).first();
if (await publicar.count()) {
  await publicar.click();
  await esperar(6000);
  console.log('publicado');
} else {
  console.log('botao de publicar nao encontrado');
}

await navegador.close();
