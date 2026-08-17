// Renderiza o portfolio REAL de um tenant (payload vindo do banco) contra o codigo LOCAL,
// sem deployar.
//
// POR QUE EXISTE: conferir layout so depois do deploy custa um deploy por tentativa, e foi
// assim que "Renata Vasconcelos" foi parar impressa na VERTICAL, uma letra por linha, em
// producao. A mudanca passou no baseline do Helio, cujo nome e curto e cujos rotulos de
// numero sao curtos, e ninguem olhou uma persona de nome longo antes de subir. Baseline de
// um perfil so nao e teste de layout: e teste daquele perfil.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import { montarCtx } from '../../src/modules/portfolio/lib/ctx.js';
import { renderPortfolioPage } from '../../src/app/portfolioPage.js';
import { SHELL_PUBLICO, MARCADOR_HEAD } from '../../worker/shell.gen.js';

const env = Object.fromEntries((await readFile('.env.local', 'utf8')).split('\n')
  .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
  .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]));

const q = async (query) => {
  const r = await fetch(`https://api.supabase.com/v1/projects/${env.SUPABASE_PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}`, 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' },
    body: JSON.stringify({ query }),
  });
  const d = await r.json();
  if (!Array.isArray(d)) throw new Error(d.message || JSON.stringify(d).slice(0, 200));
  return d;
};

const CFG = {
  apexHost: 'myportifolio.com.br',
  mediaBase: `${env.VITE_SUPABASE_URL}/storage/v1/object/public/portfolio-media`,
};

const ALTURA = Number(process.env.ALTURA || 620);

await mkdir('out/previa', { recursive: true });
const nav = await chromium.launch({ headless: true });

for (const slug of process.argv.slice(2)) {
  const [linha] = await q(`select myportifolio.get_published_portfolio('${slug}') as r;`);
  const r = linha.r;
  if (!r || r.status !== 'ok') { console.log(`${slug}: status ${r && r.status}`); continue; }

  const v = r.payloadV ?? r.payload_v ?? 2;
  const ctx = montarCtx(CFG, {
    payload: r.payload,
    payloadV: v,
    payloadVCorrente: v,
    slug,
    url: new URL(`https://${slug}.myportifolio.com.br/`),
  });
  if (!ctx) { console.log(`${slug}: montarCtx devolveu null`); continue; }

  const html = SHELL_PUBLICO
    .replace(MARCADOR_HEAD, '<title>previa local</title>')
    .replace('<div id="app"></div>', `<div id="app" class="ready">${renderPortfolioPage(ctx)}</div>`);
  const arq = resolve('out/previa', `${slug}.html`);
  await writeFile(arq, html, 'utf8');

  const ctxNav = await nav.newContext({ viewport: { width: 1440, height: 1000 } });
  const p = await ctxNav.newPage();
  await p.goto(pathToFileURL(arq).href, { waitUntil: 'load' });
  await p.waitForTimeout(400);
  await p.screenshot({ path: `out/previa/${slug}.png`, clip: { x: 0, y: 0, width: 1440, height: ALTURA } });
  await ctxNav.close();
  console.log(`out/previa/${slug}.png`);
}
await nav.close();
