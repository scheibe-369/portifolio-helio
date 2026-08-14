import { confirmarTokenDoLink } from '../state/accessState.js';

// Tela de confirmacao de link de e-mail (recovery, magiclink, invite).
//
// ELA EXISTE POR UMA ARMADILHA REAL, JA PAGA EM PRODUCAO NO AI BLOCK: scanner de link de
// e-mail (Gmail, Outlook, antivirus corporativo, prevencao de phishing do proprio provedor)
// abre TODO link do corpo da mensagem antes de o humano clicar. Token de uso unico aberto
// por scanner ja foi consumido, e o comprador legitimo recebe "link invalido" sem nunca ter
// clicado em nada. O suporte que nasce disso e impossivel de diagnosticar pelo relato.
//
// Por isso o verifyOtp NUNCA roda no load da pagina. Ele roda no clique do botao, e so. O
// scanner carrega esta tela, ve um botao, e vai embora sem gastar o token.
const COPIA = {
  recovery: 'Clique no botao abaixo para confirmar e definir uma nova senha.',
  magiclink: 'Clique no botao abaixo para confirmar sua entrada.',
  invite: 'Clique no botao abaixo para confirmar seu acesso.',
  email: 'Clique no botao abaixo para confirmar seu e-mail.',
};

export function renderConfirmGate(tipo) {
  return `
    <div class="min-h-screen flex items-center justify-center px-5">
      <div class="glass-card w-full max-w-sm p-8 text-center">
        <h1 class="text-xl font-bold text-white mb-3">MyPortifolio</h1>
        <p class="text-sm text-white/70 my-4">${COPIA[tipo] ?? COPIA.magiclink}</p>
        <button type="button" id="confirmar-auth" class="glass-button w-full rounded-xl px-4 py-2.5 text-sm font-medium">
          Confirmar
        </button>
        <p id="confirmar-auth-erro" class="hidden text-xs text-red-400 mt-3"></p>
      </div>
    </div>
  `;
}

export function initConfirmGate({ tokenHash, tipo, aoConfirmar }) {
  const btn = document.querySelector('#confirmar-auth');
  const erro = document.querySelector('#confirmar-auth-erro');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    erro.classList.add('hidden');
    btn.disabled = true;
    btn.textContent = 'Confirmando...';
    try {
      await confirmarTokenDoLink(tokenHash, tipo);
      await aoConfirmar();
    } catch {
      erro.textContent = 'Link invalido ou expirado. Peca um novo.';
      erro.classList.remove('hidden');
      btn.disabled = false;
      btn.textContent = 'Confirmar';
    }
  });
}

// Le o token do link SEM consumir nada. O Supabase manda o token de duas formas conforme o
// template: como ?token_hash=...&type=... na query, ou no fragmento (#access_token=...).
// Aqui so interessa a primeira, porque a segunda ja e sessao pronta e nao passa por
// verifyOtp.
export function lerTokenDaUrl(href) {
  const url = new URL(href);
  const tokenHash = url.searchParams.get('token_hash');
  const tipo = url.searchParams.get('type');
  if (!tokenHash || !tipo) return null;
  return { tokenHash, tipo };
}
