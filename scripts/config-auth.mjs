// ATENCAO, LEIA ANTES DE RODAR COM --aplicar.
//
// A configuracao de Auth do Supabase e por PROJETO, e este projeto e COMPARTILHADO com o
// AI Block, que tem clientes pagantes. Medido em 2026-08-14, a config viva e inteira dele:
// remetente 'AI Block <acesso@mail.methodcipher.com>', site_url da area de membros dele,
// OTP de 8 digitos e CAPTCHA nativo DESLIGADO.
//
// Aplicar o bloco de SMTP faria os e-mails do AI Block sairem com a marca do MyPortifolio,
// e ligar o CAPTCHA derrubaria o login deles na hora, porque a tela deles nao manda token.
// Nao existe configuracao unica que sirva aos dois produtos.
//
// POR ISSO O PRODUTO NAO USA MAIS O E-MAIL DO SUPABASE. A Edge Function request-access-code
// chama generateLink com a service role (ele devolve o codigo em properties.email_otp e NAO
// dispara e-mail) e manda pelo nosso Resend. O Turnstile fica na function, que e nossa.
//
// O que foi aplicado, e e tudo que pode ser aplicado com seguranca:
//   uri_allow_list  ganhou myportifolio.com.br SEM perder area.methodcipher.com
//   rate_limit_email_sent  30 -> 100 (ajuda os dois, nao muda comportamento de nenhum)
//
// O bloco abaixo fica como REGISTRO do que seria necessario num projeto proprio, e do que
// vira pendencia no dia em que o MyPortifolio migrar para projeto separado.

// Configuracao do Supabase Auth deste produto, escrita como codigo e nao como instrucao
// solta, porque cada campo abaixo e um pre requisito da primeira venda e nenhum deles vive
// no repositorio: eles vivem no projeto, e projeto configurado a mao esquece um campo.
//
//   node scripts/config-auth.mjs            mostra o PATCH que sera enviado (nao aplica)
//   node scripts/config-auth.mjs --aplicar  aplica de verdade
//
// Le SUPABASE_PROJECT_REF, SUPABASE_ACCESS_TOKEN, TURNSTILE_SECRET_KEY, RESEND_API_KEY e
// RESEND_FROM_DOMAIN de .env.local. Nada e impresso em texto claro alem do necessario.
//
// O QUE CADA CAMPO RESOLVE, e por que nenhum e opcional:
//
//   disable_signup            Sem isto, QUALQUER pessoa com a anon key (que e publica, o
//                             bundle do editor precisa dela) vira authenticated e ganha
//                             execute em tudo que foi concedido a authenticated. O gate de
//                             compra segura o dano, mas a superficie nao deveria existir.
//
//   security_captcha_*        E O CAMPO MAIS IMPORTANTE DESTE ARQUIVO. Quem manda o e-mail
//                             de codigo nao e a nossa Edge Function: e o /auth/v1/otp do
//                             Supabase, chamado do browser com a anon key. Sem o CAPTCHA
//                             nativo, o Turnstile da Edge Function protege um endereco que
//                             o atacante nunca precisa usar, e sobram dois danos: dreno da
//                             cota de e-mail do projeto inteiro (e sem e-mail ninguem
//                             entra) e enumeracao da base de clientes, porque com
//                             shouldCreateUser: false o endpoint responde diferente para
//                             e-mail com conta e sem conta, e conta so existe para quem
//                             comprou.
//
//   mailer_otp_length/exp     6 digitos e 10 minutos (decisao 9.6). Mudar depois invalida
//                             codigo em transito, entao trava antes da primeira venda.
//
//   assunto do magic link     O codigo vai NO ASSUNTO. E o item de maior reducao de atrito
//                             no celular: o comprador le na notificacao sem abrir o e-mail.
//
//   smtp_*                    O servico de e-mail embutido do Supabase e explicitamente
//                             para desenvolvimento e nao pode existir num projeto com
//                             cliente pagante. O dominio mail.myportifolio.com.br ja esta
//                             verificado no Resend, com envio real confirmado.
//
//   rate_limit_email_sent     Com login por e-mail, ESTE numero e o maximo de logins por
//                             hora do produto inteiro. Ele fica em 100, acima do nosso teto
//                             global de 80 (que alarma e enfileira, nunca recusa), para o
//                             alarme tocar antes de o Supabase recusar.
//
//   smtp_max_frequency        60 segundos, casando com o cooldown de reenvio do front. Sem
//                             o par, o botao reenvia e o Auth recusa, e o comprador acha
//                             que o produto travou.
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const RAIZ = process.cwd();

async function lerEnv() {
  const bruto = await readFile(resolve(RAIZ, '.env.local'), 'utf8');
  const env = {};
  for (const linha of bruto.split(/\r?\n/)) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(linha.trim());
    if (m) env[m[1]] = m[2].trim();
  }
  return env;
}

const env = await lerEnv();

