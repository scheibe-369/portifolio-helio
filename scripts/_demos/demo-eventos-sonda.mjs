// Sonda solta do demo-eventos: abre o editor e imprime o que for pedido, sem gravar nada.
// Uso: node scripts/_demos/demo-eventos-sonda.mjs [projetos|canvas|publicar]
import { abrirEditor, esperar } from './base.mjs';
import { writeFile } from 'node:fs/promises';

const O_QUE = process.argv[2] || 'projetos';
const { pagina, navegador, erros } = await abrirEditor('demo-eventos', { headless: true });

const canvas = await pagina.evaluate(() => document.getElementById('ed-canvas')?.innerText || '');
console.log('== CANVAS ==');
console.log(canvas.slice(0, 2000));

if (O_QUE === 'projetos' || O_QUE === 'tudo') {
  await pagina.click('[data-abrir="projetos"]');
  await esperar(4000);
  const html = await pagina.evaluate(() => document.querySelector('#ed-gaveta')?.innerHTML || '');
  const txt = await pagina.evaluate(() => document.querySelector('#ed-gaveta')?.innerText || '');
  console.log('\n== PAINEL PROJETOS (texto) ==');
  console.log(txt);
  await writeFile('out/eventos-sonda-projetos.html', html, 'utf8');
  await pagina.screenshot({ path: 'out/eventos-sonda-projetos.png', fullPage: true });
}

if (O_QUE === 'publicar') {
  await pagina.click('[data-abrir="publicar"]');
  await esperar(4000);
  console.log('\n== PAINEL PUBLICAR ==');
  console.log(await pagina.evaluate(() => document.querySelector('#ed-gaveta')?.innerText || ''));
  await pagina.screenshot({ path: 'out/eventos-sonda-publicar.png', fullPage: true });
}

console.log('\nerros:', erros.length ? [...new Set(erros)].join(' | ') : '(nenhum)');
await navegador.close();
