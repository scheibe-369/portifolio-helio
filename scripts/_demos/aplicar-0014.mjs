import { readFile } from 'node:fs/promises';
const APLICAR = process.argv.includes('--aplicar');
const env = Object.fromEntries((await readFile('.env.local','utf8')).split('\n')
  .filter(l=>l.includes('=')&&!l.trim().startsWith('#'))
  .map(l=>[l.slice(0,l.indexOf('=')).trim(), l.slice(l.indexOf('=')+1).trim()]));
const corpo = await readFile('supabase/migrations/0014_selo_sem_jargao.sql','utf8');
const query = APLICAR ? corpo : `begin;\n${corpo}\nrollback;`;
const r = await fetch(`https://api.supabase.com/v1/projects/${env.SUPABASE_PROJECT_REF}/database/query`, {
  method:'POST', headers:{Authorization:`Bearer ${env.SUPABASE_ACCESS_TOKEN}`,'Content-Type':'application/json','User-Agent':'Mozilla/5.0'},
  body: JSON.stringify({ query })});
const t = await r.text();
let d; try{d=JSON.parse(t)}catch{ console.error('nao-json:',t.slice(0,300)); process.exit(1); }
if (!Array.isArray(d)) { console.error('REPROVOU:', d.message || JSON.stringify(d).slice(0,400)); process.exit(1); }
console.log(APLICAR ? 'APLICADA (commit)' : 'OK: roda limpa. Rollback dado, nada gravado.');
