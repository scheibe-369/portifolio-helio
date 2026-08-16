// Medicao + publicacao da persona chef.
//
// A suspeita que isto mede: ligarFormulario() chama aoMudar(false) a CADA evento de input, e
// esse aoMudar sobe ate o repintar() do editorApp, que faz raiz.innerHTML = renderCasca() e
// pintarCanvas() inteiro. Se for isso, digitar uma frase no formulario repinta a pagina
// inteira uma vez por tecla, e o custo cresce com o numero de projetos cadastrados.
import { abrirEditor, esperar } from './base.mjs';
import { writeFile } from 'node:fs/promises';

const G = '#ed-gaveta';
const { pagina, navegador, erros } = await abrirEditor('demo-chef', { headless: true });

// ------------------------------------------------------------------- medicao
await pagina.click('[data-abrir="projetos"]');
await esperar(1500);
await pagina.locator(`${G} .ed-lista-item`, { hasText: 'Menu Recôncavo' }).first().locator('[data-editar]').click();
await esperar(1500);
await pagina.evaluate(() => document.querySelectorAll('#ed-gaveta details[data-passo]').forEach((d) => { d.open = true; }));
await esperar(400);

// Conta reconstrucoes do canvas e da barra do editor.
await pagina.evaluate(() => {
  window.__conta = { canvas: 0, barra: 0 };
  const alvo = document.getElementById('app');
  new MutationObserver((ms) => {
    for (const mu of ms) {
      if (mu.target.id === 'app') window.__conta.barra += 1;
      if (mu.target.id === 'ed-canvas') window.__conta.canvas += 1;
    }
  }).observe(alvo, { childList: true, subtree: true });
});

const FRASE = 'Testando quanto custa digitar uma frase inteira dentro do editor.'; // 65 chars
const campo = pagina.locator(`${G} [data-campo="tagline"] textarea`).first();
await campo.click();
const antes = Date.now();
await campo.pressSequentially(FRASE, { delay: 0 });
const gasto = Date.now() - antes;
await esperar(1200);
const conta = await pagina.evaluate(() => window.__conta);
console.log(`\nDIGITACAO: ${FRASE.length} teclas em ${gasto} ms  (${(gasto / FRASE.length).toFixed(1)} ms por tecla)`);
console.log(`REPINTURAS: canvas=${conta.canvas} barra=${conta.barra}`);
const fps = await pagina.evaluate(() => document.querySelectorAll('#ed-canvas .project-card').length);
console.log(`cards de projeto no canvas: ${fps}`);

// Desfaz a frase de teste para nao sujar o conteudo.
await campo.fill('Sete tempos que refazem o caminho do dendê, do canavial de Santo Amaro até o prato.');
await esperar(400);
await pagina.click('#ed-form-salvar');
await esperar(4000);

// ------------------------------------------------------------------ publicar
await pagina.click('[data-abrir="publicar"]');
await esperar(2000);
const antesPub = await pagina.evaluate(() => document.querySelector('#ed-gaveta').innerText);
await writeFile('out/chef-publicar-antes.txt', antesPub, 'utf8');
console.log('\n=== TELA DE PUBLICAR ===\n' + antesPub);
await pagina.screenshot({ path: 'out/chef-publicar-antes.png' });

const btn = pagina.locator(`${G} [data-publicar]`).first();
console.log('\nbotao publicar desabilitado?', await btn.isDisabled());
if (!(await btn.isDisabled())) {
  await btn.click();
  await esperar(8000);
  const depois = await pagina.evaluate(() => document.querySelector('#ed-gaveta').innerText);
  await writeFile('out/chef-publicar-depois.txt', depois, 'utf8');
  console.log('\n=== DEPOIS DE PUBLICAR ===\n' + depois);
  await pagina.screenshot({ path: 'out/chef-publicar-depois.png' });
}

// Selo da barra do topo depois de publicar: "no ar" ou "rascunho"?
await pagina.keyboard.press('Escape');
await esperar(1500);
console.log('\nselo da barra:', await pagina.evaluate(() => document.querySelector('.ed-barra-status')?.textContent?.trim()));

// -------------------------------------------------------------------- canvas
const canvas = await pagina.evaluate(() => document.getElementById('ed-canvas')?.innerText || '');
await writeFile('out/chef-canvas.txt', canvas, 'utf8');
console.log('\n=== CANVAS ===\n' + canvas.slice(0, 2200));
await pagina.screenshot({ path: 'out/chef-canvas-inteiro.png', fullPage: true });

console.log('\nERROS:', [...new Set(erros)].join('\n') || '(nenhum)');
await navegador.close();
