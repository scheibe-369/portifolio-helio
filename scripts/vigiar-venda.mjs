// Fica olhando o banco esperando a primeira venda de verdade chegar, e sai assim que ela
// chega, com tudo que interessa ja lido.
//
// POR QUE UM SCRIPT E NAO OLHAR NA MAO: a pergunta desta espera nao e "chegou?", e sim
// "chegou e funcionou?". Sao seis coisas em tabelas diferentes (o evento, as flags, a conta
// de login, a fila da facilitacao, o resultado da auditoria e o id que veio no corpo), e
// conferir uma de cada vez, na mao, e como se descobre tarde que faltou olhar a sexta.
//
// E tem uma pergunta especifica em aberto: o id do bump de personalizacao entrou no mapa
// vindo do PAINEL da Hubla, nunca de um evento. Esta e a primeira oportunidade de saber se
// ele esta certo, e o script ja responde isso em vez de deixar a conferencia para depois.
//
//   node scripts/vigiar-venda.mjs                 espera 30 min, olhando de 10 em 10 s
//   node scripts/vigiar-venda.mjs --minutos 60
import { lerEnv, consultar } from '../supabase/operacao/lib/db.mjs';

const args = process.argv.slice(2);
const iMin = args.indexOf('--minutos');
const MINUTOS = iMin >= 0 ? Number(args[iMin + 1]) : 30;
const INTERVALO_MS = 10_000;

// O id que o dono passou, que ainda nao foi confirmado por evento nenhum.
const ID_CUSTOM_SUPOSTO = 'vNYCSzkdxb4ehMKTYLTD';

const env = await lerEnv();
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

// A LINHA DE BASE E TIRADA ANTES DO PRIMEIRO GIRO, e ela e por ID e nao por contagem:
// contagem nao distingue "chegou um novo" de "apaguei um velho", e o segundo caso apareceria
// como venda que nunca existiu.
const vistos = new Set(
  (await consultar(env, 'select id from myportifolio.hubla_events')).map((r) => r.id),
);
const vistosPublic = new Set(
  (await consultar(env, 'select id from public.hubla_events')).map((r) => r.id),
);
console.log(`vigiando. ${vistos.size} evento(s) do MyPortifolio ja no banco, ${vistosPublic.size} do AI Block.`);
console.log(`teto de espera: ${MINUTOS} min. Olhando de ${INTERVALO_MS / 1000} em ${INTERVALO_MS / 1000} s.\n`);

const limite = Date.now() + MINUTOS * 60_000;
let giro = 0;

while (Date.now() < limite) {
  giro++;
  let novos = [];
  try {
    novos = await consultar(
      env,
      `select id, type, email, product_ids, is_sandbox, processed_at, processed_result,
              applied_flags, attempts, processing_error, received_at, payload->'event'->'user' as usuario
       from myportifolio.hubla_events order by received_at desc limit 20;`,
    );
  } catch (e) {
    // Falha de rede nao pode encerrar a vigilia: o proximo giro tenta de novo. Encerrar aqui
    // seria perder justamente a venda que se esta esperando.
    console.log(`giro ${giro}: nao consegui ler (${String(e).slice(0, 90)})`);
    await dormir(INTERVALO_MS);
    continue;
  }

  const frescos = novos.filter((r) => !vistos.has(r.id));
  if (frescos.length === 0) {
    if (giro % 6 === 0) console.log(`giro ${giro}: nada ainda (${new Date().toLocaleTimeString('pt-BR')})`);
    await dormir(INTERVALO_MS);
    continue;
  }

  console.log(`\n===== CHEGOU: ${frescos.length} evento(s) =====\n`);
  for (const e of frescos) {
    console.log(`  recebido em : ${e.received_at}`);
    console.log(`  tipo        : ${e.type}${e.is_sandbox ? '   (SANDBOX, nao concede nada)' : ''}`);
    console.log(`  e-mail      : ${e.email}`);
    console.log(`  product_ids : ${JSON.stringify(e.product_ids)}`);
    console.log(`  resultado   : ${e.processed_result ?? '(ainda nulo)'}   flags: ${JSON.stringify(e.applied_flags)}`);
    console.log(`  fechado     : ${e.processed_at ? 'sim' : 'NAO, vai reprocessar na retentativa'}`);
    if (e.attempts > 1) console.log(`  tentativas  : ${e.attempts}`);
    if (e.processing_error) console.log(`  ERRO        : ${e.processing_error}`);
    console.log('');
  }

  // A pergunta em aberto do bump.
  const idsChegados = [...new Set(frescos.flatMap((e) => e.product_ids ?? []))];
  const conhecidos = ['dol37hflBB4LloFHpGab', 'U9cuWxeCOsTvt4urY5vS', 'q7IxDLHWM6OI8EBmrreo', ID_CUSTOM_SUPOSTO];
  const desconhecidos = idsChegados.filter((i) => !conhecidos.includes(i));
  console.log('--- o id do bump ---');
  if (idsChegados.includes(ID_CUSTOM_SUPOSTO)) {
    console.log(`  CONFIRMADO: ${ID_CUSTOM_SUPOSTO} chegou num evento real.`);
  } else if (desconhecidos.length) {
    console.log(`  O PALPITE ESTAVA ERRADO. Id que chegou e nao esta no mapa: ${JSON.stringify(desconhecidos)}`);
    console.log('  Trocar em supabase/functions/hubla-webhook/productFlags.ts e redeployar.');
  } else {
    console.log('  Nada a dizer: este evento nao trouxe o bump (compra sem a caixinha marcada).');
  }

  const emails = [...new Set(frescos.map((e) => e.email).filter(Boolean))];
  if (emails.length) {
    const lista = emails.map((e) => `'${e}'`).join(',');
    const acesso = await consultar(
      env,
      `select email, has_main, has_custom, has_setup, blocked, source, granted_at, main_granted_at
       from myportifolio.member_access where email in (${lista});`,
    );
    const conta = await consultar(
      env,
      `select email, email_confirmed_at is not null as confirmado, created_at
       from auth.users where email in (${lista});`,
    );
    const fila = await consultar(
      env,
      `select email, status, opened_at from myportifolio.setup_requests where email in (${lista});`,
    );
    console.log('\n--- o que a venda produziu ---');
    console.log('  acesso :', JSON.stringify(acesso));
    console.log('  conta  :', JSON.stringify(conta));
    console.log('  fila   :', JSON.stringify(fila.length ? fila : '(nenhuma, esperado se nao comprou facilitacao)'));
  }

  // O vizinho. Toda venda do MyPortifolio tambem escreve na auditoria do AI Block, entao
  // esta e a hora de confirmar que ela nao ganhou NADA alem da linha de auditoria.
  const membrosAiBlock = await consultar(env, 'select count(*)::int n from public.member_access');
  console.log(`\n--- o vizinho ---\n  AI Block, membros com acesso: ${membrosAiBlock[0].n}  (era 8)`);

  process.exit(0);
}

console.log(`\nteto de ${MINUTOS} min atingido sem nenhum evento novo.`);
console.log('Se a compra foi feita, o webhook nao recebeu: conferir a url do webhook no painel da Hubla.');
process.exit(2);
