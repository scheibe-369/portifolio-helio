import { esc } from '../../portfolio/lib/sanitize.js';
import { TIPOS_DOC, ehPdf } from '../../media/lib/docTipos.js';

// O campo de certificado. Zona [browser]. E o unico campo de arquivo do editor que nao e
// imagem, e o unico controle cuja recusa vem do banco por IDENTIDADE em vez de por flag.
//
// TRES REGRAS QUE NAO SAO DE ESTILO:
//
// 1. NADA aqui embute o documento. Nenhuma tag de iframe, embed ou object apontando para o
//    arquivo, pelo mesmo motivo que a pagina publica nao o serve pelo nosso origin: PDF sabe
//    executar JavaScript, e o bucket dele e privado exatamente por isso. Quando o arquivo nao
//    e imagem, aparece o mesmo chip de anexo que o card publicado ja desenha, com nome
//    truncado, tamanho em KB e tres acoes: abrir em aba nova, trocar e remover. Imagem ganha
//    miniatura de 56 px, e essa e a UNICA diferenca visual entre os dois casos. O criterio 10
//    de 6.11 confere isso por grep neste arquivo.
//
// 2. O consentimento nasce DESLIGADO e o texto ao lado dele diz o que ele faz. Enquanto
//    desligado, o arquivo existe, conta cota, e legivel pelo dono e NAO sai no payload nem
//    como caminho. Isso esta escrito na propria linha ("so voce ve"), senao o comprador
//    publica, nao acha o botao no card e abre ticket.
//
// 3. Para quem esta montando o portfolio pelo bump de FACILITACAO, a caixa aparece
//    DESABILITADA. Aqui esconder no JS nao e conveniencia: o banco recusa por
//    eh_titular_do_portfolio(), e deixar habilitado um controle que sempre falha e desenhar um
//    erro que o operador vai reportar como bug. O operador continua podendo SUBIR o arquivo,
//    que e o servico que foi vendido.

const ICONE_ANEXO = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>`;

const kb = (b) => (b ? `${Math.max(1, Math.round(b / 1024))} KB` : '');
const truncar = (n, max = 34) => (String(n || '').length > max ? `${String(n).slice(0, max - 1)}…` : String(n || 'certificado'));

export function renderCampoCertificado(campo, valores, { ehTitular = true } = {}) {
  const caminho = valores.certificate_path || '';
  const mime = valores.certificate_mime || '';
  const publico = Boolean(valores.certificate_public);
  const previa = valores.certificate_preview || '';
  const ehImagem = Boolean(mime) && !ehPdf(mime);

  const anexo = caminho
    ? `
      <div class="ed-anexo">
        ${
          ehImagem && previa
            ? `<img src="${esc(previa)}" alt="" class="ed-anexo-mini">`
            : `<span class="ed-anexo-icone" aria-hidden="true">${ICONE_ANEXO}</span>`
        }
        <span class="ed-anexo-nome">${esc(truncar(valores.certificate_nome || caminho.split('/').pop()))}</span>
        <span class="ed-anexo-tam">${esc(kb(valores.certificate_bytes))}</span>
        <button type="button" class="ed-anexo-acao" data-cert-abrir>Abrir</button>
        <button type="button" class="ed-anexo-acao" data-cert-trocar>Trocar</button>
        <button type="button" class="ed-anexo-acao e-perigo" data-cert-remover>Remover</button>
      </div>`
    : `
      <div class="ed-drop" data-cert-drop tabindex="0" role="button">
        <span class="ed-drop-icone" aria-hidden="true">+</span>
        <span class="ed-drop-texto">Anexar certificado (PDF ou imagem, até 3 MB)</span>
      </div>`;

  return `
    <div class="ed-field" data-campo="certificate">
      <label class="ed-label">${esc(campo.label)}</label>
      ${anexo}
      <input type="file" class="ed-oculto" accept="${esc(TIPOS_DOC.join(','))}" data-cert-input>
      ${
        caminho
          ? `
      <div class="ed-field ed-sub">
        <label class="ed-label" for="ed-cert-label">Texto do botão no card</label>
        <input id="ed-cert-label" class="ed-input" type="text" maxlength="40"
               data-k="certificate_label" value="${esc(valores.certificate_label || '')}" placeholder="Certificado">
      </div>

      <div class="ed-consentimento${publico ? ' is-on' : ''}">
        <button type="button" class="ed-check${publico ? ' is-on' : ''}" role="checkbox"
                aria-checked="${publico}" data-cert-publico${ehTitular ? '' : ' disabled'}></button>
        <div>
          <p class="ed-consentimento-titulo">Deixar o certificado visível na minha página</p>
          <p class="ed-help">
            ${
              ehTitular
                ? 'Ligando isto, qualquer pessoa com o endereço da página consegue abrir o documento. Certificado costuma trazer nome completo e CPF. Desligado, o arquivo fica guardado e só você vê.'
                : 'Só o titular pode publicar o próprio documento. Você pode anexar o arquivo, e ele decide se aparece na página.'
            }
          </p>
        </div>
      </div>`
          : ''
      }
      <p class="ed-erro" data-erro></p>
    </div>`;
}
