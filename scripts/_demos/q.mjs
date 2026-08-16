import { readFile } from 'node:fs/promises';
const env = Object.fromEntries((await readFile('.env.local','utf8')).split('\n')
  .filter(l=>l.includes('=')&&!l.trim().startsWith('#'))
  .map(l=>[l.slice(0,l.indexOf('=')).trim(), l.slice(l.indexOf('=')+1).trim()]));
export const q = async (query) => {
  const r = await fetch(`https://api.supabase.com/v1/projects/${env.SUPABASE_PROJECT_REF}/database/query`,{
    method:'POST',headers:{Authorization:`Bearer ${env.SUPABASE_ACCESS_TOKEN}`,'Content-Type':'application/json','User-Agent':'Mozilla/5.0'},
    body:JSON.stringify({query})});
  const d = await r.json(); if(!Array.isArray(d)) throw new Error(d.message||JSON.stringify(d)); return d; };
if (process.argv[2]) console.table(await q(process.argv[2]));
