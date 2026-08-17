import { tui, tuin } from '../../../app/i18n.js';
import { rotulo } from '../../../app/rotulos.js';
import { ex } from '../lib/experienceField.js';
import { iniciais } from '../lib/iniciais.js';
import { esc, safeUrl, safeColor, safePosition } from '../../portfolio/lib/sanitize.js';

const ICONE_DIPLOMA = `<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"></path><path d="M6 12v5c3 3 9 3 12 0v-5"></path></svg>`;
const ICONE_ANEXO = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>`;

// Placa da logo. Sem logo, cai no monograma: o comprador que ainda não subiu a imagem
// continua com um card apresentável em vez de um buraco.
//
// Sem padding aqui de propósito: o respiro em volta da arte já vem assado no WebP, igual em
// todas as logos (a arte ocupa 80% do quadrado). Padding no CSS por cima reintroduziria a
// margem dobrada que fazia cada logo aparecer num tamanho diferente.
const CENTRO = '50% 50%';

const placa = (e) => {
  const interno = e.logo
    ? `<img src="${safeUrl(e.logo)}" alt="${esc(e.org)}" loading="lazy" decoding="async" class="w-full h-full object-cover" style="object-position: ${safePosition(e.logoPosition, CENTRO)};">`
    : `<span class="text-[13px] font-black tracking-tight text-white/45">${esc(iniciais(e.org))}</span>`;
  return `
            <div class="shrink-0 w-14 h-14 rounded-xl overflow-hidden border border-white/10 flex items-center justify-center" style="background-color: ${safeColor(e.plateBg)};">
              ${interno}
            </div>`;
};

// "2024 a 2025" quando terminou, "Desde 2025" quando é atual. O caso atual não vira
// "2025 a Atual" porque a linha é caixa alta e o conectivo sozinho lê mal ali.
// Sem travessão em nenhum dos dois, por regra de copy.
const periodo = (e, lang) =>
  e.end ? `${esc(e.start)} ${esc(tui('periodTo', lang))} ${esc(e.end)}` : `${esc(tui('since', lang))} ${esc(e.start)}`;

const marcador = (t) => `
                <li class="relative pl-3.5 text-[11.5px] leading-relaxed text-white/55">
                  <span class="absolute left-0 top-[0.55em] w-1 h-1 rounded-full bg-white/25"></span>${esc(t)}
                </li>`;

const item = (e, lang) => {
  const destaques = ex(e, 'highlights', lang) || [];
  const nota = ex(e, 'note', lang);
  const cert = e.certificate;
  const local = ex(e, 'location', lang);
  return `
          <li class="flex gap-3.5 py-4 border-t border-white/5 first:border-t-0 first:pt-1">
            ${placa(e)}
            <div class="flex-1 min-w-0 flex flex-col gap-2">
              <div class="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <p class="text-[12.5px] font-bold text-white leading-tight">${esc(ex(e, 'role', lang))}</p>
                <span class="text-white/20 text-[11px]">·</span>
                <p class="text-[12px] font-medium text-white/70 leading-tight">${esc(e.org)}</p>
                ${e.kind === 'education' ? `<span class="inline-flex items-center gap-1 rounded-md bg-white/5 border border-white/10 px-1.5 py-0.5 text-[8.5px] font-bold uppercase tracking-wider text-white/40">${ICONE_DIPLOMA}${esc(tui('education', lang))}</span>` : ''}
              </div>
              <div class="flex flex-wrap items-center gap-x-2 text-[10px] font-medium uppercase tracking-wider text-white/30">
                <span>${periodo(e, lang)}</span>${local ? `<span class="text-white/15">·</span><span>${esc(local)}</span>` : ''}
              </div>
              ${destaques.length ? `<ul class="flex flex-col gap-1 mt-0.5">${destaques.map(marcador).join('')}</ul>` : ''}
              ${nota ? `<p class="text-[11.5px] leading-relaxed text-white/45 italic border-l border-white/10 pl-3">${esc(nota)}</p>` : ''}
              ${cert ? `<a href="${safeUrl(cert.url)}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1.5 w-fit rounded-lg glass-button px-2.5 py-1.5 text-[10px] font-semibold text-white/75 hover:text-white">${ICONE_ANEXO}${esc(cert.label || tui('certificate', lang))}</a>` : ''}
            </div>
          </li>`;
};

// Seção "Experiência": lista vertical, uma entrada por passagem (trabalho ou estudo).
export function renderExperienceSection(experience, lang, ui = {}) {
  if (!experience.length) return '';
  return `
    <div id="experiencia" class="flex flex-col glass-card rounded-3xl p-5 gap-1">
      <div class="flex items-center justify-between mb-1">
        <span class="text-[10px] font-bold uppercase tracking-widest text-white/30 metallic-silver">${esc(rotulo(ui, 'experience', lang))}</span>
        <span class="text-[10px] font-medium text-white/30">${experience.length} ${esc(tuin('experienceCount', experience.length, lang))}</span>
      </div>
      <ul class="flex flex-col">${experience.map((e) => item(e, lang)).join('')}
      </ul>
    </div>`;
}
