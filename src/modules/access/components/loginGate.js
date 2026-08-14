import { pedirCodigo, confirmarCodigo, entrarComSenha, sairDaConta } from '../state/accessState.js';
import { montarTurnstile, obterTokenTurnstile, removerTurnstile } from '../lib/turnstile.js';
import { renderBotaoOlho, initPasswordToggles } from './passwordToggle.js';
import {
  COOLDOWN_REENVIO_S,
  TAMANHO_CODIGO,
  VALIDADE_CODIGO_MIN,
  SUPORTE_EMAIL,
} from '../config/access.config.js';

// Tela de acesso do editor. Duas etapas visiveis (e-mail, depois codigo) e uma terceira
// escondida atras de um link (senha), porque senha e valvula e nao caminho principal.
//
// REGRA QUE MANDA NESTA TELA: nada aqui pode revelar se um e-mail comprou ou nao. Nao existe
// ramo "sem compra" no caminho do codigo, nao existe mensagem de erro diferente, e o avanco
// para a tela de codigo acontece SEMPRE. Quem pede codigo com um e-mail que nunca comprou ve
// exatamente a mesma tela de quem comprou, e apenas nao recebe e-mail nenhum. A tela de
// login e a porta da frente de um produto pago: se ela responder diferente, ela vira lista
// de clientes para qualquer um com um laco de curl.

export function renderLoginGate() {
  return `
    <div class="min-h-screen flex items-center justify-center px-5">
      <div class="glass-card w-full max-w-sm p-8">
        <h1 class="text-xl font-bold text-white mb-1">MyPortifolio</h1>
        <p class="text-xs text-white/40 mb-6">Entre com o e-mail da sua compra.</p>

        <form id="acesso-form-email">
          <label class="block text-xs text-white/50 mb-2" for="acesso-email">E-mail</label>
          <input
            type="email"
            id="acesso-email"
            name="username"
            required
            autocomplete="username"
            inputmode="email"
            placeholder="voce@email.com"
            class="campo-acesso mb-3"
          />
          <div id="acesso-turnstile" class="mb-3"></div>
          <button type="submit" id="acesso-enviar" class="glass-button w-full rounded-xl px-4 py-2.5 text-sm font-medium">
            Receber codigo
          </button>
          <p id="acesso-erro" class="hidden text-xs text-red-400 mt-3"></p>
          <button type="button" id="acesso-usar-senha" class="w-full text-xs text-white/40 hover:text-white/70 mt-4">
            Entrar com senha
          </button>
        </form>

        <form id="acesso-form-senha" class="hidden">
          <label class="block text-xs text-white/50 mb-2" for="acesso-senha">Senha</label>
          <div class="campo-senha mb-3">
            <input
              type="password"
              id="acesso-senha"
              name="password"
              required
              autocomplete="current-password"
              class="campo-acesso"
            />
            ${renderBotaoOlho('acesso-senha')}
          </div>
          <button type="submit" id="acesso-entrar-senha" class="glass-button w-full rounded-xl px-4 py-2.5 text-sm font-medium">
            Entrar
          </button>
          <p id="acesso-erro-senha" class="hidden text-xs text-red-400 mt-3"></p>
          <button type="button" id="acesso-voltar-codigo" class="w-full text-xs text-white/40 hover:text-white/70 mt-4">
            Voltar para o codigo por e-mail
          </button>
        </form>

        <form id="acesso-form-codigo" class="hidden">
          <p class="text-sm text-white/70 mb-1">
            Se este e-mail tiver uma compra, o codigo chega em instantes.
          </p>
          <p class="text-xs text-white/40 mb-5">
            Enviado para <span id="acesso-email-eco" class="text-white/70"></span>.
            O codigo tem ${TAMANHO_CODIGO} digitos e vale ${VALIDADE_CODIGO_MIN} minutos, e ele
            aparece ja no assunto do e-mail.
          </p>

          <label class="block text-xs text-white/50 mb-2" for="acesso-codigo">Codigo</label>
          <input
            type="text"
            id="acesso-codigo"
            required
            inputmode="numeric"
            autocomplete="one-time-code"
            maxlength="${TAMANHO_CODIGO}"
            pattern="[0-9]{${TAMANHO_CODIGO}}"
            placeholder="000000"
            class="campo-acesso campo-codigo mb-3"
          />
          <button type="submit" id="acesso-confirmar" class="glass-button w-full rounded-xl px-4 py-2.5 text-sm font-medium">
            Entrar
          </button>
          <p id="acesso-erro-codigo" class="hidden text-xs text-red-400 mt-3"></p>

          <button type="button" id="acesso-reenviar" class="w-full text-xs text-white/40 hover:text-white/70 mt-4" disabled>
            Reenviar (<span id="acesso-reenviar-timer">${COOLDOWN_REENVIO_S}</span>s)
          </button>

          <details class="mt-4">
            <summary class="text-xs text-white/40 hover:text-white/70 cursor-pointer list-none">
              Nao recebi o codigo
            </summary>
            <div class="text-xs text-white/50 mt-3 flex flex-col gap-2">
              <p>Confira a caixa de spam e o promocoes. O remetente e acesso@mail.myportifolio.com.br.</p>
              <p>
                <span class="text-white/70">Comprei com outro e-mail.</span>
                O acesso fica no e-mail que pagou. Para passar a entrar com um endereco novo,
                escreva para o suporte a partir do e-mail da compra: e ele que prova a posse.
              </p>
              <p>
                <a href="mailto:${SUPORTE_EMAIL}" class="text-white/70 hover:text-white underline">${SUPORTE_EMAIL}</a>
              </p>
            </div>
          </details>

          <button type="button" id="acesso-outro-email" class="w-full text-xs text-white/40 hover:text-white/70 mt-4">
            Usar outro e-mail
          </button>
        </form>
      </div>
    </div>
  `;
}

