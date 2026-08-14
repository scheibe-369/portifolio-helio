// Roda DEPOIS do `vite build`. Faz duas coisas, e as duas sao pre requisito do Worker.
//
// 1. Extrai `dist/index.html` e `dist/app.html` para `worker/shell.gen.js`, com as tags de
//    SEO do Helio trocadas por um marcador. O Worker preenche esse marcador com o <head> do
//    tenant que esta sendo servido. Sem isso, o portfolio de todo comprador sairia com o
//    titulo, a descricao e a og:image do Helio, e o preview de link no WhatsApp mostraria a
//    foto do Helio no lugar da dele, que e metade do motivo de alguem comprar isto.
//
// 2. APAGA os dois .html de dentro de `dist/`. Isso parece agressivo e nao e: com
//    `run_worker_first: false`, o binding de Static Assets responde ANTES do Worker para
//    qualquer caminho que exista como arquivo. Se `index.html` continuar la, uma visita a
//    `fulano.myportifolio.com.br/` recebe o shell cru do Helio, sem dado nenhum, em
//    silencio, sem erro em log nenhum. E o tipo de defeito que so aparece quando um cliente
//    reclama.
import { readFile, writeFile, unlink, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const DIST = resolve(process.cwd(), 'dist');
const SAIDA = resolve(process.cwd(), 'worker/shell.gen.js');

// As tags que sao do TENANT e nao do shell. Elas saem do shell e viram responsabilidade do
// Worker, que as monta por portfolio a cada request.
const TAGS_DO_TENANT = [
  /<title>[\s\S]*?<\/title>\s*/gi,
  /<meta\s+name="description"[^>]*>\s*/gi,
  /<link\s+rel="canonical"[^>]*>\s*/gi,
  /<meta\s+property="og:[^"]*"[^>]*>\s*/gi,
  /<meta\s+name="twitter:[^"]*"[^>]*>\s*/gi,
  /<link\s+rel="preload"\s+as="image"[^>]*>\s*/gi,
];

const MARCADOR = '<!--HEAD_TENANT-->';

async function preparar(arquivo, { limpar }) {
  const caminho = resolve(DIST, arquivo);
  if (!existsSync(caminho)) throw new Error(`${arquivo} nao existe em dist/. Rodou o build antes?`);
  let html = await readFile(caminho, 'utf8');

  if (limpar) {
    for (const re of TAGS_DO_TENANT) html = html.replace(re, '');
    if (!html.includes(MARCADOR)) html = html.replace('</head>', `${MARCADOR}</head>`);
  }
  return html;
}

const shellPublico = await preparar('index.html', { limpar: true });
const shellEditor = await preparar('app.html', { limpar: false });

// O caminho com hash do bundle publico. O Worker nao precisa dele para servir (o HTML ja
// referencia), mas precisa para poder pre-carregar e para o critério de fronteira conferir
// que o shell e o do build atual, e nao um shell velho de um deploy anterior.
const m = shellPublico.match(/<script[^>]+src="(\/assets\/[^"]+\.js)"/);
const assetEntry = m ? m[1] : null;
if (!assetEntry) throw new Error('nao achei o <script> do bundle publico no shell');

const conteudo = `// GERADO por scripts/preparar-shell.mjs. NAO EDITE A MAO.
// Regenerado a cada build: o nome dos assets tem hash de conteudo e muda a cada mudanca.
//
// SHELL_PUBLICO ja vem SEM as tags de SEO do Helio, com o marcador HEAD_TENANT no lugar.
// Quem preenche e worker/render/pagina.js, por tenant, a cada request.
export const MARCADOR_HEAD = ${JSON.stringify(MARCADOR)};
export const ASSET_ENTRY = ${JSON.stringify(assetEntry)};
export const SHELL_PUBLICO = ${JSON.stringify(shellPublico)};
export const SHELL_EDITOR = ${JSON.stringify(shellEditor)};
`;

await mkdir(resolve(process.cwd(), 'worker'), { recursive: true });
await writeFile(SAIDA, conteudo, 'utf8');

// So agora os .html saem do dist. Se algo acima falhar, eles continuam la e o deploy
// anterior segue servivel.
for (const f of ['index.html', 'app.html']) {
  const c = resolve(DIST, f);
  if (existsSync(c)) await unlink(c);
}

const sobrando = [];
for (const f of ['index.html', 'app.html']) if (existsSync(resolve(DIST, f))) sobrando.push(f);

console.log(`shell publico: ${shellPublico.length} bytes (sem as tags do tenant)`);
console.log(`shell editor:  ${shellEditor.length} bytes`);
console.log(`asset entry:   ${assetEntry}`);
console.log(`worker/shell.gen.js escrito`);
console.log(sobrando.length ? `ERRO: sobrou .html em dist/: ${sobrando}` : 'dist/ nao contem nenhum .html, como deve ser');
process.exit(sobrando.length ? 1 : 0);
