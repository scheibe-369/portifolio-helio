// Traducao entre a LINHA do banco e o RASCUNHO que o formulario edita. Zona [browser].
//
// As duas formas existem de proposito e a ponte fica num arquivo so:
//   linha    fala de armazenamento (role_i18n, logo_path, certificate_public)
//   rascunho fala de formulario (role, logo, certificate_public), com o texto ja em PT
//
// Fase 1 escreve SO a chave `pt` dos campos *_i18n, e por isso a escrita faz merge com o que
// ja esta no banco em vez de substituir o objeto inteiro: quando a fase 3 comecar a gravar
// `en`, um salvar de PT feito por este codigo nao pode apagar a traducao que ja existe.

export const doI18n = (v) => (v && typeof v === 'object' ? (v.pt ?? '') : (v ?? ''));

export const paraI18n = (valor, atual) => ({ ...(atual && typeof atual === 'object' ? atual : {}), pt: valor ?? '' });

export const listaDoI18n = (v) => (v && typeof v === 'object' && Array.isArray(v.pt) ? v.pt : []);

export const listaParaI18n = (lista, atual) => ({
  ...(atual && typeof atual === 'object' ? atual : {}),
  pt: Array.isArray(lista) ? lista : [],
});

// `null` e nao string vazia nas colunas opcionais: o CHECK de url_https_valida e o de e-mail
// aceitam NULL e recusam ''. Gravar '' transforma "nao preenchi" em erro de constraint.
export const ouNulo = (v) => {
  const s = typeof v === 'string' ? v.trim() : v;
  return s === '' || s === undefined ? null : s;
};
