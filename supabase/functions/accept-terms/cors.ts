// Cabecalhos de CORS e o tratamento de OPTIONS.
//
// ISTO NAO E BUROCRACIA: sem o 204 no preflight, o navegador nunca chega a mandar o POST. O
// guard de metodo devolve 405 SEM Access-Control-Allow-Origin, o front so consegue mostrar
// "Failed to send a request to the Edge Function", e isso ja custou meia hora de depuracao
// no AI Block por causa de um cabecalho.
//
// O arquivo e copiado em cada function de proposito: uma pasta _shared torna toda function
// dependente do mesmo deploy, e a hubla-webhook nao pode quebrar por uma mudanca de CORS
// feita para a tela de login.
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function preflight(req: Request): Response | null {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  return null;
}

export function json(corpo: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { ...corsHeaders, 'content-type': 'application/json', ...extra },
  });
}
