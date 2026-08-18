// Revisao 2 do EDITOR do Caio. So le e fotografa: nao salva nada.
import { abrirEditor, abrirPainel, esperar } from './base.mjs';
import { writeFileSync } from 'node:fs';

const linhas = [];
const log = (...a) => { const s = a.map((x) => (typeof x === 'string' ? x : JSON.stringify(x, null, 2))).join(' '); linhas.push(s); console.log(s); };
const gravar = () => writeFileSync('out/rev2-foto-editor.txt', linhas.join('\n'), 'utf8');

const { pagina, navegador, erros } = await abrirEditor('demo-fotografo');
log('# EDITOR demo-fotografo', new Date().toISOString());

const abrirTudo = async () => { await pagina.evaluate(() => document.querySelectorAll('#ed-gaveta details').forEach((d) => { d.open = true; })); await esperar(400); };

const dump = async (rot) => {
  await abrirTudo();
  await pagina.screenshot({ path: `out/rev2-foto-ed-${rot}.png`, fullPage: true });
  const t = await pagina.evaluate(() => document.querySelector('#ed-gaveta')?.innerText || '(sem gaveta)');
  log(`\n===== ${rot} =====`);
  log(t);
  const campos = await pagina.evaluate(() => [...document.querySelectorAll('#ed-gaveta [data-k],#ed-gaveta [data-switch],#ed-gaveta input,#ed-gaveta select,#ed-gaveta textarea')].map((e) => ({
    k: e.getAttribute('data-k') || e.getAttribute('data-switch') || e.id || e.name || '', tag: e.tagName, type: e.type || '', valor: String(e.value || '').slice(0, 60), max: e.getAttribute('maxlength'),
  })));
  log('CAMPOS:'); log(campos);
};

// abas do topo
const abas = await pagina.evaluate(() => [...document.querySelectorAll('button')].map((b) => b.innerText.trim()).filter((t) => t && t.length < 24));
log('BOTOES DO TOPO:'); log(abas.slice(0, 40));

const fechar = async () => {
  await pagina.keyboard.press('Escape').catch(() => {});
  await esperar(500);
  const x = pagina.locator('#ed-gaveta [data-fechar], #ed-gaveta button[aria-label*="echar"]').first();
  if (await x.count()) { await x.click().catch(() => {}); await esperar(600); }
};

for (const nome of ['Perfil', 'Projetos', 'Experiência', 'Seções', 'Conta']) {
  try {
    await fechar();
    await pagina.locator(`[data-abrir]`).filter({ hasText: new RegExp(`^${nome}$`, 'i') }).first().click({ timeout: 15000 });
    await esperar(1400);
    await dump(nome.toLowerCase().replace(/[^a-z]/g, ''));
  } catch (e) { log(`!! painel ${nome} falhou: ${String(e).slice(0, 200)}`); }
}

// Abrir um trabalho especifico
try {
  await fechar();
  await pagina.locator('[data-abrir]').filter({ hasText: /^Projetos$/i }).first().click({ timeout: 15000 });
  await esperar(1400);
  const alvo = pagina.locator('#ed-gaveta button, #ed-gaveta li, #ed-gaveta [data-abrir]').filter({ hasText: /Quem fotografa/i }).first();
  if (await alvo.count()) { await alvo.click(); await esperar(1500); await dump('projeto-quem-fotografa'); }
  else {
    const primeiro = pagina.locator('#ed-gaveta [data-editar], #ed-gaveta button').filter({ hasText: /editar/i }).first();
    if (await primeiro.count()) { await primeiro.click(); await esperar(1500); await dump('projeto-primeiro'); }
    else log('!! nao achei como abrir um trabalho');
  }
} catch (e) { log('!! abrir trabalho falhou: ' + String(e).slice(0, 300)); }

log('\nERROS DE CONSOLE/HTTP:'); log(erros);
gravar();
await navegador.close();
console.log('OK -> out/rev2-foto-editor.txt');
