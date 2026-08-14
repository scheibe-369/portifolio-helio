import { esc, safeUrl, safeColor } from '../../portfolio/lib/sanitize.js';

// Painel de lista com setas de ordem. Zona [browser]. Serve "Meus projetos" e "Minha
// experiencia", que sao irmaos de proposito.
//
// SETAS, E NAO ARRASTAR (corte de 6.1): `draggable` nao funciona no toque sem uma camada de
// Pointer Events que e um projeto disfarcado de item de lista, e setas sao acessiveis por
// teclado de graca. Arrastar volta na fase 2, se alguem pedir.

export function renderLista({ itens, vazio, rotuloAdicionar }) {
  const linha = (item, i) => `
    <li class="ed-lista-item" data-item="${esc(item.id)}">
      <div class="ed-lista-placa" style="background-color:${safeColor(item.cor)}">
        ${item.imagem ? `<img src="${safeUrl(item.imagem)}" alt="" loading="lazy" decoding="async">` : `<span>${esc(item.iniciais || '?')}</span>`}
      </div>
      <div class="ed-lista-texto">
        <p class="ed-lista-titulo">${esc(item.titulo)}</p>
        <p class="ed-lista-sub">${esc(item.subtitulo || '')}</p>
        ${item.selos?.length ? `<div class="ed-selos">${item.selos.map((s) => `<span class="ed-selo">${esc(s)}</span>`).join('')}</div>` : ''}
      </div>
      <div class="ed-lista-setas">
        <button type="button" class="ed-seta" data-subir="${esc(item.id)}" aria-label="Subir"${i === 0 ? ' disabled' : ''}>▲</button>
        <button type="button" class="ed-seta" data-descer="${esc(item.id)}" aria-label="Descer"${i === itens.length - 1 ? ' disabled' : ''}>▼</button>
      </div>
      <button type="button" class="ed-lista-editar" data-editar="${esc(item.id)}">Editar</button>
    </li>`;

  return `
    <div class="ed-lista">
      ${itens.length ? `<ul class="ed-lista-ul">${itens.map(linha).join('')}</ul>` : `<p class="ed-vazio">${esc(vazio)}</p>`}
      <button type="button" class="ed-btn e-primario ed-largo" data-adicionar>${esc(rotuloAdicionar)}</button>
      <p id="ed-lista-msg" class="ed-msg"></p>
    </div>`;
}

// Move um item na lista e devolve a lista nova. Nao grava: quem grava e o painel, porque so
// ele sabe qual tabela e qual `position`.
export function mover(itens, id, direcao) {
  const i = itens.findIndex((x) => String(x.id) === String(id));
  const j = i + direcao;
  if (i < 0 || j < 0 || j >= itens.length) return itens;
  const copia = [...itens];
  [copia[i], copia[j]] = [copia[j], copia[i]];
  return copia;
}
