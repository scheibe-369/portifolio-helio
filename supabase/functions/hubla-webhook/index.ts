// Recebe os webhooks da Hubla (customer.member_added / customer.member_removed) dos DOIS
// produtos que dividem o projeto Supabase fxchcqlbjszichhbllzm: o AI Block, que ja esta em
// producao com clientes pagantes, e o MyPortifolio.
//
// POR QUE OS DOIS NA MESMA FUNCAO: a Hubla aponta para UMA url de webhook. Antes desta
// versao, um evento do MyPortifolio nao casava nenhum id do PRODUCT_TIER_MAP do AI Block,
// terminava com zero tier aplicado e caia no 500 de proposito (que existe para forcar
// retentativa quando o produto DEVERIA ter casado). Resultado: a Hubla retentava em laco, o
// comprador pagava e nao entrava, e o log do AI Block enchia de erro por uma venda que nem
// era dele.
//
// A CORRECAO E ADITIVA. O caminho do AI Block esta intacto, linha a linha:
//   - a auditoria continua sendo o insert em public.hubla_events, com as 3 tentativas;
//   - id que casa em PRODUCT_TIER_MAP continua chamando public.grant_or_revoke_member_access;
//   - o convite por link (inviteUserByEmail) continua condicionado a appliedTiers > 0.
// O que entrou foi um "else if": id que casa em PRODUCT_FLAG_MAP chama
// myportifolio.grant_or_revoke_member_access. O contador de "aplicou alguma coisa" soma os
// dois, entao o 500 volta a significar o que sempre significou: NENHUM dos dois produtos
// reconheceu este id, que ai e erro de verdade.
//
// ESTE ARQUIVO PASSA A SER A UNICA VERSAO VIVA da function. A copia que mora no repo do AI
// Block (CIPHER - MATHEUS FONSECA/ai block/supabase/functions/hubla-webhook/) fica defasada
// no momento em que esta aqui for deployada. Deployar a de la depois desta derruba o
// MyPortifolio de volta ao laco de 500.
//
// Doc Hubla: https://hubla.gitbook.io/docs/webhooks/introducao

import { createClient } from 'npm:@supabase/supabase-js@2';
import { PRODUCT_TIER_MAP } from './productTiers.ts';
import { PRODUCT_FLAG_MAP, PRODUTOS_MYPORTIFOLIO } from './productFlags.ts';

const HUBLA_WEBHOOK_TOKEN = Deno.env.get('HUBLA_WEBHOOK_TOKEN') ?? '';

// Segredo proprio do MyPortifolio, OPCIONAL. Existe porque o plano exige token separado por
// produto, com rotacao semestral, e a Hubla assina o header por conta, nao por url. Se as
// duas contas Hubla forem a mesma, este secret nunca e cadastrado e o comportamento fica
// identico ao de hoje.
//
// O PRECO, escrito de olhos abertos: enquanto os dois tokens forem aceitos na mesma porta,
// quem tiver o token do MyPortifolio consegue forjar evento do AI Block e vice-versa. Isso e
// consequencia de haver UMA url, nao deste codigo, e e o motivo de a conciliacao de 5.11
// existir (nada aqui prova que houve pagamento).
const HUBLA_WEBHOOK_TOKEN_MP = Deno.env.get('HUBLA_WEBHOOK_TOKEN_MP') ?? '';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const APP_URL = Deno.env.get('APP_URL') ?? 'http://localhost:5174';

// Alarme do "desistiu apos 10 tentativas". Tudo opcional: sem chave, o alarme vira
// console.error e nada quebra. Nenhum valor de segredo mora neste arquivo.
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const ALERTA_EMAIL_FROM = Deno.env.get('ALERTA_EMAIL_FROM') ?? '';
const ALERTA_EMAIL_TO = Deno.env.get('ALERTA_EMAIL_TO') ?? '';

const MEMBER_ADDED = 'customer.member_added';
const MEMBER_REMOVED = 'customer.member_removed';

// Schema do MyPortifolio. NADA deste produto vive em public: public ja tem
// grant_or_revoke_member_access(text,text,boolean), is_admin() e set_updated_at() com
// assinatura identica, e um create or replace substituiria em silencio as do AI Block.
const SCHEMA_MP = 'myportifolio';

