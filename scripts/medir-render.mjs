// Mede quanto custa renderizar a pagina, e grava o numero em tasks/_plano/medicoes.md.
//
// POR QUE ISSO EXISTE: a partir da fase 1 este mesmo render roda dentro de um Worker, que
// tem teto de CPU por requisicao. Se o render engordar sem ninguem medir, o estouro aparece
// como erro de plataforma em producao, no subdominio de um cliente pagante, e nao no build.
//
// Este numero e medido em NODE, nao no isolate do Worker, entao ele nao prova que cabe no
// teto: ele serve como DETECTOR DE REGRESSAO. A prova de que cabe e a segunda metade do
// criterio (500 requisicoes em miss forcado contra o Worker publicado), que so existe a
// partir da fase 1.
//
//   node scripts/medir-render.mjs
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const ARQ = resolve(process.cwd(), 'tasks/_plano/medicoes.md');
const AQUECIMENTO = 50;
const AMOSTRAS = 300;

const { renderPortfolioPage } = await import('../src/app/portfolioPage.js');
const { profile } = await import('../src/modules/profile/data/profile.data.js');
const { projects, projectGroups, FILTER_GROUPS } = await import('../src/modules/projects/data/projects.data.js');
const { stacks } = await import('../src/modules/stacks/data/stacks.data.js');
const { experience } = await import('../src/modules/experience/data/experience.data.js');

const ctx = (lang) => ({
  lang,
  portfolio: { profile, projects, stacks, experience, projectGroups, filterGroups: FILTER_GROUPS },
  slug: 'helio',
  flags: { hasCustom: false, englishEnabled: true },
  isPreview: false,
});

function medir(lang) {
  const c = ctx(lang);
  for (let i = 0; i < AQUECIMENTO; i++) renderPortfolioPage(c);
  const tempos = [];
  let bytes = 0;
  for (let i = 0; i < AMOSTRAS; i++) {
    const t0 = process.hrtime.bigint();
    const html = renderPortfolioPage(c);
    const t1 = process.hrtime.bigint();
    tempos.push(Number(t1 - t0) / 1e6);
    bytes = html.length;
  }
  tempos.sort((a, b) => a - b);
  return {
    mediana: tempos[Math.floor(tempos.length / 2)],
    p95: tempos[Math.floor(tempos.length * 0.95)],
    bytes,
  };
}

const pt = medir('pt');
const en = medir('en');

// Os tetos vem do criterio 12 da secao 2 do plano. Sao de regressao, nao de plataforma.
const TETO_MEDIANA = 6;
const TETO_P95 = 12;
const pior = Math.max(pt.mediana, en.mediana);
const piorP95 = Math.max(pt.p95, en.p95);
const passou = pior < TETO_MEDIANA && piorP95 < TETO_P95;

const linha = (n, m) => `| ${n} | ${m.mediana.toFixed(3)} ms | ${m.p95.toFixed(3)} ms | ${m.bytes} |`;
const bloco = `
### Render da página, medido em Node (${new Date().toISOString().slice(0, 10)})

${AQUECIMENTO} execuções de aquecimento e ${AMOSTRAS} de medição, por idioma, sobre o
portfólio do Helio (${projects.length} projetos, ${experience.length} experiências).

| Idioma | Mediana | p95 | Bytes de HTML |
|---|---|---|---|
${linha('PT', pt)}
${linha('EN', en)}

Tetos de regressão: mediana abaixo de ${TETO_MEDIANA} ms e p95 abaixo de ${TETO_P95} ms.
Resultado: **${passou ? 'dentro do orçamento' : 'ESTOUROU'}**.

Este número é de Node, não do isolate do Worker, então ele **não** prova que cabe no teto de
CPU da plataforma. Ele serve para detectar regressão. A prova real é a segunda metade do
critério 12: 500 requisições em miss forçado contra o Worker publicado, todas devolvendo o
nosso corpo. Isso só existe a partir da fase 1.
`;

const atual = await readFile(ARQ, 'utf8');
await writeFile(ARQ, atual.replace(/\n### Render da página[\s\S]*?(?=\n### |$)/, '\n').trimEnd() + '\n' + bloco, 'utf8');

console.log(`PT  mediana ${pt.mediana.toFixed(3)} ms  p95 ${pt.p95.toFixed(3)} ms  ${pt.bytes} bytes`);
console.log(`EN  mediana ${en.mediana.toFixed(3)} ms  p95 ${en.p95.toFixed(3)} ms  ${en.bytes} bytes`);
console.log(passou ? 'OK: dentro do orcamento' : 'REPROVOU: estourou o teto de regressao');
process.exit(passou ? 0 : 1);
