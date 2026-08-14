// Deriva o slug do nome. Zona [browser].
//
// O formato tem que casar com o CHECK do banco (^[a-z0-9]+(-[a-z0-9]+)*$, de 2 a 60), senao o
// comprador preenche o passo inteiro e leva um erro de constraint na hora de salvar, sem saber
// que o culpado e um campo que ele nunca viu.
export function slugify(texto, { minimo = 2, maximo = 60 } = {}) {
  const s = String(texto ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maximo)
    .replace(/-+$/g, '');
  return s.length >= minimo ? s : '';
}

// Slug unico dentro de uma lista que ja existe. Sufixo numerico e nao timestamp: o slug e o
// que amarra a traducao (4.7.1) e o que aparece na URL do certificado, entao ele precisa
// continuar legivel por gente.
export function slugUnico(base, usados) {
  const raiz = slugify(base) || 'item';
  if (!usados.includes(raiz)) return raiz;
  for (let i = 2; i < 200; i += 1) {
    const tentativa = `${raiz}-${i}`.slice(0, 60);
    if (!usados.includes(tentativa)) return tentativa;
  }
  return `${raiz}-${Date.now().toString(36)}`.slice(0, 60);
}
