import { renderHeroImage } from '../modules/profile/components/heroImage.js';
import { renderProfilePanel } from '../modules/profile/components/profilePanel.js';
import { renderStacksMarquee } from '../modules/stacks/components/stacksMarquee.js';
import { renderProjectsSection } from '../modules/projects/components/projectsSection.js';
import { renderProjectModalRoot } from '../modules/projects/components/projectModal.js';

// Composição da página:
// - Linha de cima (2 colunas): hero (esquerda) + painel de perfil/sobre (direita).
//   A foto acompanha só a altura do perfil+sobre (não estica até os projetos).
// - Abaixo, largura cheia: seção de projetos preenchendo o resto da tela.
export function renderPortfolioPage() {
  return `
<section class="sm:px-6 lg:px-8 lg:py-10 max-w-6xl mx-auto pt-8 px-4 pb-8 flex flex-col gap-6 lg:gap-8">
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
    ${renderHeroImage()}
    <div class="flex flex-col gap-5">
      ${renderProfilePanel()}
    </div>
  </div>
  ${renderStacksMarquee()}
  ${renderProjectsSection()}
</section>
${renderProjectModalRoot()}`;
}
