import { CHECKOUT } from '../../checkout/config/checkoutLinks.js';
import { esc } from '../../portfolio/lib/sanitize.js';

// A faixa de compra da vitrine. FUNCAO PURA, zona [iso].
//
// ELA E O QUE FALTAVA PARA A PAGINA DE OFERTA SERVIR DE ALGUMA COISA: /comprar existia e
// nada no site levava ate ela. A vitrine e o argumento de venda inteiro (o visitante acabou
// de ver o produto funcionando), e sem um botao ela era um argumento sem porta.
//
// QUEM DECIDE SE ELA APARECE E O SLUG, e nao o hostname. Isso nao e estilo, e cache: o
// documento e guardado por (portfolio_id, content_hash), que e IDENTICO para
// myportifolio.com.br e para helio.myportifolio.com.br, porque os dois servem o mesmo
// portfolio. Se a faixa dependesse do host, a primeira das duas requisicoes a chegar
// gravaria a sua versao e a outra receberia a errada, sem nada quebrar e sem ninguem
// perceber. Amarrada ao slug da vitrine, o conteudo volta a ser funcao pura do slug e as
// duas chaves coincidem de novo.
//
// E o portfolio de comprador nenhum recebe esta faixa: o site de um cliente nao vai anunciar
// a nossa loja para os visitantes dele.
//
// ONDE ELA FICA, e por que nao no topo: esta pagina tambem e o portfolio profissional do
// Helio, que ele manda para cliente e para vaga. Banner de venda no alto transforma o
// portfolio dele em pagina de produto e cobra caro na primeira impressao. Depois dos
// projetos e da experiencia, o visitante ja viu a prova, e a pergunta "quanto custa um
// desses" e a pergunta natural dele naquele ponto.

const COPIA = {
  pt: {
    olho: 'Este site é um produto',
    titulo: 'Quer um portfólio assim, no seu nome?',
    texto:
      'É esta página, com o seu endereço, as suas fotos, os seus projetos e as suas experiências. Você mesmo edita quando quiser, e paga uma vez só.',
    botao: 'Quero o meu por',
    rodape: 'Pagamento único, sem mensalidade.',
  },
  en: {
    olho: 'This site is a product',
    titulo: 'Want a portfolio like this, under your own name?',
    texto:
      'This same page, with your address, your photos, your projects and your experience. You edit it yourself whenever you want, and you pay once.',
    botao: 'I want mine for',
    rodape: 'One-time payment, no subscription.',
  },
};

export function renderVitrineCta(lang, apexHost) {
  const t = COPIA[lang === 'en' ? 'en' : 'pt'];

  // O link e ABSOLUTO para o apex, e nao '/comprar'. No subdominio da vitrine
  // (helio.myportifolio.com.br) o Worker so serve a raiz, entao um link relativo cairia em
  // 404 justamente no clique que interessa. Sem apexHost, o botao nao e desenhado: melhor
  // faixa sem botao do que botao que leva a lugar nenhum.
  if (!apexHost) return '';
  const destino = `https://${esc(apexHost)}/comprar`;

  return `
<section class="sm:px-6 lg:px-8 max-w-6xl mx-auto px-4 pb-10">
  <div class="glass-card rounded-3xl p-6 sm:p-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div class="flex flex-col gap-2 sm:max-w-md">
      <span class="text-[11px] uppercase tracking-widest text-white/35">${t.olho}</span>
      <h2 class="text-xl sm:text-2xl font-bold tracking-tight text-white">${t.titulo}</h2>
      <p class="text-sm text-white/55 leading-relaxed">${t.texto}</p>
    </div>
    <div class="flex flex-col gap-2 shrink-0">
      <a href="${destino}"
         class="inline-flex items-center justify-center rounded-2xl bg-white px-6 py-3.5 text-sm font-semibold text-black hover:bg-white/90 transition whitespace-nowrap">
        ${t.botao} ${CHECKOUT.principal.preco}
      </a>
      <span class="text-[11px] text-white/30 text-center">${t.rodape}</span>
    </div>
  </div>
</section>`;
}
