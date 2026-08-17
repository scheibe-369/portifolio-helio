import { chromium } from 'playwright';
const nav = await chromium.launch({ headless: true });
for (const slug of process.argv.slice(2)) {
  const ctx = await nav.newContext({ viewport: { width: 1440, height: 1100 } });
  const p = await ctx.newPage();
  await p.goto(`https://${slug}.myportifolio.com.br/?cb=${Date.now()}`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(1500);
  const el = await p.$('#project-count');
  if (el) {
    const box = await (await el.evaluateHandle(e => e.closest('.glass-card'))).asElement().boundingBox();
    await p.screenshot({ path: `out/proj-${slug}.png`, clip: { x: box.x, y: box.y, width: box.width, height: Math.min(box.height, 700) } });
    console.log(`out/proj-${slug}.png`);
  } else console.log(`${slug}: sem grade`);
  await ctx.close();
}
await nav.close();
