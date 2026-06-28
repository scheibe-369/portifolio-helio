import { profile } from '../data/profile.data.js';
import { t, tui, getLang } from '../../../app/i18n.js';

const statItem = (s) => {
  // A stat "Idiomas" vira o toggle de idioma (PT/EN) — ver main.js (#lang-toggle).
  if (s.lang) {
    const lang = getLang();
    return `
            <button id="lang-toggle" type="button" class="flex flex-col text-center cursor-pointer" aria-label="${tui('langAria')}">
              <span class="text-[10px] uppercase tracking-widest text-white/30 metallic-silver">${t(s.label)}</span>
              <span class="mt-1 font-bold text-base">
                <span class="${lang === 'pt' ? 'text-white' : 'text-white/35'}">PT</span><span class="text-white/20">/</span><span class="${lang === 'en' ? 'text-white' : 'text-white/35'}">EN</span>
              </span>
            </button>`;
  }
  return `
            <div class="flex flex-col text-center">
              <span class="text-[10px] uppercase tracking-widest text-white/30 metallic-silver">${t(s.label)}</span>
              <span class="mt-1 font-bold text-base">${t(s.value)}</span>
            </div>`;
};

const socialItem = ({ label, value, href }) => `
            <a href="${href}" target="_blank" rel="noopener noreferrer" class="flex-1 flex items-center justify-between rounded-xl glass-button px-4 py-2.5">
              <span>${label}</span>
              <span class="text-white/40 font-normal">${t(value)}</span>
            </a>`;

// Coluna direita (topo): card de perfil + bio + sociais.
export function renderProfilePanel() {
  return `
    <!-- Card de Perfil -->
    <div class="flex flex-col sm:flex-row sm:items-stretch sm:justify-between glass-card rounded-3xl p-6 gap-5">
      <div class="flex items-center gap-4">
        <div class="relative">
          <img src="${profile.avatar}" alt="${profile.name} Avatar" class="w-14 h-14 object-cover ring-white/10 ring-2 rounded-full">
          <span class="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-black rounded-full shadow-lg"></span>
        </div>
        <div>
          <h1 class="text-2xl md:text-3xl font-bold tracking-tight text-white">${profile.name}</h1>
          <p class="text-xs font-medium text-white/40 metallic-silver">${t(profile.role)}</p>
        </div>
      </div>
      <div class="flex flex-col sm:items-end sm:justify-between gap-3">
        <div class="flex gap-5 text-xs text-white/80">${profile.stats.map(statItem).join('')}
        </div>
        <!-- BOTÃO VIBECODER -->
        <button class="inline-flex vibecoder-btn text-[11px] font-bold text-white rounded-full py-1.5 px-5 gap-2 items-center justify-center">
          <i data-lucide="code" class="h-3.5 w-3.5 text-white"></i>
          VibeCoder
        </button>
      </div>
    </div>

    <!-- Bio + Sociais -->
    <div class="grid grid-cols-1 md:grid-cols-5 gap-4">
      <div class="md:col-span-3 flex flex-col gap-3 glass-card rounded-3xl p-6">
        <h3 class="text-[10px] font-bold uppercase tracking-widest text-white/30 metallic-silver w-fit">${tui('about')}</h3>
        <p class="text-sm text-white/80 leading-relaxed font-medium">${t(profile.bio)}</p>
      </div>

      <div class="md:col-span-2 flex flex-col gap-2 glass-card rounded-3xl p-5">
        <div class="flex-1 flex flex-col gap-2 text-[11px] font-semibold text-white">${profile.socials.map(socialItem).join('')}
        </div>

        <!-- BOTÃO AGENDAR CALL (abre o Cal.com) -->
        <a href="https://cal.com/growth-hub/reuniao-gh" target="_blank" rel="noopener noreferrer" class="bookmarkBtn mt-2">
          <span class="IconContainer">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="icon-svg"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
          </span>
          <p class="btn-text">${tui('bookCall')}</p>
        </a>
      </div>
    </div>`;
}
