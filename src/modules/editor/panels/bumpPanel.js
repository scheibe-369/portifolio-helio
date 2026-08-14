import { esc, safeUrl } from '../../portfolio/lib/sanitize.js';
import { abrirGaveta } from '../components/editorDrawer.js';
import { LINK_BUMP_CUSTOM } from '../config/editor.config.js';

// O painel da Personalizacao. Zona [browser].
//
// A LISTA ABAIXO E FECHADA, e a escolha do que fica de fora e o produto: tipografia,
// espacamento, ordem das secoes e CSS proprio nao entram, porque isso e o LAYOUT, e o layout e
// o que o comprador esta comprando. Um bump que deixa estragar o layout devolve dinheiro em
// forma de portfolio feio com o nosso nome no rodape.
//
// E esconder o campo no JS NAO e a protecao: a protecao sao as tres camadas do banco (o grant
// por coluna, o trigger portfolios_guarda_colunas e a normalizacao na saida de
// montar_payload_portfolio). Aqui e so a explicacao de por que o cadeado esta ali.

const INCLUI = [
  'A cor de destaque da página inteira',
  'O fundo das placas dos cards',
  'A cor de cada projeto, um por um',
  'O texto do selo do perfil',
  'O texto do botão principal',
  'Renomear os grupos do filtro',
];

export function abrirPainelBump() {
  abrirGaveta({
    titulo: 'Personalização',
    subtitulo: 'Um extra opcional. O portfólio funciona inteiro sem ele.',
    html: `
      <div class="ed-bump">
        <p class="ed-help">Estes campos aparecem com cadeado porque fazem parte da Personalização. Sem ela, sua página sai com o visual padrão, que é o que o produto entrega.</p>
        <ul class="ed-bump-lista">${INCLUI.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>
        ${
          LINK_BUMP_CUSTOM
            ? `<a class="ed-btn e-primario ed-largo" href="${safeUrl(LINK_BUMP_CUSTOM)}" target="_blank" rel="noopener noreferrer">Liberar a personalização</a>
               <p class="ed-help">Depois da compra, os cadeados somem sozinhos no próximo login.</p>`
            : '<p class="ed-help">O link de compra ainda não está configurado neste ambiente.</p>'
        }
      </div>`,
  });
}
