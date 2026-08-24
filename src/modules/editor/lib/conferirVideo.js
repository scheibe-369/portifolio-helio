// O VIDEO EXISTE MESMO? Zona [browser].
//
// `parseYoutubeId` responde outra pergunta: se o texto TEM A FORMA de um link do YouTube.
// Ele aceita `AAAAAAAAAAA` porque sao onze caracteres do alfabeto certo, e o editor dizia
// "video reconhecido (AAAAAAAAAAA)" com um polegar verde. Reconhecido era o formato, e nao o
// video: quem colasse o link errado, ou o link de um video que virou privado, publicava um
// card com um tocador morto e so descobria pelo cliente que reclamou.
//
// COMO SE CONFERE SEM CHAVE DE API, E O DETALHE QUE QUASE ME ENGANOU.
//
// A miniatura de um id inexistente responde `HTTP 404`. Sabendo disso, a primeira versao
// deste arquivo usou `onload` contra `onerror` de um `new Image()`, e ela nao funcionava: o
// corpo desse 404 sao 1097 bytes de um JPEG VALIDO, o retangulo cinza de 120x90 do YouTube.
// O navegador decodifica, acha uma imagem legitima e dispara `onload`. Os sete ids do teste
// responderam "existe", inclusive os tres inventados.
//
// Quem separa e o TAMANHO. Miniatura de video que existe vem 480x360; a do id inexistente vem
// 120x90. Medido nos mesmos sete ids, quatro reais e tres inventados, e a separacao e limpa.
// Ou seja, a suposicao S27 do plano estava certa sobre o que o NAVEGADOR ve, e o `curl` que
// mostra 404 e verdadeiro e irrelevante aqui.
//
// POR QUE `Image()` E NAO `fetch`: a i.ytimg.com nao manda cabecalho de CORS, entao um fetch
// do navegador seria bloqueado antes de ler status ou bytes. Carregar como imagem nao passa
// por CORS nenhum, e `naturalWidth` e legivel de qualquer origem. De quebra, a mesma
// requisicao ja traz a miniatura para mostrar na tela, que e o que responde "e ESTE video?"
// em vez de "existe algum video com esse codigo".
//
// TRES RESPOSTAS, E NAO DUAS. `indeterminado` existe porque quem esta sem rede, atras de um
// proxy corporativo ou num pais que bloqueia o dominio nao pode ser impedido de salvar um
// video que existe. Silencio da rede nunca vira acusacao.

const CACHE = new Map();
const AUSENTES = new Set();
const TETO_MS = 6000;
// O retangulo cinza tem 120 de largura, e a miniatura de verdade tem 480. O corte no meio nao
// depende de o YouTube manter os dois numeros exatos, so de eles nao se aproximarem.
const LARGURA_MINIMA = 200;

export const URL_MINIATURA = (id) => `https://i.ytimg.com/vi/${encodeURIComponent(id)}/hqdefault.jpg`;

// Consulta sincrona do que ja se sabe. E ela que o validador do formulario usa, porque
// validacao de campo e sincrona e nao pode esperar rede.
export const videoSumido = (id) => AUSENTES.has(id);

export function conferirVideo(id) {
  if (!id) return Promise.resolve('indeterminado');
  if (CACHE.has(id)) return CACHE.get(id);

  const promessa = new Promise((resolve) => {
    let respondido = false;
    const responder = (r) => {
      if (respondido) return;
      respondido = true;
      if (r === 'nao-existe') AUSENTES.add(id);
      else AUSENTES.delete(id);
      // Resposta indeterminada NAO fica no cache: ela quer dizer "nao deu para saber agora", e
      // guardar isso condenaria o campo a nunca mais tentar enquanto a tela estivesse aberta.
      if (r === 'indeterminado') CACHE.delete(id);
      resolve(r);
    };

    const img = new Image();
    const relogio = setTimeout(() => {
      img.src = '';
      responder('indeterminado');
    }, TETO_MS);
    img.onload = () => {
      clearTimeout(relogio);
      responder(img.naturalWidth >= LARGURA_MINIMA ? 'existe' : 'nao-existe');
    };
    // `onerror` aqui e falha de REDE, e nao video ausente: video ausente chega como imagem
    // valida, pequena. Sem rede a resposta certa e "nao sei", nunca "nao existe".
    img.onerror = () => {
      clearTimeout(relogio);
      responder('indeterminado');
    };
    img.referrerPolicy = 'no-referrer';
    img.src = URL_MINIATURA(id);
  });

  CACHE.set(id, promessa);
  return promessa;
}
