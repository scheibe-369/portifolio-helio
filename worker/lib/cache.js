// Cache API EXPLICITA. Nao e otimizacao, e o que faz a margem existir.
//
// O spike 2 (tasks/_plano/medicoes.md, 2026-08-13) mediu isto num Worker publicado na zona
// real: uma resposta gerada por Worker com `Cache-Control: public, s-maxage=60` e NADA mais
// executou o codigo nas tres batidas seguidas, do mesmo colo. A borda nao guarda resposta de
// Worker sozinha. Sem o que esta neste arquivo, toda visita a todo portfolio bate no
// Postgres em sa-east-1, para sempre, num produto de pagamento unico. O mesmo spike mediu
// que `caches.default` com chave propria devolve o mesmo nonce na 2a e na 3a chamada, e que
// `delete` funciona (suposicao S15 confirmada), que e o que substitui o purge que os tokens
// da conta nao tem permissao de fazer.
//
// A CHAVE DO DOCUMENTO NAO PODE CONTER O SLUG, E NAO PODE CONTER `version`.
// Este e o ponto em que o desenho se ganha ou se perde, e o erro aqui nao e lentidao, e
// servir o portfolio de um cliente no subdominio de outro, com `immutable` de um ano e sem
// purge (achado 2 de tasks/_plano/verificacao-1-dinheiro-e-isolamento.md). `version` e
// `max(version) + 1` POR PORTFOLIO, nao uma sequencia global: dois tenants tem a versao 7 ao
// mesmo tempo. E o slug troca de dono por dois caminhos escritos no plano: `change_my_slug`
// muda o endereco da publicacao SEM criar versao nova, e um slug liberado depois da retencao
// de 90 dias volta ao estoque e e comprado por outra pessoa. Com `(slug, version)`, o
// ponteiro de `x` diz 7, o Worker acha `v1/x/7` no colo e serve o HTML do dono anterior.
//
// Por isso a chave e enderecada ao TENANT e ao CONTEUDO, nunca ao endereco:
//   documento  pf/<portfolio_id>/<content_hash>   `content_hash` e md5(payload || slug) e ja
//                                                 vem da RPC; publicar troca o hash, troca a
//                                                 chave, e a entrada velha deixa de ser
//                                                 pedida. Zero purge.
//   socorro    pf/<portfolio_id>/socorro          mesma razao: o dono seguinte de um
//                                                 endereco nunca recebe a pagina do anterior.
//   ponteiro   slug/<slug>                        a UNICA entrada chaveada por slug, porque
//                                                 slug e a unica coisa que o request traz.
//                                                 Resolve o ovo e a galinha: nao da para
//                                                 montar a chave do documento antes de saber
//                                                 de quem e o slug hoje.

// Ponteiro com mais de 30 segundos NAO e usado no caminho normal: o Worker vai ao Postgres.
// Ele so serve velho no caminho de socorro, quando a RPC falhou, e e ai que ele ganha o
// papel de mapa slug -> portfolio_id durante uma queda do Supabase.
export const PONTEIRO_FRESCO_SEG = 30;

const MAX_AGE_DOCUMENTO = 31536000; // um ano, e agora e honesto: aquele conteudo daquele
                                    // tenant nunca muda, e nenhum outro tenant produz a
                                    // mesma chave.
const MAX_AGE_SOCORRO = 86400;      // 24 h, e nao 7 dias: conteudo banido ressuscitavel por
                                    // uma semana e caro demais para a janela extra que
                                    // compra (5.8).
const MAX_AGE_PONTEIRO = 86400;

const CABECALHO_GRAVADO_EM = 'X-Portfolio-Pointer-At';

const cache = () => caches.default;

const kPonteiro = (cfg, slug) => new Request(`https://cache/${cfg.cacheNs}/slug/${slug}`);
const kDocumento = (cfg, portfolioId, contentHash) =>
  new Request(`https://cache/${cfg.cacheNs}/pf/${portfolioId}/${contentHash}`);
const kSocorro = (cfg, portfolioId) => new Request(`https://cache/${cfg.cacheNs}/pf/${portfolioId}/socorro`);

// Toda gravacao vai em waitUntil e dentro de try/catch. O try/catch nao e paranoia: a Cache
// API recusa `put` com `Set-Cookie` na resposta, recusa 206 e 304, e recusa metodo diferente
// de GET (suposicao S24, medida no spike 2). Falhar ao gravar cache nao pode derrubar a
// resposta que o visitante ja esta recebendo.
function gravar(ctx, chave, resposta) {
  if (!ctx || typeof ctx.waitUntil !== 'function') return;
  ctx.waitUntil(cache().put(chave, resposta).catch(() => {}));
}

