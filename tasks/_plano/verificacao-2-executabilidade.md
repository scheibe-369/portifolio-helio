Verificação de executabilidade de `D:/Projetos-vibeocding/eu/portifolio-helio/tasks/plano-produto.md` (5.011 linhas). Nota de contexto: `tasks/_plano/plano-v1-obsoleto.md` **não existe mais** (o próprio documento diz "apagado" na linha 6), então li decisoes-travadas.md, critica-adversarial.md, o documento inteiro e o código real.

---

## 1. Critérios de pronto que não conseguem falhar

**Gravíssimos (não testam o que dizem testar):**

1. **`plano-produto.md:4249`, fase 0:** "Deploy em produção e o site está visualmente igual, com o rodapé novo presente." É "ficou bom" com outro nome. Não tem oráculo, não tem procedimento, não tem viewport, não tem tolerância. Quem executa não consegue reprovar. O `dom-diff` das linhas 4221-4241 já cobre estrutura; ou este item vira comparação de screenshot em 3 larguras com tolerância declarada em porcentagem de pixel, ou sai.

2. **`plano-produto.md:560-565`, orçamento de CPU:** "O render inteiro roda dentro do limite de CPU do Worker, e o número que sustenta essa afirmação sai de `scripts/medir-render.mjs`". **Não existe limite escrito em lugar nenhum do documento.** Sem o número do teto, nenhuma mediana e nenhum p95 reprova. Pior: `medir-render.mjs` mede em Node com `process.hrtime.bigint()` (linha 562), que não é o isolate do Worker, então o número medido não é comparável ao limite que ele deveria provar. Falta o teto em ms e a medição no runtime certo.

3. **`plano-produto.md:3882`, critério 1 do editor:** `grep -rE "input|textarea|select|label" src/styles/global.css` "continua sem casar seletor de formulário". **Rodei contra o repo real: já casa hoje.** `src/styles/global.css:116` tem `user-select: none;` e `:244` tem o comentário `(só em títulos/labels)`. Este critério reprova no dia zero independentemente de o CSS do editor ter vazado ou não, ou seja, ele nunca mede a coisa. A regex precisa ancorar em seletor, não em substring.

4. **`plano-produto.md:4484`, fase 4:** "`republish_all()` roda sobre todos os tenants e o `content_hash` de cada um é recalculado **sem erro**". "Sem erro" não é valor esperado. Não diz quantos hashes devem mudar, quantos devem permanecer, nem o que fazer com divergência. Compare: o critério 7 de 4.10 (linha 2769) faz certo, exige `version = 3` e `count = 1`.

5. **`plano-produto.md:4459`, fase 3:** "Um portfólio de cliente indexado no Search Console." Depende de terceiro, não tem prazo, não é executável sob demanda por outra pessoa. Não falha nunca, fica pendente para sempre. No mesmo bloco, linha 4460: "`curl` de um portfólio com EN ligado **mostra** o `hreflang`" sem string esperada.

**Médios:**

6. **`plano-produto.md:96-98`:** "O literal do domínio aparece em exatamente dois lugares" com o critério `grep -rn "myportifolio" src/ worker/ supabase/`. Os dois lugares declarados são `wrangler.jsonc` e `app_settings.apex_host`, e **`wrangler.jsonc` não está nos caminhos varridos** (é raiz). Além disso o próprio bloco de config das linhas 352-357 traz o literal **cinco vezes** (`vars`, três `pattern`, `zone_name`). O critério não observa o que promete limitar. Declare a contagem esperada por arquivo, inclusive raiz.

7. **`plano-produto.md:4349`, fase 1:** "Colar a URL no WhatsApp mostra a foto e o nome do comprador." Manual, sem procedimento, e não repetível: o WhatsApp cacheia preview por URL, então a segunda execução na mesma URL não prova nada. Amarre num slug nunca compartilhado antes, e deixe o portão automático no `head-snapshot.mjs` (4350-4359), que está bem escrito.

8. **`plano-produto.md:4245`:** `grep -rn "^let \|^var " src/app/i18n.js`. Âncora em coluna 0. `  let lang` indentado, ou `export let lang`, passa. Confirmei que hoje o `let lang` está em coluna 0 (`src/app/i18n.js:6`), então funciona por acidente, não por desenho.

9. **`plano-produto.md:3892`, critério 5 do editor:** "objeto `image/webp` abaixo de 90 KB" sem dizer de qual destino. 6.5 item 7 (linha 3595) define três orçamentos diferentes: hero 120 KB, projeto 90 KB, avatar 25 KB.

