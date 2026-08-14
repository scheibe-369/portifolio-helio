// request-refund
//
// Registra o pedido de arrependimento do artigo 49 do CDC e tira o portfolio do ar no ato.
//
// Sob pagamento unico, este e o PRINCIPAL caminho de reembolso do produto, e por isso ele e
// fluxo com registro, e nao um paragrafo no rodape.
//
// POR QUE E EDGE FUNCTION: within_cdc e a PROVA de que o pedido entrou no prazo, e ela e
// congelada no insert justamente porque o atendimento pode levar dias. Prova calculada pelo
// proprio interessado no browser nao e prova, e por isso refund_requests nao tem grant de
// escrita para authenticated. Aqui o servidor recalcula o prazo a partir de
// member_access.main_granted_at e grava o resultado.
//
// main_granted_at e nao granted_at, de proposito: comprar um item adicional depois nao pode
// reabrir um prazo que ja venceu.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';
import { preflight, json } from './cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON = Deno.env.get('SUPABASE_ANON_KEY')!;
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const REMETENTE = Deno.env.get('ACCESS_FROM') ?? 'acesso@mail.myportifolio.com.br';
const EMAIL_DO_DONO = Deno.env.get('OWNER_EMAIL') ?? '';

const DIAS_CDC = 7;

const serv = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false },
  db: { schema: 'myportifolio' },
});

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== 'POST') return json({ error: 'method-not-allowed' }, 405);

  const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!jwt) return json({ error: 'sem-sessao' }, 401);

  let corpo: { reason?: string | null };
  try {
    corpo = await req.json();
  } catch {
    corpo = {};
  }
  const motivo = (corpo.reason ?? '').toString().trim().slice(0, 1000) || null;

  const usuario = createClient(SUPABASE_URL, ANON, {
    auth: { persistSession: false },
    db: { schema: 'myportifolio' },
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });
  const { data: email, error: erroEmail } = await usuario.rpc('current_purchase_email');
  if (erroEmail) return json({ error: 'sessao-invalida' }, 401);
  if (!email) return json({ error: 'sem-compra' }, 403);

  // TUDO PELA RPC, e nao por escrita direta nas tabelas.
  //
  // A versao anterior lia member_access, escrevia em refund_requests e depois tirava as
  // publicacoes do ar, tres acessos diretos com a service role. Nenhum deles funcionava: a
  // service role NAO tem privilegio de tabela neste schema (as migrations fazem
  // `revoke ... from public` e isso tira junto o que ela pegava por heranca). Ou seja, o
  // botao de arrependimento de 7 dias respondia "nao foi possivel registrar" desde sempre, e
  // ninguem tinha visto porque ninguem pediu reembolso ainda.
  //
  // A funcao do banco (0013) faz os tres passos numa transacao so e decide o que e "dentro
  // do prazo", que e regra de negocio e nao pertencia a uma Edge Function.
  const { data: resultado, error } = await serv.rpc('request_refund', {
    p_email: email,
    p_reason: motivo,
  });
  if (error) {
    console.error('falhou registrar reembolso', error.message);
    return json({ error: 'nao-foi-possivel-registrar' }, 500);
  }
  const dentroDoPrazo = Boolean(resultado?.dentroDoPrazo);

  // O estorno em si e manual na Hubla, entao o aviso ao dono nao e cortesia: sem ele, o
  // pedido fica numa tabela que ninguem olha, e o prazo do CDC corre contra nos.
  if (RESEND_API_KEY && EMAIL_DO_DONO) {
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { authorization: `Bearer ${RESEND_API_KEY}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          from: `MyPortifolio <${REMETENTE}>`,
          to: [EMAIL_DO_DONO],
          subject: `Pedido de reembolso: ${email}`,
          html: `<p>${email} pediu reembolso.</p>
                 <p>Dentro do prazo do CDC: <strong>${dentroDoPrazo ? 'sim' : 'nao'}</strong>.</p>
                 <p>Motivo informado: ${motivo ? motivo.replace(/</g, '&lt;') : 'nao informado'}</p>
                 <p>O portfolio ja saiu do ar. O estorno e manual na Hubla, e o member_removed
                 volta pelo webhook e fecha o ciclo.</p>`,
        }),
      });
    } catch (e) {
      console.error('resend falhou', e);
    }
  }

  return json({ status: 'ok', within_cdc: dentroDoPrazo });
});
