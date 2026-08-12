# Verificação de DINHEIRO e ISOLAMENTO: `tasks/plano-produto.md`

Arquivos lidos: `D:/Projetos-vibeocding/eu/portifolio-helio/tasks/plano-produto.md` (5011 linhas), `tasks/_plano/critica-adversarial.md`, `tasks/_plano/decisoes-travadas.md`.

---

## Parte 1: veredito por achado da crítica (todos menos 1, 4, 14 e 19)

Em ordem numérica, porque isto é checklist de auditoria.

| # | Veredito | Prova no documento novo |
|---|---|---|
| **2** RLS não é column level | **corrigiu** | 4.3: `revoke update on public.portfolios from authenticated` seguido de `grant update (display_name, ... onboarding_step)`, lista fechada sem `owner_email`, `slug`, `owner_id`, `preview_token_hash`, `starter_kit`. Mais `portfolios_guarda_colunas()` como segunda camada e o critério 1 de 4.10 que testa as duas camadas separadamente. Ressalva menor abaixo (achado novo 21). |
| **3** e-mail de compra imutável | **corrigiu** | 4.2: `member_access_email_imutavel()` levantando `'e-mail de compra e imutavel'`, `access_aliases` com `unique (purchase_email)`, `current_purchase_email()` resolvendo um salto, e o comentário explícito em 0004 "NAO existe sync_access_email". Critério de 5.6 dispara `member_removed` com o e-mail A e exige `is_live = false`. Furo residual: achado novo 13. |
| **5** dedupe engolindo retentativa | **corrigiu** | `hubla_events` ganhou `processed_at`, `processed_result`, `applied_flags`, `attempts`, `last_attempt_at`; fluxograma de 5.3 com "processed_at IS NULL e attempts < 10 -> SEGUE PROCESSANDO"; critério de 5 passos que exige HTTP 500 na segunda chamada com o mesmo `$ID`. |
| **6** anon baixando a base | **corrigiu** | 4.5: `revoke all on public.portfolio_publications from anon`, view `published_portfolios` apagada, `list_published_slugs` só para `service_role`, `'email', case when v_pf.show_contact_email then v_pf.contact_email end` no payload. Critério 3 de 4.10. Ver achado novo 14 sobre custo. |
| **7** cota de mídia | **corrigiu pela metade** | O trigger `storage_registrar_midia()` sobre `storage.objects` e o `revoke insert, update, delete on public.portfolio_media from authenticated` estão escritos. Mas o SQL tem dois vazamentos que anulam o teto na prática: `not m.is_orphan` na soma e `if v_bytes is null then return new`. Achados novos 4 e 4b. |
| **8** oráculo e DoS no login | **corrigiu pela metade** | Turnstile, `access_throttle`, `consume_access_quota`, resposta uniforme e `disable_signup` estão todos escritos em 5.4. Só que o endpoint que realmente manda o e-mail (`/auth/v1/otp` do Supabase) continua público e não passa por nada disso. Achado novo 1. E o teto global de 20/hora vira arma. Achado novo 7. |
| **9** webhook não cria `portfolios` | **corrigiu** | 4.5, comentário de `create_my_portfolio` listando os 3 motivos; 5.3 item 4; critério 5 de 4.10 exige `select count(*) from portfolios where owner_email = ...` igual a `0` depois dos três eventos. |
| **10** `blocked` coluna morta | **corrigiu** | `admin_block_member()` / `admin_unblock_member()`, leitura em `has_active_access()`, `has_custom_access()`, no ramo de concessão (`raise exception 'conta bloqueada'`) e no trigger `member_access_sync_publicacao`. S12 assumida por escrito: "Até lá, bloqueio é operação manual". Efeito colateral novo: achado 10 abaixo. |
| **11** cache de Worker | **corrigiu** | Três chaves em `worker/lib/cache.js` (`ponteiro` / `${version}` / `socorro`), spike 2 com nonce como portão, `X-Portfolio-Cache` escrito pelo próprio código, e a admissão honesta de que o hit ratio é ruim por construção. Mas a chave escolhida colide entre tenants: achado novo 2. |
| **12** snapshot congelando URL | **corrigiu** (residual de uma linha) | `'avatarPath'`, `'mainImagePath'`, `'imagePath'`, `'ogImagePath'` saem relativos, `canonical` sai do payload, `payload_v` virou coluna com o leitor de 4.9 e `republish_all()` pronta. Residual: `'video', 'https://youtu.be/' || o.youtube_id` continua absoluto no payload (achado novo 24). |
| **13** histórico de publicação | **corrigiu** | `primary key (portfolio_id, version)`, `publications_uma_no_ar_idx`, `restore_publication()` e a faxina de 10 versões. Bug de slug no restore: achado novo 8. |
| **15** `let lang` de módulo | **corrigiu** | `t(v, lang)`, `tui(key, lang)`, `px(project, field, lang)` puros, `src/app/langState.js` isolado, e a guarda `forbidImports: [... "src/app/langState.js"]` no `boundary.config.json`. O documento também admite que o item nunca foi diferencial entre arquiteturas. |
| **16** sequestro de namespace | **corrigiu** | `slug_changes_count` mais `slug_window_started_at`, `change_my_slug()` com "limite de 2 trocas de endereco a cada 90 dias", `expires_at` de 12 meses, faxina por `pg_cron`, e o histórico só grava slug que chegou a ficar publicado. |
| **17** confinamento de mídia | **corrigiu pela metade** | Os `CHECK` de prefixo existem nas quatro colunas (`avatar_path like id::text || '/%'` etc). Mas `media_path_valido()` continua aceitando `.` e `/` livres, então `<meu-id>/../<id-alheio>/x.webp` passa nos dois testes. Achado novo 15. |
| **18** cotas do plano gratuito | **corrigiu**, com (a) meio aberto | (b) `quotas.padrao` em 20 MB com a justificativa do uso real, cota aplicada no servidor, R2 nomeado como degrau. (c) S5 removida em vez de mitigada: "Nenhum cliente pagante fica em projeto Free (decisao 9.4)" mais Cron Trigger externo. (a) SMTP próprio, alarme em 70%, senha opcional obrigatória na fase 2. O teto continua sendo teto, e agora tem um teto nosso pior que o do Supabase (achado novo 7). |
| **20** oráculo de HTML da fase 0 | **corrigiu** | `dom-diff.mjs` com parse real, normalização, allowlist fechada de 3 entradas, e "falha também se alguma entrada da allowlist não foi consumida". Explica por que escape produz zero diferença. |
| **21** gzip por glob | **corrigiu** | Portão passa a ser `import-graph.mjs` sobre o fecho transitivo de `src/main.js`; gzip vira "complemento útil, não portão". |
| **22** `like '%Exemplo%'` | **corrigiu** | Substituído pelo `join ... and pj.is_sample` com `payload -> 'projects' @> jsonb_build_array(...)`, testando a flag. |
| **23** `curl` do head do Helio | **corrigiu** | `head-snapshot.mjs --capture` hoje e `--compare` depois, com igualdade string a string em 4 campos, `og:image` resolvido para 200 com `Content-Type: image/*`, e a frase "Não se usa `grep -c`: contagem de linha não é igualdade". |
| **24** "60 linhas" | **corrigiu** | Árvore de `worker/` com 11 arquivos, lista do que cada item obriga, `import.meta.env` tratado como armadilha nomeada, e o Worker vira entregável G da fase 1. |
| **25** editor com 3 projetos escondidos | **corrigiu** | Tabela de corte em 6.1 (cropper, paleta, alpha, Ctrl+V, drag), `fieldSchema.js` como fonte única, e D2 promovida a dívida com fase e verificação. |
| **26** contradição da prévia | **corrigiu** | Decisão explícita ("existe, desde a fase 1"), `preview_token_hash` sha256, `montar_payload_portfolio` compartilhada entre publish e prévia, `get_draft_portfolio` devolvendo `null` e não erro, rate limit no escopo `preview`, `X-Robots-Tag` e fora da Cache API. |
| **27** jurídico e saída | **corrigiu**, com 4 buracos declarados | Termos, privacidade, `export_my_data()`, `request_account_deletion()` com carência de 7 dias, `refund_requests` com `within_cdc` congelado, CDC art. 49 como fluxo de produto lendo `main_granted_at`. Os 4 `BURACO:` (consentimento, cancelar exclusão, `moderation_log`, liberação de slug) estão marcados como não preenchíveis por suposição, o que é a atitude certa. Ver achados novos 9 e 23. |
| **28** métrica de valor | **corrigiu** como item de plano | Contador de visitas na fase 2 com critério "sobe exatamente 1 num miss e não sobe num hit". Custo não conciliado: achado novo 18. |
| **29** `cdn-cgi` e reserva retroativa | **corrigiu** | Seed de 100+ slugs incluindo `cdn-cgi`, `checkout`, `pagar`, `assinar`, `senha`, `recuperar`, `email`, `null`, `undefined`, `nan`; `admin_reserve_slug()` que levanta exceção listando quem usa; `revoke insert on reserved_slugs`; guarda de deploy com o join. |
| **30** números divergentes | **corrigiu** | "número de performance mora só em `tasks/_plano/medicoes.md`", os dois números do v1 explicitamente descartados. |

