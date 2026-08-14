import { esc, safeColor } from '../../portfolio/lib/sanitize.js';
import { resolver } from '../data/fieldSchema.js';
import { parseYoutubeId } from '../../projects/lib/youtube.js';
import { periodoValido, periodoCoerente } from '../../experience/lib/periodoChave.js';

// Os primitivos de formulario do editor. Zona [browser].
//
// Eles existem porque o repositorio NAO tinha nenhuma regra de formulario: global.css e todo
// tema (vidro, brilho metalico, marquee, scrollbar). E eles moram aqui, com CSS proprio em
// editor.css, e nao no global.css, por uma razao verificavel: o global.css e carregado pela
// pagina publica de TODO comprador, e ela nao tem um unico input. Regra de formulario la
// dentro seria CSS baixado por todo visitante de todo tenant para sempre, sem uso.
//
// Sao seis, e nada alem disso na v1: campo, entrada de texto, select, chips, area de arquivo e
// switch. Os tipos 'cor', 'botoes', 'youtube', 'periodo' e 'enquadramento' nao sao primitivos
// novos: sao a entrada de texto e o select com uma casca, e reusam as mesmas classes.

const idDe = (prefixo, key) => `${prefixo}-${key}`;

// Contador de caracteres. Ele nao e enfeite: os limites daqui sao os mesmos CHECK do banco, e
// sem o contador o comprador escreve 2.600 caracteres e leva erro de constraint no salvar.
const contador = (n, max) => (max ? `<span class="ed-contador" data-contador>${n}/${max}</span>` : '');

function moldura(campo, valores, interno, { erro = '' } = {}) {
  const label = esc(resolver(campo.label, valores));
  const help = resolver(campo.help, valores);
  return `
    <div class="ed-field" data-campo="${esc(campo.key)}">
      <label class="ed-label" for="${esc(idDe('ed', campo.key))}">
        ${label}${campo.obrigatorio ? '<span class="ed-req">*</span>' : ''}
        ${campo.feature === 'custom' ? '<span class="ed-lock" data-abrir-bump title="Faz parte da Personalização">Personalização</span>' : ''}
      </label>
      ${interno}
      ${help ? `<p class="ed-help">${esc(help)}</p>` : ''}
      <p class="ed-erro" data-erro>${esc(erro)}</p>
    </div>`;
}

const chip = (texto, i) => `
  <span class="ed-chip">${esc(texto)}<button type="button" class="ed-chip-x" data-chip-remover="${i}" aria-label="Remover ${esc(texto)}">×</button></span>`;

// Render de um campo. `bloqueado` chega true quando o campo e do bump e a conta nao comprou:
// o campo APARECE, com o valor padrao preenchido e um cadeado, porque esconde-lo faria o
// comprador nunca descobrir que a personalizacao existe.
export function renderCampo(campo, valores, { bloqueado = false } = {}) {
  const v = valores[campo.key];
  const id = esc(idDe('ed', campo.key));
  const dis = bloqueado ? ' disabled' : '';
  const max = campo.maxLength;

  switch (campo.tipo) {
    case 'texto':
    case 'periodo':
    case 'youtube': {
      const texto = v == null ? '' : String(v);
      const extra =
        campo.tipo === 'youtube'
          ? '<p class="ed-nota" data-nota-youtube></p>'
          : campo.tipo === 'periodo'
            ? '<p class="ed-nota" data-nota-periodo></p>'
            : '';
      return moldura(
        campo,
        valores,
        `<div class="ed-linha">
           <input id="${id}" class="ed-input" type="text" data-k="${esc(campo.key)}"
                  value="${esc(texto)}"${max ? ` maxlength="${max}"` : ''}${dis}>
           ${contador(texto.length, campo.tipo === 'texto' ? max : 0)}
         </div>${extra}`,
      );
    }

    case 'textarea': {
      const texto = v == null ? '' : String(v);
      return moldura(
        campo,
        valores,
        `<textarea id="${id}" class="ed-textarea" rows="3" data-k="${esc(campo.key)}"${max ? ` maxlength="${max}"` : ''}${dis}>${esc(texto)}</textarea>
         ${contador(texto.length, max)}`,
      );
    }

    case 'select': {
      const opcoes = (campo.opcoes || []).map((o) => (Array.isArray(o) ? o : [o, o]));
      return moldura(
        campo,
        valores,
        `<div class="ed-select-wrap">
           <select id="${id}" class="ed-select" data-k="${esc(campo.key)}"${dis}>
             ${opcoes.map(([val, rot]) => `<option value="${esc(val)}"${String(v) === String(val) ? ' selected' : ''}>${esc(rot)}</option>`).join('')}
           </select>
         </div>`,
      );
    }

    case 'botoes': {
      const opcoes = (campo.opcoes || []).map((o) => (Array.isArray(o) ? o : [o, o]));
      return moldura(
        campo,
        valores,
        `<div class="ed-botoes" role="group">
           ${opcoes
             .map(
               ([val, rot]) =>
                 `<button type="button" class="ed-botao${String(v) === String(val) ? ' is-on' : ''}" data-escolha="${esc(campo.key)}" data-valor="${esc(val)}"${dis}>${esc(rot)}</button>`,
             )
             .join('')}
         </div>`,
      );
    }

    case 'switch': {
      const ligado = Boolean(v);
      return moldura(
        campo,
        valores,
        `<button type="button" id="${id}" class="ed-switch${ligado ? ' is-on' : ''}" role="switch"
                 aria-checked="${ligado}" data-switch="${esc(campo.key)}"${dis}><span class="ed-switch-bolinha"></span></button>`,
      );
    }

    case 'chips': {
      const lista = Array.isArray(v) ? v : [];
      const cheio = campo.maxLinhas && lista.length >= campo.maxLinhas;
      return moldura(
        campo,
        valores,
        `<div class="ed-chips" data-chips="${esc(campo.key)}">
           ${lista.map(chip).join('')}
           <input class="ed-chip-input" type="text" placeholder="${cheio ? 'limite atingido' : 'digite e tecle Enter'}"
                  data-chip-add="${esc(campo.key)}"${max ? ` maxlength="${max}"` : ''}${cheio || bloqueado ? ' disabled' : ''}>
         </div>`,
      );
    }

    case 'linhas': {
      const lista = Array.isArray(v) ? v : [];
      return moldura(
        campo,
        valores,
        `<textarea id="${id}" class="ed-textarea" rows="4" data-linhas="${esc(campo.key)}"${dis}>${esc(lista.join('\n'))}</textarea>
         <span class="ed-contador" data-contador>${lista.length}/${campo.maxLinhas}</span>`,
      );
    }

    case 'pares': {
      const lista = Array.isArray(v) ? v : [];
      const texto = lista.map((p) => [p.label, p.valor, p.extra].filter((x) => x != null && x !== '').join(' | ')).join('\n');
      return moldura(
        campo,
        valores,
        `<textarea id="${id}" class="ed-textarea" rows="4" data-pares="${esc(campo.key)}"${dis}>${esc(texto)}</textarea>
         <span class="ed-contador" data-contador>${lista.length}/${max}</span>`,
      );
    }

    case 'cor': {
      const cor = safeColor(v, campo.padrao);
      return moldura(
        campo,
        valores,
        `<div class="ed-cor">
           <input id="${id}" class="ed-cor-poco" type="color" value="${esc(cor)}" data-cor="${esc(campo.key)}"${dis}>
           <span class="ed-cor-hex" data-cor-hex>${esc(cor)}</span>
         </div>`,
      );
    }

    case 'enquadramento': {
      // O unico controle de enquadramento do produto (o cropper livre foi cortado em 6.1).
      // Ele grava exatamente o que hero_object_position ja modela, e substitui o
      // object-[50%_36%] que estava cravado no heroImage.js e enquadrava o rosto do Helio.
      const y = Number(String(v || '50% 36%').split(' ')[1]?.replace('%', '') || 36);
      return moldura(
        campo,
        valores,
        `<input id="${id}" class="ed-range" type="range" min="0" max="100" value="${y}" data-enquadramento="${esc(campo.key)}"${dis}>`,
      );
    }

    default:
      return '';
  }
}

