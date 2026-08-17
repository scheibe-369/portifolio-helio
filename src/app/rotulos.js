import { t, tui } from './i18n.js';

// Resolve o titulo de uma secao. Zona [iso]: roda no browser e dentro do Worker.
//
// POR QUE ISTO EXISTE: ate 16/08/2026 os titulos eram texto de INTERFACE, iguais para todo
// mundo, e o produto e vendido para qualquer profissao. O resultado, medido em dez portfolios
// reais de nichos diferentes: uma confeiteira publicou "STACKS DOMINADAS" logo acima de
// "Brigadeiro gourmet", uma advogada publicou "MEUS PROJETOS / 6 cases" para descrever
// processos trabalhistas, e o modal de um prato de comida perguntava "O Desafio" e listava a
// "Stack". Nao existe um conjunto de palavras que sirva a chef, advogada, tatuador e psicologa
// ao mesmo tempo.
//
// A REGRA DE VOLTA AO PADRAO MORA SO AQUI, e e o que mantem o portfolio do Helio e o de todo
// tenant ja publicado identicos sem precisar gravar nada: chave ausente, valor nulo ou string
// vazia caem no texto de hoje. Escrever a regra em cada componente daria seis copias que
// divergem na primeira vez que alguem esquecer o `.trim()`.
export function rotulo(uiLabels, chave, lang) {
  const proprio = t(uiLabels && uiLabels[chave], lang);
  const limpo = proprio == null ? '' : String(proprio).trim();
  return limpo || tui(chave, lang);
}

// As chaves que o comprador pode reescrever. E a lista que o editor oferece e a que o render
// consulta, na mesma ordem em que aparecem na pagina.
//
// O que NAO esta aqui, e por que: `experienceCount` ("passagem"/"passagens") tem forma
// singular e plural e nao cabe num campo de texto so; `bookCall` ja e um campo proprio
// (cta_label); e os rotulos de acessibilidade (aria) nao sao conteudo, sao interface.
export const CHAVES_ROTULO = [
  'about',
  'stacks',
  'projects',
  'cases',
  'experience',
  'challenge',
  'solution',
  'features',
  'stackLabel',
  'visit',
];
