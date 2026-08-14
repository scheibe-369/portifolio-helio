// Constantes do fluxo de acesso, num arquivo so, porque cada uma delas tem um par fora do
// repositorio e divergir dele quebra o login em silencio.
//
// COOLDOWN_REENVIO_S casa com smtp_max_frequency = 60 no Supabase Auth: pedir de novo antes
// disso nao adianta, o Auth recusa e o comprador acha que o produto travou.
// TAMANHO_CODIGO e VALIDADE_CODIGO_MIN casam com mailer_otp_length e mailer_otp_exp do
// projeto Supabase.
//
// ESTES DOIS JA ESTIVERAM ERRADOS, e o defeito foi caro: o comentario aqui dizia "casam com
// mailer_otp_length = 6", e a config de verdade estava em 8. O campo tinha maxlength 6,
// entao os dois ultimos digitos nem entravam, o codigo saia truncado e o login recusava
// dizendo que o codigo era invalido. Ninguem tinha conferido a config; eu tinha escrito o
// numero que achei que era e o comentario tornou o palpite parecido com um fato. A validade
// tambem estava errada: 10 minutos escritos, 60 na realidade (mailer_otp_exp = 3600).
//
// A CONFIG E COMPARTILHADA com o AI Block, entao o alinhamento vai NESTE sentido: o front se
// ajusta ao servidor, e nao o contrario. Mexer em mailer_otp_length arriscaria o produto
// vizinho para poupar uma constante daqui.
//
// COMO CONFERIR (e isto vale antes de acreditar em qualquer numero desta secao):
//   node scripts/conferir-auth.mjs
export const COOLDOWN_REENVIO_S = 60;
export const TAMANHO_CODIGO = 8;
export const VALIDADE_CODIGO_MIN = 60;

// O campo aceita uma FAIXA, e nao um comprimento exato. Se o tamanho do codigo mudar no
// Supabase, o login degrada para "funciona" em vez de "o botao nao submete e ninguem entende
// por que", que foi exatamente o sintoma da primeira vez.
export const TAMANHO_CODIGO_MIN = 4;
export const TAMANHO_CODIGO_MAX = 10;

// Nome da Edge Function que decide se manda o codigo. Ela NUNCA responde se o e-mail tem
// compra: a resposta e a mesma para todo mundo (5.4c do plano). Quem revelasse isso
// transformaria a tela de login em lista de clientes.
export const FN_PEDIR_CODIGO = 'request-access-code';

// Contato que aparece no "nao recebi o codigo". E o unico caminho de suporte da fase 1,
// entao ele nao pode ser um link morto.
export const SUPORTE_EMAIL = 'suporte@myportifolio.com.br';
