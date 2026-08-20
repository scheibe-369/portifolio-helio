// Renderiza o portfolio de um COMPRADOR, pelo caminho que a producao usa, e afirma coisas
// sobre o HTML que sai.
//
// POR QUE ISTO EXISTE, e por que ele nao e mais um dom-diff: o snapshot.mjs monta o `ctx` na
// mao a partir dos modulos estaticos do Helio (profile.data.js, projects.data.js) e nunca
// passa por `montarCtx`. A producao faz o contrario: payload do banco -> montarCtx -> render.
// Sao dois caminhos para o mesmo componente, e o pedaco que so existe no de producao
// (a traducao de payload para ctx) nao tinha teste nenhum. Uma mudanca podia zerar o
// dom-diff e mesmo assim mudar o site de todo comprador.
//
// O outro buraco que ele fecha: o baseline e o portfolio do Helio, que esta COMPLETO. Nada
// exercitava o portfolio de quem acabou de comprar, que e o oposto: sem foto, sem projeto,
// sem experiencia, sem selo. Era ali que moravam o `<img src="">` e o botao que recarrega a
// pagina.
//
//   node scripts/testar-tenant.mjs
import { montarCtx } from '../src/modules/portfolio/lib/ctx.js';
import { renderPortfolioPage } from '../src/app/portfolioPage.js';
import { renderProjectModal } from '../src/modules/projects/components/projectModal.js';

const CFG = { apexHost: 'myportifolio.com.br', mediaBase: 'https://exemplo.supabase.co/storage/v1/object/public/portfolio-media' };
const URL_TENANT = new URL('https://fulana.myportifolio.com.br/');

// ATENCAO A FORMA, porque ela nao e uniforme e ja custou caro no projeto (licao de 14/08,
// "o teste que eu escrevi provava a minha suposicao"): no payload publicado o PERFIL guarda
// objeto i18n (`'role', v_pf.role_i18n`), e o PROJETO guarda string ja resolvida em portugues
// (`'name', o.name_i18n ->> 'pt'`), com o ingles vindo a parte em `projectsEn`. Inventar
// `{pt: ...}` num campo de projeto faz o render imprimir "[object Object]" e o teste acusar
// um defeito que nao existe. Ver supabase/migrations/0007_experiencias.sql:498-516.
//
// O payload mais pobre que o banco consegue publicar: quem acabou de comprar, respondeu as
// duas perguntas obrigatorias do wizard e clicou em publicar.
const RECEM_COMPRADO = {
  profile: { name: 'Fulana de Tal', role: { pt: 'Confeiteira' }, bio: { pt: '' }, socials: [], stats: [] },
  projects: [],
  experiences: [],
  stacks: [],
  filterGroups: [],
  seo: {},
  lang: { default: 'pt' },
};

const render = (payload, lang = 'pt') => {
  const ctx = montarCtx(CFG, {
    payload: { ...RECEM_COMPRADO, ...payload },
    payloadV: 2,
    payloadVCorrente: 2,
    slug: 'fulana',
    url: URL_TENANT,
  });
  if (!ctx) throw new Error('montarCtx devolveu null');
  return renderPortfolioPage({ ...ctx, lang });
};

let falhas = 0;
const checar = (nome, condicao, detalhe) => {
  if (!condicao) {
    falhas += 1;
    console.error(`FALHOU  ${nome}${detalhe ? `\n        ${detalhe}` : ''}`);
  }
};

// ---------------------------------------------------------------- o selo do perfil
{
  const html = render({});
  checar('sem badge_label, o selo nao sai', !html.includes('vibecoder-btn'));
  checar('sem badge_label, a palavra VibeCoder nao aparece', !html.includes('VibeCoder'),
    'era o defeito de origem: toda profissao publicava um selo de vibecoder');
}
{
  const html = render({ profile: { ...RECEM_COMPRADO.profile, badgeLabel: 'Confeiteira', badgeIcon: 'cake' } });
  checar('o rotulo do selo vem do dado', html.includes('Confeiteira'));
  checar('o icone do selo vem do dado', html.includes('data-lucide="cake"'));
}
{
  const html = render({ profile: { ...RECEM_COMPRADO.profile, badgeLabel: 'Chef', badgeIcon: 'nao-existe' } });
  checar('icone fora da lista nao vira atributo', !html.includes('nao-existe'),
    'o lucide so pinta o que o bundle registrou: nome livre viraria um buraco no card');
  checar('mas o rotulo continua saindo', html.includes('Chef'));
}