Placar: 21 corrigidos de fato, 3 corrigidos pela metade (7, 8, 17), 1 com residual de uma linha (12).

---

## Parte 2: achados NOVOS, do mais grave para o menos grave

### 1. O login inteiro é contornável em um `curl`: `request-access-code` não é o endpoint que manda o e-mail

Seção 5.4 constrói quatro camadas (Turnstile, `access_throttle`, resposta uniforme, `disable_signup`) e depois entrega a chave: **"Com `ok`, o front chama `signInWithOtp({ email, options: { shouldCreateUser: false } })`"**. Quem manda o e-mail é o `/auth/v1/otp` do Supabase, chamado direto pelo browser com a **anon key, que é pública** (o bundle do editor importa `@supabase/supabase-js` e precisa dela).

Consequência: o atacante nunca chama `request-access-code`. Ele bate em `/auth/v1/otp` e:

- **Dreno de cota:** esgota `rate_limit_email_sent` do projeto inteiro sem passar por Turnstile nem por `access_throttle`. O R3 volta inteiro, e sem senha na v1 ninguém entra.
- **Oráculo de enumeração:** com `shouldCreateUser: false`, e-mail sem conta devolve erro distinguível de e-mail com conta. Como conta só existe para quem comprou (`disable_signup`), isso enumera a base de clientes com precisão melhor que o `no-purchase` do v1. A resposta uniforme de 5.4(c) não protege nada.

