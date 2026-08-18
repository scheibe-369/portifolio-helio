// Tirar da secao de especialidades as quatro que o kit "Arquitetura / Interiores" plantou.
//
// O ACHADO E ESTE: o kit escreve em `stacks` e o campo de chips e ADITIVO. Quem escolheu a
// area mais proxima da sua nao troca a lista, ele SOMA a dele por cima, e a pagina publica
// dele passa a anunciar "Residencial, Reforma, Interiores, Projeto executivo" ao lado de
// "Venda residencial, Locação, Avaliação de imóvel". Nao ha "limpar tudo": e um X por chip.
//
// Uso: node scripts/_demos/demo-corretor-chips.mjs
import { abrirEditor, esperar } from './base.mjs';

const FORA = ['Residencial', 'Reforma', 'Interiores', 'Projeto executivo'];
const { pagina, navegador, erros } = await abrirEditor('demo-corretor', { headless: true });

await pagina.click('[data-abrir="perfil"]');
await esperar(1500);
await pagina.evaluate(() => document.querySelectorAll('#ed-gaveta details').forEach((d) => { d.open = true; }));
await esperar(400);

let cliques = 0;
for (let volta = 0; volta < 12; volta++) {
  const achou = await pagina.evaluate((fora) => {
    const c = document.querySelector('#ed-gaveta [data-chips="stacks"]');
    if (!c) return null;
    for (const chip of [...c.querySelectorAll('.ed-chip')]) {
      const texto = chip.textContent.replace(/×\s*$/, '').trim();
      if (fora.includes(texto)) {
        chip.querySelector('.ed-chip-x')?.click();
        return texto;
      }
    }
    return null;
  }, FORA);
  if (!achou) break;
  cliques += 1;
  console.log(`  removida a chip do kit: "${achou}" (${cliques} cliques ate agora)`);
  await esperar(500);
  await pagina.evaluate(() => document.querySelectorAll('#ed-gaveta details').forEach((d) => { d.open = true; }));
  await esperar(300);
}
console.log(`total de cliques para desfazer o que o kit plantou: ${cliques}`);

await pagina.locator('#ed-form-salvar').click();
for (let i = 0; i < 40; i++) {
  await esperar(500);
  const aberta = await pagina.evaluate(() => document.querySelector('#ed-gaveta')?.classList.contains('is-open'));
  if (!aberta) { console.log('salvo'); break; }
}
await esperar(1200);
const final = await pagina.evaluate(() => document.getElementById('ed-canvas')?.innerText || '');
console.log(final.slice(final.indexOf('ONDE EU ATUO'), final.indexOf('ONDE EU ATUO') + 500));
console.log(`\nerros: ${[...new Set(erros)].join('\n') || '(nenhum)'}`);
await navegador.close();
