// Conferencia final da persona chef: onde os lapis de edicao caem na secao de experiencia,
// o que o pipeline fez com cada imagem, se a personalizacao esta ligada, e como a pagina
// publicada/previa esta de fato.
import { abrirEditor, esperar } from './base.mjs';
import { writeFile } from 'node:fs/promises';

const { pagina, navegador, erros } = await abrirEditor('demo-chef', { headless: true });

// 1. Ancoragem dos lapis dentro da secao de experiencia -----------------------
const ancoras = await pagina.evaluate(() => {
  const sec = document.querySelector('#ed-canvas #experiencia');
  if (!sec) return { erro: 'secao de experiencia nao existe no canvas' };
  const lis = [...sec.querySelectorAll('ul > li')];
  return {
    totalLis: lis.length,
    lis: lis.map((li) => ({
      texto: (li.innerText || '').replace(/\s+/g, ' ').slice(0, 55),
      alvo: li.querySelector('[data-edit]')?.dataset.edit || null,
      pai: li.parentElement.className.slice(0, 40),
    })),
  };
});
console.log('=== LAPIS NA SECAO DE EXPERIENCIA ===');
console.log(JSON.stringify(ancoras, null, 1));

// 2. As imagens que o pipeline gerou -----------------------------------------
const imgs = await pagina.evaluate(() => [...document.querySelectorAll('#ed-canvas .project-card img')]
  .map((i) => ({ slug: i.closest('.project-card')?.dataset.slug, w: i.naturalWidth, h: i.naturalHeight, fit: getComputedStyle(i).objectFit })));
console.log('\n=== IMAGENS DOS CARDS ===');
console.log(JSON.stringify(imgs, null, 1));

const hero = await pagina.evaluate(() => {
  const i = document.querySelector('#ed-canvas img[alt*="Marina"], #ed-canvas .grid img');
  return i ? { src: i.src.split('/').pop(), w: i.naturalWidth, h: i.naturalHeight, pos: getComputedStyle(i).objectPosition } : null;
});
console.log('\nhero:', JSON.stringify(hero));

// 3. Personalizacao esta ligada? ---------------------------------------------
await pagina.click('[data-abrir="perfil"]');
await esperar(1500);
await pagina.evaluate(() => document.querySelectorAll('#ed-gaveta details[data-passo]').forEach((d) => { d.open = true; }));
await esperar(400);
const custom = await pagina.evaluate(() => {
  const cor = document.querySelector('#ed-gaveta [data-cor="theme_accent"]');
  const cta = document.querySelector('#ed-gaveta [data-campo="cta_label"] input');
  return {
    corExiste: Boolean(cor), corDesabilitada: cor?.disabled,
    ctaDesabilitado: cta?.disabled, ctaValor: cta?.value,
    pilulasDeCadeado: [...document.querySelectorAll('#ed-gaveta .ed-lock')].map((e) => e.closest('.ed-field')?.querySelector('.ed-label')?.textContent?.trim().replace(/\s+/g, ' ')),
  };
});
console.log('\n=== PERSONALIZACAO ===');
console.log(JSON.stringify(custom, null, 1));
await pagina.keyboard.press('Escape');
await esperar(800);

// 4. Link de previa e a pagina real -------------------------------------------
await pagina.click('[data-abrir="publicar"]');
await esperar(1800);
await pagina.locator('#ed-gaveta [data-girar-previa]').first().click();
await esperar(3000);
const urlPrevia = await pagina.evaluate(() => document.querySelector('#ed-gaveta [data-previa-url]')?.value || '');
console.log('\nprevia:', urlPrevia);
await writeFile('out/chef-previa-url.txt', urlPrevia, 'utf8');

if (urlPrevia) {
  const p2 = await pagina.context().newPage();
  const r = await p2.goto(urlPrevia, { waitUntil: 'networkidle' });
  console.log('previa HTTP', r?.status());
  await esperar(2500);
  await p2.screenshot({ path: 'out/chef-previa-topo.png' });
  await p2.screenshot({ path: 'out/chef-previa-inteira.png', fullPage: true });
  const txt = await p2.evaluate(() => document.body.innerText);
  await writeFile('out/chef-previa.txt', txt, 'utf8');
  console.log('\n=== PREVIA (primeiros 900) ===\n' + txt.slice(0, 900));

  // O card do trabalho com video: o modal existe e o iframe nasce?
  const cardVideo = p2.locator('.project-card[data-slug="moqueca-de-curral"]');
  if (await cardVideo.count()) {
    await cardVideo.first().click();
    await esperar(2500);
    const modal = await p2.evaluate(() => {
      const el = document.querySelector('#project-modal');
      const ifr = el?.querySelector('iframe');
      return { aberto: Boolean(el && !el.classList.contains('hidden')), iframe: ifr?.src || null, texto: (el?.innerText || '').replace(/\s+/g, ' ').slice(0, 700) };
    });
    console.log('\n=== MODAL DO TRABALHO COM VIDEO ===');
    console.log(JSON.stringify(modal, null, 1));
    await p2.screenshot({ path: 'out/chef-modal-video.png' });
  }
  await p2.close();
}

// 5. O endereco publico -------------------------------------------------------
const p3 = await pagina.context().newPage();
const rp = await p3.goto('https://demo-chef.myportifolio.com.br/', { waitUntil: 'domcontentloaded' }).catch((e) => ({ status: () => String(e).slice(0, 120) }));
console.log('\npublico HTTP', typeof rp?.status === 'function' ? rp.status() : rp);
const corpoPub = await p3.evaluate(() => document.body.innerText.slice(0, 600)).catch(() => '(sem corpo)');
console.log('publico diz:\n' + corpoPub);
await p3.screenshot({ path: 'out/chef-publico.png' });
await writeFile('out/chef-publico.txt', corpoPub, 'utf8');
await p3.close();

console.log('\nERROS:', [...new Set(erros)].join('\n') || '(nenhum)');
await navegador.close();
