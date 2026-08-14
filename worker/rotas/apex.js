import { SHELL_EDITOR } from '../shell.gen.js';
import { servirTenant } from './tenant.js';
import { naoEncontrada } from '../render/paginas.js';

// O apex: myportifolio.com.br. Mesmo Worker, mesmo deploy, mesmos assets.
//
// A vitrine NAO e uma pagina a parte: ela e o portfolio do Helio, servido pelo MESMO caminho
// de tenant, com o slug vindo de APEX_SLUG (secao 9.8). Ter um segundo motor de render para
// a home seria a primeira divergencia entre o que o dono ve e o que o cliente recebe.
export async function servirApex({ request, url, cfg, ctx }) {
  const caminho = url.pathname;

  if (caminho === '/' || caminho === '') {
    return servirTenant({ request, url, slug: cfg.apexSlug, cfg, ctx });
  }

  // O editor. O shell dele vem de dentro do codigo e nao de dist/, porque com
  // `run_worker_first: false` qualquer .html dentro de dist/ e servido ANTES do Worker rodar,
  // e um index.html sobrevivente serviria o shell cru do Helio no subdominio do comprador.
  if (caminho === '/app' || caminho.startsWith('/app/')) {
    return new Response(SHELL_EDITOR, {
      status: 200,
      headers: {
        'content-type': 'text/html; charset=utf-8',
        // O editor so existe para quem ja comprou e esta logado.
        'cache-control': 'private, no-store',
        'x-robots-tag': 'noindex, nofollow',
      },
    });
  }

  // /comprar, /entrar, /termos e /privacidade sao os itens 9 e 10 da fase 1 e nascem com a
  // copy deles, nao com placeholder inventado aqui. Ate la o apex responde 404 nesses
  // caminhos, que e a verdade.
  return new Response(naoEncontrada(), {
    status: 404,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, max-age=60',
      'x-robots-tag': 'noindex',
    },
  });
}
