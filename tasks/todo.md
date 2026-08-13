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
- [ ] **Spike 2: cache de resposta de Worker pela Cache API**, medido por
      `X-Portfolio-Cache` num deploy real. É o outro spike que precede código de produto
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
- [ ] Reescrever o SQL das migrations 0001 a 0007 de `public.` para `myportifolio.`, com
      as três exceções (`auth`, `storage`, `cron`) tratadas caso a caso
- [ ] Migrar para projeto Supabase próprio antes de escalar. Enquanto dividir, um erro de
      migration derruba o AI Block junto
- [x] Criar os SKUs na Hubla. Links prontos: principal (com o order bump dentro)
      `pay.hub.la/U9cuWxeCOsTvt4urY5vS`, facilitação `pay.hub.la/q7IxDLHWM6OI8EBmrreo`
- [ ] Pegar os `productId` reais no painel da Hubla para o `PRODUCT_FLAG_MAP`. **Não é o
      slug da URL de pagamento**, é o id que vem no corpo do evento. Confundir os dois faz
      todo evento chegar sem casar flag, ou seja, pagou e não entrou
- [ ] Ler a taxa da Hubla (percentual e parcela fixa). No low ticket ela decide o ponto de
      equilíbrio, e a conta do plano usa 10% como estimativa (suposição S29)
- [ ] Turnstile: site key e secret

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
