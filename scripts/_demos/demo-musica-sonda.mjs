// Sonda focada do demo-musica: dois campos condicionais que sumiram durante o cadastro.
//
// 1. `period_end` (Até) em uma entrada de ESTUDO: `dependeDe: (v) => !v.atual`. O switch nasce
//    ligado (experienciasPanel.js:35), e desligar deveria fazer o campo nascer.
// 2. `link_note` (Observação sobre o link): `dependeDe: (v) => Boolean(v.link)`. Digitar no
//    campo `link` dispara `aoMudar(false)`, que de proposito NAO repinta o formulario, entao
//    o campo dependente nao nasce enquanto so se digita.
//
// A sonda nao salva nada: abre, mede, fecha.
import { abrirEditor, esperar } from './base.mjs';
import { writeFile } from 'node:fs/promises';

const { pagina, navegador } = await abrirEditor('demo-musica', { headless: true });
const G = '#ed-gaveta';
const linhas = [];
const log = (s) => { linhas.push(s); console.log(s); };

const abrirTodos = () => pagina.evaluate(() => {
  document.querySelectorAll('#ed-gaveta details[data-passo]').forEach((d) => { d.open = true; });
});
const temCampo = (k) => pagina.locator(`${G} [data-campo="${k}"]`).count().then((n) => n > 0);

// ---------------------------------------------------- 1. period_end em estudo
log('== SONDA 1: period_end numa entrada de estudo ==');
await pagina.click('[data-abrir="experiencias"]');
await esperar(1200);
await pagina.locator(`${G} [data-adicionar]`).first().click();
await esperar(1200);

log(`  novo (kind=work):      period_end existe? ${await temCampo('period_end')}`);
const sw = () => pagina.locator(`${G} [data-switch="atual"]`).first();
log(`  switch "atual" agora:  aria-checked=${await sw().getAttribute('aria-checked')}`);

await pagina.locator(`${G} [data-escolha="kind"][data-valor="education"]`).first().click();
await esperar(900);
await abrirTodos();
log(`  depois de kind=estudo: period_end existe? ${await temCampo('period_end')}  switch=${await sw().getAttribute('aria-checked')}`);

await sw().click();
await esperar(1200);
await abrirTodos();
log(`  depois de desligar:    period_end existe? ${await temCampo('period_end')}  switch=${await sw().getAttribute('aria-checked')}`);

// A ordem inversa: desligar o switch ANTES de trocar o tipo.
await pagina.locator(`${G} [data-escolha="kind"][data-valor="work"]`).first().click();
await esperar(900);
await abrirTodos();
log(`  voltando a trabalho:   period_end existe? ${await temCampo('period_end')}  switch=${await sw().getAttribute('aria-checked')}`);

await pagina.keyboard.press('Escape');
await esperar(1000);

// -------------------------------------------------------- 2. link_note em projeto
log('\n== SONDA 2: link_note num projeto ==');
await pagina.click('[data-abrir="projetos"]');
await esperar(1200);
await pagina.locator(`${G} [data-adicionar]`).first().click();
await esperar(1200);
await abrirTodos();

log(`  form novo:                     link_note existe? ${await temCampo('link_note')}`);
await pagina.locator(`${G} [data-campo="link"] input`).first().fill('https://open.spotify.com/album/1DFixLWuPkv3KT3TnV35m3');
await esperar(1200);
await abrirTodos();
log(`  depois de DIGITAR o link:      link_note existe? ${await temCampo('link_note')}`);

await pagina.locator(`${G} [data-campo="link"] input`).first().blur();
await esperar(1000);
await abrirTodos();
log(`  depois de sair do campo (blur): link_note existe? ${await temCampo('link_note')}`);

// Qualquer interacao que repinte o formulario (chip, switch) faz o campo nascer.
const chip = pagina.locator(`${G} [data-chip-add="stack"]`).first();
if (await chip.count()) { await chip.fill('Pro Tools'); await chip.press('Enter'); await esperar(1200); }
await abrirTodos();
log(`  depois de adicionar um chip:   link_note existe? ${await temCampo('link_note')}`);

// ------------------------------------------- 3. a CAUSA: ouvintes empilhados
// `repintarCorpo` (editorDrawer.js:61) troca o innerHTML do MESMO elemento e chama `ligar`
// de novo, e `ligarFormulario` faz `corpo.addEventListener(...)` sem nunca remover o
// anterior. Cada repintura soma um jogo inteiro de ouvintes ao mesmo no. Como o handler de
// switch faz `valores[k] = !valores[k]`, N ouvintes = N inversoes: com N par, o clique nao
// faz nada. Esta secao mede exatamente isso.
log('\n== SONDA 3: ouvintes empilhados (a causa dos dois casos acima) ==');
await pagina.keyboard.press('Escape');
await esperar(1000);
await pagina.click('[data-abrir="projetos"]');
await esperar(1200);
await pagina.locator(`${G} [data-adicionar]`).first().click();
await esperar(1200);
await abrirTodos();

const contarOuvintes = () => pagina.evaluate(() => {
  // Playwright roda em CDP, entao da para perguntar ao proprio navegador.
  const corpo = document.querySelector('[data-gaveta-corpo]');
  return corpo ? corpo.getAttribute('data-gaveta-corpo') !== null : false;
});
await contarOuvintes();

const estadoSwitch = (k) => pagina.locator(`${G} [data-switch="${k}"]`).first().getAttribute('aria-checked');
log(`  switch "tem_cliente" no form novo: ${await estadoSwitch('tem_cliente')}`);
for (let i = 1; i <= 4; i++) {
  await pagina.locator(`${G} [data-switch="tem_cliente"]`).first().click();
  await esperar(900);
  await abrirTodos();
  log(`  clique ${i}: aria-checked=${await estadoSwitch('tem_cliente')}  (esperado alternar a cada clique)`);
}

// Remover chip: o handler filtra por indice. Com N ouvintes, um clique remove N chips.
log('\n  -- remocao de chip com ouvintes empilhados --');
const add = async (t) => {
  const inp = pagina.locator(`${G} [data-chip-add="stack"]`).first();
  await inp.fill(t); await inp.press('Enter'); await esperar(700);
};
for (const t of ['Pro Tools', 'Ableton', 'Neve 1073', 'iZotope RX', 'Alfaia']) await add(t);
await abrirTodos();
const listarChips = () => pagina.evaluate(() =>
  [...document.querySelectorAll('#ed-gaveta [data-chips="stack"] .ed-chip')].map((c) => c.textContent.replace(/\s+/g, ' ').trim()));
log(`  chips antes:  ${JSON.stringify(await listarChips())}`);
await pagina.locator(`${G} [data-chips="stack"] [data-chip-remover]`).first().click();
await esperar(1200);
await abrirTodos();
log(`  chips depois de UM clique em remover: ${JSON.stringify(await listarChips())}`);

await pagina.screenshot({ path: 'out/musica-sonda-condicionais.png' });
await writeFile('out/musica-sonda-condicionais.txt', linhas.join('\n'), 'utf8');
await navegador.close();