O critério de pronto do achado 8 passa raspando por cima do buraco: ele testa `POST /auth/v1/signup`, e não `POST /auth/v1/otp`.

**Correção:** ligar o CAPTCHA nativo do Supabase Auth (`security_captcha_enabled` com provider Turnstile) na configuração do projeto, que é o único ponto que protege `/auth/v1/otp`, e acrescentar ao critério: `curl -X POST $SUPABASE_URL/auth/v1/otp -H "apikey: $ANON" -d '{"email":"x@y.z","create_user":false}'` tem que responder erro de captcha, e o corpo tem que ser idêntico para e-mail com compra e sem compra.

### 2. A chave de cache `(slug, version)` colide entre tenants e serve o portfólio de um cliente no subdomínio de outro

`worker/lib/cache.js`: `const kDocumento = new Request(\`https://cache/${ns}/${slug}/${version}\`)` com `Cache-Control: public, max-age=31536000, immutable`. `version` é `coalesce(max(pb.version), 0) + 1` **por portfólio**, não global.

Dois caminhos, ambos escritos no plano, produzem a colisão:

- `change_my_slug()` faz `update public.portfolio_publications set slug = lower(trim(p_slug)) where portfolio_id = ... and is_live` **sem incrementar `version`**. O portfólio X na versão 7 muda de `a` para `b`. Se qualquer outro portfólio já esteve em `b` na versão 7 e o documento está no colo, o ponteiro de `b` diz 7, o Worker acha `v1/b/7` e serve o HTML do tenant antigo.
- Reuso de slug depois de `portfolio_slug_history.expires_at` (12 meses) ou de slug nunca publicado (que por decisão do achado 16 não entra no histórico): o cliente novo publica, chega na versão 3, 4, 5, e cai em cima do cache do cliente anterior.

Isso é vazamento de conteúdo entre clientes no domínio compartilhado, com `immutable` de um ano e **sem permissão de purge**. É o pior modo de falha possível do desenho que resolveu o achado 11.

**Correção:** a chave do documento tem que ser `${slug}/${content_hash}` (que já existe na tabela e já é `md5(payload || slug)`), ou `${portfolio_id}/${version}`, ou a `version` tem que virar uma sequência global (`bigserial`) em vez de contador por portfólio. Critério falhável: publicar tenant A em `x`, trocar A para `y`, criar tenant B em `x`, publicar B até a versão de A, e conferir que `curl https://x.myportifolio.com.br/` devolve o conteúdo de B em toda tentativa.

### 3. O `410 Gone` prometido para portfólio bloqueado é impossível: `get_published_portfolio` não tem esse estado

A seção 2 tabula "`blocked` por reembolso, chargeback ou banimento -> `410 Gone`", a 5.8 repete com o argumento de SEO ("410 é o sinal correto para o buscador remover a URL do índice"), e o R8 depende disso para takedown de abuso.

Mas o SQL de 4.5 é:

```sql
select coalesce(
  (select jsonb_build_object('status','ok', ...) ... where pb.slug = ... and pb.is_live),
  (select jsonb_build_object('status','moved', ...) ...),
  jsonb_build_object('status','not_found'));
```

Três ramos, nenhum devolve `blocked` ou `gone`. Bloqueio derruba `is_live` (pelo trigger `member_access_sync_publicacao`), e a partir daí o portfólio bloqueado é indistinguível de slug que nunca existiu. O Worker vai responder **404 com a página "Este endereço ainda está livre" e CTA para `/comprar?slug=fulano`**, oferecendo o endereço do sujeito que acabou de ser banido, e sem nunca emitir o 410 que tira a URL do índice.

Isto é exatamente o padrão que a crítica chamou de "falou sobre, não corrigiu": o texto descreve o comportamento em duas seções e o SQL não consegue produzi-lo.

**Correção:** quarto ramo em `get_published_portfolio` devolvendo `{'status':'gone'}` quando existe `portfolios` com aquele slug cujo `owner_email` está `blocked`, ou quando existe publicação com `first_published_at is not null` e nenhuma `is_live`. Critério: bloquear um tenant publicado e conferir `curl -sI` devolvendo `410` e o corpo sem CTA.

### 4. A cota de mídia é ilimitada em laço: órfão não conta, mas ocupa bytes e serve egress

`storage_registrar_midia()` soma:

```sql
select coalesce(sum(m.bytes), 0), count(*) into v_total, v_files
from public.portfolio_media m
where m.portfolio_id = v_pf and not m.is_orphan and m.path <> new.name;
```

E `marcar_midia_orfa()` (after delete on `portfolio_projects`) faz `update public.portfolio_media set is_orphan = true`, **sem apagar o objeto do Storage**. A faxina de mídia órfã está listada na **fase 2**.

