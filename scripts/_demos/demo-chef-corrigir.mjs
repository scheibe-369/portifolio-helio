// Retomada da persona chef: conserta o que ficou pela metade na primeira passada e mede o
// PORQUE, em vez de so tentar de novo. Duas coisas falharam no formulario de Estudo:
//   - o campo "Até" (period_end) nao existia depois de desligar "Ainda estou cursando";
//   - o rotulo do botao do certificado nao esta dentro de [data-campo="certificate_label"],
//     ele mora aninhado dentro do proprio campo do certificado, com id #ed-cert-label.
import { abrirEditor, esperar } from './base.mjs';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

const G = '#ed-gaveta';
const m = (f) => path.join(path.resolve('out/midia/demo-chef'), f);
const { pagina, navegador, erros } = await abrirEditor('demo-chef', { headless: true });

const estado = () => pagina.evaluate(() => ({
  atual: document.querySelector('#ed-gaveta [data-switch="atual"]')?.getAttribute('aria-checked'),
  temFim: Boolean(document.querySelector('#ed-gaveta [data-campo="period_end"]')),
  temCert: Boolean(document.querySelector('#ed-gaveta .ed-anexo')),
  certPublico: document.querySelector('#ed-gaveta [data-cert-publico]')?.getAttribute('aria-checked'),
  certLabel: document.querySelector('#ed-cert-label')?.value,
  passos: [...document.querySelectorAll('#ed-gaveta details[data-passo]')].map((d) => `${d.dataset.passo}:${d.open}`),
}));

const abrirTodos = async () => {
  await pagina.evaluate(() => document.querySelectorAll('#ed-gaveta details[data-passo]').forEach((d) => { d.open = true; }));
  await esperar(300);
};

await pagina.click('[data-abrir="experiencias"]');
await esperar(1500);
console.log('--- lista ---');
console.log(await pagina.evaluate(() => document.querySelector('#ed-gaveta').innerText));

// Abre a entrada de estudo pelo texto da linha.
const linha = pagina.locator(`${G} .ed-lista-item`, { hasText: 'Le Cordon Bleu' }).first();
await linha.locator('[data-editar]').click();
await esperar(1500);
await abrirTodos();
console.log('\nestado ao abrir:', JSON.stringify(await estado()));

// 1. O switch, medido passo a passo.
const sw = pagina.locator(`${G} [data-switch="atual"]`).first();
console.log('switch existe:', await sw.count(), 'desabilitado:', await sw.isDisabled());
await sw.click();
await esperar(1500);
console.log('depois do clique:', JSON.stringify(await estado()));

await abrirTodos();
const fim = pagina.locator(`${G} [data-campo="period_end"] input`).first();
if (await fim.count()) {
  await fim.fill('2014');
  await esperar(400);
  console.log('period_end preenchido');
} else {
  console.log('!! period_end SEGUE AUSENTE depois de desligar o switch');
}

// 2. O rotulo do certificado, no seletor certo.
const rot = pagina.locator('#ed-cert-label');
if (await rot.count()) { await rot.fill('Diplôme de Cuisine'); await esperar(300); console.log('rotulo do certificado preenchido'); }
else console.log('!! #ed-cert-label ausente (certificado nao subiu?)');

// 3. Consentimento.
const chk = pagina.locator(`${G} [data-cert-publico]`).first();
if (await chk.count()) {
  console.log('consentimento antes:', await chk.getAttribute('aria-checked'), 'desabilitado:', await chk.isDisabled());
  if ((await chk.getAttribute('aria-checked')) !== 'true' && !(await chk.isDisabled())) {
    await chk.click(); await esperar(800);
    console.log('consentimento depois:', await pagina.locator(`${G} [data-cert-publico]`).first().getAttribute('aria-checked'));
  }
} else console.log('!! caixa de consentimento ausente');

await abrirTodos();
await writeFile('out/chef-estudo-corrigido.txt', await pagina.evaluate(() => document.querySelector('#ed-gaveta').innerText), 'utf8');
await pagina.screenshot({ path: 'out/chef-estudo-corrigido.png' });

await pagina.click('#ed-form-salvar');
await esperar(6000);
console.log('gaveta aberta apos salvar:', await pagina.evaluate(() => document.querySelector('#ed-gaveta')?.classList.contains('is-open')));
console.log('msg:', await pagina.evaluate(() => document.getElementById('ed-form-msg')?.textContent || ''));

await pagina.click('[data-abrir="experiencias"]');
await esperar(1500);
console.log('\n--- lista depois ---');
console.log(await pagina.evaluate(() => document.querySelector('#ed-gaveta').innerText));

console.log('\nERROS:', [...new Set(erros)].join('\n') || '(nenhum)');
await navegador.close();
