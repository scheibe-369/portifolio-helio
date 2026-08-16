// Sonda: abre o editor da persona advogada e despeja o DOM de cada painel, para o script
// principal saber em que campo mexer sem adivinhar. Nao preenche nada.
import { abrirEditor, esperar } from './base.mjs';

const { pagina, navegador, erros } = await abrirEditor('demo-advogada');

const fechar = async () => {
  const b = pagina.locator('button', { hasText: /^Fechar$/ }).first();
  if (await b.count()) { await b.click().catch(() => {}); await esperar(600); }
  await pagina.keyboard.press('Escape').catch(() => {});
  await esperar(500);
};

const abrirTudo = () => pagina.evaluate(() => {
  document.querySelectorAll('details').forEach((d) => { d.open = true; });
});

const campos = () => pagina.evaluate(() => [...document.querySelectorAll('input,textarea,select,button')]
  .map((e) => {
    const lab = document.querySelector(`label[for="${e.id}"]`) || e.closest('label');
    const txt = (lab && lab.innerText) || e.placeholder || e.getAttribute('aria-label') || e.innerText || '';
    return `  <${e.tagName.toLowerCase()}>${e.id ? '#' + e.id : ''}${e.type ? '{' + e.type + '}' : ''}`
      + `${e.accept ? ' accept=' + e.accept : ''}${e.maxLength > 0 ? ' max=' + e.maxLength : ''}`
      + ` :: ${txt.slice(0, 120).replace(/\n/g, ' | ')}`;
  }).join('\n'));

const dump = async (rotulo, corte = 3500) => {
  await abrirTudo();
  console.log(`\n================ ${rotulo} ================`);
  console.log((await pagina.evaluate(() => document.body.innerText)).slice(0, corte));
  console.log(`--- campos ---\n${await campos()}`);
};

// Perfil: abrir e expandir os <details> escondidos (CONTATO E REDES, A PAGINA, AJUSTES FINOS)
await pagina.locator('button', { hasText: /^Perfil$/ }).first().click();
await esperar(1500);
await abrirTudo();
await esperar(400);
await dump('PAINEL Perfil (tudo aberto)', 6000);
await pagina.screenshot({ path: 'out/adv-sonda-perfil.png', fullPage: true });
await fechar();

// Projetos: painel + o modal de novo trabalho
await pagina.locator('button', { hasText: /^Projetos$/ }).first().click();
await esperar(1500);
await dump('PAINEL Projetos');
const add = pagina.locator('button', { hasText: /Adicionar trabalho|Novo trabalho|Adicionar projeto/i }).first();
if (await add.count()) {
  await add.click();
  await esperar(1500);
  await dump('MODAL novo trabalho', 6000);
  await pagina.screenshot({ path: 'out/adv-sonda-modal-trabalho.png', fullPage: true });
}
await fechar(); await fechar();

// Experiencia
await pagina.locator('button', { hasText: /^Experiência$/ }).first().click();
await esperar(1500);
await dump('PAINEL Experiência');
const addExp = pagina.locator('button', { hasText: /Adicionar experi/i }).first();
if (await addExp.count()) {
  await addExp.click();
  await esperar(1500);
  await dump('MODAL nova experiência', 6000);
  await pagina.screenshot({ path: 'out/adv-sonda-modal-exp.png', fullPage: true });
}
await fechar(); await fechar();

console.log('\n=== ERROS COLETADOS ===');
console.log(erros.length ? erros.join('\n') : '(nenhum)');
await navegador.close();
