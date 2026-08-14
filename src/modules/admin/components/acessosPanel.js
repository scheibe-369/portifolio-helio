import { esc } from '../../portfolio/lib/sanitize.js';
import { listarAcessos, concederAcesso, revogarAcesso } from '../state/adminState.js';

// A tela /app/admin/acessos. Zona [browser].
//
// E ela que transforma "conceder acesso" de um UPDATE no banco em uma operacao do produto.
// Ate agora, liberar alguem exigia SQL na mao, o que quer dizer que so quem tem a credencial
// de dono do banco conseguia vender uma cortesia, atender um reembolso mal resolvido ou
// liberar um comprador cujo webhook falhou.
//
// A ORIGEM E SEMPRE 'cortesia', E ISSO NAO E ESCOLHA DA TELA. O banco fixa. 'hubla' significa
// "existe uma venda no extrato que explica esta linha", e e sobre isso que a conciliacao
// pergunta toda semana. Um botao que deixasse escolher a origem permitiria que uma concessao
// manual se disfarcasse de venda, que e exatamente o rastro que a conciliacao existe para
// achar.
//
// TUDO QUE VEM DE FORA PASSA POR `esc`: esta e uma das duas telas que mostram dado de um
// cliente para outra pessoa (o dono).

const dt = (v) =>
  v ? new Date(v).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '';

function selo(texto, ligado) {
  const cor = ligado ? 'bg-white/15 text-white' : 'bg-white/5 text-white/30';
  return `<span class="rounded-md px-1.5 py-0.5 text-[10px] font-medium ${cor}">${texto}</span>`;
}

function linha(r) {
  const estado = r.blocked
    ? '<span class="text-[11px] text-red-300">bloqueado</span>'
    : r.has_main || r.has_custom || r.has_setup
    ? ''
    : '<span class="text-[11px] text-white/30">revogado</span>';

  const endereco = r.slug
    ? `<a href="https://${esc(r.slug)}.myportifolio.com.br" target="_blank" rel="noopener"
         class="text-[11px] text-white/40 hover:text-white/80 transition">${esc(r.slug)}${r.publicado ? '' : ' (rascunho)'}</a>`
    : '<span class="text-[11px] text-white/25">sem portfólio</span>';

  return `
    <div class="rounded-xl border border-white/10 p-4 flex flex-col gap-2" data-acesso="${esc(r.email)}">
      <div class="flex items-start justify-between gap-3">
        <div class="flex flex-col gap-1 min-w-0">
          <span class="text-sm font-medium text-white truncate">${esc(r.email)}</span>
          <div class="flex flex-wrap items-center gap-1.5">
            ${selo('principal', r.has_main)}
            ${selo('personalização', r.has_custom)}
            ${selo('facilitação', r.has_setup)}
            ${estado}
          </div>
          <div class="flex flex-wrap gap-3">
            ${endereco}
            <span class="text-[11px] text-white/25">${esc(r.source)} · ${dt(r.granted_at)}</span>
            ${r.tem_login ? '' : '<span class="text-[11px] text-amber-300/70">ainda não entrou</span>'}
          </div>
        </div>
        <button type="button" data-revogar
          class="shrink-0 rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white/60 hover:text-white hover:border-white/30 transition">
          Revogar
        </button>
      </div>
      <span class="text-[11px] text-white/30" data-aviso></span>
    </div>`;
}