// Leitura de um valor a partir do elemento que mudou. Devolve `undefined` quando o evento nao
// pertence a nenhum campo, e quem chama ignora.
export function lerMudanca(el, valores) {
  if (el.dataset.k != null) return { key: el.dataset.k, valor: el.value };
  if (el.dataset.linhas != null) {
    return { key: el.dataset.linhas, valor: el.value.split('\n').map((l) => l.trim()).filter(Boolean) };
  }
  if (el.dataset.pares != null) {
    const lista = el.value
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => {
        // Ate tres segmentos: rotulo, texto e link. Um formato so para os dois campos de lista
        // curta (redes e numeros da capa), porque um construtor visual por campo seria o
        // setimo primitivo de um sistema que 6.2 fecha em seis.
        const [label = '', valor = '', extra = ''] = l.split('|').map((s) => s.trim());
        return { label, valor, extra };
      });
    return { key: el.dataset.pares, valor: lista };
  }
  if (el.dataset.cor != null) return { key: el.dataset.cor, valor: el.value };
  if (el.dataset.enquadramento != null) {
    const x = String(valores[el.dataset.enquadramento] || '50% 36%').split(' ')[0];
    return { key: el.dataset.enquadramento, valor: `${x} ${el.value}%` };
  }
  return undefined;
}

// Feedback de campo que tem regra propria. Nao substitui o banco: ele continua sendo quem
// recusa. O que isto evita e o comprador descobrir a regra depois de preencher o formulario.
export function validarCampo(campo, valor, valores) {
  if (campo.obrigatorio && !String(valor ?? '').trim()) return 'preencha este campo';
  if (campo.tipo === 'periodo' && valor && !periodoValido(valor)) return 'use 2024 ou 03/2024';
  if (campo.tipo === 'youtube' && valor) {
    const r = parseYoutubeId(valor);
    if (!r.id) return 'nao reconheci este link do YouTube';
  }
  if (campo.key === 'link' && valor && !/^https:\/\//i.test(String(valor))) return 'o link precisa comecar com https://';
  if (campo.key === 'cta_url' && valor && !/^https:\/\//i.test(String(valor))) return 'o link precisa comecar com https://';
  if (campo.key === 'contact_email' && valor && !/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(String(valor))) return 'e-mail invalido';
  // Mesma pergunta do constraint experiences_ordem_ok, com a MESMA funcao de periodoChave.js.
  // Divergir daqui e exatamente como "03/2024 a 2024" passaria no editor e seria recusado no
  // insert, com o comprador perdendo o que digitou.
  if (campo.key === 'period_end' && valor && valores.period_start && periodoValido(valor)) {
    if (!periodoCoerente(valores.period_start, valor)) return 'o fim vem antes do inicio';
  }
  return '';
}
