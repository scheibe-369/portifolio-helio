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
//
// HEIC E HEIF ENTRARAM EM 16/08/2026, e a ausencia deles era o defeito mais caro do produto
// para o publico que ele diz atender. HEIC e o formato padrao da camera de todo iPhone desde
// 2017. Sem ele nesta lista acontecia o pior tipo de barreira, que e a que nao se explica:
//
//   . o `accept` do input sai desta lista, e o iOS ACINZENTA na galeria toda foto que nao
//     casa com ele. A confeiteira do teste abria o seletor e simplesmente nao conseguia tocar
//     nas proprias fotos, sem mensagem nenhuma dizendo por que;
//   . quem insistia por outro caminho levava "formato nao aceito. Envie JPG, PNG, WebP ou
//     AVIF", quatro siglas que nao ajudam quem so tirou uma foto do bolo.
//
// Com o formato na lista, o iOS oferece as fotos e, na maioria dos casos, ja entrega JPEG
// convertido. Quando entrega HEIC mesmo, o Safari decodifica nativo. Quem nao decodifica cai
// na mensagem nova, que diz o que fazer.
export const TIPOS_ACEITOS = [
  'image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/heic', 'image/heif',
];

// 15 MB e o teto ANTES de decodificar. Decodificar 50 MP estoura a memoria do celular antes
// de qualquer canvas existir, entao a recusa precisa vir do tamanho do arquivo, que e o
// unico numero conhecido nesse instante.
const TETO_BYTES_ENTRADA = 15 * 1024 * 1024;
const TETO_PIXELS = 50 * 1000 * 1000;

