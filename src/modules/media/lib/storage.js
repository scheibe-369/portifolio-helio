import { supabase, SUPABASE_URL } from '../../../shared/supabase/client.js';

// Porta unica do editor para o Storage. Zona [browser].
//
// O cliente NAO escreve em portfolio_media, e nao e esquecimento: o `insert` foi revogado de
// authenticated de proposito. A linha nasce do trigger storage_registrar_midia() sobre
// storage.objects, que le metadata->>'size', ou seja, o tamanho REAL do objeto, e compara com
// a cota. A versao anterior desse desenho deixava o front informar `bytes`, e o front mentia.
//
// Consequencia pratica que aparece aqui: "cota de midia excedida" chega como erro do UPLOAD,
// nao de um insert nosso. Por isso traduzirErro existe, senao o comprador ve um erro de
// storage cru numa tela que ele acabou de pagar.

export const BUCKET_MIDIA = 'portfolio-media';
export const BUCKET_DOCS = 'portfolio-docs';

export const baseMidiaPublica = () => `${SUPABASE_URL}/storage/v1/object/public/${BUCKET_MIDIA}`;

function traduzirErro(erro) {
  const m = String(erro?.message || erro || '');
  if (/cota de midia excedida/i.test(m)) return 'Seu espaco de arquivos acabou. Apague algo antes de subir mais.';
  if (/limite de arquivos/i.test(m)) return 'Voce atingiu o limite de arquivos do plano.';
  if (/exceeded the maximum allowed size|Payload too large/i.test(m)) return 'Arquivo acima do tamanho permitido.';
  if (/mime type .* is not supported|invalid_mime_type/i.test(m)) return 'Tipo de arquivo nao aceito.';
  if (/row-level security|Unauthorized|403/i.test(m)) return 'Sem permissao para enviar este arquivo.';
  return m || 'nao foi possivel enviar o arquivo';
}

export async function subirArquivo({ bucket, caminho, blob, mime }) {
  const { error } = await supabase.storage.from(bucket).upload(caminho, blob, {
    contentType: mime,
    // upsert false porque o nome ja e enderecado por conteudo: mesmo conteudo, mesmo nome, e
    // conteudo novo sempre gera nome novo. Colisao aqui significa reenvio do MESMO arquivo, e
    // tratar isso como sucesso e o certo.
    upsert: false,
    cacheControl: '31536000',
  });
  if (error && !/already exists|Duplicate/i.test(String(error.message))) {
    throw new Error(traduzirErro(error));
  }
  return caminho;
}

// Apagar o objeto SUBSTITUIDO no mesmo passo do upload e obrigacao do editor, escrita em
// 6.5.1: o trigger de exclusao so marca orfao quando a LINHA e apagada, entao arquivo trocado
// sem esta limpeza fica ocupando cota para sempre sem ninguem apontando para ele.
export async function apagarArquivo({ bucket, caminho }) {
  if (!caminho) return;
  const { error } = await supabase.storage.from(bucket).remove([caminho]);
  // Falha ao apagar o antigo NAO derruba a troca: o arquivo novo ja subiu e a pagina do
  // comprador tem que ficar certa. O que sobra e cota presa, que a faxina de orfao resolve.
  if (error) console.warn('nao consegui apagar o arquivo antigo', caminho, error);
}

// URL assinada, curta, para o dono conferir o proprio documento dentro do editor. O bucket de
// documento e PRIVADO e nao tem policy de select publica: quem entrega o arquivo ao visitante
// e a rota /certificado/ do Worker, e so quando o consentimento estiver ligado.
export async function urlAssinadaDoc(caminho, segundos = 300) {
  if (!caminho) return '';
  const { data, error } = await supabase.storage.from(BUCKET_DOCS).createSignedUrl(caminho, segundos);
  if (error) throw new Error(traduzirErro(error));
  return data.signedUrl;
}
