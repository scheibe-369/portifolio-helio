// Monograma de fallback para organizacao sem logo: ate 2 iniciais.
//
// Isto existe porque na versao vendida o comprador cadastra a experiencia dele antes de
// subir a logo, e as vezes nunca sobe. Sem fallback, o card ficaria com um buraco. Com ele,
// o portfolio de quem acabou de comprar ja parece pronto.
export const iniciais = (org) => {
  const nome = String(org ?? '').trim();
  if (!nome) return '?';
  const partes = nome.split(/\s+/).filter((p) => p.length > 2 || /^[A-Z]{2,}$/.test(p));
  const letras = partes.slice(0, 2).map((p) => p[0]).join('');
  return (letras || nome.slice(0, 2)).toUpperCase();
};
