// Pipeline de imagem do editor. Zona [browser]: usa canvas, e canvas so existe aqui.
//
// REGRA DO DONO, que aqui e tambem controle de seguranca: o arquivo ORIGINAL nunca sobe. O
// que vai para o Storage e sempre um blob que NOS geramos a partir de um canvas, em WebP.
// Isso mata metadado (EXIF com GPS da foto de celular), mata payload escondido dentro de um
// arquivo que se diz imagem, e segura a cota, que sob pagamento unico e custo eterno.
//
// E ele e CONVENIENCIA, nao protecao: roda no browser do cliente, que e territorio do
// atacante. Quem protege de verdade sao as tres camadas de servidor (file_size_limit e
// allowed_mime_types do bucket, o trigger storage_registrar_midia com a cota, e o CHECK de
// prefixo de pasta em cada coluna de caminho). Este arquivo existe para o comprador honesto
// nao esperar um upload que morreria na porta.
//
// O QUE FOI CORTADO DE PROPOSITO (tabela de cortes de 6.1): cropper livre com Pointer
// Events, extracao de paleta por canvas, deteccao de image_fit por canal alpha e colar com
// Ctrl+V. O crop e central e fixo pela proporcao do destino, e o unico controle de
// enquadramento e o slider de object-position do hero, que ja e coluna no banco.

// Allowlist de ENTRADA. SVG e GIF ficam de fora e a ausencia e a decisao: SVG e HTML
// disfarcado de imagem (ele carrega <script>), e GIF nao tem uso neste produto.
export const TIPOS_ACEITOS = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];

// 15 MB e o teto ANTES de decodificar. Decodificar 50 MP estoura a memoria do celular antes
// de qualquer canvas existir, entao a recusa precisa vir do tamanho do arquivo, que e o
// unico numero conhecido nesse instante.
const TETO_BYTES_ENTRADA = 15 * 1024 * 1024;
const TETO_PIXELS = 50 * 1000 * 1000;

// Um destino por lugar onde a imagem aparece. Orcamento diferente por destino porque um
// numero solto nao reprova nada: 90 KB e generoso para um card e absurdo para um avatar.
export const DESTINOS = {
  avatar: { pasta: 'avatar', proporcao: 1, lado: 512, orcamento: 25 * 1024 },
  hero: { pasta: 'hero', proporcao: 4 / 5, lado: 1000, orcamento: 120 * 1024 },
  project: { pasta: 'project', proporcao: 3 / 2, lado: 1200, orcamento: 90 * 1024 },
  // A placa da experiencia e quadrada (w-14 h-14) e NAO tem padding no CSS, de proposito: o
  // respiro vem assado no WebP, igual em todas as logos. Padding por cima reintroduziria a
  // margem dobrada que fazia cada logo aparecer num tamanho diferente na fileira.
  experience: { pasta: 'experience', proporcao: 1, lado: 256, orcamento: 90 * 1024, margem: 0.8 },
  // Documento nao e cortado: cortar certificado corta assinatura e rodape, que e o oposto do
  // que a pessoa quer. E o orcamento e outro porque o teste aqui e "da para ler", nao
  // "carrega rapido": o arquivo nem entra na pagina, entra atras de um clique.
  certificate: { pasta: 'certificate', proporcao: null, lado: 2000, orcamento: 500 * 1024 },
};

export class ErroDeImagem extends Error {}

// Decodifica respeitando o EXIF. Sem `imageOrientation`, a foto de celular entra deitada, e
// o comprador culpa o produto por uma rotacao que o arquivo dele ja trazia.
async function decodificar(arquivo) {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(arquivo, { imageOrientation: 'from-image' });
    } catch {
      // cai no fallback
    }
  }
  const url = URL.createObjectURL(arquivo);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Reducao em degraus: dividir por 2 ate faltar menos de 2x. Um unico drawImage de 4000 px
// para 256 px produz aliasing visivel, e o defeito aparece justamente na logo pequena.
function reduzirEmDegraus(fonte, larguraFonte, alturaFonte, larguraAlvo, alturaAlvo) {
  let atual = document.createElement('canvas');
  atual.width = larguraFonte;
  atual.height = alturaFonte;
  atual.getContext('2d').drawImage(fonte, 0, 0, larguraFonte, alturaFonte);

  let l = larguraFonte;
  let a = alturaFonte;
  while (l / 2 > larguraAlvo && a / 2 > alturaAlvo) {
    const proximo = document.createElement('canvas');
    proximo.width = Math.max(1, Math.round(l / 2));
    proximo.height = Math.max(1, Math.round(a / 2));
    const ctx = proximo.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(atual, 0, 0, proximo.width, proximo.height);
    atual = proximo;
    l = proximo.width;
    a = proximo.height;
  }
  return atual;
}

// Guarda obrigatoria do toBlob: pela especificacao, tipo nao suportado cai em image/png EM
// SILENCIO. Sem checar blob.type, o produto acha que subiu WebP de 40 KB e subiu PNG de
// 900 KB, e a cota some sem ninguem entender. Por isso o bucket aceita image/png e image/jpeg
// na allowlist: a queda existe e e prevista.
function paraBlob(canvas, tipo, qualidade) {
  return new Promise((resolve) => canvas.toBlob(resolve, tipo, qualidade));
}

async function codificarDentroDoOrcamento(canvas, orcamento) {
  // Duas tentativas extras e o teto, e nao um laco: cada re-encode e um congelamento de UI
  // no celular, e abaixo de 0.62 a imagem fica pior do que o problema que ela resolve.
  for (const q of [0.82, 0.72, 0.62]) {
    let blob = await paraBlob(canvas, 'image/webp', q);
    if (!blob || blob.type !== 'image/webp') blob = await paraBlob(canvas, 'image/jpeg', 0.85);
    if (!blob) throw new ErroDeImagem('nao foi possivel converter a imagem neste navegador');
    if (blob.size <= orcamento) return blob;
    if (blob.type !== 'image/webp') break; // sem WebP, insistir na qualidade nao ajuda
  }
  return null;
}

