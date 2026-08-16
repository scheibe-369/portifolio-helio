// Segunda passada da Sonia: conserta o que a primeira deixou torto e prova as hipoteses que
// a primeira levantou. Cada bloco aqui existe por causa de uma linha do relatorio.
import { abrirEditor, esperar } from './base.mjs';
import { writeFileSync } from 'node:fs';

const linhas = [];
const log = (...a) => { const s = a.map(String).join(' '); linhas.push(s); console.log(s); };
const gravar = () => writeFileSync('out/conf-ajustes.txt', linhas.join('\n'), 'utf8');

const { pagina, navegador, erros } = await abrirEditor('demo-confeitaria');
log('# AJUSTES demo-confeitaria', new Date().toISOString());

const abrirSecao = async (titulo) => {
  await pagina.evaluate((tt) => {
    [...document.querySelectorAll('#ed-gaveta details')].forEach((d) => {
      if (d.querySelector('.ed-passo-titulo')?.innerText.trim().toLowerCase() === tt.toLowerCase()) d.open = true;
    });
  }, titulo);
  await esperar(300);
};
const fechar = async () => { await pagina.keyboard.press('Escape'); await esperar(600); };
async function salvar(rot) {
  await pagina.click('#ed-form-salvar');
  try {
    await pagina.waitForFunction(() => !document.querySelector('#ed-gaveta')?.classList.contains('is-open'), { timeout: 30000 });
    log(`  salvou: ${rot}`);
    await esperar(800);
    return true;
  } catch {
    log(`  !! nao salvou ${rot}: ` + await pagina.locator('#ed-form-msg').innerText().catch(() => ''));
    return false;
  }
}

// ===================================================== A. O SWITCH "AINDA ESTOU CURSANDO"
log('\n\n===== A. por que o "até" nunca apareceu no curso =====');
await pagina.click('[data-abrir="experiencias"]');
await esperar(1000);
const lista = await pagina.locator('#ed-gaveta .ed-lista-item').count();
log(`  entradas na lista: ${lista}`);
// A segunda entrada e o Senac (curso concluido em 11/2011).
await pagina.locator('[data-editar]').nth(1).click();
await esperar(1000);
const antesDoClique = await pagina.evaluate(() => ({
  temSwitchAtual: Boolean(document.querySelector('[data-switch="atual"]')),
  ligado: document.querySelector('[data-switch="atual"]')?.getAttribute('aria-checked'),
  rotulo: document.querySelector('[data-campo="atual"] .ed-label')?.innerText.trim(),
  temPeriodEnd: Boolean(document.querySelector('#ed-period_end')),
}));
log('  antes de clicar no switch: ' + JSON.stringify(antesDoClique));
await pagina.click('[data-switch="atual"]');
await esperar(1200);
const depoisDoClique = await pagina.evaluate(() => ({
  ligado: document.querySelector('[data-switch="atual"]')?.getAttribute('aria-checked'),
  temPeriodEnd: Boolean(document.querySelector('#ed-period_end')),
  rotuloFim: document.querySelector('[data-campo="period_end"] .ed-label')?.innerText.trim() || null,
}));
log('  depois de clicar no switch: ' + JSON.stringify(depoisDoClique));
if (depoisDoClique.temPeriodEnd) {
  await pagina.fill('#ed-period_end', '11/2011');
  await esperar(400);
  log('  preenchi "Até" = 11/2011');
  await salvar('Senac com data de fim');
} else {
  log('  !! BLOQUEIO: o campo "Até" nao nasce nem depois de desligar o switch');
  await fechar();
}

// terceira entrada, o curso de 2018
await pagina.click('[data-abrir="experiencias"]');
await esperar(900);
await pagina.locator('[data-editar]').nth(2).click();
await esperar(900);
const estado3 = await pagina.evaluate(() => document.querySelector('[data-switch="atual"]')?.getAttribute('aria-checked'));
log(`  terceira entrada, switch "Ainda estou cursando" = ${estado3}`);
if (estado3 === 'true') { await pagina.click('[data-switch="atual"]'); await esperar(1000); }
if (await pagina.locator('#ed-period_end').count()) {
  await pagina.fill('#ed-period_end', '2018');
  await esperar(300);
  await salvar('Ateliê com data de fim');
} else { log('  !! sem campo "Até" tambem aqui'); await fechar(); }

