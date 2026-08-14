// Extrai o id de 11 caracteres de uma URL do YouTube.
//
// POR QUE VIROU MODULO, e por que o dado passa a guardar o ID e nao a URL: analisar URL em
// tempo de render significa fazer isso a cada pintura, e significa que o dado publicado
// carrega uma URL montada. O plano ja decidiu (achado 12) que o payload guarda o dado cru e
// quem monta URL e o render, no instante do request. Guardando `videoId` desde a fase 0, o
// formato do dado de hoje ja e o mesmo que o banco vai guardar na fase 1, e a migracao vira
// um seed em vez de um adaptador.
//
// A partir da fase 1 esta funcao passa a ser usada tambem no editor, onde o comprador cola
// uma URL de qualquer jeito. Por isso ela aceita as formas que as pessoas realmente colam,
// incluindo link com parametro de tempo e o formato /shorts/.
const PADROES = [
  /youtu\.be\/([\w-]{11})/,
  /youtube\.com\/watch\?(?:.*&)?v=([\w-]{11})/,
  /youtube\.com\/embed\/([\w-]{11})/,
  /youtube\.com\/shorts\/([\w-]{11})/,
  /youtube-nocookie\.com\/embed\/([\w-]{11})/,
];

export function parseYoutubeId(entrada) {
  if (!entrada) return null;
  const s = String(entrada).trim();
  // Ja e um id puro.
  if (/^[\w-]{11}$/.test(s)) return s;
  for (const re of PADROES) {
    const m = s.match(re);
    if (m) return m[1];
  }
  return null;
}
