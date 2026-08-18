// Interacao do grid de projetos: filtro, paginacao e menu. Zona [browser].
//
// POR QUE ESTA SEPARADO DO RENDER: o render roda tambem dentro do Worker, onde `document`
// nao existe. Enquanto as duas coisas moravam no mesmo arquivo, qualquer import do render
// arrastava codigo de DOM para dentro do grafo do Worker. Nao quebraria no import, mas
// convida ao erro, e o scripts/import-graph.mjs reprova de proposito.

// Quantos cards por pagina. Mora aqui, e nao no render, porque quem pagina e este
// arquivo. Deixar a constante do outro lado foi o defeito que quebrou o boot inteiro: o
// ReferenceError acontecia DEPOIS do innerHTML, entao a pagina pintava certa e nada mais
// funcionava, sem erro visivel na tela.
// Quantos cards por pagina. Vem do DOM e nao de uma constante: `projects_per_page` e um
// select do editor desde sempre, com 3, 4, 6, 8, 9 e 12, e nao mudava absolutamente nada
// porque este numero estava cravado aqui. Um fotografo escolheu 9 e continuou vendo 6.
//
// Lido do atributo por request, e nao por parametro, porque applyProjects() roda DEPOIS do
// render e e chamada de novo a cada repintura: o DOM ja e a fonte da verdade dela, como ja
// era para o rotulo de "cases".
const perPageDoDom = () => Number(document.getElementById('project-count')?.dataset.perPage) || 6;

// Estado do filtro/paginação (em módulo: sobrevive ao re-render de troca de idioma).
// Isto é [browser] de propósito: só roda depois do render, no navegador.
let active = new Set();
let page = 0;
let menuOpen = false;

// Zera o estado. Existe para o editor da fase 1 poder trocar o portfólio inteiro sem
// herdar filtro e página do tenant anterior.
export function resetProjects() {
  active = new Set();
  page = 0;
  menuOpen = false;
}

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
  const pages = Math.max(1, Math.ceil(list.length / perPageDoDom()));
  if (page > pages - 1) page = pages - 1;
  if (page < 0) page = 0;
  const onPage = new Set(list.slice(page * perPageDoDom(), page * perPageDoDom() + perPageDoDom()));
  cards.forEach((c) => c.classList.toggle('hidden', !onPage.has(c)));

  if (countEl) countEl.textContent = `${list.length} ${countEl.dataset.casesLabel || ''}`.trim();
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

// Listeners delegados no document, ligados UMA vez (sobrevivem ao re-render).
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
