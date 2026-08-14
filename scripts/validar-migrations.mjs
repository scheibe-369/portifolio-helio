// Roda TODAS as migrations encadeadas dentro de uma transacao e da rollback.
//
// POR QUE ASSIM, e nao uma por uma: 0002 depende de tabela criada em 0001, e 0007 substitui
// funcao definida em 0004. Validar isolado nao prova que a sequencia funciona, que e o que
// vai acontecer no banco de verdade.
//
// POR QUE ROLLBACK: este banco e COMPARTILHADO com o AI Block, que tem clientes pagantes.
// DDL no Postgres e transacional, entao da para executar tudo, ver se passa, e desfazer sem
// deixar rastro. Nao existe motivo para descobrir erro de sintaxe aplicando de verdade.
//
//   node scripts/validar-migrations.mjs            valida e desfaz
//   node scripts/validar-migrations.mjs --aplicar  aplica DE VERDADE (commit)
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const APLICAR = process.argv.includes('--aplicar');
const DIR = resolve(process.cwd(), 'supabase/migrations');

const env = Object.fromEntries(
  (await readFile(resolve(process.cwd(), '.env.local'), 'utf8'))
    .split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
);
const TOKEN = env.SUPABASE_ACCESS_TOKEN;
const REF = env.SUPABASE_PROJECT_REF;
if (!TOKEN || !REF) {
  console.error('faltam SUPABASE_ACCESS_TOKEN ou SUPABASE_PROJECT_REF em .env.local');
  process.exit(2);
}

const arquivos = (await readdir(DIR)).filter((f) => f.endsWith('.sql')).sort();
const partes = [];
for (const f of arquivos) partes.push(`-- ===== ${f} =====\n` + (await readFile(resolve(DIR, f), 'utf8')));
const corpo = partes.join('\n\n');
const sql = APLICAR ? corpo : `begin;\n${corpo}\nrollback;`;

// A API da Supabase fica atras da Cloudflare, que devolve 403 (codigo 1010) para
// user-agent de script. Um UA de navegador passa.
const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${TOKEN}`,
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
  },
  body: JSON.stringify({ query: sql }),
});

const texto = await r.text();
let d;
try {
  d = JSON.parse(texto);
} catch {
  console.error('resposta nao-json:', texto.slice(0, 300));
  process.exit(1);
}

console.log(`${arquivos.length} migrations, ${corpo.length} caracteres`);
if (Array.isArray(d)) {
  console.log(APLICAR ? 'APLICADAS (commit dado)' : 'OK: rodam encadeadas. Rollback dado, nada gravado.');
  process.exit(0);
}

// Erro: mostra a linha exata do SQL concatenado e de qual arquivo ela veio.
const msg = d.message || JSON.stringify(d);
console.error('REPROVOU:', msg.slice(0, 400));
const m = msg.match(/LINE (\d+)/);
if (m) {
  const n = Number(m[1]);
  const linhas = sql.split('\n');
  let arquivoAtual = '(?)';
  for (let i = 0; i < Math.min(n, linhas.length); i++) {
    const mm = linhas[i].match(/^-- ===== (.+) ===== *$/);
    if (mm) arquivoAtual = mm[1];
  }
  console.error(`\nvem de: ${arquivoAtual}`);
  for (let i = Math.max(0, n - 4); i < Math.min(linhas.length, n + 3); i++) {
    console.error(`${i + 1 === n ? '>>' : '  '} ${i + 1}: ${linhas[i]}`);
  }
}
process.exit(1);