const faltando = [
  'SUPABASE_PROJECT_REF',
  'SUPABASE_ACCESS_TOKEN',
  'TURNSTILE_SECRET_KEY',
  'RESEND_API_KEY',
  'RESEND_FROM_DOMAIN',
].filter((k) => !env[k]);
if (faltando.length) {
  console.error(`faltam variaveis em .env.local: ${faltando.join(', ')}`);
  process.exit(2);
}

const REMETENTE = `acesso@${env.RESEND_FROM_DOMAIN}`;

// O template usa {{ .Token }} e NAO {{ .ConfirmationURL }} de proposito: link em e-mail e
// aberto por scanner de provedor antes do humano, e token de uso unico aberto por scanner ja
// foi consumido. Codigo digitado nao tem esse problema.
const CORPO_MAGIC_LINK = [
  '<h2 style="font-family:system-ui,sans-serif">Seu codigo de acesso</h2>',
  '<p style="font-family:system-ui,sans-serif;font-size:28px;letter-spacing:6px"><strong>{{ .Token }}</strong></p>',
  '<p style="font-family:system-ui,sans-serif;color:#666">Ele vale por 10 minutos e serve uma vez so.</p>',
  '<p style="font-family:system-ui,sans-serif;color:#666">Se nao foi voce que pediu, ignore esta mensagem: ninguem entrou na sua conta.</p>',
].join('');

const config = {
  disable_signup: true,

  security_captcha_enabled: true,
  security_captcha_provider: 'turnstile',
  security_captcha_secret: env.TURNSTILE_SECRET_KEY,

  mailer_otp_length: 6,
  mailer_otp_exp: 600,
  mailer_subjects_magic_link: '{{ .Token }} e seu codigo de acesso',
  mailer_templates_magic_link_content: CORPO_MAGIC_LINK,
  mailer_subjects_recovery: '{{ .Token }} e seu codigo para redefinir a senha',
  mailer_templates_recovery_content: CORPO_MAGIC_LINK,

  smtp_admin_email: REMETENTE,
  smtp_sender_name: 'MyPortifolio',
  smtp_host: 'smtp.resend.com',
  smtp_port: 465,
  smtp_user: 'resend',
  smtp_pass: env.RESEND_API_KEY,
  smtp_max_frequency: 60,

  rate_limit_email_sent: 100,
};

const url = `https://api.supabase.com/v1/projects/${env.SUPABASE_PROJECT_REF}/config/auth`;

// Nunca imprime segredo: o valor vira o comprimento dele, que e o suficiente para conferir
// que a chave certa foi lida sem deixar a chave no historico do terminal.
const seguro = { ...config };
for (const k of ['security_captcha_secret', 'smtp_pass']) {
  if (seguro[k]) seguro[k] = `<${k}, ${String(seguro[k]).length} caracteres>`;
}

console.log(`PATCH ${url}\n`);
console.log(JSON.stringify(seguro, null, 2));

if (!process.argv.includes('--aplicar')) {
  console.log('\n(nada foi enviado. rode com --aplicar para aplicar)');
  console.log(`
Fora deste arquivo, e no mesmo momento, ainda precisam ser feitos no painel ou pela API:

  1. Expor o schema "myportifolio" na API (Settings, API, Exposed schemas). Sem isso o
     PostgREST responde 404 em toda RPC deste produto, porque nada dele mora em public.
  2. Secrets das Edge Functions (supabase secrets set):
       TURNSTILE_SECRET_KEY, RESEND_API_KEY, ACCESS_FROM=${REMETENTE},
       APEX_HOST=myportifolio.com.br, OWNER_EMAIL=<e-mail do dono>
  3. Deploy das tres functions com verify_jwt DESLIGADO em request-access-code
     (quem pede codigo ainda nao tem sessao) e LIGADO nas outras duas:
       supabase functions deploy request-access-code --no-verify-jwt
       supabase functions deploy accept-terms
       supabase functions deploy request-refund
  4. Site do Turnstile com o dominio myportifolio.com.br na lista de hostnames, senao o
     siteverify recusa o token que o widget emitiu.

Depois de aplicar, os tres testes que provam que o login nao e contornavel (5.4):
  a) curl -X POST "$SUPABASE_URL/auth/v1/otp" -H "apikey: $ANON" -H 'content-type: application/json' \\
       -d '{"email":"x@y.z","create_user":false}'
     tem que responder ERRO DE CAPTCHA, e auth.users nao pode crescer.
  b) o mesmo curl com um e-mail que TEM compra e outro que NAO tem: os dois corpos passados
     por diff tem que dar zero diferenca.
  c) POST /auth/v1/signup com a anon key tem que responder signup desabilitado.
Se qualquer um dos tres falhar, o login inteiro e contornavel com um laco de curl.`);
  process.exit(0);
}

const r = await fetch(url, {
  method: 'PATCH',
  headers: {
    authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}`,
    'content-type': 'application/json',
  },
  body: JSON.stringify(config),
});
const texto = await r.text();
console.log(`\nHTTP ${r.status}`);
console.log(texto.slice(0, 2000));
process.exit(r.ok ? 0 : 1);
