import { px } from '../lib/projectField.js';
import { t, tui } from '../../../app/i18n.js';
import { rotulo } from '../../../app/rotulos.js';
import { esc, safeColor, safeUrl, safePosition } from '../../portfolio/lib/sanitize.js';

// Badge de "play" pra cards que têm vídeo.
const PLAY_BADGE = `
            <span class="absolute right-3 bottom-3 w-7 h-7 rounded-full bg-black/55 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"></path></svg>
            </span>`;

const FUNNEL_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>`;
const CHEVRON_L = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"></path></svg>`;
const CHEVRON_R = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"></path></svg>`;

// Centro geometrico. O padrao de safePosition e '50% 36%', que e o enquadramento de ROSTO
// do hero: aplicado a uma imagem de trabalho, ele subiria o corte sem motivo.
const CENTRO = '50% 50%';

const card = (p, lang, grupos) => {
  const isCover = p.fit === 'cover';
  const imgClass = isCover ? 'object-cover' : 'object-contain p-5';
  const nome = esc(px(p, 'name', lang));
  return `
        <div data-slug="${esc(p.slug)}" data-groups="${esc(grupos)}" tabindex="0" role="button" class="project-card group relative rounded-2xl bg-zinc-950 border border-white/5 overflow-hidden flex flex-col cursor-pointer hover:border-white/15 focus:outline-none focus-visible:border-white/40 transition">
          <div class="relative overflow-hidden h-44 md:h-52 flex items-center justify-center" style="background-color: ${safeColor(p.plateBg)};">
            ${
              // SEM IMAGEM, NAO SAI <img>. Nem todo trabalho tem print: um caso de uma
              // advogada, uma consultoria, uma aula. O card continua de pe com a placa e a
              // categoria, e o titulo passa a ocupar o espaco da imagem. Antes saia
              // `src=""`, que faz o navegador rebuscar o proprio documento como imagem e
              // desenha o icone de figura quebrada em cima da placa colorida.
              p.image
                ? `<img src="${safeUrl(p.image)}" alt="${nome}" loading="lazy" decoding="async" class="w-full h-full ${imgClass} transition duration-700 group-hover:scale-105" style="object-position: ${safePosition(p.imagePosition, CENTRO)};">`
                : `<span class="px-5 text-center text-[13px] font-semibold leading-snug text-white/70">${nome}</span>`
            }
            <span class="absolute left-3 top-3 rounded-md glass-card px-2 py-1 text-[9px] font-black uppercase tracking-tighter text-white border-white/10">
              ${esc(px(p, 'category', lang))}
            </span>${p.videoId ? PLAY_BADGE : ''}
          </div>
          <div class="p-3 flex items-center justify-between">
            <p class="text-[11px] font-medium text-white uppercase tracking-wider leading-tight max-w-[80%] metallic-silver">
              ${nome}
            </p>
            <i data-lucide="arrow-up-right" class="h-4 w-4 text-white/20 group-hover:text-white transition"></i>
          </div>
        </div>`;
};

const filterOption = (g, lang) => `
          <button type="button" class="filter-option" data-filter="${esc(g.key)}">
            <span class="filter-dot"></span>${esc(t(g.label, lang))}
          </button>`;

// Seção "Meus Projetos": filtro por ícone (multi, opcional) + grid paginado (6/página).
//
// O rótulo de "cases" vai para data-cases-label: applyProjects() roda DEPOIS do render e
// precisa desse texto para recontar. Antes ela chamava tui() direto, o que a obrigava a
// conhecer o idioma, que e estado. Lendo do DOM, ela vira pura em relacao a idioma.
export function renderProjectsSection(projects, lang, { projectGroups, filterGroups, ui = {} }) {
  // Grade vazia nao desenha secao, mesma regra das stacks e da experiencia. Sem isto, quem
  // acabou de comprar publicava um card escrito "Meus Projetos / 0 cases" com um funil de
  // filtro que nao filtra nada, e essa e a primeira coisa que ele mostraria para alguem.
  if (!Array.isArray(projects) || !projects.length) return '';
  const rotuloCases = esc(rotulo(ui, 'cases', lang));
  return `
    <div class="flex flex-col glass-card rounded-3xl p-5 gap-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="text-[10px] font-bold uppercase tracking-widest text-white/30 metallic-silver">${esc(rotulo(ui, 'projects', lang))}</span>
          <i data-lucide="arrow-right" class="h-3 w-3 text-white/20"></i>
        </div>
        <div class="flex items-center gap-3">
          <span id="project-count" data-cases-label="${rotuloCases}" class="text-[10px] font-medium text-white/30">${projects.length} ${rotuloCases}</span>
          <div class="relative" id="project-filter-wrap">
            <button type="button" id="project-filter-toggle" class="filter-icon-btn" aria-label="${esc(tui('filterAria', lang))}">
              ${FUNNEL_SVG}
              <span id="filter-badge" class="filter-badge hidden">0</span>
            </button>
            <div id="project-filter-menu" class="filter-menu">
              <span class="px-2.5 pb-1 pt-0.5 text-[9px] font-bold uppercase tracking-widest text-white/30">${esc(tui('filterBy', lang))}</span>${filterGroups.map((g) => filterOption(g, lang)).join('')}
            </div>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-2 md:grid-cols-3 gap-4">${projects.map((p) => card(p, lang, (projectGroups[p.slug] || []).join(','))).join('')}
      </div>

      <div id="project-pager" class="hidden items-center justify-center gap-4 pt-1">
        <button type="button" id="pager-prev" class="pager-btn" aria-label="${esc(tui('prevAria', lang))}">${CHEVRON_L}</button>
        <span id="pager-info" class="text-[10px] font-medium tracking-widest text-white/40">1 / 1</span>
        <button type="button" id="pager-next" class="pager-btn" aria-label="${esc(tui('nextAria', lang))}">${CHEVRON_R}</button>
      </div>
    </div>`;
}