// ---------------------------------------------------------------- bolinha de disponivel
{
  const ligada = render({ profile: { ...RECEM_COMPRADO.profile, showOnlineDot: true } });
  const desligada = render({ profile: { ...RECEM_COMPRADO.profile, showOnlineDot: false } });
  checar('bolinha ligada aparece', ligada.includes('bg-green-500'));
  checar('bolinha desligada some', !desligada.includes('bg-green-500'),
    'o switch existe no editor desde sempre e nao mudava nada');
}

// ---------------------------------------------------------------- botao principal
{
  const html = render({});
  checar('sem cta_url, o botao nao sai', !html.includes('bookmarkBtn'),
    'antes saia um <a href=""> que recarrega a propria pagina');
}
{
  const html = render({ profile: { ...RECEM_COMPRADO.profile, ctaUrl: 'https://wa.me/5521999999999' } });
  checar('com cta_url, o botao sai', html.includes('bookmarkBtn'));
  checar('e o rotulo padrao continua sendo o de hoje', html.includes('Agendar Call'));
}
{
  const html = render({ profile: { ...RECEM_COMPRADO.profile, ctaUrl: 'https://wa.me/5521999999999', ctaLabel: { pt: 'Pedir orcamento' } } });
  checar('o rotulo do botao vem do dado', html.includes('Pedir orcamento'));
  checar('e substitui o padrao', !html.includes('Agendar Call'),
    'cta_label_i18n e um dos seis itens vendidos no bump de R$ 37,90');
}

// ---------------------------------------------------------------- imagem faltando
{
  const html = render({});
  checar('nunca sai <img src="">', !html.includes('src=""'),
    'o navegador resolve src vazio como "recarregue o documento como imagem"');
  checar('sem avatar, sai o monograma', html.includes('FD'), 'iniciais de "Fulana de Tal"');
}

// ---------------------------------------------------------------- listas vazias
{
  const html = render({});
  checar('sem stacks, a secao nao sai', !html.includes('Stacks Dominadas'),
    'comprador novo via um card com titulo e nada dentro');
  checar('sem projetos, a secao nao sai', !html.includes('Meus Projetos'));
  checar('sem experiencia, a secao nao sai', !html.includes('Experiência'));
}

// ---------------------------------------------------------------- video vertical
{
  const horizontal = renderProjectModal({ slug: 'x', name: 'X', videoId: 'dQw4w9WgXcQ', videoOrientation: 'horizontal', features: [], stack: [] }, 'pt');
  const vertical = renderProjectModal({ slug: 'y', name: 'Y', videoId: 'dQw4w9WgXcQ', videoOrientation: 'portrait', features: [], stack: [] }, 'pt');
  checar('video horizontal fica 16:9', horizontal.includes('aspect-video'));
  checar('video vertical fica 9:16', vertical.includes('aspect-[9/16]'),
    'Shorts entrava numa moldura 16:9 e vinha com duas tarjas pretas');
  checar('video vertical nao fica 16:9 tambem', !vertical.includes('aspect-video'));
}

// ---------------------------------------------------------------- projeto sem imagem
{
  const html = render({ projects: [{ slug: 'caso', name: 'Reclamatoria trabalhista', category: 'Contencioso', groups: [] }] });
  checar('projeto sem imagem nao sai com src vazio', !html.includes('src=""'),
    'e o caso da advogada: caso juridico nao tem print, e todo card exigia imagem');
  checar('mas o card do projeto aparece', html.includes('Reclamatoria trabalhista'));
}
{
  // O ramo COM imagem tem que ser exercitado tambem: sem este caso, um erro de import no
  // caminho da imagem passaria despercebido, porque todo o resto do arquivo roda sem ela.
  const html = render({ projects: [{ slug: 'bolo', name: 'Bolo', category: 'Doce', groups: [], imagePath: 'abc/project/bolo-1234abcd.webp' }] });
  checar('projeto com imagem sai com <img>', html.includes('<img src="https://exemplo.supabase.co'));
  checar('e a URL e montada a partir do caminho relativo', html.includes('abc/project/bolo-1234abcd.webp'),
    'o banco guarda caminho relativo; quem monta URL absoluta e o render (achado 12)');
}