// ============================================= B. O CAMPO QUE SO NASCE DEPOIS DE UM REPINTE
log('\n\n===== B. "Observação sobre o link" e o repinte =====');
await pagina.click('[data-abrir="projetos"]');
await esperar(900);
await pagina.locator('[data-editar]').first().click();
await esperar(900);
await abrirSecao('Provas');
const b1 = await pagina.evaluate(() => ({
  link: document.querySelector('#ed-link')?.value || '',
  temNota: Boolean(document.querySelector('[data-campo="link_note"]')),
}));
log('  ao abrir um projeto que JA tem link salvo: ' + JSON.stringify(b1));
// agora limpa e redigita, para ver se o campo nasce durante a digitacao
await pagina.fill('#ed-link', '');
await esperar(500);
const b2 = await pagina.evaluate(() => Boolean(document.querySelector('[data-campo="link_note"]')));
await pagina.fill('#ed-link', 'https://instagram.com/soniaprazeres.bolos');
await esperar(800);
const b3 = await pagina.evaluate(() => Boolean(document.querySelector('[data-campo="link_note"]')));
log(`  depois de apagar o link, o campo de observacao continua na tela? ${b2}`);
log(`  depois de digitar o link de novo, o campo de observacao aparece na hora? ${b3}`);
if (b3) { await pagina.fill('#ed-link_note', 'Preços e fotos novas todo dia no meu Instagram'); await esperar(300); }
await salvar('projeto 1 com observação do link');

// ============================================ C. AS ANCORAS DE "EDITAR" DA EXPERIENCIA
log('\n\n===== C. os botões "Editar" da experiência =====');
const ancoras = await pagina.evaluate(() => {
  const sec = document.querySelector('#experiencia');
  if (!sec) return { erro: 'sem secao' };
  return {
    totalLiDiretos: sec.querySelectorAll('ul > li').length,
    entradasReais: sec.querySelectorAll('ul.flex.flex-col.gap-0 > li, ul > li.flex.gap-3\\.5').length,
    alvos: [...sec.querySelectorAll('[data-edit^="experiencia:"]')].map((b) => {
      const li = b.closest('li');
      return { alvo: b.dataset.edit, dentroDe: (li?.innerText || '').slice(0, 60).replace(/\n/g, ' ') };
    }),
  };
});
log('  ' + JSON.stringify(ancoras, null, 2));

// ============================================ D. O ÍCONE DO SELO NO EDITOR
log('\n\n===== D. o ícone do selo (bolo) =====');
const selo = await pagina.evaluate(() => {
  const b = document.querySelector('#ed-canvas .vibecoder-btn');
  return b ? { html: b.innerHTML.trim().slice(0, 200), temSvg: Boolean(b.querySelector('svg')), texto: b.innerText.trim() } : null;
});
log('  selo no canvas do editor: ' + JSON.stringify(selo));

// ============================================ E. O MODAL DO TRABALHO (visão do cliente)
log('\n\n===== E. o modal que o cliente abre ao clicar num bolo =====');
await pagina.evaluate(() => document.body.classList.remove('is-editing'));
await esperar(400);
await pagina.locator('#ed-canvas .project-card').first().click();
await esperar(1500);
const modal = await pagina.evaluate(() => {
  const m = document.querySelector('#project-modal');
  return m ? m.innerText : '(sem modal)';
});
log('  --- texto do modal ---\n' + modal.split('\n').map((l) => '  | ' + l).join('\n'));
await pagina.screenshot({ path: 'out/conf-14-modal-do-bolo.png' });
await pagina.keyboard.press('Escape');
await esperar(600);
await pagina.evaluate(() => document.body.classList.add('is-editing'));

// ============================================ F. PREVIA (o que o review ainda esconde)
log('\n\n===== F. link de prévia =====');
await pagina.click('[data-abrir="publicar"]');
await esperar(1200);
await pagina.click('[data-girar-previa]');
await esperar(3000);
const urlPrevia = await pagina.inputValue('[data-previa-url]').catch(() => '');
log('  url de prévia: ' + (urlPrevia || '(nao gerou)'));
const barra = await pagina.evaluate(() => document.querySelector('.ed-barra-status')?.innerText.trim());
log('  status na barra de cima depois de publicar: "' + barra + '"');
await fechar();

