// Compara as constantes do front com a configuracao REAL do Supabase Auth.
//
// POR QUE ISTO EXISTE: em 14/08/2026 o login ficou impossivel de completar e nada acusou. O
// arquivo src/modules/access/config/access.config.js dizia, num comentario, "casam com
// mailer_otp_length = 6". A config de verdade estava em 8. O campo tinha maxlength="6", entao
// os dois ultimos digitos do codigo nem eram digitaveis, o codigo saia truncado e o servidor
// respondia "codigo invalido", que e a mensagem mais enganosa possivel: o codigo estava
// certo, o campo e que era curto.
//
// O comentario nao era mentira deliberada, era um palpite escrito com a mesma cara de um
// fato. Este script transforma o palpite em pergunta com resposta.
//
//   node scripts/conferir-auth.mjs
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  TAMANHO_CODIGO,
  TAMANHO_CODIGO_MIN,
  TAMANHO_CODIGO_MAX,
  VALIDADE_CODIGO_MIN,
  COOLDOWN_REENVIO_S,
} from '../src/modules/access/config/access.config.js';

const env = Object.fromEntries(
  (await readFile(resolve(process.cwd(), '.env.local'), 'utf8'))
    .split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
);

const r = await fetch(`https://api.supabase.com/v1/projects/${env.SUPABASE_PROJECT_REF}/config/auth`, {
  headers: {
    Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}`,
    // A API fica atras da Cloudflare, que devolve 403 para user-agent de script.
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
  },
});
if (!r.ok) {
  console.error(`nao consegui ler a config: ${r.status}`);
  process.exit(1);
}
const cfg = await r.json();

const casos = [
  {
    nome: 'tamanho do codigo',
    front: TAMANHO_CODIGO,
    servidor: cfg.mailer_otp_length,
    porque: 'o campo de codigo usa este numero no placeholder e a copia promete este tamanho',
  },
  {
    nome: 'validade do codigo (min)',
    front: VALIDADE_CODIGO_MIN,
    servidor: cfg.mailer_otp_exp / 60,
    porque: 'a tela diz por quantos minutos o codigo vale',
  },
  {
    nome: 'espera para reenviar (s)',
    front: COOLDOWN_REENVIO_S,
    servidor: cfg.smtp_max_frequency ?? COOLDOWN_REENVIO_S,
    porque: 'pedir de novo antes disso o Auth recusa, e o comprador acha que travou',
  },
];

let falhas = 0;
for (const c of casos) {
  const ok = Number(c.front) === Number(c.servidor);
  if (!ok) falhas++;
  console.log(
    `${ok ? 'ok  ' : 'DIVERGE'} ${c.nome.padEnd(26)} front=${c.front}  servidor=${c.servidor}`,
  );
  if (!ok) console.log(`        ${c.porque}`);
}

// A faixa aceita pelo campo precisa CONTER o tamanho real. Ela existe justamente para
// absorver uma mudanca de config sem travar ninguem, e so cumpre esse papel se cobrir o
// valor que o servidor esta gerando hoje.
const dentro =
  Number(cfg.mailer_otp_length) >= TAMANHO_CODIGO_MIN &&
  Number(cfg.mailer_otp_length) <= TAMANHO_CODIGO_MAX;
if (!dentro) falhas++;
console.log(
  `${dentro ? 'ok  ' : 'DIVERGE'} faixa aceita pelo campo    ${TAMANHO_CODIGO_MIN} a ${TAMANHO_CODIGO_MAX}, servidor gera ${cfg.mailer_otp_length}`,
);

// O CAPTCHA nativo tem que continuar DESLIGADO. Nao e preferencia: a config de Auth e por
// projeto e o AI Block divide este projeto. O login dele nao manda token de captcha, entao
// ligar isto aqui derruba o produto vizinho na hora.
const captchaOk = cfg.security_captcha_enabled === false;
if (!captchaOk) falhas++;
console.log(
  `${captchaOk ? 'ok  ' : 'PERIGO '} captcha nativo desligado   ${cfg.security_captcha_enabled}`,
);

console.log(falhas ? `\n${falhas} divergencia(s)` : '\nOK: o front e o servidor dizem a mesma coisa');
process.exit(falhas ? 1 : 0);
