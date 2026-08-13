# Decisões travadas pelo dono (2026-08-11)

Estas decisões vieram do dono do produto e **não se reabrem**. O plano v1 foi escrito
antes delas e errava em duas das quatro (tenant por caminho e cobrança recorrente), por
isso foi descartado. O que sobreviveu dele, o detalhe técnico, está incorporado em
[`../plano-produto.md`](../plano-produto.md), que é o documento vigente.

---

## 1. Cobrança: pagamento único, acesso vitalício

O comprador paga uma vez e fica com o portfólio para sempre. Mesmo modelo do AI Block.

**Consequências, todas obrigatórias:**

- Não existe assinatura, não existe inadimplência, não existe `past_due`, não existe
  período de carência por cartão recusado, não existe suspensão por falta de pagamento.
- Todo o maquinário de suspensão e reativação do plano v1 sai. Isso anula por
  construção os achados 1, 4 e 19 da crítica adversarial.
- O único caminho que tira um portfólio do ar é **reembolso, chargeback ou banimento
  por abuso**, que são eventos raros e podem ser tratados por uma flag `blocked` de
  verdade (achado 10 vira obrigatório e vira simples).
- Como a receita é uma só por cliente e o custo de hospedagem é para sempre, o custo
  por tenant precisa ficar perto de zero. Isso é argumento a favor de cache na borda e
  contra qualquer coisa que faça o Postgres trabalhar por visita.
- O CDC art. 49 (arrependimento em 7 dias na compra online) se aplica e precisa estar
  no fluxo e nos termos.

## 2. Marca e domínio: `myportifolio.com.br`

**DEFINIDO em 2026-08-11.** Não é `linksby.com.br` nem subdomínio da Growth Hub.

**Estado real na Cloudflare, verificado pela API:**

- Zona `myportifolio.com.br` já existe na conta, id `67579cef2f0a7010548217ab9e59547b`,
  plano Free, tipo `full`.
- **Status `active` desde 2026-08-12T00:46:23Z.** O dono trocou os nameservers no
  registro.br e a delegação propagou: o DNS público já responde `kipp.ns.cloudflare.com` e
  `serenity.ns.cloudflare.com`. Universal SSL emitido na ativação, pela Google Trust
  Services, válido até 2026-11-10.
- Registros hoje: os três que a Cloudflare cria sozinha para domínio sem e-mail
  (`MX .`, `TXT v=spf1 -all`, `TXT _dmarc p=reject`), o `AAAA *` proxiado criado pelo
  spike de TLS (ver decisão 3), e dois `CNAME` proxiados (`@` e `www`) apontando para
  `helioportifolio.pages.dev`.
- **O portfólio do Helio já está no ar no apex desde 2026-08-12**, servido pelo projeto
  Pages `helioportifolio`, que ganhou `myportifolio.com.br` e `www` como custom domains.
  Isso é **provisório de propósito**: quando o Worker de tenant nascer (fase 1), ele assume
  o apex e os dois `CNAME` viram o que a rota do Worker exigir. Está assim porque o dono
  pediu o portfólio no domínio novo antes do produto existir, e Pages entrega isso hoje
  sem escrever uma linha de código.
- O domínio antigo `helioportifolio.methodgrowthhub.com.br` continua ativo e servindo o
  mesmo conteúdo, para não quebrar link já distribuído. O 301 entra junto com o Worker.
- **O token MASTER escreve DNS.** Testado com criação e remoção de um TXT de sondagem. O
  CLAUDE.md global descreve ele como read-only, e isso está errado. O token DEPLOY, ao
  contrário, **não** lê nem escreve DNS (`Authentication error` na zona).
- Ordem de execução da infra, com o estado real de cada passo:
  1. Trocar NS no registro.br. **FEITO.**
  2. Zona virar `active` e Universal SSL ser emitido. **FEITO.**
  3. Spike de TLS curinga. **FEITO e aprovado**, ver decisão 3.
  4. Resend no domínio, com DKIM e reescrita do SPF e do DMARC. **PENDENTE**, e é o
     próximo bloqueio de infra, porque sem ele o código de acesso não chega.
  5. Projeto Supabase novo, já no Pro (ver seção de decisões do plano). **PENDENTE.**

**Consequências:**

- O achado 14 da crítica (tomada do apex do `linksby.com.br`, que hoje aponta para a
  Vercel) deixa de existir. Nada em produção é derrubado.
