// Compara dois HTML por DOM normalizado, nao por bytes.
//
// POR QUE NAO E DIFF DE TEXTO: a refatoracao da fase 0 troca aspas, reordena atributo e
// aplica escape em texto livre. Isso muda dezenas de bytes sem mudar UMA virgula do que o
// navegador desenha. Um diff de bytes reprovaria na primeira execucao e o oraculo seria
// carimbado no olho, que e exatamente o que ele existe para evitar.
//
// O QUE ELE NORMALIZA antes de comparar:
//   - ordem dos atributos (alfabetica)
//   - espaco em branco entre tags e dentro de texto (colapsado)
//   - ordem das classes dentro de class=""
//
// O QUE ELE NAO PERDOA: nó a mais, nó a menos, tag trocada, atributo com valor diferente,
// texto diferente. Ou seja, tudo que o usuario enxerga.
//
// A allowlist e FECHADA nos dois sentidos: diferenca fora dela reprova, e entrada dela que
// NAO apareceu tambem reprova. A segunda metade importa mais do que parece: allowlist que
// sobra e sinal de que a mudanca esperada nao aconteceu, e passar batido nisso e como nao
// ter oraculo nenhum.
//
//   node scripts/dom-diff.mjs snapshot/pt.html out/pt.html --allow scripts/expected-diffs.json
import { readFile } from 'node:fs/promises';
import { parseHTML } from 'linkedom';

const args = process.argv.slice(2);
const posicionais = [];
let allowArq = null;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--allow') { allowArq = args[++i]; continue; }
  posicionais.push(args[i]);
}
const [antesArq, depoisArq] = posicionais;

if (!antesArq || !depoisArq) {
  console.error('uso: node scripts/dom-diff.mjs <antes.html> <depois.html> [--allow lista.json]');
  process.exit(2);
}

const colapsar = (s) => (s || '').replace(/\s+/g, ' ').trim();

// Assinatura estavel de um elemento: tag + atributos ordenados, com class ordenada por
// dentro. Duas arvores com a mesma sequencia de assinaturas desenham a mesma coisa.
function assinatura(el) {
  const attrs = [...el.attributes]
    .map((a) => {
      const valor = a.name === 'class' ? colapsar(a.value).split(' ').sort().join(' ') : colapsar(a.value);
      return `${a.name}="${valor}"`;
    })
    .sort()
    .join(' ');
  return `<${el.tagName.toLowerCase()}${attrs ? ' ' + attrs : ''}>`;
}

function achatar(raiz) {
  const saida = [];
  const anda = (no, caminho) => {
    for (const filho of no.childNodes) {
      if (filho.nodeType === 1) {
        const cam = `${caminho}/${filho.tagName.toLowerCase()}`;
        saida.push({ tipo: 'el', caminho: cam, valor: assinatura(filho) });
        anda(filho, cam);
      } else if (filho.nodeType === 3) {
        const t = colapsar(filho.textContent);
        if (t) saida.push({ tipo: 'txt', caminho, valor: t });
      }
    }
  };
  anda(raiz, '');
  return saida;
}

const [htmlA, htmlB] = await Promise.all([readFile(antesArq, 'utf8'), readFile(depoisArq, 'utf8')]);
// linkedom so monta document.body a partir de um documento COMPLETO. Passar so o fragmento
// devolve body vazio, e o script diria "0 diferencas" sobre nada, que e pior que reprovar.
const emDocumento = (frag) => parseHTML(`<!doctype html><html><body>${frag}</body></html>`).document.body;
const a = achatar(emDocumento(htmlA));
const b = achatar(emDocumento(htmlB));
if (a.length === 0 || b.length === 0) {
  console.error(`ABORTADO: parse devolveu vazio (antes ${a.length}, depois ${b.length}). Sem arvore nao ha oraculo.`);
  process.exit(2);
}

let permitidas = [];
if (allowArq) {
  try {
    permitidas = JSON.parse(await readFile(allowArq, 'utf8'));
  } catch {
    console.error(`nao consegui ler a allowlist ${allowArq}`);
    process.exit(2);
  }
}
const usadas = new Set();

// Uma diferenca casa uma entrada da allowlist se a entrada aparecer como substring do lado
// "antes" ou do lado "depois". Substring, e nao igualdade, porque a entrada descreve o
// pedaco que muda, nao a linha inteira.
function permitida(dif) {
  for (let i = 0; i < permitidas.length; i++) {
    const p = permitidas[i];
    const alvo = `${dif.antes || ''} ${dif.depois || ''}`;
    if (alvo.includes(p.contem)) {
      usadas.add(i);
      return true;
    }
  }
  return false;
}

const diferencas = [];
const max = Math.max(a.length, b.length);
for (let i = 0; i < max; i++) {
  const x = a[i];
  const y = b[i];
  if (!x) { diferencas.push({ i, tipo: 'sobrando', depois: y.valor, caminho: y.caminho }); continue; }
  if (!y) { diferencas.push({ i, tipo: 'faltando', antes: x.valor, caminho: x.caminho }); continue; }
  if (x.valor !== y.valor || x.caminho !== y.caminho) {
    diferencas.push({ i, tipo: 'mudou', antes: x.valor, depois: y.valor, caminho: x.caminho });
  }
}

const naoPermitidas = diferencas.filter((d) => !permitida(d));
const allowSobrando = permitidas.map((p, i) => ({ p, i })).filter(({ i }) => !usadas.has(i));

console.log(`nos: antes ${a.length}, depois ${b.length}`);
console.log(`diferencas: ${diferencas.length} (permitidas ${diferencas.length - naoPermitidas.length})`);

for (const d of naoPermitidas.slice(0, 25)) {
  console.log(`\n  [${d.tipo}] em ${d.caminho}`);
  if (d.antes) console.log(`    antes : ${d.antes.slice(0, 180)}`);
  if (d.depois) console.log(`    depois: ${d.depois.slice(0, 180)}`);
}
if (naoPermitidas.length > 25) console.log(`\n  ... e mais ${naoPermitidas.length - 25}`);

for (const { p } of allowSobrando) {
  console.log(`\n  [ALLOWLIST NAO USADA] "${p.contem}" (${p.porque || 'sem motivo declarado'})`);
  console.log('    A mudanca esperada nao aconteceu, ou a entrada esta escrita errada.');
}

const falhou = naoPermitidas.length > 0 || allowSobrando.length > 0;
console.log(falhou ? '\nREPROVOU' : '\nOK: nenhuma diferenca fora da allowlist, e a allowlist inteira foi usada');
process.exit(falhou ? 1 : 0);
