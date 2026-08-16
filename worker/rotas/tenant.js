import { rpc, assinarDocumento } from '../lib/supabase.js';
import {
  lerPonteiro,
  gravarPonteiro,
  lerDocumento,
  gravarDocumento,
  lerSocorro,
  gravarSocorro,
  apagarTenant,
  carimbar,
} from '../lib/cache.js';
import { montarCtx, montarHtml, ehDemo } from '../render/pagina.js';
import { PAYLOAD_V_CORRENTE } from '../lib/env.js';
import { naoExiste, bloqueado, indisponivel } from '../render/paginas.js';

// O caminho quente do produto: uma requisicao no subdominio de um comprador.
//
// X-Portfolio-Cache e escrito por nos e e o portao de todo criterio de cache do plano,
// porque `cf-cache-status` fala do cache da zona e nao do nosso (suposicoes S2 e S3).

const HTML = 'text/html; charset=utf-8';

// A RESPOSTA AO VISITANTE NAO LEVA O `immutable` DO CACHE INTERNO, e a diferenca e de
// seguranca e nao de performance. Dentro da Cache API a chave e (portfolio_id,
// content_hash), que nunca colide entre tenants. Ja no navegador a chave e a URL, ou seja o
// SLUG, e slug troca de dono (change_my_slug, e reuso depois da retencao de 90 dias). Um ano
// de `immutable` no navegador serviria o portfolio do dono anterior para quem visitou antes,
// e ninguem tem como purgar o cache do navegador de terceiro.
const CACHE_VISITANTE = 'public, max-age=60';

function html(corpo, status, extras = {}) {
  const h = new Headers(extras);
  h.set('content-type', HTML);
  return new Response(corpo, { status, headers: h });
}

// O cinto do noindex das paginas de demonstracao. O suspensorio e a meta tag, escrita em
// worker/render/pagina.js; o header existe porque ele vale mesmo para quem le a resposta sem
// interpretar o HTML, e porque uma pagina servida do CACHE nao passa pelo render de novo.
const cabecalhoDemo = (slug) => (ehDemo(slug) ? { 'x-robots-tag': 'noindex, nofollow' } : {});

