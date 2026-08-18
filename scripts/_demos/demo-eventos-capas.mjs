// Segunda passada de mídia: as fotos que o orçamento de 140 KB recusou.
//
// Quatro das seis capas de casamento e três fotos de galeria foram RECUSADAS pelo pipeline
// ("nao consegui deixar esta imagem abaixo de 140 KB"). Foto de casamento é o pior caso
// possível para um orçamento de bytes: multidão, folhagem, renda, bokeh e luz baixa, tudo com
// ruído fino, que é o que WebP não comprime.
//
// Este script mede o PREÇO DA VOLTA: com que largura a mesma foto passa. É o trabalho que o
// produto empurra para uma cerimonialista que não sabe o que é redimensionar.
//
// Uso: node scripts/_demos/demo-eventos-capas.mjs
import { abrirEditor, esperar } from './base.mjs';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

const MIDIA = path.resolve('out/midia/demo-eventos');
const G = '#ed-gaveta';
const esc = (s) => s;

// [projeto, campo, arquivo base]. As larguras são tentadas da maior para a menor.
const FALTANDO = [
  ['Marina e Tiago, na Serra do Cipó', 'image', 'ev1-capa'],
  ['Bruna e Otávio, mini wedding', 'image', 'ev3-capa'],
  ['Larissa e Diego, em Tiradentes', 'image', 'ev4-capa'],
  ['Camila e Pedro, em Nova Lima', 'image', 'ev5-capa'],
  ['Júlia e Rafael, Igreja São José', 'gallery_4', 'ev2-g4'],
  ['Camila e Pedro, em Nova Lima', 'gallery_2', 'ev5-g2'],
  ['Isabela e Gustavo, festa à noite', 'gallery_2', 'ev6-g2'],
];
const LARGURAS = ['', '-w1100', '-w900', '-w700'];

const { pagina, navegador, erros, APEX } = await abrirEditor('demo-eventos', { headless: true });
const placar = [];

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

async function tentar(campo, arquivo) {
  const inp = pagina.locator(`${G} [data-arquivo="${campo}"]`).first();
  if (!(await inp.count())) return { erro: 'campo não existe' };
  await inp.setInputFiles(path.join(MIDIA, arquivo));
  for (let i = 0; i < 40; i++) {
    await esperar(500);
    const r = await pagina.evaluate((k) => {
      const c = document.querySelector(`#ed-gaveta [data-campo="${k}"]`);
      const img = c?.querySelector('.ed-drop-previa');
      return { url: img?.src || '', w: img?.naturalWidth || 0, erro: c?.querySelector('[data-erro]')?.textContent?.trim() || '' };
    }, campo);
    if (r.url && r.w) return { ok: true, w: r.w };
    if (r.erro && !/convertendo|enviando/i.test(r.erro)) return { erro: r.erro };
  }
  return { erro: 'timeout' };
}

for (const [projeto, campo, base] of FALTANDO) {
  console.log(`\n-> ${projeto} / ${campo}`);
  await abrirPainelPor('projetos');
  const item = pagina.locator(`${G} .ed-lista-item`, { hasText: esc(projeto) }).first();
  if (!(await item.count())) { console.log('   projeto não achado na lista'); continue; }
  await item.locator('[data-editar]').first().click();
  await esperar(1500);
  await abrirPassos();

  let venceu = null;
  for (const suf of LARGURAS) {
    const arquivo = `${base}${suf}.jpg`;
    await abrirPassos();
    const r = await tentar(campo, arquivo);
    const rotulo = suf ? suf.replace('-w', '') : '1400';
    console.log(`   ${rotulo}px: ${r.ok ? `ACEITA (${r.w}px)` : `recusada (${r.erro})`}`);
    if (r.ok) { venceu = rotulo; break; }
  }
  placar.push({ projeto, campo, arquivo: base, passouEm: venceu, tentativas: LARGURAS.length });

  await abrirPassos();
  const btn = pagina.locator('#ed-form-salvar');
  if (await btn.count()) {
    await btn.click();
    for (let i = 0; i < 40; i++) {
      await esperar(500);
      if (!(await pagina.evaluate(() => document.querySelector('#ed-gaveta')?.classList.contains('is-open')))) break;
    }
    console.log('   salvo');
  }
  await esperar(1000);
}

console.table(placar);
await writeFile('out/eventos-placar-capas.json', JSON.stringify(placar, null, 2), 'utf8');
console.log('\nerros:', erros.length ? [...new Set(erros)].join(' | ') : '(nenhum)');
console.log(`página: ${APEX}`);
await navegador.close();
