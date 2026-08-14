-- 0011_admin_exige_aal2.sql
--
-- Fecha a diferenca entre "tem segundo fator cadastrado" e "usou o segundo fator agora".
--
-- A 0010 ja tinha tirado is_admin() do carimbo manual e apontado para auth.mfa_factors, o que
-- resolveu o impasse (a coluna que ninguem preenchia). Mas ela parou num degrau abaixo do
-- necessario: bastava ter um fator VERIFICADO na conta, e nao usa-lo. Na pratica isso queria
-- dizer cadastrar o app uma vez e, dali em diante, entrar so com o codigo do e-mail e sair
-- administrando. Segundo fator que se prova uma vez na vida nao e segundo fator, e a ameaca
-- que ele existe para cobrir (alguem com acesso a caixa de entrada do dono) continuaria
-- inteira.
--
-- O nivel da sessao vem do proprio JWT, no claim `aal`. Ele sobe para aal2 quando o TOTP e
-- verificado NESTA sessao, e volta a aal1 na sessao seguinte. Quem emite esse claim e o
-- Supabase Auth, entao nao ha como o navegador se autopromover.
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
  )
  and exists (
    select 1 from auth.mfa_factors f
    where f.user_id = (select auth.uid()) and f.status = 'verified'
  )
  and coalesce((select auth.jwt() ->> 'aal'), '') = 'aal2';
$$;
