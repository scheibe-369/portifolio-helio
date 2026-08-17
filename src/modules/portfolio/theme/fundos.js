// Os fundos que o comprador pode escolher. Zona [iso]: e uma lista de nomes, sem CSS e sem JS.
//
// POR QUE TODOS SAO CSS PURO, e por que nenhum e canvas:
//
// O render e isomorfico e roda dentro do Worker, onde nao existe `document` (a fronteira e
// verificada por scripts/import-graph.mjs e reprova o build). Fundo animado em canvas seria
// codigo de browser, exigiria hidratacao, e a primeira pintura sairia sem fundo nenhum.
// Vasculhei um acervo de 799 efeitos prontos e o veredito foi que dos 59 fundos de la, 52 sao
// componentes React com WebGL, que nao portam para um render em string. Escrever cada um
// destes em 15 a 40 linhas de CSS saiu mais barato do que adaptar um.
//
// O que isso compra: renderizam no primeiro byte, funcionam sem JavaScript, nao gastam CPU
// (gradiente e composto na GPU), nao quebram em celular fraco e nao mexem no teto do
// medir-render, porque o custo no servidor e concatenar uma string a mais.
//
// A CLASSE E LITERAL NO CSS, e o valor daqui so escolhe qual usar. Classe montada a partir de
// dado (`pf-bg-${nome}`) nao e gerada pelo scanner do Tailwind e nem encontrada por quem for
// procurar depois: e o risco R11 do plano, que ja mordeu no enquadramento do hero.
export const FUNDOS = {
  none: { nome: 'Preto liso', classe: '' },
  mesh: { nome: 'Névoa colorida', classe: 'pf-bg-mesh' },
  grid: { nome: 'Grade técnica', classe: 'pf-bg-grid' },
  dots: { nome: 'Pontilhado', classe: 'pf-bg-dots' },
  vinheta: { nome: 'Vinheta', classe: 'pf-bg-vinheta' },
  grao: { nome: 'Grão de filme', classe: 'pf-bg-grao' },
  brilho: { nome: 'Brilho no topo', classe: 'pf-bg-brilho' },
  photo: { nome: 'Foto sua', classe: 'pf-bg-photo' },
};

export const fundoValido = (v) =>
  (typeof v === 'string' && Object.prototype.hasOwnProperty.call(FUNDOS, v)) ? v : 'none';

// O veu entre o fundo e o conteudo. Ele nao e estetica: e a unica coisa que garante contraste
// quando o fundo e uma FOTO que ninguem validou. O minimo de 20% esta no CHECK do banco, e
// aqui ele e aplicado de novo porque o render nao confia em dado que veio de fora.
export const veuValido = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return 55;
  return Math.min(90, Math.max(20, Math.round(n)));
};

// Monta a camada de fundo. Devolve string vazia quando nao ha fundo: markup escondido pesa,
// e um <div> vazio no topo de toda pagina seria puro lixo.
export function renderFundo({ kind, url, overlay, accent } = {}) {
  const tipo = fundoValido(kind);
  if (tipo === 'none') return '';

  // A COR VEM JUNTO, e nao herdada. A camada de fundo e IRMA da secao (ela e `position:
  // fixed` e nao pode entrar no fluxo), entao a variavel declarada na secao nao chega ate
  // aqui: sem esta linha, os fundos que usam a paleta sairiam sempre no roxo de fabrica.
  const varCor = accent ? `--pf-accent: ${accent};` : '';

  if (tipo === 'photo') {
    if (!url) return '';
    const v = veuValido(overlay) / 100;
    // A foto entra por background-image e NUNCA por <img>: assim ela nao disputa com o hero o
    // papel de maior elemento da tela, que e como o navegador escolhe o LCP. O veu vai no
    // mesmo background, em cima, para nao precisar de um segundo elemento.
    return `<div class="pf-bg pf-bg-photo" aria-hidden="true" style="${varCor}background-image: linear-gradient(rgba(0,0,0,${v}), rgba(0,0,0,${v})), url('${url}');"></div>`;
  }

  return `<div class="pf-bg ${FUNDOS[tipo].classe}" aria-hidden="true"${varCor ? ` style="${varCor}"` : ''}></div>`;
}
