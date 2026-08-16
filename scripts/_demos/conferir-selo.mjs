import { readFile } from 'node:fs/promises';
const env = Object.fromEntries((await readFile('.env.local','utf8')).split('\n')
  .filter(l=>l.includes('=')&&!l.trim().startsWith('#'))
  .map(l=>[l.slice(0,l.indexOf('=')).trim(), l.slice(l.indexOf('=')+1).trim()]));
const q = async (query) => {
  const r = await fetch(`https://api.supabase.com/v1/projects/${env.SUPABASE_PROJECT_REF}/database/query`,{
    method:'POST',headers:{Authorization:`Bearer ${env.SUPABASE_ACCESS_TOKEN}`,'Content-Type':'application/json','User-Agent':'Mozilla/5.0'},
    body:JSON.stringify({query})});
  const d = await r.json(); if(!Array.isArray(d)) throw new Error(d.message); return d; };

console.log('--- default das colunas (tem que estar vazio) ---');
console.table(await q(`select column_name, column_default from information_schema.columns
  where table_schema='myportifolio' and table_name='portfolios' and column_name in ('badge_label','badge_icon');`));
console.log('--- o Helio nao mudou ---');
console.table(await q(`select slug, badge_label, badge_icon from myportifolio.portfolios where slug='helio';`));
console.log('--- a funcao nao forca mais ---');
console.table(await q(`select position('VibeCoder' in pg_get_functiondef(p.oid)) as tem_jargao
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='myportifolio' and p.proname='montar_payload_portfolio';`));
