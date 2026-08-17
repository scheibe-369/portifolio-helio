import { chromium } from 'playwright';
const alvos = process.argv.slice(2);
const nav = await chromium.launch({ headless: true });
for (const slug of alvos) {
  const ctx = await nav.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.goto(`https://${slug}.myportifolio.com.br/?cb=${Date.now()}`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(1200);
  // topo: hero + card de perfil + sociais
  await p.screenshot({ path: `out/rev-${slug}-topo.png`, clip: { x: 0, y: 0, width: 1440, height: 1000 } });
  console.log(`out/rev-${slug}-topo.png`);
  await ctx.close();
}
await nav.close();
