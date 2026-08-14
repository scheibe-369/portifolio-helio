// accept-terms
//
// Grava o aceite dos termos em myportifolio.terms_consents.
//
// POR QUE ISTO E UMA EDGE FUNCTION E NAO UMA RPC CHAMADA DO BROWSER: o valor do registro
// esta no IP. O unico IP que serve como prova e o CF-Connecting-IP que o servidor observa;
// um campo "ip" preenchido pelo browser e apenas um texto que o proprio interessado
// escreveu, e um consentimento assim nao sustenta nada no dia em que for questionado.
//
// COMO A IDENTIDADE E RESOLVIDA, e por que em dois clientes:
//   - o cliente do USUARIO (anon key + JWT dele) chama current_purchase_email(), que le
//     auth.uid() e resolve o alias de e-mail divergente. Ele so consegue responder sobre
//     quem esta logado, entao ninguem consegue gravar aceite em nome de outra pessoa.
//   - o cliente de SERVICO escreve a linha, porque terms_consents nao tem grant de insert
//     para authenticated, justamente para o IP nao vir do cliente.
//
// A escrita NAO passa por myportifolio.record_terms_consent porque aquela funcao deriva o
// e-mail de current_purchase_email() por dentro e so tem execute para service_role: chamada
// com a service key, auth.uid() e nulo e ela levanta 'sem compra para este e-mail'. Enquanto
// a assinatura dela nao receber o e-mail por parametro, o insert direto aqui e o caminho que
// funciona, e ele grava exatamente as mesmas colunas, com o mesmo on conflict do nothing.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';
import { preflight, json } from './cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON = Deno.env.get('SUPABASE_ANON_KEY')!;

const serv = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false },
  db: { schema: 'myportifolio' },
});

export function clienteDoUsuario(jwt: string) {
  return createClient(SUPABASE_URL, ANON, {
    auth: { persistSession: false },
    db: { schema: 'myportifolio' },
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });
}

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== 'POST') return json({ error: 'method-not-allowed' }, 405);

  const auth = req.headers.get('Authorization') ?? '';
  const jwt = auth.replace(/^Bearer\s+/i, '');
  if (!jwt) return json({ error: 'sem-sessao' }, 401);

  let corpo: { version?: string };
  try {
    corpo = await req.json();
  } catch {
    return json({ error: 'body-invalido' }, 400);
  }
  const versao = (corpo.version ?? '').trim();
  if (!versao || versao.length > 40) return json({ error: 'versao-invalida' }, 400);

  const usuario = clienteDoUsuario(jwt);
  const { data: email, error: erroEmail } = await usuario.rpc('current_purchase_email');
  if (erroEmail) return json({ error: 'sessao-invalida' }, 401);
  if (!email) return json({ error: 'sem-compra' }, 403);

  const ip = req.headers.get('CF-Connecting-IP') ?? req.headers.get('x-forwarded-for') ?? null;
  const ua = (req.headers.get('user-agent') ?? '').slice(0, 300);

  // on conflict do nothing: o aceite de uma versao e um fato datado, e clicar duas vezes nao
  // pode reescrever a data do primeiro aceite. E pelo mesmo motivo que NUNCA existe update
  // aqui: a prova de que alguem aceitou a versao 1 nao pode ser sobrescrita no dia em que a
  // versao 2 entrar no ar, que e exatamente a pergunta que aparece quando ela e questionada.
  // PELA RPC, e nao por insert direto na tabela.
  //
  // O insert direto estava dando `permission denied for table terms_consents` em producao, e
  // o motivo e o mesmo que ja tinha travado TODA venda no webhook: `service_role` nao herda
  // privilegio de tabela neste schema (as migrations dao `revoke ... from public`, e isso
  // tira junto o que o service_role pegava por heranca). O sintoma e cruel porque a chave
  // parece toda-poderosa e nao e.
  //
  // A funcao certa ja existia desde a 0008, escrita exatamente para este caminho: ela e
  // SECURITY DEFINER (entao roda com o dono do schema), recebe o e-mail por parametro (porque
  // aqui auth.uid() e nulo, a chamada e com service_role) e recusa e-mail sem compra. Chamar
  // ela em vez de escrever na tabela tambem tira uma regra de negocio de dentro da Edge
  // Function e devolve para o banco, que e onde ela e obrigatoria.
  const { error } = await serv.rpc('record_terms_consent', {
    p_email: email,
    p_version: versao,
    p_ip: ip,
    p_user_agent: ua,
  });
  if (error) {
    console.error('falhou gravar consentimento', error.message);
    return json({ error: 'nao-foi-possivel-registrar' }, 500);
  }

  return json({ status: 'ok', terms_version: versao });
});
