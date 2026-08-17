import { esc } from '../../portfolio/lib/sanitize.js';
import { renderPortfolioPage } from '../../../app/portfolioPage.js';
import { enderecoPublico } from '../state/publishState.js';

// A casca do editor: barra de cima, canvas vivo e os pontos de edicao por cima. Zona [browser].
//
// FORMATO: canvas vivo com gaveta. O comprador entra e ve O PORTFOLIO DELE, renderizado pela
// MESMA renderPortfolioPage() da pagina publica, com pontos de edicao por cima. Salvar
// re-renderiza o canvas na hora. Re-render total ja e o padrao do projeto (o main.js faz
// app.innerHTML na troca de idioma), entao isto nao inventa mecanismo nenhum.
//
// OS PONTOS DE EDICAO SAO INJETADOS DEPOIS DO RENDER, por JS, e nunca dentro dos componentes.
// A razao e dura: aqueles componentes sao zona [iso] e rodam dentro do Worker para pintar a
// pagina de todo comprador. Um `data-edit` no template significaria markup de editor no HTML
// publico de todo mundo, e o dom-diff da fase 0 reprovaria com razao.
//
// "Ver como visitante" e so tirar a classe do body (atalho V), sem re-render: com re-render
// seria uma piscada de tela inteira para esconder seis botoes.

export function renderCasca({ portfolio, statusPublicacao }) {
  const endereco = enderecoPublico(portfolio.slug);
  return `
    <div id="ed-barra" class="ed-barra">
      <div class="ed-barra-esq">
        <span class="ed-barra-marca">MyPortifolio</span>
        <a class="ed-barra-endereco" href="${esc(endereco)}" target="_blank" rel="noopener noreferrer">${esc(portfolio.slug)}</a>
        <span class="ed-barra-status ${statusPublicacao === 'no_ar' ? 'e-ok' : ''}">${esc(statusPublicacao === 'no_ar' ? 'no ar' : 'rascunho')}</span>
      </div>
      <nav class="ed-barra-dir">
        <button type="button" class="ed-barra-btn" data-abrir="perfil">Perfil</button>
        <button type="button" class="ed-barra-btn" data-abrir="projetos">Projetos</button>
        <button type="button" class="ed-barra-btn" data-abrir="experiencias">Experiência</button>
        <button type="button" class="ed-barra-btn" data-abrir="secoes">Seções</button>
        <button type="button" class="ed-barra-btn" data-abrir="conta">Conta</button>
        <button type="button" class="ed-barra-btn e-fantasma" data-ver-visitante title="Atalho: V">Ver como visitante</button>
        <button type="button" class="ed-barra-btn e-primario" data-abrir="publicar">Publicar</button>
      </nav>
    </div>
    <div id="ed-canvas" class="ed-canvas"></div>`;
}

const alvo = (chave, rotulo, extra = '') => `
  <button type="button" class="ed-alvo ${extra}" data-edit="${esc(chave)}">
    <span class="ed-alvo-lapis" aria-hidden="true">✎</span>${esc(rotulo)}
  </button>`;

// O bloco vazio de experiencia, desenhado AQUI e nao no componente de render.
//
// renderExperienceSection() devolve '' quando a lista esta vazia. Isso esta CERTO na pagina
// publica (secao sem conteudo nao se desenha) e e fatal no canvas, porque um portfolio recem
// criado nao teria nenhum alvo de clique para "adicionar experiencia". Mudar o '' para um
// esqueleto seria publicar uma secao vazia no dominio do comprador, e o criterio 9 de 6.11
// verifica exatamente isso com um grep no HTML publicado.
const BLOCO_EXPERIENCIA_VAZIA = `
  <div class="ed-bloco-vazio" data-edit="experiencias">
    <p class="ed-bloco-vazio-titulo">Experiência</p>
    <p class="ed-bloco-vazio-texto">Suas passagens por empresas e cursos. Enquanto estiver vazia, esta seção não aparece na sua página.</p>
    <span class="ed-btn e-primario">Adicionar experiência</span>
  </div>`;

