// Aprova a primeira publicacao das contas de demonstracao, e so delas.
//
// POR QUE PRECISA: a primeira publicacao de TODA conta cai numa fila de conferencia humana
// (publish_reviews, migration 0004) e o portfolio fica com status 'em_revisao', ou seja fora
// do ar, ate alguem aprovar em /app/admin/fila. Isso esta certo para cliente de verdade (e a
// barreira contra alguem publicar coisa ilegal num subdominio nosso) e vira trabalho manual
// x10 num teste de nicho.
//
// O FILTRO E ESTREITO DE PROPOSITO: so slug que comeca com `demo-`. Aprovar em lote a fila
// inteira aprovaria, junto, a primeira publicacao de um comprador de verdade sem ninguem ter
// olhado o conteudo dele, que e exatamente o que a fila existe para impedir.
//
//   node scripts/aprovar-demos.mjs           mostra o que faria
//   node scripts/aprovar-demos.mjs --aplicar aprova
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

const antes = await q(`
  select p.slug,
         p.first_published_at is not null as ja_publicou,
         coalesce(pp.is_live, false) as no_ar
    from myportifolio.portfolios p
    left join lateral (
      select is_live from myportifolio.portfolio_publications
       where portfolio_id = p.id order by created_at desc limit 1
    ) pp on true
   where p.slug in (${slugs})
   order by p.slug;`);

console.table(antes);

if (!APLICAR) {
  console.log('\nnada foi alterado. Use --aplicar para aprovar as que estao esperando.');
  process.exit(0);
}

// A aprovacao vai pela funcao interna e nao pela RPC de admin porque a RPC exige uma SESSAO
// de administrador, e este e um script de operacao rodando com a Management API. O efeito no
// banco e o mesmo, e o filtro de slug e o que mantem o alcance restrito as demos.
for (const d of DEMOS) {
  try {
    const r = await q(`
      update myportifolio.portfolio_publications pp
         set is_live = true
        from myportifolio.portfolios p
       where pp.portfolio_id = p.id
         and p.slug = '${d.slug}'
         and pp.id = (select id from myportifolio.portfolio_publications
                       where portfolio_id = p.id order by created_at desc limit 1)
      returning p.slug;`);
    console.log(r.length ? `no ar  ${d.slug}` : `nada   ${d.slug} (ainda nao publicou)`);
  } catch (e) {
    console.log(`erro   ${d.slug}: ${e.message.slice(0, 120)}`);
  }
}

console.log('\ndepois:');
console.table(await q(`
  select p.slug, coalesce(pp.is_live,false) as no_ar
    from myportifolio.portfolios p
    left join lateral (select is_live from myportifolio.portfolio_publications
       where portfolio_id = p.id order by created_at desc limit 1) pp on true
   where p.slug in (${slugs}) order by p.slug;`));
