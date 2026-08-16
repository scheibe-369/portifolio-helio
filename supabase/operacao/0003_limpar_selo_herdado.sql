-- 0003_limpar_selo_herdado.sql
--
-- Tira o 'VibeCoder' das linhas que nasceram ANTES da migration 0014.
--
-- A 0014 removeu o default das colunas badge_label/badge_icon, mas default so vale para
-- linha nova: quem ja tinha portfolio continuou com 'VibeCoder'/'code' gravado, e continuaria
-- publicando um selo dizendo que e programador. Isso e dado de cliente, entao mora aqui, em
-- operacao, e nao numa migration de esquema.
--
-- O HELIO FICA DE FORA, e de proposito: ele e vibecoder de verdade, o selo dele foi escolhido
-- e a pagina dele e a baseline versionada em snapshot/pt.html. Mexer nele quebraria o oraculo
-- de teste sem consertar nada.
--
-- Conferido antes de rodar (16/08/2026): existiam 3 portfolios no banco, e alem do Helio os
-- outros dois eram conta de teste do proprio dono. Nenhum comprador real foi afetado. Se um
-- dia esta consulta voltar a ser necessaria com base maior, ela precisa avisar quem foi
-- alterado, porque ai vira mudanca de conteudo publicado de terceiro.
--
--   node supabase/operacao/aplicar.mjs supabase/operacao/0003_limpar_selo_herdado.sql --aplicar

update myportifolio.portfolios
   set badge_label = null,
       badge_icon = null
 where slug <> 'helio'
   and badge_label = 'VibeCoder'
   and badge_icon = 'code';

select slug, badge_label, badge_icon from myportifolio.portfolios order by created_at;
