// Segunda passada do Caio: conserta o que ficou pela metade na primeira e MEDE o limite de
// 90 KB que recusou duas fotografias.
//
// POR QUE UM SEGUNDO ARQUIVO: a primeira passada e o comprador chegando cru. Esta e o mesmo
// comprador voltando depois de ver a propria pagina, que e quando ele descobre que dois cards
// sairam sem foto e que o cargo antigo diz "desde 2019" sem fim. O que ele faz aqui (reduzir a
// foto no olho ate o produto aceitar) e o atrito que se quer medir.
import { abrirEditor, esperar } from './base.mjs';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const MIDIA = resolve('out/midia/demo-fotografo');
const arq = (n) => resolve(MIDIA, n);
mkdirSync('out', { recursive: true });

const linhas = [];
const log = (...a) => { const s = a.map(String).join(' '); linhas.push(s); console.log(s); };
const gravar = () => writeFileSync('out/foto-conserto.txt', linhas.join('\n'), 'utf8');

const { pagina, navegador, erros } = await abrirEditor('demo-fotografo');
log('# CONSERTO demo-fotografo', new Date().toISOString());

const abrirTudo = async () => {
  await pagina.evaluate(() => { document.querySelectorAll('#ed-gaveta details').forEach((d) => { d.open = true; }); });
  await esperar(350);
};
const existe = (sel) => pagina.locator(`#ed-gaveta ${sel}`).count().then((n) => n > 0);

async function preencher(key, valor) {
  if (!(await existe(`[data-k="${key}"]`))) { log(`  ! campo ${key} nao existe`); return false; }
  await pagina.fill(`#ed-gaveta [data-k="${key}"]`, valor);
  return true;
}

// Versao instrumentada do switch: le o estado ANTES e DEPOIS e conta o que aconteceu, porque
// na primeira passada o "Estou aqui ate hoje" ficou ligado sem ninguem entender por que.
async function switchInstrumentado(key, desejado) {
  const sel = `#ed-gaveta [data-switch="${key}"]`;
  if (!(await existe(`[data-switch="${key}"]`))) { log(`  ! switch ${key} nao existe`); return null; }
  const antes = await pagina.evaluate((k) => {
    const el = document.querySelector(`#ed-gaveta [data-switch="${k}"]`);
    return { aria: el.getAttribute('aria-checked'), classe: el.className, disabled: el.disabled };
  }, key);
  log(`  switch ${key} ANTES: aria-checked=${antes.aria} classe="${antes.classe}" disabled=${antes.disabled}`);
  const ligadoAgora = antes.classe.includes('is-on');
  if (ligadoAgora !== desejado) {
    await pagina.locator(sel).first().click();
    await esperar(900);
  }
  const depois = await pagina.evaluate((k) => {
    const el = document.querySelector(`#ed-gaveta [data-switch="${k}"]`);
    return el ? { aria: el.getAttribute('aria-checked'), classe: el.className } : null;
  }, key);
  log(`  switch ${key} DEPOIS: ${JSON.stringify(depois)}`);
  return depois;
}

async function salvar(rotulo) {
  await pagina.click('#ed-form-salvar');
  try {
    await pagina.waitForSelector('#ed-gaveta .ed-form', { state: 'detached', timeout: 60000 });
  } catch {
    log(`  ! salvar travou em ${rotulo}: "${await pagina.locator('#ed-form-msg').innerText().catch(() => '')}"`);
    await pagina.keyboard.press('Escape');
  }
  await esperar(1200);
}

