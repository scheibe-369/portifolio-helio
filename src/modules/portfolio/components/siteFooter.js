import { tui } from '../../../app/i18n.js';

// Rodape com o credito de producao.
//
// SO NA VITRINE, nunca na pagina de um comprador. Decisao do dono em 16/08/2026, depois de
// ver as dez paginas de nicho: "nesses portfolios pessoais nao tem que ter o DESENVOLVIDO POR
// METHOD GROWTH HUB".
//
// A regra da casa continua valendo e continua cumprida: myportifolio.com.br, /comprar,
// /termos e /privacidade sao a entrega da Growth Hub e levam o credito. O que a pessoa
// comprou nao e: ela pagou por uma pagina no nome DELA, e assinar o trabalho dela com a nossa
// marca e cobrar por um portfolio e entregar um outdoor. Era tambem o unico elemento que a
// gente colocava em milhares de paginas de terceiros sem eles terem escolhido.
export function renderSiteFooter(lang) {
  return `
  <footer class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 -mt-2">
    <p class="text-[10px] text-white/25 text-center">
      ${tui('builtBy', lang)}
      <a href="https://methodgrowthhub.com.br" target="_blank" rel="noopener" class="text-white/40 hover:text-white/70 transition">Method Growth Hub</a>
    </p>
  </footer>`;
}
