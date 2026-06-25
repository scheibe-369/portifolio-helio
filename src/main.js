import './styles/global.css';
import { createIcons, Code, ArrowRight, ArrowUpRight } from 'lucide';
import { renderPortfolioPage } from './app/portfolioPage.js';
import { initProjectModal } from './modules/projects/components/projectModal.js';
import { initProjects, applyProjects } from './modules/projects/components/projectsSection.js';
import { getLang, toggleLang, tui } from './app/i18n.js';

const app = document.querySelector('#app');

// Re-renderiza a página inteira (usado no load e na troca de idioma — sem reload).
function render() {
  document.documentElement.lang = getLang() === 'en' ? 'en' : 'pt-br';
  document.title = tui('title');
  document.body.style.overflow = '';
  app.innerHTML = renderPortfolioPage();
  createIcons({ icons: { Code, ArrowRight, ArrowUpRight } });
  applyProjects(); // reaplica filtro/paginação ao DOM novo
}

render();

// Interações ligadas UMA vez (delegadas no document) — sobrevivem ao re-render.
initProjectModal();
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
