import { esc, safeUrl } from '../../portfolio/lib/sanitize.js';
import { abrirGaveta, repintarCorpo } from '../components/editorDrawer.js';
import { getRascunho } from '../state/draftState.js';
import {
  montarChecklist,
  sugestaoVideoPrimeiro,
  publicar,
  tirarDoAr,
  girarTokenDePrevia,
  urlDePrevia,
  enderecoPublico,
} from '../state/publishState.js';
import { gravarOrdem } from '../api/projectsApi.js';

// Tela de publicar: checklist, link de previa e o botao. Zona [browser].
//
// A PREVIA EXISTE DESDE A FASE 1 e nao e enfeite: e o que mata o ticket "salvei e nao mudou",
// e o bump de facilitacao DEPENDE dela, porque nos montamos o portfolio e o comprador precisa
// aprovar antes de ir ao ar. O token em claro so aparece uma vez (o banco guarda o sha256),
// entao ele e mostrado inteiro no instante em que e gerado.

export function abrirPainelPublicar({ aoMudar }) {
  const { portfolio, projetos, experiencias } = getRascunho();
  let token = null;
  let resultado = null;

  const sugestao = sugestaoVideoPrimeiro({ portfolio, projetos });

  const html = () => {
    const itens = montarChecklist({ portfolio, projetos, experiencias });
    const travando = itens.filter((i) => i.trava && !i.ok);
    return `
      <div class="ed-publicar">
        <div class="ed-endereco">
          <span class="ed-endereco-rot">Seu endereço</span>
          <a href="${safeUrl(enderecoPublico(portfolio.slug))}" target="_blank" rel="noopener noreferrer">${esc(portfolio.slug)}.<span class="ed-endereco-apex">${esc(enderecoPublico(portfolio.slug).replace(/^https:\/\/[^.]+\./, '').replace(/\/$/, ''))}</span></a>
        </div>

        <ul class="ed-check-lista">
          ${itens
            .map(
              (i) => `<li class="${i.ok ? 'e-ok' : i.trava ? 'e-trava' : 'e-falta'}">
                        <span class="ed-check-marca">${i.ok ? '✓' : '○'}</span>${esc(i.texto)}
                      </li>`,
            )
            .join('')}
        </ul>

        ${
          sugestao
            ? `<div class="ed-sugestao">
                 <p>${sugestao.quantos} ${sugestao.quantos === 1 ? 'case com vídeo não está' : 'cases com vídeo não estão'} no topo da grade. Reordenar?</p>
                 <button type="button" class="ed-btn" data-reordenar-video>Colocar os vídeos primeiro</button>
               </div>`
            : ''
        }

        <div class="ed-previa">
          <p class="ed-previa-titulo">Link de prévia</p>
          <p class="ed-help">Mostra o rascunho como o visitante veria, sem publicar. Quem tiver o link consegue ver, então trate como segredo. Gerar um novo derruba o anterior.</p>
          ${
            token
              ? `<div class="ed-copiavel"><input class="ed-input" readonly value="${esc(urlDePrevia(portfolio.slug, token))}" data-previa-url>
                   <button type="button" class="ed-btn" data-copiar-previa>Copiar</button></div>`
              : ''
          }
          <button type="button" class="ed-btn" data-girar-previa>${token ? 'Gerar link novo' : 'Gerar link de prévia'}</button>
        </div>

        ${resultado ? `<p class="ed-msg e-${resultado.tipo}">${esc(resultado.texto)}</p>` : ''}

        <button type="button" class="ed-btn e-primario ed-largo" data-publicar${travando.length ? ' disabled' : ''}>
          ${portfolio.first_published_at ? 'Publicar alterações' : 'Publicar meu portfólio'}
        </button>
        ${travando.length ? `<p class="ed-msg e-erro">Falta: ${esc(travando.map((i) => i.texto.toLowerCase()).join(', '))}.</p>` : ''}
        ${portfolio.first_published_at ? '<button type="button" class="ed-link e-perigo" data-tirar-do-ar>Tirar minha página do ar</button>' : ''}
        <p id="ed-pub-msg" class="ed-msg"></p>
      </div>`;
  };

  const ligar = (corpo) => {
    corpo.addEventListener('click', async (e) => {
      const msg = corpo.querySelector('#ed-pub-msg');

      if (e.target.closest('[data-girar-previa]')) {
        try {
          token = await girarTokenDePrevia(portfolio.id);
          repintarCorpo(html(), ligar);
        } catch (erro) {
          msg.textContent = erro.message || 'nao consegui gerar o link';
        }
        return;
      }

      if (e.target.closest('[data-copiar-previa]')) {
        const campo = corpo.querySelector('[data-previa-url]');
        campo.select();
        await navigator.clipboard?.writeText(campo.value).catch(() => {});
        msg.textContent = 'link copiado';
        return;
      }

      if (e.target.closest('[data-reordenar-video]')) {
        const ordenados = [...projetos].sort((a, b) => (b.youtube_id ? 1 : 0) - (a.youtube_id ? 1 : 0));
        await gravarOrdem(ordenados);
        aoMudar();
        msg.textContent = 'ordem atualizada';
        return;
      }

      if (e.target.closest('[data-publicar]')) {
        e.target.disabled = true;
        try {
          const r = await publicar(portfolio.id);
          // 'em_revisao' acontece UMA vez por conta, e a espera precisa vir explicada junto do
          // que continua funcionando: a previa. Sem essa frase, o comprador acha que quebrou.
          resultado =
            r?.status === 'em_revisao'
              ? {
                  tipo: 'neutro',
                  texto:
                    'Recebido. A primeira publicação de cada conta passa por uma conferência rápida antes de ir ao ar. Enquanto isso o link de prévia já mostra tudo.',
                }
              : { tipo: 'ok', texto: 'No ar. Pode abrir o seu endereço.' };
          repintarCorpo(html(), ligar);
          aoMudar();
        } catch (erro) {
          e.target.disabled = false;
          msg.textContent = erro.message || 'nao consegui publicar';
        }
        return;
      }

      if (e.target.closest('[data-tirar-do-ar]')) {
        try {
          await tirarDoAr(portfolio.id);
          msg.textContent = 'sua página saiu do ar';
          aoMudar();
        } catch (erro) {
          msg.textContent = erro.message || 'nao consegui tirar do ar';
        }
      }
    });
  };

  abrirGaveta({ titulo: 'Publicar', html: html(), aoLigar: ligar });
}
