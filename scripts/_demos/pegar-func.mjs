import { readFile, writeFile } from 'node:fs/promises';
const env = Object.fromEntries((await readFile('.env.local','utf8')).split('\n')
  .filter(l=>l.includes('=')&&!l.trim().startsWith('#'))
  .map(l=>[l.slice(0,l.indexOf('=')).trim(), l.slice(l.indexOf('=')+1).trim()]));
const r = await fetch(`https://api.supabase.com/v1/projects/${env.SUPABASE_PROJECT_REF}/database/query`, {
  method:'POST', headers:{Authorization:`Bearer ${env.SUPABASE_ACCESS_TOKEN}`,'Content-Type':'application/json','User-Agent':'Mozilla/5.0'},
  body: JSON.stringify({ query: `select pg_get_functiondef(p.oid) as def from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='myportifolio' and p.proname='montar_payload_portfolio';` })});
const d = await r.json();
if (!Array.isArray(d)) { console.error(d); process.exit(1); }
await writeFile('out/montar_payload_atual.sql', d[0].def, 'utf8');
console.log('bytes:', d[0].def.length);
console.log('--- trecho do forcamento ---');
const i = d[0].def.indexOf('VibeCoder');
console.log(d[0].def.slice(i-400, i+220));
