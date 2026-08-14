// Resolucao de idioma, PURA. Zona [iso]: roda no browser e dentro do Worker.
//
// Nenhuma funcao aqui le estado de modulo. O idioma entra sempre por parametro, vindo de
// ctx.lang, que o Worker resolve por requisicao. Quem guarda o idioma escolhido pelo
// visitante e src/app/langState.js, que so existe no navegador. Ver o comentario de la para
// o defeito que essa separacao evita.
const PADRAO = 'pt';
const normalizar = (l) => (l === 'en' ? 'en' : PADRAO);

// Resolve um valor que pode ser string (igual nos dois idiomas) ou { pt, en }.
export const t = (v, lang) =>
  v && typeof v === 'object' && 'pt' in v ? v[normalizar(lang)] ?? v.pt : v;

// Strings de interface.
const ui = {
  about: { pt: 'Sobre', en: 'About' },
  projects: { pt: 'Meus Projetos', en: 'My Projects' },
  cases: { pt: 'cases', en: 'cases' },
  stacks: { pt: 'Stacks Dominadas', en: 'Tech Stack' },
  experience: { pt: 'Experiência', en: 'Experience' },
  periodTo: { pt: 'a', en: 'to' },
  since: { pt: 'Desde', en: 'Since' },
  current: { pt: 'Atual', en: 'Present' },
  education: { pt: 'Formação', en: 'Education' },
  certificate: { pt: 'Ver certificado', en: 'View certificate' },
  filterBy: { pt: 'Filtrar por', en: 'Filter by' },
  bookCall: { pt: 'Agendar Call', en: 'Book a Call' },
  challenge: { pt: 'O Desafio', en: 'The Challenge' },
  solution: { pt: 'A Solução', en: 'The Solution' },
  features: { pt: 'Recursos', en: 'Features' },
  stackLabel: { pt: 'Stack', en: 'Stack' },
  visit: { pt: 'Acessar', en: 'Visit' },
  builtBy: { pt: 'Desenvolvida por', en: 'Built by' },
  // título da aba + aria-labels (controles só com ícone)
  title: { pt: 'Portfólio', en: 'Portfolio' },
  langAria: { pt: 'Trocar idioma (PT / EN)', en: 'Switch language (PT / EN)' },
  filterAria: { pt: 'Filtrar projetos', en: 'Filter projects' },
  prevAria: { pt: 'Página anterior', en: 'Previous page' },
  nextAria: { pt: 'Próxima página', en: 'Next page' },
  closeAria: { pt: 'Fechar', en: 'Close' },
};

export const tui = (chave, lang) => t(ui[chave], lang);

// Rotulos contaveis, resolvidos pela contagem. Zona [iso], mesma pureza do resto.
//
// POR QUE ISTO NASCEU: o cabecalho da experiencia imprimia "5 passagens" e o defeito nunca
// apareceu porque o Helio tem cinco entradas. O comprador comeca com UMA e le "1 passagens",
// na primeira tela do produto que ele acabou de pagar. Rotulo contavel e plural e dado, nao
// texto fixo, e por isso ele tem forma propria em vez de um `if` solto no componente.
const uiContavel = {
  experienceCount: { pt: { um: 'passagem', outros: 'passagens' }, en: { um: 'role', outros: 'roles' } },
};

export const tuin = (chave, n, lang) => {
  const forma = uiContavel[chave][normalizar(lang)];
  return Number(n) === 1 ? forma.um : forma.outros;
};
