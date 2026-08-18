// Abre UM trabalho no editor e lista os campos. So le.
import { abrirEditor, esperar } from './base.mjs';
import { writeFileSync } from 'node:fs';

const linhas = [];
const log = (...a) => { const s = a.map((x) => (typeof x === 'string' ? x : JSON.stringify(x, null, 2))).join(' '); linhas.push(s); console.log(s); };

const { pagina, navegador, erros } = await abrirEditor('demo-fotografo');
await pagina.locator('[data-abrir="projetos"]').first().click();
await esperar(1600);
await pagina.locator('#ed-gaveta button').filter({ hasText: /^Editar$/ }).first().click();
await esperar(1800);
await pagina.evaluate(() => document.querySelectorAll('#ed-gaveta details').forEach((d) => { d.open = true; }));
await esperar(500);
await pagina.screenshot({ path: 'out/rev2-foto-ed-trabalho.png', fullPage: true });
log('===== FORMULARIO DO TRABALHO =====');
log(await pagina.evaluate(() => document.querySelector('#ed-gaveta').innerText));
log('CAMPOS:');
log(await pagina.evaluate(() => [...document.querySelectorAll('#ed-gaveta [data-k],#ed-gaveta [data-switch],#ed-gaveta input,#ed-gaveta select,#ed-gaveta textarea,#ed-gaveta [data-galeria],#ed-gaveta [type=range]')].map((e) => ({
  k: e.getAttribute('data-k') || e.getAttribute('data-switch') || e.id || '', tag: e.tagName, type: e.type || '', valor: String(e.value || '').slice(0, 70), max: e.getAttribute('maxlength'),
}))));
log('HTML DA AREA DE IMAGEM:');
log(await pagina.evaluate(() => {
  const els = [...document.querySelectorAll('#ed-gaveta *')].filter((e) => /nquadr|aber inteira|reencher|aleria/i.test(e.textContent || '') && e.children.length < 12);
  return els.slice(-4).map((e) => e.outerHTML.slice(0, 2500)).join('\n\n----\n\n');
}));
log('\nERROS:'); log(erros);
writeFileSync('out/rev2-foto-trabalho.txt', linhas.join('\n'), 'utf8');
await navegador.close();
