// Resolve um campo traduzivel de projeto. PURO: o idioma entra por parametro.
//
// Saiu de projects.data.js porque la ele obrigava o modulo de DADO a importar o de IDIOMA,
// e todo componente que quisesse traduzir tinha que importar o dado junto. Com a funcao
// separada, componente recebe dado por parametro e importa so isto.
import { projectsEn } from '../data/projects.en.js';

// String vazia nao conta como traducao: cai no PT. Isso e proposital, e deixa a traducao
// ser preenchida aos poucos sem a pagina em EN ficar com buraco.
export const px = (p, campo, lang) => {
  if (lang === 'en') {
    const v = projectsEn[p.slug] && projectsEn[p.slug][campo];
    if (v != null && v !== '') return v;
  }
  return p[campo];
};
