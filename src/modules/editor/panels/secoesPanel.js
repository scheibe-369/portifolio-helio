import { abrirGaveta, repintarCorpo } from '../components/editorDrawer.js';
import { esc } from '../../portfolio/lib/sanitize.js';
import { ORDEM_PADRAO, resolverSecoes } from '../../../app/secoes.js';
import { getRascunho, definir } from '../state/draftState.js';
import { salvarPerfil } from '../api/portfolioApi.js';
import { perfilAtual } from '../state/draftState.js';

// Painel de ordem e visibilidade das secoes. Zona [browser].
//
// SETAS, E NAO ARRASTAR, pelo mesmo motivo que listaPanel.js ja tinha registrado: `draggable`
// nao funciona no toque sem uma camada de Pointer Events que e um projeto disfarcado de item
// de lista, e setas sao acessiveis por teclado de graca. Aqui o argumento e ainda mais forte,
// porque sao tres itens: arrastar seria a unica parte desta feature capaz de virar um defeito
// que so aparece no celular de um comprador, que e onde a maioria edita.
//
// O par foto + perfil nao aparece nesta lista porque ele nao e reordenavel (ver secoes.js).
// Mostrar um item travado no topo so serviria para a pessoa tentar mover e nao conseguir.

const NOMES = {
  stacks: { titulo: 'Especialidades', sub: 'A faixa de etiquetas que passa de lado' },
  projects: { titulo: 'Trabalhos', sub: 'A grade com as suas entregas' },
  experience: { titulo: 'Experiência', sub: 'Onde você passou e o que estudou' },
};

const linha = (s, i, total) => `
    <li class="ed-lista-item" data-secao="${esc(s.key)}">
      <div class="ed-lista-texto">
        <p class="ed-lista-titulo">${esc(NOMES[s.key]?.titulo || s.key)}</p>
        <p class="ed-lista-sub">${esc(NOMES[s.key]?.sub || '')}${s.on ? '' : ' · escondida'}</p>
      </div>
      <div class="ed-lista-setas">
        <button type="button" class="ed-seta" data-subir="${esc(s.key)}" aria-label="Subir"${i === 0 ? ' disabled' : ''}>▲</button>
        <button type="button" class="ed-seta" data-descer="${esc(s.key)}" aria-label="Descer"${i === total - 1 ? ' disabled' : ''}>▼</button>
      </div>
      <button type="button" class="ed-lista-editar" data-alternar="${esc(s.key)}">${s.on ? 'Esconder' : 'Mostrar'}</button>
    </li>`;

const corpo = (secoes) => `
    <div class="ed-lista">
      <ul class="ed-lista-ul">${secoes.map((s, i) => linha(s, i, secoes.length)).join('')}</ul>
      <p class="ed-help">Sua foto e o seu perfil ficam sempre no topo. Seção escondida não aparece na sua página, e o conteúdo dela continua guardado aqui.</p>
    </div>`;

export function abrirPainelSecoes({ aoSalvar } = {}) {
  // Parte SEMPRE do resolvedor, e nunca do jsonb cru: assim a lista mostrada ja vem com a
  // secao nova que o codigo ganhou desde a ultima vez que a pessoa salvou, e sem a que foi
  // removida. E a mesma funcao que o render usa, entao o painel nao pode discordar da pagina.
  let secoes = resolverSecoes(getRascunho().portfolio?.sections, ORDEM_PADRAO);

  const mover = (key, passo) => {
    const i = secoes.findIndex((s) => s.key === key);
    const j = i + passo;
    if (i < 0 || j < 0 || j >= secoes.length) return;
    [secoes[i], secoes[j]] = [secoes[j], secoes[i]];
  };

  const ligar = (raiz) => {
    raiz.addEventListener('click', async (e) => {
      const subir = e.target.closest('[data-subir]');
      const descer = e.target.closest('[data-descer]');
      const alternar = e.target.closest('[data-alternar]');
      if (!subir && !descer && !alternar) return;

      if (subir) mover(subir.dataset.subir, -1);
      if (descer) mover(descer.dataset.descer, 1);
      if (alternar) {
        const s = secoes.find((x) => x.key === alternar.dataset.alternar);
        if (s) s.on = !s.on;
      }
      repintarCorpo(corpo(secoes), ligar);

      const pf = getRascunho().portfolio;
      if (!pf) return;
      // Grava a cada clique, e nao num botao de salvar no fim: a lista tem tres itens e o
      // resultado aparece no canvas atras da gaveta, entao um passo a mais para confirmar
      // seria atrito sem ganho.
      const linhaNova = await salvarPerfil(pf.id, { ...perfilAtual(), sections: secoes }, pf, {
        temCustom: getRascunho().temCustom,
      });
      definir({ portfolio: linhaNova || { ...pf, sections: secoes } });
      aoSalvar?.();
    });
  };

  abrirGaveta({
    titulo: 'Seções da página',
    subtitulo: 'Mude a ordem ou esconda o que não se aplica a você.',
    html: corpo(secoes),
    aoLigar: ligar,
  });
}
