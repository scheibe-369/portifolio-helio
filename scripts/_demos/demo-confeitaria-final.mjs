// Fecho: republica com o conteudo ja corrigido, fotografa o resultado e recolhe os dois
// pedacos de tela que faltaram (a aba Conta e o carrossel de especialidades).
import { abrirEditor, esperar } from './base.mjs';
import { writeFileSync } from 'node:fs';

const linhas = [];
const log = (...a) => { const s = a.map(String).join(' '); linhas.push(s); console.log(s); };

const { pagina, navegador, erros } = await abrirEditor('demo-confeitaria');
log('# FINAL demo-confeitaria', new Date().toISOString());

// --- A aba "Conta": ela troca a tela inteira, e nao abre gaveta.
log('\n## ABA CONTA');
await pagina.click('[data-abrir="conta"]');
await esperar(2500);
log((await pagina.evaluate(() => document.body.innerText)).split('\n').map((l) => '  | ' + l).join('\n'));
await pagina.screenshot({ path: 'out/conf-30-conta.png', fullPage: true });
await pagina.click('#conta-voltar').catch(() => {});
await esperar(3000);

// --- O carrossel de especialidades corta o primeiro item?
log('\n## O CARROSSEL DE "STACKS DOMINADAS"');
const marquee = await pagina.evaluate(() => {
  const m = document.querySelector('.stacks-marquee');
  if (!m) return null;
  const caixa = m.getBoundingClientRect();
  const primeiro = m.querySelector('span, div, li, a');
  const p = primeiro?.getBoundingClientRect();
  return {
    titulo: m.closest('div')?.querySelector('span')?.innerText.trim(),
    primeiroItem: primeiro?.innerText?.trim(),
    primeiroItemComecaEm: p ? Math.round(p.x - caixa.x) : null,
    cortadoNaEsquerda: p ? p.x < caixa.x - 1 : null,
  };
});
log('  ' + JSON.stringify(marquee));

// --- Republica com o conteudo final
log('\n## REPUBLICAR');
await pagina.click('[data-abrir="publicar"]');
await esperar(1500);
const pode = await pagina.locator('[data-publicar]').isEnabled().catch(() => false);
log('  botão habilitado? ' + pode);
if (pode) {
  await pagina.click('[data-publicar]');
  await esperar(9000);
  log('  --- tela depois ---\n' + (await pagina.locator('#ed-gaveta').innerText()).split('\n').map((l) => '  | ' + l).join('\n'));
}
await pagina.screenshot({ path: 'out/conf-31-publicar-final.png' });
await pagina.click('[data-girar-previa]');
await esperar(3500);
const url = await pagina.inputValue('[data-previa-url]').catch(() => '');
log('  prévia final: ' + url);
await pagina.keyboard.press('Escape');
await esperar(600);
await pagina.screenshot({ path: 'out/conf-32-canvas-final.png', fullPage: true });

if (url) {
  const p2 = await pagina.context().newPage();
  await p2.goto(url, { waitUntil: 'networkidle' });
  await esperar(2500);
  await p2.screenshot({ path: 'out/conf-33-publica-final.png', fullPage: true });
  await p2.close();
}

const nua = await pagina.context().newPage();
const r = await nua.goto(`https://demo-confeitaria.myportifolio.com.br/?cb=${Date.now()}`, { waitUntil: 'networkidle' }).catch((e) => ({ err: String(e) }));
log('\n## endereço público, agora: HTTP ' + (r?.status?.() ?? r?.err));
log((await nua.evaluate(() => document.body.innerText)).split('\n').map((l) => '  | ' + l).join('\n'));
await nua.close();

log('\n## ERROS');
log(erros.length ? erros.join('\n') : '  (nenhum)');
writeFileSync('out/conf-final.txt', linhas.join('\n'), 'utf8');
await navegador.close();
