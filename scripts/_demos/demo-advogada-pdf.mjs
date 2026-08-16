// Gera um PDF minimo (sem dependencia) para servir de "certificado" no teste da persona
// advogada. Nao usa biblioteca de proposito: o que se quer medir e o anexo do certificado no
// editor, nao a qualidade tipografica do arquivo.
import { writeFileSync, mkdirSync } from 'node:fs';

const LINHAS = [
  'CERTIFICADO (ARQUIVO DE TESTE)',
  '',
  'Certificamos que RENATA VASCONCELOS concluiu o curso de',
  'Pos-Graduacao Lato Sensu em Direito e Processo do Trabalho,',
  'com carga horaria de 432 horas, em dezembro de 2019.',
  '',
  'Documento ficticio, gerado para teste de produto.',
  'Nao possui validade academica nem juridica.',
];

export function gerarPdf(caminho) {
  const texto = LINHAS.map((l, i) => {
    const y = 740 - i * 26;
    const esc = l.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
    return `BT /F1 ${i === 0 ? 16 : 12} Tf 60 ${y} Td (${esc}) Tj ET`;
  }).join('\n');

  const objetos = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${texto.length} >>\nstream\n${texto}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];

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

  mkdirSync(caminho.slice(0, caminho.lastIndexOf('/')), { recursive: true });
  writeFileSync(caminho, pdf, 'latin1');
  return caminho;
}

if ((process.argv[1] || '').includes('demo-advogada-pdf')) {
  console.log('gerado:', gerarPdf('out/midia/demo-advogada/certificado-pos-trabalho.pdf'));
}
