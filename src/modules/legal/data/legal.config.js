// Numeros e nomes que aparecem NOS DOIS documentos e tambem no produto.
//
// Eles moram aqui, e nao soltos no texto, porque prazo escrito em dois lugares diverge, e
// prazo divergente entre a pagina de termos e o comportamento do sistema e exatamente o que
// vira processo. Quem muda um prazo muda esta constante, e os dois documentos acompanham.
//
// TERMS_VERSION e a mesma string gravada em myportifolio.terms_consents.terms_version e
// esperada em myportifolio.app_settings na chave 'terms_version'. Subir a versao aqui SEM
// subir no banco faz o produto pedir aceite de uma versao que o banco nao reconhece, e o
// contrario deixa o comprador aceitando um texto que ja mudou.
export const TERMS_VERSION = '2026-08-13';

export const PRAZOS = {
  arrependimentoDias: 7, // CDC art. 49
  carenciaExclusaoDias: 7, // LGPD art. 18, com botao de voltar atras
  retencaoAposRevogacaoDias: 90,
  retencaoSubdominioDias: 90,
  conferenciaPrimeiraPublicacaoHoras: 24,
  garantiaMinimaMeses: 36,
  avisoDescontinuacaoDias: 90,
  exportacaoAposEncerramentoDias: 90,
  trocasDeEnderecoPorJanela: 2,
  janelaDeTrocaDias: 90,
};

export const CONTATO = {
  suporte: 'suporte@myportifolio.com.br',
  privacidade: 'privacidade@myportifolio.com.br',
  remetente: 'acesso@mail.myportifolio.com.br',
  apex: 'myportifolio.com.br',
};

// Subprocessadores NOMINAIS. A LGPD nao aceita "parceiros de tecnologia": ou a lista tem
// nome, ou ela nao serve para nada. Quem entrar nesta lista depois entra tambem numa versao
// nova dos termos, e o aceite e pedido de novo.
export const SUBPROCESSADORES = [
  { nome: 'Cloudflare', papel: 'hospedagem da borda, DNS, certificado e protecao contra abuso' },
  { nome: 'Supabase', papel: 'banco de dados, autenticacao e armazenamento de arquivos' },
  { nome: 'Resend', papel: 'envio dos e-mails de acesso e de aviso' },
  { nome: 'Hubla', papel: 'processamento do pagamento e emissao fiscal' },
  { nome: 'YouTube (Google)', papel: 'reproducao dos videos que voce incorpora no portfolio' },
];
