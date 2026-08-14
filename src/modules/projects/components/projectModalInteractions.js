import { renderProjectModal } from './projectModal.js';

// Interacao do modal. Zona [browser]: fala com o DOM, entao nao pode estar no grafo do
// Worker (ver o comentario de projectsInteractions.js).
//
// initProjectModal recebe um RESOLVEDOR em vez de importar a lista de projetos. Assim o
// mesmo codigo serve o portfolio do Helio hoje e o de qualquer comprador na fase 1, onde a
// lista vem do payload publicado e nao de um arquivo.
export function initProjectModal(resolverProjeto, obterLang = () => 'pt') {
  const getModal = () => document.getElementById('project-modal');
  let lastTrigger = null;

  const open = (slug, trigger) => {
    const modal = getModal();
    if (!modal) return;
    const p = resolverProjeto(slug);
    if (!p) return;
    lastTrigger = trigger || null;
    modal.innerHTML = renderProjectModal(p, obterLang());
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
