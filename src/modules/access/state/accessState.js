import { supabase } from '../../../shared/supabase/client.js';
import { chamarFuncao } from '../../../shared/supabase/edgeFn.js';
import { FN_PEDIR_CODIGO } from '../config/access.config.js';

// Estado de acesso do editor. Portado do modulo homonimo do AI Block, com a senha trocada
// por codigo de 6 digitos (OTP) e a senha mantida como VALVULA, nao como caminho principal:
// quem define senha deixa de consumir a cota de e-mail do projeto para sempre, e essa cota e
// o teto de logins por hora do produto inteiro (5.5 do plano).

const SEM_ACESSO = { has_main: false, has_custom: false, has_setup: false };

let estado = {
  status: 'anon', // 'anon' | 'no-purchase' | 'active' | 'admin'
  email: null,
  userId: null,
  acesso: { ...SEM_ACESSO },
  mainGrantedAt: null,
};

export function getAccessState() {
  return estado;
}

async function carregarAcesso(session) {
  if (!session) {
    estado = { status: 'anon', email: null, userId: null, acesso: { ...SEM_ACESSO }, mainGrantedAt: null };
    return;
  }

  const email = session.user.email;
  const userId = session.user.id;

  const { data: ehAdmin, error: erroAdmin } = await supabase.rpc('is_admin');
  if (erroAdmin) console.error('falhou is_admin', erroAdmin);
  if (ehAdmin) {
    estado = {
      status: 'admin',
      email,
      userId,
      acesso: { has_main: true, has_custom: true, has_setup: true },
      mainGrantedAt: null,
    };
    return;
  }

  // SEM .eq('email', ...) de proposito. A policy ja filtra por current_purchase_email(), que
  // resolve o alias de e-mail divergente (5.6): quem comprou com A e loga com B tem que ver
  // a linha de A. Filtrar pelo e-mail da sessao aqui devolveria zero linha justamente para
  // quem vinculou um login novo, e o comprador legitimo cairia em "sem compra".
  const { data, error } = await supabase
    .from('member_access')
    .select('has_main, has_custom, has_setup, blocked, main_granted_at')
    .limit(1)
    .maybeSingle();
  if (error) console.error('falhou member_access', error);

  const linha = data ?? null;
  const ativo = Boolean(linha?.has_main && !linha?.blocked);
  estado = {
    status: ativo ? 'active' : 'no-purchase',
    email,
    userId,
    acesso: linha
      ? { has_main: linha.has_main, has_custom: linha.has_custom, has_setup: linha.has_setup }
      : { ...SEM_ACESSO },
    mainGrantedAt: linha?.main_granted_at ?? null,
  };
}

// Nao assina onAuthStateChange de proposito: toda transicao de auth deste produto termina em
// reload ou em uma chamada nova de initAccess(). Uma assinatura reativa aqui duplicaria a
// chamada de is_admin em paralelo e gerava "Failed to fetch" quando a segunda era abortada
// pelo reload. E a mesma decisao ja paga no AI Block.
export async function initAccess() {
  const { data: { session } } = await supabase.auth.getSession();
  await carregarAcesso(session);
  return estado;
}

// ---------------------------------------------------------------- codigo de acesso (OTP)

// Pedir codigo sao DUAS chamadas, e as duas sao obrigatorias:
//
// 1. request-access-code, que valida o Turnstile no servidor, consome o rate limit em
//    myportifolio.consume_access_quota e garante a conta de quem tem compra. Ela responde
//    SEMPRE a mesma coisa, tenha o e-mail compra ou nao.
// 2. signInWithOtp, que e quem de fato manda o e-mail. Ele bate no /auth/v1/otp do Supabase
//    com a anon key, que e PUBLICA, entao Turnstile so na Edge Function nao protege nada:
//    o atacante nunca chamaria a nossa function, ele bateria direto aqui (achado 1 da
//    verificacao 1). Quem protege este endpoint e o CAPTCHA NATIVO do Auth, ligado na
//    configuracao do projeto, e e por isso que o captchaToken vai aqui embaixo.
//
// Os dois tokens de Turnstile sao DIFERENTES: token de Turnstile e de uso unico.
export async function pedirCodigo(email, tokenFuncao, tokenCaptcha) {
  const alvo = email.trim().toLowerCase();

  const r = await chamarFuncao(FN_PEDIR_CODIGO, { email: alvo, turnstileToken: tokenFuncao });
  if (!r.ok) {
    const erro = new Error(r.json?.error || 'nao-foi-possivel');
    erro.status = r.status;
    erro.retryAfter = r.json?.retry_after ?? null;
    throw erro;
  }

  // shouldCreateUser: false porque signup publico esta desligado no projeto. Quem nao
  // comprou nao ganha conta batendo aqui, e a mensagem de erro nao volta para a tela: o
  // front avanca para a tela de codigo do mesmo jeito, senao o erro daqui vira o oraculo
  // que a resposta uniforme da function existe para fechar.
  const { error } = await supabase.auth.signInWithOtp({
    email: alvo,
    options: { shouldCreateUser: false, captchaToken: tokenCaptcha },
  });
  if (error) console.warn('signInWithOtp recusou (a tela segue igual, de proposito)', error.message);

  return { status: 'ok' };
}

// Troca o codigo de 6 digitos por sessao. type 'email' e o que o Supabase usa para o OTP de
// magic link com {{ .Token }}.
export async function confirmarCodigo(email, codigo) {
  const { error } = await supabase.auth.verifyOtp({
    email: email.trim().toLowerCase(),
    token: codigo.trim(),
    type: 'email',
  });
  if (error) throw error;
}

// Troca o token_hash de um link de e-mail por sessao, por POST direto, sem hash de URL.
//
// ARMADILHA JA PAGA NO AI BLOCK, e e por isso que esta funcao existe separada: scanner de
// link de e-mail (Gmail, Outlook, antivirus corporativo) ABRE o link antes do humano, e o
// token e de uso unico. Se a confirmacao rodasse no load da pagina, o scanner consumiria o
// token e o comprador legitimo receberia "link invalido" sem nunca ter clicado. Por isso
// esta funcao SO e chamada no clique explicito do botao da tela de confirmacao.
export async function confirmarTokenDoLink(tokenHash, tipo) {
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: tipo });
  if (error) throw error;
}

// ------------------------------------------------------------------- senha, que e valvula

export async function entrarComSenha(email, senha) {
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password: senha,
  });
  if (error) throw error;
}

export async function definirSenha(senha) {
  const { error } = await supabase.auth.updateUser({ password: senha });
  if (error) throw error;
}

export async function sairDaConta() {
  await supabase.auth.signOut();
}
