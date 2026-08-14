import { montarCtx } from '../../portfolio/lib/ctx.js';
import { baseMidiaPublica } from '../../media/lib/storage.js';
import { APEX_HOST } from '../config/editor.config.js';
import { carregarPortfolio, ehTitular as consultarTitular, perfilDaLinha } from '../api/portfolioApi.js';
import { carregarProjetos, projetoDaLinha } from '../api/projectsApi.js';
import { carregarExperiencias, experienciaDaLinha } from '../api/experiencesApi.js';

// Rascunho do editor: as linhas do banco, em memoria, e o `ctx` que o canvas consome.
// Zona [browser].
//
// A DECISAO QUE MANDA AQUI: o canvas e renderizado pela MESMA renderPortfolioPage() da pagina
// publica, com o MESMO montarCtx(). Nao existe uma segunda versao do portfolio para o editor.
// O preco de ter duas seria "na previa estava certo" virando categoria de ticket, e e o mesmo
// motivo de prevea e publicado passarem os dois por montar_payload_portfolio no banco.
//
// Consequencia direta: montarPayloadDoRascunho() abaixo e uma reimplementacao em JS do que
// aquela funcao SQL monta, e as duas precisam concordar. Onde elas divergirem, o comprador ve
// uma coisa no editor e outra no ar. As tres regras que mais custam se esquecidas estao
// marcadas com comentario no corpo.

const PAYLOAD_V = 2;

let estado = {
  portfolio: null,
  projetos: [],
  experiencias: [],
  ehTitular: true,
  temCustom: false,
};

const ouvintes = new Set();

export const getRascunho = () => estado;
export const assinar = (fn) => {
  ouvintes.add(fn);
  return () => ouvintes.delete(fn);
};
export const notificar = () => ouvintes.forEach((fn) => fn(estado));

export function definir(parcial) {
  estado = { ...estado, ...parcial };
  notificar();
}

export async function carregarRascunho({ temCustom }) {
  const portfolio = await carregarPortfolio();
  if (!portfolio) {
    estado = { portfolio: null, projetos: [], experiencias: [], ehTitular: true, temCustom };
    return estado;
  }
  const [projetos, experiencias, titular] = await Promise.all([
    carregarProjetos(portfolio.id),
    carregarExperiencias(portfolio.id),
    consultarTitular(portfolio.id).catch(() => true),
  ]);
  estado = { portfolio, projetos, experiencias, ehTitular: titular, temCustom };
  return estado;
}

// Rascunhos de formulario, derivados das linhas.
export const perfilAtual = () => (estado.portfolio ? perfilDaLinha(estado.portfolio) : null);
export const projetosAtuais = () => estado.projetos.map(projetoDaLinha);
export const experienciasAtuais = () => estado.experiencias.map(experienciaDaLinha);

