import { esc, safeUrl, safePosition } from '../../portfolio/lib/sanitize.js';

// Coluna esquerda: imagem principal do portfólio.
//
// O container acompanha a altura da coluna do perfil (grid stretch), então a foto termina
// exatamente onde o card "Sobre" termina. object-cover preenche; object-position enquadra.
//
// POR QUE object-position VIRA style INLINE: antes era a classe `object-[50%_36%]`. O
// scanner do Tailwind v4 lê o código fonte para decidir quais classes gerar, então classe
// com valor arbitrário vindo de DADO (o enquadramento vira campo do comprador na fase 1)
// simplesmente não é gerada, e o estilo some em produção sem erro nenhum, sem aviso no
// build e sem diferença no DOM. Só um print pegaria, e é por isso que o shot-diff existe.
//
// A imagem fica EAGER de propósito, com fetchpriority alto: ela é a candidata a LCP da
// página, e `loading="lazy"` aqui piora o LCP em vez de melhorar. É a outra metade da regra
// de mídia do dono, e a metade que costuma ser aplicada errada.
export function renderHeroImage(profile, lang) {
  const alt = `${esc(profile.name)} - Principal`;
  // SEM FOTO, NAO SAI <img>. Com `safeUrl('')` o atributo virava `src=""`, e o navegador
  // resolve src vazio como "busque o proprio documento como imagem": uma requisicao a mais
  // ao HTML da pagina e o icone de imagem quebrada bem no topo. Acontecia com todo comprador
  // entre a compra e o primeiro upload, que e justamente quando ele esta decidindo se
  // gostou. A moldura fica, para o layout de duas colunas nao desabar.
  const miolo = profile.mainImage
    ? `<img src="${safeUrl(profile.mainImage)}" alt="${alt}" fetchpriority="high" decoding="async" width="1000" height="1250" class="absolute inset-0 w-full h-full object-cover grayscale-[10%] hover:grayscale-0 transition duration-700" style="object-position: ${safePosition(profile.heroObjectPosition)};">`
    : `<div class="absolute inset-0 flex items-center justify-center bg-white/[0.03]"><span class="text-[11px] uppercase tracking-widest text-white/25">${esc(profile.name || '')}</span></div>`;
  return `
  <div class="relative rounded-3xl bg-black border border-white/10 overflow-hidden shadow-2xl min-h-[380px] lg:min-h-0">
    ${miolo}
  </div>`;
}
