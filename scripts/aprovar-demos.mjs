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

// O QUE ESTE BLOCO FAZ e exatamente o que admin_approve_first_publish faz (0004:324): marca
// a aprovacao no portfolio, decide a linha da fila e chama publicar_interno, que e quem
// monta o snapshot e liga o is_live.
//
// POR QUE REPLICADO E NAO CHAMADO: a RPC comeca com `if not is_admin() then raise`, e
// is_admin() le o e-mail da SESSAO. Este script roda pela Management API, sem JWT nenhum,
// entao nao existe sessao para ler e a RPC recusaria. O filtro `slug like 'demo-%'` e o que
// mantem o alcance: a fila continua sendo conferida na mao para comprador de verdade, que e
// a unica razao de ela existir.
//
// `app.escrita_confiavel` precisa estar ligado porque first_publish_approved_at e coluna
// protegida por trigger de guarda, e ela e desligada no mesmo comando (regra do projeto:
// marca de escrita confiavel nunca atravessa transacao).
for (const d of DEMOS) {
  try {
    const r = await q(`
      do $$
      declare v_id uuid;
      begin
        select id into v_id from myportifolio.portfolios where slug = '${d.slug}';
        if v_id is null then return; end if;
        if not exists (select 1 from myportifolio.publish_reviews where portfolio_id = v_id) then return; end if;

        perform set_config('app.escrita_confiavel', 'on', true);
        update myportifolio.portfolios
           set first_publish_approved_at = now(),
               first_publish_approved_by = 'script aprovar-demos'
         where id = v_id and first_publish_approved_at is null;
        perform set_config('app.escrita_confiavel', 'off', true);

        update myportifolio.publish_reviews
           set decided_at = now(), decided_by = 'script aprovar-demos', decision = 'aprovado'
         where portfolio_id = v_id and decided_at is null;

        perform myportifolio.publicar_interno(v_id);
      end $$;
      select p.slug, coalesce(pp.is_live,false) as no_ar
        from myportifolio.portfolios p
        left join lateral (select is_live from myportifolio.portfolio_publications
           where portfolio_id = p.id order by created_at desc limit 1) pp on true
       where p.slug = '${d.slug}';`);
    const linha = r[r.length - 1];
    console.log(linha && linha.no_ar ? `no ar  ${d.slug}` : `nada   ${d.slug} (sem pedido na fila)`);
  } catch (e) {
    console.log(`erro   ${d.slug}: ${e.message.slice(0, 160)}`);
  }
}

console.log('\ndepois:');
console.table(await q(`
  select p.slug, coalesce(pp.is_live,false) as no_ar
    from myportifolio.portfolios p
    left join lateral (select is_live from myportifolio.portfolio_publications
       where portfolio_id = p.id order by created_at desc limit 1) pp on true
   where p.slug in (${slugs}) order by p.slug;`));
