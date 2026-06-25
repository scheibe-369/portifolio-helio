// i18n simples: idioma global (persistido) + resolvers. A troca é IN-PLACE: o main.js
// chama render() de novo (sem reload). Os listeners são delegados no document e ligados
// uma vez, então o re-render não duplica nem perde handlers.
const KEY = 'gh-portfolio-lang';

let lang = 'pt';
try {
  lang = localStorage.getItem(KEY) === 'en' ? 'en' : 'pt';
} catch {
  lang = 'pt';
}

export const getLang = () => lang;

export function setLang(l) {
  lang = l === 'en' ? 'en' : 'pt';
  try {
    localStorage.setItem(KEY, lang);
  } catch {
    /* ignore */
  }
}

export function toggleLang() {
  setLang(lang === 'pt' ? 'en' : 'pt');
  return lang;
}

// Resolve um valor que pode ser string (igual nos 2 idiomas) ou { pt, en }.
export const t = (v) => (v && typeof v === 'object' && 'pt' in v ? v[lang] ?? v.pt : v);

// Strings de interface.
const ui = {
  about: { pt: 'Sobre', en: 'About' },
  projects: { pt: 'Meus Projetos', en: 'My Projects' },
  cases: { pt: 'cases', en: 'cases' },
  stacks: { pt: 'Stacks Dominadas', en: 'Tech Stack' },
  filterBy: { pt: 'Filtrar por', en: 'Filter by' },
  bookCall: { pt: 'Agendar Call', en: 'Book a Call' },
  challenge: { pt: 'O Desafio', en: 'The Challenge' },
  solution: { pt: 'A Solução', en: 'The Solution' },
  features: { pt: 'Recursos', en: 'Features' },
  stackLabel: { pt: 'Stack', en: 'Stack' },
  visit: { pt: 'Acessar', en: 'Visit' },
  // título da aba + aria-labels (controles só com ícone)
  title: { pt: 'Portfólio', en: 'Portfolio' },
  langAria: { pt: 'Trocar idioma (PT / EN)', en: 'Switch language (PT / EN)' },
  filterAria: { pt: 'Filtrar projetos', en: 'Filter projects' },
  prevAria: { pt: 'Página anterior', en: 'Previous page' },
  nextAria: { pt: 'Próxima página', en: 'Next page' },
  closeAria: { pt: 'Fechar', en: 'Close' },
};

export const tui = (key) => t(ui[key]);
