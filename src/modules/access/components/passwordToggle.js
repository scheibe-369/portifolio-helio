// Botao de mostrar/esconder senha. Compartilhado pela tela de entrar com senha e pela de
// definir senha, para as duas se comportarem igual.
//
// A senha comeca SEMPRE escondida: o input nasce type="password" no HTML e so vira "text"
// depois de um clique explicito. Nada de revelar por padrao.
//
// Portado do AI Block sem mudanca de comportamento. Ele fica no repositorio mesmo com o
// login sendo por codigo porque a senha e a valvula de 5.5: e o unico caminho de entrada que
// nao passa pela cota de e-mail nem pelo /auth/v1/otp.

const OLHO_ABERTO =
  '<path d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12s-3.5 6.5-9.5 6.5S2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/>';
const OLHO_FECHADO =
  '<path d="M2.5 12s3.5-6.5 9.5-6.5c1.7 0 3.2.5 4.5 1.2"/><path d="M19.5 9.3c1.3 1.4 2 2.7 2 2.7s-3.5 6.5-9.5 6.5c-1.4 0-2.7-.3-3.8-.8"/><path d="m4 4 16 16"/>';

function svg(interno) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" width="17" height="17" aria-hidden="true">${interno}</svg>`;
}

export function renderBotaoOlho(idInput) {
  return `
    <button
      type="button"
      class="botao-olho"
      data-toggle-senha="${idInput}"
      aria-label="Mostrar senha"
      aria-pressed="false"
      title="Mostrar senha"
    >${svg(OLHO_ABERTO)}</button>
  `;
}

export function initPasswordToggles() {
  document.querySelectorAll('[data-toggle-senha]').forEach((botao) => {
    botao.addEventListener('click', () => {
      const input = document.getElementById(botao.dataset.toggleSenha);
      if (!input) return;

      const vaiMostrar = input.type === 'password';
      input.type = vaiMostrar ? 'text' : 'password';
      botao.innerHTML = svg(vaiMostrar ? OLHO_FECHADO : OLHO_ABERTO);
      botao.setAttribute('aria-label', vaiMostrar ? 'Esconder senha' : 'Mostrar senha');
      botao.setAttribute('title', vaiMostrar ? 'Esconder senha' : 'Mostrar senha');
      botao.setAttribute('aria-pressed', String(vaiMostrar));

      // Devolve o foco ao campo, no fim do texto, para quem estava digitando nao perder o
      // lugar ao conferir a senha.
      const fim = input.value.length;
      input.focus();
      try {
        input.setSelectionRange(fim, fim);
      } catch {
        // alguns tipos de input nao aceitam setSelectionRange, e nao vale quebrar o clique
      }
    });
  });
}
