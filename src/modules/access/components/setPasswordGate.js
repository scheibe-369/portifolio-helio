import { definirSenha, getAccessState } from '../state/accessState.js';
import { renderBotaoOlho, initPasswordToggles } from './passwordToggle.js';

const MINIMO = 8;

// Senha OPCIONAL, e ela nao e conforto: e a valvula de 5.5 do plano.
//
// O login normal deste produto gasta a cota de e-mail do projeto inteiro, e essa cota e o
// numero maximo de logins por hora de TODA a base. Quem define senha sai desse balde para
// sempre. E o unico caminho de entrada que nao depende do e-mail nem do /auth/v1/otp, ou
// seja, e o que sobra quando a cota estoura, quando alguem enche o balde de um comprador
// especifico, e se o CAPTCHA nativo do Auth nao cobrir o /auth/v1/otp (suposicao S14).
// Sem ela, o unico plano B e esperar a hora virar.
export function renderSetPasswordGate() {
  return `
    <form id="senha-form" class="glass-card p-6 rounded-2xl flex flex-col gap-3">
      <div>
        <h2 class="text-sm font-medium text-white">Definir uma senha</h2>
        <p class="text-xs text-white/40 mt-1">
          Opcional. Com senha voce entra sem esperar o codigo chegar por e-mail.
        </p>
      </div>

      <!--
        Campo de usuario escondido: sem ele o gerenciador de senha do navegador nao sabe a
        QUAL conta a senha nova pertence, e ou nao oferece salvar, ou salva solta. E a
        pratica recomendada em formulario de troca de senha.
      -->
      <input type="email" id="senha-usuario" name="username" autocomplete="username"
             class="hidden" tabindex="-1" aria-hidden="true" />

      <div class="campo-senha">
        <input type="password" id="senha-nova" name="new-password" required minlength="${MINIMO}"
               autocomplete="new-password" placeholder="Nova senha" class="campo-acesso" />
        ${renderBotaoOlho('senha-nova')}
      </div>
      <div class="campo-senha">
        <input type="password" id="senha-confirma" name="confirm-password" required minlength="${MINIMO}"
               autocomplete="new-password" placeholder="Confirmar senha" class="campo-acesso" />
        ${renderBotaoOlho('senha-confirma')}
      </div>

      <button type="submit" id="senha-salvar" class="glass-button rounded-xl px-4 py-2.5 text-sm font-medium">
        Salvar senha
      </button>
      <p id="senha-msg" class="hidden text-xs mt-1"></p>
    </form>
  `;
}

export function initSetPasswordGate() {
  const form = document.querySelector('#senha-form');
  if (!form) return;

  initPasswordToggles();

  const nova = document.querySelector('#senha-nova');
  const confirma = document.querySelector('#senha-confirma');
  const botao = document.querySelector('#senha-salvar');
  const msg = document.querySelector('#senha-msg');
  const usuario = document.querySelector('#senha-usuario');

  const email = getAccessState().email || '';
  if (usuario) usuario.value = email;

  function aviso(texto, ok = false) {
    msg.textContent = texto;
    msg.className = `text-xs mt-1 ${ok ? 'text-emerald-400' : 'text-red-400'}`;
  }

  async function ofereceSalvar(senha) {
    if (!email || !window.PasswordCredential || !navigator.credentials) return;
    try {
      await navigator.credentials.store(
        new window.PasswordCredential({ id: email, password: senha, name: email }),
      );
    } catch {
      // recusado pelo usuario ou bloqueado pelo navegador, nao trava o fluxo
    }
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (nova.value !== confirma.value) return aviso('As senhas nao sao iguais.');
    if (nova.value.length < MINIMO) return aviso(`A senha precisa ter pelo menos ${MINIMO} caracteres.`);

    botao.disabled = true;
    botao.textContent = 'Salvando...';
    try {
      await definirSenha(nova.value);
      await ofereceSalvar(nova.value);
      nova.value = '';
      confirma.value = '';
      aviso('Senha salva. Da proxima vez voce pode entrar direto por ela.', true);
    } catch {
      aviso('Nao foi possivel salvar a senha. Tente de novo.');
    } finally {
      botao.disabled = false;
      botao.textContent = 'Salvar senha';
    }
  });
}
