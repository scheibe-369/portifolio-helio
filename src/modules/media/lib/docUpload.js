import { prepararImagem, montarCaminho, ErroDeImagem } from './imagePipeline.js';
import { subirArquivo, apagarArquivo, BUCKET_DOCS } from './storage.js';
import { TIPOS_DOC, TETO_PDF, ehPdf } from './docTipos.js';

// Upload de DOCUMENTO. Zona [browser]. Este e o unico arquivo do produto que sobe sem ter
// sido gerado por nos, e essa frase e a razao tecnica de tudo que esta aqui.
//
// Toda imagem do produto e um blob que nos criamos a partir de um canvas (imagePipeline.js).
// O PDF nao e, e nao tem como ser: nao existe re-encode de PDF no browser, e forjar um seria
// dependencia nova e risco novo. Entao o PDF sobe como veio, e o cliente NAO protege nada.
// As duas barreiras sao de servidor, as mesmas de sempre: o file_size_limit de 3 MB do bucket
// portfolio-docs e o trigger de cota. A recusa daqui e educacao, para nao fazer o comprador
// esperar um upload que vai morrer na porta.
//
// E e por nao ser gerado por nos que ele vai para bucket PRIVADO e sai por /certificado/<slug>
// com 302 para URL assinada, em vez de ser servido pelo nosso origin: PDF sabe executar
// JavaScript. Pelo mesmo motivo, nada aqui e nem no campo que usa este modulo embute o
// documento (nenhum iframe, embed ou object): o criterio 10 de 6.11 verifica isso por grep.

async function hash8(blob) {
  const buf = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
  return [...new Uint8Array(buf)].slice(0, 4).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Sobe um certificado e devolve { caminho, mime, bytes, nomeOriginal, previewUrl }.
 * `caminhoAnterior` e apagado no mesmo passo, pela regra de 6.5.1.
 */
export async function subirCertificado(arquivo, { portfolioId, slug, caminhoAnterior }) {
  // Checagem por file.type, NUNCA pela extensao. Um .pdf renomeado para .png e recusado aqui
  // e, se passar, recusado pelo bucket.
  if (!TIPOS_DOC.includes(arquivo.type)) {
    throw new ErroDeImagem('formato nao aceito. Envie PDF, JPG, PNG ou WebP.');
  }

  let caminho;
  let mime;
  let bytes;
  let previewUrl;

  if (ehPdf(arquivo.type)) {
    if (arquivo.size > TETO_PDF) {
      throw new ErroDeImagem('PDF acima de 3 MB. Reduza o arquivo (menos paginas ou menor resolucao).');
    }
    const h = await hash8(arquivo);
    caminho = montarCaminho({ portfolioId, pasta: 'certificate', nome: slug, hash: h, ext: 'pdf' });
    mime = 'application/pdf';
    bytes = arquivo.size;
    previewUrl = URL.createObjectURL(arquivo);
    await subirArquivo({ bucket: BUCKET_DOCS, caminho, blob: arquivo, mime });
  } else {
    // Imagem passa pelo pipeline com o destino 'certificate': SEM crop e com orcamento de
    // 500 KB, porque o teste aqui e "da para ler", nao "carrega rapido".
    const pronto = await prepararImagem(arquivo, { destino: 'certificate', portfolioId, nome: slug });
    caminho = pronto.caminho;
    mime = pronto.mime;
    bytes = pronto.blob.size;
    previewUrl = pronto.previewUrl;
    await subirArquivo({ bucket: BUCKET_DOCS, caminho, blob: pronto.blob, mime });
  }

  if (caminhoAnterior && caminhoAnterior !== caminho) {
    await apagarArquivo({ bucket: BUCKET_DOCS, caminho: caminhoAnterior });
  }

  return { caminho, mime, bytes, nomeOriginal: arquivo.name, previewUrl };
}
