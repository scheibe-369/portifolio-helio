// A CONFERENCIA DO VIDEO, num navegador de verdade e contra o YouTube de verdade.
//
// POR QUE NAO ENTRA NO `npm run verificar`: ele roda sem rede e sem navegador, e esta
// conferencia e as duas coisas. Ela carrega uma imagem (`new Image()`), que so existe no
// navegador, e depende da resposta da i.ytimg.com, que so existe com rede.
//
// POR QUE ELE EXISTE: o campo dizia "video reconhecido (AAAAAAAAAAA)" com um polegar verde,
// porque `parseYoutubeId` responde se o texto tem a FORMA de um link, e onze caracteres do
// alfabeto certo tem. Quem colasse o link errado, ou o link de um video que virou privado,
// publicava um card com um tocador morto e descobria pelo cliente.
//
// A ASSERCAO QUE IMPORTA E A SEPARACAO: id real responde `existe`, id inventado responde
// `nao-existe`, e falha de rede responde `indeterminado` e NAO acusa ninguem. As tres, porque
// so as duas primeiras fariam um teste que aprova bloquear quem esta sem internet.
//
//   node scripts/testar-video.mjs
import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const fonte = await readFile(resolve('src/modules/editor/lib/conferirVideo.js'), 'utf8');
const modulo = 'data:text/javascript;base64,' + Buffer.from(fonte, 'utf8').toString('base64');

let falhas = 0;
const checar = (nome, condicao, detalhe) => {
  if (!condicao) {
    falhas += 1;
    console.error(`FALHOU  ${nome}${detalhe ? `\n        ${detalhe}` : ''}`);
  }
};

// Ids reais tirados dos portfolios publicados, e inventados com a forma certa: onze
// caracteres do alfabeto que o YouTube usa. Sao esses que o parser aprova e o video nao existe.
const REAIS = ['K4DyBUG242c', '4D-ZGYFUxyM', 'nE1K4U8VSBQ', '_LGj734-vew'];
const INVENTADOS = ['AAAAAAAAAAA', 'zzzzzzzzzzz', '11111111111'];

const nav = await chromium.launch();
const pag = await nav.newPage();
await pag.route('https://teste.local/**', (rota) =>
  rota.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><meta charset="utf-8"><title>video</title>' }));
await pag.goto('https://teste.local/');

const r = await pag.evaluate(async ({ modulo, reais, inventados }) => {
  const { conferirVideo, videoSumido, URL_MINIATURA } = await import(modulo);
  const saida = { reais: [], inventados: [], sumido: {}, url: URL_MINIATURA('abc'), repetida: null, tamanhos: [] };
  // O TAMANHO E QUEM SEPARA, e o teste registra os numeros medidos para a proxima pessoa nao
  // ter que redescobrir por que `onload` sozinho nao serve: o 404 da miniatura carrega um
  // JPEG valido de 120x90, e o navegador dispara `onload` nele como em qualquer imagem.
  for (const id of [...reais, ...inventados]) {
    saida.tamanhos.push(await new Promise((res) => {
      const i = new Image();
      i.referrerPolicy = 'no-referrer';
      i.onload = () => res([id, i.naturalWidth, i.naturalHeight]);
      i.onerror = () => res([id, 0, 0]);
      i.src = URL_MINIATURA(id);
    }));
  }
  for (const id of reais) saida.reais.push([id, await conferirVideo(id)]);
  for (const id of inventados) saida.inventados.push([id, await conferirVideo(id)]);
  saida.sumido = { real: videoSumido(reais[0]), inventado: videoSumido(inventados[0]) };
  // Segunda chamada do mesmo id nao pode ir a rede de novo: a promessa fica em cache.
  const t0 = performance.now();
  await conferirVideo(reais[0]);
  saida.repetida = performance.now() - t0;
  saida.vazio = await conferirVideo('');
  return saida;
}, { modulo, reais: REAIS, inventados: INVENTADOS });

for (const [id, estado] of r.reais) checar(`${id} (real) responde existe`, estado === 'existe', `veio ${estado}`);
for (const [id, estado] of r.inventados) checar(`${id} (inventado) responde nao-existe`, estado === 'nao-existe', `veio ${estado}`);

checar('o conjunto de sumidos so guarda o que sumiu', r.sumido.inventado === true && r.sumido.real === false,
  JSON.stringify(r.sumido));
checar('id vazio nao vira acusacao', r.vazio === 'indeterminado', `veio ${r.vazio}`);
checar('a segunda pergunta sobre o mesmo id nao vai a rede', r.repetida < 20, `${r.repetida.toFixed(1)}ms`);
checar('a url da miniatura e a de tamanho alto', r.url === 'https://i.ytimg.com/vi/abc/hqdefault.jpg', r.url);

// SEM REDE, NINGUEM E ACUSADO. Este e o caso que separa "conferencia" de "bloqueio": quem
// esta offline, atras de um proxy ou num pais que bloqueia o dominio continua podendo salvar
// um video que existe.
const pag2 = await nav.newPage();
await pag2.route('https://teste.local/**', (rota) =>
  rota.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><meta charset="utf-8">' }));
await pag2.goto('https://teste.local/');
await pag2.route('https://i.ytimg.com/**', (rota) => rota.abort('failed'));
const semRede = await pag2.evaluate(async ({ modulo, id }) => {
  const { conferirVideo, videoSumido } = await import(modulo);
  const estado = await conferirVideo(id);
  return { estado, sumido: videoSumido(id) };
}, { modulo, id: REAIS[0] });

// Requisicao abortada dispara `onerror`. Video ausente NAO passa por ali: ele chega como
// imagem valida de 120x90, e por isso `onerror` so pode significar falha de rede. Se um dia
// isso se inverter, este caso reprova antes de alguem sem internet ser impedido de salvar um
// video que existe.
checar('rede cortada responde indeterminado, e nao "nao existe"', semRede.estado === 'indeterminado',
  `veio ${semRede.estado}`);
checar('rede cortada nao marca o id como sumido', semRede.sumido === false, `sumido ${semRede.sumido}`);

await nav.close();

console.log('\nid            estado       miniatura');
const porId = Object.fromEntries(r.tamanhos.map(([id, l, a]) => [id, `${l}x${a}`]));
for (const [id, e] of [...r.reais, ...r.inventados]) console.log(`${id.padEnd(14)}${e.padEnd(13)}${porId[id]}`);

// A MEDIDA QUE O MODULO USA, afirmada e nao so impressa: se um dia o cinza crescer ou a
// miniatura de verdade encolher, o corte de 200px deixa de separar, e e melhor descobrir aqui.
for (const [id, l] of r.tamanhos) {
  const real = REAIS.includes(id);
  checar(`${id}: miniatura ${real ? 'grande' : 'pequena'}`, real ? l >= 200 : l > 0 && l < 200, `${l}px de largura`);
}

if (falhas) {
  console.error(`\n${falhas} falha(s) na conferencia de video`);
  process.exit(1);
}
console.log(`\nOK: ${r.reais.length} videos reais e ${r.inventados.length} inventados, separados pela miniatura`);
