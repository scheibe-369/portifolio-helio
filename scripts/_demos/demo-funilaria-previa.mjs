// Leitura da página como o cliente do Zé Ricardo a veria, pelo LINK DE PRÉVIA.
//
// A publicação caiu na fila de conferência (esperado para a primeira de cada conta), então o
// endereço público responde "esta página está quase no ar". A prévia é o mesmo render com o
// mesmo dado, e é o único jeito de medir hoje o que o teste desta persona precisa medir:
// o par antes/depois na janela do serviço, em 1440 e em 375.
import { abrirEditor, esperar } from './base.mjs';
import { writeFile } from 'node:fs/promises';

const { pagina, navegador, demo, APEX } = await abrirEditor('demo-funilaria', { headless: true });

await pagina.click('[data-abrir="publicar"]');
await esperar(1500);
const btnPrevia = pagina.locator('#ed-gaveta button', { hasText: /Gerar link de prévia/i }).first();
await btnPrevia.click();
await esperar(6000);
const texto = await pagina.evaluate(() => document.querySelector('#ed-gaveta')?.innerText || '');
await writeFile('out/funil-previa-painel.txt', texto, 'utf8');
const link = (texto.match(/https?:\/\/\S+/g) || []).find((u) => /previa|preview|p=/.test(u))
  || await pagina.evaluate(() => {
    const i = document.querySelector('#ed-gaveta input[readonly], #ed-gaveta [data-previa-link]');
    return i ? (i.value || i.textContent || '').trim() : '';
  });
console.log('link de prévia:', link || '(não achei)');
if (!link) { console.log(texto); await navegador.close(); process.exit(1); }

const url = link.startsWith('http') ? link : `${APEX}${link}`;

async function medir(largura, altura, tag) {
  const p = await pagina.context().newPage();
  await p.setViewportSize({ width: largura, height: altura });
  const errosPub = [];
  p.on('pageerror', (e) => errosPub.push(String(e).slice(0, 200)));
  p.on('console', (m) => { if (m.type() === 'error') errosPub.push(m.text().slice(0, 200)); });
  const r = await p.goto(url, { waitUntil: 'networkidle' });
  console.log(`\n[${tag}] HTTP ${r.status()}`);
  await esperar(2000);
  await p.screenshot({ path: `out/funil-publico-${tag}.png`, fullPage: true });
  if (tag === '1440') await writeFile('out/funil-publico-texto.txt', await p.evaluate(() => document.body.innerText), 'utf8');

  // Abre a janela do primeiro serviço e mede o par antes/depois.
  const card = p.locator(`.project-card[data-slug]`).first();
  if (await card.count()) {
    await card.click();
    await esperar(2500);
    await p.screenshot({ path: `out/funil-modal-${tag}.png` });
    const dados = await p.evaluate(() => {
      const dlg = document.querySelector('[role="dialog"]');
      if (!dlg) return { semJanela: true };
      const grade = [...dlg.querySelectorAll('div')].find((d) => d.className.includes('grid-cols-1') && d.querySelector('img'));
      const imgs = [...dlg.querySelectorAll('img')].map((i) => {
        const r = i.getBoundingClientRect();
        return { alt: i.alt, arquivo: i.src.split('/').pop().split('?')[0], natural: `${i.naturalWidth}x${i.naturalHeight}`, caixa: `${Math.round(r.width)}x${Math.round(r.height)}`, topo: Math.round(r.top + window.scrollY) };
      });
      return {
        colunasDaGaleria: grade ? getComputedStyle(grade).gridTemplateColumns : '(não achei a grade)',
        imgs,
        textoDaJanela: dlg.innerText,
      };
    });
    console.log(JSON.stringify({ colunas: dados.colunasDaGaleria, imgs: dados.imgs }, null, 2));
    await writeFile(`out/funil-galeria-${tag}.json`, JSON.stringify(dados, null, 2), 'utf8');
  } else console.log('  não achei card de serviço');
  if (errosPub.length) console.log('  erros:', [...new Set(errosPub)].join(' | '));
  await writeFile(`out/funil-erros-publico-${tag}.txt`, [...new Set(errosPub)].join('\n') || '(nenhum)', 'utf8');
  await p.close();
}

await medir(1440, 900, '1440');
await medir(375, 812, '375');

// O EDITOR no telefone: é ele que precisa funcionar, porque o telefone é o único aparelho dele.
const p3 = await pagina.context().newPage();
await p3.setViewportSize({ width: 375, height: 812 });
await p3.goto(`${APEX}/app?cb=${Date.now()}`, { waitUntil: 'networkidle' });
await esperar(4000);
await p3.screenshot({ path: 'out/funil-editor-375.png', fullPage: true });
const medidas = await p3.evaluate(() => ({
  scrollWidth: document.documentElement.scrollWidth,
  innerWidth: window.innerWidth,
  alvos: [...document.querySelectorAll('[data-abrir]')].map((b) => {
    const r = b.getBoundingClientRect();
    return { alvo: b.dataset.abrir, w: Math.round(r.width), h: Math.round(r.height) };
  }),
}));
console.log('\neditor em 375:', JSON.stringify(medidas));
await p3.click('[data-abrir="perfil"]');
await esperar(2500);
await p3.screenshot({ path: 'out/funil-editor-375-perfil.png', fullPage: true });
const gaveta = await p3.evaluate(() => {
  const g = document.querySelector('#ed-gaveta');
  if (!g) return { existe: false };
  const r = g.getBoundingClientRect();
  const bio = g.querySelector('[data-campo="bio"] textarea');
  const rb = bio?.getBoundingClientRect();
  return {
    existe: true, larguraGaveta: Math.round(r.width), pctTela: Math.round((r.width / window.innerWidth) * 100),
    alturaGaveta: Math.round(r.height), campos: g.querySelectorAll('.ed-field').length,
    alturaTextareaBio: rb ? Math.round(rb.height) : null,
    scrollDaGaveta: g.scrollHeight,
    canvasVisivelAtras: Math.round(window.innerWidth - r.width),
  };
});
console.log('gaveta em 375:', JSON.stringify(gaveta));
await writeFile('out/funil-editor-375.json', JSON.stringify({ medidas, gaveta }, null, 2), 'utf8');

// Tenta de fato digitar no telefone, que é o gesto real dele.
try {
  const bio = p3.locator('#ed-gaveta [data-campo="bio"] textarea').first();
  await bio.click();
  await bio.type('teste ', { delay: 30 });
  await esperar(500);
  await p3.screenshot({ path: 'out/funil-editor-375-digitando.png', fullPage: false });
  console.log('digitar no celular: ok');
} catch (e) { console.log('digitar no celular FALHOU:', e.message.slice(0, 150)); }
await p3.close();

await navegador.close();