// Um destino por lugar onde a imagem aparece. Orcamento diferente por destino porque um
// numero solto nao reprova nada: 90 KB e generoso para um card e absurdo para um avatar.
export const DESTINOS = {
  // 60 KB e nao 25. O orcamento antigo foi calibrado para uma LOGO quadrada, que e o que o
  // portfolio de origem tinha ali: pouca cor, muita area chapada, e WebP fecha em 20 KB. Foto
  // de ROSTO e o oposto (pele, cabelo, fundo desfocado), e uma foto real de 800x800 nao cabia
  // em 25 KB nem na terceira tentativa de qualidade: ela saia em 0.62 e ainda estourava, ou
  // seja a foto de perfil da pessoa era recusada por um numero herdado de outro tipo de
  // imagem. 60 KB e o dobro do que uma foto de rosto de 512px costuma pedir e continua
  // irrelevante perto da cota de 40 MB por conta.
  avatar: { pasta: 'avatar', proporcao: 1, lado: 512, orcamento: 60 * 1024 },
  // Mesma razao do project: o hero ja tem `object-cover` e `object-position` no CSS, e cortar
  // em 4:5 no arquivo tirava do slider de enquadramento justamente o curso que ele controla.
  hero: { pasta: 'hero', proporcao: null, lado: 1400, orcamento: 160 * 1024 },
  // SEM CORTE, e esta e a correcao mais importante do pipeline.
  //
  // `proporcao: 3/2` cortava o ARQUIVO no upload. Um tatuador subia 1000x1500 e o Storage
  // guardava 1000x667: 55% da tatuagem descartado para sempre, sem original nenhum. O
  // "Enquadramento da imagem", que existe justamente para salvar foto vertical, agia DEPOIS e
  // sobre um arquivo que ja tinha perdido o que importava, entao sobravam 16px de curso.
  // Fotografo, arquiteta e confeiteira bateram no mesmo muro com retrato, panoramica e
  // quadrada.
  //
  // Agora guardamos a imagem INTEIRA, so reduzida ao lado maximo, e quem recorta e o CSS
  // (`object-cover` + `object-position`), no navegador, na hora de desenhar. Duas coisas boas
  // caem daqui: o enquadramento passa a ter curso de verdade, e o mesmo arquivo serve a
  // molduras diferentes (o card e 3:2 no desktop e quase retrato no celular, e a galeria tem
  // proporcao propria).
  //
  // O orcamento sobe de 90 para 140 KB porque a imagem agora carrega as bordas que antes eram
  // jogadas fora. Continua irrelevante perto da cota de 40 MB por conta.
  // 220 KB, e o numero subiu junto com a decisao de nao cortar. Tirar o corte 3:2 salvou a
  // foto vertical do tatuador e, no mesmo movimento, fez todo arquivo carregar as bordas que
  // antes eram descartadas: o teto nao acompanhou, e quatro das seis fotos de um casamento
  // foram recusadas. Multidao, folhagem, renda e bokeh sao ruido fino, que e exatamente o que
  // WebP nao comprime, e "tente uma imagem mais simples" nao e instrucao que se cumpra numa
  // foto de casamento. Com os dois degraus de reducao antes da recusa, este teto e o piso de
  // qualidade, e nao mais o portao.
  project: { pasta: 'project', proporcao: null, lado: 1400, orcamento: 220 * 1024 },
  // A placa da experiencia e quadrada (w-14 h-14) e NAO tem padding no CSS, de proposito: o
  // respiro vem assado no WebP, igual em todas as logos. Padding por cima reintroduziria a
  // margem dobrada que fazia cada logo aparecer num tamanho diferente na fileira.
  // SEM CORTE AQUI TAMBEM, e pelo mesmo motivo do project: `proporcao: 1` recortava um
  // quadrado central do ARQUIVO. Logo de empresa quase nunca e quadrada, e uma delas e sempre
  // um wordmark deitado: "Tavares Negocios Imobiliarios" chegou 1400x400 e foi guardada
  // 256x256, com as duas pontas do nome jogadas fora para sempre. O card mostrava tres
  // silabas do meio de um nome, e o dono nao tinha o que ajustar, porque o que sobrou do
  // arquivo ja nao continha o resto.
  //
  // A placa continua QUADRADA, e e isto que faz a troca ser invisivel para quem ja subiu:
  // a arte inteira e encaixada dentro do quadrado de 256 (letterbox), em vez de o quadrado ser
  // recortado de dentro dela. Arte que ja era quadrada sai byte a byte igual, arte deitada
  // passa a sair inteira e menor. O render nao muda nem uma classe.
  experience: { pasta: 'experience', proporcao: null, lado: 256, orcamento: 90 * 1024, margem: 0.8, quadrar: true },
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
  } catch {
    // A MENSAGEM PRECISA DIZER O QUE FAZER, e nao so que deu errado.
    //
    // Aqui chega, entre outros, o HEIC do iPhone aberto num navegador que nao sabe decodificar
    // (Chrome e Firefox no Android e no desktop). Quem esta do outro lado nao sabe o que e
    // HEIC, nao escolheu esse formato e nao vai deduzir sozinho que existe um botao no
    // aparelho para mudar isso. "formato nao aceito" mandava a pessoa embora; o caminho de
    // saida cabe numa frase.
    const heic = /hei[cf]/i.test(arquivo.type || '') || /\.hei[cf]$/i.test(arquivo.name || '');
    throw new ErroDeImagem(
      heic
        ? 'este navegador não abre foto de iPhone (HEIC). Abra pelo Safari, ou no iPhone vá em Ajustes, Câmera, Formatos e escolha "Mais compatível".'
        : 'não consegui abrir esta imagem. Tente outra foto, ou salve esta como JPG e envie de novo.',
    );
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
// A ARTE TEM SILHUETA PROPRIA, OU E UMA FOTO?
//
// A placa da experiencia mede 56px e nasceu para logo de empresa: fundo transparente, respiro
// em volta, tudo alinhado na fileira. Foi assim que um corretor subiu a FOTO da imobiliaria
// ali, e a foto ganhou o tratamento de logo: encolhida a 80%, sobre canvas transparente, com
// o fundo branco do JPEG virando uma moldura clara em volta de uma sala de estar de 43px, ao
// lado de duas placas de monograma limpas. Ninguem faria isso de proposito.
//
// A pergunta que separa os dois casos nao e a extensao do arquivo (PNG opaco existe), e sim se
// a imagem tem transparencia. Se tem, e arte recortada e o respiro faz sentido. Se nao tem, e
// foto, e foto preenche a placa inteira, que e o que ela faz em todo outro lugar do produto.
//
// A sonda e de 64x64 e nao a imagem inteira: varrer 9 milhoes de pixels de uma foto de celular
// para responder a uma pergunta binaria custaria mais que todo o resto do pipeline, e area
// transparente de logo nunca e pequena o bastante para escapar de uma amostra desse tamanho.
function temTransparencia(bitmap) {
  const lado = 64;
  const c = document.createElement('canvas');
  c.width = lado;
  c.height = lado;
  const x = c.getContext('2d', { willReadFrequently: true });
  x.drawImage(bitmap, 0, 0, lado, lado);
  const d = x.getImageData(0, 0, lado, lado).data;
  for (let i = 3; i < d.length; i += 4) if (d[i] < 250) return true;
  return false;
}

export async function prepararImagem(arquivo, { destino, portfolioId, nome }) {
  const cfg = DESTINOS[destino];
  if (!cfg) throw new ErroDeImagem(`destino desconhecido: ${destino}`);

  // Checagem por file.type, NUNCA pela extensao: um .pdf renomeado para .png passa no nome e
  // morre no tipo, que e o que o bucket tambem olha.
  //
  // TIPO VAZIO NAO E RECUSA, e essa excecao tem nome: o Android devolve `type` em branco para
  // HEIC vindo da galeria, e alguns gerenciadores de arquivo fazem o mesmo com formatos que
  // nao conhecem. Recusar ali seria barrar por ignorancia do sistema operacional, e nao por
  // problema do arquivo. Quem decide de verdade e a DECODIFICACAO logo abaixo: um PDF
  // renomeado nao vira bitmap, e o pipeline so grava o que ele mesmo redesenhou num canvas.
  if (arquivo.type && !TIPOS_ACEITOS.includes(arquivo.type)) {
    throw new ErroDeImagem('este arquivo não é uma imagem que a gente consiga usar. Envie uma foto (JPG, PNG ou a foto do seu celular).');
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

  // O respiro so vale para arte com silhueta. Foto na placa preenche a placa.
  const comRespiro = Boolean(cfg.margem) && temTransparencia(bitmap);

  // Com margem assada, o limite de reducao ja e o lado DE DENTRO da margem. Reduzir para 256
  // e depois desenhar a 205 encolheria de novo, no `drawImage`, sem os degraus: duas reducoes,
  // a segunda sem suavizacao boa. Assim ha uma so, e ela e a boa.
  const limite = comRespiro ? Math.round(cfg.lado * cfg.margem) : cfg.lado;
  const escala = Math.min(1, limite / Math.max(recorte.l, recorte.a));
  const lAlvo = Math.max(1, Math.round(recorte.l * escala));
  const aAlvo = Math.max(1, Math.round(recorte.a * escala));

  const recortado = document.createElement('canvas');
  recortado.width = recorte.l;
  recortado.height = recorte.a;
  recortado.getContext('2d').drawImage(bitmap, recorte.x, recorte.y, recorte.l, recorte.a, 0, 0, recorte.l, recorte.a);

  const reduzido = reduzirEmDegraus(recortado, recorte.l, recorte.a, lAlvo, aAlvo);

  // A margem assada: a arte ocupa 80% do quadrado, sobre canvas TRANSPARENTE. Isto e o que
  // mantem a fileira de logos alinhada sem tocar no CSS da placa e sem inventar coluna. Quem
  // subir arte sangrando na borda continua com respiro; quem subir com respiro proprio
  // perde um pouco de tamanho, que e o preco menor dos dois.
  //
  // O QUADRADO E DO CANVAS, NAO DA ARTE. Antes o codigo assumia que a entrada ja era quadrada
  // (desenhava `dentro x dentro`, o mesmo numero nos dois eixos) porque o corte 1:1 vinha
  // logo acima. Sem o corte, essa mesma linha esticaria um wordmark deitado ate ele virar um
  // quadrado deformado. Agora a arte entra com a proporcao dela e e centrada nos dois eixos.
  const lCanvas = cfg.quadrar && comRespiro ? cfg.lado : lAlvo;
  const aCanvas = cfg.quadrar && comRespiro ? cfg.lado : aAlvo;
  let saida = document.createElement('canvas');
  saida.width = lCanvas;
  saida.height = aCanvas;
  const ctx = saida.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(reduzido, Math.round((lCanvas - lAlvo) / 2), Math.round((aCanvas - aAlvo) / 2), lAlvo, aAlvo);

  // ANTES DE RECUSAR, REDUZ. Se as tres qualidades nao couberem no orcamento, a saida obvia e
  // diminuir a imagem, e nao devolver o problema para quem so queria subir uma foto.
  //
  // Sem estes dois degraus, uma foto de interior perfeitamente comum era recusada com "tente
  // uma imagem mais simples ou menor": um pedido que a pessoa nao sabe atender (o que e uma
  // imagem "mais simples"?) e que ela nao deveria precisar atender, porque redimensionar e
  // exatamente o que este arquivo faz. Foto com muito detalhe (interior, mata, multidao) e o
  // caso normal, nao o excepcional.
  //
  // Dois degraus de 80% cobrem o caso real sem virar um laco: cada um corta ~36% da area, e
  // depois disso a imagem ja estaria pequena demais para o lugar onde vai aparecer.
  // As medidas que seguem sao as do CANVAS, e nao as da arte dentro dele: com letterbox os
  // dois numeros deixam de ser o mesmo, e reduzir pelo lado da arte encolheria o canvas
  // quadrado por um fator do eixo errado, deformando a logo no degrau de reducao.
  let blob = await codificarDentroDoOrcamento(saida, cfg.orcamento);
  let larguraFinal = lCanvas;
  let alturaFinal = aCanvas;
  for (let tentativa = 0; !blob && tentativa < 2; tentativa += 1) {
    larguraFinal = Math.max(1, Math.round(larguraFinal * 0.8));
    alturaFinal = Math.max(1, Math.round(alturaFinal * 0.8));
    const menor = document.createElement('canvas');
    menor.width = larguraFinal;
    menor.height = alturaFinal;
    const c = menor.getContext('2d');
    c.imageSmoothingQuality = 'high';
    c.drawImage(saida, 0, 0, larguraFinal, alturaFinal);
    saida = menor;
    blob = await codificarDentroDoOrcamento(saida, cfg.orcamento);
  }
  if (!blob) {
    throw new ErroDeImagem(
      'não consegui preparar esta imagem para a web. Tente outra foto.',
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
