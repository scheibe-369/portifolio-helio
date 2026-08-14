// UNICO ponto do Worker que le `env`. Nao e organizacao, e defesa.
//
// O objeto de ambiente que o Vite injeta no front (o `env` pendurado em `import.meta`) NAO
// existe dentro do Worker: quem copiar uma linha do front recebe `undefined` em producao, sem
// erro de build e sem erro em runtime, e o Worker sai chamando `undefined/rest/v1/rpc/...`.
// Concentrar a leitura aqui faz esse erro ser um arquivo so para revisar, e a zona `worker`
// do boundary.config.json reprova o build se o nome do objeto do Vite aparecer no grafo.
//
// Var (wrangler.jsonc, publica) vs secret (`wrangler secret put`, nunca versionado):
//   vars    APEX_HOST, CACHE_NS, APEX_SLUG, SUPABASE_SCHEMA
//   secrets SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

// Formato de payload que este Worker sabe renderizar. Maior que isto significa banco mais
// novo que o Worker (janela de deploy) e a resposta e 503, nunca render de formato do
// futuro (secao 4.9 do plano).
export const PAYLOAD_V_CORRENTE = 2;

const PADROES = {
  APEX_HOST: 'myportifolio.com.br',
  CACHE_NS: 'v1',
  // O apex serve o portfolio do Helio pelo MESMO caminho de tenant (secao 9.8). Ele e um
  // tenant de verdade no banco, e por isso 'helio' nao esta em reserved_slugs.
  APEX_SLUG: 'helio',
  // O banco e compartilhado com o AI Block: tudo deste produto vive no schema proprio, e o
  // PostgREST so enxerga esse schema com o header de profile em toda chamada.
  SUPABASE_SCHEMA: 'myportifolio',
  BUCKET_MIDIA: 'portfolio-media',
  BUCKET_DOCS: 'portfolio-docs',
};

const texto = (env, nome) => {
  const v = env && env[nome];
  return v == null || v === '' ? PADROES[nome] : String(v);
};

export function lerEnv(env) {
  const supabaseUrl = String((env && env.SUPABASE_URL) || '').replace(/\/+$/, '');
  const bucketMidia = texto(env, 'BUCKET_MIDIA');
  return Object.freeze({
    apexHost: texto(env, 'APEX_HOST').toLowerCase(),
    apexSlug: texto(env, 'APEX_SLUG').toLowerCase(),
    cacheNs: texto(env, 'CACHE_NS'),
    schema: texto(env, 'SUPABASE_SCHEMA'),
    supabaseUrl,
    anonKey: String((env && env.SUPABASE_ANON_KEY) || ''),
    // Usada em EXATAMENTE uma rota deste arquivo de rotas: /certificado/<slug>, que assina
    // URL de vida curta no bucket privado. O caminho quente do tenant nunca a toca.
    serviceKey: String((env && env.SUPABASE_SERVICE_ROLE_KEY) || ''),
    bucketMidia,
    bucketDocs: texto(env, 'BUCKET_DOCS'),
    // O payload publicado guarda CAMINHO RELATIVO (achado 12). Quem monta a URL absoluta e
    // o Worker, no instante do request, e por isso trocar de storage vira deploy em vez de
    // republicar a base inteira.
    mediaBase: supabaseUrl ? `${supabaseUrl}/storage/v1/object/public/${bucketMidia}` : '',
  });
}

// Sem estes dois nao existe leitura publica nenhuma. Falhar cedo e barulhento e melhor do
// que cada tenant responder 503 sem ninguem saber por que.
export const temSupabase = (cfg) => Boolean(cfg.supabaseUrl && cfg.anonKey);
