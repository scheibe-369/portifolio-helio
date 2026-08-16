// Apaga os portfolios de demonstracao e as contas deles.
//
// POR QUE EXISTE: as dez demos moram em PRODUCAO, porque nao existe ambiente de teste com
// subdominio curinga. Teste que fica para sempre no dominio comercial deixa de ser teste e
// vira sujeira: ocupa slug, aparece em contagem, e um dia alguem olha `demo-chef` e nao sabe
// mais se e cliente.
//
// O ALCANCE E ESTREITO E CONFERIDO DUAS VEZES: so slug que comeca com `demo-` E que esteja na
// lista de scripts/demos.config.mjs. As duas condicoes juntas, e nao uma ou outra, porque
// este script apaga dado de producao e a unica protecao contra um `like 'demo-%'` mal escrito
// e a lista fechada ao lado.
//
//   node scripts/limpar-demos.mjs            mostra o que apagaria
//   node scripts/limpar-demos.mjs --aplicar  apaga
import { readFile } from 'node:fs/promises';
import { DEMOS } from './demos.config.mjs';

const APLICAR = process.argv.includes('--aplicar');
const env = Object.fromEntries(
  (await readFile('.env.local', 'utf8')).split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
);

const q = async (query) => {
  const r = await fetch(`https://api.supabase.com/v1/projects/${env.SUPABASE_PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}`, 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' },
    body: JSON.stringify({ query }),
  });
  const d = await r.json();
  if (!Array.isArray(d)) throw new Error(d.message || JSON.stringify(d).slice(0, 300));
  return d;
};

const slugs = DEMOS.map((d) => `'${d.slug}'`).join(', ');
const emails = DEMOS.map((d) => `'${d.email}'`).join(', ');

console.table(await q(`
  select p.slug, p.owner_email,
         (select count(*) from myportifolio.portfolio_projects x where x.portfolio_id = p.id) as trabalhos,
         (select count(*) from myportifolio.portfolio_experiences x where x.portfolio_id = p.id) as experiencias
    from myportifolio.portfolios p
   where p.slug in (${slugs}) order by p.slug;`));

if (!APLICAR) {
  console.log('\nnada foi apagado. Use --aplicar para apagar de verdade.');
  process.exit(0);
}

// A ordem importa: publicacoes e fila apontam para o portfolio, e o portfolio aponta para a
// conta. `on delete cascade` cobre projetos, experiencias e midia, mas a fila e o historico de
// slug sao apagados na mao para nao sobrar linha orfa apontando para um id que ja morreu.
const passos = [
  ['fila de revisao', `delete from myportifolio.publish_reviews r using myportifolio.portfolios p
                        where r.portfolio_id = p.id and p.slug in (${slugs});`],
  ['publicacoes',     `delete from myportifolio.portfolio_publications pp using myportifolio.portfolios p
                        where pp.portfolio_id = p.id and p.slug in (${slugs});`],
  ['historico slug',  `delete from myportifolio.portfolio_slug_history h using myportifolio.portfolios p
                        where h.portfolio_id = p.id and p.slug in (${slugs});`],
  ['portfolios',      `delete from myportifolio.portfolios where slug in (${slugs});`],
  ['acesso',          `delete from myportifolio.member_access where email in (${emails});`],
];

for (const [nome, sql] of passos) {
  try {
    await q(sql);
    console.log(`apagado  ${nome}`);
  } catch (e) {
    console.log(`erro     ${nome}: ${e.message.slice(0, 160)}`);
  }
}

console.log('\nsobrou:');
console.table(await q(`select slug from myportifolio.portfolios where slug in (${slugs});`));
console.log('As contas do Auth (auth.users) NAO sao apagadas por aqui: elas nao atrapalham,');
console.log('e apagar usuario e a unica operacao desta lista que nao tem volta.');
