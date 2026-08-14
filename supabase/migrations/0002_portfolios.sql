-- Validadores, slugs reservados, tabela de portfolios, guarda de colunas, historico
-- de slug.

-- Validadores em plpgsql, nao em sql: funcao sql com subquery pode ser inlinada pelo
-- planner, e subquery nao e permitida dentro de CHECK. plpgsql nunca e inlinada.
-- Aviso permanente: o Postgres NAO revalida linhas antigas quando o corpo de uma
-- funcao usada em CHECK muda. Afrouxar aqui e retroativo, apertar nao e.

create or replace function myportifolio.i18n_texto_valido(p_value jsonb, p_max int) returns boolean
language plpgsql immutable as $$
begin
  if p_value is null then return true; end if;
  if jsonb_typeof(p_value) <> 'object' then return false; end if;
  if not (p_value ? 'pt') then return false; end if;
  if exists (select 1 from jsonb_object_keys(p_value) k where k not in ('pt','en')) then
    return false;
  end if;
  if exists (select 1 from jsonb_each(p_value) e
             where jsonb_typeof(e.value) <> 'string'
                or char_length(e.value #>> '{}') > p_max) then
    return false;
  end if;
  return true;
end;
$$;

-- Lista traduzivel { "pt": [...], "en": [...] } (features e stack do case).
-- O teto de itens nao e frescura: em SSR o texto vira concatenacao de string dentro do
-- limite de CPU do Worker, e um comprador colando 200 KB derruba a propria pagina.
create or replace function myportifolio.i18n_lista_valida(p_value jsonb, p_max_itens int, p_max_len int)
returns boolean language plpgsql immutable as $$
declare v_key text; v_arr jsonb;
begin
  if p_value is null then return true; end if;
  if jsonb_typeof(p_value) <> 'object' then return false; end if;
  if not (p_value ? 'pt') then return false; end if;
  for v_key in select k from jsonb_object_keys(p_value) k loop
    if v_key not in ('pt','en') then return false; end if;
    v_arr := p_value -> v_key;
    if jsonb_typeof(v_arr) <> 'array' then return false; end if;
    if jsonb_array_length(v_arr) > p_max_itens then return false; end if;
    if exists (select 1 from jsonb_array_elements(v_arr) e
               where jsonb_typeof(e.value) <> 'string'
                  or char_length(e.value #>> '{}') > p_max_len) then
      return false;
    end if;
  end loop;
  return true;
end;
$$;

-- Caminho no bucket, nunca URL: sem ':' e sem '//' inicial, "javascript:", "data:" e
-- "//evil.com/x.png" ficam impossiveis por construcao.
-- ATENCAO: esta funcao valida FORMATO. O confinamento na pasta do proprio tenant
-- (achado 17) e feito por CHECK separado em cada tabela, porque so la existe a coluna
-- com o id do tenant.
--
-- O segundo padrao (recusa de '.' e '..' como segmento) e o que fecha o confinamento de
-- verdade. Sem ele, '<meu-id>/../<id-alheio>/foto-aabbccdd.webp' passa nesta funcao E passa
-- no like '<meu-id>/%', porque o prefixo continua sendo o meu uuid. A chave no bucket seria
-- literal e diferente, mas a URL publica e normalizada pelo cliente e pelos proxies, entao a
-- <img> e a og:image do meu portfolio resolveriam para o arquivo do outro tenant: exatamente
-- o dano que o confinamento existe para impedir. Ponto continua permitido no meio do nome
-- (a extensao precisa dele), so nao como segmento inteiro.
create or replace function myportifolio.media_path_valido(p_path text) returns boolean
language sql immutable as $$
  select p_path is null or (p_path ~ '^[A-Za-z0-9][A-Za-z0-9._/-]{0,240}$'
                        and p_path !~ '(^|/)\.\.?(/|$)');
$$;

create or replace function myportifolio.url_https_valida(p_url text) returns boolean
language sql immutable as $$
  select p_url is null or (char_length(p_url) <= 500
    and p_url ~ '^https://[a-zA-Z0-9.-]+(:[0-9]{1,5})?(/[^[:space:]<>"]*)?$');
$$;

create or replace function myportifolio.cor_hex_valida(p_cor text) returns boolean
language sql immutable as $$
  select p_cor is null or p_cor ~ '^#[0-9A-Fa-f]{6}$';
$$;

-- DECISAO 3: o slug agora e ROTULO DE SUBDOMINIO, nao segmento de caminho.
-- Esta funcao e o gemeo exato de ehRotuloDnsValido() em worker/lib/host.js. Divergir
-- significa slug aceito pelo banco que o roteador recusa, ou o contrario.
--   3 a 63 caracteres (63 e o limite de rotulo DNS)
--   so [a-z0-9-], sublinhado PROIBIDO (valido em caminho, invalido em hostname)
--   nao comeca nem termina com hifen
--   'xn--' e prefixo de punycode, reservado
--   qualquer coisa com '--' na 3a e 4a posicao e reservada por RFC 5891 secao 4.2.3.1
create or replace function myportifolio.slug_dns_valido(p_slug text) returns boolean
language sql immutable as $$
  select p_slug is not null
     and char_length(p_slug) between 3 and 63
     and p_slug = lower(p_slug)
     and p_slug ~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?$'
     and p_slug !~ '^..--'
     and p_slug not like 'xn--%';
$$;

-- SLUGS RESERVADOS ---------------------------------------------------------
-- Tabela e nao CHECK com lista literal: a lista cresce toda vez que uma rota ou um
-- registro DNS nasce, e alterar CHECK e ALTER TABLE que revalida tudo, enquanto
-- reservar e um INSERT.
-- ESTA e a lista canonica do sistema. worker/lib/reservados.js e GERADO dela por
-- scripts/gerar-reservados.mjs. Nao existe segunda lista escrita a mao em lugar nenhum.
create table if not exists myportifolio.reserved_slugs (
  slug text primary key,
  reason text not null,
  created_at timestamptz not null default now()
);
alter table myportifolio.reserved_slugs enable row level security;
revoke all on myportifolio.reserved_slugs from anon, authenticated;
create policy "admin gerencia slugs reservados" on myportifolio.reserved_slugs
  for all to authenticated using (myportifolio.is_admin()) with check (myportifolio.is_admin());

insert into myportifolio.reserved_slugs (slug, reason) values
  ('www','infra'), ('mail','infra'), ('smtp','infra'), ('imap','infra'), ('pop','infra'),
  ('mx','infra'), ('mx1','infra'), ('mx2','infra'), ('ns','infra'), ('ns1','infra'),
  ('ns2','infra'), ('dns','infra'), ('ftp','infra'), ('send','infra'), ('mailer','infra'),
  ('email','infra'), ('webmail','infra'), ('bounce','infra'), ('bounces','infra'),
  ('autodiscover','infra'), ('autoconfig','infra'), ('postmaster','infra'),
  ('hostmaster','infra'), ('webmaster','infra'), ('abuse','infra'), ('root','infra'),
  ('dkim','infra'), ('dmarc','infra'), ('spf','infra'), ('resend','infra'),
  ('cdn','infra'), ('cdn-cgi','infra'), ('acme','infra'), ('challenge','infra'),
  ('static','infra'), ('assets','infra'), ('media','infra'), ('storage','infra'),
  ('files','infra'), ('uploads','infra'), ('img','infra'), ('imagens','infra'),
  ('images','infra'), ('video','infra'), ('js','infra'), ('css','infra'),
  ('fonts','infra'), ('sitemap','infra'), ('robots','infra'), ('favicon','infra'),
  ('feed','infra'), ('rss','infra'), ('supabase','infra'), ('status','infra'),
  ('app','rota'), ('editor','rota'), ('studio','rota'), ('painel','rota'),
  ('dashboard','rota'), ('admin','rota'), ('api','rota'), ('auth','rota'),
  ('webhook','rota'), ('preview','rota'), ('previa','rota'), ('entrar','rota'),
  ('login','rota'), ('logout','rota'), ('conta','rota'), ('cadastro','rota'),
  ('comprar','rota'), ('checkout','rota'), ('pagar','rota'), ('pay','rota'),
  ('assinar','rota'), ('planos','rota'), ('pricing','rota'), ('preco','rota'),
  ('senha','rota'), ('recuperar','rota'),
  ('dev','ambiente'), ('staging','ambiente'), ('stage','ambiente'), ('homolog','ambiente'),
  ('test','ambiente'), ('teste','ambiente'), ('beta','ambiente'), ('alpha','ambiente'),
  ('demo','ambiente'), ('sandbox','ambiente'), ('local','ambiente'),
  ('pt','idioma'), ('en','idioma'), ('es','idioma'), ('br','idioma'),
  ('docs','institucional'), ('blog','institucional'), ('help','institucional'),
  ('ajuda','institucional'), ('suporte','institucional'), ('contato','institucional'),
  ('sobre','institucional'), ('termos','institucional'), ('privacidade','institucional'),
  ('legal','institucional'), ('seguranca','institucional'), ('security','institucional'),
  -- JS gera esses hostnames sozinho quando uma variavel escapa de um template.
  ('null','defensivo'), ('undefined','defensivo'), ('nan','defensivo'),
  ('methodgrowthhub','marca'), ('methodcipher','marca'), ('aiblock','marca'),
  ('linksby','marca')
on conflict (slug) do nothing;
-- NAO reservar 'helio': o portfolio do Helio e um tenant de verdade, e o apex serve
-- justamente ele (secao 9.8).

-- TERMO SENSIVEL NO ENDERECO ------------------------------------------------
-- reserved_slugs protege infraestrutura NOSSA e casa o slug inteiro. Ele nao protege marca
-- de terceiro nenhuma, e e por marca de terceiro que o subdominio vira arma: um rotulo DNS
-- valido como 'nubank-verificacao', 'itau-seguranca', 'gov-br-inss' ou 'mercadopago-suporte'
-- passa em todas as validacoes de hoje e sobe sozinho, porque a compra e por impulso e
-- automatica. O dano nao para no cliente que abusou: subdominio herda a credibilidade do
-- dominio pai, e dominio pai marcado por phishing derruba a vitrine, o checkout, o portfolio
-- do Helio e todos os clientes vitalicios de uma vez, contra receita zero para reconstruir
-- (risco R8).
--
-- Casa por SUBSTRING, e nao por igualdade, porque o vetor e justamente a composicao
-- ('nubank' + '-verificacao'). Tabela e nao lista literal pelo mesmo motivo de
-- reserved_slugs: a lista cresce com o noticiario, e crescer tem que ser INSERT.
create table if not exists myportifolio.slug_denylist (
  termo text primary key check (termo = lower(termo) and char_length(termo) between 3 and 40),
  motivo text not null,
  created_at timestamptz not null default now()
);
alter table myportifolio.slug_denylist enable row level security;
revoke all on myportifolio.slug_denylist from anon, authenticated;
create policy "admin gerencia a denylist" on myportifolio.slug_denylist
  for all to authenticated using (myportifolio.is_admin()) with check (myportifolio.is_admin());

insert into myportifolio.slug_denylist (termo, motivo) values
  ('nubank','marca de terceiro'), ('itau','marca de terceiro'),
  ('bradesco','marca de terceiro'), ('santander','marca de terceiro'),
  ('caixa','marca de terceiro'), ('bancodobrasil','marca de terceiro'),
  ('inter','marca de terceiro'), ('c6bank','marca de terceiro'),
  ('picpay','marca de terceiro'), ('mercadopago','marca de terceiro'),
  ('mercadolivre','marca de terceiro'), ('pagseguro','marca de terceiro'),
  ('pagbank','marca de terceiro'), ('stone','marca de terceiro'),
  ('cielo','marca de terceiro'), ('paypal','marca de terceiro'),
  ('binance','marca de terceiro'), ('correios','marca de terceiro'),
  ('serasa','marca de terceiro'), ('whatsapp','marca de terceiro'),
  ('instagram','marca de terceiro'), ('google','marca de terceiro'),
  ('microsoft','marca de terceiro'), ('apple','marca de terceiro'),
  ('gov','orgao publico'), ('govbr','orgao publico'), ('receita','orgao publico'),
  ('inss','orgao publico'), ('detran','orgao publico'), ('prefeitura','orgao publico'),
  ('cadastro','isca de credencial'), ('recadastr','isca de credencial'),
  ('verifica','isca de credencial'), ('validacao','isca de credencial'),
  ('seguranca','isca de credencial'), ('atualiz','isca de credencial'),
  ('desbloqueio','isca de credencial'), ('regulariz','isca de credencial'),
  ('2via','isca de credencial'), ('boleto','isca de credencial'),
  ('reembolso','isca de credencial'), ('premio','isca de credencial'),
  ('sorteio','isca de credencial'), ('suporte','isca de credencial'),
  ('atendimento','isca de credencial'), ('central','isca de credencial')
on conflict (termo) do nothing;

-- Falso positivo existe e e barato: 'central' recusa 'central-design'. O caminho e o dono
-- liberar caso a caso pelo painel (delete na linha da denylist, com o registro em
-- moderation_log), e nao afrouxar a regra. Recusar um nome legitimo custa um ticket;
-- aceitar um nome de phishing custa o dominio.
create or replace function myportifolio.slug_tem_termo_sensivel(p_slug text) returns boolean
language sql stable security definer set search_path = myportifolio, public as $$
  select exists (select 1 from myportifolio.slug_denylist d
                 where position(d.termo in lower(coalesce(p_slug, ''))) > 0);
$$;
revoke execute on function myportifolio.slug_tem_termo_sensivel(text) from public, anon;
grant execute on function myportifolio.slug_tem_termo_sensivel(text) to authenticated;

-- ACHADO 29: reservar um nome depois que ja existe cliente usando ele passa em
-- silencio. Reservar vira RPC que RECUSA quando ha conflito, listando quem usa.
create or replace function myportifolio.admin_reserve_slug(p_slug text, p_reason text)
returns void language plpgsql security definer set search_path = myportifolio, public as $$
declare v_slug text := lower(trim(p_slug)); v_conflitos text;
begin
  if not myportifolio.is_admin() then raise exception 'apenas admin'; end if;
  select string_agg(pf.owner_email, ', ') into v_conflitos
  from myportifolio.portfolios pf where pf.slug = v_slug;
  if v_conflitos is not null then
    raise exception 'slug % ja esta em uso por: %. decida o que fazer antes de reservar',
      v_slug, v_conflitos;
  end if;
  insert into myportifolio.reserved_slugs (slug, reason) values (v_slug, p_reason)
  on conflict (slug) do nothing;
end;
$$;
revoke execute on function myportifolio.admin_reserve_slug(text, text) from public, anon;
grant execute on function myportifolio.admin_reserve_slug(text, text) to authenticated;

-- PORTFOLIOS ---------------------------------------------------------------
-- NAO existe coluna status. Estar no ar e portfolio_publications.is_live, e ponto.
-- Sob pagamento vitalicio (decisao 1) nao ha suspensao por inadimplencia, e o unico
-- desligamento e blocked em member_access ou unpublish pelo dono.
create table if not exists myportifolio.portfolios (
  id uuid primary key default gen_random_uuid(),

  -- owner_email e o E-MAIL DA COMPRA, imutavel, mesma chave de member_access.email.
  -- Trocar isto e o achado 2: desligava a revogacao e sequestrava portfolio alheio.
  -- Protegido por tres camadas: sem grant de update na coluna, trigger de guarda, e
  -- FK para member_access.
  owner_email text not null references myportifolio.member_access(email) on update restrict,
  owner_id uuid references auth.users(id) on delete set null,

  slug text not null,

  -- perfil (espelha profile.data.js)
  display_name text not null,
  role_i18n jsonb not null default '{"pt": ""}'::jsonb,
  bio_i18n  jsonb not null default '{"pt": ""}'::jsonb,
  contact_email text,
  -- ACHADO 6: e-mail de contato so entra no payload publico se o comprador pedir.
  show_contact_email boolean not null default false,
  avatar_path text,
  hero_path text,
  -- Hoje object-[50%_36%] esta cravado no heroImage.js e enquadra o rosto do Helio.
  -- Como coluna, deixa de cortar errado a foto de todo comprador. Livre para todos:
  -- nao faz parte do bump (qualquer valor e valido, o banco nao consegue distinguir
  -- "predefinido" de "livre" sem inventar uma tabela de predefinidos).
  hero_object_position text not null default '50% 36%',
  show_online_dot boolean not null default true,

  -- BUMP DE PERSONALIZACAO (has_custom). Sem o bump, o trigger de guarda recusa
  -- qualquer mudanca nestas seis colunas, e o portfolio sai com o visual padrao.
  -- E isto que faz o bump ser um produto e nao um enfeite de checkout.
  theme_accent text,
  theme_plate_bg text,
  badge_label text default 'VibeCoder',
  badge_icon  text default 'code',
  cta_label_i18n jsonb,
  filter_labels jsonb not null default '{}'::jsonb,

  cta_url text,

  -- listas curtas: editadas em bloco, sem policy propria, formato identico ao que t() consome
  socials jsonb not null default '[]'::jsonb,   -- [{label, value:{pt,en}|text, href}]
  stats   jsonb not null default '[]'::jsonb,   -- [{label:{pt,en}, value:{pt,en}|text, lang?}]
  stacks  text[] not null default '{}',

  -- comportamento
  default_lang text not null default 'pt' check (default_lang in ('pt','en')),
  english_enabled boolean not null default false,   -- toggle de conteudo, nao de plano
  projects_video_first boolean not null default true,
  projects_per_page int not null default 6 check (projects_per_page between 3 and 12),

  seo_title_i18n jsonb,
  seo_description_i18n jsonb,

  -- ACHADO 26 / secao 6.9: o token em claro NUNCA fica no banco. Guarda-se o sha256, e
  -- comparar hashes resolve o que SQL nao tem (comparacao em tempo constante).
  preview_token_hash text,
  preview_token_rotated_at timestamptz,

  starter_kit text,
  onboarding_step smallint not null default 0,

  -- ACHADO 16: sem contador, um cliente sozinho reserva mil slugs num loop.
  slug_changes_count int not null default 0,
  slug_window_started_at timestamptz not null default now(),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  first_published_at timestamptz,

  -- RISCO R8, o lado preventivo. Um subdominio herda a credibilidade do dominio pai, e a
  -- denylist de termo sensivel (acima) so pega o ENDERECO. O conteudo continua livre, a
  -- compra e por impulso e automatica, e o dano de um phishing hospedado aqui nao e o
  -- tenant: e o dominio pai queimado levando junto a vitrine, o checkout e todos os
  -- clientes vitalicios, contra receita zero para reconstruir. A primeira publicacao de
  -- cada conta passa por conferencia de um clique; da segunda em diante publicar e
  -- instantaneo para sempre.
  first_publish_approved_at timestamptz,
  first_publish_approved_by text,

  constraint portfolios_slug_unico unique (slug),
  constraint portfolios_um_por_comprador unique (owner_email),
  constraint portfolios_email_minusculo check (owner_email = lower(owner_email)),
  constraint portfolios_slug_dns check (myportifolio.slug_dns_valido(slug)),
  constraint portfolios_nome_tamanho check (char_length(display_name) between 1 and 80),
  constraint portfolios_role_ok check (myportifolio.i18n_texto_valido(role_i18n, 160)),
  constraint portfolios_bio_ok  check (myportifolio.i18n_texto_valido(bio_i18n, 2000)),
  constraint portfolios_cta_label_ok check (myportifolio.i18n_texto_valido(cta_label_i18n, 40)),
  constraint portfolios_seo_title_ok check (myportifolio.i18n_texto_valido(seo_title_i18n, 70)),
  constraint portfolios_seo_desc_ok  check (myportifolio.i18n_texto_valido(seo_description_i18n, 180)),
  constraint portfolios_cta_url_ok check (myportifolio.url_https_valida(cta_url)),
  constraint portfolios_badge_tamanho check (badge_label is null or char_length(badge_label) <= 24),
  constraint portfolios_hero_pos_ok check (hero_object_position ~ '^[0-9]{1,3}% [0-9]{1,3}%$'),
  constraint portfolios_accent_ok check (myportifolio.cor_hex_valida(theme_accent)),
  constraint portfolios_plate_ok  check (myportifolio.cor_hex_valida(theme_plate_bg)),
  constraint portfolios_socials_ok check (jsonb_typeof(socials) = 'array' and jsonb_array_length(socials) <= 8),
  constraint portfolios_stats_ok   check (jsonb_typeof(stats)   = 'array' and jsonb_array_length(stats)   <= 6),
  constraint portfolios_stacks_ok  check (array_length(stacks, 1) is null or array_length(stacks, 1) <= 40),
  constraint portfolios_contato_ok check (
    contact_email is null or contact_email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[a-z]{2,}$'),

  -- ACHADO 17: caminho de midia CONFINADO na pasta do proprio tenant. Sem isto, um
  -- cliente aponta avatar_path para a pasta de outro, ou usa og:image de terceiro.
  -- O CHECK enxerga a coluna id da propria linha, entao isto e verificavel no banco.
  constraint portfolios_avatar_ok check (
    avatar_path is null or (myportifolio.media_path_valido(avatar_path)
                            and avatar_path like id::text || '/%')),
  constraint portfolios_hero_ok check (
    hero_path is null or (myportifolio.media_path_valido(hero_path)
                          and hero_path like id::text || '/%'))
);

create index if not exists portfolios_owner_id_idx on myportifolio.portfolios (owner_id);
create index if not exists portfolios_owner_email_idx on myportifolio.portfolios (owner_email);
create trigger portfolios_set_updated_at before update on myportifolio.portfolios
  for each row execute function myportifolio.set_updated_at();

-- HISTORICO DE SLUG --------------------------------------------------------
-- ACHADO 16, tres correcoes de uma vez:
--   1. so entra no historico slug que CHEGOU A FICAR NO AR. Slug nunca publicado nunca
--      teve link para preservar, e bloquea-lo e so sequestro de namespace.
--   2. expires_at de 12 meses, com faxina por pg_cron. Redirecionamento eterno nao
--      protege ninguem e envenena o namespace.
--   3. o limite de trocas fica na RPC change_my_slug(), nao aqui.
create table if not exists myportifolio.portfolio_slug_history (
  slug text primary key,
  portfolio_id uuid not null references myportifolio.portfolios(id) on delete cascade,
  changed_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '12 months'
);
create index if not exists slug_history_expira_idx on myportifolio.portfolio_slug_history (expires_at);
alter table myportifolio.portfolio_slug_history enable row level security;
revoke all on myportifolio.portfolio_slug_history from anon, authenticated;

select cron.schedule('faxina-slug-history', '17 4 * * *', $$
  delete from myportifolio.portfolio_slug_history where expires_at < now();
$$);

-- NORMALIZACAO E RESERVA ---------------------------------------------------
create or replace function myportifolio.validar_slug_portfolio() returns trigger
language plpgsql security definer set search_path = myportifolio, public as $$
begin
  new.slug := lower(trim(new.slug));
  new.owner_email := lower(trim(new.owner_email));

  if not myportifolio.slug_dns_valido(new.slug) then
    raise exception 'endereco invalido para subdominio: %', new.slug;
  end if;
  if exists (select 1 from myportifolio.reserved_slugs r where r.slug = new.slug) then
    raise exception 'endereco reservado pela plataforma: %', new.slug;
  end if;
  -- Vale para admin tambem, e de proposito: o unico caminho de excecao e apagar o termo da
  -- denylist, que fica registrado, em vez de contornar a regra numa RPC privilegiada.
  -- liberar_slug_retido() renomeia para 'bloqueado-<hex>', que nao casa termo nenhum.
  if myportifolio.slug_tem_termo_sensivel(new.slug) then
    raise exception 'endereco recusado: contem termo sensivel de marca ou de orgao publico';
  end if;
  if exists (select 1 from myportifolio.portfolio_slug_history h
             where h.slug = new.slug and h.portfolio_id <> new.id and h.expires_at > now()) then
    raise exception 'esse endereco ainda redireciona para outra pessoa: %', new.slug;
  end if;

  if tg_op = 'UPDATE' and new.slug <> old.slug then
    -- so guarda o slug antigo se ele chegou a estar no ar
    if exists (select 1 from myportifolio.portfolio_publications pb
               where pb.portfolio_id = old.id and pb.slug = old.slug) then
      insert into myportifolio.portfolio_slug_history (slug, portfolio_id)
      values (old.slug, old.id)
      on conflict (slug) do update set
        portfolio_id = excluded.portfolio_id,
        changed_at = now(),
        expires_at = now() + interval '12 months';
    end if;
    delete from myportifolio.portfolio_slug_history where slug = new.slug and portfolio_id = new.id;
  end if;
  return new;
end;
$$;
create trigger portfolios_validar_slug before insert or update of slug, owner_email
  on myportifolio.portfolios for each row execute function myportifolio.validar_slug_portfolio();

-- GUARDA DE COLUNAS --------------------------------------------------------
-- ACHADO 2, camada 2. RLS NAO restringe coluna: um "with check" que passa deixa
-- escrever em QUALQUER coluna da linha. A camada 1 (o revoke/grant logo abaixo) e a
-- que de fato impede a escrita via PostgREST. Esta aqui pega o caso de alguem
-- reconceder o grant sem pensar, e o caso de uma RPC nossa escrever onde nao deve.
-- Ela tambem e o guarda do bump de personalizacao (secao 6.10), para nao existirem
-- dois triggers before update disputando a mesma tabela.
--
-- A porta de fuga NAO e mais is_admin(). Ser admin nao pode significar "escreve o que
-- quiser na linha de qualquer cliente": quem monta portfolio de comprador de facilitacao
-- entra por concessao de escopo (setup_grants, logo abaixo) e continua sujeito a ESTE
-- trigger, inclusive nas colunas protegidas. Sobrou uma unica porta, a marca de transacao,
-- ligada e desligada dentro das RPCs privilegiadas do proprio schema. Um Gmail comprometido
-- deixa de valer escrita irrestrita em toda a base.
create or replace function myportifolio.portfolios_guarda_colunas() returns trigger
language plpgsql security definer set search_path = myportifolio, public as $$
begin
  if myportifolio.em_operacao_confiavel() then
    return new;
  end if;

  if new.id is distinct from old.id
     or new.owner_email is distinct from old.owner_email
     or new.owner_id is distinct from old.owner_id
     or new.slug is distinct from old.slug
     or new.preview_token_hash is distinct from old.preview_token_hash
     or new.preview_token_rotated_at is distinct from old.preview_token_rotated_at
     or new.slug_changes_count is distinct from old.slug_changes_count
     or new.slug_window_started_at is distinct from old.slug_window_started_at
     or new.first_published_at is distinct from old.first_published_at
     or new.first_publish_approved_at is distinct from old.first_publish_approved_at
     or new.first_publish_approved_by is distinct from old.first_publish_approved_by
     or new.starter_kit is distinct from old.starter_kit then
    raise exception 'coluna protegida: use a RPC correspondente';
  end if;

  -- Bump de personalizacao: sem has_custom, o visual nao muda. Lista fechada, a mesma
  -- da secao 6.10. A pergunta e sobre o DONO desta linha (portfolio_tem_custom), e nao
  -- sobre quem esta logado: com has_custom_access() um operador que comprou o bump para si
  -- pintava o portfolio de quem nao comprou, e um operador sem compra nenhuma nao
  -- conseguia entregar o portfolio que acabou de montar. Para o comprador editando o
  -- proprio portfolio as duas perguntas dao a mesma resposta.
  if (new.theme_accent is distinct from old.theme_accent
      or new.theme_plate_bg is distinct from old.theme_plate_bg
      or new.badge_label is distinct from old.badge_label
      or new.badge_icon is distinct from old.badge_icon
      or new.cta_label_i18n is distinct from old.cta_label_i18n
      or new.filter_labels is distinct from old.filter_labels)
     and not myportifolio.portfolio_tem_custom(new.id) then
    raise exception 'personalizacao nao liberada nesta conta';
  end if;

  return new;
end;
$$;
create trigger portfolios_guarda before update on myportifolio.portfolios
  for each row execute function myportifolio.portfolios_guarda_colunas();

-- CONCESSAO DE FACILITACAO --------------------------------------------------
-- O bump de facilitacao e trabalho humano: alguem de dentro monta o portfolio do comprador.
-- O plano nao pode pagar por isso com is_admin() global, porque is_admin() nao tem escopo
-- (vale para TODO portfolio, nao so para quem comprou o bump), nao tem prazo (entregar o
-- pedido nao revoga nada), nao tem rastro e nao tem consentimento de quem esta sendo
-- editado. Some a isso que a chave de is_admin() e uma caixa de e-mail, e a conclusao e que
-- um Gmail comprometido publica qualquer coisa em qualquer subdominio do produto.
--
-- A concessao troca isso por: um portfolio, um prazo, um motivo e uma linha de log.
create table if not exists myportifolio.setup_grants (
  id bigint generated always as identity primary key,
  admin_email text not null references myportifolio.admin_users(email) on delete cascade,
  portfolio_id uuid not null references myportifolio.portfolios(id) on delete cascade,
  granted_at timestamptz not null default now(),
  -- Prazo curto e a defesa que sobra quando o resto falha. Renovar e um comando.
  expires_at timestamptz not null default now() + interval '72 hours',
  revoked_at timestamptz,
  reason text
);
create index if not exists setup_grants_vivas_idx
  on myportifolio.setup_grants (portfolio_id, expires_at) where revoked_at is null;
alter table myportifolio.setup_grants enable row level security;
revoke all on myportifolio.setup_grants from anon, authenticated;
-- O COMPRADOR le quem esta com acesso ao portfolio dele. Transparencia aqui nao e enfeite:
-- e o que transforma "alguem edita em nome dele" em fato observavel pelo titular.
create policy "dono le as concessoes do proprio portfolio" on myportifolio.setup_grants
  for select to authenticated using (
    exists (select 1 from myportifolio.portfolios p
            where p.id = setup_grants.portfolio_id
              and (p.owner_id = (select auth.uid())
                or p.owner_email = (select myportifolio.current_purchase_email()))));
create policy "admin le as proprias concessoes" on myportifolio.setup_grants
  for select to authenticated using (myportifolio.is_admin());
grant select on myportifolio.setup_grants to authenticated;

create or replace function myportifolio.tem_concessao_setup(p_portfolio_id uuid) returns boolean
language sql security definer set search_path = myportifolio, public stable as $$
  select exists (select 1 from myportifolio.setup_grants g
    where g.portfolio_id = p_portfolio_id
      and g.admin_email = (select myportifolio.current_login_email())
      and g.revoked_at is null
      and g.expires_at > now());
$$;
grant execute on function myportifolio.tem_concessao_setup(uuid) to authenticated;
revoke execute on function myportifolio.tem_concessao_setup(uuid) from public, anon;

-- FLAGS DO DONO DO PORTFOLIO, E NAO DE QUEM ESTA LOGADO ----------------------
-- has_custom_access() e has_active_access() respondem sobre current_purchase_email(), o que
-- e certo para o proprio comprador e errado para qualquer outra pessoa escrevendo na linha
-- dele: um operador com bump proprio editaria a cor de quem nao comprou o bump, e um
-- operador sem compra nenhuma nao conseguiria publicar o portfolio que ele acabou de montar.
-- A pergunta certa nunca foi "quem esta logado tem o produto?", e sim "o DONO desta linha
-- tem?". Para o comprador editando o proprio portfolio o resultado e identico.
create or replace function myportifolio.portfolio_tem_custom(p_portfolio_id uuid) returns boolean
language sql security definer set search_path = myportifolio, public stable as $$
  select coalesce((select ma.has_custom and not ma.blocked
                   from myportifolio.portfolios p
                   join myportifolio.member_access ma on ma.email = p.owner_email
                   where p.id = p_portfolio_id), false);
$$;
grant execute on function myportifolio.portfolio_tem_custom(uuid) to authenticated;
revoke execute on function myportifolio.portfolio_tem_custom(uuid) from public, anon;

create or replace function myportifolio.portfolio_tem_acesso_ativo(p_portfolio_id uuid) returns boolean
language sql security definer set search_path = myportifolio, public stable as $$
  select coalesce((select ma.has_main and not ma.blocked
                   from myportifolio.portfolios p
                   join myportifolio.member_access ma on ma.email = p.owner_email
                   where p.id = p_portfolio_id), false);
$$;
grant execute on function myportifolio.portfolio_tem_acesso_ativo(uuid) to authenticated;
revoke execute on function myportifolio.portfolio_tem_acesso_ativo(uuid) from public, anon;

-- POSSE --------------------------------------------------------------------
-- security definer para que a policy da tabela filha nao dependa da policy da tabela
-- pai. Casa por owner_id OU pelo e-mail de COMPRA resolvido (que ja passa pelo alias) OU
-- por concessao de facilitacao viva. E aqui que a concessao entra em TODA RPC de escrita de
-- uma vez, em vez de cada uma delas ganhar um "or is_admin()" sem escopo.
create or replace function myportifolio.owns_portfolio(p_portfolio_id uuid) returns boolean
language sql security definer set search_path = myportifolio, public stable as $$
  select exists (select 1 from myportifolio.portfolios p
    where p.id = p_portfolio_id
      and (p.owner_id = (select auth.uid())
        or p.owner_email = (select myportifolio.current_purchase_email())))
    or myportifolio.tem_concessao_setup(p_portfolio_id);
$$;
grant execute on function myportifolio.owns_portfolio(uuid) to authenticated;
revoke execute on function myportifolio.owns_portfolio(uuid) from public, anon;

-- Versao para policy de storage: compara p.id::text com o nome da pasta em vez de
-- fazer cast do nome da pasta para uuid. Cast de entrada nao confiavel LEVANTA erro
-- em vez de negar acesso, e um upload com pasta "../etc" viraria 500 em vez de 403.
create or replace function myportifolio.owns_portfolio_folder(p_folder text) returns boolean
language sql security definer set search_path = myportifolio, public stable as $$
  select exists (select 1 from myportifolio.portfolios p
    where p.id::text = p_folder
      and (p.owner_id = (select auth.uid())
        or p.owner_email = (select myportifolio.current_purchase_email())
        or myportifolio.tem_concessao_setup(p.id)));
$$;
grant execute on function myportifolio.owns_portfolio_folder(text) to authenticated;
revoke execute on function myportifolio.owns_portfolio_folder(text) from public, anon;

-- Mesmo par para a policy de storage: "o dono desta pasta tem compra ativa?", que e
-- diferente de "quem esta subindo o arquivo tem compra ativa?".
create or replace function myportifolio.pasta_tem_acesso_ativo(p_folder text) returns boolean
language sql security definer set search_path = myportifolio, public stable as $$
  select coalesce((select ma.has_main and not ma.blocked
                   from myportifolio.portfolios p
                   join myportifolio.member_access ma on ma.email = p.owner_email
                   where p.id::text = p_folder), false);
$$;
grant execute on function myportifolio.pasta_tem_acesso_ativo(text) to authenticated;
revoke execute on function myportifolio.pasta_tem_acesso_ativo(text) from public, anon;

-- RLS E GRANTS -------------------------------------------------------------
alter table myportifolio.portfolios enable row level security;
-- NAO existe policy de select para anon aqui, e isso e proposital: o visitante
-- deslogado nunca toca em portfolios.
revoke all on myportifolio.portfolios from anon;

-- ACHADO 2, camada 1 e a que realmente vale. Primeiro tira UPDATE de tabela inteira,
-- depois devolve coluna a coluna. Qualquer PATCH do PostgREST tocando uma coluna fora
-- desta lista responde 42501 permission denied, ANTES de RLS ser avaliada.
-- Manter esta lista sincronizada com o editor e obrigacao de code review: coluna nova
-- de conteudo tem que entrar aqui, coluna de seguranca nunca entra.
revoke update on myportifolio.portfolios from authenticated;
grant select on myportifolio.portfolios to authenticated;
grant update (
  display_name, role_i18n, bio_i18n, contact_email, show_contact_email,
  avatar_path, hero_path, hero_object_position, show_online_dot,
  badge_label, badge_icon, cta_url, cta_label_i18n,
  theme_accent, theme_plate_bg, filter_labels,
  socials, stats, stacks,
  default_lang, english_enabled, projects_video_first, projects_per_page,
  seo_title_i18n, seo_description_i18n, onboarding_step
) on myportifolio.portfolios to authenticated;

create policy "dono le o proprio portfolio" on myportifolio.portfolios
  for select to authenticated using (
    owner_id = (select auth.uid())
    or owner_email = (select myportifolio.current_purchase_email()));

create policy "dono atualiza o proprio portfolio" on myportifolio.portfolios
  for update to authenticated
  using (owner_id = (select auth.uid())
      or owner_email = (select myportifolio.current_purchase_email()))
  with check (
    (owner_id = (select auth.uid())
     or owner_email = (select myportifolio.current_purchase_email()))
    and myportifolio.has_active_access());

-- O admin LE tudo, porque moderar exige enxergar. O admin NAO escreve em portfolio de
-- cliente pela porta larga: o "for all" que estava aqui dava a uma caixa de e-mail poder
-- de escrita permanente sobre TODO tenant, sem escopo, sem prazo, sem rastro e sem
-- consentimento de quem esta sendo editado, o que e exatamente o que o bump de facilitacao
-- NAO precisa (ele precisa de um portfolio, por alguns dias, com registro). Escrita de
-- operador passa a exigir concessao viva em setup_grants, e as colunas continuam limitadas
-- pelo grant por coluna acima e pelo trigger de guarda.
create policy "admin le todos os portfolios" on myportifolio.portfolios
  for select to authenticated using (myportifolio.is_admin());
create policy "operador escreve com concessao viva" on myportifolio.portfolios
  for update to authenticated
  using (myportifolio.tem_concessao_setup(id))
  with check (myportifolio.tem_concessao_setup(id)
              and myportifolio.portfolio_tem_acesso_ativo(id));

-- Sem policy de INSERT nem DELETE para o dono: criar passa por create_my_portfolio()
-- e apagar passa por request_account_deletion(), com prazo (LGPD art. 18, achado 27).
