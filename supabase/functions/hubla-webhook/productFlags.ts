// Mapa id (Hubla) -> flag interna do MyPortifolio.
//
// LEIA ISTO ANTES DE MEXER: as chaves aqui sao ID DE **OFERTA**, nao de produto.
//
// Foi assim que o payload de uma venda real, em 14/08/2026, mostrou que a Hubla modela:
//
//   product  dol37hflBB4LloFHpGab   "My portifolio"
//     +-- offer  U9cuWxeCOsTvt4urY5vS   "principal"
//     +-- offer  vNYCSzkdxb4ehMKTYLTD   "Personalizacao"
//
// O order bump NAO e um produto. Ele e outra OFERTA do mesmo produto. Comprar o principal
// com o bump marcado gera DOIS eventos, os dois com o mesmo `products[].id`, e o que os
// distingue mora em `products[].offers[].id`.
//
// A CONSEQUENCIA, que custou uma venda de teste: a versao anterior deste arquivo tinha o id
// do PRODUTO mapeado para 'main', e o codigo so lia `products[].id`. Os dois eventos casaram
// 'main', o segundo nao acrescentou nada, e quem pagou o bump nao recebeu has_custom. Nao
// deu erro em lugar nenhum: os dois eventos fecharam com resultado 'ok'.
//
// POR QUE O ID DO PRODUTO SAIU DAQUI: ele e o mesmo nas duas ofertas. Mantido no mapa, ele
// concederia 'main' em QUALQUER evento do produto, inclusive no do bump comprado sozinho.
// Quem decide a flag e a oferta; o produto so diz de quem e o evento (PRODUTOS_MYPORTIFOLIO,
// abaixo).
//
// POR QUE OS ALIASES DE ANTES FUNCIONAVAM MEIO CERTO: os "segundos ids" que estavam aqui
// eram os slugs das urls de checkout (pay.hub.la/<slug>), e o slug do checkout E o id da
// oferta. Ou seja, a linha certa ja estava no arquivo por coincidencia, e a errada (a do
// produto) e que mascarava o problema.

export type Flag = 'main' | 'custom' | 'setup';

// OFERTAS. E aqui que se decide o que a pessoa comprou.
export const PRODUCT_FLAG_MAP: Record<string, Flag> = {
  // Oferta "principal", R$ 47,90. Confirmada num evento real (checkout
  // pay.hub.la/U9cuWxeCOsTvt4urY5vS).
  U9cuWxeCOsTvt4urY5vS: 'main',

  // Oferta "Personalizacao", R$ 37,90. Confirmada no mesmo evento real: ela chega como uma
  // segunda entrada em products[].offers[], com o produto identico ao da principal.
  //
  // O PRECO SAIU DA NOTA, e nao do painel: a fatura veio com totalCents 8580 para a compra
  // das duas ofertas juntas, e 85,80 menos 47,90 da 37,90.
  vNYCSzkdxb4ehMKTYLTD: 'custom',

  // Facilitacao, R$ 490 (checkout pay.hub.la/q7IxDLHWM6OI8EBmrreo). AINDA NAO CONFIRMADA em
  // evento: este id e o slug do checkout, e o slug do checkout provou ser o id da oferta nos
  // outros dois casos. Se a primeira venda de facilitacao nao casar, o id verdadeiro aparece
  // no processing_error do evento travado.
  q7IxDLHWM6OI8EBmrreo: 'setup',
};

// PRODUTOS. Nao concedem nada: servem so para o Worker saber que o evento e nosso e para nao
// acusar o id do produto como "desconhecido" a cada venda.
//
// Sem esta lista, todo evento do MyPortifolio gravaria um processing_error dizendo que
// dol37hflBB4LloFHpGab nao esta mapeado, e alarme que dispara em venda que deu certo e
// alarme que ninguem le.
export const PRODUTOS_MYPORTIFOLIO = new Set<string>(['dol37hflBB4LloFHpGab']);

// REGRA DE OURO, e agora ela tem cicatriz: o unico id em que se pode confiar e o que chega no
// corpo de um evento real, e e preciso olhar o NIVEL certo do corpo. Painel da Hubla mostra
// produto; quem paga a conta e a oferta.
//
// COMO CONFERIR, depois de qualquer venda:
//   select jsonb_pretty(payload) from myportifolio.hubla_events order by received_at desc limit 2;
// e olhar event.products[].offers[].id.
