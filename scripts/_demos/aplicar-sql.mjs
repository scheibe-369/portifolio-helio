import { readFile } from 'node:fs/promises';
const arq = process.argv[2];
const APLICAR = process.argv.includes('--aplicar');
if (!arq) { console.error('uso: node scripts/_demos/aplicar-sql.mjs <arquivo.sql> [--aplicar]'); process.exit(1); }
const env = Object.fromEntries((await readFile('.env.local','utf8')).split('\n')
  .filter(l=>l.includes('=')&&!l.trim().startsWith('#'))
  .map(l=>[l.slice(0,l.indexOf('=')).trim(), l.slice(l.indexOf('=')+1).trim()]));
const corpo = await readFile(arq,'utf8');
const query = APLICAR ? corpo : `begin;\n${corpo}\nrollback;`;
const r = await fetch(`https://api.supabase.com/v1/projects/${env.SUPABASE_PROJECT_REF}/database/query`,{
  method:'POST', headers:{Authorization:`Bearer ${env.SUPABASE_ACCESS_TOKEN}`,'Content-Type':'application/json','User-Agent':'Mozilla/5.0'},
  body: JSON.stringify({ query })});
const t = await r.text();
let d; try{d=JSON.parse(t)}catch{ console.error('nao-json:',t.slice(0,300)); process.exit(1); }
if(!Array.isArray(d)){ console.error('REPROVOU:', (d.message||JSON.stringify(d)).slice(0,500)); process.exit(1); }
console.log(APLICAR ? `APLICADA: ${arq}` : `OK (rollback dado): ${arq}`);