// PAYLOAD DE RASCUNHO --------------------------------------------------------
export function montarPayloadDoRascunho() {
  const pf = estado.portfolio;
  const custom = estado.temCustom;

  // REGRA 1, a mesma normalizacao de saida de montar_payload_portfolio: sem o bump, o payload
  // sai com os DEFAULTS, independentemente do que estiver gravado nas colunas. Sem isto, o
  // canvas mostraria a cor que o comprador escolheu e a pagina publicada sairia cinza.
  const cor = (v, padrao) => (custom && v ? v : padrao);

  const projetos = estado.projetos
    .filter((p) => p.is_visible && !p.is_sample)
    .map(projetoDaLinha)
    .map((p, i) => ({ ...p, _ordem: i }));

  // REGRA 2: video primeiro quando projects_video_first, depois position, depois criacao.
  // A ordem e invariante editorial do produto e ela vive no `order by` do banco; repetir a
  // mesma comparacao aqui e o que faz o canvas concordar com o que vai ao ar.
  const ordenados = [...projetos].sort((a, b) => {
    const av = pf.projects_video_first && !a.video ? 1 : 0;
    const bv = pf.projects_video_first && !b.video ? 1 : 0;
    return av - bv || a.position - b.position || a._ordem - b._ordem;
  });

  const experiencias = estado.experiencias
    .filter((x) => x.is_visible && !x.is_sample)
    .map(experienciaDaLinha);

  // REGRA 3, e e a de consequencia mais grave: sem o consentimento do titular, nem o CAMINHO
  // do certificado sai daqui. Caminho de documento privado no payload ja e vazamento mesmo com
  // o bucket fechado, porque o caminho e exatamente o que o assinador precisa.
  const experienciasPayload = experiencias.map((x) => ({
    slug: x.slug,
    org: x.org,
    kind: x.kind,
    role: x.role,
    start: x.period_start,
    end: x.period_end || undefined,
    location: x.location || undefined,
    logoPath: x.logo_path || undefined,
    plateBg: cor(x.plate_bg, '#0b0b12'),
    highlights: x.highlights,
    note: x.note || undefined,
    certificatePath: x.certificate_public ? x.certificate_path : undefined,
    certificateLabel: x.certificate_public ? x.certificate_label || undefined : undefined,
  }));

  // A barra de filtros e DERIVADA das chaves realmente usadas, na ordem de primeiro uso.
  const vistos = [];
  ordenados.forEach((p) => (p.groups || []).forEach((g) => { if (!vistos.includes(g)) vistos.push(g); }));

  return {
    slug: pf.slug,
    lang: { default: pf.default_lang || 'pt', englishEnabled: Boolean(pf.english_enabled) },
    perPage: pf.projects_per_page || 6,
    theme: custom
      ? Object.fromEntries(
          Object.entries({ accent: pf.theme_accent, plateBg: pf.theme_plate_bg }).filter(([, v]) => v),
        )
      : {},
    profile: {
      name: pf.display_name,
      role: { pt: perfilAtual().role },
      avatarPath: pf.avatar_path || undefined,
      mainImagePath: pf.hero_path || undefined,
      heroObjectPosition: pf.hero_object_position,
      showOnlineDot: Boolean(pf.show_online_dot),
      badgeLabel: custom ? pf.badge_label : 'VibeCoder',
      badgeIcon: custom ? pf.badge_icon : 'code',
      ctaUrl: pf.cta_url || undefined,
      ctaLabel: custom ? pf.cta_label_i18n || undefined : undefined,
      bio: { pt: perfilAtual().bio },
      email: pf.show_contact_email ? pf.contact_email : undefined,
      socials: pf.socials || [],
      stats: pf.stats || [],
    },
    stacks: pf.stacks || [],
    filterGroups: vistos.map((k) => ({ key: k, label: { pt: k, en: k } })),
    projects: ordenados.map((p) => ({
      slug: p.slug,
      name: p.name,
      client: p.client || undefined,
      category: p.category,
      year: p.year || undefined,
      accent: cor(p.accent, '#7C5CFC'),
      plateBg: cor(p.plate_bg, '#0b0b12'),
      fit: p.image_fit === 'cover' ? 'cover' : undefined,
      imagePath: p.image_path || undefined,
      videoId: p.video ? p.video.split('/').pop() : undefined,
      tagline: p.tagline,
      problem: p.problem || undefined,
      solution: p.solution || undefined,
      features: p.features,
      stack: p.stack,
      link: p.link || undefined,
      linkNote: p.link_note || undefined,
      groups: p.groups || [],
    })),
    projectsEn: {},
    experiences: experienciasPayload,
    experiencesEn: {},
    seo: {},
  };
}

export function montarCtxDoRascunho() {
  if (!estado.portfolio) return null;
  return montarCtx(
    { mediaBase: baseMidiaPublica(), apexHost: APEX_HOST },
    {
      payload: montarPayloadDoRascunho(),
      slug: estado.portfolio.slug,
      url: new URL(window.location.href),
      isPreview: true,
      payloadVCorrente: PAYLOAD_V,
    },
  );
}
