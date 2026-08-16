// A Sonia edita pelo celular, porque o celular e o aparelho dela. 375x812, que e um iPhone
// pequeno, o mais comum na faixa dela. Mede tres coisas: da para achar, da para tocar e da
// para escrever sem a tela se remontar embaixo do dedo.
import { abrirEditor, esperar } from './base.mjs';
import { writeFileSync } from 'node:fs';

const linhas = [];
const log = (...a) => { const s = a.map(String).join(' '); linhas.push(s); console.log(s); };
const gravar = () => writeFileSync('out/conf-celular.txt', linhas.join('\n'), 'utf8');

const { pagina, navegador, erros } = await abrirEditor('demo-confeitaria');
log('# CELULAR demo-confeitaria', new Date().toISOString());

await pagina.setViewportSize({ width: 375, height: 812 });
await esperar(2000);
await pagina.screenshot({ path: 'out/conf-20-celular-canvas.png', fullPage: false });
await pagina.screenshot({ path: 'out/conf-21-celular-canvas-inteiro.png', fullPage: true });

// --- a barra de cima cabe?
const barra = await pagina.evaluate(() => {
  const b = document.querySelector('#ed-barra');
  if (!b) return null;
  const r = b.getBoundingClientRect();
  return {
    alturaDaBarra: Math.round(r.height),
    larguraDaBarra: Math.round(r.width),
    rolaNaHorizontal: b.scrollWidth > b.clientWidth + 1,
    scrollWidth: b.scrollWidth,
    clientWidth: b.clientWidth,
    botoes: [...b.querySelectorAll('button, a')].map((e) => {
      const rr = e.getBoundingClientRect();
      return {
        texto: (e.innerText || '').trim().slice(0, 24),
        x: Math.round(rr.x), y: Math.round(rr.y), l: Math.round(rr.width), a: Math.round(rr.height),
        visivelNaTela: rr.x >= 0 && rr.right <= window.innerWidth && rr.height > 0,
        alvoMenorQue44px: rr.height < 44,
      };
    }),
  };
});
log('\n## BARRA DE CIMA NO CELULAR');
log(JSON.stringify(barra, null, 2));
const forasDaTela = (barra?.botoes || []).filter((b) => !b.visivelNaTela);
log(`  botões que NÃO cabem na largura da tela: ${forasDaTela.length} -> ${JSON.stringify(forasDaTela.map((b) => b.texto))}`);
const pequenos = (barra?.botoes || []).filter((b) => b.alvoMenorQue44px);
log(`  botões com altura abaixo dos 44 px de alvo de toque: ${JSON.stringify(pequenos.map((b) => `${b.texto} (${b.a}px)`))}`);

// --- a pagina rola de lado?
const rolagemH = await pagina.evaluate(() => ({
  bodyScrollWidth: document.body.scrollWidth,
  janela: window.innerWidth,
  rolaDeLado: document.body.scrollWidth > window.innerWidth + 1,
}));
log('\n## ROLAGEM HORIZONTAL DA PÁGINA: ' + JSON.stringify(rolagemH));

// --- a gaveta no celular
log('\n## A GAVETA DE EDIÇÃO NO CELULAR');
await pagina.click('[data-abrir="perfil"]').catch(async (e) => log('  !! nao consegui tocar em "Perfil": ' + String(e).slice(0, 160)));
await esperar(1500);
await pagina.screenshot({ path: 'out/conf-22-celular-perfil.png' });
const gav = await pagina.evaluate(() => {
  const g = document.querySelector('#ed-gaveta .ed-gaveta-painel');
  if (!g) return null;
  const r = g.getBoundingClientRect();
  const corpo = document.querySelector('.ed-gaveta-corpo');
  return {
    ocupaDaTela: `${Math.round(r.width)}x${Math.round(r.height)} de ${window.innerWidth}x${window.innerHeight}`,
    alturaVisivelDoFormulario: Math.round(corpo?.getBoundingClientRect().height || 0),
    precisaRolarQuanto: corpo ? Math.round(corpo.scrollHeight / corpo.clientHeight * 100) / 100 : null,
    rodapeFixo: Boolean(document.querySelector('.ed-gaveta-rodape')),
  };
});
log('  ' + JSON.stringify(gav, null, 2));

// --- quanto tempo custa UMA tecla dentro do formulario
// Cada input dispara aoMudar(), e aoMudar() do editor repinta a CASCA e o CANVAS inteiros.
log('\n## CUSTO DE DIGITAR (o canvas inteiro e repintado a cada tecla)');
await pagina.evaluate(() => {
  window.__repintes = 0;
  const alvo = document.getElementById('app');
  window.__obs = new MutationObserver((ms) => { ms.forEach((m) => { if (m.target === alvo) window.__repintes += 1; }); });
  window.__obs.observe(alvo, { childList: true });
});
const t1 = Date.now();
await pagina.type('#ed-badge_label', 'Confeiteira', { delay: 60 });
const dt = Date.now() - t1;
const repintes = await pagina.evaluate(() => window.__repintes);
log(`  digitar 11 letras no campo "Selo do seu perfil": ${dt} ms, com ${repintes} repintes do #app inteiro`);
log('  (cada repinte reexecuta renderPortfolioPage: perfil + 6 cards + experiência + stacks)');

