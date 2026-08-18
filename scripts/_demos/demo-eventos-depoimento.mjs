// O TESTE CENTRAL desta persona: onde cabe o depoimento de uma noiva?
//
// O produto não tem seção de depoimentos, não tem campo de depoimento por trabalho e não tem
// como criar seção nova. Este script percorre o produto inteiro procurando um esconderijo e
// mede cada um: quantos caracteres aceita, se sobrevive ao salvar, e o que a autoria vira.
//
// Uso: node scripts/_demos/demo-eventos-depoimento.mjs
import { abrirEditor, esperar } from './base.mjs';
import { writeFile } from 'node:fs/promises';

const G = '#ed-gaveta';
const DEPOIMENTO = '"A Clarice salvou o meu casamento. Choveu na hora exata da cerimônia e eu só descobri que tinha chovido quando vi as fotos." Marina Rezende, noiva';
const achados = [];
const { pagina, navegador, erros } = await abrirEditor('demo-eventos', { headless: true });

async function abrirPainelPor(chave) {
  const aberta = await pagina.evaluate(() => document.querySelector('#ed-gaveta')?.classList.contains('is-open'));
  if (aberta) { await pagina.keyboard.press('Escape'); await esperar(900); }
  await pagina.click(`[data-abrir="${chave}"]`);
  await esperar(3000);
}
const abrirPassos = async () => {
  await pagina.evaluate(() => { document.querySelectorAll('#ed-gaveta details').forEach((d) => { d.open = true; }); });
  await esperar(300);
};
const medir = async (key) => pagina.evaluate((k) => {
  const c = document.querySelector(`#ed-gaveta [data-campo="${k}"]`);
  if (!c) return null;
  const el = c.querySelector('input:not([type=file]), textarea');
  return {
    existe: true,
    tag: el?.tagName.toLowerCase() || '(sem input)',
    max: el?.getAttribute('maxlength') || '(sem limite)',
    label: (c.querySelector('.ed-label')?.innerText || '').trim().replace(/\n/g, ' '),
    lock: Boolean(c.querySelector('.ed-lock')),
  };
}, key);

// ---- 1. PERFIL: existe algum campo capaz de receber a fala de outra pessoa?
console.log('\n== 1. PERFIL ==');
await abrirPainelPor('perfil');
await abrirPassos();
for (const k of ['bio', 'stats', 'socials', 'stacks', 'rotulo_about']) {
  const r = await medir(k);
  console.log(`  ${k}: ${r ? `${r.tag}, limite ${r.max}, rótulo "${r.label}"` : 'NÃO EXISTE'}`);
  achados.push({ onde: `perfil.${k}`, ...(r || { existe: false }) });
}
// Cabe o depoimento em "Números da capa"? Ele é par "rótulo | valor".
const stats = pagina.locator(`${G} [data-campo="stats"] textarea`).first();
if (await stats.count()) {
  const antes = await stats.inputValue();
  await stats.fill(`${antes}\nMarina, noiva | "A Clarice salvou o meu casamento"`);
  await esperar(400);
  const canvas = await pagina.evaluate(() => document.getElementById('ed-canvas')?.innerText || '');
  const entrou = /salvou o meu casamento/i.test(canvas);
  console.log(`  teste: depoimento como "Número da capa" aparece no canvas? ${entrou}`);
  achados.push({ onde: 'perfil.stats (teste de depoimento como número)', renderizou: entrou });
  await stats.fill(antes); // desfaz: número da capa não é lugar de frase
  await esperar(400);
}

// ---- 2. TRABALHO: o link_note, que só nasce quando existe link
console.log('\n== 2. TRABALHO: o campo que só nasce com link ==');
await abrirPainelPor('projetos');
const item = pagina.locator(`${G} .ed-lista-item`, { hasText: 'Camila e Pedro' }).first();
if (await item.count()) {
  await item.locator('[data-editar]').first().click();
  await esperar(1800);
  await abrirPassos();
  console.log(`  link_note antes de ter link: ${JSON.stringify(await medir('link_note'))}`);
  const link = pagina.locator(`${G} [data-campo="link"] input`).first();
  await link.fill('https://instagram.com/clarice.cerimonial');
  await link.press('Tab');
  await esperar(2500);
  await abrirPassos();
  const dep = await medir('link_note');
  console.log(`  link_note depois de ter link: ${JSON.stringify(dep)}`);
  achados.push({ onde: 'projeto.link_note', ...(dep || { existe: false }) });
  if (dep) {
    const el = pagina.locator(`${G} [data-campo="link_note"] input`).first();
    await el.fill(DEPOIMENTO);
    const gravado = await el.inputValue();
    console.log(`  quis escrever ${DEPOIMENTO.length} caracteres, coube ${gravado.length}`);
    console.log(`  ficou: "${gravado}"`);
    achados.push({ onde: 'projeto.link_note (corte)', quis: DEPOIMENTO.length, coube: gravado.length, texto: gravado });
    await abrirPassos();
    const salvar = pagina.locator('#ed-form-salvar');
    await salvar.click();
    for (let i = 0; i < 40; i++) {
      await esperar(500);
      if (!(await pagina.evaluate(() => document.querySelector('#ed-gaveta')?.classList.contains('is-open')))) break;
    }
    console.log('  salvo');
  }
} else console.log('  projeto "Camila e Pedro" não achado');

// ---- 3. EXPERIÊNCIA: a "Observação" de 700 caracteres
console.log('\n== 3. EXPERIÊNCIA: o campo "Observação" ==');
await abrirPainelPor('experiencias');
const exp = pagina.locator(`${G} .ed-lista-item`).first();
if (await exp.count()) {
  await exp.locator('[data-editar]').first().click();
  await esperar(1800);
  await abrirPassos();
  const r = await medir('note');
  console.log(`  note: ${JSON.stringify(r)}`);
  achados.push({ onde: 'experiencia.note', ...(r || { existe: false }) });
  await pagina.keyboard.press('Escape');
  await esperar(900);
}

// ---- 4. O QUE A PÁGINA PÚBLICA MOSTRA DE CADA ESCONDERIJO
console.log('\n== 4. COMO CADA ESCONDERIJO APARECE ==');
await pagina.keyboard.press('Escape');
await esperar(1200);
const canvas = await pagina.evaluate(() => document.getElementById('ed-canvas')?.innerText || '');
await writeFile('out/eventos-canvas-final.txt', canvas, 'utf8');
const marcas = {
  'features (Marina)': /plano B que eu nem sabia que existia/i,
  'solution (Júlia)': /apaziguou a minha fam/i,
  'tagline (Bruna)': /casamento pequeno parecesse casamento pobre/i,
  'solution (Larissa)': /ainda falam do fim de semana/i,
  'link_note (Camila)': /casa no dia seguinte, intacta|A Clarice devolveu tudo/i,
  'solution (Isabela)': /nenhuma fila/i,
};
for (const [nome, re] of Object.entries(marcas)) {
  console.log(`  ${nome}: aparece no canvas da grade? ${re.test(canvas)}`);
}

console.table(achados);
await writeFile('out/eventos-depoimento.json', JSON.stringify(achados, null, 2), 'utf8');
console.log('\nerros:', erros.length ? [...new Set(erros)].join(' | ') : '(nenhum)');
await navegador.close();
