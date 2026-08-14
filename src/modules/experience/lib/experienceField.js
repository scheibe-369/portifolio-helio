// Resolve um campo traduzivel de experiencia. PURO: o idioma entra por parametro.
// Irmao do px() dos projetos, e de proposito com a mesma regra.
import { experienceEn } from '../data/experience.en.js';

// String vazia nao conta como traducao: cai no PT.
export const ex = (e, campo, lang) => {
  if (lang === 'en') {
    const v = experienceEn[e.slug] && experienceEn[e.slug][campo];
    if (v != null && v !== '') return v;
  }
  return e[campo];
};
