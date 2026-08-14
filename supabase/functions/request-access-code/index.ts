// request-access-code
//
// Decide se um pedido de codigo de acesso pode seguir. Ela NAO manda o e-mail: quem manda e
// o /auth/v1/otp do Supabase, chamado pelo browser logo depois desta resposta. Por isso o
// CAPTCHA nativo do Auth e obrigatorio no projeto, e nao redundancia do Turnstile daqui: sem
// ele, o atacante pula esta function inteira e bate direto no endpoint que gasta a cota de
// e-mail (achado 1 da verificacao 1). Esta function protege o oraculo e a criacao de conta.
//
// A REGRA QUE MANDA AQUI: a resposta e SEMPRE a mesma, em corpo, em status e em tempo, tenha
// o e-mail comprado ou nao. Como conta so existe para quem comprou (signup publico
// desligado), qualquer diferenca transforma este endpoint em lista de clientes.
//
// Quatro camadas, todas obrigatorias (5.4 do plano):
//   (a) Turnstile validado AQUI, com o secret que nunca vai para o browser.
//   (b) Rate limit no Postgres por IP e por e-mail, mais um teto global que ALARMA e ATRASA,
//       nunca recusa: recusa dura no escopo global derruba o login de toda a base, que e o
//       oposto do que este rate limit existe para proteger.
//   (c) Resposta uniforme.
//   (d) CORS com OPTIONS 204.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';
import { preflight, json } from './cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const TURNSTILE_SECRET = Deno.env.get('TURNSTILE_SECRET_KEY')!;
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const REMETENTE = Deno.env.get('ACCESS_FROM') ?? 'acesso@mail.myportifolio.com.br';
const APEX = Deno.env.get('APEX_HOST') ?? 'myportifolio.com.br';
const EMAIL_DO_DONO = Deno.env.get('OWNER_EMAIL') ?? '';

// Tetos por hora. Os numeros e a FORMA de cada um sao decisao do plano, nao afinacao:
//   por IP e por e-mail recusam com 429;
//   o global NUNCA recusa, ele alarma e atrasa, e fica ABAIXO de rate_limit_email_sent
//   (100) de proposito, para o alarme tocar antes de o Supabase recusar.
const TETO_IP = 20;
const TETO_EMAIL = 20;
const TETO_GLOBAL = 80;
const ATRASO_GLOBAL_MS = 4000;

// Piso de tempo de resposta. Sem ele, o ramo "tem compra" (que faz select e createUser) leva
// visivelmente mais tempo que o ramo "nao tem", e o cronometro vira o oraculo que o corpo
// uniforme fechou. O criterio de pronto do plano compara os dois tempos arredondados a
// 100 ms.
const PISO_RESPOSTA_MS = 700;

const RESPOSTA_UNIFORME = {
  status: 'ok',
  message: 'Se este e-mail tiver uma compra, o codigo chega em instantes.',
};

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false },
  // Todo objeto do MyPortifolio vive em myportifolio, nunca em public: o projeto e
  // compartilhado com o AI Block, que tem funcoes de assinatura identica em public.
  db: { schema: 'myportifolio' },
});

const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

async function turnstileValido(token: string, ip: string): Promise<boolean> {
  const corpo = new FormData();
  corpo.append('secret', TURNSTILE_SECRET);
  corpo.append('response', token);
  if (ip) corpo.append('remoteip', ip);
  try {
    const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: corpo,
    });
    const j = await r.json();
    return j.success === true;
  } catch {
    // Falha de rede na verificacao NAO pode virar passe livre: sem prova, nao passa.
    return false;
  }
}

// Devolve true quando ainda ha cota. A funcao do banco so responde "passou do teto?", e a
// decisao do que fazer com o false e de quem chama, porque ela e diferente por escopo.
async function temCota(scope: string, key: string, limite: number): Promise<boolean> {
  const { data, error } = await admin.rpc('consume_access_quota', {
    p_scope: scope,
    p_key: key,
    p_limit: limite,
  });
  if (error) {
    // Rate limit indisponivel nao pode derrubar o login de quem pagou. Falha aberta de
    // proposito, com registro: as outras camadas (Turnstile e CAPTCHA nativo) continuam de
    // pe, e o custo de recusar todo mundo e maior que o de deixar passar por um instante.
    console.error('consume_access_quota falhou', scope, error.message);
    return true;
  }
  return data === true;
}

