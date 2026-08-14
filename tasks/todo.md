# Todo

## MyPortifolio: transformar o portfólio em produto vendido (2026-08-11 em diante)

O portfólio do Helio deixa de ser só o site dele e vira a base de um produto: o comprador
paga, cria login por código no e-mail, e edita o próprio portfólio em
`<slug>.myportifolio.com.br`. O plano completo está em [`plano-produto.md`](plano-produto.md).

### Etapa de planejamento

- [x] Levantar o estado real do repo, da conta Cloudflare e do Supabase
- [x] Achar a referência interna de auth e pagamento (AI Block, webhook da Hubla)
- [x] Desenhar 3 arquiteturas de publicação independentes e julgá-las
- [x] Especialistas em paralelo: banco, editor, billing e auth, migração
- [x] Crítica adversarial do plano v1 (30 achados)
- [x] Travar as 4 decisões de produto com o dono
- [x] Reescrever o plano sob as decisões travadas
- [x] Dois verificadores adversariais sobre o plano v2 (24 + 20 achados)
- [x] Aplicar as correções de dinheiro e isolamento (13 correções)
- [x] Aplicar as correções de acesso e mídia
- [x] Aplicar as correções de executabilidade
- [x] Fecho: conferir que cada achado entrou e que nada se contradiz
- [x] Incorporar a feature de experiências (com certificado) ao plano

### Já no ar (código, não plano)

- [x] Seção "Experiência" no portfólio do Helio, depois dos projetos, PT e EN
- [x] 5 logos normalizadas para WebP com a arte ocupando 80% do quadrado
- [x] Portfólio publicado em `myportifolio.com.br` e `www`, com o domínio antigo
      `helioportifolio.methodgrowthhub.com.br` continuando no ar

### Infra (bloqueios que não são código)

- [x] Registrar `myportifolio.com.br` e apontar para a Cloudflare
- [x] Trocar NS no registro.br e esperar a zona ativar
- [x] **Spike 1: TLS em subdomínio curinga.** APROVADO, ver abaixo
- [x] **Spike 2: cache de Worker.** APROVADO e revelador: sem Cache API a borda NÃO
      guarda resposta de Worker (nonce mudou nas 3 chamadas). Com ela, hit com o mesmo
      nonce. `cache.delete` também funciona (suposição S15). Ver `_plano/medicoes.md`

### Fase 0: fundação (concluída)

- [x] Ferramentas de verificação, cada uma testada nos dois sentidos (passar e reprovar)
- [x] As três baselines capturadas e commitadas antes de qualquer refatoração
- [x] Refatoração para `ctx`: 9 componentes recebem dado por parâmetro, `t`/`tui`/`px`/`ex`
      puros, estado de idioma isolado em `langState.js` (dívida D1)
- [x] `sanitize.js` aplicado em todo `href`, `src`, `style` e texto livre
- [x] Rodapé com o crédito Method Growth Hub (dívida D4)
- [x] Hero: classe Tailwind com valor arbitrário virou `style` inline; avatar ganhou lazy
- [x] `videoId` de 11 caracteres no lugar da URL do YouTube
- [x] 4 imagens órfãs removidas (67 KB)
- [x] `_headers` corrigido (dívida D3): immutable só onde há hash de conteúdo
- [x] `medir-render.mjs`: mediana 0,073 ms, muito abaixo do teto de 6 ms
- [x] **Resend: FEITO e provado.** Conta separada (`heliomonteiroprofissional@gmail.com`),
      domínio `mail.myportifolio.com.br` verificado em São Paulo, DKIM e SPF no subdomínio
      de envio, chave com permissão só de envio guardada em `.env.local`. Dois e-mails
      reais entregues no Gmail. O SPF e o DMARC do apex **não** foram tocados, e isso está
      certo: o envio sai do subdomínio e o DKIM alinha por domínio organizacional
- [ ] Confirmar que o e-mail de teste caiu na **caixa de entrada** e não no spam. É a
      única parte que eu não consigo verificar daqui
- [x] **Supabase: resolvido compartilhando o projeto do AI Block** (decisão do dono, o
      limite de 2 projetos free é por pessoa e já estava esgotado). Schema `myportifolio`
      criado e isolado. Motivo do isolamento, medido e não suposto: `public` já tem
      `grant_or_revoke_member_access(text,text,boolean)`, `is_admin()` e `set_updated_at()`
      com assinatura **idêntica** às do plano, e `create or replace` substituiria em
      silêncio as de um produto com clientes pagantes
- [x] Reescrever o SQL das migrations 0001 a 0007 de `public.` para `myportifolio.`, com
      as três exceções (`auth`, `storage`, `cron`) tratadas caso a caso. Aplicadas de 0001
      a 0008, validadas antes dentro de `begin; ... rollback;`
