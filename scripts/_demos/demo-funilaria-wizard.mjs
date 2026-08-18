// Sonda do WIZARD, antes de o portfolio existir.
//
// abrirEditor() atravessa o wizard sozinho, e por isso apaga justamente o que esta persona
// precisa medir: a pergunta "Sua área", com dez opcoes, diante de um funileiro. Este script
// para ANTES de clicar em "Criar meu portfólio" e fotografa a tela como ele a veria.
//
// Ele NAO cria nada: se o portfolio ja existir, o editor abre direto e a sonda so registra
// isso. Rode antes de demo-funilaria.mjs.
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { writeFile, mkdir } from 'node:fs/promises';

const CHAVE = 'sb-fxchcqlbjszichhbllzm-auth-token';
const APEX = 'https://myportifolio.com.br';
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

await mkdir('out', { recursive: true });
const bruto = execFileSync(process.execPath, ['scripts/sessao-demo.mjs', '--slug', 'demo-funilaria', '--json'], { encoding: 'utf8' });
const [s] = JSON.parse(bruto);

const navegador = await chromium.launch({ headless: true });
const contexto = await navegador.newContext({ viewport: { width: 1440, height: 900 } });
await contexto.addInitScript(([k, v]) => { try { window.localStorage.setItem(k, v); } catch {} },
  [CHAVE, JSON.stringify({
    access_token: s.accessToken, refresh_token: s.refreshToken, expires_at: s.expiresAt,
    token_type: 'bearer', user: { id: s.userId, email: s.email },
  })]);

const pagina = await contexto.newPage();
await pagina.goto(`${APEX}/app?cb=${Date.now()}`, { waitUntil: 'networkidle' });

// Termos primeiro, senao o wizard nem aparece.
if (await pagina.locator('#termos-aceite').count()) {
  console.log('portao de termos: presente');
  await pagina.screenshot({ path: 'out/funil-wizard-0-termos.png', fullPage: true });
  const textoTermos = await pagina.evaluate(() => document.body.innerText);
  await writeFile('out/funil-termos-texto.txt', textoTermos, 'utf8');
  await pagina.check('#termos-aceite');
  await pagina.click('#termos-continuar');
  await pagina.waitForSelector('#wz-nome, #ed-canvas', { timeout: 60000 });
}

if (await pagina.locator('#wz-nome').count()) {
  await esperar(2500);
  await pagina.screenshot({ path: 'out/funil-wizard-1-vazio.png', fullPage: true });
  const tela = await pagina.evaluate(() => document.body.innerText);
  const opcoes = await pagina.evaluate(() =>
    [...document.querySelectorAll('#wz-kit option')].map((o) => `${o.value || '(vazio)'} = ${o.textContent.trim()}`));
  console.log('--- TEXTO DA TELA ---');
  console.log(tela);
  console.log('--- OPCOES DE "Sua área" ---');
  console.log(opcoes.join('\n'));
  await writeFile('out/funil-wizard-texto.txt', `${tela}\n\n--- opcoes de "Sua área" ---\n${opcoes.join('\n')}\n`, 'utf8');
  await writeFile('out/funil-wizard-kits.txt', opcoes.join('\n'), 'utf8');
  const temOficina = opcoes.some((o) => /oficin|carro|autom|mec|funil|servi|manuten|obra|reforma/i.test(o));
  console.log(`\nalguma opcao serve para funileiro? ${temOficina ? 'SIM' : 'NAO'}`);
} else {
  console.log('wizard nao apareceu: o portfolio demo-funilaria ja existe');
  await pagina.screenshot({ path: 'out/funil-wizard-ja-existe.png', fullPage: true });
}

await navegador.close();
