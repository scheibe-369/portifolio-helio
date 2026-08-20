// Traduz o payload publicado para o `ctx` que o render consome. Zona [iso].
//
// POR QUE ISTO NAO MORA NO WORKER: o navegador precisa do MESMO mapeamento. O Worker pinta
// a pagina no servidor e injeta o payload cru em <script id="pf-payload">; quando o bundle
// carrega, ele reconstroi o ctx a partir desse mesmo payload para poder re-renderizar na
// troca de idioma. Se existissem duas copias deste arquivo, a pagina mudaria sozinha no
// primeiro re-render, e o defeito apareceria como "o site pisca e fica diferente" sem erro
// nenhum no console. E a mesma razao de o escape ser um modulo so.
//
// PAYLOAD_V_CORRENTE entra por parametro em vez de import: ele mora em worker/lib/env.js,
// que e zona worker, e importar de la traria o Worker inteiro para dentro do bundle.

import { resolverTema } from '../theme/presets.js';

// PAYLOAD -> ctx.portfolio ---------------------------------------------------
// O snapshot publicado guarda CAMINHO RELATIVO de midia e `videoId`, nunca URL montada
// (achado 12). Quem monta a URL absoluta e este arquivo, no instante do request, e por isso
// trocar de storage vira deploy do Worker em vez de republish_all() sobre a base inteira.
export function urlMidia(cfg, caminho) {
  if (!caminho) return '';
  const s = String(caminho);
  // Absoluta ou caminho do nosso proprio dominio: e o portfolio do Helio, cuja midia ainda
  // mora em public/ e nao no Storage. Passa direto.
  if (/^https?:\/\//i.test(s) || s.startsWith('/')) return s;
  return cfg.mediaBase ? `${cfg.mediaBase}/${s}` : s;
}

// Adaptacao de formato (secao 4.9). Hoje so existe o formato corrente. Quando o `payload_v`
// subir, o adaptador da versao antiga nasce em src/modules/portfolio/payload/adapt-v<N>.js
// (zona iso, porque o editor tambem precisa dele) e entra aqui. Devolver null significa
// "nao sei renderizar isto", e quem chama responde 503 em vez de pagina quebrada.
function adaptarPayload(payload, payloadV, payloadVCorrente) {
  const v = Number(payloadV || payloadVCorrente);
  if (v === payloadVCorrente) return payload;
  return null;
}

// Traduz o payload publicado para a forma que o render consome. As chaves diferem de
// proposito: no banco o nome fala de armazenamento (`avatarPath`), no render fala de
// apresentacao (`avatar`), e e o Worker que faz a ponte.
// O PLACAR HISTORICO. Enquanto a cor da placa nao existia, montar_payload_portfolio emitia
// este hex fixo em todo projeto e em toda experiencia. Quem escolhe uma paleta espera que as
// placas acompanhem, e nao que sigam pretas azuladas por causa de um default antigo gravado
// linha a linha, entao o valor e reconhecido e cedido ao tema. Cor escolhida de proposito
// pelo comprador (que so existe com o bump) e diferente deste hex e continua vencendo.
const PLACA_HISTORICA = '#0b0b12';

function montarPortfolio(cfg, payload, { origem }) {
  const perfil = payload.profile || {};
  const tema = resolverTema(payload.theme || {});
  const placa = (v) => (!v || String(v).toLowerCase() === PLACA_HISTORICA ? tema.plate : v);
  const projetos = (payload.projects || []).map((p) => ({
    ...p,
    image: urlMidia(cfg, p.imagePath),
    plateBg: placa(p.plateBg),
    // A galeria guarda caminho relativo, como toda midia (achado 12): a URL absoluta nasce
    // aqui, no instante do request.
    gallery: (p.gallery || []).map((caminho) => urlMidia(cfg, caminho)),
    // A cor de destaque de um projeto sem cor propria passa a ser a do tema. Antes ela era o
    // roxo de fabrica, entao a borda do modal e o check dos itens saiam roxos numa pagina
    // inteira em ambar.
    accent: p.accent && p.accent.toLowerCase() !== '#7c5cfc' ? p.accent : tema.accent,
  }));
  const experiencias = (payload.experiences || []).map((x) => ({
    ...x,
    logo: urlMidia(cfg, x.logoPath),
    plateBg: placa(x.plateBg),
    // O certificado e o unico arquivo do comprador que o visitante NAO busca no Storage: o
    // botao aponta para uma rota nossa, que assina uma URL de vida curta e responde 302. URL
    // assinada expira em minutos e o snapshot vive em cache por muito mais que isso, entao
    // congelar a assinada no HTML entregaria link morto (4.7.1).
    certificate: x.certificatePath ? { url: `${origem}/certificado/${x.slug}`, label: x.certificateLabel } : null,
  }));

  return {
    profile: {
      ...perfil,
      avatar: urlMidia(cfg, perfil.avatarPath),
      mainImage: urlMidia(cfg, perfil.mainImagePath),
      stats: perfil.stats || [],
      registro: perfil.registro || '',
      endereco: perfil.endereco || '',
      horario: perfil.horario || '',
      socials: perfil.socials || [],
      // Icone de marca ao lado do nome da rede. Comparacao com `true` de proposito, e nao
      // `!== false`: quem le este ctx tambem e o snapshot do Helio, montado a partir do
      // fixture estatico, onde a chave nao existe. Com `!== false` o `undefined` de la ligaria
      // os icones e mudaria o oraculo visual do produto sem ninguem pedir.
      socialsIcons: perfil.socialsIcons === true,
    },
    // Os titulos que o dono da pagina reescreveu. Objeto vazio significa "usa os de hoje", e
    // e o estado de todo tenant publicado antes da migration 0015.
    uiLabels: payload.uiLabels || {},
    // A ordem e a visibilidade das secoes, cruas. Quem valida e resolve e o render
    // (src/app/secoes.js), porque a regra de 'chave desconhecida e ignorada' tem que valer
    // igual no Worker e no editor.
    sections: payload.sections || [],
    theme: tema,
    // Quantos cards por pagina. O select existe no editor desde sempre e nao mudava nada,
    // porque a interacao tinha o numero cravado.
    perPage: Number(payload.perPage) || 6,
    // O fundo escolhido.  ja sai montada aqui, porque o banco guarda caminho relativo
    // e quem transforma em URL absoluta e este arquivo, no instante do request (achado 12).
    background: {
      kind: (payload.theme && payload.theme.background && payload.theme.background.kind) || "none",
      url: urlMidia(cfg, payload.theme && payload.theme.background && payload.theme.background.path),
      overlay: payload.theme && payload.theme.background && payload.theme.background.overlay,
    },
    projects: projetos,
    stacks: payload.stacks || [],
    // `experiences` ausente e lista vazia, e nao erro: um tenant publicado ANTES da migration
    // 0007 continua no ar com o payload que ele tinha (criterio 26 de 4.10).
    experience: experiencias,
    // O render filtra pelos grupos de cada card, e a barra de filtros vem derivada do banco.
    projectGroups: Object.fromEntries(projetos.map((p) => [p.slug, p.groups || []])),
    filterGroups: payload.filterGroups || [],
  };
}

export function montarCtx(cfg, { payload, payloadV, slug, url, isPreview = false, payloadVCorrente, vitrine = false }) {
  const adaptado = adaptarPayload(payload, payloadV, payloadVCorrente);
  if (!adaptado) return null;

  const origem = `${url.protocol}//${url.host}`;
  const idioma = adaptado.lang || {};
  // Fase 1 e so portugues. `default` ja existe na coluna desde agora para a fase 3 nao ser
  // migration nova, mas quem escolhe o idioma do visitante ainda nao existe.
  const lang = idioma.default === 'en' ? 'en' : 'pt';

  return Object.freeze({
    lang,
    portfolio: montarPortfolio(cfg, adaptado, { origem }),
    slug,
    apexHost: cfg.apexHost,
    origin: origem,
    mediaBase: cfg.mediaBase,
    // hasCustom olha as DUAS colunas do bump, e nao a presenca de `theme`. Desde a 0017 todo
    // payload carrega theme.preset, que e da base: a deducao antiga passaria a dizer que todo
    // comprador tem a personalizacao paga.
    flags: {
      hasCustom: Boolean(adaptado.theme && (adaptado.theme.accent || adaptado.theme.plateBg)),
      englishEnabled: Boolean(idioma.englishEnabled),
    },
    isPreview,
    // Vem por parametro e nao e deduzido aqui: quem sabe qual slug e a vitrine e o Worker
    // (APEX_SLUG), e o navegador so sabe o que foi injetado no payload.
    vitrine,
    seo: adaptado.seo || {},
  });
}
