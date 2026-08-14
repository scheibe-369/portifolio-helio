import { supabase } from '../../../shared/supabase/client.js';

// Estado da area de admin. Zona [browser].
//
// NADA AQUI E SEGURANCA. Toda funcao `admin_*` do banco comeca com `if not is_admin() then
// raise`, e is_admin() pergunta se o e-mail da sessao esta em admin_users, o que o navegador
// nao tem como forjar (o e-mail sai do JWT emitido pelo Supabase Auth). Reescrever este
// arquivo no console nao abre nada.
//
// O segundo fator NAO entra nessa conta desde a migration 0012: o codigo por e-mail e a
// protecao do produto inteiro, admin incluido. As funcoes de cadastro do app continuam aqui
// porque a tela opcional /app/admin/mfa continua viva.
//
// O QUE ESTE ARQUIVO RESOLVE E OUTRA COISA: dizer POR QUE foi recusado. Antes de 0010, o
// dono abria a fila e via quatro listas vazias, porque is_admin() era falso e as consultas
// simplesmente nao devolviam linha. Vazio nao e mensagem de erro, e o sintoma parecia
// "nao ha trabalho na fila" quando era "voce nao esta autorizado".

export async function adminStatus() {
  const { data, error } = await supabase.rpc('admin_status');
  if (error) throw error;
  return data;
}

export async function listarFatores() {
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) throw error;
  return data?.all ?? [];
}

// Comeca o cadastro do app autenticador e devolve o QR.
//
// Antes de cadastrar, apaga fator NAO verificado que tenha sobrado: quem abre a tela, fecha
// no meio e volta deixa um fator pendente para tras, e a segunda tentativa falharia com
// "factor already exists" sem que a pessoa tenha feito nada de errado.
export async function iniciarCadastroMfa() {
  for (const f of await listarFatores()) {
    if (f.status !== 'verified') await supabase.auth.mfa.unenroll({ factorId: f.id });
  }
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: 'totp',
    friendlyName: `MyPortifolio ${new Date().toISOString().slice(0, 10)}`,
  });
  if (error) throw error;
  return { fatorId: data.id, qr: data.totp?.qr_code, segredo: data.totp?.secret };
}

// Confirma o cadastro. So depois disto o fator vira 'verified' e a sessao sobe para aal2.
export async function confirmarCadastroMfa(fatorId, codigo) {
  const { data: desafio, error: e1 } = await supabase.auth.mfa.challenge({ factorId: fatorId });
  if (e1) throw e1;
  const { error: e2 } = await supabase.auth.mfa.verify({
    factorId: fatorId,
    challengeId: desafio.id,
    code: codigo,
  });
  if (e2) throw e2;
  // Carimba o "desde quando" em admin_users. A funcao confere o fator por conta propria,
  // entao ela nao aceita ser convencida por esta chamada.
  const { error: e3 } = await supabase.rpc('admin_confirmar_mfa');
  if (e3) throw e3;
}

// ACESSOS --------------------------------------------------------------------
export async function listarAcessos(busca) {
  const { data, error } = await supabase.rpc('admin_listar_acessos', { p_busca: busca || null });
  if (error) throw error;
  return data ?? [];
}

// A origem nao e parametro: o banco grava 'cortesia' sempre. Concessao manual disfarcada de
// venda e exatamente o rastro que a conciliacao semanal existe para achar.
export async function concederAcesso({ email, main, custom, setup, motivo }) {
  const { data, error } = await supabase.rpc('admin_grant_member_access', {
    p_email: email,
    p_main: Boolean(main),
    p_custom: Boolean(custom),
    p_setup: Boolean(setup),
    p_reason: motivo || null,
  });
  if (error) throw error;
  return data;
}

export async function revogarAcesso({ email, main = true, custom = true, setup = true, motivo }) {
  const { data, error } = await supabase.rpc('admin_revoke_member_access', {
    p_email: email,
    p_main: main,
    p_custom: custom,
    p_setup: setup,
    p_reason: motivo || null,
  });
  if (error) throw error;
  return data;
}