// Os irmaos do bloco acima, pelo mesmo motivo e pela mesma regra.
//
// Em 16/08/2026 a pagina publica ganhou guarda de lista vazia tambem em projetos e stacks:
// antes ela desenhava um card "Meus Projetos / 0 cases" com um funil que nao filtra nada, e
// um carrossel de stacks girando vazio. Consertar a pagina publica abriu um buraco no canvas
// do editor, porque a ancora de "Adicionar ou reordenar projetos" e pendurada na secao
// renderizada: sem secao, sem alvo de clique, e o comprador recem chegado ficava sem caminho
// visivel para o que mais importa. Estes dois blocos existem so no editor e nunca no HTML
// publicado.
const BLOCO_PROJETOS_VAZIO = `
  <div class="ed-bloco-vazio" data-edit="projetos">
    <p class="ed-bloco-vazio-titulo">Trabalhos</p>
    <p class="ed-bloco-vazio-texto">É o coração do portfólio: comece por um. Enquanto estiver vazia, esta seção não aparece na sua página.</p>
    <span class="ed-btn e-primario">Adicionar trabalho</span>
  </div>`;

const BLOCO_STACKS_VAZIO = `
  <div class="ed-bloco-vazio" data-edit="perfil-stacks">
    <p class="ed-bloco-vazio-titulo">O que você usa no trabalho</p>
    <p class="ed-bloco-vazio-texto">Ferramentas, técnicas ou especialidades suas. Enquanto estiver vazia, esta seção não aparece na sua página.</p>
    <span class="ed-btn e-primario">Adicionar</span>
  </div>`;

/**
 * Pinta o canvas e injeta os pontos de edicao. Devolve o elemento do canvas.
 *
 * A ancoragem e por SELETOR ESTAVEL do render (o data-slug do card, o #experiencia da secao) e,
 * onde nao existe um, por posicao dentro da grade do topo. Nao inventamos atributo novo nos
 * componentes por causa da regra do comentario do topo deste arquivo.
 */
export function pintarCanvas(ctx, { temExperiencia }) {
  const canvas = document.getElementById('ed-canvas');
  canvas.innerHTML = renderPortfolioPage(ctx);

  const grade = canvas.querySelector('.grid');
  if (grade) {
    grade.children[0]?.insertAdjacentHTML('beforeend', alvo('perfil-foto', 'Trocar foto', 'e-canto'));
    grade.children[1]?.insertAdjacentHTML('afterbegin', alvo('perfil', 'Editar perfil', 'e-canto'));
  }

  canvas.querySelectorAll('.project-card[data-slug]').forEach((card) => {
    card.insertAdjacentHTML('beforeend', alvo(`projeto:${card.dataset.slug}`, 'Editar', 'e-canto'));
  });

  const secaoProjetos = canvas.querySelector('#project-count')?.closest('.glass-card');
  if (secaoProjetos) {
    secaoProjetos.insertAdjacentHTML('beforeend', alvo('projetos', 'Adicionar ou reordenar projetos', 'e-rodape'));
  } else {
    canvas.querySelector('section')?.insertAdjacentHTML('beforeend', BLOCO_PROJETOS_VAZIO);
  }

  const experiencia = canvas.querySelector('#experiencia');
  if (experiencia) {
    experiencia.insertAdjacentHTML('beforeend', alvo('experiencias', 'Adicionar ou reordenar experiência', 'e-rodape'));
    // Uma ancora por entrada, casada por indice com a lista do ctx: a secao publica nao imprime
    // o slug em atributo nenhum, e acrescentar um so para o editor seria markup de editor no
    // HTML de todo visitante.
    // `:scope > ul > li` e nao `ul > li`, e a diferenca nao e estilo.
    //
    // A secao tem DUAS profundidades de lista: o <ul> das entradas e, dentro de cada entrada,
    // um <ul> com os marcadores dos destaques. `ul > li` casava os dois e a numeracao saia
    // embaralhada: o lapis do primeiro marcador da primeira entrada abria o formulario da
    // SEGUNDA experiencia, e as entradas do fim ficavam sem ponto de edicao nenhum. So
    // aparece quando a primeira entrada tem destaques, que e o caso normal de quem preencheu
    // direito, e por isso passou despercebido.
    const lista = ctx.portfolio.experience;
    experiencia.querySelectorAll(':scope > ul > li').forEach((li, i) => {
      if (!lista[i]) return;
      li.insertAdjacentHTML('beforeend', alvo(`experiencia:${lista[i].slug}`, 'Editar', 'e-canto'));
    });
  } else if (!temExperiencia) {
    canvas.querySelector('section')?.insertAdjacentHTML('beforeend', BLOCO_EXPERIENCIA_VAZIA);
  }

  const stacks = canvas.querySelector('.stacks-marquee')?.closest('div');
  if (stacks) {
    stacks.insertAdjacentHTML('beforeend', alvo('perfil-stacks', 'Editar', 'e-canto'));
  } else {
    canvas.querySelector('section')?.insertAdjacentHTML('beforeend', BLOCO_STACKS_VAZIO);
  }

  return canvas;
}
