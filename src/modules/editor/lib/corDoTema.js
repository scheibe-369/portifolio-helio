import { resolverTema } from '../../portfolio/theme/presets.js';

// A regra que decide se a pessoa ESCOLHEU uma cor ou apenas aceitou a da paleta.
//
// Ela mora num modulo proprio, e nao dentro do portfolioApi, por um motivo pratico: o
// portfolioApi importa o cliente do Supabase, que depende de `import.meta.env` e so existe
// dentro do Vite, entao nada la e testavel fora do navegador. Esta regra ja errou duas vezes
// em producao, e regra que erra duas vezes precisa de teste.
//
// O PROBLEMA DE FUNDO: `<input type="color">` nunca fica vazio. Ele sempre devolve uma cor,
// mesmo quando ninguem o tocou, entao "nao mexi" e "escolhi exatamente esta cor" chegam aqui
// como o mesmo dado. As duas tentativas anteriores:
//
//   1. comparar com a cor de FABRICA. Abrir o perfil e salvar gravava o roxo por cima da
//      paleta escolhida, e como cor livre vence preset, quem PAGOU o bump era o unico que nao
//      conseguia usar as 12 paletas.
//   2. comparar com o preset NOVO, o que a pessoa acabou de escolher na mesma tela. Trocar de
//      paleta deixa o campo mostrando a cor da paleta ANTIGA (ele foi preenchido quando a
//      gaveta abriu), entao a comparacao dava diferente e a cor velha era gravada como se
//      fosse escolha. Um funileiro trocou para Sangue e publicou roxo.
//
// O que funciona e comparar com o preset DE ORIGEM, o que estava carregado quando o formulario
// abriu: e exatamente ele que o campo esta mostrando enquanto ninguem mexe.
export function corPropria(valorDoCampo, corEfetivaDeOrigem) {
  const v = String(valorDoCampo ?? '').trim();
  if (!v) return null;
  return v.toLowerCase() === String(corEfetivaDeOrigem ?? '').toLowerCase() ? null : v;
}

// As duas cores do bump, resolvidas contra o preset que estava carregado.
export function coresDoBump(valores, linhaAtual) {
  const origem = resolverTema({ preset: linhaAtual && linhaAtual.theme_preset });
  return {
    theme_accent: corPropria(valores.theme_accent, origem.accent),
    theme_plate_bg: corPropria(valores.theme_plate_bg, origem.plate),
  };
}