export function renderAcessosPanel() {
  return `
    <main class="max-w-3xl mx-auto px-5 py-12 flex flex-col gap-6">
      <header class="flex items-center justify-between gap-4">
        <div class="flex flex-col gap-1">
          <a href="/app" class="text-xs text-white/40 hover:text-white/80 transition">MyPortifolio</a>
          <h1 class="text-2xl font-bold tracking-tight text-white">Acessos</h1>
        </div>
        <a href="/app/admin/fila" class="text-xs text-white/40 hover:text-white/80 transition">Fila</a>
      </header>

      <section class="glass-card p-6 rounded-2xl flex flex-col gap-4">
        <div>
          <h2 class="text-sm font-medium text-white">Liberar alguém</h2>
          <p class="text-xs text-white/40 mt-1 leading-relaxed">
            A pessoa entra em <code class="text-white/60">myportifolio.com.br/app</code> com este
            e-mail e recebe o código. A conta nasce na primeira entrada, você não precisa criar nada
            antes. Toda liberação daqui é gravada como cortesia, com o seu nome e o motivo.
          </p>
        </div>
        <input type="email" id="ac-email" placeholder="email@exemplo.com" class="campo-acesso" />
        <div class="flex flex-wrap gap-4">
          <label class="flex items-center gap-2 text-xs text-white/70">
            <input type="checkbox" id="ac-main" checked class="accent-white" /> Principal
          </label>
          <label class="flex items-center gap-2 text-xs text-white/70">
            <input type="checkbox" id="ac-custom" class="accent-white" /> Personalização
          </label>
          <label class="flex items-center gap-2 text-xs text-white/70">
            <input type="checkbox" id="ac-setup" class="accent-white" /> Facilitação
          </label>
        </div>
        <input type="text" id="ac-motivo" placeholder="Motivo (fica no registro)" class="campo-acesso" />
        <button type="button" id="ac-conceder"
          class="glass-button w-full rounded-xl px-4 py-2.5 text-sm font-medium">Liberar</button>
        <p id="ac-erro" class="hidden text-xs text-red-400"></p>
      </section>

      <section class="glass-card p-6 rounded-2xl flex flex-col gap-4">
        <div class="flex items-center justify-between gap-3">
          <h2 class="text-sm font-medium text-white">Quem tem acesso</h2>
          <input type="search" id="ac-busca" placeholder="filtrar por e-mail"
            class="rounded-lg bg-black/40 border border-white/15 px-2.5 py-1.5 text-xs text-white/80" />
        </div>
        <div id="ac-lista" class="flex flex-col gap-3">
          <p class="text-xs text-white/30">Carregando...</p>
        </div>
      </section>
    </main>`;
}

export async function initAcessosPanel() {
  const lista = document.getElementById('ac-lista');
  const erro = (msg) => {
    const el = document.getElementById('ac-erro');
    if (!el) return;
    el.textContent = msg;
    el.classList.toggle('hidden', !msg);
  };

  async function recarregar(busca) {
    if (!lista) return;
    try {
      const linhas = await listarAcessos(busca);
      lista.innerHTML = linhas.length
        ? linhas.map(linha).join('')
        : '<p class="text-xs text-white/30">Ninguém por aqui ainda.</p>';
    } catch (e) {
      lista.innerHTML = `<p class="text-xs text-red-300/70">Não consegui carregar: ${esc(e.message ?? 'erro')}</p>`;
    }
  }
  await recarregar();

  document.getElementById('ac-conceder')?.addEventListener('click', async (ev) => {
    const botao = ev.currentTarget;
    const email = (document.getElementById('ac-email')?.value ?? '').trim().toLowerCase();
    const main = document.getElementById('ac-main')?.checked;
    const custom = document.getElementById('ac-custom')?.checked;
    const setup = document.getElementById('ac-setup')?.checked;
    const motivo = (document.getElementById('ac-motivo')?.value ?? '').trim();

    if (!email) return erro('Digite o e-mail.');
    if (!main && !custom && !setup) return erro('Escolha pelo menos um acesso.');

    botao.disabled = true;
    erro('');
    try {
      await concederAcesso({ email, main, custom, setup, motivo });
      document.getElementById('ac-email').value = '';
      document.getElementById('ac-motivo').value = '';
      await recarregar(document.getElementById('ac-busca')?.value);
    } catch (e) {
      erro(e.message ?? 'não deu');
    }
    botao.disabled = false;
  });

  // Delegacao: a lista e repintada a cada acao, e listener preso ao botao morreria com ela.
  lista?.addEventListener('click', async (ev) => {
    const botao = ev.target.closest('button[data-revogar]');
    if (!botao) return;
    const cartao = botao.closest('[data-acesso]');
    const email = cartao?.dataset.acesso;
    const marcador = cartao?.querySelector('[data-aviso]');
    if (!email) return;

    // Revogar tira acesso de quem pode ter pago. A confirmacao pede o motivo no mesmo passo,
    // porque motivo escrito e o que responde a reclamacao que chega tres semanas depois.
    const motivo = window.prompt(`Revogar o acesso de ${email}. Motivo:`);
    if (!motivo || !motivo.trim()) return;

    botao.disabled = true;
    if (marcador) marcador.textContent = 'Revogando...';
    try {
      await revogarAcesso({ email, motivo: motivo.trim() });
      await recarregar(document.getElementById('ac-busca')?.value);
    } catch (e) {
      if (marcador) marcador.textContent = e.message ?? 'não deu';
      botao.disabled = false;
    }
  });

  let t = null;
  document.getElementById('ac-busca')?.addEventListener('input', (ev) => {
    clearTimeout(t);
    const v = ev.target.value;
    t = setTimeout(() => recarregar(v), 250);
  });
}
