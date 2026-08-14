-- 0012_admin_sem_app_autenticador.sql
--
-- Tira a EXIGENCIA de app autenticador para entrar na area de admin. Decisao do dono, tomada
-- de olhos abertos depois de o custo ser dito: enquanto ele for o unico administrador, exigir
-- TOTP a cada entrada e atrito diario para cobrir um cenario (alguem com a caixa de entrada
-- dele) que ele aceita correr.
--
-- O QUE ISSO SIGNIFICA, escrito para quem ler depois: quem conseguir entrar no e-mail do dono
-- consegue entrar como admin, porque o login do produto inteiro e codigo por e-mail. Nao ha
-- segundo fator no caminho. As defesas que sobram sao: a area nao aparece em menu nenhum, e
-- toda acao destrutiva fica registrada em moderation_log com autor, alvo, data e motivo.
--
-- O CAMINHO DE VOLTA CONTINUA PRONTO. As funcoes admin_confirmar_mfa() e admin_status()
-- seguem existindo, a tela de cadastro do app segue acessivel em /app/admin/mfa, e
-- mfa_confirmado_em segue sendo carimbado por quem cadastrar. Voltar a exigir e trocar esta
-- funcao pela versao da 0011, sem mexer em mais nada.
create or replace function myportifolio.is_admin()
returns boolean
language sql
stable
security definer
set search_path = myportifolio, public
as $$
  select exists (
    select 1 from myportifolio.admin_users a
    where a.email = (select myportifolio.current_login_email())
  );
$$;
