-- 0013_reembolso_pela_rpc.sql
--
-- Conserta o botao de arrependimento ANTES de alguem precisar dele.
--
-- COMO ELE APARECEU: a tela de aceite dos termos falhou em producao com "permission denied
-- for table terms_consents". A Edge Function escrevia direto na tabela com a service role, e
-- a service role NAO tem privilegio de tabela neste schema: as migrations fazem
-- `revoke ... from public`, e isso tira junto o que a service role recebia por heranca. A
-- chave parece toda-poderosa e nao e.
--
-- Corrigido o aceite, a pergunta obvia era "onde mais". O levantamento dos privilegios
-- mostrou que a service role so tem insert/update em hubla_events, setup_requests e
-- vendas_conferidas. E a request-refund escreve direto em DUAS tabelas fora dessa lista,
-- refund_requests e portfolio_publications.
--
-- Ou seja: o botao de arrependimento de 7 dias, que e obrigacao do CDC art. 49, estava
-- quebrado desde que foi escrito, e ninguem tinha visto porque ninguem pediu reembolso. O
-- comprador clicaria, receberia "nao foi possivel registrar", e o pedido dele nao existiria
-- em lugar nenhum. Nao ha defeito pior de se descobrir por reclamacao.
--
-- A CORRECAO E A MESMA DO ACEITE, e ela e melhor do que sair distribuindo grant: a regra volta
-- para o banco, numa funcao SECURITY DEFINER que roda com o dono do schema. Alem de resolver
-- a permissao, isso tira de dentro da Edge Function tres decisoes que sao de negocio e nao de
-- transporte: o que conta como dentro do prazo, o que acontece com a publicacao, e o que nao
-- pode ser reescrito num segundo clique.

create or replace function myportifolio.request_refund(p_email text, p_reason text default null)
returns jsonb
language plpgsql
security definer
set search_path = myportifolio, public
as $$
declare
  v_email text := lower(trim(p_email));
  v_concedido timestamptz;
  v_dentro boolean;
  v_ja boolean;
  v_tirados int := 0;
begin
  select ma.main_granted_at into v_concedido
  from myportifolio.member_access ma where ma.email = v_email;
  if not found then raise exception 'sem compra para este e-mail'; end if;

  -- O prazo corre de main_granted_at e nao de granted_at. Comprar um bump depois nao reabre
  -- um prazo que ja venceu, e comprar o bump ANTES do principal (a ordem que a Hubla nao
  -- garante) nao pode encurtar o prazo de quem so recebeu o principal depois.
  v_dentro := v_concedido is not null and v_concedido > now() - interval '7 days';

  -- O pedido e um FATO DATADO. Clicar de novo nao reescreve a data nem o within_cdc do
  -- primeiro, que sao justamente a prova de que o pedido caiu dentro do prazo. Por isso
  -- `do nothing` e nunca `do update`.
  insert into myportifolio.refund_requests (email, reason, within_cdc)
  values (v_email, p_reason, v_dentro)
  on conflict (email) do nothing;
  v_ja := not found;

  -- Tirar do ar e imediato e nao espera o estorno, que e manual na Hubla. Quem pediu o
  -- dinheiro de volta nao deve continuar com a pagina publicada enquanto alguem processa.
  perform set_config('app.escrita_confiavel', 'on', true);
  update myportifolio.portfolio_publications pp
     set is_live = false, unlive_reason = 'dono'
   where pp.is_live
     and pp.portfolio_id in (select p.id from myportifolio.portfolios p where p.owner_email = v_email);
  get diagnostics v_tirados = row_count;
  perform set_config('app.escrita_confiavel', 'off', true);

  return jsonb_build_object(
    'email', v_email,
    'dentroDoPrazo', v_dentro,
    'jaHaviaPedido', v_ja,
    'publicacoesTiradasDoAr', v_tirados,
    'compraEm', v_concedido
  );
end;
$$;

-- So o service_role: quem prova a sessao e a Edge Function, ANTES de chamar. Aberto para
-- authenticated, qualquer pessoa logada pediria reembolso no nome de outra.
revoke execute on function myportifolio.request_refund(text, text) from public, anon, authenticated;
grant execute on function myportifolio.request_refund(text, text) to service_role;
