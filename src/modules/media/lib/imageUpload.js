import { prepararImagem } from './imagePipeline.js';
import { subirArquivo, apagarArquivo, BUCKET_MIDIA, baseMidiaPublica } from './storage.js';

// Converte, sobe e limpa o objeto substituido. Zona [browser].
//
// Ele mora aqui, e nao dentro do campo de imagem do editor, por uma razao que se paga em
// teste: o RENDER do campo precisa ser carregavel sem o cliente do Supabase junto. Com as duas
// coisas no mesmo arquivo, desenhar um formulario passava a exigir credencial de banco.
//
// Apagar o `caminhoAnterior` NO MESMO PASSO e obrigacao escrita em 6.5.1: o trigger de
// exclusao so marca orfao quando a LINHA e apagada, entao imagem trocada sem esta limpeza fica
// ocupando cota para sempre sem ninguem apontando para ela.
export async function processarImagem(arquivo, { destino, portfolioId, nome, caminhoAnterior }) {
  const pronto = await prepararImagem(arquivo, { destino, portfolioId, nome });
  await subirArquivo({ bucket: BUCKET_MIDIA, caminho: pronto.caminho, blob: pronto.blob, mime: pronto.mime });
  if (caminhoAnterior && caminhoAnterior !== pronto.caminho) {
    await apagarArquivo({ bucket: BUCKET_MIDIA, caminho: caminhoAnterior });
  }
  URL.revokeObjectURL(pronto.previewUrl);
  return { caminho: pronto.caminho, mime: pronto.mime, url: `${baseMidiaPublica()}/${pronto.caminho}` };
}
