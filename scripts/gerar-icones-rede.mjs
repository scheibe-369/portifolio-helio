// Gera src/modules/profile/lib/iconesRede.js.
//
// POR QUE UM GERADOR, e nao um arquivo escrito a mao: metade dos desenhos vem do pacote
// `lucide`, que ja esta instalado e e a fonte da verdade dos icones de interface do produto.
// Copiar path a mao de um pacote que esta ali do lado e a receita para o desenho do arquivo
// divergir do desenho da biblioteca sem ninguem perceber. A outra metade sao marcas, que o
// lucide nao tem (ele e biblioteca de interface, nao de logo), e essas vem do Simple Icons.
//
// AS MARCAS FICAM EMBUTIDAS AQUI DENTRO, e nao num node_modules: sao 17 strings estaveis, o
// pacote inteiro do Simple Icons tem mais de 3000 icones, e nenhum deles precisa entrar no
// bundle nem na arvore de dependencia do produto para desenhar um logo do WhatsApp.
//
//   node scripts/gerar-icones-rede.mjs
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import * as lucide from 'lucide';

// Nome em portugues -> export do lucide. O nome e o que o comprador digita no editor, entao
// ele e escrito como a pessoa pensa, e nao como a biblioteca chama.
const LINHA = {
  mapa: 'MapPin',
  relogio: 'Clock',
  email: 'Mail',
  telefone: 'Phone',
  site: 'Globe',
  loja: 'Store',
  agenda: 'CalendarDays',
  catalogo: 'BookOpen',
  cardapio: 'UtensilsCrossed',
  estrela: 'Star',
  curriculo: 'FileText',
  carrinho: 'ShoppingBag',
  musica: 'Music',
  camera: 'Camera',
  maleta: 'Briefcase',
  coracao: 'Heart',
  conversa: 'MessageCircle',
  link: 'Link',
  pix: 'QrCode',
  video: 'Video',
};

const MARCAS = [
  'whatsapp', 'instagram', 'facebook', 'tiktok', 'linkedin', 'youtube', 'x', 'telegram',
  'spotify', 'soundcloud', 'behance', 'dribbble', 'pinterest', 'threads', 'twitch', 'vimeo',
  'github',
];

const pastaMarcas = resolve(process.cwd(), 'scripts/_icones');

const interno = (nos) =>
  nos
    .map(([tag, attrs]) => `<${tag} ${Object.entries(attrs).map(([k, v]) => `${k}="${v}"`).join(' ')}/>`)
    .join('');

const saida = {};

for (const chave of MARCAS) {
  const svg = await readFile(resolve(pastaMarcas, `${chave}.svg`), 'utf8');
  const m = /<path d="([^"]+)"/.exec(svg);
  if (!m) throw new Error(`sem path em ${chave}.svg`);
  saida[chave] = { m: 1, i: `<path d="${m[1]}"/>` };
}

for (const [chave, nome] of Object.entries(LINHA)) {
  const nos = lucide[nome];
  if (!Array.isArray(nos)) throw new Error(`lucide nao exporta ${nome} (icone "${chave}")`);
  const html = interno(nos);
  if (html.includes('"') === false) throw new Error(`icone ${chave} saiu vazio`);
  saida[chave] = { m: 0, i: html };
}

const linhas = Object.entries(saida)
  .map(([k, v]) => `  ${k}: { m: ${v.m}, i: '${v.i}' },`)
  .join('\n');

const corpo = `// ICONES DAS REDES E DOS CONTATOS. Zona [iso]: este arquivo roda no Worker e no navegador.
//
// GERADO POR scripts/gerar-icones-rede.mjs. Nao edite a mao: rode o gerador.
//
// POR QUE SVG EMBUTIDO, E NAO \`data-lucide\`: o caminho do \`data-lucide\` so vira desenho
// depois que o bundle carrega e o \`createIcons\` varre o DOM. No HTML servido pela borda o
// icone seria uma tag vazia, e ele esta no cartao de contato, que e das primeiras coisas que a
// pessoa reconhece de relance. Aqui ele existe no primeiro byte. E o \`lucide\` nao pode nem
// ser importado nesta zona (scripts/boundary.config.json).
//
// DUAS FAMILIAS, e a diferenca esta no \`m\`:
//   m: 1  MARCA. Solida, pintada com \`fill\`. Logo desenhado em contorno deixa de ser
//         reconhecivel. Origem: Simple Icons (https://simpleicons.org), licenca CC0 1.0.
//   m: 0  LINHA. Contorno de 1,8px, no mesmo traco do resto da interface. Origem: o pacote
//         \`lucide\` que o projeto ja usa, extraido na geracao.
//
// COR DA CASA, E NAO A COR DA MARCA, nas duas familias. Verde do WhatsApp, degrade do
// Instagram e vermelho do YouTube dentro do mesmo cartao brigariam entre si e com a paleta que
// o dono escolheu, e o produto tem doze paletas. Tudo sai em \`currentColor\`.
export const ICONES_REDE = {
${linhas}
};
`;

const destino = resolve(process.cwd(), 'src/modules/profile/lib/iconesRedeDados.js');
await writeFile(destino, corpo, 'utf8');
console.log(`${Object.keys(saida).length} icones (${MARCAS.length} marcas, ${Object.keys(LINHA).length} de linha) -> ${destino}`);
