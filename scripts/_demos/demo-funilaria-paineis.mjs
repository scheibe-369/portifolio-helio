// Varredura de TEXTO de todos os painéis do editor, para o censo de vocabulário e para a
// segunda procura por endereço e horário (a primeira só olhava campos `.ed-field`, e os
// painéis de Seções, Conta e Publicar não são feitos de campos).
import { abrirEditor, esperar } from './base.mjs';
import { writeFile } from 'node:fs/promises';

const { pagina, navegador } = await abrirEditor('demo-funilaria', { headless: true });
const saida = {};

for (const painel of ['perfil', 'projetos', 'experiencias', 'secoes', 'conta', 'publicar']) {
  // fecha a gaveta anterior: enquanto ela está aberta, ela cobre a barra de painéis inteira
  const x = pagina.locator('[data-gaveta-fechar]');
  if (await x.count()) { try { await x.first().click(); } catch {} await esperar(900); }
  await pagina.locator(`[data-abrir="${painel}"]`).click();
  await esperar(1600);
  await pagina.evaluate(() => document.querySelectorAll('#ed-gaveta details').forEach((d) => { d.open = true; }));
  await esperar(400);
  const t = await pagina.evaluate(() => document.querySelector('#ed-gaveta')?.innerText || '(sem gaveta)');
  saida[painel] = t;
  console.log(`\n########## ${painel.toUpperCase()} ##########\n${t}`);
  await pagina.screenshot({ path: `out/funil-painel-${painel}.png`, fullPage: true });
}

await writeFile('out/funil-paineis.txt', Object.entries(saida).map(([k, v]) => `########## ${k} ##########\n${v}`).join('\n\n'), 'utf8');
await navegador.close();
