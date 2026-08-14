// Mapa productId (Hubla) -> flag interna do MyPortifolio.
//
// POR QUE UM SEGUNDO MAPA, e nao um acrescimo no productTiers.ts do AI Block: a Hubla
// aponta para UMA url de webhook, entao a mesma funcao recebe os eventos dos dois
// produtos. Manter os mapas separados e o que garante que um id do MyPortifolio nunca
// caia na RPC public.grant_or_revoke_member_access (a do AI Block) e vice-versa. Id que
// casa aqui vai para myportifolio.grant_or_revoke_member_access, e so para ela.
//
// POR QUE DOIS ALIASES POR PRODUTO: o mesmo padrao que ja roda em producao no AI Block. O
// painel da Hubla mostra um id na listagem e outro na url de edicao, e o corpo do evento
// pode trazer qualquer um dos dois. Id sobrando nao concede nada errado, porque id e unico
// por produto. Id faltando e venda que nao libera, que e o defeito caro.
//
// REGRA DE OURO: o unico id em que se pode confiar de verdade e o que chega no corpo de um
// evento real. Depois da primeira compra de teste, conferir o product_ids gravado em
// myportifolio.hubla_events contra este arquivo, em vez de confiar no painel.

export type Flag = 'main' | 'custom' | 'setup';

export const PRODUCT_FLAG_MAP: Record<string, Flag> = {
  // "My portifolio" principal, R$ 47,90 (checkout pay.hub.la/U9cuWxeCOsTvt4urY5vS).
  // Este checkout ja carrega o order bump de personalizacao dentro dele.
  dol37hflBB4LloFHpGab: 'main',
  U9cuWxeCOsTvt4urY5vS: 'main',

  // Facilitacao, R$ 490 (checkout pay.hub.la/q7IxDLHWM6OI8EBmrreo). Upsell dentro do
  // editor, nunca na pagina de oferta. Aplicar esta flag tambem abre a linha da fila em
  // myportifolio.setup_requests, porque e trabalho humano e sem fila vende e nao entrega.
  q7IxDLHWM6OI8EBmrreo: 'setup',

  // Bump de personalizacao (R$ 37,00). Ele vive DENTRO do checkout do principal e nao tem
  // link proprio, entao nao da para ler o id de uma url como nos dois de cima.
  //
  // ESTE ID VEIO DO PAINEL, E NAO DE UM EVENTO. Em 14/08/2026 nao havia um unico evento em
  // myportifolio.hubla_events (a tabela estava zerada), entao ele NAO foi conferido contra a
  // regra de ouro logo abaixo. Esta linha e uma aposta informada, nao um fato verificado.
  //
  // POR QUE ENTRAR MESMO ASSIM: o risco e assimetrico. Se o id estiver certo, a primeira
  // venda com o bump ja libera has_custom. Se estiver errado, ele simplesmente nunca casa
  // nada (nenhum dos 6 ids do AI Block e este, entao nao existe colisao possivel), e o
  // evento do bump cai no mesmo caminho de antes: 500, retentativa, fila de eventos travados
  // com o id de verdade em destaque. Ou seja, errar aqui devolve exatamente a situacao
  // anterior, e acertar economiza uma venda travada.
  vNYCSzkdxb4ehMKTYLTD: 'custom',

  // COMO CONFIRMAR, na primeira venda de verdade com o bump marcado:
  //   select product_ids, applied_flags, processed_result
  //   from myportifolio.hubla_events order by received_at desc limit 5;
  // Se applied_flags trouxer 'custom', o id acima esta certo e este comentario pode virar
  // uma frase so. Se o evento estiver com processed_at nulo e um id desconhecido em
  // product_ids, o id certo e ESSE: troque a linha acima por ele e redeploye. A venda se
  // conclui sozinha na retentativa, porque processed_at fica nulo de proposito.

  // REGRA DE OURO, repetida aqui porque e o que separa "pagou e entrou" de "pagou e nao
  // entrou": o unico id em que se pode confiar de verdade e o que chega no corpo de um
  // evento real. Painel e chute educado.
};
