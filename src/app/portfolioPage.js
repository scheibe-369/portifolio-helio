import { renderHeroImage } from '../modules/profile/components/heroImage.js';
import { renderProfilePanel } from '../modules/profile/components/profilePanel.js';
import { renderStacksMarquee } from '../modules/stacks/components/stacksMarquee.js';
import { renderProjectsSection } from '../modules/projects/components/projectsSection.js';
import { renderExperienceSection } from '../modules/experience/components/experienceSection.js';
import { renderProjectModalRoot } from '../modules/projects/components/projectModal.js';
import { renderSiteFooter } from '../modules/portfolio/components/siteFooter.js';
import { renderVitrineCta } from '../modules/oferta/components/vitrineCta.js';

// Composição da página. Zona [iso]: este mesmo código roda no navegador e, a partir da
// fase 1, dentro do Worker para montar o HTML de cada comprador no servidor.
//
// Tudo entra por `ctx`, montado uma vez por request. Nenhuma função daqui para baixo
// importa dado nem lê estado de módulo, e é isso que torna o SSR possível: dois visitantes
// simultâneos, um em PT e outro em EN, não podem compartilhar variável de idioma dentro do
// mesmo isolate. O contrato de ctx está na seção 3 do tasks/plano-produto.md.
//
// Layout:
// - Linha de cima (2 colunas): hero (esquerda) + painel de perfil/sobre (direita).
//   A foto acompanha só a altura do perfil+sobre (não estica até os projetos).
// - Abaixo, largura cheia e nesta ordem: stacks, projetos e experiência. Os projetos são
//   a vitrine e ficam logo depois das stacks; a experiência fecha a página.
export function renderPortfolioPage(ctx) {
  const { lang, portfolio } = ctx;
  // So a vitrine leva a faixa de compra, e quem decide isso e o SLUG (ver vitrineCta.js): o
  // documento e cacheado por (portfolio_id, content_hash), identico para o apex e para o
  // subdominio da vitrine, entao conteudo que dependesse do host colidiria em cache.
  const cta = ctx.vitrine ? renderVitrineCta(lang, ctx.apexHost) : '';
  const { profile, projects, stacks, experience, projectGroups, filterGroups, uiLabels } = portfolio;
  // Os titulos das secoes descem por parametro, e nao sao lidos de um modulo dentro de cada
  // componente, pelo mesmo motivo que o idioma ja desce assim: nada abaixo daqui le estado,
  // e e isso que deixa dois visitantes do mesmo isolate de Worker verem paginas diferentes.
  const ui = uiLabels || {};
  return `
<section class="sm:px-6 lg:px-8 lg:py-10 max-w-6xl mx-auto pt-8 px-4 pb-8 flex flex-col gap-6 lg:gap-8">
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
    ${renderHeroImage(profile, lang)}
    <div class="flex flex-col gap-5">
      ${renderProfilePanel(profile, lang, ui)}
    </div>
  </div>
  ${renderStacksMarquee(stacks, lang, ui)}
  ${renderProjectsSection(projects, lang, { projectGroups, filterGroups, ui })}
  ${renderExperienceSection(experience, lang, ui)}
</section>
${cta}
${ctx.vitrine ? renderSiteFooter(lang) : ''}
${renderProjectModalRoot()}`;
}
