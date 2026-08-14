import { esc } from '../../portfolio/lib/sanitize.js';
import { camposDoPasso, resolver } from '../data/fieldSchema.js';
import { renderCampo, lerMudanca, validarCampo } from '../fields/primitivos.js';
import { renderCampoImagem } from '../fields/imagemField.js';
import { renderCampoCertificado } from '../fields/certificado.js';
import { parseYoutubeId } from '../../projects/lib/youtube.js';

// O motor de formulario do editor. Zona [browser].
//
// Ele existe para que "acrescentar campo" seja UMA entrada em fieldSchema.js, e nao quatro
// arquivos alterados em lugares que divergem entre si. Nenhum painel monta input a mao.
//
// PASSO 1 SEMPRE ABERTO, o resto recolhido em <details>. Isso e 6.3 e 6.5.1 na pratica: os
// campos da primeira tela sao os unicos visiveis ao abrir, e o item ja e publicavel ao fim
// dela. Pedir dezenove campos para cadastrar o primeiro projeto e o ponto exato onde o
// comprador fecha a aba.

function renderUm(campo, valores, opcoes) {
  const bloqueado = campo.feature === 'custom' && !opcoes.temCustom;
  if (campo.tipo === 'imagem') return renderCampoImagem(campo, valores, { bloqueado });
  if (campo.tipo === 'certificado') {
    return renderCampoCertificado({ ...campo, label: resolver(campo.label, valores) }, valores, {
      ehTitular: opcoes.ehTitular,
    });
  }
  return renderCampo(campo, valores, { bloqueado });
}

export function renderFormulario({ campos, valores, passos, temCustom, ehTitular, abertos = [] }) {
  const opcoes = { temCustom, ehTitular };
  const bloco = (chave) => {
    const doPasso = camposDoPasso(campos, chave, valores);
    if (!doPasso.length) return '';
    const html = doPasso.map((c) => renderUm(c, valores, opcoes)).join('');
    if (chave === 1) return `<div class="ed-passo">${html}</div>`;
    return `
      <details class="ed-passo ed-recolhivel" data-passo="${esc(chave)}"${abertos.includes(String(chave)) ? ' open' : ''}>
        <summary class="ed-passo-titulo">${esc(passos[chave])}</summary>
        <div class="ed-passo-corpo">${html}</div>
      </details>`;
  };
  return `<div class="ed-form">${[1, 2, 3, 'fino'].map(bloco).join('')}</div>`;
}

// Quais <details> estao abertos agora. Sem isto, cada re-render (que acontece a cada clique em
// switch, chip ou botao de tipo) fecharia a secao em que a pessoa esta digitando.
export const passosAbertos = (raiz) =>
  [...raiz.querySelectorAll('details[data-passo]')].filter((d) => d.open).map((d) => d.dataset.passo);

/**
 * Liga os eventos do formulario a uma raiz ja pintada.
 *
 * `aoMudar(recarregar)` e chamado a cada alteracao. `recarregar` diz se o formulario precisa
 * ser repintado: `true` quando a mudanca altera a PROPRIA forma do formulario (o switch de
 * "estou aqui ate hoje" faz nascer o campo de fim, o tipo troca todos os rotulos, o chip muda
 * a lista), `false` quando e so texto, porque repintar durante a digitacao rouba o foco.
 */
