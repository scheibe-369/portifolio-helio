import { supabase } from '../../../shared/supabase/client.js';

// A camada de dados da fila do dono. Zona [browser].
//
// NADA AQUI E SEGURANCA. Toda consulta e todo botao desta tela passam pelas policies de RLS
// e pelas funcoes `admin_*`, que checam `is_admin()` no servidor. Se este arquivo inteiro
// fosse reescrito por alguem no console do navegador, o banco recusaria do mesmo jeito. O que
// existe aqui e conveniencia: montar a tela e chamar a RPC certa.
//
// DETALHE QUE JA CONFUNDIU: `is_admin()` devolve **false** enquanto `mfa_confirmado_em` for
// nulo em `admin_users`, mesmo para um e-mail que esta na tabela. Isso e deliberado (a conta
// que pode derrubar o portfolio de um cliente pagante nao entra so com codigo de e-mail), mas
// produz um sintoma que parece defeito: o dono loga, abre /app/admin/fila e ve tudo vazio.
// Por isso a tela pergunta `is_admin()` ANTES de consultar, e diz o motivo em vez de mostrar
// listas vazias.

export async function souAdmin() {
  const { data, error } = await supabase.rpc('is_admin');
  if (error) return false;
  return data === true;
}

// Fila de PRIMEIRA publicacao. E a unica camada preventiva que olha o conteudo antes de ele
// existir num endereco nosso, e por isso ela vem no topo da tela: sem ela, a defesa contra
// alguem montar phishing em <banco>.myportifolio.com.br volta a ser "o dono percebe depois"
// (risco R8 do plano).
export async function filaDePublicacao() {
  const { data, error } = await supabase
    .from('publish_reviews')
    .select('portfolio_id, requested_at, decided_at, decision, portfolios(slug, display_name, contact_email, owner_email)')
    .is('decided_at', null)
    .order('requested_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function aprovarPublicacao(portfolioId) {
  const { error } = await supabase.rpc('admin_approve_first_publish', { p_portfolio_id: portfolioId });
  if (error) throw error;
}

// O motivo e obrigatorio na recusa e opcional em lugar nenhum: recusa sem motivo escrito e
// a que vira discussao de atendimento tres semanas depois, sem ninguem lembrar o que foi.
export async function recusarPublicacao(portfolioId, motivo) {
  const { error } = await supabase.rpc('admin_reject_first_publish', {
    p_portfolio_id: portfolioId,
    p_reason: motivo,
  });
  if (error) throw error;
}

// Fila da facilitacao: quem pagou R$ 490 para a gente montar. Ordenada pela data de abertura
// e nao pela de atualizacao, porque o que importa e ha quanto tempo a pessoa espera.
export const ESTADOS_SETUP = [
  'aguardando_material',
  'material_recebido',
  'em_producao',
  'aguardando_aprovacao',
  'entregue',
  'cancelado',
];

export async function filaDeFacilitacao() {
  const { data, error } = await supabase
    .from('setup_requests')
    .select('email, status, whatsapp, material_url, material_notes, operator_notes, portfolio_id, opened_at, first_touch_at, delivered_at, authorized_at')
    .order('opened_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function mudarEstadoSetup(email, status) {
  const { error } = await supabase.rpc('admin_set_setup_status', { p_email: email, p_status: status });
  if (error) throw error;
}

// Os dois cartoes de alarme. Eles nao tem botao de propósito: os dois querem OLHO, nao
// clique. Concessao sem venda pode ser fraude e pode ser cortesia que alguem esqueceu de
// declarar, e um botao de "revogar" ao lado convida a revogar acesso vitalicio por engano.
export async function comprasIncompletas() {
  const { data, error } = await supabase
    .from('compras_incompletas')
    .select('email, has_main, has_custom, has_setup, created_at, eventos')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return data ?? [];
}

// Evento travado e o sintoma do productId que falta no mapa: a Hubla mandou, o webhook nao
// reconheceu o produto, respondeu 500 e a linha ficou com processed_at nulo de proposito.
// O `product_ids` desta lista e literalmente onde se le o id que precisa entrar em
// productFlags.ts, e e por isso que ele aparece na tela em vez de ficar so no banco.
export async function eventosTravados() {
  const { data, error } = await supabase
    .from('hubla_events')
    .select('id, email, product_ids, attempts, processing_error, received_at')
    .is('processed_at', null)
    .order('received_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return data ?? [];
}
