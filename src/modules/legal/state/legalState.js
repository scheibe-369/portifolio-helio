import { supabase } from '../../../shared/supabase/client.js';
import { chamarFuncao } from '../../../shared/supabase/edgeFn.js';
import { TERMS_VERSION, PRAZOS } from '../data/legal.config.js';

// Estado do pacote juridico: aceite dos termos, exportacao, exclusao e arrependimento.
//
// Nenhuma destas funcoes decide nada sozinha. Todas chamam objeto do banco, porque a regra
// tem que valer tambem para quem chamar a API direto, e nao so para quem passar pela tela.

// ------------------------------------------------------------------ aceite dos termos

// Le o consentimento do proprio titular. A policy de terms_consents ja filtra por
// current_purchase_email(), entao esta consulta nunca enxerga o aceite de outra pessoa.
//
// A versao vigente vem da constante do repositorio e NAO de app_settings porque
// app_settings nao tem grant de leitura para authenticated (so admin le). As duas precisam
// andar juntas: subir uma sem a outra e o modo de falha desta funcao.
export async function precisaAceitarTermos() {
  const { data, error } = await supabase
    .from('terms_consents')
    .select('terms_version')
    .eq('terms_version', TERMS_VERSION)
    .maybeSingle();
  if (error) {
    console.error('falhou leitura de terms_consents', error);
    // Falha FECHADA: sem conseguir provar que ja aceitou, pede o aceite. O contrario
    // deixaria o editor abrir sem consentimento sempre que o banco tossisse.
    return true;
  }
  return !data;
}

// O aceite passa por Edge Function, e nao por RPC direta do browser, por um motivo unico: o
// IP que vale como prova e o CF-Connecting-IP que o servidor ve, nunca um campo que o
// proprio browser preenche. Consentimento com IP informado pelo cliente nao prova nada.
export async function aceitarTermos() {
  const r = await chamarFuncao('accept-terms', { version: TERMS_VERSION });
  if (!r.ok) throw new Error(r.json?.error || 'nao-foi-possivel-registrar-aceite');
  return r.json;
}

// ------------------------------------------------------------------ exportar (LGPD art. 18)

// Devolve o JSON de exportacao ja com as URLs assinadas da midia resolvidas.
//
// As imagens e os certificados vao como LISTA DE URLS de vida curta, e nao como zip: montar
// zip no browser para dezenas de arquivos e um projeto inteiro, e a lista ja resolve o
// direito de portabilidade. O certificado e o item que mais importa nessa lista, porque e o
// unico arquivo do produto que fica em bucket privado e o titular nao consegue pegar sozinho.
export async function exportarMeusDados() {
  const { data, error } = await supabase.rpc('export_my_data');
  if (error) throw error;

  const midias = Array.isArray(data?.media) ? data.media : [];
  const porBucket = new Map();
  for (const m of midias) {
    if (!m?.bucket || !m?.path) continue;
    if (!porBucket.has(m.bucket)) porBucket.set(m.bucket, []);
    porBucket.get(m.bucket).push(m.path);
  }

  const assinadas = {};
  for (const [bucket, caminhos] of porBucket) {
    const { data: urls, error: erroUrl } = await supabase.storage
      .from(bucket)
      .createSignedUrls(caminhos, 3600);
    if (erroUrl) {
      console.error('falhou assinar urls do bucket', bucket, erroUrl);
      continue;
    }
    for (const u of urls || []) assinadas[`${bucket}/${u.path}`] = u.signedUrl;
  }

  return {
    ...data,
    _exportado_em: new Date().toISOString(),
    _aviso_urls:
      'Os links de arquivo abaixo expiram em 1 hora. Baixe os arquivos agora ou gere uma exportação nova depois.',
    media: midias.map((m) => ({ ...m, url: assinadas[`${m.bucket}/${m.path}`] ?? null })),
  };
}

// ------------------------------------------------------------------ apagar (LGPD art. 18)

// Tira o portfolio do ar na hora e agenda a exclusao. A purga real e um job diario, nao esta
// chamada: e a carencia que existe porque "apagar minha conta" clicado com raiva as 2 da
// manha e irreversivel e gera o pior ticket possivel.
export async function pedirExclusao() {
  const { data, error } = await supabase.rpc('request_account_deletion');
  if (error) throw error;
  return data; // timestamptz do prazo
}

// O par da funcao acima. Devolve false, sem erro, quando nao havia pedido em aberto, porque
// clicar duas vezes no link do e-mail e o comportamento normal de quem esta nervoso.
export async function cancelarExclusao() {
  const { data, error } = await supabase.rpc('cancel_account_deletion');
  if (error) throw error;
  return data === true;
}

// ------------------------------------------------------------------ arrependimento (CDC 49)

// Prazo aberto? Le main_granted_at, e nao granted_at: comprar um item adicional depois nao
// pode reabrir um prazo que ja venceu.
export function diasDeArrependimentoRestantes(mainGrantedAt) {
  if (!mainGrantedAt) return 0;
  const inicio = new Date(mainGrantedAt).getTime();
  const fim = inicio + PRAZOS.arrependimentoDias * 24 * 60 * 60 * 1000;
  const resta = fim - Date.now();
  return resta <= 0 ? 0 : Math.ceil(resta / (24 * 60 * 60 * 1000));
}

// O pedido passa por Edge Function porque refund_requests nao tem grant de escrita para
// authenticated (e nao deve ter: within_cdc e a PROVA de que o pedido entrou no prazo, e
// prova preenchida pelo proprio interessado nao e prova). O servidor recalcula o prazo a
// partir de main_granted_at e congela o resultado na linha.
export async function pedirReembolso(motivo) {
  const r = await chamarFuncao('request-refund', { reason: motivo || null });
  if (!r.ok) throw new Error(r.json?.error || 'nao-foi-possivel-registrar-pedido');
  return r.json;
}