// ---------------------------------------------------------------- rotulos das secoes
{
  const base = { stacks: ['Brigadeiro', 'Bolo'], projects: [{ slug: 'b', name: 'Bolo', category: 'Doce', groups: [] }] };
  const padrao = render(base);
  checar('sem uiLabels, o titulo e o de hoje', padrao.includes('Stacks Dominadas') && padrao.includes('Meus Projetos'),
    'e isso que mantem identico o portfolio do Helio e o de todo tenant publicado antes da 0015');

  const proprio = render({ ...base, uiLabels: {
    stacks: { pt: 'Minhas especialidades' },
    projects: { pt: 'Meus doces' },
    cases: { pt: 'receitas' },
  } });
  checar('o titulo das especialidades vem do dono', proprio.includes('Minhas especialidades'));
  checar('e a palavra de programador some', !proprio.includes('Stacks Dominadas'),
    'uma confeiteira publicava STACKS DOMINADAS em cima de "Brigadeiro gourmet"');
  checar('o titulo dos trabalhos vem do dono', proprio.includes('Meus doces') && !proprio.includes('Meus Projetos'));
  // A palavra "cases" sobrevive no NOME do atributo `data-cases-label`, que e interno e nao e
  // lido por ninguem. O que importa e o texto visivel do contador, entao a assercao mira nele.
  checar('o contador usa a palavra do dono', /1 receitas/.test(proprio) && !/\d+ cases/.test(proprio));

  // Rotulo em branco nao apaga o titulo: cai no padrao. Sem esta regra, um campo limpo por
  // engano publicaria uma secao sem nome nenhum.
  const vazio = render({ ...base, uiLabels: { stacks: { pt: '   ' } } });
  checar('rotulo em branco cai no padrao', vazio.includes('Stacks Dominadas'));
}

// ---------------------------------------------------------------- forma do avatar
{
  const perfil = { ...RECEM_COMPRADO.profile, avatarPath: 'abc/avatar/x-1234abcd.webp' };
  const circulo = render({ profile: { ...perfil, avatarShape: 'circulo' } });
  const oval = render({ profile: { ...perfil, avatarShape: 'oval' } });
  const semNada = render({ profile: perfil });
  checar('circulo e o padrao', semNada.includes('rounded-full'));
  checar('oval sai quando escolhido', oval.includes('rounded-[50%]'));
  checar('e o oval nao e redondo tambem', !oval.includes('w-14 h-14 rounded-full'));
  checar('circulo explicito continua redondo', circulo.includes('rounded-full'));
}

// ---------------------------------------------------------------- paleta e fundo
{
  const semNada = render({});
  checar('sem paleta, nao sai variavel de cor', !semNada.includes('--pf-accent'),
    'e o que garante que o computed style de quem nao escolheu nada seja o de sempre');
  checar('sem fundo, nao sai camada de fundo', !semNada.includes('pf-bg'),
    'markup escondido pesa; ausencia da feature produz ausencia de markup');

  const comPaleta = render({ theme: { preset: 'brasa' } });
  checar('a paleta vira variavel CSS', comPaleta.includes('--pf-accent: #E8833A'));
  checar('e a placa do tema tambem', comPaleta.includes('--pf-plate: #1A1008'));

  const inventada = render({ theme: { preset: 'paleta-que-nao-existe' } });
  checar('paleta desconhecida cai no padrao sem quebrar', !inventada.includes('--pf-accent: #'),
    'preset invalido nunca pode derrubar a pagina de um cliente pagante');

  const comFundo = render({ theme: { preset: 'brasa', background: { kind: 'mesh' } } });
  checar('o fundo escolhido vira camada', comFundo.includes('pf-bg-mesh'));
  checar('e a camada leva a cor junto', /pf-bg-mesh[^>]*--pf-accent: #E8833A/.test(comFundo),
    'a camada e IRMA da secao, entao nao herda a variavel declarada nela');

  const fundoRuim = render({ theme: { background: { kind: 'nao-existe' } } });
  checar('fundo desconhecido nao sai', !fundoRuim.includes('pf-bg'));

  const fotoSemFoto = render({ theme: { background: { kind: 'photo' } } });
  checar('fundo de foto sem foto nao sai', !fotoSemFoto.includes('pf-bg'),
    'o CHECK do banco ja recusa, e o render nao confia em dado que veio de fora');

  const comFoto = render({ theme: { background: { kind: 'photo', path: 'abc/hero/f-1234abcd.webp', overlay: 70 } } });
  checar('fundo de foto monta a URL do caminho relativo', comFoto.includes('abc/hero/f-1234abcd.webp'));
  checar('e aplica o veu pedido', comFoto.includes('rgba(0,0,0,0.7)'),
    'o veu e o que garante texto branco legivel sobre foto que ninguem validou');

  const veuBaixo = render({ theme: { background: { kind: 'photo', path: 'abc/hero/f-1234abcd.webp', overlay: 0 } } });
  checar('veu abaixo do minimo e elevado', veuBaixo.includes('rgba(0,0,0,0.2)'));
}

