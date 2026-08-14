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

// O ctx e montado aqui, igual o main.js faz no navegador, mas sem tocar em DOM: e o
// mesmo render, e e isso que prova que ele roda fora do browser (o pre requisito do SSR).
const { renderPortfolioPage } = await import('../src/app/portfolioPage.js');
const { profile } = await import('../src/modules/profile/data/profile.data.js');
const { projects, projectGroups, FILTER_GROUPS } = await import('../src/modules/projects/data/projects.data.js');
const { stacks } = await import('../src/modules/stacks/data/stacks.data.js');
const { experience } = await import('../src/modules/experience/data/experience.data.js');

await mkdir(destino, { recursive: true });

for (const lang of ['pt', 'en']) {
  const ctx = {
    lang,
    portfolio: { profile, projects, stacks, experience, projectGroups, filterGroups: FILTER_GROUPS },
    slug: 'helio',
    flags: { hasCustom: false, englishEnabled: true },
    isPreview: false,
  };
  const html = renderPortfolioPage(ctx);
  const arquivo = resolve(destino, `${lang}.html`);
  await writeFile(arquivo, html, 'utf8');
  console.log(`${lang}: ${html.length} bytes -> ${arquivo}`);
}
