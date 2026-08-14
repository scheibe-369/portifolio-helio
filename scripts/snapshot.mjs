// Grava o HTML que renderPortfolioPage() produz hoje, nos dois idiomas.
//
// POR QUE ISSO EXISTE: a fase 0 refatora nove componentes para receber os dados por
// parametro em vez de importar. Sem um HTML gravado ANTES, "nao quebrou nada" e opiniao.
// Com ele, o dom-diff.mjs compara e reprova sozinho.
//
// Rodar ANTES de qualquer refatoracao:
//   node scripts/snapshot.mjs                 grava em snapshot/
//   node scripts/snapshot.mjs --saida out     grava em out/ (o lado "depois")
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const args = process.argv.slice(2);
const pegar = (nome, padrao) => {
  const i = args.indexOf(nome);
  return i >= 0 && args[i + 1] ? args[i + 1] : padrao;
};
const destino = resolve(process.cwd(), pegar('--saida', 'snapshot'));

// Import dinamico depois de montar o ambiente: os modulos leem localStorage no topo, e em
// Node ele nao existe. O try/catch do i18n.js ja cai no padrao 'pt', entao nao e preciso
// simular nada, mas a ordem importa e por isso o import nao e estatico.
const { renderPortfolioPage } = await import('../src/app/portfolioPage.js');
const { setLang } = await import('../src/app/i18n.js');

await mkdir(destino, { recursive: true });

for (const lang of ['pt', 'en']) {
  setLang(lang);
  const html = renderPortfolioPage();
  const arquivo = resolve(destino, `${lang}.html`);
  await writeFile(arquivo, html, 'utf8');
  console.log(`${lang}: ${html.length} bytes -> ${arquivo}`);
}
