-- Convencao de caminho, OBRIGATORIA: <portfolio_id>/<tipo>/<nome>-<hash8>.webp
-- A primeira pasta e o portfolio_id, a segunda e avatar|hero|project. Ambas sao lidas
-- pela policy e pelo trigger de cota (0003). Os CHECK das tabelas (achado 17) exigem o
-- mesmo prefixo, entao um caminho fora da convencao e recusado em dois lugares.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('portfolio-media', 'portfolio-media', true, 2097152,
        array['image/webp','image/png','image/jpeg'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Bucket publico porque o conteudo E a pagina publica: fechar obrigaria URL assinada
-- com validade, e o crawler do WhatsApp nao carrega og:image assinada expirada.
-- PNG e JPEG entram na allowlist mesmo com a regra de converter tudo para WebP porque
-- a conversao acontece no cliente (canvas.toBlob) e Safari antigo nao codifica WebP no
-- canvas, caindo para PNG sem avisar (secao 6.5, item 6).

create policy "midia de portfolio e publica pra leitura" on storage.objects
  for select using (bucket_id = 'portfolio-media');

-- owns_portfolio_folder ja aceita a concessao de facilitacao (0002), e o acesso ativo
-- perguntado aqui e o do DONO da pasta, nao o de quem esta logado: quem monta o portfolio
-- do comprador de facilitacao normalmente nao tem compra propria nenhuma.
create policy "dono sobe midia na propria pasta" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'portfolio-media'
    and myportifolio.owns_portfolio_folder((storage.foldername(name))[1])
    and (storage.foldername(name))[2] in ('avatar','hero','project')
    and myportifolio.pasta_tem_acesso_ativo((storage.foldername(name))[1]));

create policy "dono atualiza midia da propria pasta" on storage.objects
  for update to authenticated
  using (bucket_id = 'portfolio-media'
         and myportifolio.owns_portfolio_folder((storage.foldername(name))[1]))
  with check (bucket_id = 'portfolio-media'
         and myportifolio.owns_portfolio_folder((storage.foldername(name))[1])
         and myportifolio.pasta_tem_acesso_ativo((storage.foldername(name))[1]));

-- Delete NAO exige acesso ativo: quem foi bloqueado continua podendo limpar os
-- proprios arquivos, e reter dado de refem so gera ticket e risco de LGPD.
create policy "dono deleta midia da propria pasta" on storage.objects
  for delete to authenticated
  using (bucket_id = 'portfolio-media'
         and myportifolio.owns_portfolio_folder((storage.foldername(name))[1]));

-- Admin le, e so: apagar objeto por moderacao passa por admin_takedown_portfolio, que e
-- security definer e nao depende desta policy. "Ser admin" nunca e, sozinho, permissao de
-- escrever no arquivo de um cliente.
create policy "admin le midia de portfolio" on storage.objects
  for select to authenticated
  using (bucket_id = 'portfolio-media' and myportifolio.is_admin());
