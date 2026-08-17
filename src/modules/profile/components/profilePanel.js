import { t, tui } from '../../../app/i18n.js';
import { esc, safeUrl } from '../../portfolio/lib/sanitize.js';
import { iconeSeloValido } from '../lib/iconesSelo.js';
import { rotulo as rotuloSecao } from '../../../app/rotulos.js';

// UM NUMERO DA CAPA.
//
// O rotulo e escrito pelo comprador e nao cabe num tamanho so: o Helio pos "Projetos" e
// "Idiomas", mas uma advogada poe "Acordos homologados" e um fotografo poe "Ensaios
// entregues". Com o layout antigo (colunas soltas, sem largura e sem alinhamento) o rotulo
// longo quebrava em duas linhas, empurrava o proprio numero para baixo, e a fileira saia
// escadinha: o "240" do fotografo ficava numa altura e o "12" do vizinho noutra.
//
// Tres decisoes que seguram isso, e nenhuma depende do texto ser curto:
//   . `items-end` no container alinha todos os numeros pela MESMA base, tenha o rotulo uma
//     ou duas linhas;
//   . largura maxima no rotulo, para "Acordos homologados" quebrar em duas linhas curtas em
//     vez de esticar a fileira inteira para fora do card;
//   . `flex-wrap` no container, para o quarto numero descer em vez de vazar pela direita.
const statItem = (s, lang) => {
  const rotulo = `<span class="block max-w-[7.5rem] text-[10px] leading-tight uppercase tracking-widest text-white/30 metallic-silver">${esc(t(s.label, lang))}</span>`;
  // A stat "Idiomas" vira o toggle de idioma (PT/EN). Ver main.js (#lang-toggle).
  if (s.lang) {
    return `
            <button id="lang-toggle" type="button" class="flex flex-col items-center text-center cursor-pointer" title="${esc(tui('langAria', lang))}">
              ${rotulo}
              <span class="mt-1 font-bold text-base whitespace-nowrap">
                <span class="${lang === 'pt' ? 'text-white' : 'text-white/35'}">PT</span><span class="text-white/20">/</span><span class="${lang === 'en' ? 'text-white' : 'text-white/35'}">EN</span>
              </span>
            </button>`;
  }
  return `
            <div class="flex flex-col items-center text-center">
              ${rotulo}
              <span class="mt-1 font-bold text-base whitespace-nowrap">${esc(t(s.value, lang))}</span>
            </div>`;
};

// O selo do card de perfil.
//
// ELE ERA LITERAL, e este e o defeito que originou esta rodada: o componente imprimia
// "VibeCoder" com o icone de codigo para todo mundo, enquanto badge_label e badge_icon
// existiam no banco desde a 0002 e viajavam no payload sem ninguem ler. Uma advogada, uma
// confeiteira e um tatuador publicavam paginas dizendo, ao lado do proprio nome, que sao
// vibecoders. Nem quem pagou o bump de personalizacao conseguia mudar, porque o campo do
// editor gravava numa coluna que o render ignorava.
//
// Sem rotulo, o selo NAO SAI. Um botao vazio no card seria pior que a ausencia dele, e o
// espaco e cedido de volta para as estatisticas.
const renderSelo = (profile, lang) => {
  const rotulo = String(t(profile.badgeLabel, lang) ?? '').trim();
  if (!rotulo) return '';
  const icone = iconeSeloValido(profile.badgeIcon);
  return `
        <button class="inline-flex vibecoder-btn text-[11px] font-bold text-white rounded-full py-1.5 px-5 gap-2 items-center justify-center">
          ${icone ? `<i data-lucide="${esc(icone)}" class="h-3.5 w-3.5 text-white"></i>` : ''}
          ${esc(rotulo)}
        </button>`;
};

// Avatar, com o buraco tapado. Sem foto, `safeUrl('')` devolvia string vazia e o HTML saia
// com `<img src="">`, que o navegador resolve como "recarregue a pagina atual como imagem":
// uma requisicao extra ao proprio documento e um icone quebrado no card. O monograma e o
// mesmo recurso que a secao de experiencia ja usa quando falta o logo da empresa.
// A FORMA E ESCOLHA DO DONO DO PORTFOLIO, e as duas classes sao literais no fonte porque o
// Tailwind v4 nao gera classe montada a partir de dado (risco R11).
//
// O oval nasceu por acidente: sem `shrink-0`, o flex do card espremia a foto quando o nome
// quebrava em duas linhas, e o retrato virava uma elipse vertical. O acidente era imprevisivel
// (dependia do comprimento do nome e da largura da tela) e chegou a virar uma tira de 25px.
// Como forma deliberada, com medida fixa, ele e uma opcao legitima e o dono pediu para manter
// as duas. `shrink-0` fica nos dois casos: quem decide a forma e o campo, nunca o acaso do
// texto ao lado.
const FORMAS_AVATAR = {
  circulo: 'w-14 h-14 rounded-full',
  oval: 'w-12 h-16 rounded-[50%]',
};
export const formaAvatarValida = (v) => (v === 'oval' ? 'oval' : 'circulo');

const renderAvatar = (profile) => {
  const nome = String(profile.name || '').trim();
  const forma = FORMAS_AVATAR[formaAvatarValida(profile.avatarShape)];
  if (!profile.avatar) {
    const iniciais = nome.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
    return `<div class="${forma} shrink-0 ring-white/10 ring-2 bg-white/10 flex items-center justify-center text-sm font-bold text-white/70" aria-label="${esc(nome)}">${esc(iniciais || '?')}</div>`;
  }
  return `<img src="${safeUrl(profile.avatar)}" alt="${esc(nome)} Avatar" loading="lazy" decoding="async" class="${forma} shrink-0 object-cover ring-white/10 ring-2">`;
};

