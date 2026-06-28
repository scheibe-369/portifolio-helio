import { stacks } from '../data/stacks.data.js';
import { tui } from '../../../app/i18n.js';

const chip = (s) =>
  `<span class="stack-chip shrink-0 rounded-full px-5 py-2 text-[11px] font-semibold text-white/90 whitespace-nowrap">${s}</span>`;

// Carrossel infinito de stacks. O track é renderizado 2x para o loop ser contínuo
// (a animação desloca translateX(-50%) = exatamente uma cópia).
export function renderStacksMarquee() {
  const row = stacks.map(chip).join('');
  return `
    <div class="flex flex-col glass-card rounded-3xl p-5 gap-4"
      style="position: relative; --border-gradient: linear-gradient(135deg, rgba(255, 255, 255, 0.12), transparent); --border-radius-before: 24px">
      <span class="text-[10px] font-bold uppercase tracking-widest text-white/30 metallic-silver w-fit">${tui('stacks')}</span>
      <div class="stacks-marquee">
        <div class="stacks-track">${row}${row}</div>
      </div>
    </div>`;
}