**Está certo:** o critério da fase 2 com pessoa real (4429-4431) é falsificável de verdade ("falha se ela perguntar qualquer coisa"), o de 4.9 (2728-2730), os cinco passos do achado 5 (2930-2943), os quatro de 6.9 (3819-3824) e os onze de 4.10 (2739-2787) são executáveis e reprováveis. Esse é o padrão que os cinco de cima deveriam seguir.

---

## 2. Afirmações de plataforma sem base nem marcação

**Bloqueantes:**

1. **Permissão de DDL sobre `storage.objects`.** `plano-produto.md:1909` e `:1923` criam `create trigger storage_objects_registra_midia after insert or update of metadata on storage.objects` e o de delete. `storage.objects` pertence a `supabase_storage_admin`, e `CREATE TRIGGER` exige privilégio na tabela. **S10 cobre só o comportamento** (exceção em trigger desfaz o upload), **não cobre se a migration consegue criar o trigger.** Se não conseguir, o achado 7 inteiro (fase 1, item 7, linha 4314) morre e o plano B `media-upload` deixa de ser plano B e vira o caminho. Precisa virar S14, verificável em uma linha no projeto novo: `select tgname from pg_trigger where tgrelid = 'storage.objects'::regclass`.

2. **Cloudflare for SaaS, "faixa gratuita de 100 hostnames e cobrança por hostname depois"** (`:271-273` e `:4787`). Afirmado como fato, não está na tabela de verificados nem na de suposições. É o plano B nomeado de S1 e entra na conta de preço da seção 9.2 sob pagamento único, onde cada hostname acima de 100 é custo mensal eterno contra receita única. Preço de terceiro citado de memória em decisão que trava modelo de negócio.

3. **`create extension if not exists pg_cron;` mais `grant usage on schema cron to postgres;`** (`:839-840`). Disponibilidade da extensão e permissão de criá-la por migration não são marcadas. E há contradição interna: S5 (`:64`) e R5 (`:4855`) dizem que o keep-alive de verdade vira **Cron Trigger de Worker**, mas a migration `0001` continua agendando o `cron.schedule('keep-supabase-alive-job'...)` (`:841`), **nenhuma fase entrega o Cron Trigger** e o `wrangler.jsonc` das linhas 341-358 não tem bloco `triggers`.

**Médios:**

4. **`wrangler rollback`, versões e deploy gradual** (`:247` e `:4909`), afirmados como fato. S4 cobre só a URL de preview por versão. R9 depende inteiro disso.

5. **Restrições da Cache API** (`:445-447`): "`put` exige `GET`, recusa `Set-Cookie`, e recusa `206` e `304`". Afirmado como fato fora da tabela de verificados, e o desenho de `worker/lib/cache.js` depende dele.

6. **`/cdn-cgi/*` "nunca chega ao Worker"** (`:335-337`). A defesa desse namespace é justificada só por essa afirmação.

7. **Semântica de precedência de `run_worker_first: false`** (`:361-365`): "um arquivo estático que casar com o caminho é servido sem o Worker rodar". É a linchpin da regra "dist/ nunca contém `.html`" e do critério 2 da seção 2 (`:587`). A tabela de verificados (`:45`) confirma que os knobs existem, não a ordem de precedência.

8. **`create trigger claim_portfolio after insert on auth.users`** (`:2538`) e as cinco `create policy ... on storage.objects` (`:2616-2644`). São padrões documentados da Supabase, mas nenhum está marcado, e estão na mesma classe de DDL cross-schema do item 1.

9. **Thumb do YouTube:** "`hqdefault.jpg` de ID inexistente devolve um placeholder cinza de 120x90, não 404" (`:3669`). Afirmado; já vem com a checagem barata ao lado, então é o menos grave.

**Está certo:** S1 a S13 estão bem construídas, cada uma com forma de verificar, momento e plano B. O Supabase Pro em 25 dólares vem marcado como "ordem de grandeza; conferir no ato" (`:4624`).

---

## 3. Ordem das fases

**Quebras reais:**

1. **Fase 1 item 8 entrega uma coisa cuja tabela não existe.** `:4322` manda entregar "Caixa de consentimento no primeiro login, gravando versão dos termos, data e IP" e no mesmo parêntese aponta para o `BURACO:` de 4.7 (`:2663`), que diz que nenhuma seção define onde isso é gravado. Dos quatro buracos listados em `:5003-5011`, **só o 1 tem fase** (fase 4, `:4478`). Os buracos 2 (`moderation_log`), 3 (`cancel_account_deletion`) e 4 (consentimento) não caem em fase nenhuma, e o 4 é pré-requisito de um item obrigatório da fase 1.

