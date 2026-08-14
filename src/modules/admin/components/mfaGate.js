import { adminStatus, iniciarCadastroMfa, confirmarCadastroMfa } from '../state/adminState.js';

// O portao da area de admin, e a tela OPCIONAL de cadastro do app autenticador. Zona
// [browser].
//
// O SEGUNDO FATOR NAO E EXIGIDO (migration 0012, decisao do dono, tomada depois de o custo
// ser dito): o codigo por e-mail e a protecao do produto inteiro, admin incluido. A unica
// pergunta que este portao faz e se o e-mail esta em admin_users, e quem responde de verdade
// e o banco, porque toda funcao admin_* comeca com `if not is_admin() then raise`. Este
// arquivo so decide QUAL TELA pintar.
//
// POR QUE A TELA DE CADASTRO CONTINUA AQUI, sem ninguem ser mandado para ela: porque a porta
// de volta custa quase nada enquanto existir, e custaria caro para reescrever no dia em que
// houver um segundo administrador (ou uma conta que nao seja a do dono). Ela vive em
// /app/admin/mfa, e quem cadastrar tem o fator carimbado em mfa_confirmado_em. Voltar a
// EXIGIR e trocar is_admin() pela versao da migration 0011, sem mexer em mais nada.
//
// O que saiu junto com a exigencia foi a tela de desafio: cobrar o codigo do app de quem
// cadastrou por conta propria seria transformar a escolha dele em punicao.

function moldura(conteudo) {
  return `
    <main class="max-w-md mx-auto px-5 py-14">
      <div class="glass-card rounded-3xl p-7 flex flex-col gap-4">
        <a href="/app" class="text-xs text-white/40 hover:text-white/80 transition">MyPortifolio</a>
        ${conteudo}
      </div>
    </main>`;
}

export function renderMfaNaoAutorizado(email) {
  return moldura(`
    <h1 class="text-xl font-bold text-white">Esta conta não é de administrador</h1>
    <p class="text-sm text-white/50 leading-relaxed">
      Você entrou como <span class="text-white/80">${email ?? 'desconhecido'}</span>, e este e-mail
      não está na lista de administradores. Se deveria estar, ele precisa ser adicionado direto
      na tabela <code class="text-white/60">admin_users</code>.
    </p>
    <a href="/app" class="ed-link text-sm">Voltar ao editor</a>`);
}

export function renderMfaCadastro() {
  return moldura(`
    <h1 class="text-xl font-bold text-white">Proteja a conta de administrador</h1>
    <p class="text-sm text-white/50 leading-relaxed">
      A área de administração pede um segundo fator. Escaneie o código abaixo num app
      autenticador (Google Authenticator, 1Password, Authy) e digite o número que ele mostrar.
    </p>
    <div id="mfa-qr" class="flex items-center justify-center rounded-2xl bg-white p-4 min-h-[220px]">
      <span class="text-xs text-black/40">Gerando...</span>
    </div>
    <details class="text-xs text-white/40">
      <summary class="cursor-pointer hover:text-white/70">Não consigo escanear</summary>
      <p class="mt-2 leading-relaxed">
        Digite esta chave no app, escolhendo a opção de inserir manualmente:
        <code id="mfa-segredo" class="block mt-1 break-all text-white/70"></code>
      </p>
    </details>
    <label class="block text-xs text-white/50" for="mfa-codigo">Código do app</label>
    <input type="text" id="mfa-codigo" inputmode="numeric" autocomplete="one-time-code"
      maxlength="6" pattern="[0-9]{6}" placeholder="000000" class="campo-acesso campo-codigo" />
    <button type="button" id="mfa-confirmar"
      class="glass-button w-full rounded-xl px-4 py-2.5 text-sm font-medium">Confirmar</button>
    <p id="mfa-erro" class="hidden text-xs text-red-400"></p>`);
}

// Decide se a area de admin abre.
//
// O SEGUNDO FATOR NAO E MAIS EXIGIDO (migration 0012, decisao do dono). A unica pergunta e
// se o e-mail esta em admin_users, e quem responde de verdade e o banco: toda funcao admin_*
// comeca com `if not is_admin() then raise`. Este ramo so decide QUAL TELA pintar.
//
// O cadastro do app continua existindo e continua funcionando, em /app/admin/mfa. Ele virou
// opcional em vez de obrigatorio, e por isso a tela de desafio saiu do caminho: cobrar o
// codigo de quem cadastrou por conta propria seria transformar a escolha dele em punicao.
export async function estadoDoAdmin() {
  const st = await adminStatus();
  if (!st?.naListaDeAdmin) return { tela: 'nao-autorizado', email: st?.email };
  return { tela: 'ok', email: st.email, temSegundoFator: st.temSegundoFator };
}

function ligarErro() {
  const el = document.getElementById('mfa-erro');
  return (msg) => {
    if (!el) return;
    el.textContent = msg;
    el.classList.toggle('hidden', !msg);
  };
}

export async function initMfaCadastro({ aoConcluir }) {
  const erro = ligarErro();
  const alvo = document.getElementById('mfa-qr');
  let fatorId = null;

  try {
    const { fatorId: id, qr, segredo } = await iniciarCadastroMfa();
    fatorId = id;
    // O qr_code vem do Supabase como SVG em data URI. Ele entra como <img> e nao por
    // innerHTML: SVG colado direto no documento executa script, e o que se ganha com isso e
    // nada.
    if (alvo) alvo.innerHTML = qr ? `<img src="${qr}" alt="QR do segundo fator" class="w-full max-w-[220px]" />` : '';
    const elSeg = document.getElementById('mfa-segredo');
    if (elSeg) elSeg.textContent = segredo ?? '';
  } catch (e) {
    erro(e.message ?? 'nao consegui gerar o codigo');
    return;
  }

  document.getElementById('mfa-confirmar')?.addEventListener('click', async (ev) => {
    const botao = ev.currentTarget;
    const codigo = (document.getElementById('mfa-codigo')?.value ?? '').replace(/\D/g, '');
    if (codigo.length < 6) return erro('Digite os 6 dígitos do app.');
    botao.disabled = true;
    erro('');
    try {
      await confirmarCadastroMfa(fatorId, codigo);
      await aoConcluir();
    } catch (e) {
      // O erro do Supabase aqui e quase sempre relogio do celular fora de hora, e dizer isso
      // economiza a hora que a pessoa passaria achando que digitou errado.
      erro(`${e.message ?? 'codigo recusado'}. Se persistir, confira se a hora do celular está automática.`);
      botao.disabled = false;
    }
  });
}
