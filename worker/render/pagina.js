import { SHELL_PUBLICO, MARCADOR_HEAD } from '../shell.gen.js';
import { renderPortfolioPage } from '../../src/app/portfolioPage.js';
import { t } from '../../src/app/i18n.js';
import { esc } from '../../src/modules/portfolio/lib/sanitize.js';
import { PAYLOAD_V_CORRENTE } from '../lib/env.js';
import { montarCtx, urlMidia } from '../../src/modules/portfolio/lib/ctx.js';

export { montarCtx };

// Monta o HTML de um tenant: shell buildado + <head> proprio + payload injetado + o mesmo
// render que roda no navegador.
//
// O escape vem de src/modules/portfolio/lib/sanitize.js e NAO e reimplementado aqui. Duas
// copias de escape divergem com o tempo, e a que divergir e um XSS servido de um subdominio
// nosso, o que queima o dominio inteiro junto com todos os clientes (risco R8).

// <head> POR TENANT ----------------------------------------------------------
// Todo valor passa por `esc`. Uma aspa nao escapada dentro de og:title e injecao de
// atributo, e og:title e exatamente o campo que o comprador digita.
function montarHead(ctx) {
  const { seo, portfolio, origin, lang } = ctx;
  const nome = portfolio.profile.name || '';
  const titulo = t(seo.title, lang) || nome;
  const descricao = t(seo.description, lang) || t(portfolio.profile.role, lang) || '';
  const canonical = `${origin}/`;
  const ogImagem = seo.ogImagePath ? urlMidia({ mediaBase: ctx.mediaBase }, seo.ogImagePath) : '';
  const heroi = portfolio.profile.mainImage || '';

  const linhas = [
    `<title>${esc(titulo)}</title>`,
    `<meta name="description" content="${esc(descricao)}" />`,
    `<link rel="canonical" href="${esc(canonical)}" />`,
    `<meta property="og:type" content="profile" />`,
    `<meta property="og:site_name" content="${esc(nome)}" />`,
    `<meta property="og:title" content="${esc(titulo)}" />`,
    `<meta property="og:description" content="${esc(descricao)}" />`,
    `<meta property="og:url" content="${esc(canonical)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(titulo)}" />`,
    `<meta name="twitter:description" content="${esc(descricao)}" />`,
  ];
  if (ogImagem) {
    linhas.push(`<meta property="og:image" content="${esc(ogImagem)}" />`);
    linhas.push(`<meta name="twitter:image" content="${esc(ogImagem)}" />`);
  }
  // O hero e o candidato a LCP da pagina e fica EAGER: preload alto aqui, e nunca
  // `loading="lazy"` no <img> (regra de midia do dono, aplicada nos dois lados).
  if (heroi) linhas.push(`<link rel="preload" as="image" href="${esc(heroi)}" fetchpriority="high" />`);
  // Previa e rascunho de cliente: fora do indice, e o header X-Robots-Tag e cinto, este meta
  // e suspensorio.
  if (ctx.isPreview) linhas.push(`<meta name="robots" content="noindex, nofollow" />`);

  return linhas.join('\n    ');
}

// PAYLOAD INJETADO -----------------------------------------------------------
// Vai em <script type="application/json">, e o cliente le com JSON.parse(el.textContent),
// nunca com o parser de JS. Escapar `<` sozinho ja mata `</script>` e `<!--`, mas os cinco
// vao juntos porque o teste e barato e a falha e XSS num dominio compartilhado por todos os
// clientes. U+2028 e U+2029 sao quebra de linha para o parser de JS e nao para o de JSON.
const ESCAPES_JSON = {
  '<': '\\u003c',
  '>': '\\u003e',
  '&': '\\u0026',
  '\u2028': '\\u2028',
  '\u2029': '\\u2029',
};
export function jsonParaScript(valor) {
  return JSON.stringify(valor).replace(/[<>&\u2028\u2029]/g, (c) => ESCAPES_JSON[c]);
}

// MONTAGEM FINAL -------------------------------------------------------------
// `#app` sai com a classe `ready` ja aplicada: o shell esconde `#app` com opacity 0 ate o JS
// ligar, o que faz sentido quando a pagina e pintada no navegador e nao faz nenhum quando ela
// ja chega pintada. Sem isso o SSR existiria e ninguem veria, ate o bundle carregar.
export function montarHtml(ctx, { payloadBruto }) {
  const corpo = renderPortfolioPage(ctx);
  const head = montarHead(ctx);
  const dados = jsonParaScript({
    slug: ctx.slug,
    lang: ctx.lang,
    origin: ctx.origin,
    mediaBase: ctx.mediaBase,
    flags: ctx.flags,
    isPreview: ctx.isPreview,
    payload: payloadBruto,
  });

  let html = SHELL_PUBLICO.replace(MARCADOR_HEAD, head);
  html = html.replace('<html lang="pt-br">', `<html lang="${ctx.lang === 'en' ? 'en' : 'pt-br'}">`);
  html = html.replace(
    '<div id="app"></div>',
    `<div id="app" class="ready">${corpo}</div>\n    <script type="application/json" id="pf-payload">${dados}</script>`,
  );
  return html;
}
