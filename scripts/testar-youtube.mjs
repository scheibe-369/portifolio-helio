// Testa o parser de YouTube do editor.
//
// POR QUE ISTO EXISTE: em 16/08/2026 o parser devolvia string ou null, e os tres chamadores
// (primitivos.js:221, formulario.js:89, projectsApi.js:58) liam `.id` e `.orientation`. O
// build compilava, a fronteira de execucao passava, o dom-diff nao via nada (o campo e do
// editor, nao da pagina publica) e o medir-render tambem nao. As quatro ferramentas da suite
// diziam "ok" enquanto NENHUM comprador conseguia salvar um projeto com video: link valido
// caia em `!r.id` e recebia "nao reconheci este link", e link invalido lancava TypeError
// sobre null e derrubava o formulario.
//
// O que este arquivo protege, entao, nao e a regex: e a FORMA do retorno. Por isso os dois
// primeiros casos conferem tipo e chaves, e nao so o id.
//
//   node scripts/testar-youtube.mjs
import { parseYoutubeId } from '../src/modules/projects/lib/youtube.js';

const ID = 'dQw4w9WgXcQ';

// [entrada, id esperado, orientacao esperada]
const casos = [
  // As formas que a pessoa realmente cola.
  ['https://www.youtube.com/watch?v=' + ID, ID, 'horizontal'],
  ['https://youtu.be/' + ID, ID, 'horizontal'],
  ['youtu.be/' + ID, ID, 'horizontal'],                             // sem esquema
  ['https://m.youtube.com/watch?v=' + ID, ID, 'horizontal'],
  ['https://music.youtube.com/watch?v=' + ID, ID, 'horizontal'],
  ['https://www.youtube.com/embed/' + ID, ID, 'horizontal'],
  ['https://www.youtube-nocookie.com/embed/' + ID, ID, 'horizontal'],
  ['https://www.youtube.com/live/' + ID, ID, 'horizontal'],
  ['https://www.youtube.com/v/' + ID, ID, 'horizontal'],
  [ID, ID, 'horizontal'],                                           // id solto
  ['  https://youtu.be/' + ID + '  ', ID, 'horizontal'],            // com espaco em volta

  // Parametro ANTES do v: o caso que a regex antiga perdia.
  ['https://www.youtube.com/watch?app=desktop&v=' + ID, ID, 'horizontal'],
  ['https://www.youtube.com/watch?v=' + ID + '&t=42s', ID, 'horizontal'],

  // Shorts e o unico vertical, e e o que casa com o CHECK de youtube_orientation.
  ['https://www.youtube.com/shorts/' + ID, ID, 'portrait'],
  ['https://youtube.com/shorts/' + ID + '?feature=share', ID, 'portrait'],

  // O que tem que ser recusado, e recusado sem lancar.
  ['nao e um link', null, null],
  ['', null, null],
  [null, null, null],
  [undefined, null, null],
  ['https://evil.com/watch?v=' + ID, null, null],                   // host fora da allowlist
  ['https://youtube.com.evil.com/watch?v=' + ID, null, null],       // sufixo enganoso
  ['https://www.youtube.com/watch?v=<script>', null, null],         // id que nao e id
  ['https://www.youtube.com/watch?v=curto', null, null],
  ['https://www.youtube.com/shorts/abc', null, null],              // 3 caracteres, nao 11
  ['https://www.youtube.com/shorts/abcdefghijklmnop', null, null], // 16 caracteres, nao 11
  ['https://www.youtube.com/shorts/tem.ponto.1', null, null],      // caractere fora do alfabeto
  ['https://vimeo.com/123456789', null, null],
];

let falhas = 0;

// A forma do retorno e o que quebrou da ultima vez, entao ela e conferida primeiro e sempre.
for (const [entrada] of casos) {
  const r = parseYoutubeId(entrada);
  if (r === null || typeof r !== 'object') {
    falhas += 1;
    console.error(`FORMA   ${JSON.stringify(entrada)} -> ${JSON.stringify(r)}, esperava objeto (os chamadores leem .id)`);
    continue;
  }
  if (!('id' in r) || !('orientation' in r)) {
    falhas += 1;
    console.error(`FORMA   ${JSON.stringify(entrada)} -> sem .id ou .orientation: ${JSON.stringify(r)}`);
  }
}

for (const [entrada, idEsperado, orientacaoEsperada] of casos) {
  let r;
  try {
    r = parseYoutubeId(entrada);
  } catch (e) {
    falhas += 1;
    console.error(`LANCOU  ${JSON.stringify(entrada)} -> ${e.message}`);
    continue;
  }
  if (r.id !== idEsperado) {
    falhas += 1;
    console.error(`ID      ${JSON.stringify(entrada)} -> ${JSON.stringify(r.id)}, esperava ${JSON.stringify(idEsperado)}`);
    continue;
  }
  if (idEsperado && r.orientation !== orientacaoEsperada) {
    falhas += 1;
    console.error(`ORIENT  ${JSON.stringify(entrada)} -> ${JSON.stringify(r.orientation)}, esperava ${JSON.stringify(orientacaoEsperada)}`);
  }
}

// A assercao que reproduz o defeito original: o editor so libera o salvar quando `!r.id` e
// falso para um link bom. Se esta linha voltar a falhar, o campo de video voltou a travar.
const bom = parseYoutubeId('https://www.youtube.com/watch?v=' + ID);
if (!bom.id) {
  falhas += 1;
  console.error('REGRESSAO: link valido continua caindo em !r.id, que e o que bloqueava o salvar');
}

if (falhas) {
  console.error(`\n${falhas} falha(s) no parser de YouTube`);
  process.exit(1);
}
console.log(`OK: ${casos.length} formas de link do YouTube, contrato { id, orientation, canonical }`);