// Sobe e devolve { ok, msg, url, ms }. Nao lanca: aqui a RECUSA e o dado que interessa.
async function tentarUpload(key, caminho, timeout = 45000) {
  if (!existsSync(caminho)) return { ok: false, msg: 'arquivo local nao existe' };
  const antes = await pagina.locator(`#ed-gaveta [data-campo="${key}"] img.ed-drop-previa`).first().getAttribute('src').catch(() => null);
  const t = Date.now();
  await pagina.setInputFiles(`#ed-gaveta [data-arquivo="${key}"]`, caminho);
  try {
    await pagina.waitForFunction(
      ([k, ant]) => {
        const img = document.querySelector(`#ed-gaveta [data-campo="${k}"] img.ed-drop-previa`);
        return Boolean(img && img.src && img.src !== ant);
      },
      [key, antes],
      { timeout },
    );
  } catch {
    const msg = await pagina.locator(`#ed-gaveta [data-campo="${key}"] [data-erro]`).first().innerText().catch(() => '');
    return { ok: false, msg, ms: Date.now() - t };
  }
  const url = await pagina.locator(`#ed-gaveta [data-campo="${key}"] img.ed-drop-previa`).first().getAttribute('src');
  return { ok: true, url, ms: Date.now() - t };
}

async function medir(url) {
  return pagina.evaluate(async (u) => {
    const resp = await fetch(u, { cache: 'no-store' });
    const buf = new Uint8Array(await resp.arrayBuffer());
    const img = await createImageBitmap(new Blob([buf]));
    return { bytes: buf.length, l: img.width, a: img.height };
  }, url);
}

// ================================================== 1. O SWITCH E O FIM DO PERIODO
log('\n===== 1. O SWITCH "ESTOU AQUI ATE HOJE" =====');

const FIM = {
  'Folha de S.Paulo': '12/2023',
  'Escola Panamericana de Arte e Design': '2013',
  'Prêmio Vladimir Herzog': '2022',
};

for (const [org, fim] of Object.entries(FIM)) {
  log(`\n-- ${org} --`);
  await pagina.click('[data-abrir="experiencias"]');
  await esperar(1000);
  const item = pagina.locator('#ed-gaveta .ed-lista-item').filter({ hasText: org }).first();
  if (!(await item.count())) { log('  ! nao achei na lista'); continue; }
  await item.locator('[data-editar]').click();
  await esperar(1000);

  await switchInstrumentado('atual', false);
  await abrirTudo();
  const temFim = await existe('[data-k="period_end"]');
  log(`  campo "Até" nasceu depois do switch? ${temFim}`);
  if (temFim) await preencher('period_end', fim);
  await salvar(org);
}

// ================================================== 2. O E-MAIL NA PAGINA
log('\n\n===== 2. MOSTRAR O E-MAIL =====');
await pagina.click('[data-abrir="perfil"]');
await esperar(1200);
await abrirTudo();
await switchInstrumentado('show_contact_email', true);
await abrirTudo();
await salvar('perfil');

// ================================================== 3. O LIMITE DE 90 KB
log('\n\n===== 3. ATE ONDE A FOTO PRECISA ENCOLHER PARA CABER =====');
log('O pipeline corta 3:2, reduz para no maximo 1200 px de lado maior e encoda WebP em');
log('0.82 / 0.72 / 0.62. Se nem 0.62 couber em 90 KB, ele RECUSA. Abaixo, o mesmo negativo');
log('exportado em tamanhos decrescentes, que e exatamente o que um fotografo faria no escuro.');

const ESCADAS = [
  {
    projeto: 'Campo, fim de tarde',
    tentativas: ['teste-panoramica.jpg', 'pan-1600x560.jpg', 'pan-1200x420.jpg', 'pan-1000x350.jpg', 'pan-800x280.jpg'],
  },
  {
    projeto: 'Recreio no largo',
    tentativas: ['praca-1200x795.jpg', 'praca-1000x662.jpg', 'praca-800x530.jpg', 'praca-600x397.jpg'],
  },
];

const escada = [];

