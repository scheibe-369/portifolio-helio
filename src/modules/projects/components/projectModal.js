import { px } from '../lib/projectField.js';
import { tui } from '../../../app/i18n.js';
import { esc, safeUrl, safeColor } from '../../portfolio/lib/sanitize.js';

// SVGs inline (evita uma 2ª chamada de createIcons que re-escaneia o DOM inteiro).
const CLOSE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>`;
const CHECK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><path d="M20 6 9 17l-5-5"></path></svg>`;
const EXTERNAL_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="h-3.5 w-3.5"><path d="M7 7h10v10"></path><path d="M7 17 17 7"></path></svg>`;

const chip = (s) =>
  `<span class="text-[10px] font-medium text-white/70 bg-white/5 border border-white/10 rounded-full px-3 py-1">${esc(s)}</span>`;

const feature = (f, accent) => `
            <li class="flex items-start gap-2.5 text-sm text-white/80">
              <span class="shrink-0 mt-0.5" style="color: ${accent};">${CHECK_SVG}</span>
              <span>${esc(f)}</span>
            </li>`;

// Bloco de texto opcional. Devolve '' quando o texto e vazio: sem isso, um projeto sem
// "problema" ou sem "solucao" (o que passa a acontecer no minuto em que o comprador
// preenche so metade do formulario) renderiza um titulo sozinho, pendurado.
const block = (title, text) => {
  const t = String(text ?? '').trim();
  if (!t) return '';
  return `
          <div>
            <h3 class="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-1.5 metallic-silver w-fit">${esc(title)}</h3>
            <p class="text-sm text-white/70 leading-relaxed">${esc(t)}</p>
          </div>`;
};

// Conteudo do modal de um projeto. Puro: recebe projeto e idioma.
export function renderProjectModal(p, lang) {
  const chipImgClass = p.fit === 'cover' ? 'object-cover' : 'object-contain p-2';
  const accent = safeColor(p.accent, '#ffffff');
  const nome = esc(px(p, 'name', lang));

  const linkHtml = p.link
    ? `
          <div class="mt-5 flex items-center gap-3 flex-wrap">
            <a href="${safeUrl(p.link)}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-2 glass-button rounded-full px-4 py-2 text-[11px] font-semibold text-white hover:border-white/30 transition">
              ${esc(tui('visit', lang))} ${EXTERNAL_SVG}
            </a>
            ${p.linkNote ? `<span class="text-[10px] text-white/40">${esc(px(p, 'linkNote', lang))}</span>` : ''}
          </div>`
    : '';

  // O dado guarda o id de 11 caracteres; quem monta a URL do embed e este render, no
  // instante da pintura. Ver src/modules/projects/lib/youtube.js.
  //
  // A PROPORCAO VEM DO DADO. Shorts e vertical, e ate 16/08/2026 este bloco cravava
  // `aspect-video` para todo mundo: um Short entrava numa moldura 16:9 e o YouTube o
  // devolvia com duas tarjas pretas ocupando a maior parte da largura. A coluna
  // youtube_orientation existe desde a 0007 e o payload ja a publicava (0007:515); faltava
  // consumidor. As duas classes sao LITERAIS no fonte de proposito: o Tailwind v4 varre o
  // codigo e nao gera classe montada a partir de dado (risco R11 do plano).
  const vertical = p.videoOrientation === 'portrait';
  const molduraVideo = vertical
    ? 'aspect-[9/16] max-w-[320px] mx-auto'
    : 'aspect-video w-full';
  const videoHtml = p.videoId
    ? `
          <div class="mt-5 ${molduraVideo} rounded-2xl overflow-hidden border border-white/10 bg-black">
            <iframe class="w-full h-full" src="https://www.youtube.com/embed/${esc(p.videoId)}?rel=0" title="${nome}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen loading="lazy"></iframe>
          </div>`
    : '';

  // Painel externo arredondado que RECORTA (overflow-hidden) + wrapper interno que rola.
  // Assim a scrollbar fica dentro do card e não vaza os cantos arredondados.
  return `
      <div class="glass-card relative rounded-3xl w-full max-w-2xl max-h-[85vh] overflow-hidden" role="dialog" aria-modal="true" aria-label="${nome}" tabindex="-1"
        style="border-top: 2px solid ${accent};">
        <button data-modal-close aria-label="${esc(tui('closeAria', lang))}" class="absolute right-4 top-4 z-10 w-9 h-9 rounded-full glass-button flex items-center justify-center text-white/70 hover:text-white transition">
          ${CLOSE_SVG}
        </button>
        <div class="max-h-[85vh] overflow-y-auto p-7 sm:p-8">
          <div class="flex items-center gap-4 pr-10">
            <div class="w-16 h-16 rounded-2xl flex items-center justify-center overflow-hidden shrink-0 border border-white/10" style="background-color: ${safeColor(p.plateBg)};">
              <img src="${esc(p.image)}" alt="${nome}" class="w-full h-full ${chipImgClass}">
            </div>
            <div>
              <h2 class="text-xl font-bold text-white tracking-tight metallic-silver w-fit">${nome}</h2>
              <p class="text-[11px] uppercase tracking-widest text-white/40 mt-1">${esc(px(p, 'category', lang))} · ${esc(p.year)} · ${esc(p.client)}</p>
            </div>
          </div>

          <p class="text-sm text-white/80 leading-relaxed font-medium mt-5">${esc(px(p, 'tagline', lang))}</p>
          ${linkHtml}
          ${videoHtml}

          <div class="mt-6 flex flex-col gap-5">
            ${block(tui('challenge', lang), px(p, 'problem', lang))}
            ${block(tui('solution', lang), px(p, 'solution', lang))}
            <div>
              <h3 class="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2.5 metallic-silver w-fit">${esc(tui('features', lang))}</h3>
              <ul class="flex flex-col gap-2">${(px(p, 'features', lang) || []).map((f) => feature(f, accent)).join('')}
              </ul>
            </div>
            <div>
              <h3 class="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2.5 metallic-silver w-fit">${esc(tui('stackLabel', lang))}</h3>
              <div class="flex flex-wrap gap-2">${(px(p, 'stack', lang) || []).map(chip).join('')}
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