Laço do cliente na fase 1: subir até 20 MB, apagar os projetos, subir mais 20 MB, repetir. O `sum(bytes)` volta a zero a cada rodada, o arquivo continua no bucket, continua público (`for select using (bucket_id = 'portfolio-media')`) e continua gerando egress do Supabase, que é justamente o R4. O achado 7 volta com outro nome, e o critério de 6.5 ("um script que sobe imagens de 2 MB em laço tem que falhar na primeira que ultrapassa o teto") **passa**, porque o script não apaga projeto entre as rodadas.

**4b, mesma função, fail open:** `v_bytes := nullif(new.metadata ->> 'size','')::bigint; if v_bytes is null then return new;`. Se S9 falhar na direção "metadata fica nulo", todo upload passa sem contabilidade nenhuma, em silêncio. A cota falha aberta, não fechada, e não existe job de reconciliação na fase 1 (só no plano B de S10).

**Correção:** somar `is_orphan` também (órfão ocupa byte real até a faxina), trazer a faxina de órfão para a fase 1, e trocar o `return new` do ramo nulo por `raise exception` quando o bucket é `portfolio-media`. Critério: subir 20 MB, apagar todos os projetos, tentar subir 1 KB, esperar erro de cota.

### 5. Takedown não é takedown: a cópia de socorro serve o conteúdo banido por 7 dias e a mídia fica pública para sempre

Duas metades do mesmo problema, e as duas nascem do "sem purge":

- `kSocorro = https://cache/${ns}/${slug}/socorro` com `max-age=604800`. `admin_takedown_portfolio()` só mexe em `portfolio_publications.is_live` e em `member_access.blocked`. Nada invalida a cópia de socorro. Qualquer indisponibilidade do Supabase nos 7 dias seguintes ressuscita a página de phishing com `X-Portfolio-Stale: 1`. E a seção 5.8 crava "410 fica com `no-store` porque revogação não pode ficar presa na borda", o que descreve a resposta nova e ignora a velha já gravada.
- `admin_takedown_portfolio()` não toca em `storage.objects`. O bucket é público por decisão (4.6). As imagens do conteúdo abusivo continuam servidas de infraestrutura nossa, em URL estável, depois do banimento, e o próprio banido pode apagá-las (a policy de delete não exige acesso ativo), o que destrói evidência mas não resolve a exposição.

**Correção:** a chave de socorro entra no `CACHE_NS` versionado por tenant, ou o caminho de socorro consulta `blocked` antes de servir; e `admin_takedown_portfolio` marca toda a mídia do portfólio como órfã e dispara a faxina imediata.

### 6. Reembolso do bump de personalização deixa o cliente com a personalização no ar para sempre

A seção 5.8 escreve isso como comportamento desejado: *"Só a flag daquele bump cai. O portfólio continua no ar. **No próximo publish**, `montar_payload_portfolio` já devolve os defaults"*.

`sync_publicacao_por_acesso` dispara `after insert or update of has_main, blocked`. **`has_custom` não está na lista.** Nada republica. Logo, o roteiro é: comprar o bump por R$ 97, escolher a cor, publicar, pedir reembolso dentro dos 7 dias do CDC, e nunca mais clicar em Publicar. A personalização fica no ar indefinidamente, com o dinheiro devolvido. Como o pagamento é único, não existe cobrança seguinte que corrija isso.

Vale para os dois lados da mesma moeda: cliente que compra o bump depois também não vê a cor aparecer até republicar, o que gera ticket.

**Correção:** acrescentar `has_custom` ao `of` do trigger e, no ramo de mudança de `has_custom`, chamar `publish_portfolio(portfolio_id)` do tenant, que já é idempotente por `content_hash`. Critério: conceder `has_custom`, publicar com `#ff0000`, revogar, e conferir que `get_published_portfolio` devolve payload sem `theme.accent` **sem nenhuma ação do cliente**.

### 7. O rate limit que conserta o achado 8 é um botão de desligar o produto inteiro, acessível a qualquer um

5.4(b): *"Tetos: 5 por hora por e-mail, 20 por hora por IP, **20 por hora global**"*, com a justificativa "o teto global fica abaixo da cota de SMTP de propósito".

- **Lockout global:** 20 chamadas bem sucedidas por hora derrubam o login de toda a base. Turnstile custa centavos numa fazenda de captcha e nada num browser real automatizado. Vinte requisições por hora não é um ataque, é um acidente: uma campanha de e-mail para 100 compradores gera mais que isso em minutos, e o produto se auto nega. O documento na mesma seção manda subir `rate_limit_email_sent` para 100 (5.5, passo 3), ou seja, o teto próprio é 5x mais apertado que o teto que ele deveria proteger.
- **Lockout dirigido:** 5 por hora por e-mail, e o contador é incrementado **antes** de saber se o e-mail tem compra (correto contra o oráculo, mas com este efeito). Cinco requisições por hora contra `joao@empresa.com` mantêm o cliente pagante permanentemente fora da própria conta, sem senha alternativa na v1. Custo do ataque: um cron.

