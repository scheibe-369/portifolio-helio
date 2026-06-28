import { projects, projectGroups, FILTER_GROUPS, px } from '../data/projects.data.js';
import { t, tui } from '../../../app/i18n.js';

const PER_PAGE = 6;

// Badge de "play" pra cards que têm vídeo.
const PLAY_BADGE = `
            <span class="absolute right-3 bottom-3 w-7 h-7 rounded-full bg-black/55 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"></path></svg>
            </span>`;

const FUNNEL_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>`;
const CHEVRON_L = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"></path></svg>`;
const CHEVRON_R = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"></path></svg>`;

const card = (p) => {
  const isCover = p.fit === 'cover';
  const imgClass = isCover ? 'object-cover' : 'object-contain p-5';
  const bg = p.plateBg ? ` style="background-color: ${p.plateBg};"` : ' style="background-color: #0b0b12;"';
  const groups = (projectGroups[p.slug] || []).join(',');
  return `
        <article data-slug="${p.slug}" data-groups="${groups}" tabindex="0" role="button" aria-label="${p.name}" class="project-card group relative rounded-2xl bg-zinc-950 border border-white/5 overflow-hidden flex flex-col cursor-pointer hover:border-white/15 focus:outline-none focus-visible:border-white/40 transition">
          <div class="relative overflow-hidden h-44 md:h-52 flex items-center justify-center"${bg}>
            <img src="${p.image}" alt="${p.name}" class="w-full h-full ${imgClass} transition duration-700 group-hover:scale-105">
            <span class="absolute left-3 top-3 rounded-md glass-card px-2 py-1 text-[9px] font-black uppercase tracking-tighter text-white border-white/10">
              ${px(p, 'category')}
            </span>${p.video ? PLAY_BADGE : ''}
          </div>
          <div class="p-3 flex items-center justify-between">
            <p class="text-[11px] font-medium text-white uppercase tracking-wider leading-tight max-w-[80%] metallic-silver">
              ${p.name}
            </p>
            <i data-lucide="arrow-up-right" class="h-4 w-4 text-white/20 group-hover:text-white transition"></i>
          </div>
        </article>`;
};

const filterOption = (g) => `
          <button type="button" class="filter-option" data-filter="${g.key}">
            <span class="filter-dot"></span>${t(g.label)}
          </button>`;

// Seção "Meus Projetos": filtro por ícone (multi, opcional) + grid paginado (6/página).
export function renderProjectsSection() {
  return `
    <div class="flex flex-col glass-card rounded-3xl p-5 gap-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="text-[10px] font-bold uppercase tracking-widest text-white/30 metallic-silver">${tui('projects')}</span>
          <i data-lucide="arrow-right" class="h-3 w-3 text-white/20"></i>
        </div>
        <div class="flex items-center gap-3">
          <span id="project-count" class="text-[10px] font-medium text-white/30">${projects.length} ${tui('cases')}</span>
          <div class="relative" id="project-filter-wrap">
            <button type="button" id="project-filter-toggle" class="filter-icon-btn" aria-label="${tui('filterAria')}">
              ${FUNNEL_SVG}
              <span id="filter-badge" class="filter-badge hidden">0</span>
            </button>
            <div id="project-filter-menu" class="filter-menu">
              <span class="px-2.5 pb-1 pt-0.5 text-[9px] font-bold uppercase tracking-widest text-white/30">${tui('filterBy')}</span>${FILTER_GROUPS.map(filterOption).join('')}
            </div>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-2 md:grid-cols-3 gap-4">${projects.map(card).join('')}
      </div>

      <div id="project-pager" class="hidden items-center justify-center gap-4 pt-1">
        <button type="button" id="pager-prev" class="pager-btn" aria-label="${tui('prevAria')}">${CHEVRON_L}</button>
        <span id="pager-info" class="text-[10px] font-medium tracking-widest text-white/40">1 / 1</span>
        <button type="button" id="pager-next" class="pager-btn" aria-label="${tui('nextAria')}">${CHEVRON_R}</button>
      </div>
    </div>`;
}

// Estado do filtro/paginação (em módulo: sobrevive ao re-render de troca de idioma).
let active = new Set();
let page = 0;
let menuOpen = false;

// Reaplica o estado ao DOM atual (chamado após cada render). Filtro opcional; sem nada = todos.
export function applyProjects() {
  const cards = [...document.querySelectorAll('.project-card')];
  if (!cards.length) return;
  const countEl = document.getElementById('project-count');
  const pager = document.getElementById('project-pager');
  const prev = document.getElementById('pager-prev');
  const next = document.getElementById('pager-next');
  const info = document.getElementById('pager-info');
  const badge = document.getElementById('filter-badge');
  const toggle = document.getElementById('project-filter-toggle');

  // sincroniza o estado "ativo" com as opções do menu (recriadas a cada render)
  document.querySelectorAll('.filter-option').forEach((opt) => {
    opt.classList.toggle('is-active', active.has(opt.dataset.filter));
  });

  const list = cards.filter((c) => {
    const g = (c.dataset.groups || '').split(',').filter(Boolean);
    return active.size === 0 || g.some((x) => active.has(x));
  });
  const pages = Math.max(1, Math.ceil(list.length / PER_PAGE));
  if (page > pages - 1) page = pages - 1;
  if (page < 0) page = 0;
  const onPage = new Set(list.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE));
  cards.forEach((c) => c.classList.toggle('hidden', !onPage.has(c)));

  if (countEl) countEl.textContent = `${list.length} ${tui('cases')}`;
  if (info) info.textContent = `${page + 1} / ${pages}`;
  if (pager) {
    pager.classList.toggle('hidden', pages <= 1);
    pager.classList.toggle('flex', pages > 1);
  }
  if (prev) prev.classList.toggle('is-disabled', page === 0);
  if (next) next.classList.toggle('is-disabled', page >= pages - 1);
  if (badge) {
    badge.textContent = String(active.size);
    badge.classList.toggle('hidden', active.size === 0);
  }
  if (toggle) toggle.classList.toggle('has-active', active.size > 0);
  // mantém o menu aberto/fechado após o re-render (ex.: troca de idioma)
  const menu = document.getElementById('project-filter-menu');
  if (menu) menu.classList.toggle('is-open', menuOpen);
}

// Listeners delegados no document — ligados UMA vez (sobrevivem ao re-render).
export function initProjects() {
  document.addEventListener('click', (e) => {
    // abrir/fechar o menu
    if (e.target.closest('#project-filter-toggle')) {
      menuOpen = !menuOpen;
      document.getElementById('project-filter-menu')?.classList.toggle('is-open', menuOpen);
      return;
    }
    // selecionar filtro (multi; menu fica aberto)
    const opt = e.target.closest('.filter-option');
    if (opt) {
      const f = opt.dataset.filter;
      if (active.has(f)) active.delete(f);
      else active.add(f);
      page = 0;
      applyProjects();
      return;
    }
    // paginação
    if (e.target.closest('#pager-prev')) {
      if (page > 0) {
        page -= 1;
        applyProjects();
      }
      return;
    }
    if (e.target.closest('#pager-next')) {
      page += 1;
      applyProjects();
      return;
    }
    // clique fora do filtro fecha o menu
    if (!e.target.closest('#project-filter-wrap')) {
      menuOpen = false;
      document.getElementById('project-filter-menu')?.classList.remove('is-open');
    }
  });
}
