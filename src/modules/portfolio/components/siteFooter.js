import { tui } from '../../../app/i18n.js';

// Rodape com o credito de producao. Divida D4 do plano: a regra do dono manda que toda
// entrega leve "Desenvolvida por Method Growth Hub" com link, e o portfolio nao tinha.
//
// A partir da fase 1 este mesmo rodape aparece no portfolio de TODO comprador, o que faz
// dele o unico elemento que a Growth Hub coloca em milhares de paginas de terceiros. Por
// isso ele e discreto de proposito: cor de texto secundaria, sem caixa, sem borda.
export function renderSiteFooter(lang) {
  return `
  <footer class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 -mt-2">
    <p class="text-[10px] text-white/25 text-center">
      ${tui('builtBy', lang)}
      <a href="https://methodgrowthhub.com.br" target="_blank" rel="noopener" class="text-white/40 hover:text-white/70 transition">Method Growth Hub</a>
    </p>
  </footer>`;
}
