import { ping, rpc } from '../lib/supabase.js';

// Alvo do handler `scheduled`. Duas rotinas, escolhidas pela expressao que disparou.
//
// FALHAR AQUI NAO PODE DERRUBAR NADA. O cron nao tem visitante esperando, e a resposta certa
// para qualquer erro e registrar e sair: uma excecao que escapa daqui vira um disparo
// marcado como falho no painel da Cloudflare e nada mais, mas mascara qual das duas rotinas
// quebrou.

const CRON_KEEP_ALIVE = '0 */6 * * *';

// Keep-alive de verdade do projeto Supabase.
//
// POR QUE ISSO NAO E O `cron.schedule` DO 0001: aquele roda DENTRO do Postgres e nao e uma
// requisicao ao projeto. A contagem de inatividade do plano free olha requisicao (suposicao
// S5), e projeto pausado por inatividade significa TODO portfolio pago fora do ar de uma vez,
// esperando alguem clicar em "restore" num painel.
async function keepAlive(cfg) {
  try {
    const status = await ping(cfg);
    console.log(`cron keep-alive: PostgREST respondeu ${status}`);
  } catch (e) {
    console.log(`cron keep-alive falhou: ${String(e)}`);
  }
}

const dt = (v) => (v ? new Date(v).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : '');

// Alerta da fila de PRIMEIRA publicacao.
//
// POR QUE ELE E FREQUENTE e o keep-alive nao: do outro lado desta fila tem alguem que pagou,
// terminou de montar o portfolio e apertou publicar. Enquanto ninguem aprova, a pagina dessa
// pessoa nao existe. Seis horas de espera para um produto de R$ 47,90 e motivo de reembolso.
//
// A revisao existe porque qualquer comprador pode publicar num endereco do NOSSO dominio, e
// sem um par de olhos antes da estreia a defesa contra alguem montar phishing em
// <banco>.myportifolio.com.br passa a ser "o dono percebe depois" (risco R8). Ela so vale a
// primeira publicacao: dai em diante a pessoa edita e publica sozinha.
//
// A RPC RESERVA E CARIMBA num passo so (migration 0009), entao esta funcao pode rodar
// concorrente consigo mesma sem mandar o mesmo aviso duas vezes.
async function alertarFilaDePublicacao(cfg, env) {
  const chave = String((env && env.RESEND_API_KEY) || '');
  const de = String((env && env.ALERTA_EMAIL_FROM) || '');
  const para = String((env && env.ALERTA_EMAIL_TO) || '');

  let linhas;
  try {
    linhas = await rpc(cfg, 'claim_reviews_to_alert', {}, { servico: true, timeoutMs: 5000 });
  } catch (e) {
    console.log(`cron fila: nao consegui ler a fila: ${String(e)}`);
    return;
  }
  if (!Array.isArray(linhas) || linhas.length === 0) return;

  // Sem credencial o aviso nao sai, mas as linhas JA FORAM CARIMBADAS pela RPC. Registrar o
  // conteudo no log e o que evita que a fila fique silenciosamente sem aviso: o dado nao se
  // perde, ele muda de canal. E a linha continua na fila da tela, com o tempo de espera.
  if (!chave || !de || !para) {
    console.log(`cron fila: ${linhas.length} pedido(s) de publicacao sem alerta (falta credencial do Resend)`, linhas);
    return;
  }

  const corpo = linhas
    .map((l) => `- ${l.slug}.${cfg.apexHost} (${l.display_name || 'sem nome'}, ${l.owner_email}) pediu em ${dt(l.requested_at)}`)
    .join('\n');

  const assunto =
    linhas.length === 1
      ? `MyPortifolio: ${linhas[0].slug} quer publicar`
      : `MyPortifolio: ${linhas.length} portfolios querendo publicar`;

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${chave}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        from: de,
        to: [para],
        subject: assunto,
        text:
          `${corpo}\n\n` +
          `Abra cada um antes de aprovar: esta e a unica vez que alguem olha o conteudo.\n` +
          `https://${cfg.apexHost}/app/admin/fila\n`,
      }),
      signal: AbortSignal.timeout(5000),
    });
    if (!r.ok) console.log(`cron fila: Resend respondeu ${r.status}`, await r.text().catch(() => ''), linhas);
    else console.log(`cron fila: avisei sobre ${linhas.length} pedido(s)`);
  } catch (e) {
    console.log(`cron fila: Resend nao respondeu: ${String(e)}`, linhas);
  }
}

export async function rodarCron(cfg, expressao, env) {
  if (expressao === CRON_KEEP_ALIVE) return keepAlive(cfg);
  return alertarFilaDePublicacao(cfg, env);
}
