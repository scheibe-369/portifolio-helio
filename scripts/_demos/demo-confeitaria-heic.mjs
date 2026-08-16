// A Sonia fotografa bolo com o iPhone. O iPhone grava HEIC por padrao. Este script pergunta
// uma coisa so: o editor aceita o arquivo que sai da camera dela?
import { abrirEditor, esperar } from './base.mjs';
import { readFileSync, writeFileSync } from 'node:fs';

const linhas = [];
const log = (...a) => { const s = a.map(String).join(' '); linhas.push(s); console.log(s); };

const { pagina, navegador } = await abrirEditor('demo-confeitaria');
log('# HEIC demo-confeitaria', new Date().toISOString());

await pagina.click('[data-abrir="projetos"]');
await esperar(1000);
await pagina.click('[data-adicionar]');
await esperar(1000);

const bytes = readFileSync('out/midia/demo-confeitaria/bolo-vulcao.jpg');

for (const [nome, tipo] of [['IMG_4821.HEIC', 'image/heic'], ['IMG_4821.heif', 'image/heif'], ['bolo.jpg', 'image/jpeg']]) {
  await pagina.setInputFiles('[data-arquivo="image"]', { name: nome, mimeType: tipo, buffer: bytes });
  await esperar(2500);
  const r = await pagina.evaluate(() => ({
    erro: document.querySelector('[data-campo="image"] [data-erro]')?.textContent.trim(),
    subiu: Boolean(document.querySelector('[data-remover-imagem="image"]')),
  }));
  log(`  ${nome} (${tipo}) -> subiu=${r.subiu} | mensagem na tela: "${r.erro}"`);
  if (r.subiu) { await pagina.click('[data-remover-imagem="image"]'); await esperar(800); }
}

log('\n  o input de arquivo aceita quais tipos? ' + await pagina.getAttribute('[data-arquivo="image"]', 'accept'));
await pagina.screenshot({ path: 'out/conf-34-heic-recusado.png' });
writeFileSync('out/conf-heic.txt', linhas.join('\n'), 'utf8');
await navegador.close();
