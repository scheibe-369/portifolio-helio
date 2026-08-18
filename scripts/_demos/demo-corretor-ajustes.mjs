// Ajustes do corretor, depois da primeira passada. Tres coisas, e as tres sao achados:
//
//   1. APAGAR O QUE O KIT ERRADO DEIXOU. "Arquitetura / Interiores" plantou um projeto
//      chamado "Residência de 120 m2" e uma experiencia no "Escritório Exemplo", com o cargo
//      "Arquiteta". Um corretor que escolheu a area mais proxima da dele herda o exemplo de
//      outra profissao e precisa apaga-lo a mao, um a um.
//
//   2. A FOTO DE 140 KB. O apartamento do Campo Belo ficou SEM CAPA porque o pipeline
//      desistiu: ele tenta tres qualidades (0.82, 0.72, 0.62) sempre em 1400px de lado e nunca
//      reduz a resolucao. Foto de interior, que e cheia de textura, estoura o orcamento nas
//      tres. Aqui a MESMA foto sobe reduzida, para provar que o problema e do encoder e nao
//      do arquivo.
//
//   3. O SELO. O kit escreveu "Arquiteta" no card do Wilson e isso foi PUBLICADO no canvas
//      antes de qualquer edicao dele.
//
// Uso: node scripts/_demos/demo-corretor-ajustes.mjs
import { abrirEditor, esperar } from './base.mjs';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

const MIDIA = path.resolve('out/midia/demo-corretor');
const m = (f) => path.join(MIDIA, f);
const G = '#ed-gaveta';
const atrito = [];
const nota = (n, t) => { atrito.push(`[${n}] ${t}`); console.log(`  ! ${n}: ${t}`); };

const { pagina, navegador, erros } = await abrirEditor('demo-corretor', { headless: true });

const abrirPainelPor = async (c) => {
  await pagina.keyboard.press('Escape');
  await esperar(600);
  await pagina.click(`[data-abrir="${c}"]`);
  await esperar(1400);
};
const abrirTodosOsPassos = async () => {
  await pagina.evaluate(() => document.querySelectorAll('#ed-gaveta details').forEach((d) => { d.open = true; }));
  await esperar(300);
};
async function salvar(rot) {
  await pagina.locator('#ed-form-salvar').click();
  for (let i = 0; i < 40; i++) {
    await esperar(500);
    const aberta = await pagina.evaluate(() => document.querySelector('#ed-gaveta')?.classList.contains('is-open'));
    if (!aberta) { console.log(`  salvo: ${rot}`); return true; }
    const msg = await pagina.evaluate(() => document.getElementById('ed-form-msg')?.textContent?.trim() || '');
    if (msg && !/salvando/i.test(msg)) { nota('ERRO-SALVAR', `${rot}: ${msg}`); return false; }
  }
  return false;
}

// ------------------------------------------- 1. apagar os exemplos do kit errado
for (const painel of ['projetos', 'experiencias']) {
  await abrirPainelPor(painel);
  for (let volta = 0; volta < 6; volta++) {
    const alvo = await pagina.evaluate(() => {
      for (const li of [...document.querySelectorAll('#ed-gaveta li.ed-lista-item')]) {
        const txt = (li.innerText || '').toLowerCase();
        if (/exemplo|resid[êe]ncia de 120|escrit[óo]rio exemplo|arquiteta/.test(txt)) {
          return { id: li.dataset.item, texto: (li.innerText || '').trim().replace(/\n/g, ' / ') };
        }
      }
      return null;
    });
    if (!alvo) break;
    console.log(`  apagando de ${painel}: ${alvo.texto}`);
    await pagina.locator(`${G} [data-editar="${alvo.id}"]`).first().click();
    await esperar(1200);
    const apagar = pagina.locator('#ed-form-apagar');
    if (!(await apagar.count())) { nota('AUSENTE', `botao Apagar em ${painel}`); break; }
    await apagar.click(); await esperar(400);
    await apagar.click();
    await esperar(2500);
    await abrirPainelPor(painel);
  }
}
await pagina.keyboard.press('Escape');
await esperar(700);

// ------------------------------------------------- 2. a foto que o encoder recusou
// A mesma imagem, so que 1000px de lado em vez de 1400. Se ela passar, o achado nao e "a
// foto e ruim", e sim "o pipeline nao reduz resolucao antes de desistir".
await abrirPainelPor('projetos');
const idCampoBelo = await pagina.evaluate(() => {
  const li = [...document.querySelectorAll('#ed-gaveta li.ed-lista-item')]
    .find((x) => /campo belo/i.test(x.innerText || ''));
  return li?.dataset.item || '';
});
if (!idCampoBelo) nota('AUSENTE', 'nao achei o imovel do Campo Belo na lista');
else {
  await pagina.locator(`${G} [data-editar="${idCampoBelo}"]`).first().click();
  await esperar(1400);
  await abrirTodosOsPassos();
  await pagina.locator(`${G} [data-campo="image_fit"] select`).first().selectOption('cover');
  await esperar(400);
  await abrirTodosOsPassos();
  await pagina.locator(`${G} [data-arquivo="image"]`).first().setInputFiles(m('im-5-duplex-menor.jpg'));
  let ok = null;
  for (let i = 0; i < 40; i++) {
    await esperar(500);
    ok = await pagina.evaluate(() => {
      const c = document.querySelector('#ed-gaveta [data-campo="image"]');
      const img = c?.querySelector('.ed-drop-previa');
      return { url: img?.src || '', w: img?.naturalWidth || 0, erro: c?.querySelector('[data-erro]')?.textContent?.trim() || '' };
    });
    if (ok.url && ok.w) break;
    if (ok.erro && !/convertendo|enviando/i.test(ok.erro)) { nota('ERRO-UPLOAD', `menor tambem falhou: ${ok.erro}`); break; }
  }
  if (ok?.w) {
    console.log(`  a MESMA foto, reduzida antes de subir, passou: ${ok.w}px`);
    nota('DEFEITO', 'a foto de interior de 1400px estourou os 140 KB nas tres qualidades e o upload falhou; a MESMA foto reduzida a mao passou de primeira. O pipeline nunca reduz resolucao antes de desistir, e a mensagem manda o comprador "tentar uma imagem mais simples".');
  }
  await abrirTodosOsPassos();
  await salvar('Duplex no Campo Belo (foto)');
}
await esperar(1000);
await pagina.keyboard.press('Escape');
await esperar(700);

const canvas = await pagina.evaluate(() => document.getElementById('ed-canvas')?.innerText || '');
await writeFile('out/corretor-canvas-limpo.txt', canvas, 'utf8');
await pagina.screenshot({ path: 'out/corretor-canvas-limpo.png', fullPage: true });
console.log(`\n${canvas.slice(0, 2200)}`);

console.log(`\n== ATRITO ==\n${atrito.join('\n') || '(nenhum)'}`);
console.log(`\n== ERROS ==\n${[...new Set(erros)].join('\n') || '(nenhum)'}`);
await navegador.close();