for (const alvo of ESCADAS) {
  log(`\n-- ${alvo.projeto} --`);
  await pagina.click('[data-abrir="projetos"]');
  await esperar(1000);
  const item = pagina.locator('#ed-gaveta .ed-lista-item').filter({ hasText: alvo.projeto }).first();
  if (!(await item.count())) { log('  ! projeto nao achado'); continue; }
  await item.locator('[data-editar]').click();
  await esperar(1000);

  let venceu = null;
  for (const nome of alvo.tentativas) {
    const r = await tentarUpload('image', arq(nome));
    if (r.ok) {
      const m = await medir(r.url);
      log(`  ${nome.padEnd(24)} ACEITA  -> ${m.l}x${m.a}, ${(m.bytes / 1024).toFixed(1)} KB, ${(r.ms / 1000).toFixed(1)}s`);
      escada.push({ projeto: alvo.projeto, entrada: nome, aceita: true, saida: `${m.l}x${m.a}`, kb: +(m.bytes / 1024).toFixed(1) });
      venceu = nome;
      break;
    }
    log(`  ${nome.padEnd(24)} RECUSADA -> "${r.msg}"`);
    escada.push({ projeto: alvo.projeto, entrada: nome, aceita: false, msg: r.msg });
    await abrirTudo();
  }
  log(`  tentativas ate passar: ${escada.filter((x) => x.projeto === alvo.projeto).length}${venceu ? '' : ' (nunca passou)'}`);
  await abrirTudo();
  await salvar(alvo.projeto);
}

await pagina.screenshot({ path: 'out/foto-17-grade-consertada.png', fullPage: false });

// ================================================== 4. REPUBLICAR
log('\n\n===== 4. REPUBLICAR =====');
await pagina.click('[data-abrir="publicar"]');
await esperar(1500);
log(await pagina.locator('#ed-gaveta').innerText().catch(() => ''));

let urlPrevia = '';
if (await pagina.locator('#ed-gaveta [data-girar-previa]').count()) {
  await pagina.click('#ed-gaveta [data-girar-previa]');
  await esperar(4000);
  urlPrevia = await pagina.locator('#ed-gaveta [data-previa-url]').first().inputValue().catch(() => '');
  log(`previa: ${urlPrevia}`);
}

const btn = pagina.locator('#ed-gaveta [data-publicar]');
if ((await btn.count()) && !(await btn.first().isDisabled())) {
  await btn.first().click();
  await esperar(6000);
  log('\n-- depois de publicar --');
  log(await pagina.locator('#ed-gaveta').innerText().catch(() => ''));
  await pagina.screenshot({ path: 'out/foto-18-publicado-2.png' });
}

// ================================================== 5. A PAGINA FINAL
if (urlPrevia) {
  log('\n\n===== 5. PAGINA FINAL =====');
  const p2 = await pagina.context().newPage();
  await p2.goto(urlPrevia, { waitUntil: 'networkidle' }).catch((e) => log('  ! ' + e));
  await esperar(2500);
  await p2.screenshot({ path: 'out/foto-19-final-inteira.png', fullPage: true });
  const grade = p2.locator('#project-count').first().locator('xpath=ancestor::div[contains(@class,"glass-card")][1]');
  if (await grade.count()) {
    await grade.scrollIntoViewIfNeeded();
    await esperar(600);
    await grade.screenshot({ path: 'out/foto-20-grade-final.png' });
  }
  const exp = p2.locator('#experiencia').first();
  if (await exp.count()) {
    await exp.scrollIntoViewIfNeeded();
    await esperar(600);
    await exp.screenshot({ path: 'out/foto-21-experiencia-final.png' });
  }
  log('\n-- texto final --');
  log((await p2.evaluate(() => document.body.innerText)).slice(0, 3500));
  await p2.close();
}

log('\n\n===== ERROS DE CONSOLE/REDE =====');
log(erros.length ? erros.join('\n') : '  (nenhum)');
log('\n===== ESCADA DE TAMANHO =====');
log(JSON.stringify(escada, null, 2));

gravar();
writeFileSync('out/foto-escada.json', JSON.stringify(escada, null, 2), 'utf8');
console.log('\n>>> out/foto-conserto.txt');
await navegador.close();