**Correção:** o teto global vira alarme e degradação (fila, atraso), nunca recusa dura; o teto por e-mail sobe e ganha desbloqueio por posse (link enviado ao e-mail, que o atacante não lê); e a senha opcional sai da fase 2 para a fase 1, porque hoje ela é o único caminho que não passa pelo balde.

### 8. `restore_publication()` ressuscita o slug antigo e pode tirar o tenant do ar ou colidir com outro

```sql
insert into public.portfolio_publications
  (portfolio_id, version, slug, payload, ...)
values (p_portfolio_id, v_new, v_old.slug, v_old.payload, ...);
```

`v_old.slug` é o slug **daquela versão**, não o slug atual. Sequência inteiramente possível com as RPCs do plano: cliente publica em `joao`, troca para `joao-silva` (`change_my_slug` atualiza só a linha `is_live`), depois clica em restaurar a versão anterior (botão da fase 2). A linha nova entra `is_live` com `slug = 'joao'`, enquanto `portfolios.slug = 'joao-silva'`.

Resultado: `joao-silva.myportifolio.com.br` passa a responder 404 (nenhuma publicação `is_live` com esse slug), e `joao.myportifolio.com.br`, que está em `portfolio_slug_history` e pode já ter sido dado a outra pessoa, passa a servir este tenant. Se outro tenant já estiver `is_live` em `joao`, o `insert` estoura `publications_slug_no_ar_idx` com erro de constraint sem mensagem útil, o que ao menos falha fechado.

**Correção:** `values (..., (select slug from public.portfolios where id = p_portfolio_id), ...)`. Uma linha. Critério: publicar, trocar slug, restaurar, e conferir que o subdomínio atual continua respondendo 200.

### 9. Recompra depois de reembolso nasce sem prazo de arrependimento (CDC art. 49)

```sql
main_granted_at = case
  when p_product = 'main' and p_granted
    then coalesce(member_access.main_granted_at, now())
  else member_access.main_granted_at end,
```

O `coalesce` preserva a data da **primeira** compra. A intenção está escrita em 4.2 e é correta ("comprar um bump depois nao reabre um prazo que ja venceu"), mas o efeito colateral não foi visto: quem comprou, foi reembolsado, e comprou de novo seis meses depois entra com `main_granted_at` de seis meses atrás. O botão de 5.9 (`now() - main_granted_at < interval '7 days'`) nunca aparece, e o comprador novo perde um direito que a lei dá e que os próprios termos prometem.

**Correção:** `case when p_product = 'main' and p_granted then case when member_access.main_revoked_at is not null and member_access.main_revoked_at > member_access.main_granted_at then now() else coalesce(member_access.main_granted_at, now()) end ... end`. Critério: conceder, revogar, conceder de novo, e conferir que `main_granted_at` avançou.

### 10. Desbloquear ou reconceder republica portfólio que o dono tirou do ar de propósito, inclusive conta em exclusão

`sync_publicacao_por_acesso`, ramo `v_no_ar`:

```sql
update public.portfolio_publications pb set is_live = true
... and pb.version = (select max(x.version) ...) and not pb.is_live
    and pf.first_published_at is not null;
```

Não distingue "saiu do ar porque foi bloqueado" de "saiu do ar porque o dono pediu". Dois caminhos concretos:

- `unpublish_portfolio()` (o dono despublicou de propósito). Qualquer evento posterior que toque `has_main` ou `blocked` (por exemplo `admin_unblock_member`, ou um `member_added` reenviado) coloca o portfólio de volta no ar sem o dono pedir.
- `request_account_deletion()` faz exatamente `update ... set is_live = false`. Dentro da carência de 7 dias, um `admin_unblock_member` ou uma reconcessão traz de volta ao ar o portfólio de alguém que pediu exclusão, o que é violação direta do art. 18 da LGPD que a seção 5.9 diz estar atendendo.

**Correção:** coluna `unlive_reason text` em `portfolio_publications` (`'revogado' | 'dono' | 'exclusao'`) e o ramo de volta casando só `unlive_reason = 'revogado'`.

### 11. `access_throttle` é gravável por qualquer um, com chave arbitrária, sem Turnstile, pelo caminho da prévia

`get_draft_portfolio(p_slug, p_token)` tem `grant execute ... to anon` e a primeira instrução é `consume_access_quota('preview', p_slug, 60)`, que faz `insert into public.access_throttle` com `p_slug` **cru, controlado por quem chama, sem limite de tamanho** (`key text not null`, sem `CHECK`), antes de qualquer validação de formato de slug.

Com a anon key pública: cada requisição com um slug aleatório cria uma linha nova, então o teto de 60 nunca é atingido (o balde é por chave) e cada chamada é uma escrita no Postgres. A faxina roda de hora em hora (`'17 * * * *'`) apagando `bucket < now() - interval '2 hours'`, ou seja, até duas horas de lixo acumulado. É amplificação de escrita num banco de 1 GB, no único componente que a decisão de pagamento único não pode se dar ao luxo de sobrecarregar, e não passa por Turnstile porque a Edge Function não está no caminho.

