// Segunda sonda do professor: as consequencias do empilhamento de ouvintes FORA do formulario,
// mais o 404 que aparece no console sem dono.
//
// 1. Aplicar "colocar em ordem" quebra o painel de lista (TypeError) e mata as setas.
// 2. Remover um chip remove VARIOS de uma vez.
// 3. Qual recurso responde 404 na pagina do editor e na pagina publica.
import { abrirEditor, esperar } from './base.mjs';
import { writeFile, mkdir, readFile } from 'node:fs/promises';

await mkdir('out', { recursive: true });
const linhas = [];
const log = (...a) => { const s = a.join(' '); linhas.push(s); console.log(s); };

const { pagina, navegador } = await abrirEditor('demo-professor', { headless: true });
const G = '#ed-gaveta';

const falhas = [];
pagina.on('response', (r) => { if (r.status() === 404) falhas.push(`${r.status()} ${r.url()}`); });
const jsErros = [];
pagina.on('pageerror', (e) => jsErros.push(String(e).slice(0, 200)));

log('# SONDA 2', new Date().toISOString());

// ---------------------------------------------- 1. ordem quebra as setas depois
log('\n## 1. "Colocar em ordem" e as setas logo depois');
await pagina.click('[data-abrir="experiencias"]');
await esperar(1500);
const lista = () => pagina.evaluate(() =>
  [...document.querySelectorAll('#ed-gaveta .ed-lista-sub')].map((e) => e.textContent.trim()));

log('  antes:'); (await lista()).forEach((l, i) => log(`    ${i + 1}. ${l}`));
jsErros.length = 0;
await pagina.locator(`${G} [data-sugerir-ordem]`).first().click();
await esperar(900);
await pagina.locator(`${G} [data-aplicar-ordem]`).first().click();
await esperar(3000);
log(`  erros de JS durante o "Aplicar": ${jsErros.length ? jsErros.join(' | ') : '(nenhum)'}`);
log('  depois de aplicar:'); (await lista()).forEach((l, i) => log(`    ${i + 1}. ${l}`));

// Agora as setas: elas dependem da mesma variavel `ordem` que o segundo ouvinte zerou.
jsErros.length = 0;
const antesSeta = await lista();
const alvo = await pagina.evaluate(() => {
  const li = [...document.querySelectorAll('#ed-gaveta .ed-lista-item')][2];
  return li?.querySelector('[data-subir]')?.dataset.subir || '';
});
log(`\n  clicando na seta "subir" do 3o item ("${antesSeta[2]}")`);
await pagina.locator(`${G} [data-subir="${alvo}"]`).first().click().catch((e) => log(`  clique falhou: ${String(e).slice(0, 120)}`));
await esperar(2500);
log(`  erros de JS: ${jsErros.length ? [...new Set(jsErros)].join(' | ') : '(nenhum)'}`);
const depoisSeta = await lista();
log('  lista depois da seta:'); depoisSeta.forEach((l, i) => log(`    ${i + 1}. ${l}`));
if (JSON.stringify(antesSeta) === JSON.stringify(depoisSeta)) log('  >>> A SETA NAO FEZ NADA.');
await pagina.screenshot({ path: 'out/prof-sonda2-setas.png' });

await pagina.keyboard.press('Escape');
await esperar(800);

// ------------------------------------------------ 2. remover chip remove varios
log('\n## 2. Remover UM chip da lista de disciplinas');
await pagina.click('[data-abrir="perfil"]');
await esperar(1500);
await pagina.evaluate(() => { document.querySelectorAll('#ed-gaveta details[data-passo]').forEach((d) => { d.open = true; }); });
await esperar(400);
const chips = () => pagina.evaluate(() =>
  [...document.querySelectorAll('#ed-gaveta [data-chips="stacks"] .ed-chip')].map((c) => c.textContent.replace('×', '').trim()));
log(`  antes (${(await chips()).length}): ${(await chips()).join(' | ')}`);

// Um clique so, no PRIMEIRO chip. Antes dele, uma unica interacao que repinta (abrir/fechar
// um switch), que e o que qualquer pessoa faz antes de mexer nos chips.
await pagina.locator(`${G} [data-switch="show_online_dot"]`).first().click();
await esperar(700);
await pagina.evaluate(() => { document.querySelectorAll('#ed-gaveta details[data-passo]').forEach((d) => { d.open = true; }); });
await esperar(300);
const antesChip = await chips();
await pagina.locator(`${G} [data-chips="stacks"] [data-chip-remover]`).first().click();
await esperar(1200);
await pagina.evaluate(() => { document.querySelectorAll('#ed-gaveta details[data-passo]').forEach((d) => { d.open = true; }); });
await esperar(300);
const depoisChip = await chips();
log(`  depois de UM clique no "×" (${depoisChip.length}): ${depoisChip.join(' | ')}`);
log(`  >>> sumiram ${antesChip.length - depoisChip.length} disciplina(s) com um clique.`);
await pagina.screenshot({ path: 'out/prof-sonda2-chips.png' });
await pagina.keyboard.press('Escape');
await esperar(600);

// ------------------------------------------------------------ 3. o 404 sem dono
log('\n## 3. O que responde 404');
log(falhas.length ? [...new Set(falhas)].join('\n') : '  (nenhum no editor)');

let urlPrevia = '';
try { urlPrevia = (await readFile('out/prof-previa-url.txt', 'utf8')).trim(); } catch {}
if (urlPrevia) {
  const p = await pagina.context().newPage();
  const f2 = [];
  p.on('response', (r) => { if (r.status() >= 400) f2.push(`${r.status()} ${r.url()}`); });
  await p.goto(urlPrevia, { waitUntil: 'networkidle', timeout: 60000 });
  await esperar(2500);
  log('  na pagina publica:');
  log(f2.length ? [...new Set(f2)].map((x) => `    ${x}`).join('\n') : '    (nenhum)');
  await p.close();
}

await writeFile('out/prof-sonda2.txt', linhas.join('\n'), 'utf8');
console.log('\n>>> out/prof-sonda2.txt');
await navegador.close();
