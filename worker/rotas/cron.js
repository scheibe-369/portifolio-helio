import { ping } from '../lib/supabase.js';

// Alvo do handler `scheduled`. Keep-alive de verdade do projeto Supabase.
//
// POR QUE ISSO NAO E O `cron.schedule` DO 0001: aquele roda DENTRO do Postgres e nao e uma
// requisicao ao projeto. A contagem de inatividade do plano free olha requisicao (suposicao
// S5), e projeto pausado por inatividade significa TODO portfolio pago fora do ar de uma vez,
// esperando alguem clicar em "restore" num painel. Uma chamada HTTP a cada 6 horas custa nada
// e tira esse modo de falha da mesa.
//
// Falhar aqui nao pode derrubar nada: o cron nao tem visitante esperando, e o proximo tiro e
// em 6 horas.
export async function rodarCron(cfg) {
  try {
    const status = await ping(cfg);
    console.log(`cron keep-alive: PostgREST respondeu ${status}`);
  } catch (e) {
    console.log(`cron keep-alive falhou: ${String(e)}`);
  }
}
