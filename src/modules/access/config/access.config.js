// Constantes do fluxo de acesso, num arquivo so, porque cada uma delas tem um par fora do
// repositorio e divergir dele quebra o login em silencio.
//
// COOLDOWN_REENVIO_S casa com smtp_max_frequency = 60 no Supabase Auth: pedir de novo antes
// disso nao adianta, o Auth recusa e o comprador acha que o produto travou.
// TAMANHO_CODIGO e VALIDADE_CODIGO_MIN casam com mailer_otp_length = 6 e mailer_otp_exp =
// 600. Os tres valores estao no scripts/config-auth.mjs, que e o unico lugar que aplica.
export const COOLDOWN_REENVIO_S = 60;
export const TAMANHO_CODIGO = 6;
export const VALIDADE_CODIGO_MIN = 10;

// Nome da Edge Function que decide se manda o codigo. Ela NUNCA responde se o e-mail tem
// compra: a resposta e a mesma para todo mundo (5.4c do plano). Quem revelasse isso
// transformaria a tela de login em lista de clientes.
export const FN_PEDIR_CODIGO = 'request-access-code';

// Contato que aparece no "nao recebi o codigo". E o unico caminho de suporte da fase 1,
// entao ele nao pode ser um link morto.
export const SUPORTE_EMAIL = 'suporte@myportifolio.com.br';
