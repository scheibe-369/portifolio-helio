-- 0004_reparar_paleta.sql
--
-- Devolve a paleta a quem escolheu uma e teve a cor de fabrica gravada por cima.
--
-- O DEFEITO: o campo de cor do bump nascia preenchido com '#7C5CFC' literal (o input
-- `type="color"` nunca fica vazio), e qualquer clique em Salvar no perfil gravava esse roxo em
-- theme_accent. Como cor livre vence preset em resolverTema, a paleta escolhida parava de
-- valer. Quem PAGOU o bump era o unico que nao conseguia usar as 12 paletas, e nada avisava.
--
-- O conserto no formulario ja foi feito, e ele impede novos casos. Este arquivo trata dos
-- casos JA GRAVADOS, que o conserto do formulario nao alcanca: o dado errado continua no
-- banco e continua vencendo o preset em toda republicacao.
--
-- O FILTRO E ESTREITO DE PROPOSITO. So zera quando as duas coisas sao verdade ao mesmo tempo:
--   . existe theme_preset preenchido, ou seja a pessoa escolheu uma paleta;
--   . a cor gravada e EXATAMENTE o par de fabrica (#7C5CFC / #0b0b12).
-- Quem escolheu roxo de proposito, sem preset, nao e tocado. E quem escolheu preset E uma cor
-- diferente da de fabrica tambem nao: essa combinacao e escolha legitima e continua valendo.

update myportifolio.portfolios
   set theme_accent = null
 where theme_preset is not null
   and lower(theme_accent) = '#7c5cfc';

update myportifolio.portfolios
   set theme_plate_bg = null
 where theme_preset is not null
   and lower(theme_plate_bg) = '#0b0b12';

-- Republica quem foi reparado, senao o snapshot no ar continua com o roxo ate a proxima vez
-- que a pessoa mexer em alguma coisa.
do $$
declare v record;
begin
  for v in select id from myportifolio.portfolios
            where theme_preset is not null and first_published_at is not null loop
    perform myportifolio.publicar_interno(v.id);
  end loop;
end $$;

select slug, theme_preset, theme_accent, theme_plate_bg
  from myportifolio.portfolios where theme_preset is not null order by slug;