// ---------------------------------------------------------------- ordem das secoes
{
  const cheio = {
    stacks: ['A', 'B'],
    projects: [{ slug: 'p', name: 'Trabalho', category: 'Cat', groups: [] }],
    experiences: [{ slug: 'e', org: 'Casa', kind: 'work', role: 'Cargo', start: '2020', highlights: [] }],
  };
  const posicao = (html, texto) => html.indexOf(texto);

  const padrao = render(cheio);
  checar('sem lista, a ordem e a de sempre',
    posicao(padrao, 'Stacks Dominadas') < posicao(padrao, 'Meus Projetos')
      && posicao(padrao, 'Meus Projetos') < posicao(padrao, 'Experiência'),
    'e o estado de todo tenant publicado antes desta feature, e do portfolio do Helio');

  const invertido = render({ ...cheio, sections: [
    { key: 'experience' }, { key: 'projects' }, { key: 'stacks' },
  ] });
  checar('a ordem escolhida vale',
    posicao(invertido, 'Experiência') < posicao(invertido, 'Meus Projetos')
      && posicao(invertido, 'Meus Projetos') < posicao(invertido, 'Stacks Dominadas'),
    'para uma psicologa, que nao pode ter trabalho nenhum, a formacao E o portfolio');

  const desligada = render({ ...cheio, sections: [{ key: 'stacks', on: false }] });
  checar('secao desligada nao sai', !desligada.includes('Stacks Dominadas'));
  checar('e as outras continuam, no lugar certo',
    desligada.includes('Meus Projetos') && desligada.includes('Experiência'),
    'secao que nao esta na lista entra no fim, ligada: e o que faz secao nova nascer visivel');

  // As tres formas de dado ruim que nao podem derrubar a pagina de quem pagou.
  const inventada = render({ ...cheio, sections: [{ key: 'secao_que_nao_existe' }, { key: 'projects' }] });
  checar('chave desconhecida e ignorada sem lancar', inventada.includes('Meus Projetos'));
  const duplicada = render({ ...cheio, sections: [{ key: 'projects' }, { key: 'projects' }] });
  checar('duplicata nao renderiza duas vezes',
    duplicada.split('data-cases-label').length - 1 === 1);
  const lixo = render({ ...cheio, sections: 'isso nao e uma lista' });
  checar('lista malformada cai na ordem padrao', lixo.includes('Stacks Dominadas'));
}

// ---------------------------------------------------------------- destaque do trabalho
{
  const semDestaque = render({ projects: [{ slug: 'b', name: 'Bolo', category: 'Doce', groups: [] }] });
  checar('sem destaque, o markup do card e o de sempre', !semDestaque.includes('mt-0.5 text-[10px] font-semibold'),
    'ausencia da feature produz ausencia de markup: 20 cards de quem nao usa o campo nao podem mudar');

  const comDestaque = render({ projects: [{ slug: 'b', name: 'Bolo', category: 'Doce', groups: [], highlight: 'A partir de R$ 180' }] });
  checar('o destaque aparece na grade', comDestaque.includes('A partir de R$ 180'),
    'preco escondido atras de um clique e preco que nao vende');
  checar('e o nome continua la', comDestaque.includes('Bolo'));
}