async function enviarEmail(para: string, assunto: string, html: string) {
  if (!RESEND_API_KEY) return;
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${RESEND_API_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify({ from: `MyPortifolio <${REMETENTE}>`, to: [para], subject: assunto, html }),
    });
  } catch (e) {
    console.error('resend falhou', e);
  }
}

// DESBLOQUEIO POR POSSE. O balde por e-mail e incrementado ANTES de saber se o e-mail tem
// compra, o que esta certo contra o oraculo e tem um efeito colateral obvio: um cron de 30
// chamadas mantem um comprador legitimo permanentemente fora da propria conta. A saida e
// mandar UM link direto para o proprio e-mail, que e exatamente o que o atacante nao le.
// Uma vez por janela, para nao virar o proprio dreno de cota que este arquivo evita.
async function mandarLinkDeDesbloqueio(email: string) {
  if (!(await temCota('email', `desbloqueio:${email}`, 1))) return;

  const { data: acesso } = await admin
    .from('member_access')
    .select('has_main, blocked')
    .eq('email', email)
    .maybeSingle();
  if (!acesso?.has_main || acesso.blocked) return;

  const { data, error } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { redirectTo: `https://${APEX}/app` },
  });
  if (error || !data?.properties?.action_link) return;

  await enviarEmail(
    email,
    'Link de acesso ao MyPortifolio',
    `<p>Alguem pediu muitos codigos para este e-mail, entao paramos de enviar codigo por um tempo.</p>
     <p>Se foi voce, entre por este link, que vale uma vez:</p>
     <p><a href="${data.properties.action_link}">Entrar no MyPortifolio</a></p>
     <p>Se nao foi voce, ignore esta mensagem: ninguem entrou na sua conta.</p>`,
  );
}

