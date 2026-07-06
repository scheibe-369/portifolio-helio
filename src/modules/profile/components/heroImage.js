import { profile } from '../data/profile.data.js';

// Coluna esquerda: imagem principal do portfólio.
export function renderHeroImage() {
  // O container acompanha a altura da coluna do perfil (grid stretch) -> a foto termina
  // exatamente onde o card "Sobre" termina. object-cover preenche; object-position enquadra o rosto.
  return `
  <div class="relative rounded-3xl bg-black border border-white/10 overflow-hidden shadow-2xl min-h-[380px] lg:min-h-0">
    <img src="${profile.mainImage}" alt="${profile.name} - Principal" fetchpriority="high" decoding="async" width="1000" height="1250" class="absolute inset-0 w-full h-full object-cover object-[50%_36%] grayscale-[10%] hover:grayscale-0 transition duration-700">
  </div>`;
}
