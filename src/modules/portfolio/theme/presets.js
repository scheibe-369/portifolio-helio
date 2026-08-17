// As paletas que o comprador pode escolher. Zona [iso]: e uma tabela de nomes e cores, sem
// dependencia nenhuma.
//
// O BANCO GUARDA O NOME, NUNCA O HEX, e essa e a decisao que faz o resto funcionar:
//
//   . contraste vira teste de build. Cor guardada como dado so poderia ser conferida em
//     runtime, uma pagina de cada vez; morando aqui, scripts/testar-presets.mjs reprova o
//     commit inteiro se alguem acrescentar uma paleta ilegivel;
//   . as tres camadas que protegem o bump de personalizacao continuam intactas. O comprador
//     base escreve `theme_preset`, que e coluna nova e livre, e nunca toca em `theme_accent`,
//     que continua atras do grant, do trigger e da normalizacao do payload;
//   . trocar o tom de uma paleta depois e um deploy, e nao uma migration de dado em cima de
//     paginas de terceiros.
//
// A FRONTEIRA COM O BUMP fica assim, e ela ficou mais clara do que era:
//   base   = escolher entre paletas prontas, todas validadas
//   bump   = cor livre em hex, por cima do preset, mais cor por projeto
//
// Cada `accent` tem no minimo 4.5:1 sobre o proprio `plate`, e o texto branco no minimo 7:1
// sobre ele. Os numeros de cada uma estao em scripts/testar-presets.mjs, que os recalcula.
export const PRESETS = {
  grafite: { nome: 'Grafite', accent: '#8B72FF', plate: '#0b0b12' },
  brasa: { nome: 'Brasa', accent: '#E8833A', plate: '#1A1008' },
  ouro: { nome: 'Ouro', accent: '#C9A227', plate: '#0B1220' },
  prata: { nome: 'Prata', accent: '#FFFFFF', plate: '#0A0A0A' },
  limao: { nome: 'Limão', accent: '#B6FF3C', plate: '#0D1207' },
  terra: { nome: 'Terra', accent: '#A67C52', plate: '#14110E' },
  lavanda: { nome: 'Lavanda', accent: '#C4A7E7', plate: '#141021' },
  magenta: { nome: 'Magenta', accent: '#FF3FA4', plate: '#12071A' },
  rosa: { nome: 'Rosa', accent: '#FF8FA3', plate: '#1B0F14' },
  oceano: { nome: 'Oceano', accent: '#4C9AFF', plate: '#0A1020' },
  sangue: { nome: 'Sangue', accent: '#FF4D4D', plate: '#0F0A0A' },
  menta: { nome: 'Menta', accent: '#5EE9B5', plate: '#07140F' },
};

// O que a pagina usa quando ninguem escolheu nada. E o visual de hoje, e por isso o portfolio
// do Helio e o de todo tenant publicado antes disso nao mudam.
export const PADRAO = { accent: '#7C5CFC', plate: '#0b0b12' };

export const presetValido = (nome) =>
  (typeof nome === 'string' && Object.prototype.hasOwnProperty.call(PRESETS, nome)) ? nome : null;

// Resolve a cor final da pagina, e a ordem aqui E a regra de negocio:
// cor livre do bump vence o preset, o preset vence o padrao. Preset desconhecido, vindo de um
// deploy revertido ou de um dado adulterado, e ignorado sem lancar: uma pagina paga nunca cai
// por causa de um nome de cor.
export function resolverTema({ preset, accent, plateBg } = {}) {
  const p = presetValido(preset);
  const base = p ? PRESETS[p] : PADRAO;
  return {
    accent: accent || base.accent,
    plate: plateBg || base.plate,
    preset: p,
  };
}
