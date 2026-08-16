import { t, tui } from '../../../app/i18n.js';
import { esc, safeUrl } from '../../portfolio/lib/sanitize.js';
import { iconeSeloValido } from '../lib/iconesSelo.js';

const statItem = (s, lang) => {
  // A stat "Idiomas" vira o toggle de idioma (PT/EN). Ver main.js (#lang-toggle).
  if (s.lang) {
    return `
            <button id="lang-toggle" type="button" class="flex flex-col text-center cursor-pointer" title="${esc(tui('langAria', lang))}">
              <span class="text-[10px] uppercase tracking-widest text-white/30 metallic-silver">${esc(t(s.label, lang))}</span>
              <span class="mt-1 font-bold text-base">
                <span class="${lang === 'pt' ? 'text-white' : 'text-white/35'}">PT</span><span class="text-white/20">/</span><span class="${lang === 'en' ? 'text-white' : 'text-white/35'}">EN</span>
              </span>
            </button>`;
  }
  return `
            <div class="flex flex-col text-center">
              <span class="text-[10px] uppercase tracking-widest text-white/30 metallic-silver">${esc(t(s.label, lang))}</span>
              <span class="mt-1 font-bold text-base">${esc(t(s.value, lang))}</span>
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
const renderAvatar = (profile) => {
  const nome = String(profile.name || '').trim();
  if (!profile.avatar) {
    const iniciais = nome.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
    return `<div class="w-14 h-14 shrink-0 ring-white/10 ring-2 rounded-full bg-white/10 flex items-center justify-center text-sm font-bold text-white/70" aria-label="${esc(nome)}">${esc(iniciais || '?')}</div>`;
  }
  // `shrink-0` NAO E ENFEITE. Sem ele o flex do card espreme a foto quando o nome quebra em
  // duas linhas, e o avatar de 512x512 vira uma tira vertical de ~25px de largura. O gatilho
  // e nome comprido, ou seja quase todo nome brasileiro com sobrenome: o do Helio cabe numa
  // linha so e por isso a baseline nunca mostrou o defeito.
  return `<img src="${safeUrl(profile.avatar)}" alt="${esc(nome)} Avatar" loading="lazy" decoding="async" class="w-14 h-14 shrink-0 object-cover ring-white/10 ring-2 rounded-full">`;
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

const socialItem = ({ label, value, href }, lang) => `
            <a href="${safeUrl(href)}" target="_blank" rel="noopener noreferrer" class="flex-1 flex items-center justify-between rounded-xl glass-button px-4 py-2.5">
              <span>${esc(label)}</span>
              <span class="text-white/40 font-normal">${esc(t(value, lang))}</span>
            </a>`;

// Coluna direita (topo): card de perfil + bio + sociais.
export function renderProfilePanel(profile, lang) {
  return `
    <!-- Card de Perfil -->
    <div class="flex flex-col sm:flex-row sm:items-stretch sm:justify-between glass-card rounded-3xl p-6 gap-5">
      <div class="flex items-center gap-4">
        <div class="relative shrink-0">
          ${renderAvatar(profile)}
          ${profile.showOnlineDot === false ? '' : `<span class="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-black rounded-full shadow-lg"></span>`}
        </div>
        <div>
          <h1 class="text-2xl md:text-3xl font-bold tracking-tight text-white">${esc(profile.name)}</h1>
          <p class="text-xs font-medium text-white/40 metallic-silver">${esc(t(profile.role, lang))}</p>
        </div>
      </div>
      <div class="flex flex-col sm:items-end sm:justify-between gap-3">
        <div class="flex gap-5 text-xs text-white/80">${profile.stats.map((s) => statItem(s, lang)).join('')}
        </div>
        ${renderSelo(profile, lang)}
      </div>
    </div>

    <!-- Bio + Sociais -->
    <div class="grid grid-cols-1 md:grid-cols-5 gap-4">
      <div class="md:col-span-3 flex flex-col gap-3 glass-card rounded-3xl p-6">
        <h2 class="text-[10px] font-bold uppercase tracking-widest text-white/30 metallic-silver w-fit">${esc(tui('about', lang))}</h2>
        <p class="text-sm text-white/80 leading-relaxed font-medium">${esc(t(profile.bio, lang))}</p>
      </div>

      <div class="md:col-span-2 flex flex-col gap-2 glass-card rounded-3xl p-5">
        <div class="flex-1 flex flex-col gap-2 text-[11px] font-semibold text-white">${profile.socials.map((s) => socialItem(s, lang)).join('')}
        </div>

        ${renderCta(profile, lang)}
      </div>
    </div>`;
}