// ROTA PRINCIPAL -------------------------------------------------------------
export async function servirTenant({ request, url, slug, cfg, ctx }) {
  const previa = url.searchParams.get('previa');
  if (previa) return servirPrevia({ url, slug, previa, cfg });

  const cert = url.pathname.match(/^\/certificado\/([a-z0-9][a-z0-9-]{0,62})\/?$/);
  if (cert) return servirCertificado({ slug, slugExperiencia: cert[1], cfg });

  // No subdominio de um comprador so existe a raiz. Arquivo estatico ja foi resolvido pelo
  // binding ASSETS antes de chegar aqui.
  if (url.pathname !== '/') {
    return html(naoExiste({ slug, apexHost: cfg.apexHost }), 404, {
      'cache-control': 'public, max-age=60',
      'x-robots-tag': 'noindex',
    });
  }

  // 1) Ponteiro e documento no colo: zero subrequest.
  const ponteiro = await lerPonteiro(cfg, slug);
  if (ponteiro && ponteiro.fresco && ponteiro.portfolioId && ponteiro.contentHash) {
    const doc = await lerDocumento(cfg, ponteiro.portfolioId, ponteiro.contentHash);
    if (doc) return carimbar(doc, { 'X-Portfolio-Cache': 'hit', 'cache-control': CACHE_VISITANTE, ...cabecalhoDemo(slug) });
  }

  // 2) Miss, que e o caso mediano deste produto (muitos tenants, poucas visitas cada, e o
  // cache e por colo). Um round trip a sa-east-1, com timeout curto.
  let r;
  try {
    r = await rpc(cfg, 'get_published_portfolio', { p_slug: slug });
  } catch {
    return await socorroOu503(cfg, ponteiro);
  }

  const status = r && r.status;

  if (status === 'moved') {
    // O hostname antigo precisa continuar tendo DNS e TLS validos para conseguir responder
    // este 301, e e o curinga que cobre isso.
    const destino = `https://${r.slug}.${cfg.apexHost}${url.pathname}${url.search}`;
    return new Response(null, {
      status: 301,
      headers: { location: destino, 'cache-control': 'public, max-age=3600' },
    });
  }

  if (status === 'gone') {
    apagarTenant(ctx, cfg, slug, ponteiro && ponteiro.portfolioId);
    return html(bloqueado(), 410, {
      // Revogacao nao pode ficar presa na borda nem no navegador.
      'cache-control': 'no-store',
      'x-robots-tag': 'noindex, nofollow',
    });
  }

  if (status === 'not_found') {
    apagarTenant(ctx, cfg, slug, ponteiro && ponteiro.portfolioId);
    // 60 segundos de proposito: o slug pode ser comprado a qualquer instante, e cachear
    // "nao existe" por muito tempo faz o cliente novo achar que a compra nao funcionou.
    return html(naoExiste({ slug, apexHost: cfg.apexHost }), 404, {
      'cache-control': 'public, max-age=60',
      'x-robots-tag': 'noindex',
    });
  }

  if (status === 'throttled') {
    // Teto de leitura daquele tenant estourado. Quem paga a conta do excesso e o atacante, e
    // o visitante legitimo que cair na janela recebe a copia de socorro, que e exatamente o
    // caso em que ela vale mais.
    return await socorroOu503(cfg, ponteiro);
  }

  if (status !== 'ok' || !r.payload) return await socorroOu503(cfg, ponteiro);

  // payload_v maior que o corrente e Worker mais velho que o banco (janela de deploy). Nunca
  // renderizar formato do futuro: serve o que houver em cache, e senao 503 (secao 4.9).
  // A faixa de compra sai daqui: e o slug da vitrine que a liga, nunca o hostname, senao as
  // duas versoes da MESMA pagina disputariam a mesma chave de cache.
  const pagina = montarCtx(cfg, { payload: r.payload, payloadV: r.payloadV, slug, url, payloadVCorrente: PAYLOAD_V_CORRENTE, vitrine: slug === cfg.apexSlug });
  if (!pagina) {
    const doc = await lerDocumento(cfg, r.portfolioId, r.contentHash);
    if (doc) return carimbar(doc, { 'X-Portfolio-Cache': 'hit', 'cache-control': CACHE_VISITANTE, ...cabecalhoDemo(slug) });
    return await socorroOu503(cfg, { portfolioId: r.portfolioId });
  }

  const corpo = montarHtml(pagina, { payloadBruto: r.payload });

  // As tres gravacoes ficam fora do caminho da resposta.
  gravarDocumento(ctx, cfg, r.portfolioId, r.contentHash, corpo);
  gravarSocorro(ctx, cfg, r.portfolioId, corpo);
  gravarPonteiro(ctx, cfg, slug, {
    portfolioId: r.portfolioId,
    contentHash: r.contentHash,
    payloadV: r.payloadV,
  });

  return html(corpo, 200, { 'X-Portfolio-Cache': 'miss', 'cache-control': CACHE_VISITANTE, ...cabecalhoDemo(slug) });
}

// SOCORRO --------------------------------------------------------------------
// Aqui o ponteiro VELHO vale, e e o unico lugar onde ele vale: durante uma queda do Supabase
// ele e o mapa slug -> portfolio_id, sem o qual nem da para saber qual copia de socorro
// buscar. O valor dela e disponibilidade: e o que impede "Supabase caiu" de virar "todos os
// portfolios pagos cairam juntos".
async function socorroOu503(cfg, ponteiro) {
  const pid = ponteiro && ponteiro.portfolioId;
  if (pid) {
    const socorro = await lerSocorro(cfg, pid);
    if (socorro) {
      return carimbar(socorro, {
        'X-Portfolio-Cache': 'socorro',
        'X-Portfolio-Stale': '1',
        'cache-control': 'no-store',
      });
    }
  }
  return html(indisponivel(), 503, {
    'cache-control': 'no-store',
    'retry-after': '30',
    'x-robots-tag': 'noindex',
  });
}