// --- o switch e o campo que so nasce depois dele
log('\n## O CAMPO QUE NASCE DEPOIS DE UM TOQUE');
await pagina.keyboard.press('Escape');
await esperar(700);
await pagina.click('[data-abrir="experiencias"]');
await esperar(1200);
await pagina.click('[data-adicionar]');
await esperar(1200);
const antes = Date.now();
await pagina.click('[data-switch="atual"]');
let apareceu = -1;
for (let i = 0; i < 40; i += 1) {
  if (await pagina.locator('#ed-period_end').count()) { apareceu = Date.now() - antes; break; }
  await esperar(100);
}
log(`  depois de tocar em "Estou aqui até hoje", o campo "Até" apareceu em ${apareceu === -1 ? 'NUNCA (4 s)' : apareceu + ' ms'}`);
await pagina.screenshot({ path: 'out/conf-23-celular-experiencia.png' });
await pagina.keyboard.press('Escape');
await esperar(700);

// --- o formulario de um bolo no celular
log('\n## CADASTRAR UM BOLO PELO CELULAR');
await pagina.click('[data-abrir="projetos"]');
await esperar(1200);
await pagina.screenshot({ path: 'out/conf-24-celular-lista-bolos.png' });
await pagina.locator('[data-editar]').first().click();
await esperar(1200);
await pagina.screenshot({ path: 'out/conf-25-celular-bolo.png' });
const form = await pagina.evaluate(() => {
  const corpo = document.querySelector('.ed-gaveta-corpo');
  const campos = [...corpo.querySelectorAll('.ed-field')];
  return {
    camposVisiveisSemRolar: campos.filter((f) => f.getBoundingClientRect().top < window.innerHeight).length,
    camposNoTotalDoPasso1: campos.length,
    alturaDoFormulario: corpo.scrollHeight,
    alturaDaTela: window.innerHeight,
    telasDeRolagem: Math.round((corpo.scrollHeight / window.innerHeight) * 10) / 10,
    secoesRecolhidas: [...corpo.querySelectorAll('details')].map((d) => ({
      titulo: d.querySelector('.ed-passo-titulo')?.innerText.trim(), aberta: d.open,
    })),
  };
});
log('  ' + JSON.stringify(form, null, 2));
await pagina.keyboard.press('Escape');
await esperar(600);

// --- e a pagina publicada, no celular do cliente dela
log('\n## A PÁGINA COMO O CLIENTE DELA VÊ, NO CELULAR');
await pagina.click('[data-abrir="publicar"]');
await esperar(1200);
await pagina.click('[data-girar-previa]');
await esperar(3500);
const urlPrevia = await pagina.inputValue('[data-previa-url]').catch(() => '');
log('  prévia: ' + urlPrevia);
await pagina.keyboard.press('Escape');

if (urlPrevia) {
  const cel = await pagina.context().newPage();
  await cel.setViewportSize({ width: 375, height: 812 });
  await cel.goto(urlPrevia, { waitUntil: 'networkidle' });
  await esperar(2500);
  await cel.screenshot({ path: 'out/conf-26-celular-publica.png', fullPage: true });
  const medidas = await cel.evaluate(() => {
    const btn = document.querySelector('.bookmarkBtn');
    const p = btn?.querySelector('.btn-text');
    return {
      rolaDeLado: document.body.scrollWidth > window.innerWidth + 1,
      botao: btn ? {
        texto: p?.innerText.trim(),
        larguraDoBotao: Math.round(btn.getBoundingClientRect().width),
        larguraDoTexto: p ? Math.round(p.scrollWidth) : null,
        sobra: btn ? Math.round(btn.scrollWidth - btn.clientWidth) : null,
        cortado: btn.scrollWidth > btn.clientWidth + 1,
      } : null,
      redes: [...document.querySelectorAll('a.glass-button')].map((a) => ({
        texto: a.innerText.replace(/\n/g, ' ').trim(),
        altura: Math.round(a.getBoundingClientRect().height),
      })),
    };
  });
  log('  ' + JSON.stringify(medidas, null, 2));

  // o modal do bolo, que e onde o preco escrito na frase deveria aparecer inteiro
  await cel.locator('.project-card').first().click();
  await esperar(2000);
  const modal = await cel.evaluate(() => {
    const m = document.querySelector('#project-modal');
    if (!m) return { existe: false };
    return { existe: true, aberto: !m.classList.contains('hidden'), texto: (m.innerText || '').slice(0, 2500) };
  });
  log('\n  --- MODAL DO BOLO (o que o cliente le ao tocar num card) ---');
  log('  ' + JSON.stringify({ existe: modal.existe, aberto: modal.aberto }));
  log((modal.texto || '(vazio)').split('\n').map((l) => '  | ' + l).join('\n'));
  await cel.screenshot({ path: 'out/conf-27-celular-modal.png', fullPage: false });
  await cel.close();
}

// --- e a pagina que o endereco dela serve enquanto a revisao nao sai
log('\n## O QUE O ENDEREÇO DELA MOSTRA ENQUANTO A REVISÃO NÃO SAI');
const nua = await pagina.context().newPage();
await nua.setViewportSize({ width: 375, height: 812 });
const r = await nua.goto(`https://demo-confeitaria.myportifolio.com.br/?cb=${Date.now()}`, { waitUntil: 'networkidle' }).catch((e) => ({ err: String(e) }));
log('  HTTP ' + (r?.status?.() ?? r?.err));
log((await nua.evaluate(() => document.body.innerText)).split('\n').map((l) => '  | ' + l).join('\n'));
await nua.screenshot({ path: 'out/conf-28-endereco-em-revisao.png', fullPage: true });
await nua.close();

log('\n## ERROS');
log(erros.length ? erros.join('\n') : '  (nenhum)');
gravar();
await navegador.close();
console.log('\n>>> log em out/conf-celular.txt');