// Teto de retentativa do MyPortifolio. Produto fora do mapa nao se conserta sozinho: sem
// teto, a Hubla retenta para sempre e o alarme fica enterrado no log.
const MAX_TENTATIVAS_MP = 10;

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Grava o evento com retentativa curta.
//
// POR QUE ISSO EXISTE: em 03/08/2026 uma compra real se perdeu aqui. O container
// da function subiu com o relogio adiantado em relacao ao Postgres, o JWT saiu
// com `iat` no futuro e o PostgREST recusou com PGRST303 "JWT issued at future".
// A funcao respondia 500, a Hubla nao retentava, e o comprador ficava sem acesso
// sem que nada disparasse alarme. Erro de relogio passa em segundos, entao uma
// retentativa curta resolve a quase totalidade dos casos.
//
// Devolve 'ok' (gravou), 'duplicate' (evento ja processado antes) ou 'failed'
// (nao gravou; quem chama decide o que fazer).
async function registrarEvento(cliente: any, linha: Record<string, unknown>) {
  const TENTATIVAS = 3;
  let ultimoErro: any = null;

  for (let i = 0; i < TENTATIVAS; i++) {
    const { error } = await cliente.from('hubla_events').insert(linha);
    if (!error) return { resultado: 'ok' as const, erro: null };
    // 23505 = unique_violation na PK (id repetido) => evento ja processado.
    if (error.code === '23505') return { resultado: 'duplicate' as const, erro: null };

    ultimoErro = error;
    console.error(`failed to insert hubla_events (tentativa ${i + 1}/${TENTATIVAS})`, error);
    if (i < TENTATIVAS - 1) await sleep(400 * (i + 1));
  }

  return { resultado: 'failed' as const, erro: ultimoErro };
}

// Manda o alarme do dono pelo Resend. Nunca lanca: alarme que derruba o webhook e pior que
// alarme que nao chega, porque o webhook e o caminho do dinheiro.
async function alertarDono(assunto: string, texto: string) {
  console.error(`ALARME MYPORTIFOLIO: ${assunto} | ${texto}`);
  if (!RESEND_API_KEY || !ALERTA_EMAIL_FROM || !ALERTA_EMAIL_TO) return;
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: ALERTA_EMAIL_FROM,
        to: [ALERTA_EMAIL_TO],
        subject: assunto,
        text: texto,
      }),
    });
  } catch (e) {
    console.error('alertarDono: envio falhou', e);
  }
}

// ACHADO 5: o dedupe engolindo a retentativa.
//
// O AI Block trata 23505 como "ja processado, responde 200 e sai". Junto com o 500 de
// proposito (member_added que nao aplicou nada), isso se anula: a retentativa que o proprio
// webhook provocou chega com o MESMO x-hubla-idempotency, bate no 23505 e e descartada. O
// plano de recuperacao nunca roda, e o resultado e pagou, nao entrou, com o gateway achando
// que entregou.
//
// Aqui o 23505 SO vira "concluido" quando a linha existente tem processed_at nao nulo.
// Caso contrario reprocessa, porque a concessao e idempotente (a RPC faz upsert de flag).
//
// Devolve:
//   'ok'         inseriu agora, segue processando
//   'reprocessa' ja existia mas nao concluiu, tentativa contabilizada, segue processando
//   'concluido'  ja existia e concluiu, responder 200 already-processed
//   'desistiu'   ja existia, nao concluiu e estourou o teto, responder 200 para parar o laco
//   'falhou'     nem com 3 tentativas gravou, segue processando SEM auditoria
//
// `temIdMapeado` desliga o teto. O teto existe porque produto FORA DO MAPA nao se conserta
// sozinho: sem ele a Hubla retenta para sempre e o alarme fica enterrado em log. Quando o id
// ja casa no mapa, a causa da falha e outra (banco fora do ar, RPC recusando) e engolir a
// retentativa de uma venda reconhecida seria trocar um defeito por outro pior. E tambem o que
// permite acrescentar o id que faltava, redeployar e reenviar o mesmo evento para concluir.
async function registrarEventoMp(mp: any, linha: Record<string, unknown>, temIdMapeado: boolean) {
  const { resultado, erro } = await registrarEvento(mp, linha);
  if (resultado === 'ok') return { decisao: 'ok' as const, tentativas: 1 };
  if (resultado === 'failed') return { decisao: 'falhou' as const, tentativas: 0, erro };

  const id = linha.id as string;
  const { data, error } = await mp
    .from('hubla_events')
    .select('processed_at, attempts')
    .eq('id', id)
    .maybeSingle();

  // Nao conseguiu ler a linha que acabou de colidir. Escolha deliberada: reprocessar. O pior
  // caso e conceder de novo o que ja estava concedido (inofensivo); o pior caso do contrario
  // e engolir a retentativa de uma venda que nao entrou.
  if (error || !data) {
    console.error('nao consegui ler hubla_events do MyPortifolio apos 23505', { id, error });
    return { decisao: 'reprocessa' as const, tentativas: 0 };
  }

  if (data.processed_at) return { decisao: 'concluido' as const, tentativas: data.attempts };

  const tentativas = (data.attempts ?? 1) + 1;
  await mp
    .from('hubla_events')
    .update({ attempts: tentativas, last_attempt_at: new Date().toISOString() })
    .eq('id', id);

  if (!temIdMapeado && tentativas > MAX_TENTATIVAS_MP) {
    await mp
      .from('hubla_events')
      .update({
        processing_error: `desistiu apos ${MAX_TENTATIVAS_MP} tentativas`,
        processed_result: 'falhou',
      })
      .eq('id', id);
    // Alarme SO na travessia do teto. Sem esta condicao, cada retentativa seguinte da Hubla
    // mandaria mais um e-mail igual, e caixa de entrada entupida e como alarme para de ser
    // lido. processed_at continua nulo de proposito: e ele que permite concluir a venda
    // depois de o id entrar no mapa.
    if (tentativas === MAX_TENTATIVAS_MP + 1) {
      await alertarDono(
        'MyPortifolio: webhook desistiu de um evento da Hubla',
        `Evento ${id} tentou ${tentativas} vezes e nunca concluiu.\n` +
          `E-mail: ${linha.email ?? '(sem e-mail)'}\n` +
          `Produtos: ${JSON.stringify(linha.product_ids)}\n\n` +
          'Provavel causa: productId fora do PRODUCT_FLAG_MAP (o bump de personalizacao ainda ' +
          'nao tem id conhecido). Acrescentar o id, redeployar e reenviar o evento.',
      );
    }
    return { decisao: 'desistiu' as const, tentativas };
  }

  return { decisao: 'reprocessa' as const, tentativas };
}

