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
import { ICONES_REDE, redeDoLink, svgRede } from '../src/modules/profile/lib/iconesRede.js';

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

// O QUE NAO E REDE NAO GANHA DESENHO. O corretor tem uma linha "Imobiliaria" apontando para o
// Google Maps, e o funileiro usa o campo como slot generico para a oficina.
checar('mapa nao vira marca', redeDoLink('https://maps.google.com/?q=x', 'Imobiliária') === null);
checar('site proprio nao vira marca', redeDoLink('https://oficinadozeh.com.br', 'Oficina') === null);
checar('entrada vazia nao quebra', redeDoLink('', '') === null);
checar('entrada nula nao quebra', redeDoLink(null, undefined) === null);
checar('texto que nao e link nao quebra', redeDoLink('rua sao geraldo, 412', 'Endereço') === null);

// O SVG.
checar('rede desconhecida nao emite svg', svgRede(null) === '' && svgRede('orkut') === '');
const svg = svgRede('whatsapp');
checar('o svg sai pronto no HTML', svg.startsWith('<svg') && svg.includes('<path d="M17.4'));
checar('o svg e solido e herda a cor', svg.includes('fill="currentColor"'));
checar('o svg nao e lido em voz alta', svg.includes('aria-hidden="true"'),
  'o nome da rede ja esta escrito ao lado: sem isto o leitor de tela diria "Instagram Instagram"');

// O invariante que impede glifo quebrado: todo path e um caminho SVG de verdade, e nenhum
// deles carrega aspas que fechariam o atributo do lado de fora.
for (const [nome, d] of Object.entries(ICONES_REDE)) {
  checar(`${nome}: o path comeca com um comando de movimento`, /^[Mm]/.test(d), d.slice(0, 12));
  checar(`${nome}: o path nao escapa do atributo`, !d.includes('"') && !d.includes('<'));
  checar(`${nome}: o path tem tamanho de logo`, d.length > 100);
}

// O mapa de apelidos nao pode apontar para marca que nao existe.
const semDesenho = Object.keys(ICONES_REDE).filter((k) => !ICONES_REDE[k]);
checar('toda marca listada tem desenho', semDesenho.length === 0, semDesenho.join(', '));

if (falhas) {
  console.error(`\n${falhas} falha(s) no reconhecimento de redes`);
  process.exit(1);
}
console.log(`OK: ${Object.keys(ICONES_REDE).length} marcas, reconhecidas por link e por rotulo`);
