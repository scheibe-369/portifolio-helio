// Estado do idioma. Zona [browser]: SO o navegador importa isto.
//
// POR QUE ISSO SAIU DO i18n.js: o idioma morava numa variavel de modulo (`let lang`) que
// t() lia direto. No navegador isso e inofensivo, porque cada aba tem o proprio modulo. Num
// isolate de Worker, nao: o modulo e carregado uma vez e reaproveitado entre requisicoes de
// pessoas diferentes. Duas visitas ao mesmo tempo, uma em PT e outra em EN, e a segunda
// levaria o idioma da primeira. Nao daria erro, nao apareceria em log, e serviria a pagina
// errada para um cliente pagante.
//
// A regra que sobra: quem renderiza recebe `lang` por parametro (ctx.lang). Quem MUTA o
// idioma e so este arquivo, e ele nunca e alcancavel a partir do codigo do Worker. O
// scripts/import-graph.mjs reprova quem tentar.
const CHAVE = 'gh-portfolio-lang';

let lang = 'pt';
try {
  lang = localStorage.getItem(CHAVE) === 'en' ? 'en' : 'pt';
} catch {
  lang = 'pt';
}

export const getLang = () => lang;

export function setLang(l) {
  lang = l === 'en' ? 'en' : 'pt';
  try {
    localStorage.setItem(CHAVE, lang);
  } catch {
    /* modo anonimo ou storage bloqueado: fica so em memoria */
  }
}

export function toggleLang() {
  setLang(lang === 'pt' ? 'en' : 'pt');
  return lang;
}
