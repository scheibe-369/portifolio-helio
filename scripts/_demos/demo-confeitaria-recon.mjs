// Recon da Sonia: abre o editor e fotografa/dumpa CADA tela antes de qualquer preenchimento.
// Existe separado do script de montagem porque o vocabulario virgem (o que a Sonia le no
// primeiro segundo) e o achado principal desta persona, e depois de preenchido ele muda.
import { abrirEditor, abrirPainel, textoDaTela, esperar } from './base.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';

mkdirSync('out', { recursive: true });
const linhas = [];
const log = (...a) => { const s = a.join(' '); linhas.push(s); console.log(s); };

const { pagina, navegador, demo, erros } = await abrirEditor('demo-confeitaria');
log('# RECON demo-confeitaria', new Date().toISOString());
log('persona:', demo.nome, '|', demo.role);

await pagina.screenshot({ path: 'out/conf-01-editor-virgem.png', fullPage: false });
await pagina.screenshot({ path: 'out/conf-01-editor-virgem-inteiro.png', fullPage: true });

log('\n## TEXTO DA TELA INICIAL (canvas + barra)');
log((await textoDaTela(pagina)).slice(0, 3000));

log('\n## BARRA DE CIMA');
log(await pagina.evaluate(() => [...document.querySelectorAll('#ed-barra button, #ed-barra a')]
  .map((e) => `  ${e.tagName.toLowerCase()}[${e.dataset.abrir || e.dataset.verVisitante != null ? 'data-abrir=' + (e.dataset.abrir || 'ver-visitante') : ''}] :: ${(e.innerText || '').trim()}`).join('\n')));

// Dump de um painel: titulo, subtitulo, rotulos, ajudas, cadeados, contadores, secoes.
async function dumpPainel(nome, seletorAbrir) {
  log(`\n\n===== PAINEL: ${nome} =====`);
  try {
    if (seletorAbrir) await pagina.click(seletorAbrir);
    else await abrirPainel(pagina, nome);
    await esperar(1200);
  } catch (e) {
    log('  NAO ABRIU:', String(e).slice(0, 200));
    return;
  }
  const d = await pagina.evaluate(() => {
    const g = document.querySelector('#ed-gaveta');
    if (!g) return { erro: 'gaveta nao existe' };
    const campos = [...g.querySelectorAll('.ed-field')].map((f) => ({
      key: f.dataset.campo || '',
      label: (f.querySelector('.ed-label')?.innerText || '').trim(),
      help: (f.querySelector('.ed-help')?.innerText || '').trim(),
      lock: Boolean(f.querySelector('.ed-lock')),
      tipo: f.querySelector('textarea') ? 'textarea'
        : f.querySelector('select') ? 'select'
        : f.querySelector('input[type=color]') ? 'cor'
        : f.querySelector('input[type=range]') ? 'range'
        : f.querySelector('[data-switch]') ? 'switch'
        : f.querySelector('[data-chips]') ? 'chips'
        : f.querySelector('[data-drop]') ? 'arquivo'
        : f.querySelector('input') ? 'texto' : '?',
    }));
    return {
      titulo: (g.querySelector('.ed-gaveta-titulo')?.innerText || '').trim(),
      sub: (g.querySelector('.ed-gaveta-sub')?.innerText || '').trim(),
      secoes: [...g.querySelectorAll('.ed-passo-titulo')].map((s) => s.innerText.trim()),
      campos,
      texto: g.innerText,
    };
  });
  if (d.erro) { log('  ', d.erro); return; }
  log(`  titulo: "${d.titulo}"  sub: "${d.sub}"`);
  log(`  secoes recolhiveis: ${JSON.stringify(d.secoes)}`);
  log('  --- texto integral da gaveta ---');
  log(d.texto.split('\n').map((l) => '  | ' + l).join('\n'));
  log('  --- campos (fechados incluidos abrindo tudo abaixo) ---');
  d.campos.forEach((c) => log(`  [${c.tipo}]${c.lock ? '[CADEADO]' : ''} ${c.key} :: "${c.label}" :: ajuda="${c.help}"`));

  // Abre TODOS os <details> e redumpa: os campos escondidos sao metade do vocabulario.
  const abriu = await pagina.evaluate(() => {
    const ds = [...document.querySelectorAll('#ed-gaveta details')];
    ds.forEach((x) => { x.open = true; });
    return ds.length;
  });
  if (abriu) {
    await esperar(400);
    const d2 = await pagina.evaluate(() => {
      const g = document.querySelector('#ed-gaveta');
      return [...g.querySelectorAll('.ed-field')].map((f) => ({
        key: f.dataset.campo || '',
        label: (f.querySelector('.ed-label')?.innerText || '').trim(),
        help: (f.querySelector('.ed-help')?.innerText || '').trim(),
        lock: Boolean(f.querySelector('.ed-lock')),
        passo: f.closest('details')?.querySelector('.ed-passo-titulo')?.innerText.trim() || '(1 - sempre aberto)',
        opcoes: [...(f.querySelectorAll('select option') || [])].map((o) => o.innerText).join(' / '),
      }));
    });
    log(`  --- TODOS os ${d2.length} campos, com secao ---`);
    d2.forEach((c) => log(`  <${c.passo}> ${c.lock ? '[CADEADO] ' : ''}${c.key} :: "${c.label}"${c.help ? ' :: ajuda="' + c.help + '"' : ''}${c.opcoes ? ' :: opcoes=' + c.opcoes : ''}`));
    await pagina.screenshot({ path: `out/conf-recon-${nome.toLowerCase().replace(/[^a-z]/g, '')}.png`, fullPage: false });
  }
  await pagina.keyboard.press('Escape');
  await esperar(600);
}

