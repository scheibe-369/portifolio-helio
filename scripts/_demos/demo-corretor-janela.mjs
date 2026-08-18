// A JANELA DO IMOVEL, que e o unico lugar onde a ficha tecnica (bairro, area, dormitorios,
// vagas, condominio, IPTU) conseguiu caber. Ela caiu num textarea de texto corrido, e este
// script existe para fotografar exatamente o que o cliente le quando clica no card.
//
// Uso: node scripts/_demos/demo-corretor-janela.mjs
import { abrirEditor, esperar } from './base.mjs';
import { writeFile } from 'node:fs/promises';

const { pagina, navegador, erros, APEX } = await abrirEditor('demo-corretor', { headless: true });

await pagina.goto(`${APEX}/app?cb=${Date.now()}`, { waitUntil: 'networkidle' });
await esperar(3000);
const ver = pagina.locator('[data-abrir="ver-visitante"], button:has-text("Ver como visitante")').first();
if (await ver.count()) { await ver.click(); await esperar(5000); }
else console.log('! nao achei "Ver como visitante"');

await pagina.evaluate(async () => {
  for (let y = 0; y < document.body.scrollHeight; y += 400) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 110)); }
});
await esperar(1500);

const cards = await pagina.evaluate(() => [...document.querySelectorAll('.project-card')].map((c) => c.dataset.slug));
console.log(`cards na grade: ${cards.length} -> ${cards.join(', ')}`);

for (const slug of cards.slice(0, 2)) {
  await pagina.locator(`.project-card[data-slug="${slug}"]`).first().click();
  await esperar(2500);
  const texto = await pagina.evaluate(() => document.querySelector('[role="dialog"]')?.innerText || '(sem janela)');
  await writeFile(`out/corretor-janela-${slug}.txt`, texto, 'utf8');
  await pagina.screenshot({ path: `out/corretor-janela-${slug}.png` });
  console.log(`\n===== ${slug} =====\n${texto}`);
  // A galeria: quantas fotos entraram e como elas aparecem.
  const g = await pagina.evaluate(() => {
    const d = document.querySelector('[role="dialog"]');
    return [...(d?.querySelectorAll('img') || [])].map((i) => `${i.naturalWidth}x${i.naturalHeight}`);
  });
  console.log(`  imagens na janela: ${g.join(' | ') || '(nenhuma)'}`);
  await pagina.locator('[data-modal-close]').first().click();
  await esperar(1200);
}

await pagina.setViewportSize({ width: 390, height: 844 });
await esperar(2000);
if (cards[0]) {
  await pagina.locator(`.project-card[data-slug="${cards[0]}"]`).first().click();
  await esperar(2500);
  await pagina.screenshot({ path: 'out/corretor-janela-celular.png' });
}
console.log(`\nerros: ${[...new Set(erros)].join('\n') || '(nenhum)'}`);
await navegador.close();
