import { supabase } from '../../../shared/supabase/client.js';
import { baseMidiaPublica } from '../../media/lib/storage.js';
import { doI18n, paraI18n, listaDoI18n, listaParaI18n, ouNulo } from './mapear.js';

// CRUD de experiencia. Zona [browser].
//
// Duas coisas que este arquivo NAO faz, e as duas sao decisao:
//
// 1. Ele nao escreve `certificate_public` junto do resto quando quem esta logado nao e o
//    titular. Nao por educacao: o trigger portfolio_experiences_guarda_colunas() recusa por
//    eh_titular_do_portfolio(), tanto no insert quanto no update, e mandar o campo produziria
//    um erro garantido no meio de um salvar que ia dar certo no resto.
// 2. Ele nao apaga arquivo de Storage. Quem apaga o objeto SUBSTITUIDO e o passo de upload
//    (6.5.1); quem marca orfao quando a LINHA morre e o trigger do banco. Misturar as duas
//    coisas aqui produziria arquivo apagado com a linha ainda apontando para ele.

export async function carregarExperiencias(portfolioId) {
  const { data, error } = await supabase
    .from('portfolio_experiences')
    .select('*')
    .eq('portfolio_id', portfolioId)
    .order('position', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

export function experienciaDaLinha(x) {
  const base = baseMidiaPublica();
  return {
    id: x.id,
    slug: x.slug,
    org: x.org ?? '',
    kind: x.kind || 'work',
    role: doI18n(x.role_i18n),
    period_start: x.period_start ?? '',
    period_end: x.period_end ?? '',
    // period_end NULO significa ATUAL, e esse e o unico significado dele (4.7.1). O switch da
    // primeira tela nasce LIGADO por isso: a entrada mais comum de quem cadastra a primeira
    // experiencia e o emprego de agora.
    atual: !x.period_end,
    location: doI18n(x.location_i18n),
    highlights: listaDoI18n(x.highlights_i18n),
    note: doI18n(x.note_i18n),
    logo_path: x.logo_path ?? '',
    logo_position: x.logo_position ?? '50% 50%',
    logo_url: x.logo_path ? `${base}/${x.logo_path}` : '',
    plate_bg: x.plate_bg || '#0b0b12',
    certificate_path: x.certificate_path ?? '',
    certificate_mime: x.certificate_mime ?? '',
    certificate_label: doI18n(x.certificate_label_i18n),
    certificate_public: Boolean(x.certificate_public),
    position: x.position ?? 0,
  };
}

export function patchDaExperiencia(v, linha = {}, { podePublicarCertificado = true } = {}) {
  const patch = {
    slug: v.slug,
    org: v.org,
    kind: v.kind === 'education' ? 'education' : 'work',
    role_i18n: paraI18n(v.role, linha.role_i18n),
    period_start: v.period_start,
    period_end: v.atual ? null : ouNulo(v.period_end),
    location_i18n: v.location ? paraI18n(v.location, linha.location_i18n) : null,
    highlights_i18n: listaParaI18n(v.highlights, linha.highlights_i18n),
    note_i18n: v.note ? paraI18n(v.note, linha.note_i18n) : null,
    logo_path: ouNulo(v.logo_path),
    logo_position: v.logo_path ? ouNulo(v.logo_position) : null,
    logo_mime: ouNulo(v.logo_mime),
    plate_bg: v.plate_bg || '#0b0b12',
    certificate_path: ouNulo(v.certificate_path),
    certificate_mime: ouNulo(v.certificate_mime),
    certificate_label_i18n: v.certificate_path && v.certificate_label
      ? paraI18n(v.certificate_label, linha.certificate_label_i18n)
      : null,
  };
  // A flag so entra no patch quando quem esta logado pode liga-la. Ver o comentario do topo.
  if (podePublicarCertificado) {
    patch.certificate_public = Boolean(v.certificate_public && v.certificate_path);
  }
  return patch;
}

export async function criarExperiencia(portfolioId, valores, position, opcoes) {
  const { data, error } = await supabase
    .from('portfolio_experiences')
    .insert({ portfolio_id: portfolioId, position, ...patchDaExperiencia(valores, {}, opcoes) })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function salvarExperiencia(id, valores, linha, opcoes) {
  const { data, error } = await supabase
    .from('portfolio_experiences')
    .update(patchDaExperiencia(valores, linha, opcoes))
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function apagarExperiencia(id) {
  const { error } = await supabase.from('portfolio_experiences').delete().eq('id', id);
  if (error) throw error;
}

export async function gravarOrdem(linhas) {
  for (let i = 0; i < linhas.length; i += 1) {
    const { error } = await supabase.from('portfolio_experiences').update({ position: i }).eq('id', linhas[i].id);
    if (error) throw error;
  }
}
