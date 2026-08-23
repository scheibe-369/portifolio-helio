import { ICONES_REDE } from './iconesRedeDados.js';

// Quem escolhe o icone de um cartao de contato. Zona [iso].
//
// O DESENHO E A LISTA estao em iconesRedeDados.js, que e gerado. Aqui fica so a regra, que e
// a parte que muda e a parte que erra.
//
// TRES CAMINHOS, NESTA ORDEM, e a ordem importa:
//   1. o que a pessoa escolheu, escrito no proprio campo;
//   2. o LINK, que e a fonte mais confiavel quando ninguem escolheu nada: `wa.me/...` so pode
//      ser WhatsApp, enquanto o rotulo pode estar escrito "Zap", "WhatsApp Comercial" ou
//      "Fale comigo";
//   3. o ROTULO, para quem escreveu "E-mail" ou "Agenda" e nao precisa aprender que existe um
//      campo de icone para receber o icone obvio.
//
// Nada reconhecido nao ganha desenho nenhum, e isso e deliberado: um icone generico inventado
// no lugar de um desconhecido e ruido com cara de erro.
export { ICONES_REDE };
export const NOMES_ICONE = Object.keys(ICONES_REDE);
export const iconeValido = (v) =>
  (typeof v === 'string' && Object.prototype.hasOwnProperty.call(ICONES_REDE, v.trim().toLowerCase())
    ? v.trim().toLowerCase()
    : null);

const HOSTS = {
  'wa.me': 'whatsapp',
  'whatsapp.com': 'whatsapp',
  'instagram.com': 'instagram',
  'instagr.am': 'instagram',
  'facebook.com': 'facebook',
  'fb.com': 'facebook',
  'fb.me': 'facebook',
  'tiktok.com': 'tiktok',
  'linkedin.com': 'linkedin',
  'lnkd.in': 'linkedin',
  'youtube.com': 'youtube',
  'youtu.be': 'youtube',
  'x.com': 'x',
  'twitter.com': 'x',
  't.me': 'telegram',
  'telegram.me': 'telegram',
  'telegram.org': 'telegram',
  'spotify.com': 'spotify',
  'soundcloud.com': 'soundcloud',
  'behance.net': 'behance',
  'dribbble.com': 'dribbble',
  'pinterest.com': 'pinterest',
  'pin.it': 'pinterest',
  'threads.net': 'threads',
  'threads.com': 'threads',
  'twitch.tv': 'twitch',
  'vimeo.com': 'vimeo',
  'github.com': 'github',
  'flickr.com': 'flickr',
  'flic.kr': 'flickr',
  'maps.google.com': 'mapa',
  'goo.gl': 'mapa',
  'maps.app.goo.gl': 'mapa',
  'calendly.com': 'agenda',
  'cal.com': 'agenda',
};

// Apelidos do rotulo. Sao os nomes que as pessoas escrevem de verdade, e nao os oficiais.
const NOMES = {
  whatsapp: 'whatsapp', whats: 'whatsapp', whatsap: 'whatsapp', zap: 'whatsapp', wpp: 'whatsapp',
  instagram: 'instagram', insta: 'instagram', ig: 'instagram',
  facebook: 'facebook', face: 'facebook', fb: 'facebook',
  tiktok: 'tiktok',
  linkedin: 'linkedin',
  youtube: 'youtube', yt: 'youtube', canal: 'youtube',
  x: 'x', twitter: 'x',
  telegram: 'telegram',
  spotify: 'spotify',
  soundcloud: 'soundcloud',
  behance: 'behance',
  dribbble: 'dribbble',
  pinterest: 'pinterest',
  threads: 'threads',
  twitch: 'twitch',
  vimeo: 'vimeo',
  github: 'github',
  ondefica: 'mapa', endereco: 'mapa', localizacao: 'mapa', atelie: 'mapa',
  oficina: 'mapa', estudio: 'mapa', consultorio: 'mapa', escritorio: 'mapa', loja: 'loja',
  horario: 'relogio', horarios: 'relogio', funcionamento: 'relogio',
  email: 'email', mail: 'email', contato: 'email',
  telefone: 'telefone', fone: 'telefone', fixo: 'telefone',
  site: 'site', website: 'site', portfolio: 'site',
  agenda: 'agenda', agendar: 'agenda', reserva: 'agenda',
  cardapio: 'cardapio', menu: 'cardapio',
  catalogo: 'catalogo', tabela: 'catalogo',
  curriculo: 'curriculo', cv: 'curriculo',
  avaliacoes: 'estrela', depoimentos: 'estrela',
  pix: 'pix',
};

