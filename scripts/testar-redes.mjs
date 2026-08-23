// Reconhecimento da rede social a partir do link, e os glifos de marca.
//
// POR QUE ISTO TEM TESTE PROPRIO: a alternativa a este arquivo era pedir que todo mundo
// voltasse ao editor e classificasse cada linha de rede num campo novo. Nao pedimos, e o
// preco de nao pedir e que a classificacao vira adivinhacao nossa. Adivinhacao sem teste
// erra em silencio: o icone do Instagram no link do LinkedIn nao quebra pagina nenhuma, nao
// aparece em log nenhum, e fica no ar ate um cliente reparar.
//
// A regra que os casos abaixo fixam: o LINK manda, o rotulo e a segunda tentativa, e o que
// nao for reconhecido nao ganha desenho nenhum.
//
//   node scripts/testar-redes.mjs
import { ICONES_REDE, iconeDoContato, iconeValido, redeDoLink, svgRede } from '../src/modules/profile/lib/iconesRede.js';

let falhas = 0;
const checar = (nome, condicao, detalhe) => {
  if (!condicao) {
    falhas += 1;
    console.error(`FALHOU  ${nome}${detalhe ? `\n        ${detalhe}` : ''}`);
  }
};

// Formas reais, tiradas das catorze demos e dos formatos que as proprias redes distribuem.
const CASOS = [
  ['https://wa.me/5511982147730', 'WhatsApp', 'whatsapp'],
  ['https://api.whatsapp.com/send?phone=5551999999999', 'Fale comigo', 'whatsapp'],
  ['https://chat.whatsapp.com/ABC', 'Grupo', 'whatsapp'],
  ['https://www.instagram.com/wilsontavares.imoveis', 'Instagram', 'instagram'],
  ['https://instagram.com/rafaximenes', 'Insta', 'instagram'],
  ['https://www.facebook.com/oficina', 'Facebook', 'facebook'],
  ['https://www.tiktok.com/@diego', 'TikTok', 'tiktok'],
  ['https://www.linkedin.com/in/renata', 'LinkedIn', 'linkedin'],
  ['https://youtu.be/dQw4w9WgXcQ', 'Canal', 'youtube'],
  ['https://www.youtube.com/@adriano', 'YouTube', 'youtube'],
  ['https://x.com/alguem', 'X', 'x'],
  ['https://twitter.com/alguem', 'Twitter', 'x'],
  ['https://t.me/alguem', 'Telegram', 'telegram'],
  ['https://open.spotify.com/artist/123', 'Ouça', 'spotify'],
  ['https://soundcloud.com/vitoria', 'SoundCloud', 'soundcloud'],
  ['https://www.behance.net/caio', 'Behance', 'behance'],
  ['https://dribbble.com/x', 'Dribbble', 'dribbble'],
  ['https://br.pinterest.com/sonia', 'Pinterest', 'pinterest'],
  ['https://www.threads.net/@x', 'Threads', 'threads'],
  ['https://www.twitch.tv/x', 'Twitch', 'twitch'],
  ['https://vimeo.com/123', 'Vimeo', 'vimeo'],
  ['https://github.com/x', 'GitHub', 'github'],
];

for (const [href, label, esperado] of CASOS) {
  const obtido = redeDoLink(href, label);
  checar(`${href} vira ${esperado}`, obtido === esperado, `veio ${JSON.stringify(obtido)}`);
}

// O SUBDOMINIO NAO PODE ESCAPAR. `open.spotify.com` e `br.pinterest.com` sao os que aparecem
// de verdade, e um casamento so por igualdade exata perderia os dois.
checar('subdominio casa pelo dominio de base', redeDoLink('https://m.facebook.com/x', 'x') === 'facebook');

// O ROTULO E A SEGUNDA TENTATIVA, e ele importa porque link encurtado existe.
checar('sem link reconhecido, o rotulo decide', redeDoLink('https://bit.ly/abc', 'Zap') === 'whatsapp');
checar('rotulo com acento e caixa alta tambem', redeDoLink('', 'INSTAGRAM') === 'instagram');
checar('rotulo com espaco', redeDoLink('', 'Tik Tok') === 'tiktok');

// O QUE NAO E REDE TAMBEM PRECISA DE DESENHO, e isso mudou quando o cartao perdeu o texto de
// apoio: antes "Onde fica" se explicava pelo endereco escrito ao lado, e agora so o icone
// sobra para explicar. A lista deixou de ser so de marcas por causa disso.
checar('mapa vira alfinete', redeDoLink('https://maps.google.com/?q=x', 'Imobiliária') === 'mapa');
checar('"Onde fica" vira alfinete sem depender do link', redeDoLink('', 'Onde fica') === 'mapa');
checar('"Oficina" tambem', redeDoLink('https://oficinadozeh.com.br', 'Oficina') === 'mapa');
checar('"Horário" vira relogio', redeDoLink('', 'Horário') === 'relogio');
checar('"E-mail" vira envelope', redeDoLink('', 'E-mail') === 'email');
checar('"Cardápio" vira cardapio', redeDoLink('', 'Cardápio') === 'cardapio');