export function ligarFormulario(raiz, { campos, valores, aoMudar, aoArquivo, aoCertificado }) {
  const mapa = new Map(campos.map((c) => [c.key, c]));

  const marcarErro = (key, mensagem) => {
    const campoEl = raiz.querySelector(`[data-campo="${CSS.escape(key)}"] [data-erro]`);
    if (campoEl) campoEl.textContent = mensagem || '';
  };

  raiz.addEventListener('input', (e) => {
    const alvo = e.target;
    const lido = lerMudanca(alvo, valores);
    if (!lido) return;
    valores[lido.key] = lido.valor;

    const campo = mapa.get(lido.key);
    const caixa = alvo.closest('.ed-field');
    const cont = caixa?.querySelector('[data-contador]');
    if (cont && campo?.maxLength && typeof lido.valor === 'string') {
      cont.textContent = `${lido.valor.length}/${campo.maxLength}`;
    }
    if (cont && Array.isArray(lido.valor) && campo?.maxLinhas) {
      cont.textContent = `${lido.valor.length}/${campo.maxLinhas}`;
    }
    const hex = caixa?.querySelector('[data-cor-hex]');
    if (hex) hex.textContent = lido.valor;

    // Feedback do YouTube na hora: o parser aceita shorts, live, link curto, ID solto e URL
    // com parametro antes do `v`. Dizer "reconheci" e o que impede o comprador colar o link do
    // canal e so descobrir que nao era video quando ninguem viu o case.
    const nota = caixa?.querySelector('[data-nota-youtube]');
    if (nota) {
      const r = lido.valor ? parseYoutubeId(lido.valor) : { id: null };
      nota.textContent = lido.valor ? (r.id ? `vídeo reconhecido (${r.id})` : 'não reconheci este link') : '';
      nota.classList.toggle('e-ok', Boolean(r.id));
    }

    if (campo) marcarErro(lido.key, validarCampo(campo, lido.valor, valores));
    aoMudar(false);
  });

  raiz.addEventListener('change', (e) => {
    const lido = lerMudanca(e.target, valores);
    if (lido) {
      valores[lido.key] = lido.valor;
      aoMudar(false);
    }
  });

  raiz.addEventListener('keydown', (e) => {
    const alvo = e.target;
    if (alvo.dataset.chipAdd == null || e.key !== 'Enter') return;
    e.preventDefault();
    const key = alvo.dataset.chipAdd;
    const campo = mapa.get(key);
    const texto = alvo.value.trim();
    if (!texto) return;
    const lista = Array.isArray(valores[key]) ? valores[key] : [];
    if (campo?.maxLinhas && lista.length >= campo.maxLinhas) return;
    if (!lista.includes(texto)) valores[key] = [...lista, texto];
    alvo.value = '';
    aoMudar(true);
  });

  raiz.addEventListener('click', (e) => {
    const alvo = e.target;

    const sw = alvo.closest('[data-switch]');
    if (sw && !sw.disabled) {
      valores[sw.dataset.switch] = !valores[sw.dataset.switch];
      return aoMudar(true);
    }

    const escolha = alvo.closest('[data-escolha]');
    if (escolha && !escolha.disabled) {
      valores[escolha.dataset.escolha] = escolha.dataset.valor;
      return aoMudar(true);
    }

    const remover = alvo.closest('[data-chip-remover]');
    if (remover) {
      const chips = remover.closest('[data-chips]');
      const key = chips.dataset.chips;
      const i = Number(remover.dataset.chipRemover);
      valores[key] = (valores[key] || []).filter((_, idx) => idx !== i);
      return aoMudar(true);
    }

    const drop = alvo.closest('[data-drop]');
    if (drop) {
      const input = drop.querySelector('[data-arquivo]');
      if (input && !input.disabled) input.click();
      return undefined;
    }

    const removerImagem = alvo.closest('[data-remover-imagem]');
    if (removerImagem) {
      const key = removerImagem.dataset.removerImagem;
      valores[`${key}_path`] = '';
      valores[`${key}_url`] = '';
      return aoMudar(true);
    }

    if (alvo.closest('[data-cert-drop]') || alvo.closest('[data-cert-trocar]')) {
      raiz.querySelector('[data-cert-input]')?.click();
      return undefined;
    }
    if (alvo.closest('[data-cert-remover]')) return aoCertificado?.('remover');
    if (alvo.closest('[data-cert-abrir]')) return aoCertificado?.('abrir');

    const check = alvo.closest('[data-cert-publico]');
    if (check && !check.disabled) {
      valores.certificate_public = !valores.certificate_public;
      return aoMudar(true);
    }
    return undefined;
  });

  raiz.addEventListener('change', (e) => {
    const input = e.target;
    if (input.dataset.arquivo != null && input.files?.[0]) {
      const campo = mapa.get(input.dataset.arquivo);
      aoArquivo?.(campo, input.files[0]);
      input.value = '';
    }
    if (input.dataset.certInput != null && input.files?.[0]) {
      aoCertificado?.('subir', input.files[0]);
      input.value = '';
    }
  });

  // Arrastar e soltar, que junto com o input de arquivo cobre o caso que o Ctrl+V cobriria
  // (corte de 6.1).
  raiz.addEventListener('dragover', (e) => {
    if (e.target.closest('[data-drop]')) {
      e.preventDefault();
      e.target.closest('[data-drop]').classList.add('e-sobre');
    }
  });
  raiz.addEventListener('dragleave', (e) => e.target.closest('[data-drop]')?.classList.remove('e-sobre'));
  raiz.addEventListener('drop', (e) => {
    const drop = e.target.closest('[data-drop]');
    if (!drop) return;
    e.preventDefault();
    drop.classList.remove('e-sobre');
    const arquivo = e.dataTransfer?.files?.[0];
    if (arquivo) aoArquivo?.(mapa.get(drop.dataset.drop), arquivo);
  });
}

// Erros de campo obrigatorio, antes de mandar para o banco. Nao substitui o CHECK: evita a
// viagem de rede que voltaria com uma mensagem de constraint que ninguem entende.
export function validarTudo(campos, valores) {
  const erros = {};
  for (const campo of campos) {
    if (campo.dependeDe && !campo.dependeDe(valores)) continue;
    const msg = validarCampo(campo, valores[campo.key], valores);
    if (msg) erros[campo.key] = msg;
  }
  return erros;
}
