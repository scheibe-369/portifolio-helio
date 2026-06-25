import { projects, px } from '../data/projects.data.js';
import { tui } from '../../../app/i18n.js';

// SVGs inline (evita uma 2ª chamada de createIcons que re-escaneia o DOM inteiro).
const CLOSE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>`;
const CHECK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><path d="M20 6 9 17l-5-5"></path></svg>`;
const EXTERNAL_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="h-3.5 w-3.5"><path d="M7 7h10v10"></path><path d="M7 17 17 7"></path></svg>`;

// Extrai o ID do vídeo do YouTube (youtu.be/ID, watch?v=ID, embed/ID).
function youtubeId(url) {
  if (!url) return null;
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([\w-]{11})/);
  return m ? m[1] : null;
}

const chip = (s) =>
  `<span class="text-[10px] font-medium text-white/70 bg-white/5 border border-white/10 rounded-full px-3 py-1">${s}</span>`;

const feature = (f, accent) => `
            <li class="flex items-start gap-2.5 text-sm text-white/80">
              <span class="shrink-0 mt-0.5" style="color: ${accent};">${CHECK_SVG}</span>
              <span>${f}</span>
            </li>`;

const block = (title, text) => `
          <div>
            <h3 class="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-1.5">${title}</h3>
            <p class="text-sm text-white/70 leading-relaxed">${text}</p>
          </div>`;

function modalContent(p) {
  const chipImgClass = p.fit === 'cover' ? 'object-cover' : 'object-contain p-2';
  const chipBg = p.plateBg ? `background-color: ${p.plateBg};` : 'background-color: #0b0b12;';
  const vid = youtubeId(p.video);

  const linkHtml = p.link
    ? `
          <div class="mt-5 flex items-center gap-3 flex-wrap">
            <a href="${p.link}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-2 glass-button rounded-full px-4 py-2 text-[11px] font-semibold text-white hover:border-white/30 transition">
              ${tui('visit')} ${EXTERNAL_SVG}
            </a>
            ${p.linkNote ? `<span class="text-[10px] text-white/40">${px(p, 'linkNote')}</span>` : ''}
          </div>`
    : '';

  const videoHtml = vid
    ? `
          <div class="mt-5 aspect-video w-full rounded-2xl overflow-hidden border border-white/10 bg-black">
            <iframe class="w-full h-full" src="https://www.youtube.com/embed/${vid}?rel=0" title="${p.name}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen loading="lazy"></iframe>
          </div>`
    : '';

  // Painel externo arredondado que RECORTA (overflow-hidden) + wrapper interno que rola.
  // Assim a scrollbar fica dentro do card e não vaza os cantos arredondados.
  return `
      <div class="glass-card relative rounded-3xl w-full max-w-2xl max-h-[85vh] overflow-hidden" role="dialog" aria-modal="true" aria-label="${p.name}" tabindex="-1"
        style="border-top: 2px solid ${p.accent};">
        <button data-modal-close aria-label="${tui('closeAria')}" class="absolute right-4 top-4 z-10 w-9 h-9 rounded-full glass-button flex items-center justify-center text-white/70 hover:text-white transition">
          ${CLOSE_SVG}
        </button>
        <div class="max-h-[85vh] overflow-y-auto p-7 sm:p-8">
          <div class="flex items-center gap-4 pr-10">
            <div class="w-16 h-16 rounded-2xl flex items-center justify-center overflow-hidden shrink-0 border border-white/10" style="${chipBg}">
              <img src="${p.image}" alt="${p.name}" class="w-full h-full ${chipImgClass}">
            </div>
            <div>
              <h2 class="text-xl font-bold text-white tracking-tight">${p.name}</h2>
              <p class="text-[11px] uppercase tracking-widest text-white/40 mt-1">${px(p, 'category')} · ${p.year} · ${p.client}</p>
            </div>
          </div>

          <p class="text-sm text-white/80 leading-relaxed font-medium mt-5">${px(p, 'tagline')}</p>
          ${linkHtml}
          ${videoHtml}

          <div class="mt-6 flex flex-col gap-5">
            ${block(tui('challenge'), px(p, 'problem'))}
            ${block(tui('solution'), px(p, 'solution'))}
            <div>
              <h3 class="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2.5">${tui('features')}</h3>
              <ul class="flex flex-col gap-2">${px(p, 'features').map((f) => feature(f, p.accent)).join('')}
              </ul>
            </div>
            <div>
              <h3 class="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2.5">${tui('stackLabel')}</h3>
              <div class="flex flex-wrap gap-2">${px(p, 'stack').map(chip).join('')}
              </div>
            </div>
          </div>
        </div>
      </div>`;
}

// Root do modal (escondido por padrão). Vai no fim da página (recriado a cada render).
export function renderProjectModalRoot() {
  return `<div id="project-modal" class="hidden fixed inset-0 z-50 items-center justify-center p-4 bg-black/70 backdrop-blur-sm"></div>`;
}

// Interações do modal — delegadas no document e ligadas UMA vez (sobrevivem ao re-render).
export function initProjectModal() {
  const getModal = () => document.getElementById('project-modal');
  let lastTrigger = null;

  const open = (slug, trigger) => {
    const modal = getModal();
    if (!modal) return;
    const p = projects.find((x) => x.slug === slug);
    if (!p) return;
    lastTrigger = trigger || null;
    modal.innerHTML = modalContent(p);
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.body.style.overflow = 'hidden';
    modal.querySelector('[role="dialog"]')?.focus(); // foco entra no dialog
  };

  const close = () => {
    const modal = getModal();
    if (!modal) return;
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    modal.innerHTML = '';
    document.body.style.overflow = '';
    lastTrigger?.focus?.(); // foco volta pro card que abriu
    lastTrigger = null;
  };

  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('.project-card');
    if (trigger) {
      open(trigger.dataset.slug, trigger);
      return;
    }
    const modal = getModal();
    if (!modal || modal.classList.contains('hidden')) return;
    // fechar no backdrop (o próprio root) ou no botão de fechar
    if (e.target === modal || e.target.closest('[data-modal-close]')) close();
  });

  document.addEventListener('keydown', (e) => {
    // abrir card com Enter/Espaço (cards são role=button, tabindex=0)
    if (e.key === 'Enter' || e.key === ' ') {
      const card = e.target.closest && e.target.closest('.project-card');
      if (card) {
        e.preventDefault();
        open(card.dataset.slug, card);
        return;
      }
    }
    const modal = getModal();
    if (!modal || modal.classList.contains('hidden')) return;
    if (e.key === 'Escape') {
      close();
      return;
    }
    // trap de Tab dentro do modal
    if (e.key === 'Tab') {
      const f = modal.querySelectorAll('a[href], button, iframe, [tabindex]:not([tabindex="-1"])');
      if (!f.length) return;
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });
}