function respostaHtml(html, maxAge, extras = {}) {
  const h = new Headers(extras);
  h.set('content-type', 'text/html; charset=utf-8');
  h.set('cache-control', maxAge === MAX_AGE_DOCUMENTO ? `public, max-age=${maxAge}, immutable` : `public, max-age=${maxAge}`);
  // Disciplina nossa, e nao confianca no runtime: a resposta do render nunca tem cookie.
  h.delete('set-cookie');
  return new Response(html, { status: 200, headers: h });
}

// PONTEIRO -------------------------------------------------------------------
// Corpo: { portfolioId, contentHash, payloadV }. Duas validades no mesmo objeto, de
// proposito: `max-age` longo para a entrada nao ser descartada cedo pela borda, e o nosso
// header de instante de gravacao, que e o unico que o codigo daqui le.
export async function lerPonteiro(cfg, slug) {
  try {
    const r = await cache().match(kPonteiro(cfg, slug));
    if (!r) return null;
    const dados = await r.json();
    const em = Number(r.headers.get(CABECALHO_GRAVADO_EM) || 0);
    const idadeSeg = em ? Math.max(0, Math.floor(Date.now() / 1000) - em) : Number.MAX_SAFE_INTEGER;
    return { ...dados, idadeSeg, fresco: idadeSeg <= PONTEIRO_FRESCO_SEG };
  } catch {
    return null;
  }
}

export function gravarPonteiro(ctx, cfg, slug, { portfolioId, contentHash, payloadV }) {
  const corpo = JSON.stringify({ portfolioId, contentHash, payloadV });
  const r = new Response(corpo, {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': `public, max-age=${MAX_AGE_PONTEIRO}`,
      [CABECALHO_GRAVADO_EM]: String(Math.floor(Date.now() / 1000)),
    },
  });
  gravar(ctx, kPonteiro(cfg, slug), r);
}

// DOCUMENTO ------------------------------------------------------------------
export async function lerDocumento(cfg, portfolioId, contentHash) {
  try {
    return (await cache().match(kDocumento(cfg, portfolioId, contentHash))) || null;
  } catch {
    return null;
  }
}

export function gravarDocumento(ctx, cfg, portfolioId, contentHash, html) {
  gravar(ctx, kDocumento(cfg, portfolioId, contentHash), respostaHtml(html, MAX_AGE_DOCUMENTO));
}

// COPIA DE SOCORRO -----------------------------------------------------------
// O valor dela e DISPONIBILIDADE, nao latencia: e o que impede "Supabase caiu" de virar
// "todos os portfolios pagos cairam juntos".
export async function lerSocorro(cfg, portfolioId) {
  try {
    return (await cache().match(kSocorro(cfg, portfolioId))) || null;
  } catch {
    return null;
  }
}

export function gravarSocorro(ctx, cfg, portfolioId, html) {
  gravar(ctx, kSocorro(cfg, portfolioId), respostaHtml(html, MAX_AGE_SOCORRO));
}

// REVOGACAO ------------------------------------------------------------------
// Quando a RPC responde `gone` ou `not_found`, o ponteiro daquele slug e a copia de socorro
// daquele tenant saem do colo que atendeu. Nao e purge global, e o plano assume isso escrito
// em vez de escondido: um portfolio banido pode ser servido do socorro num colo que nao
// recebeu visita depois do banimento, so enquanto o Supabase estiver fora do ar, por no
// maximo 24 h.
export function apagarTenant(ctx, cfg, slug, portfolioId) {
  if (!ctx || typeof ctx.waitUntil !== 'function') return;
  ctx.waitUntil(
    (async () => {
      try {
        if (slug) await cache().delete(kPonteiro(cfg, slug));
        if (portfolioId) await cache().delete(kSocorro(cfg, portfolioId));
      } catch {
        // idem gravar(): falha de cache nunca vira erro de resposta.
      }
    })(),
  );
}

// Reescreve os headers de uma resposta vinda do cache. `Response` do cache e imutavel, e
// `new Response(r.body, r)` e a forma de carimbar X-Portfolio-Cache sem copiar o corpo.
export function carimbar(resposta, extras) {
  const nova = new Response(resposta.body, resposta);
  for (const [k, v] of Object.entries(extras)) nova.headers.set(k, v);
  return nova;
}
