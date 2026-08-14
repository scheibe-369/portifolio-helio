import { esc } from '../../portfolio/lib/sanitize.js';
import { oferta } from '../data/oferta.data.js';
import { CHECKOUT } from '../../checkout/config/checkoutLinks.js';

// A pagina /comprar. FUNCAO PURA, zona [iso]: quem renderiza e o Worker, no apex.
//
// POR QUE NA BORDA e nao no bundle: esta e a pagina que decide venda. Ela precisa estar
// pintada no primeiro byte, existir para quem tem script bloqueado e ser lida inteira pelo
// robo do buscador. Pagina de oferta que depende de JavaScript para aparecer e pagina de
// oferta que as vezes nao aparece.
//
// UM BOTAO SO, e isto e regra e nao layout (secao 9.2): o unico link daqui e o do principal.
// A facilitacao de R$ 490 e upsell DENTRO do editor. Botar o SKU caro ao lado do barato
// ancora o visitante no numero grande e derruba a conversao do funil principal.

// O slug chega pela query string, entao ele e a UNICA coisa desta pagina que vem de fora e
// a unica que precisa de desconfianca. Alem do escape, ele passa pelo mesmo formato que o
// banco aceita: qualquer outra coisa e tratada como se nao tivesse vindo, em vez de virar
// texto estranho no meio de uma frase de venda.
const SLUG_OK = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/;

function renderEndereco(slugDesejado) {
  if (!slugDesejado || !SLUG_OK.test(slugDesejado)) return '';
  return `
    <p class="text-sm text-white/60 leading-relaxed">
      Você veio de <span class="text-white/90 font-medium">${esc(slugDesejado)}.myportifolio.com.br</span>,
      que ainda está livre. Ele fica reservado para você assim que o portfólio for publicado.
    </p>`;
}

function renderEntrega(item) {
  return `
    <li class="flex flex-col gap-1">
      <span class="text-sm font-semibold text-white">${item.titulo}</span>
      <span class="text-sm text-white/55 leading-relaxed">${item.texto}</span>
    </li>`;
}

function renderDuvida(item) {
  return `
    <div class="flex flex-col gap-1">
      <span class="text-sm font-medium text-white/90">${item.p}</span>
      <span class="text-sm text-white/50 leading-relaxed">${item.r}</span>
    </div>`;
}

// O botao aparece duas vezes na pagina, no topo e no fim, porque quem ja estava convencido
// nao deve ter que rolar de volta, e quem leu tudo nao deve ter que procurar.
function renderBotao() {
  return `
    <a href="${CHECKOUT.principal.url}"
       class="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3.5 text-sm font-semibold text-black hover:bg-white/90 transition">
      ${oferta.chamadaBotao} por ${CHECKOUT.principal.preco}
    </a>`;
}

export function renderOfertaPage({ slugDesejado } = {}) {
  return `
    <main class="max-w-2xl mx-auto px-5 py-14 flex flex-col gap-10">
      <header class="flex flex-col gap-4">
        <a href="/" class="text-xs text-white/40 hover:text-white/80 transition">MyPortifolio</a>
        <h1 class="text-3xl sm:text-4xl font-bold tracking-tight text-white">${oferta.titulo}</h1>
        <p class="text-base text-white/60 leading-relaxed">${oferta.chamada}</p>
        ${renderEndereco(slugDesejado)}
      </header>

      <div class="flex flex-col gap-3">
        ${renderBotao()}
        <p class="text-xs text-white/35 leading-relaxed">${oferta.observacaoBump}</p>
      </div>

      <section class="glass-card rounded-3xl p-6 sm:p-8">
        <ul class="flex flex-col gap-5">
          ${oferta.entregas.map(renderEntrega).join('')}
        </ul>
      </section>

      <section class="flex flex-col gap-5">
        <h2 class="text-base font-semibold text-white">Antes de decidir</h2>
        ${oferta.duvidas.map(renderDuvida).join('')}
      </section>

      <div class="flex flex-col gap-3">
        ${renderBotao()}
        <p class="text-xs text-white/35 leading-relaxed">
          Já comprou? <a href="/app" class="text-white/60 hover:text-white transition underline underline-offset-2">Entre aqui</a>
          com o e-mail que você usou no pagamento.
        </p>
      </div>

      <footer class="border-t border-white/10 pt-6 flex flex-col gap-2">
        <p class="text-xs text-white/40">
          <a href="/termos" class="hover:text-white/80 transition">Termos de uso</a>
          <span class="text-white/20"> · </span>
          <a href="/privacidade" class="hover:text-white/80 transition">Privacidade</a>
        </p>
        <p class="text-[10px] text-white/25">
          Desenvolvida por
          <a href="https://methodgrowthhub.com.br" target="_blank" rel="noopener" class="text-white/40 hover:text-white/70 transition">Method Growth Hub</a>
        </p>
      </footer>
    </main>`;
}

// A pagina de oferta E indexavel de proposito: ela e o anuncio. O canonical e sempre o
// endereco sem query, senao cada visita vinda de um slug diferente vira uma URL nova aos
// olhos do buscador e o mesmo texto se divide em dezenas de paginas concorrentes.
export function headOferta() {
  return {
    title: `${oferta.titulo} · MyPortifolio`,
    description: oferta.chamada,
    canonical: 'https://myportifolio.com.br/comprar',
  };
}
