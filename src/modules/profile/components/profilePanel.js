import { t, tui } from '../../../app/i18n.js';
import { esc, safeUrl } from '../../portfolio/lib/sanitize.js';
import { iconeSeloValido } from '../lib/iconesSelo.js';
import { redeDoLink, svgRede } from '../lib/iconesRede.js';
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
// QUANTAS COLUNAS A FAIXA DE NUMEROS USA.
//
// Classe literal por quantidade, e nao montada com template: o Tailwind v4 varre o fonte em
// busca de nomes de classe inteiros e nao gera `grid-cols-${n}` (risco R11). Uma classe que o
// scanner nao ve nao existe no CSS, e a faixa cairia numa coluna so, em silencio.
const COLUNAS_FAIXA = {
  4: 'grid-cols-2 sm:grid-cols-4',
  5: 'grid-cols-2 sm:grid-cols-3',
  6: 'grid-cols-2 sm:grid-cols-3',
};
const colunasFaixa = (n) => COLUNAS_FAIXA[n] || 'grid-cols-2 sm:grid-cols-3';

const COLUNAS_REDES = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-3',
};
const colunasRedes = (n) => COLUNAS_REDES[n] || 'grid-cols-1 sm:grid-cols-3';

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
const renderCta = (profile, lang, margem = 'mt-2') => {
  if (!profile.ctaUrl) return '';
  const rotulo = String(t(profile.ctaLabel, lang) ?? '').trim() || tui('bookCall', lang);
  return `
        <a href="${safeUrl(profile.ctaUrl)}" target="_blank" rel="noopener noreferrer" class="bookmarkBtn${margem ? ` ${margem}` : ''}">
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
// O VALOR COMPRIDO DESCE UMA LINHA EM VEZ DE SER CORTADO. O cartao das redes tem 128px de
// texto util, e ate agora o que nao coubesse virava reticencia: "Tavares Negocios Imobil...",
// "@rafaxime..." e "(51) 99612...". Telefone cortado ao meio nao e um texto encurtado, e um
// numero errado, e foi por isso que este item entrou. `basis-full` aproveita o `flex-wrap`
// que ja existe no `<a>`: o valor desce e passa a ter o cartao inteiro para ele.
//
// `flex-1` FICA, e isso e deliberado: e ele que faz as redes dividirem a altura da coluna e
// acompanharem o cartao "Sobre" ao lado, que e o desenho do layout. Some quando as redes
// deixam de morar numa coluna e viram fileira, porque ai nao ha altura para dividir.
const socialItem = ({ label, value, href }, lang, opcoes = {}) => {
  const texto = String(t(value, lang) ?? '');
  const longo = texto.length > 12;
  const icone = opcoes.icones ? svgRede(redeDoLink(href, label)) : '';
  const altura = opcoes.esticar === false ? '' : `flex-1 ${longo ? 'max-h-20' : 'max-h-16'} `;
  return `
            <a href="${safeUrl(href)}" target="_blank" rel="noopener noreferrer" class="${altura}flex flex-wrap items-center justify-between gap-x-3 rounded-xl glass-button px-4 py-2.5">
              ${icone ? `<span class="shrink-0 flex items-center gap-2">${icone}${esc(label)}</span>` : `<span class="shrink-0">${esc(label)}</span>`}
              <span class="${longo ? 'basis-full break-words' : 'min-w-0 truncate'} text-right text-white/40 font-normal">${esc(texto)}</span>
            </a>`;
};

// Coluna direita (topo): card de perfil + bio + sociais.
//
// O CARD DO TOPO QUEBRA EM DUAS LINHAS ANTES DE ESPREMER O NOME. Sem isso, com quatro numeros
// de capa de rotulo longo (o caso de uma advogada: "Acordos homologados", "Casos conduzidos")
// a coluna da identidade era comprimida ate caber uma letra por linha, e "Renata Vasconcelos"
// saiu impresso na vertical em producao, uma letra embaixo da outra. A largura minima da
// identidade, mais o flex-wrap no pai, sao o que garante que quem desce para a linha de baixo
// e a fileira de numeros, nunca o nome da pessoa.
//
// SO QUE QUEM DESCIA DESCIA PARA O LUGAR ERRADO, e este e o defeito que esta rodada conserta.
// Medido na pagina de um corretor, em 1440: o card tem 528px e os quatro numeros ocupavam de
// 756 a 1016, deixando 218px de preto solido a direita deles. O motivo e que a coluna dos
// numeros, sozinha na segunda linha, e alinhada pela ESQUERDA (com um item so, o
// `justify-between` do pai vira `flex-start`), enquanto o `sm:items-end` dela alinha os
// filhos DENTRO da coluna e nao a coluna. O resultado e um bloco estreito encostado num canto
// e um vao do tamanho de metade do card.
//
// Ate tres numeros, a fileira continua onde sempre esteve, ao lado do nome. De quatro em
// diante ela deixa de ser coluna e vira FAIXA: linha propria, largura inteira do card,
// separada por um fio, uma coluna de grade por numero. O vao acaba porque a faixa ocupa
// exatamente o que antes sobrava.
//
// E OS NUMEROS VOLTAM A SE ALINHAR. `items-end` estava so no ramo de fileira; o ramo de grade
// nasceu sem ele, e ai bastava um rotulo quebrar em duas linhas para o numero afundar:
// "Bairros que eu atendo / 5" saiu 12px abaixo de "Ticket medio / R$ 1,9 mi", lado a lado.
// Com `items-end` na grade, cada celula e alinhada pela base da propria linha, e todos os
// numeros voltam para a mesma altura, tenha o rotulo uma, duas ou tres linhas.
export function renderProfilePanel(profile, lang, ui = {}) {
  const stats = profile.stats;
  const socials = profile.socials;
  const emFaixa = stats.length > 3;
  const selo = renderSelo(profile, lang);
  const cta = renderCta(profile, lang);
  const icones = profile.socialsIcons === true;

  // AS REDES SO GANHAM A COLUNA ESTREITA QUANDO SAO MUITAS.
  //
  // A coluna vale 40% da largura e a mesma ALTURA do cartao "Sobre", porque os dois sao
  // celulas da mesma grade. Com bio longa e poucas redes essa altura nao tem com que ser
  // preenchida: no corretor deram 238px de vao entre a ultima rede e o botao, com a bio de
  // 722 caracteres espremida numa coluna de 310px do lado. Duas coisas ruins pelo mesmo
  // motivo.
  //
  // Com menos de quatro redes elas descem para uma faixa embaixo da bio, e a bio passa a usar
  // a largura inteira. O vao some porque deixa de existir altura a preencher, e a bio ganha o
  // dobro de linha util. O Helio tem quatro e continua exatamente como estava.
  const aoLado = socials.length >= 4;

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
          ${
            // O REGISTRO NO CONSELHO, logo abaixo da profissao, que e onde um cliente procura.
            //
            // A coluna foi criada na migration 0024 e ficou orfa: nenhum arquivo de src
            // escrevia nela nem a lia, entao o payload publicava `"registro": null` e um
            // corretor continuou enfiando o CRECI no campo "O que voce faz", que era
            // exatamente o contorno que a migration dizia estar eliminando. Migration sem
            // consumidor e feature que nao existe.
            profile.registro
              ? `<p class="mt-0.5 text-[10px] font-semibold uppercase tracking-widest text-white/30">${esc(profile.registro)}</p>`
              : ''
          }
        </div>
      </div>
      ${
        // Com a fileira virando faixa, esta coluna fica so com o selo. Sem selo ela nao sai:
        // uma div vazia entre a identidade e a faixa so serviria para somar o `gap` do pai
        // duas vezes.
        emFaixa && !selo
          ? ''
          : `<div class="flex flex-col gap-3 sm:items-end">
        ${
          emFaixa
            ? ''
            : `<div class="flex flex-wrap items-end justify-start sm:justify-end gap-x-5 gap-y-3 text-xs text-white/80">${stats.map((s) => statItem(s, lang)).join('')}
        </div>`
        }
        ${selo}
      </div>`
      }
      ${
        // `w-full` e nao so `basis-full`: no celular o card e `flex-col`, e ali o flex-basis
        // governa a ALTURA. `basis-full` sozinho pediria uma faixa com a altura inteira do
        // card, que e o oposto do que se quer.
        emFaixa
          ? `<div class="w-full sm:basis-full pt-5 border-t border-white/10 grid ${colunasFaixa(stats.length)} items-end gap-x-4 gap-y-5 text-xs text-white/80">${stats.map((s) => statItem(s, lang)).join('')}
      </div>`
          : ''
      }
    </div>

    <!-- Bio + Sociais -->
    <div class="grid grid-cols-1 md:grid-cols-5 gap-4">
      <div class="${aoLado ? 'md:col-span-3' : 'md:col-span-5'} flex flex-col gap-3 glass-card rounded-3xl p-6">
        <h2 class="text-[10px] font-bold uppercase tracking-widest text-white/30 metallic-silver w-fit">${esc(rotuloSecao(ui, 'about', lang))}</h2>
        <p class="text-sm text-white/80 leading-relaxed font-medium whitespace-pre-line">${esc(t(profile.bio, lang))}</p>
        ${
          // ONDE E QUANDO, para quem atende num lugar fisico.
          //
          // FICA NA COLUNA LARGA, e nao junto das redes, e a primeira versao errou justamente
          // isso: a coluna das redes tem 126px, e um endereco de rua precisa de 267. Foi
          // exatamente o defeito que fez um funileiro escrever a oficina dele dentro de "Suas
          // redes" e ver "Rua Sao Geraldo, 412, b..." publicado. Colocar o campo novo no mesmo
          // lugar apertado seria repetir o defeito com outro nome.
          //
          // Sem link de mapa de proposito: escolher entre Google, Apple e Waze pela pessoa e
          // decidir por ela em qual aplicativo o cliente dela vai abrir.
          profile.endereco || profile.horario
            ? `<div class="mt-1 pt-4 border-t border-white/10 flex flex-col gap-1">
          ${profile.endereco ? `<p class="text-[12px] font-semibold text-white/85 leading-snug">${esc(profile.endereco)}</p>` : ''}
          ${profile.horario ? `<p class="text-[11px] font-medium text-white/50 leading-snug whitespace-pre-line">${esc(profile.horario)}</p>` : ''}
        </div>`
            : ''
        }
      </div>

      ${
        aoLado
          ? `<div class="md:col-span-2 flex flex-col gap-2 glass-card rounded-3xl p-5">
        <div class="flex-1 flex flex-col gap-2 text-[11px] font-semibold text-white">${socials.map((s) => socialItem(s, lang, { icones })).join('')}
        </div>

        ${cta}
      </div>`
          : socials.length || cta
            ? `<div class="md:col-span-5 flex flex-col gap-3 glass-card rounded-3xl p-5">
        ${socials.length ? `<div class="grid ${colunasRedes(socials.length)} gap-2 text-[11px] font-semibold text-white">${socials.map((s) => socialItem(s, lang, { icones, esticar: false })).join('')}
        </div>` : ''}
        ${
          // O BOTAO EM LINHA PROPRIA, e nao ao lado das redes. Ao lado ele levava 224px dos
          // 488 do cartao e sobravam 84px por rede, onde "WhatsApp" ja nao cabia inteiro:
          // trocar um vao vazio por tres nomes cortados nao e conserto.
          renderCta(profile, lang, '')
        }
      </div>`
            : ''
      }
    </div>`;
}