- Some a dependência do Resend já configurado no `linksby.com.br`: o SMTP tem que ser
  configurado do zero em `myportifolio.com.br` (DKIM, SPF, DMARC), e isso entra como pré
  requisito da fase que liga o login por código. Atenção: os TXT de SPF e DMARC que já
  estão na zona hoje são os de "domínio que não manda e-mail" (`v=spf1 -all` e
  `p=reject`). Ligar o Resend **exige reescrever os dois**, senão todo e-mail de código de
  login vai para spam ou é rejeitado na origem.
- O apex `myportifolio.com.br` fica com a vitrine, o checkout, o login e o editor. O
  comprador fica em `<slug>.myportifolio.com.br`.
- O portfólio do Helio continua em `helioportifolio.methodgrowthhub.com.br` e precisa
  de um plano de 301 para `helio.myportifolio.com.br` (ou para o apex, decidir), sem
  quebrar link já distribuído.
- O nome do produto sai do domínio: **MyPortifolio**. Registrar isso no plano para a copy
  não ficar oscilando entre nomes.

## 3. URL do comprador: subdomínio `fulano.myportifolio.com.br`

O comprador recebe um subdomínio próprio, não um caminho.

**Consequências, e esta é a que mais muda o plano v1:**

- O plano v1 escolheu Arquitetura A com tenant **por caminho** (`dominio.com/fulano`)
  servido por Pages Function. Isso está morto. A decisão de qual arquitetura vence
  **precisa ser refeita** sob a restrição de subdomínio.
- Fato verificado na documentação: **rotas de Worker suportam curinga**
  (`*.myportifolio.com.br/*`, com a regra documentada de que `*.example.com/*` casa só subdomínios e
  `*example.com/*` casaria `myexample.com` também). **Custom domains de Cloudflare
  Pages não documentam suporte a curinga.** Logo, o renderizador público sai do Pages
  e vira um **Worker**.
- Fato verificado: **Workers com Static Assets** servem os arquivos estáticos e rodam
  código servidor no mesmo deploy, configurados por `[assets] directory + binding` no
  `wrangler`, com `env.ASSETS.fetch(request)` para buscar o shell buildado de dentro do
  código. Ou seja, um Worker só resolve shell estático mais SSR por tenant.
- Ganho de graça: com tenant em subdomínio, o namespace de slug do cliente deixa de
  competir com as rotas do app (`/entrar`, `/comprar`, `/app`), que ficam no apex. O
  achado 29 da crítica encolhe muito, mas não some: sobram nomes de subdomínio que a
  própria plataforma usa (`www`, `mail`, `api`, `app`, `admin`, `cdn-cgi` como caminho).
- **TLS curinga: VERIFICADO E APROVADO em 2026-08-12.** Era o único fato de plataforma
  capaz de derrubar esta decisão, e ele passou. O spike rodou no domínio real, logo depois
  da zona ativar.

  **O que foi feito:** criado `AAAA *.myportifolio.com.br -> 100::` **proxiado** (o mesmo
  padrão de hostname servido só por Worker que a conta já usa em
  `agentes.methodgrowthhub.com.br`). Registro id `7a37f8029ccc4bd7df6c7fec54f0db81`.

  **O que foi medido:** handshake TLS em três subdomínios que nunca tiveram registro
  próprio (`zz-teste-tls-01`, `joao`, `maria`). Os três completaram com certificado
  válido e publicamente confiável:

  ```
  SANs:      myportifolio.com.br, *.myportifolio.com.br
  Emissor:   Google Trust Services
  Validade:  até 2026-11-10
  Plano:     Free
  ```

  O HTTP responde `522` porque ainda não existe Worker nem origem por trás do `100::`,
  e `522` é erro de camada de aplicação, ou seja, **depois** do TLS ter fechado. Quando a
  rota `*.myportifolio.com.br/*` existir, o Worker intercepta antes da origem e o `522`
  desaparece.

  **Consequências, todas boas:**
  - Não precisa de Total TLS, não precisa de Cloudflare for SaaS, não precisa de
    certificado avançado. Os três planos B saem de cena para o caso do subdomínio.
  - **Custo por hostname é zero, para sempre.** Isso importa muito sob pagamento único:
    o cenário em que cada comprador acima do centésimo virava custo mensal eterno contra
    receita única não vai acontecer. A tabela de preço do plano continua válida.
  - Cloudflare for SaaS volta a ser só o que sempre deveria ser: o caminho para "cliente
    traz o domínio próprio dele", que é feature futura, não dependência da v1.

  **O que este teste NÃO prova, e reforça uma regra que já existia:** Universal SSL cobre
  o apex e **um** nível de subdomínio. `a.b.myportifolio.com.br` continua descoberto. Como
  o slug do cliente já é obrigado a ser rótulo DNS válido (sem ponto), nada no produto cai
  nesse caso, mas a validação de slug não pode afrouxar para aceitar ponto.

  **Registro histórico da dúvida, para ninguém reabrir sem motivo:** a suspeita nasceu de
  os certificados das outras zonas da conta serem por hostname, sem SAN `*.zona`.
  Aquilo era leitura correta do que estava servido, e conclusão errada sobre a causa:
  aquelas zonas não têm registro curinga, então nunca houve motivo para a Cloudflare
  apresentar um SAN curinga nelas. Certificado por hostname era efeito da ausência de
  curinga, não prova de que curinga não funciona.

