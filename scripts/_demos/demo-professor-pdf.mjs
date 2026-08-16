// Gera os arquivos de teste do professor Adriano Peçanha: tres certificados em PDF, um PDF
// grande de proposito (para bater no teto de 3 MB) e um logo PNG quadrado com fundo
// transparente (para comparar com o JPG largo e opaco que o teste tambem sobe).
//
// Sem dependencia de biblioteca de PDF: o que se mede aqui e o anexo no editor, nao a
// tipografia do arquivo. O PNG sai por pngjs, que ja esta no node_modules do projeto.
import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const DIR = 'out/midia/demo-professor';

// --------------------------------------------------------------------- PDF
function montarPdf(linhas, { recheio = 0 } = {}) {
  const texto = linhas
    .map((l, i) => {
      const y = 760 - i * 26;
      const esc = String(l).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
      return `BT /F1 ${i === 0 ? 17 : 12} Tf 56 ${y} Td (${esc}) Tj ET`;
    })
    .join('\n');

  const objetos = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${texto.length} >>\nstream\n${texto}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  // O recheio entra como objeto extra de comentario: infla o arquivo sem quebrar o PDF.
  if (recheio) objetos.push(`<< /Type /Recheio /Bytes ${recheio} >>\n% ${'A'.repeat(recheio)}`);

  let pdf = '%PDF-1.4\n';
  const offsets = [];
  objetos.forEach((o, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const inicioXref = pdf.length;
  pdf += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) pdf += `${String(off).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R >>\nstartxref\n${inicioXref}\n%%EOF\n`;
  return pdf;
}

function gerarPdf(nome, linhas, opcoes) {
  mkdirSync(DIR, { recursive: true });
  const caminho = `${DIR}/${nome}`;
  writeFileSync(caminho, montarPdf(linhas, opcoes), 'latin1');
  return caminho;
}

const RODAPE = [
  '',
  'Documento ficticio, gerado para teste de produto.',
  'Nao possui validade academica, juridica nem funcional.',
];

export const CERTIFICADOS = {
  mestrado: () =>
    gerarPdf('cert-mestrado-unb.pdf', [
      'UNIVERSIDADE DE BRASILIA',
      '',
      'Certificamos que ADRIANO PECANHA DE SOUZA, CPF 000.000.000-00,',
      'concluiu o curso de Mestrado em Direito, area de concentracao',
      'Direito Constitucional, com a dissertacao "Controle de',
      'constitucionalidade difuso e a mutacao do artigo 52, X".',
      '',
      'Defesa aprovada em 12 de dezembro de 2014.',
      ...RODAPE,
    ]),
  graduacao: () =>
    gerarPdf('cert-graduacao-uerj.pdf', [
      'UNIVERSIDADE DO ESTADO DO RIO DE JANEIRO',
      '',
      'Diploma de Bacharel em Direito conferido a',
      'ADRIANO PECANHA DE SOUZA, CPF 000.000.000-00,',
      'colado grau em 18 de dezembro de 2009.',
      '',
      'Registro 2009/44812, Livro 31, Folha 118.',
      ...RODAPE,
    ]),
  aprovacao: () =>
    gerarPdf('cert-posse-agu.pdf', [
      'ADVOCACIA-GERAL DA UNIAO',
      '',
      'Termo de posse no cargo de Advogado da Uniao,',
      'ADRIANO PECANHA DE SOUZA, CPF 000.000.000-00,',
      'aprovado em 7o lugar no concurso publico de 2011,',
      'empossado em 3 de maio de 2012.',
      '',
      'Publicado no Diario Oficial da Uniao de 04/05/2012.',
      ...RODAPE,
    ]),
  // ~3,6 MB: acima do teto de 3 MB do bucket e da recusa do editor.
  grande: () =>
    gerarPdf('cert-grande-3800kb.pdf', [
      'CERTIFICADO GRANDE DEMAIS (ARQUIVO DE TESTE)',
      '',
      'Existe so para bater no teto de 3 MB do editor.',
      ...RODAPE,
    ], { recheio: 3_800_000 }),
};

// --------------------------------------------------------------------- PNG
// PNG RGBA minimo escrito na mao (nenhuma dependencia): quadrado, fundo TRANSPARENTE, com um
// capelo simplificado em branco. E o formato que a ajuda do campo de logo pede.
function crc32(buf) {
  let c;
  const tabela = [];
  for (let n = 0; n < 256; n += 1) {
    c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    tabela[n] = c >>> 0;
  }
  let crc = 0xffffffff;
  for (const b of buf) crc = tabela[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function pedaco(tipo, dados) {
  const t = Buffer.from(tipo, 'latin1');
  const corpo = Buffer.concat([t, dados]);
  const tam = Buffer.alloc(4);
  tam.writeUInt32BE(dados.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(corpo));
  return Buffer.concat([tam, corpo, crc]);
}

export function gerarLogoPng(nome = 'logo-unb-quadrada.png', lado = 512) {
  mkdirSync(DIR, { recursive: true });
  const linhas = [];
  for (let y = 0; y < lado; y += 1) {
    const linha = Buffer.alloc(1 + lado * 4); // filtro 0 + RGBA
    for (let x = 0; x < lado; x += 1) {
      const i = 1 + x * 4;
      // Arte ocupando ~80% do quadrado, o resto transparente.
      const cx = (x - lado / 2) / (lado * 0.4);
      const cy = (y - lado / 2) / (lado * 0.4);
      const dentroCapelo = Math.abs(cx) + Math.abs(cy * 1.6) < 0.95 && cy < 0.1;
      const dentroBase = Math.abs(cx) < 0.5 && cy > 0.05 && cy < 0.62;
      if (dentroCapelo || dentroBase) {
        linha[i] = 255; linha[i + 1] = 255; linha[i + 2] = 255; linha[i + 3] = 255;
      } else {
        linha[i + 3] = 0; // transparente
      }
    }
    linhas.push(linha);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(lado, 0);
  ihdr.writeUInt32BE(lado, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pedaco('IHDR', ihdr),
    pedaco('IDAT', deflateSync(Buffer.concat(linhas))),
    pedaco('IEND', Buffer.alloc(0)),
  ]);
  const caminho = `${DIR}/${nome}`;
  writeFileSync(caminho, png);
  return caminho;
}

if ((process.argv[1] || '').includes('demo-professor-pdf')) {
  for (const [k, fn] of Object.entries(CERTIFICADOS)) console.log('pdf:', k, '->', fn());
  console.log('png:', gerarLogoPng());
}
