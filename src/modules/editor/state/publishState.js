import { supabase } from '../../../shared/supabase/client.js';
import { APEX_HOST } from '../config/editor.config.js';

// Publicar, tirar do ar e o link de previa. Zona [browser].

export const enderecoPublico = (slug) => `https://${slug}.${APEX_HOST}/`;

// Checklist da tela de publicar. Ela NAO bloqueia nada de proposito, com uma excecao: o que
// esta aqui como `trava` e o que o banco tambem recusaria, e avisar antes e melhor do que
// deixar o comprador clicar e receber um erro de constraint. O resto e sugestao: barra de
// completude que impede publicar transforma um produto pago em lista de tarefas.
export function montarChecklist({ portfolio, projetos, experiencias }) {
  const perfil = portfolio || {};
  return [
    { ok: Boolean(perfil.display_name), texto: 'Seu nome está preenchido', trava: true },
    { ok: Boolean(perfil.role_i18n?.pt), texto: 'Você escreveu o que faz', trava: true },
    { ok: Boolean(perfil.avatar_path || perfil.hero_path), texto: 'Tem pelo menos uma foto sua' },
    { ok: Boolean(perfil.bio_i18n?.pt), texto: 'Tem um texto sobre você' },
    { ok: projetos.length > 0, texto: 'Tem pelo menos um projeto' },
    { ok: projetos.every((p) => p.image_path), texto: 'Todos os projetos têm imagem' },
    { ok: Boolean(perfil.cta_url), texto: 'O botão principal tem um link' },
    { ok: experiencias.length > 0, texto: 'Tem pelo menos uma experiência' },
  ];
}

// A sugestao de ordem de 6.4, que existe como BOTAO e nunca como acao silenciosa: reordenar
// sem avisar mexe justamente no que o comprador acabou de arrumar.
export function sugestaoVideoPrimeiro({ portfolio, projetos }) {
  if (!portfolio?.projects_video_first) return null;
  const comVideo = projetos.filter((p) => p.youtube_id);
  if (!comVideo.length) return null;
  const foraDoTopo = comVideo.filter((p, i) => projetos.indexOf(p) > i).length;
  return foraDoTopo ? { quantos: foraDoTopo } : null;
}

export async function publicar(portfolioId) {
  const { data, error } = await supabase.rpc('publish_portfolio', { p_portfolio_id: portfolioId });
  if (error) throw error;
  // 'em_revisao' e a primeira publicacao de cada conta passando pela conferencia de conteudo
  // (risco R8). Ela acontece UMA vez por cliente; da segunda em diante publicar e instantaneo.
  return data;
}

export async function tirarDoAr(portfolioId) {
  const { error } = await supabase.rpc('unpublish_portfolio', { p_portfolio_id: portfolioId });
  if (error) throw error;
}

// O token em claro e devolvido UMA vez e nunca mais: o banco guarda so o sha256. Por isso o
// editor precisa mostrar o link inteiro na hora, e por isso "gerar link novo" e um clique que
// mata o anterior.
export async function girarTokenDePrevia(portfolioId) {
  const { data, error } = await supabase.rpc('rotate_preview_token', { p_portfolio_id: portfolioId });
  if (error) throw error;
  return data;
}

export const urlDePrevia = (slug, token) => `https://${slug}.${APEX_HOST}/?previa=${token}`;
