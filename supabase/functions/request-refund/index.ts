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

  const { data: acesso } = await serv
    .from('member_access')
    .select('main_granted_at')
    .eq('email', email)
    .maybeSingle();

  const concedido = acesso?.main_granted_at ? new Date(acesso.main_granted_at).getTime() : null;
  const dentroDoPrazo =
    concedido !== null && Date.now() - concedido < DIAS_CDC * 24 * 60 * 60 * 1000;

  // ignoreDuplicates: o pedido e um fato datado. Clicar de novo nao pode reescrever a data
  // nem o within_cdc do primeiro pedido, que sao justamente a prova do prazo.
  const { error } = await serv
    .from('refund_requests')
    .upsert(
      { email, reason: motivo, within_cdc: dentroDoPrazo },
      { onConflict: 'email', ignoreDuplicates: true },
    );
  if (error) {
    console.error('falhou registrar reembolso', error.message);
    return json({ error: 'nao-foi-possivel-registrar' }, 500);
  }

  // O portfolio sai do ar no ato do pedido (decisao 9.5). unlive_reason = 'dono' porque a
  // saida foi por vontade de quem manda na pagina, e nao revogacao nossa: se o pedido for
  // desfeito, e o dono quem republica.
  const { data: portfolios } = await serv.from('portfolios').select('id').eq('owner_email', email);
  for (const p of portfolios ?? []) {
    await serv
      .from('portfolio_publications')
      .update({ is_live: false, unlive_reason: 'dono' })
      .eq('portfolio_id', p.id)
      .eq('is_live', true);
  }

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