async function alarmarDono(total: string) {
  if (!EMAIL_DO_DONO) return;
  if (!(await temCota('global', 'alarme', 1))) return; // um alarme por janela, nao um por request
  await enviarEmail(
    EMAIL_DO_DONO,
    'MyPortifolio: teto global de pedidos de codigo estourado',
    `<p>O escopo global de access_throttle passou de ${total} pedidos na ultima hora.</p>
     <p>Ninguem foi recusado: os pedidos acima do teto estao entrando em fila de alguns
     segundos. Confira o painel do Resend e a tabela access_throttle.</p>`,
  );
}

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== 'POST') return json({ error: 'method-not-allowed' }, 405);

  const comecou = Date.now();
  // Fecha a resposta sempre no mesmo tempo minimo. Vale para TODOS os ramos de sucesso,
  // inclusive o que nao manda nada.
  const uniforme = async () => {
    const falta = PISO_RESPOSTA_MS - (Date.now() - comecou);
    if (falta > 0) await dormir(falta);
    return json(RESPOSTA_UNIFORME, 200);
  };

  const ip = req.headers.get('CF-Connecting-IP') ?? req.headers.get('x-forwarded-for') ?? '';

  let corpo: { email?: string; turnstileToken?: string };
  try {
    corpo = await req.json();
  } catch {
    return json({ error: 'body-invalido' }, 400);
  }

  const email = (corpo.email ?? '').trim().toLowerCase();
  const token = (corpo.turnstileToken ?? '').trim();

  if (!RE_EMAIL.test(email) || email.length > 200) return json({ error: 'email-invalido' }, 400);

  // (a) Turnstile. Antes de qualquer coisa que custe: sem token valido nao se escreve linha
  // de rate limit, nao se consulta member_access e nao se cria conta.
  if (!token) return json({ error: 'captcha-required' }, 403);
  if (!(await turnstileValido(token, ip))) return json({ error: 'captcha-required' }, 403);

  // (b) Rate limit. IP primeiro, porque e a chave que o atacante controla menos.
  if (ip && !(await temCota('ip', ip, TETO_IP))) {
    return json({ error: 'rate-limited', retry_after: 3600 }, 429, { 'retry-after': '3600' });
  }

  if (!(await temCota('email', email, TETO_EMAIL))) {
    // Recusa igual para todo mundo, sem dizer nada sobre o e-mail. E, em paralelo, o dono
    // legitimo recebe um caminho de volta pelo proprio e-mail.
    await mandarLinkDeDesbloqueio(email);
    return json({ error: 'rate-limited', retry_after: 3600 }, 429, { 'retry-after': '3600' });
  }

  // Teto global: ALARME E FILA, nunca recusa. Vinte chamadas bem sucedidas por hora nao sao
  // um ataque, sao uma campanha de e-mail para cem compradores nos primeiros minutos, e a
  // recusa dura atingiria a base inteira em vez do atacante.
  if (!(await temCota('global', 'todos', TETO_GLOBAL))) {
    await alarmarDono(String(TETO_GLOBAL));
    await dormir(ATRASO_GLOBAL_MS);
  }

  // (c) Daqui para baixo, NENHUM ramo muda a resposta. Erro tambem nao: se o banco cair, o
  // comprador ve a mesma tela e simplesmente nao recebe e-mail, o que ja e o comportamento
  // de quem nao comprou.
  try {
    const { data: acesso } = await admin
      .from('member_access')
      .select('has_main, blocked')
      .eq('email', email)
      .maybeSingle();

    if (acesso?.has_main && !acesso.blocked) {
      // Garante a conta antes de gerar o codigo: generateLink so funciona para usuario que
      // ja existe, e o comprador novo nunca passou por aqui.
      const { error } = await admin.auth.admin.createUser({ email, email_confirm: true });
      // email_exists e o caso NORMAL do segundo login em diante, nao um erro.
      if (error && !/exist/i.test(error.message)) console.error('createUser falhou', error.message);

      // NOS mandamos o codigo, e o Supabase nao manda e-mail nenhum.
      //
      // POR QUE, e esta e a decisao que destravou a fase: o projeto Supabase e COMPARTILHADO
      // com o AI Block, e a configuracao de Auth e por PROJETO, nao por produto. O remetente
      // configurado la e "AI Block <acesso@mail.methodcipher.com>", o site_url e o da area
      // de membros dele, e o CAPTCHA nativo esta desligado. Apontar isso para o MyPortifolio
      // faria os e-mails do AI Block sairem com a nossa marca, e ligar o CAPTCHA derrubaria
      // o login deles, que nao manda token. Nao ha configuracao que sirva aos dois.
      //
      // generateLink resolve: com a service role ele DEVOLVE o codigo (properties.email_otp)
      // e NAO dispara e-mail. Entao o Turnstile fica nesta function, que e nossa, o e-mail
      // sai pelo nosso Resend com a nossa marca, e nada da configuracao compartilhada muda.
      //
      // Efeito colateral bom: rate_limit_email_sent do Supabase deixa de ser o teto de login
      // do produto (risco R3), porque quem envia somos nos.
      const { data: link, error: erroLink } = await admin.auth.admin.generateLink({
        type: 'magiclink',
        email,
        options: { redirectTo: `https://${APEX}/app` },
      });
      const codigo = link?.properties?.email_otp;
      if (erroLink || !codigo) {
        console.error('generateLink falhou', erroLink?.message);
      } else {
        await enviarEmail(
          email,
          `${codigo} e seu codigo de acesso`,
          `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:420px">
             <h2 style="margin:0 0 4px">Seu codigo de acesso</h2>
             <p style="font-size:30px;letter-spacing:8px;margin:12px 0"><strong>${codigo}</strong></p>
             <p style="color:#666;margin:0 0 8px">Ele vale por pouco tempo e serve uma vez so.</p>
             <p style="color:#666;margin:0">Se nao foi voce que pediu, ignore esta mensagem: ninguem entrou na sua conta.</p>
             <p style="color:#999;font-size:12px;margin-top:20px">MyPortifolio</p>
           </div>`,
        );
      }
    }
  } catch (e) {
    console.error('ramo de concessao falhou', e);
  }

  return await uniforme();
});
