import './styles/global.css';
import { createIcons, Code, ArrowRight, ArrowUpRight } from 'lucide';
import { renderPortfolioPage } from './app/portfolioPage.js';
import { montarCtx as montarCtxDoPayload } from './modules/portfolio/lib/ctx.js';
import { getLang, toggleLang } from './app/langState.js';
import { tui } from './app/i18n.js';
import { initProjectModal } from './modules/projects/components/projectModalInteractions.js';
import { initProjects, applyProjects } from './modules/projects/components/projectsInteractions.js';
import { profile } from './modules/profile/data/profile.data.js';
import { projects, projectGroups, FILTER_GROUPS } from './modules/projects/data/projects.data.js';
import { stacks } from './modules/stacks/data/stacks.data.js';
import { experience } from './modules/experience/data/experience.data.js';

// Boot do navegador. Zona [browser]: é aqui que o `ctx` é montado, uma vez, e daqui para
// baixo tudo é puro. Na fase 1 este arquivo passa a ler o payload que o Worker já pintou no
// HTML, em vez dos módulos de dado, e o resto da árvore não muda uma linha. É exatamente
// para isso que a fase 0 existe.
const app = document.querySelector('#app');

// HIDRATACAO. Duas origens possiveis para o mesmo `ctx`:
//
// 1. A pagina veio PINTADA do Worker, com o payload do tenant em <script id="pf-payload">.
//    E o caso de todo comprador, e do Helio em producao. O `ctx` e reconstruido do payload
//    pelo MESMO montarCtx que o Worker usou, senao o primeiro re-render (a troca de idioma)
//    trocaria a pagina inteira por outra.
// 2. Nao existe payload: e o `npm run dev`, servindo direto do Vite, e ai vale o dado
//    estatico dos arquivos, que e o portfolio do Helio.
//
// Sem o caso 1, o boot sobrescrevia o SSR com o portfolio do Helio dentro do subdominio do
// comprador. Isso so apareceria depois do deploy, e apareceria como "o site pisca e vira
// outro", sem erro nenhum no console.
const elPayload = document.getElementById('pf-payload');
const injetado = elPayload ? JSON.parse(elPayload.textContent) : null;

const montarCtx = () =>
  injetado
    ? montarCtxDoPayload(
        { mediaBase: injetado.mediaBase, apexHost: injetado.apexHost || '' },
        {
          payload: injetado.payload,
          slug: injetado.slug,
          url: new URL(window.location.href),
          isPreview: injetado.isPreview,
          payloadVCorrente: injetado.payloadV ?? 2,
        },
      )
    : {
        lang: getLang(),
        portfolio: { profile, projects, stacks, experience, projectGroups, filterGroups: FILTER_GROUPS },
        slug: 'helio',
        flags: { hasCustom: false, englishEnabled: true },
        isPreview: false,
      };

// Re-renderiza a página inteira (usado no load e na troca de idioma, sem reload).
function render() {
  // O idioma e do visitante: ele clicou no PT/EN e isso vale sobre o que o servidor pintou.
  const ctx = { ...montarCtx(), lang: getLang() };
  document.documentElement.lang = ctx.lang === 'en' ? 'en' : 'pt-br';
  // O titulo so e escrito pelo JS quando NAO veio do servidor. Com SSR, o <title> ja e o
  // do tenant (o nome do comprador), e sobrescrever com o generico 'Portfolio' trocaria
  // o nome dele pelo nosso rotulo na aba do navegador e no historico.
  if (!injetado) document.title = tui('title', ctx.lang);
  document.body.style.overflow = '';
  app.innerHTML = renderPortfolioPage(ctx);
  createIcons({ icons: { Code, ArrowRight, ArrowUpRight } });
  applyProjects(); // reaplica filtro/paginação ao DOM novo
}

render();

// Interações ligadas UMA vez (delegadas no document), sobrevivem ao re-render.
// O modal recebe um resolvedor e um leitor de idioma em vez de importar dado: na fase 1 o
// resolvedor passa a olhar o payload do tenant, sem o modal saber de onde veio.
initProjectModal(
  (slug) => projects.find((p) => p.slug === slug),
  () => getLang(),
);
initProjects();

// Toggle de idioma (stat "Idiomas"): troca e re-renderiza in-place (sem tela preta de reload).
document.addEventListener('click', (e) => {
  if (e.target.closest('#lang-toggle')) {
    toggleLang();
    render();
  }
});

// Revela o app já estilizado (anti-flash no 1º paint).
requestAnimationFrame(() => app.classList.add('ready'));
