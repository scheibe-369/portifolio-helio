// Valores de ambiente do editor. Zona [browser].
//
// APEX_HOST nao e cosmetico: e com ele que o link de previa e o endereco publicado sao
// montados. Ele entra por env porque o mesmo bundle roda em desenvolvimento (onde o
// subdominio de tenant nao existe) e em producao.
// O `|| {}` nao e defensividade solta: `import.meta.env` e substituido pelo Vite no build e
// nao existe fora dele, e este modulo e o unico do editor que os testes de fumaca conseguem
// carregar em Node sem subir um browser inteiro.
const env = import.meta.env || {};

export const APEX_HOST = env.VITE_APEX_HOST || 'myportifolio.com.br';

// Checkout avulso do bump de personalizacao. Vazio em desenvolvimento: o painel de
// personalizacao continua explicando o que o bump inclui e apenas nao mostra o botao, o que e
// melhor do que um botao que leva a lugar nenhum.
export const LINK_BUMP_CUSTOM = env.VITE_CHECKOUT_BUMP_CUSTOM || '';

// Anos oferecidos no <select> de ano do projeto. Oito opcoes, terminando no ano corrente:
// digitar ano e erro de digitacao garantido, e o CHECK do banco recusa '20024' depois que a
// pessoa ja preencheu o resto.
export const ANOS = (() => {
  const atual = new Date().getFullYear();
  return Array.from({ length: 8 }, (_, i) => String(atual - i));
})();