**Correção:** `get_draft_portfolio` valida `slug_dns_valido(p_slug)` e a existência do slug **antes** de consumir cota, chaveia o balde por `portfolio_id` (não por texto de entrada), e `access_throttle.key` ganha `check (char_length(key) <= 200)`.

### 12. Pagamento único mais token de webhook compartilhado: acesso vitalício grátis, indetectável, sem reconciliação

Nada no plano valida que um `member_added` corresponde a um pagamento real. A autenticação do webhook é um segredo compartilhado (`x-hubla-token` com `timingSafeEqual`), o corpo é confiado inteiro (`event.user.email`, `productIds`), e não há consulta à API da Hubla para confirmar o pedido.

Sob assinatura isso se autocorrigia: a fraude aparecia na renovação seguinte que nunca chegava. Sob **pagamento único vitalício**, um `POST` forjado (token vazado em log, em variável de ambiente de outro deploy, num screenshot) concede acesso permanente e **nada nunca reconcilia**. As duas telas de vigilância do plano (`compras_incompletas` e eventos travados) olham só o sentido oposto, "tem flag de bump e não tem `has_main`". O único controle mencionado está numa célula de tabela de 5.10: "conferência diária de vendas contra `select count(*) from member_access where has_main`", que é uma soma, não uma conciliação linha a linha, e que ninguém vai fazer todo dia.

Agrava: `member_access.source` tem `check (source in ('hubla','manual','cortesia'))` mas `grant_or_revoke_member_access` escreve `'hubla'` sempre e nenhuma outra função escreve na tabela, então a coluna nunca distingue nada. É a mesma doença que o achado 10 diagnosticou (coluna que finge política).

**Correção:** job semanal comparando `member_access` com o extrato da Hubla e alertando toda linha `has_main` sem venda correspondente; `HUBLA_WEBHOOK_TOKEN` com rotação programada; e `source` escrito de verdade por cada caminho.

### 13. O bump de facilitação dá a um humano acesso de superusuário permanente a **todos** os tenants, sem escopo, sem prazo e sem registro

O plano nunca define um acesso de operador. O que existe é `is_admin()`, e ele:

- passa pela policy `"admin gerencia portfolios" for all to authenticated using (public.is_admin())`, que vale para **todo portfólio**, não só os que compraram `has_setup`;
- é a primeira linha de `portfolios_guarda_colunas()` (`if public.is_admin() ... return new`), então o operador escreve inclusive nas colunas do bump de personalização de quem não comprou o bump;
- não expira quando o pedido sai da fila (`admin_set_setup_status(email, 'entregue')` não revoga nada);
- não deixa rastro: `moderation_log` é um dos quatro `BURACO:` declarados, e `setup_requests.operator_notes` é campo livre, não auditoria;
- e o comprador nunca é informado nem consente que outra pessoa vai editar e publicar em nome dele, embora `publish_portfolio` aceite `is_admin()` como autorização.

Some a isso a chave do reino: `admin_users` tem uma linha (`heliomonteiroprofissional@gmail.com`) e a autenticação do produto é **OTP de 6 dígitos por e-mail, sem senha e sem segundo fator** (9.6). Comprometer uma caixa de Gmail é comprometer todos os portfólios pagos, todos os dados pessoais de terceiros (`portfolio_projects.client`) e a capacidade de publicar qualquer coisa em qualquer subdomínio do produto.

**Correção mínima:** `setup_grants (admin_email, portfolio_id, granted_at, expires_at)` com `owns_portfolio()` aceitando concessão viva em vez de `is_admin()` global para o caminho de facilitação; `moderation_log` deixando de ser buraco e registrando todo `update` de admin em tabela de cliente; consentimento explícito do comprador de `has_setup` gravado junto do material; e MFA obrigatório para e-mail em `admin_users`.

### 14. Vincular um e-mail de login novo não tira o acesso do login antigo

`current_purchase_email()` e `owns_portfolio()` casam por **`owner_id = auth.uid()` OU `owner_email = current_purchase_email()`**. `claim_portfolio_on_signup` grava `owner_id` no primeiro login. O fluxo de alias de 5.6 insere em `access_aliases` e cria a conta de B, mas **não mexe em `portfolios.owner_id`**.

Resultado: depois de vincular B, o usuário A original continua com posse total do portfólio pelo ramo `owner_id`, para sempre, e não existe RPC nenhuma que limpe `owner_id`. Os casos reais são banais: conta de e-mail de emprego antigo, sócio que saiu, ex-cônjuge, notebook compartilhado. O plano ainda manda rotacionar o token de prévia nessa situação (6.9), o que mostra que a preocupação existia, mas o vetor forte ficou aberto.

**Correção:** `link_login_email(A, B)` faz, na mesma transação, `update public.portfolios set owner_id = null where owner_email = A` (a próxima entrada de B reivindica pelo trigger), e o critério de 5.6 ganha um passo: logar com A depois do vínculo e conferir que `select * from portfolios` devolve zero linhas.

### 15. O confinamento do achado 17 é contornável com `..` porque `media_path_valido()` aceita ponto

```sql
select p_path is null or p_path ~ '^[A-Za-z0-9][A-Za-z0-9._/-]{0,240}$';
```