2. **A reestruturação de build não tem dono.** `app.html` como segunda entrada do Vite, `vite.config.js` com 2 entradas e `scripts/preparar-shell.mjs` aparecem só na árvore (`:3937-3939`, `:3974`) e no glossário (`:4963`). **Nenhum entregável de fase 0 ou fase 1 os cria.** Mas a fase 1 item 3 (`:4287`) exige `worker/shell.gen.js` e o critério 2 da seção 2 (`:587`) exige `find dist -name '*.html' | wc -l == 0`, que é impossível sem eles. Mesmo problema com `scripts/gerar-reservados.mjs` (`:401`, `:3975`): `worker/lib/host.js:300` já consome `RESERVADOS` e nenhum item de fase gera o arquivo.

3. **`head-snapshot.mjs --capture` é critério da fase 1 mas tem que rodar antes da fase 0 terminar.** `:4351` diz "grava `snapshot/head-helio.json` **hoje, antes da migração**", contra o site que está no ar. A fase 0 termina com "deploy em produção" (`:4249`) e não tem, na sua lista de 12 entregáveis, nenhuma menção ao `head-snapshot.mjs`. Quem executar a fase 0 ao pé da letra nunca captura a baseline. O `--capture` tem que virar item 0 da fase 0, ao lado de `snapshot.mjs`.

4. **Fase 0 item 11 só fecha na fase 1.** `:4214`: "`_headers` corrigido (dívida D3), **com a verificação da suposição S11 no primeiro deploy do Worker**". O Worker nasce na fase 1 item 3. Um item da fase 0 com verificação na fase 1 viola a regra da própria linha 4102 ("Nenhuma fase começa antes da anterior passar no critério de pronto").

5. **Contador de visitas retrofit no caminho quente.** Fase 2 (`:4408`) manda incrementar contador por tenant "no miss de cache". O caminho de miss da fase 1 foi desenhado como "uma RPC, uma linha, sem join" (`:449-452`) e a seção 9.2 (`:4639`) diz que todo custo variável por visita tem que ser cortado até zero. Acrescentar escrita no Postgres por miss não é fora de ordem, mas é retrofit não dimensionado sobre a decisão de arquitetura da fase 1, e a fase 2 não traz desenho nenhum para ele (batch? `waitUntil`? tabela própria?).

**Está certo:** as duas dependências duras estão declaradas e bem colocadas. O spike 1 condiciona `publish_portfolio` a ganhar passo assíncrono de provisionamento e o documento diz explicitamente que isso vira entregável da fase 1 e não da 4 (`:4137-4144`). O spike 2 condiciona `cache.js` (`:4293`). A sequência DNS → Resend → SMTP → migration → checkout (`:3135-3141`) é sequencial de verdade.

---

## 4. Um agente com só este documento e o repo consegue começar a fase 0?

**Não.** O que ele teria que perguntar, do mais bloqueante para o menos:

1. **Para onde aponta o registro `*`?** `:4125`, passo 1 do spike 1: "Criar registro DNS `*` do tipo `A` (ou `CNAME`) **proxiado**". Não existe origem, não existe IP, não existe alvo de CNAME no documento. O agente trava no primeiro comando do primeiro spike.
2. **Credenciais e `account_id` da Cloudflare.** O documento dá o zone id (`:48`) e diz qual token escreve DNS e qual não (`:50`), mas não dá os valores nem diz onde eles moram, e o `wrangler.jsonc` das linhas 341-358 **não tem `account_id`**, que `wrangler deploy` exige para publicar o Worker de descarte do spike 2.
3. **A troca de NS já aconteceu?** Tudo na fase 0 é gated por ação manual do dono (`:4112-4115`) e não existe comando de verificação no documento. Falta o portão executável: `dig NS myportifolio.com.br +short` devolvendo `kipp` e `serenity`, mais status da zona igual a `active`.
4. **Nome do Worker de descarte e se ele pode ser publicado na zona de produção.** `:4151` exige que o spike 2 rode "na zona nova (não em `workers.dev`)", o que significa criar rota em `myportifolio.com.br` para um Worker descartável antes do Worker de produto existir. Isso é decisão do dono, não do agente.
5. **Como o site é publicado hoje.** O critério de saída da fase 0 é "Deploy em produção" (`:4249`) e o documento nunca diz qual é o pipeline atual (Pages? qual projeto? qual branch?). Somado à regra global de nunca commitar ou dar push sem aprovação explícita, o agente não consegue executar o próprio critério de saída.
6. **O contrato de `ctx`.** O item 3 da fase 0 (`:4192-4195`) é "Refatoração para `ctx`", e `renderPortfolioPage(ctx)` aparece em `:493`, `:3503` e `:4001`, mas **nenhuma seção define os campos de `ctx`**. Os 8 componentes dá para inferir da árvore (os marcados `[iso] MODIFICADO`), o contrato não.
7. **`linkedom` ou `node-html-parser`?** `:4223` deixa a escolha aberta e `:4246` exige `npm ls --prod` listando só `lucide`. Confirmei o `package.json`: hoje é exatamente `lucide` em `dependencies` e `vite` mais `@tailwindcss/vite` em dev. Basta uma linha dizendo "entra em devDependencies".
8. **Quinto buraco não listado:** `PRODUCT_FLAG_MAP` está vazio com o comentário "preencher com os ids reais do painel Hubla ANTES do primeiro deploy" (`:2832`). É bloqueio da fase 1, e não está na lista de buracos abertos de `:5003-5011`, onde deveria estar junto com Turnstile site key, conta Resend e teto de estoque do SKU de facilitação.