// ---------------------------------------------------------------- capa grande e per-page
{
  const foto = renderProjectModal({ slug: 'a', name: 'Obra', image: 'https://x/f.webp', fit: 'cover', features: [], stack: [] }, 'pt');
  const logo = renderProjectModal({ slug: 'b', name: 'Logo', image: 'https://x/l.webp', features: [], stack: [] }, 'pt');
  checar('trabalho com FOTO mostra a capa grande', foto.includes('max-h-[60vh]'),
    'a obra de uma arquiteta aparecia num selo de 64px seguido de 600 palavras');
  checar('e sem o selo pequeno junto', !foto.includes('w-16 h-16'), 'senao a imagem sai duas vezes');
  checar('trabalho com LOGO mantem o selo', logo.includes('w-16 h-16'),
    'logo fica melhor pequena, e e o caso do portfolio do Helio');
  checar('e logo nao vira capa grande', !logo.includes('max-h-[60vh]'));

  const seis = render({ projects: [{ slug: 'p', name: 'P', category: 'C', groups: [] }] });
  checar('perPage 6 nao emite atributo', !seis.includes('data-per-page'),
    'o padrao nao muda o HTML de quem nunca mexeu no select');
  const nove = render({ perPage: 9, projects: [{ slug: 'p', name: 'P', category: 'C', groups: [] }] });
  checar('perPage 9 emite o atributo', nove.includes('data-per-page="9"'),
    'um fotografo escolheu 9 e continuou vendo 6');
}

// ---------------------------------------------------------------- credito de producao
{
  const html = render({});
  checar('a pagina do comprador nao leva o credito da agencia', !html.includes('Method Growth Hub'),
    'quem pagou por um portfolio no proprio nome nao comprou um outdoor nosso');
}

// ---------------------------------------------------------------- nada do Helio vaza
{
  const html = render({ projects: [{ slug: 'bolo', name: 'Bolo de festa', category: 'Encomenda', groups: [] }] });
  checar('o nome do dono da plataforma nao aparece', !html.includes('Helio Monteiro'),
    'a assercao que a licao de 14/08 pede: o conteudo ERRADO nao esta la');
  checar('o projeto do tenant aparece', html.includes('Bolo de festa'));
}

// ---------------------------------------------------------------- o card de identidade
//
// Estes casos existem porque o defeito foi medido, e nao imaginado: na pagina de um corretor,
// em 1440, os quatro numeros da capa ocupavam de x=756 a x=1016 num card que ia ate x=1234,
// e "5" ficava 12px abaixo de "R$ 1,9 mi" na mesma fileira. Sao dois defeitos com a mesma
// origem, o ramo de grade que nasceu sem `items-end` e a coluna que descia alinhada a
// esquerda, e por isso os dois sao afirmados aqui juntos.
{
  const tres = [
    { label: 'Projetos', value: '30+' },
    { label: 'Experiência', value: '3+ anos' },
    { label: 'Idiomas', value: 'PT/EN' },
  ];
  const quatro = [
    { label: 'Anos de CRECI', value: '19' },
    { label: 'Imóveis vendidos', value: '340' },
    { label: 'Bairros que eu atendo', value: '5' },
    { label: 'Ticket médio', value: 'R$ 1,9 mi' },
  ];

  const a = render({ profile: { ...RECEM_COMPRADO.profile, stats: tres } });
  checar('ate tres numeros, a fileira fica ao lado do nome', a.includes('sm:justify-end'),
    'o layout de quem tem poucos numeros nao pode mudar');
  checar('ate tres numeros, nao existe faixa', !a.includes('sm:basis-full'));

  const b = render({ profile: { ...RECEM_COMPRADO.profile, stats: quatro } });
  checar('de quatro em diante vira faixa de largura inteira', b.includes('sm:basis-full'),
    'sem a faixa, sobravam 218px de card vazio a direita dos numeros');
  checar('a faixa tem uma coluna por numero', b.includes('sm:grid-cols-4'));
  checar('a faixa alinha os numeros pela base', /sm:basis-full[^"]*items-end|items-end[^"]*sm:basis-full/.test(b),
    'sem items-end, rotulo de duas linhas empurra o proprio numero para baixo e a fileira sai escadinha');
  checar('a faixa nao repete os numeros', b.split('Ticket médio').length === 2,
    'a fileira e a faixa sao exclusivas; emitir as duas duplicaria a capa inteira');

  // O selo sobrevive a faixa, e sem selo a coluna dele nao sai.
  const c = render({ profile: { ...RECEM_COMPRADO.profile, stats: quatro, badgeLabel: 'Corretor CRECI-SP' } });
  checar('com faixa, o selo continua na primeira linha', c.includes('Corretor CRECI-SP'));
  checar('com faixa e sem selo, nao sobra div vazia', !b.includes('sm:items-end'),
    'div vazia entre a identidade e a faixa so somaria o gap do pai duas vezes');
}