const semAcento = (s) =>
  String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

// Hostname sem depender de `new URL`, que lanca em entrada meia boca e cujo comportamento
// muda entre o Worker e o navegador quando o texto nao tem esquema.
const hostDo = (href) => {
  const m = /^[a-z][a-z0-9+.-]*:\/\/([^/?#]+)/i.exec(String(href || '').trim());
  if (!m) return '';
  return m[1].replace(/^www\./i, '').replace(/:\d+$/, '').toLowerCase();
};

const doHost = (href) => {
  const host = hostDo(href);
  if (!host) return null;
  if (HOSTS[host]) return HOSTS[host];
  for (const base of Object.keys(HOSTS)) {
    if (host.endsWith('.' + base)) return HOSTS[base];
  }
  return null;
};

const doRotulo = (label) => {
  const nome = semAcento(label);
  return (nome && (NOMES[nome] || iconeValido(nome))) || null;
};

export function redeDoLink(href, label) {
  const host = doHost(href);
  const rotulo = doRotulo(label);
  // O ROTULO GANHA DO LINK QUANDO ELE PEDE UM ICONE DE LINHA, e so nesse caso. Um funileiro
  // escreveu "Horário" e pos um link de WhatsApp ali, porque o campo exige link: pelo host o
  // cartao ganharia o logo do WhatsApp para dizer um horario de funcionamento. Rotulo generico
  // descreve o que a linha E; o link so diz para onde ela aponta. Entre duas MARCAS a ordem se
  // inverte, porque ai o host e a informacao mais confiavel: "Zap" apontando para instagram.com
  // e um rotulo desatualizado, nao uma escolha.
  if (rotulo && ICONES_REDE[rotulo] && ICONES_REDE[rotulo].m === 0) return rotulo;
  // O GLOBO NO FIM DA FILA, para link que aponta para algum lugar que a gente nao conhece.
  //
  // Aqui a regra virou ao contrario do que era, e o motivo e a mudanca do cartao: enquanto ele
  // tinha um segundo texto ao lado do nome, quem nao fosse reconhecido continuava se
  // explicando por escrito, e um icone generico so somaria ruido. Sem esse texto, o cartao sem
  // desenho vira uma palavra solta ao lado de irmaos desenhados, e parece que faltou carregar.
  // Aconteceu com "ArchDaily" e "Flickr", que sao servicos legitimos e nao estao em biblioteca
  // de marca nenhuma.
  //
  // O globo nao inventa nada: ele diz exatamente o que se sabe da linha, que e ser um link
  // para um site. Rotulo sem link nenhum continua sem desenho, porque ai nem isso se sabe.
  return host || rotulo || (hostDo(href) ? 'site' : null);
}

// A regra completa, do jeito que o render precisa dela.
export const iconeDoContato = (s) => iconeValido(s && s.icon) || redeDoLink(s && s.href, s && s.label);

// `aria-hidden` porque o nome ja esta escrito ao lado em texto: um leitor de tela que
// anunciasse os dois leria "Instagram Instagram".
export function svgRede(chave, classe = 'h-4 w-4 shrink-0') {
  const ic = chave && Object.prototype.hasOwnProperty.call(ICONES_REDE, chave) ? ICONES_REDE[chave] : null;
  if (!ic) return '';
  const traco = ic.m
    ? 'fill="currentColor"'
    : 'fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"';
  return `<svg viewBox="0 0 24 24" ${traco} class="${classe}" aria-hidden="true">${ic.i}</svg>`;
}
