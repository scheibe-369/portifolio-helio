import { chromium } from 'playwright';
const nav = await chromium.launch({ headless: true });
const p = await (await nav.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
await p.goto('http://localhost:4173/', { waitUntil: 'networkidle' });
await p.waitForTimeout(800);
await p.screenshot({ path: 'out/helio-depois.png', clip: { x: 0, y: 0, width: 1440, height: 720 } });
console.log('out/helio-depois.png');
await nav.close();
