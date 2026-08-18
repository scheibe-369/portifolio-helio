// Conserto do par antes/depois nos dois serviços em que o upload da galeria foi RECUSADO.
//
// O que aconteceu na primeira passada: duas das doze fotos bateram no orçamento de 140 KB do
// destino `project` e voltaram com "não consegui deixar esta imagem abaixo de 140 KB. Tente
// uma imagem mais simples ou menor". Como o slot `gallery_2` só nasce quando `gallery_1` tem
// caminho gravado, a recusa da primeira foto apagou o campo da segunda: o serviço ficou sem
// antes E sem depois, sem que nada na tela dissesse isso.
//
// Aqui a mesma foto entra numa versão menor (a mesma imagem baixada em 900 px em vez de
// 1400). É o contorno que um filho ou um sobrinho faria por ele; o Zé Ricardo, sozinho, com o
// aparelho na mão, pararia aqui.
import { abrirEditor, esperar } from './base.mjs';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

const MIDIA = path.resolve('out/midia/demo-funilaria');
const m = (f) => path.join(MIDIA, f);
const G = '#ed-gaveta';
const notas = [];
const nota = (n, t) => { notas.push(`[${n}] ${t}`); console.log(`  ! ${n}: ${t}`); };

const { pagina, navegador, erros } = await abrirEditor('demo-funilaria', { headless: true });

const abrirTodosOsPassos = async () => {
  await pagina.evaluate(() => document.querySelectorAll('#ed-gaveta details').forEach((d) => { d.open = true; }));
  await esperar(300);
};

async function subir(key, arquivo) {
  const inp = pagina.locator(`${G} [data-arquivo="${key}"]`).first();
  if (!(await inp.count())) { nota('AUSENTE', `slot "${key}" não existe`); return false; }
  await inp.setInputFiles(m(arquivo));
  for (let i = 0; i < 40; i++) {
    await esperar(500);
    const r = await pagina.evaluate((k) => {
      const c = document.querySelector(`#ed-gaveta [data-campo="${k}"]`);
      const img = c?.querySelector('.ed-drop-previa');
      return { url: img?.src || '', w: img?.naturalWidth || 0, h: img?.naturalHeight || 0, erro: c?.querySelector('[data-erro]')?.textContent?.trim() || '' };
    }, key);
    if (r.url && r.w) { console.log(`  ${key} <- ${arquivo}: ${r.w}x${r.h}`); return true; }
    if (r.erro && !/convertendo|enviando/i.test(r.erro)) { nota('ERRO-UPLOAD', `${key} com ${arquivo}: ${r.erro}`); return false; }
  }
  nota('TIMEOUT', `${key} não terminou`);
  return false;
}

async function salvar(rot) {
  await pagina.locator('#ed-form-salvar').click();
  for (let i = 0; i < 40; i++) {
    await esperar(500);
    if (!(await pagina.evaluate(() => document.querySelector('#ed-gaveta')?.classList.contains('is-open')))) { console.log(`  salvo: ${rot}`); return true; }
  }
  nota('TIMEOUT', `salvar ${rot}`);
  return false;
}

const CONSERTOS = [
  { nome: 'Porta amassada de Gol', fotos: [['gallery_2', 'depois-1-menor.jpg']] },
  // (já consertado)
];

for (const c of CONSERTOS) {
  console.log(`\n-> ${c.nome}`);
  await pagina.click('[data-abrir="projetos"]');
  await esperar(1200);
  const item = pagina.locator(`${G} .ed-lista-item`, { hasText: c.nome }).first();
  if (!(await item.count())) { nota('AUSENTE', `não achei "${c.nome}" na lista`); continue; }
  await item.locator('[data-editar]').first().click();
  await esperar(1400);
  await abrirTodosOsPassos();
  for (const [slot, arq] of c.fotos) {
    await subir(slot, arq);
    await abrirTodosOsPassos();
  }
  await salvar(c.nome);
  await esperar(1200);
}

await writeFile('out/funil-galeria-conserto.txt', notas.join('\n') || '(sem atrito)', 'utf8');
console.log('\nerros de console/rede:', [...new Set(erros)].join(' | ') || '(nenhum)');
await navegador.close();