export async function initLoginGate({ aoEntrar } = {}) {
  const formEmail = document.querySelector('#acesso-form-email');
  if (!formEmail) return;

  const formCodigo = document.querySelector('#acesso-form-codigo');
  const formSenha = document.querySelector('#acesso-form-senha');
  const inputEmail = document.querySelector('#acesso-email');
  const inputCodigo = document.querySelector('#acesso-codigo');
  const inputSenha = document.querySelector('#acesso-senha');
  const btnEnviar = document.querySelector('#acesso-enviar');
  const btnConfirmar = document.querySelector('#acesso-confirmar');
  const btnReenviar = document.querySelector('#acesso-reenviar');
  const timerReenviar = document.querySelector('#acesso-reenviar-timer');
  const ecoEmail = document.querySelector('#acesso-email-eco');
  const erro = document.querySelector('#acesso-erro');
  const erroCodigo = document.querySelector('#acesso-erro-codigo');
  const erroSenha = document.querySelector('#acesso-erro-senha');

  initPasswordToggles();

  let idTurnstile = null;
  let intervalo = null;

  try {
    idTurnstile = await montarTurnstile(document.querySelector('#acesso-turnstile'));
  } catch {
    // Sem widget nao da para pedir codigo, mas da para entrar com senha. Mostrar isso e
    // melhor do que deixar o botao girando para sempre.
    mostrar(erro, 'Nao consegui carregar a verificacao de seguranca. Recarregue a pagina ou entre com senha.');
    btnEnviar.disabled = true;
  }

  function mostrar(el, msg) {
    el.textContent = msg;
    el.classList.remove('hidden');
  }
  function esconder(el) {
    el.classList.add('hidden');
  }

  function iniciarCooldown() {
    let resta = COOLDOWN_REENVIO_S;
    btnReenviar.disabled = true;
    btnReenviar.innerHTML = `Reenviar (<span id="acesso-reenviar-timer">${resta}</span>s)`;
    clearInterval(intervalo);
    intervalo = setInterval(() => {
      resta -= 1;
      const span = document.querySelector('#acesso-reenviar-timer');
      if (resta <= 0) {
        clearInterval(intervalo);
        btnReenviar.disabled = false;
        btnReenviar.textContent = 'Reenviar codigo';
        return;
      }
      if (span) span.textContent = String(resta);
    }, 1000);
  }

  // Dois tokens, um por chamada: o do request-access-code e o do /auth/v1/otp. Token de
  // Turnstile e de uso unico, entao reaproveitar derrubaria a segunda chamada, que e
  // justamente a que manda o e-mail.
  async function enviarCodigo(email) {
    const tokenFuncao = await obterTokenTurnstile(idTurnstile);
    const tokenCaptcha = await obterTokenTurnstile(idTurnstile);
    await pedirCodigo(email, tokenFuncao, tokenCaptcha);
  }

  formEmail.addEventListener('submit', async (e) => {
    e.preventDefault();
    esconder(erro);
    const email = inputEmail.value.trim().toLowerCase();

    btnEnviar.disabled = true;
    btnEnviar.textContent = 'Enviando...';
    try {
      await enviarCodigo(email);
      // textContent e nao innerHTML: o e-mail veio do campo, e escrever entrada do usuario
      // como HTML numa tela de login e o caminho mais curto para XSS refletido.
      ecoEmail.textContent = email;
      formEmail.classList.add('hidden');
      formCodigo.classList.remove('hidden');
      inputCodigo.focus();
      iniciarCooldown();
    } catch (err) {
      // 429 e a unica recusa que ganha texto proprio, e ela e igual para todo e-mail: ela
      // fala do balde, nunca da existencia da conta.
      if (err.status === 429) {
        const seg = err.retryAfter ? ` Tente de novo em ${Math.ceil(err.retryAfter / 60)} minutos.` : '';
        mostrar(erro, `Muitos pedidos deste endereco.${seg}`);
      } else {
        mostrar(erro, 'Nao consegui enviar agora. Tente de novo em instantes.');
      }
    } finally {
      btnEnviar.disabled = false;
      btnEnviar.textContent = 'Receber codigo';
    }
  });

  btnReenviar.addEventListener('click', async () => {
    esconder(erroCodigo);
    try {
      await enviarCodigo(ecoEmail.textContent);
      iniciarCooldown();
    } catch {
      // silencioso: o cooldown reabilita o botao e ele tenta de novo
      iniciarCooldown();
    }
  });

  formCodigo.addEventListener('submit', async (e) => {
    e.preventDefault();
    esconder(erroCodigo);
    btnConfirmar.disabled = true;
    btnConfirmar.textContent = 'Entrando...';
    try {
      await confirmarCodigo(ecoEmail.textContent, inputCodigo.value);
      if (aoEntrar) await aoEntrar();
      else window.location.reload();
    } catch {
      mostrar(erroCodigo, 'Codigo invalido ou expirado. Peca um novo.');
    } finally {
      btnConfirmar.disabled = false;
      btnConfirmar.textContent = 'Entrar';
    }
  });

  document.querySelector('#acesso-outro-email').addEventListener('click', () => {
    clearInterval(intervalo);
    formCodigo.classList.add('hidden');
    formEmail.classList.remove('hidden');
    inputCodigo.value = '';
    inputEmail.focus();
  });

  document.querySelector('#acesso-usar-senha').addEventListener('click', () => {
    formEmail.classList.add('hidden');
    formSenha.classList.remove('hidden');
    inputSenha.focus();
  });

  document.querySelector('#acesso-voltar-codigo').addEventListener('click', () => {
    formSenha.classList.add('hidden');
    formEmail.classList.remove('hidden');
    inputSenha.value = '';
  });

  formSenha.addEventListener('submit', async (e) => {
    e.preventDefault();
    esconder(erroSenha);
    const email = inputEmail.value.trim().toLowerCase();
    if (!email) {
      mostrar(erroSenha, 'Preencha o e-mail no passo anterior.');
      return;
    }
    try {
      await entrarComSenha(email, inputSenha.value);
      if (aoEntrar) await aoEntrar();
      else window.location.reload();
    } catch {
      mostrar(erroSenha, 'E-mail ou senha invalidos.');
    }
  });

  return () => {
    clearInterval(intervalo);
    if (idTurnstile !== null) removerTurnstile(idTurnstile);
  };
}

