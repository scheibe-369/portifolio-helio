// Sonda do achado do professor: switch e caixa de consentimento que NAO respondem ao clique.
//
// Hipotese lida no codigo: repintarCorpo() troca so o innerHTML do MESMO elemento
// [data-gaveta-corpo] e chama aoLigar() de novo. ligarFormulario() faz addEventListener no
// elemento que sobreviveu, entao cada repintura EMPILHA mais um jogo de ouvintes. Um clique
// passa a alternar o valor N vezes: com N par, nada acontece na tela.
//
// Esta sonda nao conserta nada. Ela so mede.
import { abrirEditor, esperar } from './base.mjs';
import { writeFile, mkdir } from 'node:fs/promises';

await mkdir('out', { recursive: true });
const linhas = [];
const log = (...a) => { const s = a.join(' '); linhas.push(s); console.log(s); };

const { pagina, navegador } = await abrirEditor('demo-professor', { headless: true });
const G = '#ed-gaveta';

// Conta ouvintes de verdade: embrulha addEventListener antes de a gaveta existir.
await pagina.evaluate(() => {
  window.__ouvintes = { click: 0, input: 0, change: 0, keydown: 0 };
  const orig = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function (tipo, fn, op) {
    if (this instanceof Element && this.dataset && this.dataset.gavetaCorpo != null) {
      window.__ouvintes[tipo] = (window.__ouvintes[tipo] || 0) + 1;
    }
    return orig.call(this, tipo, fn, op);
  };
});

const contar = () => pagina.evaluate(() => ({ ...window.__ouvintes }));
const estado = (sel) => pagina.evaluate((s) => document.querySelector(s)?.getAttribute('aria-checked'), sel);

log('# SONDA: ouvintes empilhados a cada repintura');
log(`data: ${new Date().toISOString()}\n`);

await pagina.click('[data-abrir="experiencias"]');
await esperar(1200);
await pagina.locator(`${G} [data-adicionar]`).first().click();
await esperar(1200);

log('## teste 1: clicar 8x no switch "Estou aqui até hoje" (data-switch="atual")');
log('clique | aria-checked antes | depois | ouvintes de click no corpo da gaveta');
for (let i = 1; i <= 8; i += 1) {
  const antes = await estado(`${G} [data-switch="atual"]`);
  const nAntes = (await contar()).click;
  await pagina.locator(`${G} [data-switch="atual"]`).first().click();
  await esperar(700);
  const depois = await estado(`${G} [data-switch="atual"]`);
  const nDepois = (await contar()).click;
  log(`  ${i}    | ${antes} | ${depois} | ${nAntes} -> ${nDepois}`);
}

log('\n## teste 2: campo "Até" (period_end) existe? Ele so nasce com o switch desligado.');
log(`  period_end no DOM: ${await pagina.locator(`${G} [data-campo="period_end"]`).count()}`);
log(`  aria-checked final do switch: ${await estado(`${G} [data-switch="atual"]`)}`);

log('\n## teste 3: o custo. Quanto demora cada clique conforme os ouvintes dobram.');
for (let i = 1; i <= 4; i += 1) {
  const alvo = i % 2 ? 'education' : 'work';
  const n = (await contar()).click;
  const t0 = Date.now();
  try {
    await pagina.locator(`${G} [data-escolha="kind"][data-valor="${alvo}"]`).first().click({ timeout: 25000 });
  } catch (e) {
    log(`  pedi "${alvo}" com ${n} ouvintes: A PAGINA TRAVOU (clique nao completou em 25s)`);
    break;
  }
  await esperar(700);
  const rotuloOrg = await pagina.evaluate(() =>
    document.querySelector('#ed-gaveta [data-campo="org"] .ed-label')?.textContent?.trim());
  log(`  pedi "${alvo}" com ${n} ouvintes: ${Date.now() - t0}ms, rotulo do 1o campo="${rotuloOrg}"`);
}

log('\n## teste 4: quanto o DOM cresce de ouvinte numa sessao normal de preenchimento');
log(`  ouvintes agora: ${JSON.stringify(await contar())}`);

await pagina.screenshot({ path: 'out/prof-sonda-switch.png' });
await writeFile('out/prof-sonda.txt', linhas.join('\n'), 'utf8');
console.log('\n>>> out/prof-sonda.txt');
await navegador.close();
