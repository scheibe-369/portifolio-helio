// Publica o portfolio do Helio: monta o payload e vira a publicacao que esta no ar.
//
// POR QUE ISSO E UM PASSO SEPARADO DO SEED: seed-helio.mjs escreve nas TABELAS
// (portfolios, portfolio_projects, portfolio_experiences), e o Worker nao le tabela, ele le
// a linha is_live de portfolio_publications. Sem este passo, o banco fica com o case novo e
// o site continua servindo o payload antigo, sem erro nenhum em lugar nenhum. Ja aconteceu.
//
// POR QUE publicar_interno E NAO publish_portfolio: a RPC publica exige auth.uid() do dono,
// e aqui nao existe sessao de navegador. publicar_interno nao verifica nada de proposito
// (quem chama e responsavel pela autorizacao) e por isso e revogada de anon e authenticated:
// so alcanca por dentro, pela API de gerenciamento, que e o mesmo caminho do seed.
//
// Ela e idempotente por content_hash: rodar duas vezes com o mesmo conteudo NAO cria versao
// nova, porque versao nova joga fora o documento ja aquecido na borda.
//
//   node scripts/publicar-helio.mjs            publica e mostra antes/depois
//   node scripts/publicar-helio.mjs --conferir  so mostra o que esta no ar, nao escreve
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const SLUG = 'helio';
const SO_CONFERIR = process.argv.slice(2).includes('--conferir');

const env = Object.fromEntries(
  (await readFile(resolve(process.cwd(), '.env.local'), 'utf8'))
    .split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
);

// User-Agent de navegador: a API fica atras da Cloudflare, que devolve 403 para script.
async function sql(query) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${env.SUPABASE_PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0',
    },
    body: JSON.stringify({ query }),
  });
  const t = await r.text();
  let d;
  try { d = JSON.parse(t); } catch { throw new Error('resposta nao-json: ' + t.slice(0, 200)); }
  if (!Array.isArray(d)) throw new Error(d.message || JSON.stringify(d).slice(0, 300));
  return d;
}

const lit = (v) => `'${String(v).replace(/'/g, "''")}'`;

// O que o Worker serve hoje. A contagem de projetos e os dois primeiros slugs da segunda
// fileira sao o suficiente para ver, de fora, se a publicacao pegou a ordem certa.
const noAr = (id) => `
  select version, content_hash, published_at,
         jsonb_array_length(payload->'projects') as projetos,
         payload->'projects'->0->>'slug'  as pos1,
         payload->'projects'->4->>'slug'  as pos5,
         payload->'projects'->5->>'slug'  as pos6
  from myportifolio.portfolio_publications
  where portfolio_id = ${lit(id)} and is_live`;

const mostrar = (rotulo, linha) =>
  console.log(
    linha
      ? `${rotulo}: v${linha.version} · ${linha.projetos} projetos · hash ${String(linha.content_hash).slice(0, 8)} · ${linha.pos1} … ${linha.pos5} | ${linha.pos6}`
      : `${rotulo}: nada no ar`,
  );

const [pf] = await sql(`select id from myportifolio.portfolios where slug = ${lit(SLUG)}`);
if (!pf) {
  console.error(`nao existe portfolio com slug ${SLUG}. Rode scripts/seed-helio.mjs --apply antes.`);
  process.exit(1);
}

const [antes] = await sql(noAr(pf.id));
mostrar('antes ', antes);

if (SO_CONFERIR) {
  console.log('\n(--conferir: nada foi escrito)');
  process.exit(0);
}

const [{ r }] = await sql(`select myportifolio.publicar_interno(${lit(pf.id)}) as r`);
const [depois] = await sql(noAr(pf.id));
mostrar('depois', depois);

// A RPC devolve os dados da publicacao (version, content_hash, published_at). O campo
// 'status' NAO vem daqui: quem acrescenta ele e publish_portfolio, que e a porta do editor.
console.log(`\nretorno: ${JSON.stringify(r)}`);
if (antes && depois && antes.content_hash === depois.content_hash) {
  console.log('mesmo content_hash: o payload nao mudou, nenhuma versao nova foi criada.');
}
