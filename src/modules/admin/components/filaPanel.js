import { esc } from '../../portfolio/lib/sanitize.js';
import {
  souAdmin,
  filaDePublicacao,
  aprovarPublicacao,
  recusarPublicacao,
  filaDeFacilitacao,
  mudarEstadoSetup,
  ESTADOS_SETUP,
  comprasIncompletas,
  eventosTravados,
} from '../state/filaState.js';

// A tela /app/admin/fila. Zona [browser].
//
// ELA EXISTE PORQUE VENDER SEM ELA E VENDER E NAO ENTREGAR (risco R6). O bump de facilitacao
// e trabalho humano: sem uma lista, o comprador de R$ 490 paga, olha um editor vazio, e nada
// avisa o dono de que existe alguem esperando.
//
// E ela traz no TOPO a fila de primeira publicacao, que resolve outro problema, mais chato:
// qualquer pessoa que comprar pode publicar num endereco do nosso dominio. Sem uma revisao
// antes da primeira publicacao, a defesa contra alguem montar uma pagina de phishing em
// <banco>.myportifolio.com.br e "o dono percebe depois", e "depois" ja e com o dominio na
// lista de bloqueio de navegador (risco R8).
//
// TUDO QUE VEM DO COMPRADOR PASSA POR `esc`. Esta e a unica tela do produto que mostra dado
// de UM cliente para OUTRA pessoa (o dono), e portanto a unica onde um nome de exibicao com
// script dentro atingiria alguem que nao seja quem digitou. A divida conhecida e o `esc`
// morar em modules/portfolio/lib: ele ja e usado pelo Worker e pelas paginas de erro, entao
// na pratica e infraestrutura compartilhada e deveria estar em shared/.

const dt = (v) =>
  v ? new Date(v).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';

// Ha quanto tempo, em dias. E o unico numero que importa numa fila de trabalho humano: um
// estado "em producao" nao diz nada, "em producao ha 9 dias" diz tudo.
function diasDesde(v) {
  if (!v) return null;
  return Math.floor((Date.now() - new Date(v).getTime()) / 86400000);
}

function selo(dias) {
  if (dias === null) return '';
  const cor = dias >= 7 ? 'text-red-300' : dias >= 3 ? 'text-amber-300' : 'text-white/40';
  return `<span class="text-[11px] ${cor}">há ${dias} ${dias === 1 ? 'dia' : 'dias'}</span>`;
}

function bloco(titulo, descricao, id, extra = '') {
  return `
    <section class="glass-card p-6 rounded-2xl flex flex-col gap-4">
      <div class="flex items-start justify-between gap-4">
        <div>
          <h2 class="text-sm font-medium text-white">${titulo}</h2>
          <p class="text-xs text-white/40 mt-1 leading-relaxed">${descricao}</p>
        </div>
        ${extra}
      </div>
      <div id="${id}" class="flex flex-col gap-3">
        <p class="text-xs text-white/30">Carregando...</p>
      </div>
    </section>`;
}

const vazio = (texto) => `<p class="text-xs text-white/30">${texto}</p>`;

// ---------------------------------------------------------------------------
// PRIMEIRA PUBLICACAO
// ---------------------------------------------------------------------------
function linhaPublicacao(r) {
  const p = r.portfolios ?? {};
  const dias = diasDesde(r.requested_at);
  return `
    <div class="rounded-xl border border-white/10 p-4 flex flex-col gap-3" data-review="${esc(r.portfolio_id)}">
      <div class="flex items-start justify-between gap-3">
        <div class="flex flex-col gap-0.5 min-w-0">
          <a href="https://${esc(p.slug ?? '')}.myportifolio.com.br" target="_blank" rel="noopener"
             class="text-sm font-medium text-white hover:underline truncate">${esc(p.slug ?? '(sem endereço)')}</a>
          <span class="text-xs text-white/50 truncate">${esc(p.display_name ?? '')}</span>
          <span class="text-[11px] text-white/30 truncate">${esc(p.owner_email ?? '')}</span>
        </div>
        <div class="flex flex-col items-end gap-0.5 shrink-0">
          <span class="text-[11px] text-white/30">${dt(r.requested_at)}</span>
          ${selo(dias)}
        </div>
      </div>
      <div class="flex flex-wrap gap-2">
        <button type="button" data-acao="aprovar"
          class="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-black hover:bg-white/90 transition">Aprovar</button>
        <button type="button" data-acao="recusar"
          class="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-medium text-white/70 hover:text-white hover:border-white/30 transition">Recusar</button>
        <span class="text-[11px] text-white/30 self-center" data-aviso></span>
      </div>
    </div>`;
}