- [ ] Migrar para projeto Supabase próprio antes de escalar. Enquanto dividir, um erro de
      migration derruba o AI Block junto
- [x] Criar os SKUs na Hubla. Links prontos: principal (com o order bump dentro)
      `pay.hub.la/U9cuWxeCOsTvt4urY5vS`, facilitação `pay.hub.la/q7IxDLHWM6OI8EBmrreo`
- [ ] Pegar os `productId` reais no painel da Hubla para o `PRODUCT_FLAG_MAP`. **Não é o
      slug da URL de pagamento**, é o id que vem no corpo do evento. Confundir os dois faz
      todo evento chegar sem casar flag, ou seja, pagou e não entrou
- [ ] Ler a taxa da Hubla (percentual e parcela fixa). No low ticket ela decide o ponto de
      equilíbrio, e a conta do plano usa 10% como estimativa (suposição S29)
- [x] **Turnstile: criado pela API da Cloudflare.** Widget `myportifolio`, modo managed,
      domínio `myportifolio.com.br`. As duas chaves em `.env.local`, e o secret foi testado
      contra o `siteverify` (recusou por token inválido, não por secret inválido)
- [x] Preços lidos dos checkouts reais: principal **R$ 47,90**, facilitação **R$ 490,00**
- [~] Id do bump de personalização **no mapa, mas ainda não confirmado**. O dono passou
      `vNYCSzkdxb4ehMKTYLTD`, que veio do painel da Hubla e não de um evento (a tabela
      `myportifolio.hubla_events` estava zerada, conferido). Entrou porque o risco é
      assimétrico: certo, a primeira venda com bump já libera; errado, ele nunca casa nada
      (zero colisão com os 6 ids do AI Block) e o evento cai na fila de travados com o id
      verdadeiro em destaque, que é exatamente a situação anterior
- [ ] **Confirmar o id na primeira venda real com o bump marcado.** `select product_ids,
      applied_flags, processed_result from myportifolio.hubla_events order by received_at
      desc limit 5;` Se vier `custom` em `applied_flags`, está certo. Se o evento estiver
      com `processed_at` nulo, o id certo é o que aparecer em `product_ids`: trocar em
      `productFlags.ts` e redeployar, que a retentativa conclui a venda sozinha
- [x] Estender o webhook `hubla-webhook` (que já está no ar servindo o AI Block) para
      conhecer os produtos do MyPortifolio. **Sem isso, a primeira venda entra em laço de
      500 e o comprador paga sem entrar.** Escrito, e provado: 20 de 20 testes passaram
      contra uma cópia deployada com outro nome (`scripts/testar-webhook.mjs`)
- [x] **Deployar o `hubla-webhook` por cima do que está no ar.** Feito e verificado: os
      20 testes rodaram contra a função de PRODUÇÃO, e depois conferi que o AI Block segue
      com 8 membros, 24 eventos e 8 usuários, sem nenhum resíduo do e-mail de teste

### Fase 1: o produto vendável

- [x] **1. Banco.** 22 tabelas, 73 funções e 34 policies no schema `myportifolio`,
      migrations 0001 a 0008 aplicadas. Mais `supabase/operacao/0001_grants_webhook.sql`,
      que destravou o `service_role` (sem ele **toda venda** dava `permission denied`)
- [x] **2. Seed.** O portfólio do Helio no banco, mídia no Storage com hash de conteúdo no
      nome, dentro de `<portfolio_id>/<tipo>/`
- [x] **3. Worker.** Subdomínio por cliente com cache de duas camadas, chave por
      `(portfolio_id, content_hash)` e não por slug. `helio.myportifolio.com.br` responde
      200 com título, descrição, canonical e og:image vindos do banco
- [x] **4. Login.** Código de 6 dígitos, gerado por `generateLink` e enviado pelo **nosso**
      Resend. Isso resolveu o conflito de config de Auth com o AI Block (é uma config só
      por projeto) e fechou o desvio pelo `/auth/v1/otp` com a anon key
- [x] **5. Webhook.** No ar. 20 de 20 testes contra a função de produção
- [x] **6. Editor mínimo.** Canvas vivo com gaveta, `fieldSchema.js` como fonte única. O
      canvas usa a **mesma** `renderPortfolioPage()` e o **mesmo** `montarCtx()` da página
      pública, com os pontos de edição injetados por JS depois do render, e não dentro dos
      componentes `[iso]` (senão viraria markup de editor no HTML de todo visitante)
- [x] **7. Experiência e certificado no editor.** Um formulário só para trabalho e estudo,
      mudando rótulo e ordem. O consentimento de publicar o certificado nasce desligado e
      fica desabilitado quando quem edita não é o titular, porque quem monta pelo bump de
      facilitação não pode consentir pela pessoa
