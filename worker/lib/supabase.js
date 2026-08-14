// Acesso ao Supabase por `fetch` puro no PostgREST. NAO existe `@supabase/supabase-js`
// aqui, e isso e regra de fronteira e nao preferencia: o cliente oficial carrega realtime,
// storage e auth para fazer um POST com dois headers, e ele so pertence ao bundle do editor.
//
// Duas chamadas, e as duas com timeout curto: o caminho de miss do tenant faz um round trip
// a sa-east-1 e o visitante esta esperando. Sem `AbortSignal.timeout`, um Supabase lento
// (que e o caso comum, bem mais comum que Supabase fora do ar) segura o request ate o teto
// da plataforma em vez de cair na copia de socorro em 1,5 s.

export class ErroSupabase extends Error {
  constructor(mensagem, detalhe) {
    super(mensagem);
    this.name = 'ErroSupabase';
    this.detalhe = detalhe;
  }
}

const TIMEOUT_PADRAO = 1500;

function cabecalhos(cfg, chave) {
  return {
    'content-type': 'application/json',
    accept: 'application/json',
    apikey: chave,
    authorization: `Bearer ${chave}`,
    // O produto vive num schema proprio porque o projeto Supabase e compartilhado com o AI
    // Block. Sem estes dois headers o PostgREST procura em `public` e responde 404 numa
    // funcao que existe, que e o erro mais caro de diagnosticar deste arquivo.
    'accept-profile': cfg.schema,
    'content-profile': cfg.schema,
  };
}

// Chama uma RPC. `servico: true` usa a service role key, e existe para uma rota so.
export async function rpc(cfg, nome, args = {}, { timeoutMs = TIMEOUT_PADRAO, servico = false } = {}) {
  const chave = servico ? cfg.serviceKey : cfg.anonKey;
  if (!cfg.supabaseUrl || !chave) throw new ErroSupabase('credencial do Supabase ausente no env');

  let r;
  try {
    r = await fetch(`${cfg.supabaseUrl}/rest/v1/rpc/${nome}`, {
      method: 'POST',
      headers: cabecalhos(cfg, chave),
      body: JSON.stringify(args),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (e) {
    throw new ErroSupabase(`rpc ${nome} nao respondeu`, String(e));
  }
  if (!r.ok) throw new ErroSupabase(`rpc ${nome} respondeu ${r.status}`, await r.text().catch(() => ''));
  return r.json();
}

// Assina uma URL de vida curta para um objeto do bucket PRIVADO. Unico uso da service key
// no subdominio do tenant, e por isso ela nunca aparece no corpo de nada: o Worker responde
// 302 e o visitante busca os bytes direto no Storage.
export async function assinarDocumento(cfg, caminho, expiraEmSeg = 120) {
  if (!cfg.serviceKey) throw new ErroSupabase('SUPABASE_SERVICE_ROLE_KEY ausente');
  const alvo = `${cfg.supabaseUrl}/storage/v1/object/sign/${cfg.bucketDocs}/${caminho}`;
  let r;
  try {
    r = await fetch(alvo, {
      method: 'POST',
      headers: cabecalhos(cfg, cfg.serviceKey),
      body: JSON.stringify({ expiresIn: expiraEmSeg }),
      signal: AbortSignal.timeout(TIMEOUT_PADRAO),
    });
  } catch (e) {
    throw new ErroSupabase('storage nao respondeu', String(e));
  }
  if (!r.ok) throw new ErroSupabase(`storage respondeu ${r.status}`, await r.text().catch(() => ''));
  const corpo = await r.json();
  const relativa = corpo && corpo.signedURL;
  if (!relativa) throw new ErroSupabase('storage nao devolveu signedURL');
  return `${cfg.supabaseUrl}/storage/v1${relativa}`;
}

// Keep-alive do projeto Supabase. O `cron.schedule` do 0001 e paliativo interno do Postgres
// e nao conta como REQUISICAO, que e o que a contagem de inatividade do plano free olha
// (suposicao S5). Aqui e um GET de verdade no PostgREST, barato e sem efeito colateral.
export async function ping(cfg) {
  const r = await fetch(`${cfg.supabaseUrl}/rest/v1/`, {
    method: 'GET',
    headers: { apikey: cfg.anonKey, authorization: `Bearer ${cfg.anonKey}` },
    signal: AbortSignal.timeout(5000),
  });
  return r.status;
}
