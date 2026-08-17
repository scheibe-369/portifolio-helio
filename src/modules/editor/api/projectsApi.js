import { supabase } from '../../../shared/supabase/client.js';
import { baseMidiaPublica } from '../../media/lib/storage.js';
import { parseYoutubeId } from '../../projects/lib/youtube.js';
import { doI18n, paraI18n, listaDoI18n, listaParaI18n, ouNulo } from './mapear.js';
import { slugify } from '../lib/slugify.js';

// CRUD de projeto. Zona [browser]. Insert, update e delete diretos na tabela, guardados por
// RLS: o dono le, insere, atualiza e apaga o que e dele, e a escrita ainda exige acesso ativo
// (portfolio_tem_acesso_ativo), que pergunta pelo DONO DA LINHA e nao por quem esta logado.

export async function carregarProjetos(portfolioId) {
  const { data, error } = await supabase
    .from('portfolio_projects')
    .select('*')
    .eq('portfolio_id', portfolioId)
    .order('position', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

export function projetoDaLinha(p) {
  const base = baseMidiaPublica();
  return {
    id: p.id,
    slug: p.slug,
    name: doI18n(p.name_i18n),
    category: doI18n(p.category_i18n),
    tagline: doI18n(p.tagline_i18n),
    problem: doI18n(p.problem_i18n),
    solution: doI18n(p.solution_i18n),
    features: listaDoI18n(p.features_i18n),
    stack: listaDoI18n(p.stack_i18n),
    // O campo do formulario guarda a URL que a pessoa colou; a coluna guarda so o ID de 11
    // caracteres. Reconstruir a URL para exibir mantem o campo reconhecivel sem devolver a
    // analise de URL para o caminho quente do render.
    video: p.youtube_id ? `https://youtu.be/${p.youtube_id}` : '',
    link: p.link_url ?? '',
    link_note: doI18n(p.link_note_i18n),
    tem_cliente: Boolean(p.client),
    client: p.client ?? '',
    year: p.year ?? '',
    groups: p.groups || [],
    image_path: p.image_path ?? '',
    image_url: p.image_path ? `${base}/${p.image_path}` : '',
    image_mime: p.image_mime ?? '',
    image_fit: p.image_fit || 'cover',
    image_position: p.image_position ?? '50% 50%',
    accent: p.accent || '#7C5CFC',
    plate_bg: p.plate_bg || '#0b0b12',
    position: p.position ?? 0,
  };
}

export function patchDoProjeto(v, linha = {}) {
  // O banco guarda o ID, nunca a URL, e o CHECK confere o formato de 11 caracteres. O parser
  // aceita os formatos que a pessoa realmente cola (shorts, live, link curto, ID solto) e
  // devolve tambem a orientacao, que casa com o CHECK de youtube_orientation.
  const yt = v.video ? parseYoutubeId(v.video) : { id: null, orientation: null };
  return {
    slug: v.slug,
    name_i18n: paraI18n(v.name, linha.name_i18n),
    category_i18n: paraI18n(v.category, linha.category_i18n),
    tagline_i18n: paraI18n(v.tagline, linha.tagline_i18n),
    problem_i18n: v.problem ? paraI18n(v.problem, linha.problem_i18n) : null,
    solution_i18n: v.solution ? paraI18n(v.solution, linha.solution_i18n) : null,
    features_i18n: listaParaI18n(v.features, linha.features_i18n),
    stack_i18n: listaParaI18n(v.stack, linha.stack_i18n),
    youtube_id: yt.id,
    youtube_orientation: yt.id ? yt.orientation || 'horizontal' : null,
    link_url: ouNulo(v.link),
    link_note_i18n: v.link && v.link_note ? paraI18n(v.link_note, linha.link_note_i18n) : null,
    client: v.tem_cliente ? ouNulo(v.client) : null,
    year: ouNulo(v.year),
    // grupos_validos() exige slug minusculo de ate 32 caracteres. O chip aceita "Landing Page"
    // porque e assim que a pessoa pensa; normalizar aqui e o que evita um erro de constraint
    // sobre um campo cujo formato o comprador nunca viu.
    groups: [...new Set((v.groups || []).map((g) => slugify(g, { minimo: 1, maximo: 32 })).filter(Boolean))].slice(0, 4),
    image_path: ouNulo(v.image_path),
    // canvas.toBlob cai em image/png em silencio: o mime REAL do que subiu, nunca a extensao.
    image_mime: ouNulo(v.image_mime),
    image_fit: v.image_fit === 'contain' ? 'contain' : 'cover',
    image_position: ouNulo(v.image_position),
    accent: v.accent || '#7C5CFC',
    plate_bg: v.plate_bg || '#0b0b12',
  };
}

export async function criarProjeto(portfolioId, valores, position) {
  const { data, error } = await supabase
    .from('portfolio_projects')
    .insert({ portfolio_id: portfolioId, position, ...patchDoProjeto(valores) })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function salvarProjeto(id, valores, linha) {
  const { data, error } = await supabase
    .from('portfolio_projects')
    .update(patchDoProjeto(valores, linha))
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function apagarProjeto(id) {
  const { error } = await supabase.from('portfolio_projects').delete().eq('id', id);
  if (error) throw error;
}

// Ordem por setas, sem `draggable` (corte de 6.1): setas funcionam no celular e sao
// acessiveis por teclado, e arrastar em lista longa no toque e o pior dos dois mundos.
export async function gravarOrdem(linhas) {
  for (let i = 0; i < linhas.length; i += 1) {
    const { error } = await supabase.from('portfolio_projects').update({ position: i }).eq('id', linhas[i].id);
    if (error) throw error;
  }
}
