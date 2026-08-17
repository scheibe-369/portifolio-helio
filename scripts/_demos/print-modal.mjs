import { chromium } from 'playwright';
const [slug, indice] = [process.argv[2], Number(process.argv[3] || 0)];
const nav = await chromium.launch({ headless: true });
const p = await (await nav.newContext({ viewport: { width: 1440, height: 1000 } })).newPage();
await p.goto(`https://${slug}.myportifolio.com.br/?cb=${Date.now()}`, { waitUntil: 'networkidle' });
await p.waitForTimeout(1500);
const cards = await p.$$('.project-card[data-slug]');
if (!cards[indice]) { console.log('sem card nesse indice'); await nav.close(); process.exit(1); }
await cards[indice].click();
await p.waitForTimeout(1200);
const modal = await p.$('#project-modal > div');
if (!modal) { console.log('modal nao abriu'); await nav.close(); process.exit(1); }
await p.screenshot({ path: `out/modal-${slug}.png`, clip: await modal.boundingBox() });
console.log(`out/modal-${slug}.png`);
await nav.close();
