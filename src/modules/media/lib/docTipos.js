// Tipos aceitos no bucket de documento. Zona [browser], e PURO de proposito.
//
// Esta lista e letra por letra a `allowed_mime_types` do bucket portfolio-docs, e ela vive
// separada do modulo de upload por uma razao de fronteira: o CAMPO de certificado precisa da
// lista para desenhar o `accept` do input, e ele nao pode arrastar o cliente do Supabase junto
// so por causa de duas constantes. Desenhar formulario nao pode exigir credencial de banco.
export const TIPOS_DOC = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

// O teto do editor e o mesmo file_size_limit do bucket. A recusa daqui e educacao: quem recusa
// de verdade e o servidor, e o cliente e territorio do atacante.
export const TETO_PDF = 3 * 1024 * 1024;

export const ehPdf = (mime) => mime === 'application/pdf';