// O ROTULO GENERICO GANHA DO LINK, e so nesse caso. Um funileiro escreveu "Horário" e pos um
// link de WhatsApp ali porque o campo exige link: pelo host, o cartao do horario dele ganharia
// o logo do WhatsApp.
checar('rotulo de linha ganha do host', redeDoLink('https://wa.me/5531988447120', 'Horário') === 'relogio');
checar('entre duas marcas, o host ganha', redeDoLink('https://instagram.com/a', 'Zap') === 'instagram',
  '"Zap" apontando para o Instagram e rotulo desatualizado, nao escolha');

// A ESCOLHA DA PESSOA GANHA DOS DOIS.
checar('icone escolhido ganha do palpite', iconeDoContato({ label: 'Zap', href: 'https://wa.me/1', icon: 'coracao' }) === 'coracao');
checar('icone invalido nao envenena', iconeDoContato({ label: 'Zap', href: 'https://wa.me/1', icon: 'nao-existe' }) === 'whatsapp');
checar('icone escrito com espaco e caixa alta vale', iconeValido('  MAPA ') === 'mapa');
checar('icone vazio nao vale', iconeValido('') === null && iconeValido(null) === null);
checar('entrada vazia nao quebra', redeDoLink('', '') === null);
checar('entrada nula nao quebra', redeDoLink(null, undefined) === null);
checar('texto que nao e link nao quebra', redeDoLink('rua sao geraldo, 412', 'Endereço') === 'mapa',
  'o texto nao e URL nenhuma, entao quem responde e o rotulo, e ele diz alfinete');

// O GLOBO NO FIM DA FILA. Sem o texto de apoio, cartao sem desenho vira palavra solta ao lado
// de irmaos desenhados. "ArchDaily" e "Flickr" sao servicos de verdade e nao estao em
// biblioteca de marca nenhuma: aconteceu com uma arquiteta e com um fotografo.
checar('link desconhecido vira globo', redeDoLink('https://www.archdaily.com.br', 'ArchDaily') === 'site');
checar('link desconhecido sem rotulo util tambem', redeDoLink('https://sitequalquer.com.br/x', 'Meu trabalho') === 'site');
checar('sem link, nao inventa globo', redeDoLink('', 'ArchDaily') === null,
  'sem URL nao se sabe nem que e um site');
checar('texto que nao e URL nao vira globo', redeDoLink('rua sao geraldo, 412', 'Bla') === null);
checar('o globo nao rouba marca conhecida', redeDoLink('https://www.flickr.com/photos/x', 'Flickr') === 'flickr');

// O SVG.
checar('rede desconhecida nao emite svg', svgRede(null) === '' && svgRede('orkut') === '');
const svg = svgRede('whatsapp');
checar('o svg sai pronto no HTML', svg.startsWith('<svg') && svg.includes('<path d="M17.4'));
checar('a marca e solida e herda a cor', svg.includes('fill="currentColor"'));
const linha = svgRede('mapa');
checar('o de linha e contorno, e nao mancha', linha.includes('fill="none"') && linha.includes('stroke="currentColor"'),
  'alfinete de mapa pintado solido vira uma gota preta');
checar('as duas familias usam a mesma grade', svg.includes('viewBox="0 0 24 24"') && linha.includes('viewBox="0 0 24 24"'));
checar('o svg nao e lido em voz alta', svg.includes('aria-hidden="true"'),
  'o nome da rede ja esta escrito ao lado: sem isto o leitor de tela diria "Instagram Instagram"');
// deles carrega aspas que fechariam o atributo do lado de fora.
// O invariante que impede glifo quebrado. Vale para as duas familias.
for (const [nome, ic] of Object.entries(ICONES_REDE)) {
  checar(`${nome}: tem desenho`, ic && typeof ic.i === 'string' && ic.i.length > 20, JSON.stringify(ic).slice(0, 40));
  checar(`${nome}: declara a familia`, ic.m === 0 || ic.m === 1);
  checar(`${nome}: o desenho e uma forma svg`, /^<(path|circle|rect|line|polyline|polygon|ellipse)[ /]/.test(ic.i), ic.i.slice(0, 20));
  checar(`${nome}: o nome e digitavel sem acento`, /^[a-z0-9-]+$/.test(nome),
    'o comprador digita este nome no campo; acento ou maiuscula viram erro que ele nao ve');
}

// Todo apelido de rotulo tem que apontar para um icone que existe. Um apelido quebrado nao
// derruba nada: ele so nao desenha, em silencio, e e assim que ele fica anos no arquivo.
for (const rotulo of ['Onde fica', 'Horário', 'E-mail', 'Telefone', 'Site', 'Agenda', 'Cardápio',
  'Catálogo', 'Currículo', 'Avaliações', 'Pix', 'Ateliê', 'Consultório', 'Escritório', 'Loja',
  'Estúdio', 'Zap', 'Insta', 'Canal', 'Twitter']) {
  const k = redeDoLink('', rotulo);
  checar(`apelido "${rotulo}" aponta para icone existente`, k && ICONES_REDE[k], `deu ${JSON.stringify(k)}`);
}

if (falhas) {
  console.error(`\n${falhas} falha(s) no reconhecimento de redes`);
  process.exit(1);
}
const marcas = Object.values(ICONES_REDE).filter((i) => i.m).length;
console.log(`OK: ${marcas} marcas e ${Object.keys(ICONES_REDE).length - marcas} icones de linha, escolhidos por campo, link e rotulo`);
