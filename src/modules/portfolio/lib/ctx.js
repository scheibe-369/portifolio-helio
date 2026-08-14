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
function montarPortfolio(cfg, payload, { origem }) {
  const perfil = payload.profile || {};
  const projetos = (payload.projects || []).map((p) => ({ ...p, image: urlMidia(cfg, p.imagePath) }));
  const experiencias = (payload.experiences || []).map((x) => ({
    ...x,
    logo: urlMidia(cfg, x.logoPath),
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
      socials: perfil.socials || [],
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
    flags: { hasCustom: Boolean(adaptado.theme && Object.keys(adaptado.theme).length), englishEnabled: Boolean(idioma.englishEnabled) },
    isPreview,
    // Vem por parametro e nao e deduzido aqui: quem sabe qual slug e a vitrine e o Worker
    // (APEX_SLUG), e o navegador so sabe o que foi injetado no payload.
    vitrine,
    seo: adaptado.seo || {},
  });
}