// O botao principal. Duas coisas mudaram aqui.
//
// O ROTULO vem do dado: `cta_label_i18n` e um dos seis itens vendidos no bump de
// personalizacao, e o componente cravava "Agendar Call". Quem pagava para trocar o texto do
// botao trocava uma coluna que ninguem lia. O fallback continua sendo o texto de hoje, entao
// para quem nao definiu nada nada muda.
//
// E o botao SO SAI SE HOUVER LINK: sem `cta_url`, `safeUrl` devolvia vazio e o `<a href="">`
// aponta para a propria pagina. Um comprador que ainda nao pos a agenda dele publicava um
// botao grande e chamativo que recarrega a pagina.
const renderCta = (profile, lang) => {
  if (!profile.ctaUrl) return '';
  const rotulo = String(t(profile.ctaLabel, lang) ?? '').trim() || tui('bookCall', lang);
  return `
        <a href="${safeUrl(profile.ctaUrl)}" target="_blank" rel="noopener noreferrer" class="bookmarkBtn mt-2">
          <span class="IconContainer">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="icon-svg"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
          </span>
          <p class="btn-text">${esc(rotulo)}</p>
        </a>`;
};

// UMA REDE SOCIAL.
//
// `flex-1` FICA, e isso e deliberado: e ele que faz as redes dividirem a altura da coluna e
// acompanharem o cartao "Sobre" ao lado, que e o desenho do layout. Tirar isso, como cheguei
// a fazer, encolhe as redes e abre um buraco na coluna, e muda a pagina de quem nao pediu
// nada.
//
// O DEFEITO ERA OUTRO, e so o texto: `justify-between` sem folga junta rotulo e valor assim
// que a soma passa da largura, e a pagina de uma advogada publicou
// "Instagram@renata.trabalhista", sem espaco, e "LinkedIn" colado num usuario de 22
// caracteres. O conserto e o `gap` minimo garantido, o rotulo que nao encolhe, e o valor
// cedendo espaco com reticencia por ser o texto secundario. A altura nao muda.
const socialItem = ({ label, value, href }, lang) => `
            <a href="${safeUrl(href)}" target="_blank" rel="noopener noreferrer" class="flex-1 max-h-16 flex items-center justify-between gap-3 rounded-xl glass-button px-4 py-2.5">
              <span class="shrink-0">${esc(label)}</span>
              <span class="min-w-0 truncate text-right text-white/40 font-normal">${esc(t(value, lang))}</span>
            </a>`;

// Coluna direita (topo): card de perfil + bio + sociais.
//
// O CARD DO TOPO QUEBRA EM DUAS LINHAS ANTES DE ESPREMER O NOME. Sem isso, com quatro numeros
// de capa de rotulo longo (o caso de uma advogada: "Acordos homologados", "Casos conduzidos")
// a coluna da identidade era comprimida ate caber uma letra por linha, e "Renata Vasconcelos"
// saiu impresso na vertical em producao, uma letra embaixo da outra. A largura minima da
// identidade, mais o flex-wrap no pai, sao o que garante que quem desce para a linha de baixo
// e a fileira de numeros, nunca o nome da pessoa.
export function renderProfilePanel(profile, lang, ui = {}) {
  return `
    <!-- Card de Perfil -->
    <!-- Card de Perfil -->
    <div class="flex flex-col sm:flex-row sm:flex-wrap sm:items-start sm:justify-between glass-card rounded-3xl p-6 gap-5">
      <div class="flex items-center gap-4 sm:min-w-[15rem] sm:flex-1">
        <div class="relative shrink-0">
          ${renderAvatar(profile)}
          ${profile.showOnlineDot === false ? '' : `<span class="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-black rounded-full shadow-lg"></span>`}
        </div>
        <div class="min-w-0">
          <h1 class="text-2xl md:text-3xl font-bold tracking-tight text-white">${esc(profile.name)}</h1>
          <p class="text-xs font-medium text-white/40 metallic-silver">${esc(t(profile.role, lang))}</p>
        </div>
      </div>
      <div class="flex flex-col gap-3 sm:items-end">
        <div class="flex flex-wrap items-end justify-start sm:justify-end gap-x-5 gap-y-3 text-xs text-white/80">${profile.stats.map((s) => statItem(s, lang)).join('')}
        </div>
        ${renderSelo(profile, lang)}
      </div>
    </div>

    <!-- Bio + Sociais -->
    <div class="grid grid-cols-1 md:grid-cols-5 gap-4">
      <div class="md:col-span-3 flex flex-col gap-3 glass-card rounded-3xl p-6">
        <h2 class="text-[10px] font-bold uppercase tracking-widest text-white/30 metallic-silver w-fit">${esc(rotuloSecao(ui, 'about', lang))}</h2>
        <p class="text-sm text-white/80 leading-relaxed font-medium">${esc(t(profile.bio, lang))}</p>
      </div>

      <div class="md:col-span-2 flex flex-col gap-2 glass-card rounded-3xl p-5">
        <div class="flex-1 flex flex-col gap-2 text-[11px] font-semibold text-white">${profile.socials.map((s) => socialItem(s, lang)).join('')}
        </div>

        ${renderCta(profile, lang)}
      </div>
    </div>`;
}