// ---------------------------------------------------------------------------
// FACILITACAO
// ---------------------------------------------------------------------------
function linhaSetup(r) {
  const dias = diasDesde(r.opened_at);
  const opcoes = ESTADOS_SETUP.map(
    (e) => `<option value="${e}"${e === r.status ? ' selected' : ''}>${e.replace(/_/g, ' ')}</option>`,
  ).join('');
  const zap = r.whatsapp
    ? `<a href="https://wa.me/${esc(String(r.whatsapp).replace(/\D/g, ''))}" target="_blank" rel="noopener"
         class="text-[11px] text-white/40 hover:text-white/80 transition">WhatsApp</a>`
    : '';
  const material = r.material_url
    ? `<a href="${esc(r.material_url)}" target="_blank" rel="noopener"
         class="text-[11px] text-white/40 hover:text-white/80 transition">Material</a>`
    : `<span class="text-[11px] text-white/25">sem material</span>`;
  return `
    <div class="rounded-xl border border-white/10 p-4 flex flex-col gap-3" data-setup="${esc(r.email)}">
      <div class="flex items-start justify-between gap-3">
        <div class="flex flex-col gap-0.5 min-w-0">
          <span class="text-sm font-medium text-white truncate">${esc(r.email)}</span>
          <div class="flex gap-3">${material}${zap}</div>
        </div>
        <div class="flex flex-col items-end gap-0.5 shrink-0">
          <span class="text-[11px] text-white/30">${dt(r.opened_at)}</span>
          ${selo(dias)}
        </div>
      </div>
      ${r.material_notes ? `<p class="text-xs text-white/50 leading-relaxed">${esc(r.material_notes)}</p>` : ''}
      <div class="flex flex-wrap items-center gap-2">
        <select data-estado
          class="rounded-lg bg-black/40 border border-white/15 px-2.5 py-1.5 text-xs text-white/80">${opcoes}</select>
        <span class="text-[11px] text-white/30" data-aviso></span>
      </div>
    </div>`;
}

// ---------------------------------------------------------------------------
// ALARMES
// ---------------------------------------------------------------------------
function linhaIncompleta(r) {
  const flags = [r.has_main && 'main', r.has_custom && 'custom', r.has_setup && 'setup']
    .filter(Boolean)
    .join(', ');
  return `
    <div class="rounded-xl border border-white/10 p-3 flex items-center justify-between gap-3">
      <span class="text-xs text-white/70 truncate">${esc(r.email)}</span>
      <span class="text-[11px] text-white/35 shrink-0">${esc(flags || 'nenhuma flag')} · ${dt(r.created_at)}</span>
    </div>`;
}

function linhaEvento(r) {
  return `
    <div class="rounded-xl border border-white/10 p-3 flex flex-col gap-1">
      <div class="flex items-center justify-between gap-3">
        <span class="text-xs text-white/70 truncate">${esc(r.email ?? '(sem e-mail)')}</span>
        <span class="text-[11px] text-white/35 shrink-0">${r.attempts ?? 0} tentativas · ${dt(r.received_at)}</span>
      </div>
      <code class="text-[11px] text-amber-200/70 break-all">${esc((r.product_ids ?? []).join(', '))}</code>
      ${r.processing_error ? `<span class="text-[11px] text-white/30 break-all">${esc(r.processing_error)}</span>` : ''}
    </div>`;
}

// ---------------------------------------------------------------------------
export function renderFilaPanel() {
  return `
    <main class="max-w-3xl mx-auto px-5 py-12 flex flex-col gap-6">
      <header class="flex flex-col gap-1">
        <a href="/app" class="text-xs text-white/40 hover:text-white/80 transition">MyPortifolio</a>
        <h1 class="text-2xl font-bold tracking-tight text-white">Fila</h1>
      </header>
      <div id="admin-aviso"></div>
      ${bloco(
        'Primeira publicação',
        'Ninguém estreia num endereço nosso sem passar por aqui. Abra o portfólio antes de aprovar: é a única vez que alguém olha o conteúdo.',
        'fila-publicacao',
      )}
      ${bloco(
        'Facilitação',
        'Quem pagou para a gente montar. O tempo de espera ao lado é o que decide a ordem, não o estado.',
        'fila-setup',
      )}
      ${bloco(
        'Compras incompletas',
        'Pagou e ficou sem alguma flag. Quase sempre é evento que não chegou, não fraude.',
        'fila-incompletas',
      )}
      ${bloco(
        'Eventos travados',
        'O webhook recebeu e não reconheceu o produto. O id em destaque é o que precisa entrar em productFlags.ts.',
        'fila-eventos',
      )}
    </main>`;
}

