// Escape para HTML. Zona [iso]: roda no browser e dentro do Worker.
//
// POR QUE E UM MODULO SO, e por que ele nasce na fase 0 mesmo sem servir para nada hoje:
// hoje todo texto da pagina e escrito pelo Helio, entao escape e teoria. A partir da fase 1
// o texto vem de qualquer pessoa que pagou R$ 47,90, e vai para dentro de href, style, src e
// corpo de tag, montado com template string. Duas copias de escape divergem com o tempo, e a
// que divergir e um XSS servido de um subdominio nosso, o que queima o dominio inteiro junto
// com todos os clientes (risco R8).

const MAPA = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

// Texto que vai para dentro de uma tag ou de um atributo entre aspas.
export const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => MAPA[c]);

// URL para href/src. So deixa passar esquema que nao executa script.
// javascript: e data: sao os dois vetores classicos aqui, e "data:" merece atencao porque
// parece inofensivo: data:text/html,<script>... executa no mesmo origin do link.
const ESQUEMAS_OK = new Set(['http:', 'https:', 'mailto:', 'tel:']);
export function safeUrl(v, { base } = {}) {
  const bruto = String(v ?? '').trim();
  if (!bruto) return '';
  // Caminho relativo proprio (comeca com / e nao com //) e sempre seguro.
  if (bruto.startsWith('/') && !bruto.startsWith('//')) return esc(bruto);
  try {
    const u = new URL(bruto, base || 'https://example.invalid');
    if (!ESQUEMAS_OK.has(u.protocol)) return '';
    // Travessia de caminho: a URL publica normaliza ".." no cliente e nos proxies, entao
    // um caminho com ".." pode acabar apontando para midia de outro tenant (achado 15).
    if (/(^|\/)\.\.(\/|$)/.test(u.pathname)) return '';
    return esc(u.toString());
  } catch {
    return '';
  }
}

// Cor para style inline. Aceita so hex de 3 ou 6, que e o que o CHECK do banco tambem
// aceita. Qualquer outra coisa vira o padrao: cor invalida em style pode fechar a aspa e
// injetar propriedade, e "expression(" ainda existe em navegador velho.
export function safeColor(v, padrao = '#0b0b12') {
  const s = String(v ?? '').trim();
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(s) ? s : padrao;
}

// object-position para style inline: dois comprimentos, porcentagem ou palavra-chave.
export function safePosition(v, padrao = '50% 36%') {
  const s = String(v ?? '').trim();
  return /^(-?\d+(\.\d+)?(%|px)|left|right|center|top|bottom)( (-?\d+(\.\d+)?(%|px)|left|right|center|top|bottom))?$/i.test(s)
    ? s
    : padrao;
}