`<meu-id>/../<id-do-outro>/foto-aabbccdd.webp` satisfaz a regex **e** satisfaz `image_path like portfolio_id::text || '/%'`. O `CHECK` passa. A policy de storage também passaria, porque `(storage.foldername(name))[1]` continua sendo o meu uuid. O objeto no bucket é uma chave literal distinta, mas a **URL pública normaliza `..` no cliente e nos proxies**, então a `og:image` e o `<img>` do meu portfólio resolvem para o arquivo do outro tenant. É exatamente o dano que o achado 17 descreveu (imagem quebrada quando o dono apagar, `og:image` de terceiro).

**Correção:** `and p_path !~ '(^|/)\.\.?(/|$)'` na função, e `safeImageUrl` recusando `..` também. Critério: `update portfolio_projects set image_path = '<meu-id>/../<outro-id>/x-aabbccdd.webp'` tem que violar `projects_image_ok`.

### 16. Subdomínio como vetor de phishing: a defesa é 100% reativa e depende de o dono olhar

A decisão 3 põe conteúdo de terceiro em `qualquercoisa.myportifolio.com.br`, e um subdomínio herda a credibilidade do domínio pai. O que o plano tem: R8 (domínio dedicado, takedown, termos, "se escalar: revisão manual do primeiro publish"), a lista de `reserved_slugs`, e `admin_takedown_portfolio`.

O que não tem, e é o que o vetor exige:

- **Nenhuma lista de termos sensíveis no `slug_available()`.** `nubank-verificacao`, `itau-seguranca`, `gov-br-inss`, `mercadopago-suporte`, `bradesco-token` são todos rótulos DNS válidos, não reservados, e a compra é por impulso e automática. O `reserved_slugs` protege infraestrutura nossa e não protege marca de terceiro nenhuma.
- **Nenhuma revisão antes do primeiro publish.** A revisão manual está listada como "se escalar", ou seja, depois do dano.
- **Nenhuma detecção.** O sinal previsto é o dono perceber. Não há alerta de publicação nova, não há checagem contra Safe Browsing, não há e-mail de "novo tenant publicou".
- E, quando alguém finalmente banir, os achados novos 3 e 5 mostram que o banimento entrega 404 com CTA de compra em vez de 410, e a cópia de socorro ainda pode servir a página por 7 dias.

O custo assimétrico está escrito no próprio R8: o domínio pai queimado leva junto o apex, que é a vitrine, o checkout e o portfólio do Helio, e leva todos os clientes pagantes vitalícios de uma vez, contra receita zero para reconstruir.

**Correção mínima e barata:** denylist de substring no `slug_available()` (nomes de banco, de meio de pagamento, `gov`, `receita`, `correios`, `verifica`, `seguranca`, `suporte`, `atualiz`), primeiro publish de cada conta entrando numa fila de aprovação de um clique (o mesmo painel de 5.7 já existe), e alerta ao dono a cada `first_published_at` novo.

### 17. `get_published_portfolio` é ilimitado, anônimo e é o custo eterno do modelo

`grant execute on function public.get_published_portfolio(text) to anon, authenticated;` sem nenhum rate limit, contra a anon key que é pública por construção (o editor precisa dela no browser).

A seção 9.2 cravou a viabilidade do produto em "todo custo variável por visita tem que ser cortado até virar zero", e a 2 admite que o hit ratio de cache é ruim por construção. Nesse contexto, deixar a RPC que o cache existe para evitar aberta e sem teto é entregar a alavanca de custo ao público: um laço de `curl` contra `/rest/v1/rpc/get_published_portfolio` roda o Postgres em `sa-east-1` sem passar pela borda, sem contar em nenhum balde, e sem nenhum alarme previsto.

**Correção:** o Worker passa a chamar a RPC com uma chave própria (não a anon key), ou a RPC ganha `consume_access_quota('read', slug, N)` com o balde chaveado por slug validado (ver achado 11), ou os dois.

### 18. O contador de visitas da fase 2 contradiz o argumento de custo da fase 1

Item da fase 2: "contador de visitas por tenant **incrementado no miss de cache**", com critério "sobe exatamente 1 num miss e não sobe num hit".

A seção 2 define o miss como "o caso mediano" e vende o desenho inteiro com "o caminho de miss ser barato: uma RPC, uma linha, sem join". O contador transforma cada miss em leitura **mais escrita** no Postgres, e escrita concorrente na mesma linha por tenant popular serializa. É dobrar o custo variável do caso mediano para produzir a métrica que existe justamente porque o pagamento único não gera receita recorrente.

**Correção:** contar na borda com Cloudflare Web Analytics (gratuito, zero custo por visita, já citado na crítica original), ou acumular em memória do isolate e descarregar por `ctx.waitUntil` em lote a cada N ou a cada X segundos, nunca uma escrita por visita.

### 19. A tabela de preço de 9.2 ignora o custo que o próprio plano nomeou em 9.2 páginas antes

