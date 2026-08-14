import { lerEnv, temSupabase } from './lib/env.js';
import { resolverHost } from './lib/host.js';
import { servirApex } from './rotas/apex.js';
import { servirTenant } from './rotas/tenant.js';
import { rodarCron } from './rotas/cron.js';
import { indisponivel } from './render/paginas.js';

// Ponto de entrada unico. Um Worker, um deploy, um bundle: o mesmo artefato atende o apex e
// todo subdominio de comprador, e os assets com hash sobem junto no mesmo `wrangler deploy`.
// Separar shell e assets em dois deploys criaria, a cada subida, uma janela em que o HTML
// referencia um /assets/<hash>.js que ja nao existe.

// O hostname sai de `new URL(request.url).hostname`, NUNCA do header Host cru: o cliente
// pode mandar Host duplicado ou com porta, e a URL do request ja vem normalizada pela borda.
export default {
  async fetch(request, env, ctx) {
    const cfg = lerEnv(env);
    const url = new URL(request.url);

    // Metodo que nao le nao tem o que fazer em pagina publica.
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response(null, { status: 405, headers: { allow: 'GET, HEAD' } });
    }

    // Arquivo estatico. Com `run_worker_first: false` o binding ja responde antes do Worker
    // rodar, entao este ramo quase nunca executa; ele existe para o dia em que a precedencia
    // mudar (suposicao S23) e para as rotas que delegam de dentro do Worker.
    if (env.ASSETS && /\.[a-z0-9]{2,5}$/i.test(url.pathname)) {
      const estatico = await env.ASSETS.fetch(request);
      if (estatico.status !== 404) return estatico;
    }

    if (!temSupabase(cfg)) {
      // Secret faltando e erro de deploy, nao de visitante. Nunca stack trace no corpo.
      return new Response(indisponivel(), {
        status: 503,
        headers: {
          'content-type': 'text/html; charset=utf-8',
          'cache-control': 'no-store',
          'retry-after': '30',
          'x-robots-tag': 'noindex',
        },
      });
    }

    // `www` e apex para o roteador (resolverHost trata os dois juntos, e a razao esta la:
    // sem isso `www` viraria busca pelo tenant de slug "www"). Aqui ele ganha o 301 que o
    // criterio 4 da secao 2 exige: o conteudo e o mesmo nos dois hostnames, e servir os dois
    // com 200 e conteudo duplicado para o buscador, que escolhe sozinho qual indexar.
    if (url.hostname.toLowerCase() === `www.${cfg.apexHost}`) {
      return new Response(null, {
        status: 301,
        headers: {
          location: `https://${cfg.apexHost}${url.pathname}${url.search}`,
          'cache-control': 'public, max-age=3600',
        },
      });
    }

    const alvo = resolverHost(url.hostname, cfg.apexHost);

    // Subdominio reservado NUNCA vira busca de tenant: `www`, `app` e `entrar` sao digitados
    // por gente, e responder "este endereco ainda esta livre" no proprio `www` seria o site
    // oferecendo o proprio nome a venda. 301 para o apex, preservando caminho e query.
    if (alvo.tipo === 'reservado') {
      return new Response(null, {
        status: 301,
        headers: {
          location: `https://${cfg.apexHost}${url.pathname}${url.search}`,
          'cache-control': 'public, max-age=3600',
        },
      });
    }

    if (alvo.tipo === 'tenant') {
      return servirTenant({ request, url, slug: alvo.slug, cfg, ctx });
    }

    return servirApex({ request, url, cfg, ctx });
  },

  // Keep-alive do projeto Supabase, a cada 6 horas (bloco `triggers` do wrangler.jsonc).
  async scheduled(evento, env, ctx) {
    const cfg = lerEnv(env);
    ctx.waitUntil(rodarCron(cfg));
  },
};
