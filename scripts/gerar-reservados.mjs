// Gera worker/lib/reservados.js a partir de myportifolio.reserved_slugs.
//
// POR QUE ISSO E GERADO E NAO ESCRITO A MAO: a lista canonica e uma so, o seed da migration
// 0002. Duas listas escritas a mao divergem, e a divergencia tem dois lados, os dois ruins.
// Se o banco reservar um rotulo que o Worker nao conhece, o Worker vai procurar um tenant que
// nunca vai existir e responder "este endereco ainda esta livre" em cima de infraestrutura
// nossa (`mail`, `dkim`, `cdn-cgi`). Se o Worker reservar um rotulo que o banco vendeu, um
// comprador pagante recebe 301 para o apex em vez do proprio portfolio.
//
//   node scripts/gerar-reservados.mjs                 le do banco (fonte da verdade)
//   node scripts/gerar-reservados.mjs --da-migration  le do seed de 0002_portfolios.sql
//
// O segundo modo existe porque o Worker precisa compilar ANTES de o banco da fase 1 estar
// migrado, e nao para ser o modo normal: o banco e quem manda depois que ele existe.
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const RAIZ = process.cwd();
const SAIDA = resolve(RAIZ, 'worker/lib/reservados.js');
const MIGRATION = resolve(RAIZ, 'supabase/migrations/0002_portfolios.sql');
const daMigration = process.argv.includes('--da-migration');

// Le .env.local sem dependencia: o arquivo nao e versionado e nao pode virar import.
async function lerEnvLocal() {
  const caminho = resolve(RAIZ, '.env.local');
  if (!existsSync(caminho)) return {};
  const texto = await readFile(caminho, 'utf8');
  const env = {};
  for (const linha of texto.split(/\r?\n/)) {
    const m = linha.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return env;
}

async function doBanco() {
  const env = { ...(await lerEnvLocal()), ...process.env };
  const url = String(env.VITE_SUPABASE_URL || env.SUPABASE_URL || '').replace(/\/+$/, '');
  const chave = env.SUPABASE_SERVICE_ROLE_KEY;
  const schema = env.SUPABASE_SCHEMA || 'myportifolio';
  if (!url || !chave) throw new Error('VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY sao obrigatorios em .env.local');

  // reserved_slugs tem RLS e revoke para anon e authenticated: so a service role le, e ela
  // fica no ambiente de build, nunca no bundle.
  const r = await fetch(`${url}/rest/v1/reserved_slugs?select=slug&order=slug.asc`, {
    headers: {
      apikey: chave,
      authorization: `Bearer ${chave}`,
      'accept-profile': schema,
    },
  });
  if (!r.ok) throw new Error(`PostgREST respondeu ${r.status}: ${await r.text()}`);
  return (await r.json()).map((l) => l.slug);
}

async function daMigrationSql() {
  const sql = await readFile(MIGRATION, 'utf8');
  const i = sql.indexOf('insert into myportifolio.reserved_slugs');
  if (i < 0) throw new Error('nao achei o seed de reserved_slugs em 0002_portfolios.sql');
  const bloco = sql.slice(i, sql.indexOf(';', i));
  return [...bloco.matchAll(/\('([a-z0-9-]+)'\s*,\s*'[^']*'\)/g)].map((m) => m[1]);
}

const bruto = daMigration ? await daMigrationSql() : await doBanco();
const slugs = [...new Set(bruto.map((s) => String(s).toLowerCase().trim()).filter(Boolean))].sort();
if (!slugs.length) throw new Error('lista de reservados vazia, isso nunca e o resultado certo');

const fonte = daMigration ? 'seed de supabase/migrations/0002_portfolios.sql' : 'myportifolio.reserved_slugs (banco)';
const conteudo = `// GERADO por scripts/gerar-reservados.mjs. NAO EDITE A MAO.
// Fonte: ${fonte}.
//
// A lista canonica e o seed de reserved_slugs. Editar este arquivo a mao cria uma segunda
// lista, e as duas divergem: rotulo reservado so aqui tira do ar um comprador pagante, e
// rotulo reservado so no banco faz o Worker oferecer a venda de infraestrutura nossa.
export const RESERVADOS = new Set([
${slugs.map((s) => `  ${JSON.stringify(s)},`).join('\n')}
]);
`;

await writeFile(SAIDA, conteudo, 'utf8');
console.log(`${slugs.length} slugs reservados escritos em worker/lib/reservados.js (fonte: ${fonte})`);