await dumpPainel('Perfil', '[data-abrir="perfil"]');
await dumpPainel('Projetos', '[data-abrir="projetos"]');

// Formulario de projeto novo (o que a Sonia ve ao cadastrar o primeiro bolo).
log('\n\n===== FORMULARIO DE PROJETO NOVO =====');
await pagina.click('[data-abrir="projetos"]');
await esperar(900);
await pagina.click('[data-adicionar]');
await esperar(900);
await pagina.evaluate(() => { document.querySelectorAll('#ed-gaveta details').forEach((d) => { d.open = true; }); });
await esperar(400);
log(await pagina.evaluate(() => {
  const g = document.querySelector('#ed-gaveta');
  return [...g.querySelectorAll('.ed-field')].map((f) => {
    const passo = f.closest('details')?.querySelector('.ed-passo-titulo')?.innerText.trim() || '(1 - sempre aberto)';
    return `  <${passo}> ${f.querySelector('.ed-lock') ? '[CADEADO] ' : ''}${f.dataset.campo} :: "${(f.querySelector('.ed-label')?.innerText || '').trim()}"` +
      ((f.querySelector('.ed-help')?.innerText || '').trim() ? ` :: ajuda="${f.querySelector('.ed-help').innerText.trim()}"` : '');
  }).join('\n');
}));
log('  titulo/sub da gaveta: ' + await pagina.evaluate(() => {
  const g = document.querySelector('#ed-gaveta');
  return JSON.stringify([g.querySelector('.ed-gaveta-titulo')?.innerText, g.querySelector('.ed-gaveta-sub')?.innerText]);
}));
await pagina.screenshot({ path: 'out/conf-recon-projeto-novo.png', fullPage: false });
await pagina.keyboard.press('Escape');
await esperar(500);

// Formulario de experiencia nova, nos dois tipos.
log('\n\n===== FORMULARIO DE EXPERIENCIA NOVA =====');
await pagina.click('[data-abrir="experiencias"]');
await esperar(900);
await pagina.click('[data-adicionar]');
await esperar(900);
for (const tipo of ['work', 'education']) {
  await pagina.click(`[data-escolha="kind"][data-valor="${tipo}"]`).catch(() => {});
  await esperar(500);
  await pagina.evaluate(() => { document.querySelectorAll('#ed-gaveta details').forEach((d) => { d.open = true; }); });
  await esperar(300);
  log(`\n  --- tipo = ${tipo} ---`);
  log(await pagina.evaluate(() => {
    const g = document.querySelector('#ed-gaveta');
    return [...g.querySelectorAll('.ed-field')].map((f) => {
      const passo = f.closest('details')?.querySelector('.ed-passo-titulo')?.innerText.trim() || '(1 - sempre aberto)';
      return `  <${passo}> ${f.dataset.campo} :: "${(f.querySelector('.ed-label')?.innerText || '').trim()}"` +
        ((f.querySelector('.ed-help')?.innerText || '').trim() ? ` :: ajuda="${f.querySelector('.ed-help').innerText.trim()}"` : '');
    }).join('\n');
  }));
}
await pagina.screenshot({ path: 'out/conf-recon-experiencia-nova.png', fullPage: false });
await pagina.keyboard.press('Escape');
await esperar(500);

await dumpPainel('Publicar', '[data-abrir="publicar"]');
await dumpPainel('Conta', '[data-abrir="conta"]');

log('\n\n===== ERROS DE CONSOLE/REDE =====');
log(erros.length ? erros.join('\n') : '  (nenhum)');

writeFileSync('out/conf-recon.txt', linhas.join('\n'), 'utf8');
console.log('\n>>> dump em out/conf-recon.txt');
await navegador.close();