## 4. Customização: só conteúdo na base, com order bumps

A base é a opção "só o conteúdo": mesmo layout e mesmo visual do portfólio do Helio, o
comprador troca textos, fotos, projetos e vídeos. Em cima disso, **montar order bumps de
facilitação e de personalização**.

**Consequências:**

- São três SKUs na Hubla, e isso encaixa no padrão já provado no AI Block, que hoje vende
  um principal mais dois bumps e mapeia `productId` para tier. **Preço definido em
  2026-08-12, e é low ticket:**
  - **Principal, R$ 47,90**: o portfólio em si, vitalício. Vai no checkout.
  - **Personalização, R$ 37,00**: cor de destaque e as variações visuais que não deixam o
    cliente estragar o layout. Vai como **order bump** no mesmo checkout.
  - **Facilitação, R$ 297**: nós montamos o portfólio para o comprador (serviço, não
    software). **Sai do checkout e vira upsell dentro do editor.** O motivo é aritmético e
    não de gosto: é hora de trabalho humano, de 2 a 3 horas por cliente, e no preço de um
    bump de low ticket seria vender a própria hora abaixo do salário mínimo. Quem paga 6x o
    produto principal é quem já entrou, travou no meio e não quer montar sozinho.
  - Consequência boa: no checkout chegam no máximo **dois** eventos da Hubla, e a
    facilitação vira uma terceira chamada avulsa depois. Nenhuma linha de código muda,
    porque entitlement sempre foi flag booleana por produto.
- A Hubla manda **um evento por produto**. Compra com dois bumps gera três chamadas
  independentes de webhook, cada uma com seu `x-hubla-idempotency`. Isso não é hipótese,
  é lição registrada no CLAUDE.md do AI Block depois de uma venda real ter se perdido.
- Portanto o entitlement **não pode ser um `plan_code` escalar com rank**, que é
  exatamente o achado 4 da crítica. Tem que ser flag por produto, como o
  `member_access (has_main, has_skills_plugins, has_artigos)` do AI Block já faz. Aqui
  vira algo como `has_main`, `has_custom`, `has_setup`.
- O bump de facilitação é trabalho humano: precisa de uma fila visível para o dono
  (quem comprou setup e ainda não foi atendido), senão vende e não entrega.

---

## O que continua valendo da crítica adversarial

Os achados que as decisões acima **não** anulam continuam obrigatórios, em especial:
2 (RLS não é column level), 3 (e-mail de compra tem que ser imutável), 5 (dedupe de
idempotência engolindo retentativa), 6 (anon baixando a base de clientes inteira),
7 (cota de mídia não aplicada), 8 (endpoint de código de acesso sem rate limit, e
oráculo de enumeração), 9 (webhook não consegue criar a linha de portfólio),
11 (resposta de Worker não entra no cache sozinha), 12, 13 (sem histórico de
publicação), 15 (`let lang` vaza entre requests no isolate, e vale para qualquer
arquitetura com SSR), 16, 17, 18, 20 a 27, 29, 30.

O achado 28 (métrica de valor recorrente) muda de motivo: com pagamento único não existe
churn de assinatura, mas contador de visitas continua sendo o único sinal de valor que o
produto tem, e é o que sustenta venda futura de upgrade.