// Tela de quem esta logado mas nao tem compra ativa. Ela so aparece DEPOIS de uma sessao
// existir, entao ela nao vaza nada: quem chegou aqui ja provou posse do e-mail.
export function renderSemCompra(email) {
  return `
    <div class="min-h-screen flex items-center justify-center px-5">
      <div class="glass-card w-full max-w-sm p-8 text-center">
        <h1 class="text-xl font-bold text-white mb-3">MyPortifolio</h1>
        <p class="text-sm text-white/60 mb-1">Nao encontramos uma compra ativa nesta conta.</p>
        <p class="text-xs text-white/40 mb-6" id="acesso-sem-compra-email"></p>
        <a href="/comprar" class="glass-button block w-full rounded-xl px-4 py-2.5 text-sm font-medium mb-3">
          Ver o produto
        </a>
        <button type="button" id="acesso-sair" class="w-full text-xs text-white/40 hover:text-white/70">
          Usar outro e-mail
        </button>
      </div>
    </div>
  `;
}

export function initSemCompra(email) {
  const eco = document.querySelector('#acesso-sem-compra-email');
  if (eco) eco.textContent = email || '';
  const btn = document.querySelector('#acesso-sair');
  if (!btn) return;
  btn.addEventListener('click', async () => {
    await sairDaConta();
    window.location.reload();
  });
}
