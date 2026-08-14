import { SHELL_PUBLICO, MARCADOR_HEAD } from '../shell.gen.js';
import { esc } from '../../src/modules/portfolio/lib/sanitize.js';

// As paginas que nao sao portfolio. Elas usam o MESMO shell buildado, porque 404 de
// plataforma numa URL que pode estar impressa num cartao de visita e resposta errada mesmo
// estando tecnicamente correta.
//
// Regra dura, e ela vale como revisao: a pagina de `410` NAO pode conter link para
// /comprar. O endereco de quem acabou de ser banido, reembolsado ou excluido virando anuncio
// de "compre este endereco" e o pior corpo possivel para essa resposta (criterio 10 da
// secao 2).

function pagina({ titulo, robots, corpo }) {
  const head = [
    `<title>${esc(titulo)}</title>`,
    `<meta name="robots" content="${esc(robots)}" />`,
  ].join('\n    ');
  const html = SHELL_PUBLICO.replace(MARCADOR_HEAD, head).replace(
    '<div id="app"></div>',
    `<div id="app" class="ready">${corpo}</div>`,
  );
  return html;
}

// As paginas do apex que EXISTEM para serem achadas: a oferta e os dois documentos
// juridicos. Elas nao levam robots noindex, e por isso precisam do que a de erro nao precisa:
// description, que e o texto que aparece no resultado da busca, e canonical, porque o mesmo
// conteudo responde tambem em www e no dominio antigo, e sem canonical o buscador escolhe
// sozinho qual dos tres indexar.
export function paginaIndexavel({ head, corpo }) {
  const tags = [
    `<title>${esc(head.title)}</title>`,
    `<meta name="description" content="${esc(head.description)}" />`,
    `<link rel="canonical" href="${esc(head.canonical)}" />`,
    // Sem imagem propria: og:image de um produto e a pagina do produto, e a vitrine ja tem a
    // dela. Cartao de link sem imagem e melhor do que cartao com a imagem errada.
    `<meta property="og:type" content="website" />`,
    `<meta property="og:title" content="${esc(head.title)}" />`,
    `<meta property="og:description" content="${esc(head.description)}" />`,
    `<meta property="og:url" content="${esc(head.canonical)}" />`,
  ].join('\n    ');
  return SHELL_PUBLICO.replace(MARCADOR_HEAD, tags).replace(
    '<div id="app"></div>',
    `<div id="app" class="ready">${corpo}</div>`,
  );
}

const moldura = (conteudo) => `
<section class="min-h-screen flex items-center justify-center px-6 py-16">
  <div class="glass-card rounded-3xl p-8 sm:p-10 max-w-lg w-full flex flex-col gap-4 text-center">
    ${conteudo}
  </div>
</section>`;

// 404. Este e o corpo que a previa com token errado tambem devolve, byte a byte: responder
// diferente diria "esse slug existe, o token e que esta errado" (6.9).
export function naoExiste({ slug, apexHost }) {
  const endereco = `${slug}.${apexHost}`;
  const corpo = moldura(`
    <h1 class="text-2xl font-bold tracking-tight text-white">Este endereço ainda está livre</h1>
    <p class="text-sm text-white/60 leading-relaxed">
      Ninguém publicou um portfólio em <span class="text-white/80">${esc(endereco)}</span> ainda.
      Se você chegou aqui por um link, confira se o endereço está escrito certo.
    </p>
    <a href="https://${esc(apexHost)}/comprar?slug=${encodeURIComponent(slug)}"
       class="inline-flex items-center justify-center gap-2 w-fit mx-auto rounded-full glass-button px-5 py-2.5 text-xs font-bold text-white">
      Quero este endereço
    </a>`);
  return pagina({ titulo: 'Endereço livre', robots: 'noindex', corpo });
}

// 410. Sem CTA, sem citar o motivo. Quem saiu do ar por reembolso, chargeback, banimento,
// vontade propria ou pedido de exclusao merece o mesmo texto, e o visitante nao tem nada a
// ver com qual dos cinco foi.
export function bloqueado() {
  const corpo = moldura(`
    <h1 class="text-2xl font-bold tracking-tight text-white">Este portfólio não está mais disponível</h1>
    <p class="text-sm text-white/60 leading-relaxed">
      A página que estava neste endereço saiu do ar.
    </p>`);
  return pagina({ titulo: 'Não disponível', robots: 'noindex, nofollow', corpo });
}

// 404 do apex. Separada da de tenant de proposito: "este endereco ainda esta livre" so faz
// sentido num subdominio que alguem pode comprar, e no apex ela seria oferta de vender o
// nosso proprio dominio.
export function naoEncontrada() {
  const corpo = moldura(`
    <h1 class="text-2xl font-bold tracking-tight text-white">Página não encontrada</h1>
    <p class="text-sm text-white/60 leading-relaxed">
      O endereço que você abriu não existe por aqui.
    </p>`);
  return pagina({ titulo: 'Não encontrada', robots: 'noindex', corpo });
}

// 503. Nunca stack trace no corpo, nunca erro cru do PostgREST: o visitante nao tem o que
// fazer com isso e o atacante tem.
export function indisponivel() {
  const corpo = moldura(`
    <h1 class="text-2xl font-bold tracking-tight text-white">Estamos com um problema temporário</h1>
    <p class="text-sm text-white/60 leading-relaxed">
      Esta página não pôde ser carregada agora. Tente de novo em alguns instantes.
    </p>`);
  return pagina({ titulo: 'Indisponível', robots: 'noindex', corpo });
}