// PREVIA ---------------------------------------------------------------------
// Mesmo host do portfolio, para o comprador ver exatamente o que o visitante veria. NUNCA
// passa pela Cache API: rascunho de cliente cacheado na borda e rascunho servido a estranho.
async function servirPrevia({ url, slug, previa, cfg }) {
  let payload;
  try {
    payload = await rpc(cfg, 'get_draft_portfolio', { p_slug: slug, p_token: previa });
  } catch {
    return html(indisponivel(), 503, { 'cache-control': 'no-store', 'retry-after': '30', 'x-robots-tag': 'noindex' });
  }

  // A RPC devolve null quando o token nao casa, e a resposta e o 404 IGUALZINHO ao de slug
  // inexistente, byte a byte. Um 403 diria "esse slug existe, o token e que esta errado".
  if (!payload) {
    return html(naoExiste({ slug, apexHost: cfg.apexHost }), 404, {
      'cache-control': 'public, max-age=60',
      'x-robots-tag': 'noindex',
    });
  }

  const pagina = montarCtx(cfg, { payload, slug, url, isPreview: true, payloadVCorrente: PAYLOAD_V_CORRENTE });
  if (!pagina) return html(indisponivel(), 503, { 'cache-control': 'no-store', 'x-robots-tag': 'noindex' });

  return html(montarHtml(pagina, { payloadBruto: payload }), 200, {
    'cache-control': 'private, no-store, max-age=0',
    'x-robots-tag': 'noindex, nofollow, noarchive',
  });
}

// CERTIFICADO ----------------------------------------------------------------
// A UNICA rota de tenant que toca a service role key. O Worker nunca serve os bytes do PDF
// pelo nosso origin: ele assina uma URL de vida curta e responde 302, e a assinada nunca
// entra em HTML nem em cache compartilhado.
//
// POR QUE ELA CONSULTA A RPC EM VEZ DO DOCUMENTO EM CACHE: desligar o consentimento e
// republicar tem que fazer este endereco responder 404 na hora. Lendo de uma copia em cache,
// o documento pessoal de alguem continuaria assinavel enquanto a entrada nao expirasse, e
// consentimento revogado que so vale daqui a 24 horas nao e consentimento revogado.
async function servirCertificado({ slug, slugExperiencia, cfg }) {
  const negar = () =>
    html(naoExiste({ slug, apexHost: cfg.apexHost }), 404, {
      'cache-control': 'private, no-store',
      'x-robots-tag': 'noindex, noarchive',
    });

  let r;
  try {
    r = await rpc(cfg, 'get_published_portfolio', { p_slug: slug });
  } catch {
    return html(indisponivel(), 503, { 'cache-control': 'no-store', 'retry-after': '30', 'x-robots-tag': 'noindex' });
  }
  if (!r || r.status !== 'ok' || !r.payload) return negar();

  const exp = (r.payload.experiences || []).find((x) => x.slug === slugExperiencia);
  // Sem consentimento do titular, o payload publicado nem carrega o caminho: ausencia aqui
  // significa "nao pode", e nao "nao achei".
  if (!exp || !exp.certificatePath) return negar();

  let assinada;
  try {
    assinada = await assinarDocumento(cfg, exp.certificatePath, 120);
  } catch {
    return html(indisponivel(), 503, { 'cache-control': 'no-store', 'retry-after': '30', 'x-robots-tag': 'noindex' });
  }

  return new Response(null, {
    status: 302,
    headers: {
      location: assinada,
      'cache-control': 'private, no-store',
      'x-robots-tag': 'noindex, noarchive',
    },
  });
}
