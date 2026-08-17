-- 0022_em_revisao.sql
--
-- O ENDERECO DE QUEM ESTA NA FILA PARA DE SE ANUNCIAR COMO LIVRE.
--
-- A primeira publicacao de toda conta passa por conferencia humana, e isso esta certo: e a
-- barreira que impede alguem de publicar conteudo ilegal num subdominio nosso. O problema
-- nunca foi a fila, foi o que a pagina dizia enquanto ela durava.
--
-- Como `get_published_portfolio` so conhecia quatro estados, o portfolio em conferencia caia
-- em `not_found`, e `not_found` desenha a pagina de endereco disponivel: "Este endereco ainda
-- esta livre. Ninguem publicou um portfolio em fulano.myportifolio.com.br ainda", com um botao
-- "Quero este endereco" apontando para o checkout.
--
-- Junte as duas coisas e o resultado e este: o comprador paga, monta a pagina, clica em
-- publicar, recebe a mensagem de que esta tudo certo, manda o link para o primeiro cliente, e
-- o cliente abre e le que aquele endereco esta a venda. Tres das dez personas de teste
-- bateram nisso no mesmo dia.
--
-- O quinto estado resolve pelo dado. O Worker desenha uma pagina de "chegando em breve", com
-- noindex e sem oferta nenhuma, e o endereco deixa de ser oferecido enquanto tiver dono.

CREATE OR REPLACE FUNCTION myportifolio.get_published_portfolio(p_slug text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'myportifolio', 'public'
AS $function$
declare v_slug text := lower(trim(coalesce(p_slug, ''))); v_pf uuid; v_r jsonb;
begin
  if not myportifolio.slug_dns_valido(v_slug) then
    return jsonb_build_object('status','not_found');
  end if;

  select pb.portfolio_id into v_pf from myportifolio.portfolio_publications pb
  where pb.slug = v_slug and pb.is_live;

  if v_pf is null then
    return coalesce(
      (select jsonb_build_object('status','moved','slug',pb.slug)
       from myportifolio.portfolio_slug_history h
       join myportifolio.portfolio_publications pb
         on pb.portfolio_id = h.portfolio_id and pb.is_live
       where h.slug = v_slug and h.expires_at > now() limit 1),
      -- Endereco que ja esteve no ar e hoje nao esta: banimento, reembolso, chargeback,
      -- despublicacao pelo dono ou pedido de exclusao. Nenhum deles volta a ser oferta de
      -- compra, e todos merecem o sinal que tira a URL do indice. Depois que
      -- liberar_slug_retido() renomeia o portfolio, este ramo deixa de casar de proposito:
      -- ai o endereco esta de fato livre outra vez.
      (select jsonb_build_object('status','gone')
       from myportifolio.portfolios pf
       where pf.slug = v_slug and pf.first_published_at is not null),
      -- EM CONFERENCIA. Endereco que pertence a alguem e ainda nao foi ao ar porque a primeira
      -- publicacao passa por revisao humana.
      --
      -- Sem este ramo ele caia em 'not_found', e o visitante lia "Este endereco ainda esta
      -- livre. Ninguem publicou um portfolio aqui ainda", com um botao "Quero este endereco"
      -- apontando para o checkout. Ou seja: exatamente na janela em que o comprador acabou de
      -- pagar, publicar e mandar o link para o primeiro cliente, o produto oferecia o endereco
      -- dele para esse cliente. Tres das dez personas de teste bateram nisso.
      (select jsonb_build_object('status','em_revisao')
       from myportifolio.portfolios pf
       join myportifolio.publish_reviews r on r.portfolio_id = pf.id and r.decided_at is null
       where pf.slug = v_slug),
      jsonb_build_object('status','not_found'));
  end if;

  -- 600 leituras por hora POR TENANT. E ordem de grandeza acima do trafego real do tenant
  -- mediano descrito na secao 2 ("muitos tenants, pouquissimas visitas cada") e ordem de
  -- grandeza abaixo do que um laco de curl produz num minuto. Quem paga a conta do excesso
  -- e o atacante: o visitante legitimo que cair na janela recebe a copia de socorro da
  -- borda, que e exatamente o caso em que ela vale mais.
  if not myportifolio.consume_access_quota('read', v_pf::text, 600) then
    return jsonb_build_object('status','throttled');
  end if;

  select jsonb_build_object('status','ok','slug',pb.slug,
                            'portfolioId',pb.portfolio_id,'version',pb.version,
                            'payloadV',pb.payload_v,'contentHash',pb.content_hash,
                            'publishedAt',pb.published_at,'payload',pb.payload)
  into v_r
  from myportifolio.portfolio_publications pb
  where pb.portfolio_id = v_pf and pb.is_live;

  return coalesce(v_r, jsonb_build_object('status','not_found'));
end;
$function$
;
