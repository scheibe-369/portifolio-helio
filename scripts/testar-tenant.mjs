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

// ---------------------------------------------------------------- nada do Helio vaza
{
  const html = render({ projects: [{ slug: 'bolo', name: 'Bolo de festa', category: 'Encomenda', groups: [] }] });
  checar('o nome do dono da plataforma nao aparece', !html.includes('Helio Monteiro'),
    'a assercao que a licao de 14/08 pede: o conteudo ERRADO nao esta la');
  checar('o projeto do tenant aparece', html.includes('Bolo de festa'));
}

if (falhas) {
  console.error(`\n${falhas} falha(s) no render de tenant`);
  process.exit(1);
}
console.log('OK: render de tenant, do payload ao HTML, pelo caminho da producao');
