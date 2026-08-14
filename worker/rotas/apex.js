import { SHELL_EDITOR } from '../shell.gen.js';
import { servirTenant } from './tenant.js';
import { naoEncontrada, paginaIndexavel } from '../render/paginas.js';
import { renderOfertaPage, headOferta } from '../../src/modules/oferta/components/ofertaPage.js';
import { renderLegalPage, headLegal } from '../../src/modules/legal/components/legalPage.js';
import { termos } from '../../src/modules/legal/data/termos.data.js';
import { privacidade } from '../../src/modules/legal/data/privacidade.data.js';

// O MESMO mapa que o editor usa em src/app/editorBoot.js. Duas listas de rotas juridicas
// divergem no dia em que um documento novo entrar em uma e nao na outra, e a que ficar de
// fora vira 404 num link que ja esta impresso nos termos.
const PAGINAS_JURIDICAS = {
  '/termos': termos,
  '/privacidade': privacidade,
};

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

  // /entrar e /app sao a mesma porta. Existe uma redundancia deliberada aqui: /entrar e o
  // que a pessoa digita e o que cabe numa mensagem, /app e o que o produto usa internamente.
  // Redirecionar em vez de servir os dois mantem UM endereco canonico para a tela de login.
  if (caminho === '/entrar') {
    return new Response(null, { status: 301, headers: { location: '/app' } });
  }

  // A pagina de oferta. Renderizada na borda, e nao pelo bundle, porque pagina que decide
  // venda nao pode depender de o JavaScript carregar.
  if (caminho === '/comprar') {
    const slugDesejado = (url.searchParams.get('slug') ?? '').trim().toLowerCase();
    const html = paginaIndexavel({
      head: headOferta(),
      corpo: renderOfertaPage({ slugDesejado }),
    });
    return new Response(html, {
      status: 200,
      headers: {
        'content-type': 'text/html; charset=utf-8',
        // Um minuto. A copia muda com pouca frequencia, mas quando muda (preco, principalmente)
        // ela precisa mudar rapido: pagina de oferta em cache longo e cliente clicando num
        // preco que nao vale mais, e discussao de preco anunciado nao se ganha.
        'cache-control': 'public, max-age=60',
      },
    });
  }

  // Os dois documentos juridicos, servidos JA PINTADOS. Isto nao e otimizacao: termos que so
  // aparecem depois que o script roda nao servem de prova do que estava escrito no dia da
  // compra, e nao existem para quem imprime a pagina ou navega sem script. O texto sai do
  // MESMO modulo que o editor usa, entao nao existe uma segunda copia para divergir.
  const juridico = PAGINAS_JURIDICAS[caminho];
  if (juridico) {
    const html = paginaIndexavel({
      head: headLegal(juridico, caminho),
      corpo: renderLegalPage(juridico),
    });
    return new Response(html, {
      status: 200,
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'public, max-age=300',
      },
    });
  }

  return new Response(naoEncontrada(), {
    status: 404,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, max-age=60',
      'x-robots-tag': 'noindex',
    },
  });
}