// ---------------------------------------------------------------- as redes
{
  const tres = [
    { label: 'WhatsApp', value: '(11) 98214-7730', href: 'https://wa.me/5511982147730' },
    { label: 'Instagram', value: '@wilsontavares.imoveis', href: 'https://instagram.com/wilsontavares.imoveis' },
    { label: 'Imobiliária', value: 'Tavares Negócios Imobiliários', href: 'https://maps.google.com/?q=x' },
  ];
  const quatro = [
    { label: 'Instagram', value: '1000+', href: 'https://instagram.com/a' },
    { label: 'TikTok', value: '2800+', href: 'https://tiktok.com/@a' },
    { label: 'LinkedIn', value: 'Perfil', href: 'https://linkedin.com/in/a' },
    { label: 'YouTube', value: 'Canal', href: 'https://youtube.com/@a' },
  ];

  const poucas = render({ profile: { ...RECEM_COMPRADO.profile, socials: tres, bio: { pt: 'x'.repeat(700) } } });
  checar('com menos de quatro redes, a bio usa a largura inteira', poucas.includes('md:col-span-5'),
    '722 caracteres numa coluna de 310px, com 238px de vao vazio do lado, era o pior dos dois mundos');
  checar('com menos de quatro redes, elas viram fileira', poucas.includes('sm:grid-cols-3'));
  checar('na fileira as redes nao esticam', !poucas.includes('max-h-16'),
    'flex-1 existe para dividir a altura de uma coluna; em fileira nao ha altura a dividir');

  const muitas = render({ profile: { ...RECEM_COMPRADO.profile, socials: quatro } });
  checar('com quatro redes, a coluna estreita continua', muitas.includes('md:col-span-2'),
    'o Helio tem quatro e a pagina dele nao pode mudar');
  checar('com quatro redes, as redes ainda esticam', muitas.includes('max-h-16'));

  // Valor comprido: descer uma linha em vez de virar reticencia.
  checar('valor curto continua na mesma linha', muitas.includes('min-w-0 truncate'));
  checar('valor comprido ganha a linha inteira', poucas.includes('basis-full break-words'),
    'meio telefone nao e um texto encurtado, e um numero errado');

  // O simbolo da marca.
  checar('sem o interruptor, nenhum simbolo entra', !muitas.includes('<svg viewBox="0 0 24 24" fill="currentColor"'),
    'o padrao do render protege o oraculo visual: quem nao pediu nao ganha');
  const comIcone = render({ profile: { ...RECEM_COMPRADO.profile, socials: quatro, socialsIcons: true } });
  checar('com o interruptor, o simbolo sai no primeiro byte', comIcone.includes('fill="currentColor"'),
    'nada de data-lucide aqui: no HTML da borda ele seria uma tag vazia');
  checar('o simbolo herda a cor do cartao', !comIcone.includes('#25D366'),
    'verde do WhatsApp e vermelho do YouTube brigariam entre si e com as doze paletas');

  const semMarca = render({ profile: { ...RECEM_COMPRADO.profile, socials: tres, socialsIcons: true } });
  checar('rede desconhecida fica so com o nome', semMarca.split('fill="currentColor"').length === 3,
    'WhatsApp e Instagram sim, "Imobiliária" apontando para o Google Maps nao');
}

if (falhas) {
  console.error(`\n${falhas} falha(s) no render de tenant`);
  process.exit(1);
}
console.log('OK: render de tenant, do payload ao HTML, pelo caminho da producao');
