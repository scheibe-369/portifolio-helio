import { chromium } from 'playwright';
const nav = await chromium.launch({ headless:true });
const p = await (await nav.newContext({viewport:{width:1440,height:900}})).newPage();
await p.goto('http://localhost:4173/', { waitUntil:'networkidle' });
// injeta um rotulo longo no botao, como faria um comprador
const r = await p.evaluate(() => {
  const t = document.querySelector('.btn-text');
  if (!t) return { erro: 'botao nao encontrado' };
  const medir = (txt) => { t.textContent = txt;
    return { texto: txt, visivel: t.clientWidth, real: t.scrollWidth,
             cortado: t.scrollWidth > t.clientWidth,
             estilo: getComputedStyle(t).textOverflow }; };
  return [medir('Agendar Call'), medir('Chamar no WhatsApp'), medir('Pedir orçamento agora mesmo')];
});
console.table(r);
await nav.close();