A tabela projeta custo fixo por cliente até 200 clientes ("R$ 8 por ano, é ruído") contando só Supabase Pro. A seção 2, plano (c3), registra: Cloudflare for SaaS "faixa gratuita de 100 hostnames e cobrança por hostname depois, ou seja, a partir do cliente 101 cada comprador adiciona custo mensal para sempre contra um pagamento único". Se o spike S1 falhar (e a evidência colhida na conta aponta que vai), a linha de 200 clientes da tabela está errada pelo dobro ou mais, e é exatamente a linha que sustenta a conclusão "o modelo só fecha com volume".

Faltam também na conta: Workers Paid (citado como degrau em R2 e R9), o registro.br, o Resend acima do gratuito e o egress do Supabase (que o próprio R4 diz que o produto paga por visita, para sempre).

**Correção:** a tabela de 9.2 ganha duas colunas, "S1 passou" e "S1 caiu no plano B 2", e a decisão de preço é assinada sabendo das duas.

### 20. `has_setup` revogado deixa o pedido na fila e o serviço é entregue mesmo assim

`grant_or_revoke_member_access(email,'setup',false)` mexe só em `member_access.has_setup`. `setup_requests` não tem trigger, não tem `status = 'cancelado'` automático, e a tela `/app/admin/fila` ordena por `opened_at` sem olhar a flag. Reembolso do bump de R$ 497 antes da entrega deixa a linha `em_producao` no painel, e o dono entrega trabalho humano já estornado.

**Correção:** trigger em `member_access` que, ao cair `has_setup`, faz `update setup_requests set status = 'cancelado'` quando ainda não estava `entregue`, e a fila mostra a diferença.

### 21. `em_operacao_confiavel()` é uma porta de fuga do guarda de colunas, e a chave dela é um GUC

`portfolios_guarda_colunas()` começa com `if public.is_admin() or public.em_operacao_confiavel() then return new; end if;`, e a marca é `current_setting('app.escrita_confiavel', true) = 'on'`.

Hoje não é explorável pelo PostgREST (não há função exposta em `public` que chame `set_config` com nome controlado, e as quatro RPCs que a usam fazem `set_config(..., true)`, escopo de transação, com PostgREST usando uma transação por requisição). Mas é uma condição frágil, não uma garantia: qualquer RPC futura que aceite nome de GUC, que esqueça o `'off'`, ou qualquer mudança de exposição de schema, converte um comentário de segunda camada em bypass de `owner_email`, `slug` e `preview_token_hash`. O documento reconhece isso ("o controle PRIMARIO continua sendo a ausencia de grant"), o que está correto, mas não deixa teste.

**Correção:** acrescentar ao critério 1 de 4.10 uma tentativa explícita de ligar a marca pelo caminho do cliente, e uma regra de revisão de PR proibindo `set_config` com nome vindo de parâmetro.

### 22. Purga de conta pseudonimiza o e-mail e deixa a pessoa inteira em `hubla_events.payload`

5.9: `hubla_events`, `refund_requests` e `member_access` "ficam com o e-mail pseudonimizado depois da purga", e isso vai escrito na política de privacidade.

`hubla_events` tem `payload jsonb not null` guardando o evento cru da Hubla, que traz nome, e-mail, e conforme o gateway telefone, documento e endereço. Pseudonimizar a coluna `email` e deixar o `payload` intacto não pseudonimiza nada, e a política de privacidade passa a afirmar algo falso, que é pior do que não afirmar. Vale para `refund_requests.reason` (texto livre do titular) também.

**Correção:** a purga aplica `jsonb_set` removendo os campos de identificação do `payload` e mantém só o que é fiscal (id do pedido, valor, produto, data), ou o `payload` cru tem TTL próprio.

### 23. A retenção de slug de 90 dias é, na prática, retenção eterna

Escrito em duas seções ("o subdomínio não é liberado na hora, fica retido por 90 dias antes de voltar ao namespace") e marcado como `BURACO:` nas duas. O que quero acrescentar é a consequência de dinheiro que o buraco esconde: `slug_available()` consulta `portfolios`, a linha do reembolsado permanece com o `slug`, e portanto **todo reembolso, chargeback e banimento encolhe o namespace para sempre**. Num produto de nome curto vendido por impulso, os slugs bons (`joao`, `design`, `fotografo`) são o estoque, e o estoque só diminui. É o achado 16 voltando pela porta dos fundos, com o agravante de ser causado por quem pediu dinheiro de volta.

### 24. Residual do achado 12: o payload ainda congela uma URL absoluta

`'video', case when o.youtube_id is not null then 'https://youtu.be/' || o.youtube_id end`. É a mesma classe que o achado 12 mandou tirar do snapshot. Se um dia a decisão for embutir por `youtube-nocookie` (o parser de 6.6 já aceita o host), ou anexar parâmetro de privacidade, é `republish_all()` sobre a base inteira por uma string. O banco já guarda o `youtube_id` de 11 caracteres, que é o dado; a URL é apresentação e pertence ao Worker.

---

## O que eu verificaria primeiro, se fosse um item só

Os achados 1 (bypass do `/auth/v1/otp`), 2 (colisão de chave de cache) e 3 (410 impossível) são os três que estão **escritos como resolvidos** e não estão. Os três têm teste falhável de menos de dez minutos cada, e os três quebram, respectivamente, o login de todo mundo, o isolamento entre clientes e a única saída que o pagamento vitalício permite.