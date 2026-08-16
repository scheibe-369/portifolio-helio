import { esc } from '../../portfolio/lib/sanitize.js';

// A gaveta lateral (bottom sheet no celular). Zona [browser].
//
// ELA E IRMA DE #app NO BODY, e isso nao e preferencia de organizacao: o canvas do editor e
// repintado com `app.innerHTML = renderPortfolioPage(ctx)` a cada alteracao, exatamente como o
// main.js ja faz na troca de idioma. Qualquer coisa dentro de #app e destruida nesse instante.
// Foi assim que o #project-modal do repo nasceu dentro do render, e e o defeito que esta
// gaveta nao pode repetir: o formulario sumiria no meio da digitacao.

let raiz = null;
let aoFechar = null;

function garantirRaiz() {
  if (raiz) return raiz;
  raiz = document.createElement('aside');
  raiz.id = 'ed-gaveta';
  raiz.className = 'ed-gaveta';
  raiz.setAttribute('aria-hidden', 'true');
  document.body.appendChild(raiz);

  raiz.addEventListener('click', (e) => {
    if (e.target.closest('[data-gaveta-fechar]') || e.target === raiz) fecharGaveta();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && raiz.classList.contains('is-open')) fecharGaveta();
  });
  return raiz;
}

/**
 * Abre a gaveta com um conteudo pronto. `aoLigar` recebe o corpo ja no DOM, porque quem monta
 * o conteudo e quem sabe ligar os eventos dele.
 */
export function abrirGaveta({ titulo, subtitulo = '', html, rodape = '', aoLigar, aoVoltar = null, aoSair = null }) {
  const el = garantirRaiz();
  aoFechar = aoSair;
  el.innerHTML = `
    <div class="ed-gaveta-painel" role="dialog" aria-modal="true" aria-label="${esc(titulo)}">
      <header class="ed-gaveta-topo">
        ${aoVoltar ? '<button type="button" class="ed-gaveta-voltar" data-gaveta-voltar aria-label="Voltar">‹</button>' : ''}
        <div class="ed-gaveta-titulos">
          <h2 class="ed-gaveta-titulo">${esc(titulo)}</h2>
          ${subtitulo ? `<p class="ed-gaveta-sub">${esc(subtitulo)}</p>` : ''}
        </div>
        <button type="button" class="ed-gaveta-x" data-gaveta-fechar aria-label="Fechar">×</button>
      </header>
      <div class="ed-gaveta-corpo" data-gaveta-corpo>${html}</div>
      ${rodape ? `<footer class="ed-gaveta-rodape">${rodape}</footer>` : ''}
    </div>`;
  el.classList.add('is-open');
  el.setAttribute('aria-hidden', 'false');
  document.body.classList.add('ed-com-gaveta');

  if (aoVoltar) el.querySelector('[data-gaveta-voltar]').addEventListener('click', aoVoltar);
  aoLigar?.(el.querySelector('[data-gaveta-corpo]'), el);
}

// Troca so o corpo, mantendo o cabecalho e a rolagem. E o que permite repintar o formulario a
// cada clique em switch sem a gaveta piscar inteira.
//
// O NO E SUBSTITUIDO, e nao so o innerHTML dele. Esta e a correcao de um defeito que atingia
// todo comprador e nao aparecia em log nenhum.
//
// ligarFormulario() registra os ouvintes NO PROPRIO no do corpo, por delegacao. Trocar
// `corpo.innerHTML` destroi os filhos e os ouvintes DELES, mas o corpo continua sendo o mesmo
// elemento, com os ouvintes antigos intactos, e ligarFormulario e chamado de novo logo em
// seguida. Cada repintura somava mais um jogo completo de ouvintes ao mesmo no.
//
// O efeito era proporcional ao numero de repinturas, e devastador:
//   . switch com N ouvintes executa `valores[k] = !valores[k]` N vezes, entao depois do
//     primeiro clique ele nunca mais desliga. Foi assim que uma formacao concluida em 2014
//     foi publicada como "DESDE 2010": o campo de fim so nasce quando o switch "estou aqui
//     ate hoje" desliga, e ele nao desligava.
//   . remover um chip filtra a lista N vezes e leva N itens junto: um clique apagou dez
//     especialidades de uma vez.
//
// `cloneNode(false)` copia o elemento e os atributos e NAO copia ouvinte nenhum, entao o no
// novo nasce limpo. E a forma mais barata de garantir que ligarFormulario seja sempre o
// primeiro e unico a registrar.
export function repintarCorpo(html, aoLigar) {
  const corpo = raiz?.querySelector('[data-gaveta-corpo]');
  if (!corpo) return;
  const rolagem = corpo.scrollTop;
  const novo = corpo.cloneNode(false);
  novo.innerHTML = html;
  corpo.replaceWith(novo);
  novo.scrollTop = rolagem;
  aoLigar?.(novo, raiz);
}

export function fecharGaveta() {
  if (!raiz) return;
  raiz.classList.remove('is-open');
  raiz.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('ed-com-gaveta');
  raiz.innerHTML = '';
  const fn = aoFechar;
  aoFechar = null;
  fn?.();
}

export const gavetaAberta = () => Boolean(raiz?.classList.contains('is-open'));
