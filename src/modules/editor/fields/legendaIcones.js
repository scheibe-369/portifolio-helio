import { ICONES_REDE, svgRede } from '../../profile/lib/iconesRede.js';

// A ESTANTE DE ICONES, dentro do formulario. Zona [browser].
//
// POR QUE ELA EXISTE: o campo de redes e um textarea de tres partes separadas por barra, e a
// do meio passou a ser o icone. Sem ver a lista, "digite o nome do icone" e um campo que so
// funciona para quem ja sabe a resposta, e o comprador tipico deste produto e um funileiro que
// nunca preencheu formulario com barra vertical na vida.
//
// CLICAR ESCREVE O NOME NA LINHA EM QUE O CURSOR ESTA. E o unico jeito de isto ser util de
// verdade: ler o nome, memorizar e digitar sem errar acento e uma tarefa que o produto nao
// tem por que cobrar de ninguem.
//
// Dentro de um <details> fechado porque sao 37 desenhos: aberto, a estante seria maior que o
// resto do formulario e empurraria os campos seguintes para fora da tela.
export function legendaDeIcones() {
  const itens = Object.keys(ICONES_REDE)
    .map(
      (k) => `
        <button type="button" class="ed-icone" data-icone="${k}" title="${k}">
          ${svgRede(k, 'ed-icone-svg')}
          <span>${k}</span>
        </button>`,
    )
    .join('');
  return `
    <details class="ed-icones">
      <summary>Ver os ${Object.keys(ICONES_REDE).length} ícones. Clique em um para usar</summary>
      <div class="ed-icones-grade">${itens}</div>
    </details>`;
}