// sha256 do CONTEUDO. O nome do arquivo e enderecado por conteudo por causa de um incidente
// real neste repositorio: trocar o conteudo mantendo o nome envenenou o cache de borda por um
// ano. Query string de cache buster nao resolve, porque scraper de og:image a ignora.
async function hash8(blob) {
  const buf = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
  return [...new Uint8Array(buf)].slice(0, 4).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function extensaoDe(mime) {
  if (mime === 'image/webp') return 'webp';
  if (mime === 'image/jpeg') return 'jpg';
  if (mime === 'image/png') return 'png';
  if (mime === 'application/pdf') return 'pdf';
  return 'bin';
}

// Caminho no bucket: <portfolio_id>/<tipo>/<slug>-<hash8>.<ext>. O trigger do banco recusa
// qualquer outra forma, e o CHECK de cada coluna confere o prefixo do proprio tenant.
export function montarCaminho({ portfolioId, pasta, nome, hash, ext }) {
  const base = String(nome || 'arquivo').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'arquivo';
  return `${portfolioId}/${pasta}/${base.slice(0, 40)}-${hash}.${ext}`;
}

/**
 * Converte o arquivo escolhido pelo comprador no blob que vai subir.
 * Devolve { blob, mime, largura, altura, caminho, previewUrl }.
 */
export async function prepararImagem(arquivo, { destino, portfolioId, nome }) {
  const cfg = DESTINOS[destino];
  if (!cfg) throw new ErroDeImagem(`destino desconhecido: ${destino}`);

  // Checagem por file.type, NUNCA pela extensao: um .pdf renomeado para .png passa no nome e
  // morre no tipo, que e o que o bucket tambem olha.
  if (!TIPOS_ACEITOS.includes(arquivo.type)) {
    throw new ErroDeImagem('formato nao aceito. Envie JPG, PNG, WebP ou AVIF.');
  }
  if (arquivo.size > TETO_BYTES_ENTRADA) {
    throw new ErroDeImagem('imagem muito grande (acima de 15 MB). Reduza antes de enviar.');
  }

  const bitmap = await decodificar(arquivo);
  const lFonte = bitmap.width || bitmap.naturalWidth;
  const aFonte = bitmap.height || bitmap.naturalHeight;
  if (!lFonte || !aFonte) throw new ErroDeImagem('nao foi possivel ler esta imagem.');
  if (lFonte * aFonte > TETO_PIXELS) {
    throw new ErroDeImagem('imagem com resolucao alta demais. Reduza antes de enviar.');
  }

  // Crop central fixo pela proporcao do destino. Sem cropper (corte de 6.1): o unico
  // enquadramento ajustavel do produto e o object-position vertical do hero.
  let recorte = { x: 0, y: 0, l: lFonte, a: aFonte };
  if (cfg.proporcao) {
    const alvo = cfg.proporcao;
    if (lFonte / aFonte > alvo) {
      const l = Math.round(aFonte * alvo);
      recorte = { x: Math.round((lFonte - l) / 2), y: 0, l, a: aFonte };
    } else {
      const a = Math.round(lFonte / alvo);
      recorte = { x: 0, y: Math.round((aFonte - a) / 2), l: lFonte, a };
    }
  }

  const escala = Math.min(1, cfg.lado / Math.max(recorte.l, recorte.a));
  const lAlvo = Math.max(1, Math.round(recorte.l * escala));
  const aAlvo = Math.max(1, Math.round(recorte.a * escala));

  const recortado = document.createElement('canvas');
  recortado.width = recorte.l;
  recortado.height = recorte.a;
  recortado.getContext('2d').drawImage(bitmap, recorte.x, recorte.y, recorte.l, recorte.a, 0, 0, recorte.l, recorte.a);

  const reduzido = reduzirEmDegraus(recortado, recorte.l, recorte.a, lAlvo, aAlvo);

  const saida = document.createElement('canvas');
  saida.width = lAlvo;
  saida.height = aAlvo;
  const ctx = saida.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  if (cfg.margem) {
    // A margem assada: a arte ocupa 80% do quadrado, sobre canvas TRANSPARENTE. Isto e o que
    // mantem a fileira de logos alinhada sem tocar no CSS da placa e sem inventar coluna. Quem
    // subir arte sangrando na borda continua com respiro; quem subir com respiro proprio
    // perde um pouco de tamanho, que e o preco menor dos dois.
    const dentro = Math.round(lAlvo * cfg.margem);
    const off = Math.round((lAlvo - dentro) / 2);
    ctx.drawImage(reduzido, off, off, dentro, dentro);
  } else {
    ctx.drawImage(reduzido, 0, 0, lAlvo, aAlvo);
  }

  const blob = await codificarDentroDoOrcamento(saida, cfg.orcamento);
  if (!blob) {
    throw new ErroDeImagem(
      `nao consegui deixar esta imagem abaixo de ${Math.round(cfg.orcamento / 1024)} KB. Tente uma imagem mais simples ou menor.`,
    );
  }

  const h = await hash8(blob);
  const ext = extensaoDe(blob.type);
  return {
    blob,
    mime: blob.type,
    largura: lAlvo,
    altura: aAlvo,
    caminho: montarCaminho({ portfolioId, pasta: cfg.pasta, nome, hash: h, ext }),
    // Previa otimista: a URL blob: local aparece na hora e e trocada pela do Storage quando o
    // upload resolve. Quem chama e responsavel por revogar.
    previewUrl: URL.createObjectURL(blob),
  };
}