// Fecha a linha de auditoria do MyPortifolio. So e chamada quando o evento chegou ao fim:
// sem isso processed_at fica nulo de proposito e a proxima retentativa reprocessa.
async function marcarProcessadoMp(
  mp: any,
  id: string,
  resultado: 'ok' | 'ignorado' | 'falhou',
  flags: string[],
  erro?: string | null,
) {
  const patch: Record<string, unknown> = {
    processed_at: new Date().toISOString(),
    processed_result: resultado,
    applied_flags: flags,
  };
  if (erro) patch.processing_error = erro;
  const { error } = await mp.from('hubla_events').update(patch).eq('id', id);
  if (error) console.error('nao consegui marcar processed_at no MyPortifolio', { id, error });
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return json({ error: 'method not allowed' }, 405);
  }

  const receivedToken = req.headers.get('x-hubla-token') ?? '';
  const tokenAiBlockOk = !!HUBLA_WEBHOOK_TOKEN && timingSafeEqual(receivedToken, HUBLA_WEBHOOK_TOKEN);
  const tokenMpOk = !!HUBLA_WEBHOOK_TOKEN_MP && timingSafeEqual(receivedToken, HUBLA_WEBHOOK_TOKEN_MP);
  if (!tokenAiBlockOk && !tokenMpOk) {
    return json({ error: 'invalid token' }, 401);
  }

  const idempotencyId = req.headers.get('x-hubla-idempotency') ?? '';
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidPattern.test(idempotencyId)) {
    return json({ error: 'missing or invalid x-hubla-idempotency header' }, 400);
  }

  const isSandbox = req.headers.get('x-hubla-sandbox') === 'true';

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'invalid json body' }, 400);
  }

  const type = body?.type as string | undefined;
  const eventNode = body?.event ?? {};
  const rawProducts = Array.isArray(eventNode.products) && eventNode.products.length > 0
    ? eventNode.products
    : eventNode.product
    ? [eventNode.product]
    : [];
  const productIds: string[] = rawProducts.map((p: any) => p?.id).filter(Boolean);

  // AS OFERTAS. Este bloco existe porque o MyPortifolio vende DUAS ofertas do MESMO produto
  // (a principal e o order bump de personalizacao), e ler so `products[].id` faz as duas
  // chegarem como se fossem a mesma coisa. Foi o que aconteceu na primeira venda real: dois
  // eventos, o mesmo id de produto nos dois, os dois concedendo 'main', e quem pagou o bump
  // ficou sem has_custom. Sem erro em lugar nenhum, os dois fecharam como 'ok'.
  //
  // Para o AI Block isto e inerte: os tiers dele sao por produto, as chaves de
  // PRODUCT_TIER_MAP sao ids de produto, e id de oferta nunca colide com id de produto
  // (a Hubla os emite no mesmo espaco de ids, unicos por conta).
  const offerIds: string[] = rawProducts
    .flatMap((p: any) => (Array.isArray(p?.offers) ? p.offers : []))
    .map((o: any) => o?.id)
    .filter(Boolean);

  // O que se procura nos mapas: produto E oferta. A ordem nao importa porque o casamento e
  // por chave, e nenhum id aparece nos dois mapas.
  const idsCasaveis: string[] = [...new Set([...productIds, ...offerIds])];
  const email = (eventNode.user?.email ?? '').toString().trim().toLowerCase() || null;

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  // Mesmo cliente, outro schema. As duas RPCs tem nome igual e assinatura quase igual, e e
  // exatamente por isso que a escolha do schema nao pode ficar implicita em lugar nenhum.
  const mp = supabase.schema(SCHEMA_MP);

  // Classificacao dos ids ANTES da auditoria. Precisa vir antes porque o achado 5 muda o
  // tratamento do 23505, e essa mudanca so pode valer para evento que carrega id do
  // MyPortifolio: para o AI Block, 23505 continua sendo 200 na hora, como sempre foi.
  const idsAiBlock = idsCasaveis.filter((id) => !!PRODUCT_TIER_MAP[id]);
  const idsMyPortifolio = idsCasaveis.filter((id) => !!PRODUCT_FLAG_MAP[id]);
  // O id do PRODUTO do MyPortifolio nao concede nada e tambem nao e desconhecido. Sem esta
  // exclusao, toda venda que deu certo gravaria um processing_error dizendo que ele nao esta
  // mapeado, e alarme que dispara em venda boa e alarme que ninguem le.
  const idsDesconhecidos = idsCasaveis.filter(
    (id) => !PRODUCT_TIER_MAP[id] && !PRODUCT_FLAG_MAP[id] && !PRODUTOS_MYPORTIFOLIO.has(id),
  );

  // Id desconhecido tambem entra no caminho do MyPortifolio, e isso e deliberado.
  //
  // POR QUE: o bump de personalizacao ('custom') ainda nao tem id no mapa, e ele e o caso
  // que mais precisa do achado 5. Se evento sem nenhum id reconhecido continuasse no
  // caminho antigo, a sequencia seria: primeiro POST responde 500, a Hubla retenta, o insert
  // em public bate 23505, o codigo responde "already-processed" e a venda morre ali, sem
  // linha nenhuma em myportifolio.hubla_events para o dono descobrir qual e o id que falta.
  //
  // Evento COM id do AI Block nunca cai aqui, entao o produto vizinho nao muda de
  // comportamento. Evento sem nenhum produto no corpo tambem nao, para nao virar ruido.
  const ehMyPortifolio = idsMyPortifolio.length > 0
    || idsCasaveis.some((id) => PRODUTOS_MYPORTIFOLIO.has(id))
    || (idsAiBlock.length === 0 && idsDesconhecidos.length > 0);

  const linhaAuditoria = {
    id: idempotencyId,
    type: type ?? 'unknown',
    product_ids: productIds,
    email,
    is_sandbox: isSandbox,
    payload: body,
  };

  const { resultado: registro, erro: erroRegistro } = await registrarEvento(supabase, linhaAuditoria);

  // Auditoria do MyPortifolio, em myportifolio.hubla_events. E uma tabela separada porque a
  // de public nao tem processed_at/attempts, que e o que o achado 5 exige, e acrescentar
  // coluna na tabela do AI Block seria mexer no produto vizinho.
  //
  // O evento fica gravado NOS DOIS lugares quando e do MyPortifolio. Duplicar auditoria e
  // barato; ter um evento sem rastro em nenhuma das duas nao e.
  let decisaoMp: 'ok' | 'reprocessa' | 'concluido' | 'desistiu' | 'falhou' = 'ok';
  if (ehMyPortifolio) {
    const r = await registrarEventoMp(mp, linhaAuditoria, idsMyPortifolio.length > 0);
    decisaoMp = r.decisao;
  }

  // Caminho do AI Block, intacto: evento repetido responde 200 e sai. So nao vale quando o
  // evento e do MyPortifolio, porque ai quem decide e o achado 5, logo abaixo.
  if (registro === 'duplicate' && !ehMyPortifolio) {
    return json({ status: 'already-processed', idempotencyId });
  }

  // Achado 5 decidindo. As duas saidas abaixo so acontecem quando NAO ha id do AI Block no
  // mesmo evento, para nunca sequestrar o processamento do produto vizinho (na pratica a
  // Hubla manda um evento por produto, mas isso e garantia dela, nao nossa).
  if (ehMyPortifolio && idsAiBlock.length === 0) {
    if (decisaoMp === 'concluido') {
      return json({ status: 'already-processed', idempotencyId });
    }
    if (decisaoMp === 'desistiu') {
      // 200 de proposito: a linha ja esta marcada como falhou e o dono ja foi alertado.
      // Continuar respondendo 500 aqui so alimentaria o laco da Hubla para sempre.
      return json({ status: 'giving-up', idempotencyId, email, productIds }, 200);
    }
  }

  // Se nem com retentativa deu pra gravar, a compra SEGUE sendo processada.
  // A auditoria e a deduplicacao sao importantes, mas nao valem uma venda: o
  // pior caso de processar duas vezes e conceder um tier que ja estava
  // concedido (a RPC e idempotente) e um convite que volta email_exists, que o
  // codigo ja ignora. O pior caso de abortar e o comprador pagar e nao entrar.
  const auditoriaFalhou = registro === 'failed';
  if (auditoriaFalhou) {
    console.error('PROSSEGUINDO SEM AUDITORIA: evento nao gravado', {
      idempotencyId,
      email,
      productIds,
      erro: erroRegistro,
    });
  }
  const auditoriaMpFalhou = ehMyPortifolio && decisaoMp === 'falhou';
  const podeMarcarMp = ehMyPortifolio && !auditoriaMpFalhou;

  if (isSandbox) {
    // Sandbox nao concede nada, nos dois produtos. E o unico jeito de testar a function
    // contra a Hubla de verdade sem criar acesso.
    if (podeMarcarMp) await marcarProcessadoMp(mp, idempotencyId, 'ignorado', []);
    return json({ status: 'sandbox-logged', idempotencyId });
  }

  if (type !== MEMBER_ADDED && type !== MEMBER_REMOVED) {
    if (podeMarcarMp) await marcarProcessadoMp(mp, idempotencyId, 'ignorado', []);
    return json({ status: 'ignored-unsupported-type', type, idempotencyId });
  }

  if (!email) {
    if (!auditoriaFalhou) {
      await supabase
        .from('hubla_events')
        .update({ processing_error: 'missing event.user.email' })
        .eq('id', idempotencyId);
    }
    if (podeMarcarMp) {
      await marcarProcessadoMp(mp, idempotencyId, 'ignorado', [], 'missing event.user.email');
    }
    return json({ status: 'ignored-missing-email', idempotencyId });
  }

  const granted = type === MEMBER_ADDED;
  const unmappedProductIds: string[] = [];
  const appliedTiers: string[] = [];
  const appliedFlags: string[] = [];

  for (const productId of idsCasaveis) {
    // Produto nosso nao concede: quem concede e a oferta, que vem no mesmo laco. Sair aqui
    // sem registrar nada e o que faz uma venda certa nao gerar alarme falso.
    if (PRODUTOS_MYPORTIFOLIO.has(productId)) continue;

    const tier = PRODUCT_TIER_MAP[productId];

    if (!tier) {
      // O "else if" que o plano pede. Id que nao e do AI Block ainda pode ser do
      // MyPortifolio, e so depois de falhar nos DOIS mapas ele e de fato desconhecido.
      const flag = PRODUCT_FLAG_MAP[productId];
      if (!flag) {
        unmappedProductIds.push(productId);
        continue;
      }
      // p_source declarado e o que torna a conciliacao de 5.11 possivel: ela so pergunta
      // "esta linha tem venda na Hubla?" para as linhas 'hubla'. Cortesia e concessao manual
      // se declaram por outros caminhos e nao viram falso positivo de fraude.
      const { error: rpcErrorMp } = await mp.rpc('grant_or_revoke_member_access', {
        p_email: email,
        p_product: flag,
        p_granted: granted,
        p_source: 'hubla',
      });
      if (rpcErrorMp) {
        console.error('myportifolio.grant_or_revoke_member_access failed', rpcErrorMp);
        unmappedProductIds.push(`${productId} (rpc-error-mp)`);
        continue;
      }
      appliedFlags.push(flag);
      continue;
    }

    const { error: rpcError } = await supabase.rpc('grant_or_revoke_member_access', {
      p_email: email,
      p_tier: tier,
      p_granted: granted,
    });
    if (rpcError) {
      console.error('grant_or_revoke_member_access failed', rpcError);
      unmappedProductIds.push(`${productId} (rpc-error)`);
      continue;
    }
    appliedTiers.push(tier);
  }

  const processingErrors: string[] = [];
  if (unmappedProductIds.length > 0) {
    processingErrors.push(`unmapped product ids: ${unmappedProductIds.join(', ')}`);
  }

  // Acesso concedido cria a conta do comprador (sem senha) e dispara o e-mail
  // de convite padrao do Supabase, com link pra ele definir uma senha e entrar.
  // email_exists = comprador recorrente/ja convidado antes, nao e erro.
  if (granted && appliedTiers.length > 0) {
    const { error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email, {
      redirectTo: APP_URL,
    });
    if (inviteError && inviteError.code !== 'email_exists') {
      console.error('inviteUserByEmail failed', inviteError);
      processingErrors.push(`inviteUserByEmail: ${inviteError.message ?? inviteError.code ?? 'unknown error'}`);
    }
  }

  // MyPortifolio nao usa convite por link: o login e codigo de 6 digitos no e-mail, entao a
  // conta nasce ja confirmada e sem senha. Roda em QUALQUER flag concedida, nao so na 'main',
  // porque a ordem de chegada dos eventos nao e garantida e o bump pode chegar primeiro.
  if (granted && appliedFlags.length > 0) {
    const { error: createError } = await supabase.auth.admin.createUser({
      email,
      email_confirm: true,
    });
    if (createError && createError.code !== 'email_exists') {
      console.error('createUser (MyPortifolio) failed', createError);
      processingErrors.push(`createUser: ${createError.message ?? createError.code ?? 'unknown error'}`);
    }
  }

  // Facilitacao e trabalho humano. Sem a linha na fila, vende e nao entrega: o comprador que
  // pagou por "nos montamos" fica olhando um editor vazio e nada aparece no painel do dono.
  // A linha so nasce na concessao; a revogacao ja e tratada pelo trigger member_access_sync_setup.
  if (granted && appliedFlags.includes('setup')) {
    const { error: filaError } = await mp
      .from('setup_requests')
      .upsert({ email }, { onConflict: 'email', ignoreDuplicates: true });
    if (filaError) {
      console.error('setup_requests upsert failed', filaError);
      processingErrors.push(`setup_requests: ${filaError.message ?? 'unknown error'}`);
    }
  }

  if (processingErrors.length > 0 && !auditoriaFalhou) {
    await supabase
      .from('hubla_events')
      .update({ processing_error: processingErrors.join(' | ') })
      .eq('id', idempotencyId);
  }

  // Sem tier aplicado num member_added o comprador fica pagando sem entrar, que
  // e o pior defeito possivel aqui. Responder 500 faz a Hubla retentar, e a
  // retentativa e inofensiva porque a concessao e idempotente.
  //
  // A soma dos dois contadores e o que devolve sentido ao 500: ele agora significa "nenhum
  // dos dois produtos reconheceu este id". Para um evento do AI Block appliedFlags e sempre
  // vazio, entao a condicao continua exatamente a de antes.
  //
  // E aqui processed_at do MyPortifolio fica NULO de proposito: e o que faz a proxima
  // retentativa reprocessar em vez de ser engolida pelo dedupe (achado 5).
  if (granted && appliedTiers.length + appliedFlags.length === 0) {
    console.error('NENHUM TIER APLICADO num member_added', { idempotencyId, email, productIds });
    if (podeMarcarMp) {
      await mp
        .from('hubla_events')
        .update({ processing_error: processingErrors.join(' | ') || 'nenhuma flag aplicada' })
        .eq('id', idempotencyId);
    }
    return json(
      { status: 'no-tier-applied', idempotencyId, email, productIds, unmappedProductIds },
      500
    );
  }

  if (podeMarcarMp) {
    await marcarProcessadoMp(
      mp,
      idempotencyId,
      appliedFlags.length > 0 ? 'ok' : 'ignorado',
      appliedFlags,
      processingErrors.join(' | ') || null,
    );
  }

  return json({
    status: 'processed',
    idempotencyId,
    email,
    granted,
    appliedTiers,
    appliedFlags,
    unmappedProductIds,
    auditoriaFalhou,
    auditoriaMpFalhou,
  });
});
