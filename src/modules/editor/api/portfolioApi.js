import { supabase } from '../../../shared/supabase/client.js';
import { baseMidiaPublica } from '../../media/lib/storage.js';
import { doI18n, paraI18n, ouNulo } from './mapear.js';
import { CHAVES_ROTULO } from '../../../app/rotulos.js';

// Acesso ao portfolio do comprador. Zona [browser].
//
// TODA escrita daqui passa pelas policies e pelo `grant update (<lista>)` de 0002. Isso nao e
// detalhe de implementacao, e o desenho: RLS nao e column-level, entao o revoke de UPDATE na
// tabela inteira mais o grant coluna a coluna e a UNICA coisa que impede um PATCH do PostgREST
// de escrever em owner_email, slug ou preview_token_hash. Se algo aqui responder 42501, o
// certo e entender por que a coluna nao esta no grant, nunca contornar.

export async function carregarPortfolio() {
  // Sem .eq() de proposito: a policy ja filtra por owner_id ou por current_purchase_email(),
  // que resolve o alias de quem comprou com um e-mail e loga com outro (5.6).
  const { data, error } = await supabase.from('portfolios').select('*').limit(1).maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function slugDisponivel(slug) {
  const { data, error } = await supabase.rpc('slug_available', { p_slug: slug });
  if (error) throw error;
  return Boolean(data);
}

export async function criarPortfolio({ slug, displayName, role }) {
  const { data, error } = await supabase.rpc('create_my_portfolio', {
    p_slug: slug,
    p_display_name: displayName,
    p_role: role || null,
    p_kit: null,
  });
  if (error) throw error;
  return data;
}

// Trocar de endereco quebra link ja distribuido e e o vetor de sequestro de namespace, por
// isso passa por RPC com o limite de 2 trocas a cada 90 dias contado no banco (achado 16).
export async function trocarSlug(portfolioId, slug) {
  const { error } = await supabase.rpc('change_my_slug', { p_portfolio_id: portfolioId, p_slug: slug });
  if (error) throw error;
}

// Quem esta logado e o TITULAR, ou um operador do bump de facilitacao com concessao viva?
// A diferenca importa num lugar so do editor: publicar o certificado (6.5.1).
export async function ehTitular(portfolioId) {
  const { data, error } = await supabase.rpc('eh_titular_do_portfolio', { p_portfolio_id: portfolioId });
  if (error) throw error;
  return Boolean(data);
}

// LINHA -> RASCUNHO ----------------------------------------------------------
export function perfilDaLinha(pf) {
  const base = baseMidiaPublica();
  const url = (caminho) => (caminho ? (/^https?:\/\/|^\//.test(caminho) ? caminho : `${base}/${caminho}`) : '');
  return {
    display_name: pf.display_name ?? '',
    role: doI18n(pf.role_i18n),
    bio: doI18n(pf.bio_i18n),
    contact_email: pf.contact_email ?? '',
    show_contact_email: Boolean(pf.show_contact_email),
    avatar_path: pf.avatar_path ?? '',
    avatar_url: url(pf.avatar_path),
    hero_path: pf.hero_path ?? '',
    hero_url: url(pf.hero_path),
    hero_object_position: pf.hero_object_position ?? '50% 36%',
    show_online_dot: Boolean(pf.show_online_dot),
    badge_label: pf.badge_label ?? '',
    badge_icon: pf.badge_icon ?? '',
    avatar_shape: pf.avatar_shape ?? 'circulo',
    theme_preset: pf.theme_preset ?? '',
    // ui_labels e UM objeto no banco e VARIOS campos no formulario, porque o motor de
    // formulario e uma lista plana de chaves. A ponte e feita aqui e no patch, e em nenhum
    // outro lugar: as duas funcoes sao gemeas e mexer numa sem a outra perde o texto que a
    // pessoa escreveu.
    ...Object.fromEntries(CHAVES_ROTULO.map((k) => [`rotulo_${k}`, doI18n((pf.ui_labels || {})[k])])),
    cta_url: pf.cta_url ?? '',
    cta_label: doI18n(pf.cta_label_i18n),
    theme_accent: pf.theme_accent ?? '#7C5CFC',
    theme_plate_bg: pf.theme_plate_bg ?? '#0b0b12',
    socials: (pf.socials || []).map((s) => ({ label: s.label ?? '', valor: doI18n(s.value), extra: s.href ?? '' })),
    stats: (pf.stats || []).map((s) => ({ label: doI18n(s.label), valor: doI18n(s.value), extra: '' })),
    stacks: pf.stacks || [],
    english_enabled: Boolean(pf.english_enabled),
    projects_video_first: Boolean(pf.projects_video_first),
    projects_per_page: String(pf.projects_per_page ?? 6),
    seo_title: doI18n(pf.seo_title_i18n),
    seo_description: doI18n(pf.seo_description_i18n),
  };
}

// RASCUNHO -> PATCH ----------------------------------------------------------
// Toda chave daqui esta no `grant update (...)` de 0002, e manter as duas listas em sincronia
// e obrigacao de code review: coluna nova de conteudo entra nas duas, coluna de seguranca
// nunca entra em nenhuma.
export function patchDoPerfil(v, pf, { temCustom = false } = {}) {
  const base = {
    display_name: v.display_name,
    role_i18n: paraI18n(v.role, pf.role_i18n),
    bio_i18n: paraI18n(v.bio, pf.bio_i18n),
    contact_email: ouNulo(v.contact_email),
    show_contact_email: Boolean(v.show_contact_email),
    avatar_path: ouNulo(v.avatar_path),
    hero_path: ouNulo(v.hero_path),
    hero_object_position: v.hero_object_position || '50% 36%',
    show_online_dot: Boolean(v.show_online_dot),
    cta_url: ouNulo(v.cta_url),
    socials: (v.socials || [])
      .filter((s) => s.label && s.extra)
      .slice(0, 8)
      .map((s) => ({ label: s.label, value: s.valor || '', href: s.extra })),
    stats: (v.stats || [])
      .filter((s) => s.label)
      .slice(0, 6)
      .map((s) => ({ label: { pt: s.label }, value: { pt: s.valor || '' } })),
    stacks: (v.stacks || []).slice(0, 40),
    english_enabled: Boolean(v.english_enabled),
    projects_video_first: Boolean(v.projects_video_first),
    projects_per_page: Number(v.projects_per_page) || 6,
    seo_title_i18n: v.seo_title ? paraI18n(v.seo_title, pf.seo_title_i18n) : null,
    seo_description_i18n: v.seo_description ? paraI18n(v.seo_description, pf.seo_description_i18n) : null,
    // O selo e da BASE desde a migration 0014, e por isso mora aqui e nao no bloco do bump.
    // Ele saiu de la porque e identidade, nao estetica: o valor de fabrica era 'VibeCoder',
    // entao cobrar para troca-lo significava cobrar de um chef para ele parar de dizer que e
    // programador. O grant update das duas colunas foi aberto na mesma migration.
    badge_label: ouNulo(v.badge_label),
    badge_icon: ouNulo(v.badge_icon),
    avatar_shape: v.avatar_shape === 'oval' ? 'oval' : null,
    theme_preset: ouNulo(v.theme_preset),
    // Chave so entra no objeto se tiver texto. Guardar `{"stacks": {"pt": ""}}` faria o
    // render achar que existe rotulo proprio, e a regra de volta ao padrao (rotulos.js) teria
    // que reproduzir aqui a mesma limpeza. Um lugar so decide, e e este.
    ui_labels: Object.fromEntries(
      CHAVES_ROTULO
        .map((k) => [k, String(v[`rotulo_${k}`] ?? '').trim()])
        .filter(([, texto]) => texto)
        .map(([k, texto]) => [k, paraI18n(texto, (pf.ui_labels || {})[k])]),
    ),
  };

  // AS SEIS COLUNAS DO BUMP SO ENTRAM NO PATCH QUANDO A CONTA COMPROU, e omiti-las nao e
  // gentileza: o trigger portfolios_guarda_colunas() recusa qualquer valor DIFERENTE do atual
  // nelas quando portfolio_tem_custom() e falso, e o campo bloqueado mostra o DEFAULT ('#7C5CFC')
  // enquanto a coluna esta NULL. Mandar o default de volta seria "distinct from old" e o salvar
  // inteiro morreria com "personalizacao nao liberada nesta conta", inclusive para quem so
  // queria trocar a bio. Aqui esconder no JS e conveniencia; a protecao continua no banco.
  if (!temCustom) return base;
  return {
    ...base,
    cta_label_i18n: v.cta_label ? paraI18n(v.cta_label, pf.cta_label_i18n) : null,
    theme_accent: ouNulo(v.theme_accent),
    theme_plate_bg: ouNulo(v.theme_plate_bg),
  };
}

export async function salvarPerfil(portfolioId, valores, linhaAtual, opcoes) {
  const { data, error } = await supabase
    .from('portfolios')
    .update(patchDoPerfil(valores, linhaAtual, opcoes))
    .eq('id', portfolioId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Salvar so um punhado de colunas (o caso do upload, que resolve sozinho e nao pode esperar o
// resto do formulario ficar valido).
export async function salvarColunas(portfolioId, patch) {
  const { data, error } = await supabase.from('portfolios').update(patch).eq('id', portfolioId).select().single();
  if (error) throw error;
  return data;
}
