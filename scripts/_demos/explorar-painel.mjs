import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
const slug = process.argv[2] || 'demo-chef';
const painel = process.argv[3] || 'Perfil';
const [s] = JSON.parse(execFileSync(process.execPath, ['scripts/sessao-demo.mjs','--slug',slug,'--json'],{encoding:'utf8'}));
const nav = await chromium.launch({ headless:true });
const ctx = await nav.newContext({ viewport:{width:1440,height:900} });
await ctx.addInitScript(([k,v])=>{try{localStorage.setItem(k,v)}catch{}},
  ['sb-fxchcqlbjszichhbllzm-auth-token', JSON.stringify({access_token:s.accessToken,refresh_token:s.refreshToken,expires_at:s.expiresAt,token_type:'bearer',user:{id:s.userId,email:s.email}})]);
const p = await ctx.newPage();
p.on('pageerror', e=>console.log('PAGEERROR:',String(e).slice(0,200)));
await p.goto(`https://myportifolio.com.br/app?cb=${Date.now()}`,{waitUntil:'networkidle'});
if (await p.locator('#termos-aceite').count()) { await p.check('#termos-aceite'); await p.click('#termos-continuar'); await p.waitForTimeout(8000); }
await p.waitForTimeout(2000);
await p.locator('button', { hasText: new RegExp('^'+painel+'$') }).first().click();
await p.waitForTimeout(2500);
console.log(`--- PAINEL ${painel} ---`);
console.log((await p.evaluate(()=>document.body.innerText)).slice(0,1500));
console.log('\n--- campos ---');
console.log(await p.evaluate(()=>[...document.querySelectorAll('input,textarea,select,button')]
  .map(e=>{const l=e.closest('label')||document.querySelector(`label[for="${e.id}"]`);
    return `  ${e.tagName.toLowerCase()}${e.id?'#'+e.id:''}${e.name?'[name='+e.name+']':''}[${e.type||''}] :: ${((l&&l.innerText)||e.placeholder||e.innerText||'').slice(0,55).replace(/\n/g,' | ')}`;}).join('\n')));
await nav.close();
