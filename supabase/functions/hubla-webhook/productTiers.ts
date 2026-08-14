// Mapa productId (Hubla) -> tier interno. IDs descobertos no painel Hubla
// (Produtos, 2026-07-20). Cada produto entra com dois aliases: o id exibido na
// listagem de produtos (o que a doc indica como o id do payload do webhook) e o
// id interno da URL de edicao (/edit/<id>), por seguranca. Ids sao unicos por
// produto, entao aliases extras nao criam risco de conceder tier errado.

export type Tier = 'main' | 'skills_plugins' | 'artigos';

export const PRODUCT_TIER_MAP: Record<string, Tier> = {
  // "AI Block" (produto principal, checkout pay.hub.la/PGIg5fGjLrjOO6gNAAlN)
  PGIg5fGjLrjOO6gNAAlN: 'main',
  K8dbjBUlx71gQE5V9Ev5: 'main',

  // "AI Block skills e plugins" (bump, checkout pay.hub.la/zsQE6nQ0XCHB2R8PhnKQ)
  sKgyRyvjjZXSPot3dYjq: 'skills_plugins',
  D0JMSRQiRit7h91t9fOR: 'skills_plugins',

  // "Ai Block - artigos semanais, insights e artifacts" (bump, checkout pay.hub.la/Yt9mr07NoGdqtit33TbO)
  pL730XjtyxDlTxboJaNp: 'artigos',
  JvvKdZ5itthK40unIkPZ: 'artigos',
};
