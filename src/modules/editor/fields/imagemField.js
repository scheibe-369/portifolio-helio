import { esc } from '../../portfolio/lib/sanitize.js';
import { resolver } from '../data/fieldSchema.js';
import { DESTINOS, TIPOS_ACEITOS } from '../../media/lib/imagePipeline.js';

// Campo de imagem: o primitivo `.ed-drop` (area de arquivo, tambem clicavel) mais a previa.
// Zona [browser].
//
// Colar com Ctrl+V foi cortado (6.1): input de arquivo mais arrastar e soltar cobrem o caso, e
// o tratamento de clipboard tem quirk por navegador que nao paga o proprio custo aqui.

export function renderCampoImagem(campo, valores, { bloqueado = false } = {}) {
  const cfg = DESTINOS[campo.destino];
  const url = valores[`${campo.key}_url`] || '';
  const label = esc(resolver(campo.label, valores));
  const quadrada = cfg.proporcao === 1;
  return `
    <div class="ed-field" data-campo="${esc(campo.key)}">
      <label class="ed-label">${label}</label>
      <div class="ed-drop${url ? ' tem-arquivo' : ''}" data-drop="${esc(campo.key)}" data-destino="${esc(campo.destino)}" tabindex="0" role="button">
        ${
          url
            ? `<img src="${esc(url)}" alt="" class="ed-drop-previa${quadrada ? ' e-quadrada' : ''}"
                    style="background-color:${esc(valores.plate_bg || '#0b0b12')}">`
            : '<span class="ed-drop-icone" aria-hidden="true">+</span>'
        }
        <span class="ed-drop-texto">${url ? 'Trocar imagem' : 'Escolher ou arrastar uma imagem'}</span>
        <input type="file" class="ed-drop-input" accept="${esc(TIPOS_ACEITOS.join(','))}"
               data-arquivo="${esc(campo.key)}"${bloqueado ? ' disabled' : ''}>
      </div>
      ${url ? `<button type="button" class="ed-link-perigo" data-remover-imagem="${esc(campo.key)}">Remover imagem</button>` : ''}
      <p class="ed-help">${esc(resolver(campo.help, valores) || '')}</p>
      <p class="ed-erro" data-erro></p>
    </div>`;
}