if (urlPrevia) {
  const p2 = await pagina.context().newPage();
  const r = await p2.goto(urlPrevia, { waitUntil: 'networkidle' }).catch((e) => ({ err: String(e) }));
  log('  prévia -> HTTP ' + (r?.status?.() ?? r?.err));
  await esperar(2000);
  await p2.screenshot({ path: 'out/conf-15-previa-publica.png', fullPage: true });
  const txt = await p2.evaluate(() => document.body.innerText);
  log('  --- texto da prévia ---\n' + txt.split('\n').map((l) => '  | ' + l).join('\n'));
  const seloPub = await p2.evaluate(() => {
    const b = document.querySelector('.vibecoder-btn');
    return b ? { temSvg: Boolean(b.querySelector('svg')), temI: Boolean(b.querySelector('i[data-lucide]')), texto: b.innerText.trim() } : null;
  });
  log('  selo na página publicada: ' + JSON.stringify(seloPub));
  const botao = await p2.evaluate(() => {
    const a = document.querySelector('.bookmarkBtn');
    if (!a) return null;
    const p = a.querySelector('.btn-text');
    return {
      texto: p?.innerText.trim(),
      larguraDoTexto: p?.scrollWidth,
      larguraVisivel: p?.clientWidth,
      cortado: (p?.scrollWidth || 0) > (p?.clientWidth || 0) + 1,
      href: a.getAttribute('href'),
    };
  });
  log('  botão principal na página publicada: ' + JSON.stringify(botao));
  const redes = await p2.evaluate(() => [...document.querySelectorAll('a.glass-button')].map((a) => ({
    texto: a.innerText.replace(/\n/g, ' ').trim(),
    altura: a.getBoundingClientRect().height,
  })));
  log('  linhas de redes sociais: ' + JSON.stringify(redes));
  await p2.close();
}

// ================================== G. O MESMO EDITOR PARA QUEM NAO COMPROU A PERSONALIZACAO
log('\n\n===== G. o editor de quem comprou SÓ o produto base (has_custom = false) =====');
const p3 = await pagina.context().newPage();
await p3.route('**/rest/v1/**', async (rota) => {
  const req = rota.request();
  if (!/has_custom/.test(req.url())) return rota.continue();
  const resp = await rota.fetch();
  let corpo = await resp.text();
  try {
    const j = JSON.parse(corpo);
    const forcar = (o) => (o && typeof o === 'object' ? { ...o, has_custom: false } : o);
    corpo = JSON.stringify(Array.isArray(j) ? j.map(forcar) : forcar(j));
  } catch { /* deixa passar */ }
  return rota.fulfill({ response: resp, body: corpo });
});
await p3.goto(`https://myportifolio.com.br/app?cb=${Date.now()}`, { waitUntil: 'networkidle' });
await esperar(4000);
await p3.click('[data-abrir="perfil"]').catch(() => {});
await esperar(1500);
await p3.evaluate(() => { document.querySelectorAll('#ed-gaveta details').forEach((d) => { d.open = true; }); });
await esperar(500);
const semBump = await p3.evaluate(() => [...document.querySelectorAll('#ed-gaveta .ed-field')]
  .filter((f) => f.querySelector('.ed-lock'))
  .map((f) => ({
    campo: f.dataset.campo,
    rotulo: (f.querySelector('.ed-label')?.innerText || '').replace(/\n/g, ' ').trim(),
    inputDesabilitado: Boolean(f.querySelector('input')?.disabled),
    valorMostrado: f.querySelector('input')?.value ?? null,
  })));
log('  campos com cadeado para quem NÃO comprou:\n' + JSON.stringify(semBump, null, 2));
await p3.screenshot({ path: 'out/conf-16-sem-personalizacao.png' });
await p3.close();

log('\n\n===== ERROS =====');
log(erros.length ? erros.join('\n') : '  (nenhum)');
gravar();
await pagina.screenshot({ path: 'out/conf-17-canvas-final.png', fullPage: true });
await navegador.close();
console.log('\n>>> log em out/conf-ajustes.txt');
