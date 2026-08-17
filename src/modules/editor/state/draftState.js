import { montarCtx } from '../../portfolio/lib/ctx.js';
import { baseMidiaPublica } from '../../media/lib/storage.js';
import { APEX_HOST } from '../config/editor.config.js';
import { carregarPortfolio, ehTitular as consultarTitular, perfilDaLinha } from '../api/portfolioApi.js';
import { carregarProjetos, projetoDaLinha } from '../api/projectsApi.js';
import { carregarExperiencias, experienciaDaLinha } from '../api/experiencesApi.js';
import { parseYoutubeId } from '../../projects/lib/youtube.js';

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

  // OS EXEMPLOS DO STARTER KIT APARECEM NO EDITOR, e nunca na pagina publicada.
  //
  // O filtro `!is_sample` estava nos dois lados, e com isso os exemplos que o kit cria eram
  // invisiveis ate para quem os recebeu: a pessoa escolhia a area no wizard, o banco criava
  // dois trabalhos de exemplo, e ela caia num editor que dizia "voce ainda nao cadastrou
  // nenhum trabalho". O ponto do exemplo e justamente ser visto e trocado.
  //
  // Quem continua filtrando e montar_payload_portfolio, no banco (0004:118), que e quem monta
  // o que vai ao ar. Ou seja: exemplo nao vaza para o visitante nem se a pessoa publicar sem
  // mexer neles.
  const projetos = estado.projetos
    .filter((p) => p.is_visible)
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
    .filter((x) => x.is_visible)
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
    logoPosition: x.logo_position || undefined,
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
    // O `theme` tem TRES origens com regras diferentes, e o previa so bate com a pagina se as
    // tres forem respeitadas aqui do mesmo jeito que montar_payload_portfolio faz:
    //   . accent e plateBg sao do bump, e somem quando a conta nao tem (REGRA 1, acima);
    //   . preset e da base e vale sempre;
    //   . background e da base e vale sempre, e 'none' nao vira ramo nenhum.
    theme: {
      ...(custom
        ? Object.fromEntries(
            Object.entries({ accent: pf.theme_accent, plateBg: pf.theme_plate_bg }).filter(([, v]) => v),
          )
        : {}),
      ...(pf.theme_preset ? { preset: pf.theme_preset } : {}),
      ...(pf.background_kind && pf.background_kind !== 'none'
        ? {
            background: {
              kind: pf.background_kind,
              path: pf.background_path || undefined,
              overlay: pf.background_overlay,
            },
          }
        : {}),
    },
    profile: {
      name: pf.display_name,
      role: { pt: perfilAtual().role },
      avatarPath: pf.avatar_path || undefined,
      mainImagePath: pf.hero_path || undefined,
      heroObjectPosition: pf.hero_object_position,
      showOnlineDot: Boolean(pf.show_online_dot),
      // O selo saiu do bump e passou a ser da base (migration 0014): dizer "Chef" ou
      // "Tatuadora" ao lado do proprio nome e identidade, nao estetica, e nao podia custar
      // R$ 37,90 ainda mais tendo como valor de fabrica o nome de outra profissao. Estas
      // duas linhas espelhavam a normalizacao do banco, e a normalizacao tambem deixou de
      // forcar: o previa tem que mostrar exatamente o que a pagina publicada vai mostrar.
      badgeLabel: pf.badge_label || undefined,
      badgeIcon: pf.badge_icon || undefined,
      avatarShape: pf.avatar_shape || undefined,
      ctaUrl: pf.cta_url || undefined,
      ctaLabel: custom ? pf.cta_label_i18n || undefined : undefined,
      bio: { pt: perfilAtual().bio },
      email: pf.show_contact_email ? pf.contact_email : undefined,
      socials: pf.socials || [],
      stats: pf.stats || [],
    },
    stacks: pf.stacks || [],
    // O previa tem que mostrar os titulos que a pessoa escreveu. Sem esta linha ela trocaria
    // "Stacks Dominadas" por "Minhas especialidades", salvaria, e continuaria vendo o texto
    // antigo no proprio editor, o que parece defeito de salvamento.
    uiLabels: pf.ui_labels || {},
    sections: pf.sections || [],
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
      imagePosition: p.image_position || undefined,
      gallery: p.gallery || [],
      // O previa usa o MESMO parser do salvar, e nao um split de barra. Com o split, um link
      // no formato `watch?v=ID` virava o id "watch?v=ID" e o iframe do previa nascia morto,
      // enquanto o que ia para o banco estava certo: o editor mentia sobre a propria pagina.
      // E sem a orientacao o previa mostrava todo Short deitado.
      ...(() => {
        const yt = p.video ? parseYoutubeId(p.video) : null;
        return yt && yt.id
          ? { videoId: yt.id, videoOrientation: yt.orientation || 'horizontal' }
          : { videoId: undefined, videoOrientation: undefined };
      })(),
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
