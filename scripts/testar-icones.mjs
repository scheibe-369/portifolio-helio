// Confere que as tres listas de icone do selo concordam.
//
// POR QUE ISTO EXISTE: o icone do selo e desenhado pelo lucide, que so pinta o que foi
// REGISTRADO em createIcons. Sao tres lugares que precisam falar a mesma coisa:
//
//   1. ICONES_SELO (iconesSelo.js)   o que o render aceita gravar no atributo data-lucide
//   2. ICONES_LUCIDE (iconesLucide.js)  o que o bundle registra de fato
//   3. o pacote lucide                  o que existe para ser importado
//
// Divergir nao da erro em lugar nenhum: o `<i data-lucide="chef-hat">` fica no HTML e
// simplesmente nao vira desenho. Um buraco no card de perfil, sem log, sem diff de DOM,
// visivel so para o comprador que escolheu aquele icone.
//
//   node scripts/testar-icones.mjs
import { ICONES_SELO } from '../src/modules/profile/lib/iconesSelo.js';

const lucide = await import('lucide');
const { ICONES_LUCIDE } = await import('../src/modules/profile/lib/iconesLucide.js');

let falhas = 0;
const falhar = (msg) => { falhas += 1; console.error(`FALHOU  ${msg}`); };

// 1. Todo icone que o render aceita precisa estar registrado no bundle.
for (const [kebab, pascal] of Object.entries(ICONES_SELO)) {
  if (!ICONES_LUCIDE[pascal]) {
    falhar(`"${kebab}" e aceito pelo render (ICONES_SELO) mas nao esta em ICONES_LUCIDE: sairia sem desenho`);
  }
  if (!lucide[pascal]) {
    falhar(`"${pascal}" nao existe no pacote lucide instalado`);
  }
}

// 2. O caminho contrario tambem importa, mas so como aviso de peso morto: ArrowRight e
//    ArrowUpRight sao do chrome da pagina e nao sao selos, entao ficam de fora da conta.
const CHROME = new Set(['ArrowRight', 'ArrowUpRight']);
const usados = new Set(Object.values(ICONES_SELO));
for (const pascal of Object.keys(ICONES_LUCIDE)) {
  if (!usados.has(pascal) && !CHROME.has(pascal)) {
    falhar(`"${pascal}" esta no bundle e nao e oferecido por ICONES_SELO nem usado pelo chrome: peso morto`);
  }
}

// 3. O formato da chave e o que vai para o atributo, e ele nao pode carregar aspas.
for (const kebab of Object.keys(ICONES_SELO)) {
  if (!/^[a-z][a-z0-9-]*$/.test(kebab)) {
    falhar(`"${kebab}" nao e um nome kebab-case valido para data-lucide`);
  }
}

if (falhas) {
  console.error(`\n${falhas} divergencia(s) entre as listas de icone`);
  process.exit(1);
}
console.log(`OK: ${Object.keys(ICONES_SELO).length} icones de selo, registrados no bundle e existentes no lucide`);