---

## 5. Travessões

**Zero.** Varri o arquivo inteiro com dez variantes (U+2010, U+2011, U+2012, U+2013, U+2014, U+2015, U+2E3A, U+2E3B, U+2212, U+FF0D): `total 0`. `grep -n "—\|–" tasks/plano-produto.md` também volta vazio. Nada a corrigir. Confirmei que o arquivo está em UTF-8 legível (`grep -c "ção"` devolve 302), então o resultado não é artefato de encoding.

---

## 6. Regras não negociáveis do dono

**Sumiu, e é a mais grave:**

1. **`loading="lazy" decoding="async"` abaixo da dobra, com hero eager e `fetchpriority="high"`.** A única ocorrência de lazy no documento inteiro é o **iframe** do YouTube (`:3666-3667`). Nenhuma linha governa `<img>`. Isso importa porque o produto passa a gerar markup novo com imagem de terceiro: `<head>` por tenant com `preload` do hero (`:4573`), avatar do painel de perfil, imagem de card de projeto, imagem do modal, canvas do editor. Estado do repo hoje (confirmado): `src/modules/profile/components/heroImage.js:9` tem `fetchpriority="high" decoding="async"` sem lazy, correto; `src/modules/projects/components/projectsSection.js:24` tem `loading="lazy" decoding="async"`, correto; **`src/modules/profile/components/profilePanel.js:36` (avatar) e `projectModal.js:64` não têm atributo nenhum**. O `dom-diff` da fase 0 protege por acidente o que já existe (remover um atributo vira diff fora da allowlist), mas nada governa o markup novo. Falta uma linha nas regras de fronteira de `:4089-4095` e um critério na fase 1: no `curl` de um tenant publicado, contagem de `loading="lazy"` igual ao número de cards e **zero** `loading="lazy"` no `<img>` do hero.

2. **Feature-Sliced / `modular-arch` não aparece por nome em lugar nenhum.** `grep` de "Feature-Sliced", "Feature Sliced" e "modular-arch": zero ocorrências. Em substância a seção 7 é FSD, com árvore por feature (`:3998-4050`) e, melhor que a regra, uma guarda automática (`scripts/import-graph.mjs`, `:4063-4087`). Mas a guarda mede o eixo `worker`/`iso`/`browser`, não o eixo feature: nada impede lógica de `src/modules/editor/api/portfolioApi.js` migrar para `src/app/` ou para um `lib/` global sem que script nenhum reclame. Falta nomear a regra na seção 7 e acrescentar a verificação de "nenhum arquivo novo em `src/app/` que não seja composição ou boot".

**Está lá, e com critério executável:**

3. **Crédito "Desenvolvida por Method Growth Hub":** dívida D4 declarada (`:54`), item 11 do que o comprador recebe (`:159`), entregável 5 da fase 0 (`:4200`), entrada 1 da allowlist do `dom-diff` (`:4234`), correção completa com `target="_blank" rel="noopener"` (`:4552-4557`) e verificação por `curl ... | grep -c "methodgrowthhub.com.br"` maior que zero no apex **e** num subdomínio de tenant (`:4559`). É o item mais bem coberto do documento.

4. **WebP:** seção 6.5 inteira (`:3568-3604`), com a guarda de `canvas.toBlob` cair em PNG em silêncio (`:3591-3594`), e marcado como "Fica, é regra do dono" na tabela de cortes (`:3472`).

5. **Vídeo sempre por embed externo:** o banco guarda **só** `youtube_id` de 11 caracteres e nunca a URL (`:3660`, `:805-806`), então auto-hospedar é impossível por construção. A regra geral "nunca hospedar arquivo de vídeo" não está escrita, mas o schema a torna inalcançável.