- [x] **8. Cota de mídia.** O gatilho do banco recusa caminho e nome fora do padrão, e o
      lado do cliente converte para WebP no navegador, com orçamento por destino e hash de
      conteúdo no nome
- [x] **9. Pacote jurídico.** Termos, privacidade, consentimento versionado, exportar
      dados, arrependimento de 7 dias e exclusão de conta. As duas páginas legais agora
      são servidas **já pintadas** pelo Worker, e não só pelo bundle
- [x] **Virada do apex.** Feita por **rota** de Worker e não por `custom_domain`, que
      exigiria remover o Pages antes e abriria uma janela com o site fora do ar. Rota tem
      precedência sobre o Pages na mesma zona, então virou sem queda, e desfazer é apagar
      uma linha. O projeto Pages ficou de pé, sem tráfego, como rede
- [x] **10. `/comprar`.** Um botão só, o principal a R$ 47,90, com o preço do bump dito
      antes do checkout. A facilitação de R$ 490 não aparece (9.2). `/entrar` redireciona
      para `/app`. Links num arquivo só, `src/modules/checkout/config/checkoutLinks.js`
- [x] **11. Fila do bump de facilitação** e a fila de primeira publicação, em
      `/app/admin/fila`, mais o alerta por e-mail de 15 em 15 minutos (migration 0009)
- [x] **12. Conciliação de vendas.** `supabase/operacao/conciliar.mjs` roda contra o banco
      real e imprime as três telas. Zero divergência aberta hoje

### Higiene do repo

- [x] Diagnosticar os "175 arquivos pendentes" do `git status`
- [x] `.gitignore`: excluir `SITE-GH/` (cópia velha de outro projeto) e os PNGs de fonte
- [ ] Decidir se a cópia velha em `SITE-GH/` é apagada do disco (o projeto de verdade
      está em `Growth Hub/Site-GH`, com git próprio e 2 meses à frente)
- [ ] Corrigir o CLAUDE.md global: o token MASTER da Cloudflare **escreve** DNS, não é
      read-only como está descrito lá

---

## Review

### Spike 1, TLS em subdomínio curinga: aprovado

Era o único fato de plataforma capaz de derrubar a arquitetura escolhida, e a evidência
inicial apontava contra (as outras zonas da conta servem certificado por hostname, sem SAN
curinga). O spike rodou no domínio real:

Criado `AAAA *.myportifolio.com.br -> 100::` proxiado, e medido o handshake em três
subdomínios que nunca tiveram registro próprio. Os três fecharam com certificado válido:
SANs `myportifolio.com.br` e `*.myportifolio.com.br`, emissor Google Trust Services, no
plano Free.

A leitura inicial estava certa sobre o que era servido e errada sobre a causa: aquelas
zonas não têm registro curinga, então nunca houve motivo para a Cloudflare apresentar um
SAN curinga nelas. Certificado por hostname era efeito da ausência de curinga, não prova
de que curinga não funciona.

Isso tira do caminho os três planos B (Total TLS, Cloudflare for SaaS, certificado
avançado) e, o que mais importa sob pagamento único, garante **custo zero por hostname**.
O cenário em que cada comprador acima do centésimo viraria custo mensal eterno contra uma
receita única não vai acontecer.

### Diagnóstico dos "175 commits"

Não eram commits. Era `git status` mostrando 175 arquivos não rastreados: 167 de
`SITE-GH/`, que é cópia parada em 20/mai de um projeto que vive em `Growth Hub/Site-GH`
(com git próprio, 2 meses à frente), mais 6 PNGs de fonte de asset, mais `tasks/`. Depois
do `.gitignore` corrigido, sobraram 7 arquivos, todos legítimos.

### Como o plano foi produzido, e por que isso importa

Três rodadas, e as duas últimas existem porque a primeira estava errada em pontos que
custariam caro:

1. **Desenho:** 3 arquiteturas independentes, 4 especialistas, júri e síntese.
2. **Crítica adversarial:** 30 achados. As decisões do dono anularam 4 deles; os outros 26
   eram defeitos reais, incluindo RLS que não protegia o que dizia proteger.
3. **Dois verificadores:** 24 achados de dinheiro e isolamento, 20 de executabilidade. Os
   três piores estavam **escritos como resolvidos**: chave de cache colidindo entre
   clientes (serviria o portfólio de um cliente no subdomínio de outro, com cache
   `immutable` de 1 ano e sem permissão de purge na conta), login contornável direto no
   `/auth/v1/otp` com a anon key, e o `410` de banimento que o SQL não conseguia produzir.

A lição que fica: agente que revisa o próprio trabalho declara resolvido o que só foi
mencionado. Verificação adversarial separada, com instrução explícita de que "falou sobre"
não é "corrigiu", foi o que pegou os três.
