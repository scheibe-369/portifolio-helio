import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';

const slug = process.argv[2] || 'demo-chef';
const [s] = JSON.parse(execFileSync(process.execPath, ['scripts/sessao-demo.mjs','--slug',slug,'--json'],{encoding:'utf8'}));
const nav = await chromium.launch({ headless: true });
const ctx = await nav.newContext({ viewport:{width:1440,height:900} });
await ctx.addInitScript(([k,v])=>{try{localStorage.setItem(k,v)}catch{}},
  [`sb-fxchcqlbjszichhbllzm-auth-token`, JSON.stringify({
    access_token:s.accessToken, refresh_token:s.refreshToken, expires_at:s.expiresAt,
    token_type:'bearer', user:{id:s.userId,email:s.email} })]);
const p = await ctx.newPage();
p.on('pageerror', e => console.log('PAGEERROR:', String(e).slice(0,300)));
p.on('response', async r => { if (r.url().includes('supabase') && r.status()>=400) {
  let b=''; try{b=(await r.text()).slice(0,250)}catch{}; console.log(`HTTP ${r.status()} ${r.url().split('?')[0].split('/').pop()} :: ${b}`); }});
await p.goto(`https://myportifolio.com.br/app?cb=${Date.now()}`, { waitUntil:'networkidle' });

if (await p.locator('#termos-aceite').count()) {
  await p.check('#termos-aceite'); await p.click('#termos-continuar');
  await p.waitForSelector('#wz-nome', { timeout: 30000 });
}
if (await p.locator('#wz-nome').count()) {
  console.log('WIZARD: preenchendo');
  await p.fill('#wz-nome', 'Marina Salgueiro');
  await p.fill('#wz-slug', 'demo-chef');
  await p.fill('#wz-role', 'Chef de cozinha');
  await p.waitForTimeout(2000);
  const btn = p.locator('button', { hasText: 'Criar meu portfólio' });
  await btn.click();
  await p.waitForTimeout(12000);
}
console.log('\n--- EDITOR ---');
console.log((await p.evaluate(()=>document.body.innerText)).slice(0,1200));
console.log('\n--- controles do editor ---');
console.log(await p.evaluate(()=>[...document.querySelectorAll('button,[data-edit],[data-painel],nav a')]
  .map(e=>`  ${e.tagName.toLowerCase()}${e.id?'#'+e.id:''}${e.dataset.edit?'[data-edit='+e.dataset.edit+']':''}${e.dataset.painel?'[data-painel='+e.dataset.painel+']':''} :: ${(e.innerText||'').slice(0,40).replace(/\n/g,' ')}`).slice(0,45).join('\n')));
await p.screenshot({ path:'out/editor-chef.png', fullPage:false });
await nav.close();
