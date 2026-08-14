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

  // ATENCAO, BURACO CONHECIDO E DELIBERADO:
  //
  // O bump de personalizacao ('custom') NAO TEM ID AQUI, e por isso ele NAO CASA NADA.
  // Ele vive dentro do checkout do principal e nao tem link proprio, entao o id dele so
  // aparece no corpo do primeiro evento real com o bump marcado.
  //
  // Consequencia enquanto esta linha nao existir: quem comprar o bump paga e nao recebe
  // has_custom. O evento cai em unmappedProductIds, o webhook responde 500 de proposito, a
  // Hubla retenta ate o teto de 10 tentativas e o alarme de "desistiu" avisa o dono. Ou
  // seja: a venda fica registrada e visivel, nao se perde em silencio.
  //
  // COMO PREENCHER: rodar
  //   select id, product_ids, payload->'event' from myportifolio.hubla_events
  //   where processed_at is null order by received_at desc;
  // pegar o id que nao esta neste mapa, acrescentar a linha abaixo e redeployar. A propria
  // retentativa da Hubla (ou um novo POST com o mesmo x-hubla-idempotency) conclui a venda,
  // porque processed_at ficou nulo de proposito.
  //
  // '<id-do-bump-de-personalizacao>': 'custom',
};
