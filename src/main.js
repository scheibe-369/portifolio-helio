import './styles/global.css';
import { createIcons } from 'lucide';
import { ICONES_LUCIDE } from './modules/profile/lib/iconesLucide.js';
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
          vitrine: Boolean(injetado.vitrine),
        },
      )
    : {
        lang: getLang(),
        portfolio: { profile, projects, stacks, experience, projectGroups, filterGroups: FILTER_GROUPS },
        slug: 'helio',
        flags: { hasCustom: false, englishEnabled: true },
        isPreview: false,
        // Este ramo so roda em desenvolvimento local, onde nao existe payload injetado. A
        // vitrine fica ligada para a faixa de compra ser vista sem subir nada, e o apexHost
        // e o de producao porque o botao aponta para o checkout de verdade nos dois casos.
        vitrine: true,
        apexHost: 'myportifolio.com.br',
      };

// O ctx da ultima pintura. Existe porque o modal precisa achar o projeto clicado, e ele so
// pode olhar para o portfolio que esta na tela AGORA: no subdominio de um comprador, os
// projetos vem do payload dele, e nao dos modulos estaticos.
let ctxCorrente = null;

// Re-renderiza a página inteira (usado no load e na troca de idioma, sem reload).
function render() {
  // O idioma e do visitante: ele clicou no PT/EN e isso vale sobre o que o servidor pintou.
  const ctx = { ...montarCtx(), lang: getLang() };
  ctxCorrente = ctx;
  document.documentElement.lang = ctx.lang === 'en' ? 'en' : 'pt-br';
  // O titulo so e escrito pelo JS quando NAO veio do servidor. Com SSR, o <title> ja e o
  // do tenant (o nome do comprador), e sobrescrever com o generico 'Portfolio' trocaria
  // o nome dele pelo nosso rotulo na aba do navegador e no historico.
  if (!injetado) document.title = tui('title', ctx.lang);
  document.body.style.overflow = '';
  app.innerHTML = renderPortfolioPage(ctx);
  createIcons({ icons: ICONES_LUCIDE });
  applyProjects(); // reaplica filtro/paginação ao DOM novo
}

render();

// Interações ligadas UMA vez (delegadas no document), sobrevivem ao re-render.
//
// O RESOLVEDOR OLHA O CTX DA TELA, e nao os modulos estaticos. Ate 16/08/2026 ele fazia
// `projects.find(...)` sobre o array do Helio importado do arquivo, e o comentario que estava
// aqui dizia que "na fase 1 o resolvedor passa a olhar o payload do tenant". A fase 1 veio e
// isso ficou para tras. O efeito: no portfolio de QUALQUER comprador, clicar num card nao
// abria nada, porque nenhum slug dele existe na lista do Helio. E se um slug coincidisse
// (`site`, `app`, `landing`), o visitante abria um projeto do Helio dentro da pagina de
// outra pessoa. A grade de projetos e o centro do produto, e ela estava morta ao clique.
initProjectModal(
  (slug) => (ctxCorrente?.portfolio?.projects || []).find((p) => p.slug === slug),
  () => getLang(),
  () => ctxCorrente?.portfolio?.uiLabels || {},
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
