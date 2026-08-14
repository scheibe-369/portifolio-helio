import { supabase, SUPABASE_URL, SUPABASE_ANON } from './client.js';

// Chamada de Edge Function por fetch cru, e nao por supabase.functions.invoke().
//
// O motivo e diagnostico: o invoke() engole o corpo da resposta quando o status nao e 2xx e
// devolve sempre "Failed to send a request to the Edge Function", que e a mesma mensagem
// para preflight recusado, 403 de captcha e 429 de rate limit. Como aqui o corpo de erro
// carrega retry_after e o motivo, ler o JSON de verdade e o que separa meia hora de
// depuracao de uma mensagem util na tela.
export async function chamarFuncao(nome, corpo) {
  // Se ja existe sessao, manda o token dela: as funcoes que gravam em nome do titular
  // (accept-terms) precisam do JWT para o banco resolver current_purchase_email(). Sem
  // sessao, a anon key basta, porque quem pede codigo ainda nao esta logado.
  const { data } = await supabase.auth.getSession();
  const jwt = data?.session?.access_token || SUPABASE_ANON;

  const resposta = await fetch(`${SUPABASE_URL}/functions/v1/${nome}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      apikey: SUPABASE_ANON,
      authorization: `Bearer ${jwt}`,
    },
    body: JSON.stringify(corpo),
  });

  let json = null;
  try {
    json = await resposta.json();
  } catch {
    // funcao caiu antes de escrever corpo: o status ainda diz algo
  }
  return { ok: resposta.ok, status: resposta.status, json };
}