async function pintarLista(id, carregar, linha, textoVazio) {
  const el = document.getElementById(id);
  if (!el) return;
  try {
    const linhas = await carregar();
    el.innerHTML = linhas.length ? linhas.map(linha).join('') : vazio(textoVazio);
  } catch (e) {
    el.innerHTML = `<p class="text-xs text-red-300/70">Não consegui carregar: ${esc(e.message ?? 'erro')}</p>`;
  }
}

export async function initFilaPanel() {
  const aviso = document.getElementById('admin-aviso');

  // A pergunta vem ANTES das consultas. Sem ela, um dono com MFA pendente veria quatro
  // listas vazias e concluiria que nao ha trabalho na fila, que e a leitura errada mais
  // cara possivel nesta tela.
  if (!(await souAdmin())) {
    if (aviso) {
      aviso.innerHTML = `
        <div class="glass-card p-6 rounded-2xl flex flex-col gap-2">
          <p class="text-sm text-white">Esta conta não está autorizada aqui.</p>
          <p class="text-xs text-white/40 leading-relaxed">
            Se você é o dono, confira se o e-mail está em <code class="text-white/60">admin_users</code> e,
            principalmente, se <code class="text-white/60">mfa_confirmado_em</code> já foi preenchido. Enquanto
            ele for nulo, o banco recusa mesmo com o e-mail certo, e as listas vêm vazias em vez de dar erro.
          </p>
        </div>`;
    }
    for (const id of ['fila-publicacao', 'fila-setup', 'fila-incompletas', 'fila-eventos']) {
      const el = document.getElementById(id);
      if (el) el.innerHTML = vazio('Indisponível sem autorização.');
    }
    return;
  }

  const recarregarPublicacao = () =>
    pintarLista('fila-publicacao', filaDePublicacao, linhaPublicacao, 'Nada esperando aprovação.');
  const recarregarSetup = () =>
    pintarLista('fila-setup', filaDeFacilitacao, linhaSetup, 'Ninguém na fila da facilitação.');

  await Promise.all([
    recarregarPublicacao(),
    recarregarSetup(),
    pintarLista('fila-incompletas', comprasIncompletas, linhaIncompleta, 'Nenhuma compra incompleta.'),
    pintarLista('fila-eventos', eventosTravados, linhaEvento, 'Nenhum evento travado.'),
  ]);

  // Delegacao no container, e nao listener por botao: as listas sao repintadas a cada acao,
  // e listener preso ao botao morreria junto com o innerHTML.
  document.getElementById('fila-publicacao')?.addEventListener('click', async (ev) => {
    const botao = ev.target.closest('button[data-acao]');
    if (!botao) return;
    const cartao = botao.closest('[data-review]');
    const id = cartao?.dataset.review;
    const marcador = cartao?.querySelector('[data-aviso]');
    if (!id) return;

    let motivo = null;
    if (botao.dataset.acao === 'recusar') {
      motivo = window.prompt('Motivo da recusa (fica gravado e é o que explica a decisão depois):');
      if (!motivo || !motivo.trim()) return;
    }

    cartao.querySelectorAll('button').forEach((b) => (b.disabled = true));
    if (marcador) marcador.textContent = 'Enviando...';
    try {
      if (motivo === null) await aprovarPublicacao(id);
      else await recusarPublicacao(id, motivo.trim());
      await recarregarPublicacao();
    } catch (e) {
      if (marcador) marcador.textContent = e.message ?? 'não deu';
      cartao.querySelectorAll('button').forEach((b) => (b.disabled = false));
    }
  });

  document.getElementById('fila-setup')?.addEventListener('change', async (ev) => {
    const campo = ev.target.closest('select[data-estado]');
    if (!campo) return;
    const cartao = campo.closest('[data-setup]');
    const email = cartao?.dataset.setup;
    const marcador = cartao?.querySelector('[data-aviso]');
    if (!email) return;

    campo.disabled = true;
    if (marcador) marcador.textContent = 'Salvando...';
    try {
      await mudarEstadoSetup(email, campo.value);
      if (marcador) marcador.textContent = 'salvo';
      campo.disabled = false;
    } catch (e) {
      if (marcador) marcador.textContent = e.message ?? 'não deu';
      // Recarrega em vez de deixar o select mostrando um estado que o banco recusou: campo
      // que mostra uma coisa e banco que guarda outra e como se decide errado na semana
      // seguinte.
      await recarregarSetup();
    }
  });
}
