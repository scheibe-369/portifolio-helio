import { rotulo } from '../../../app/rotulos.js';
import { esc } from '../../portfolio/lib/sanitize.js';

const chip = (s) =>
  `<span class="stack-chip shrink-0 rounded-full px-5 py-2 text-[11px] font-semibold text-white/90 whitespace-nowrap">${esc(s)}</span>`;

// Carrossel infinito de stacks. O track é renderizado 2x para o loop ser contínuo
// (a animação desloca translateX(-50%) = exatamente uma cópia).
export function renderStacksMarquee(stacks, lang, ui = {}) {
  // Lista vazia nao desenha secao. E a mesma regra que experienceSection.js:63 ja seguia, e
  // faltava aqui: o comprador que ainda nao preencheu via um card com o titulo e um vazio
  // dentro, animando para os lados. No editor existe um bloco de estado vazio proprio para
  // dar alvo de clique; na pagina publica, seccao sem conteudo e so ruido.
  if (!Array.isArray(stacks) || !stacks.length) return '';
  const row = stacks.map(chip).join('');
  return `
    <div class="flex flex-col glass-card rounded-3xl p-5 gap-4"
      style="position: relative; --border-gradient: linear-gradient(135deg, rgba(255, 255, 255, 0.12), transparent); --border-radius-before: 24px">
      <span class="text-[10px] font-bold uppercase tracking-widest text-white/30 metallic-silver w-fit">${esc(rotulo(ui, 'stacks', lang))}</span>
      <div class="stacks-marquee">
        <div class="stacks-track">${row}${row}</div>
      </div>
    </div>`;
}
