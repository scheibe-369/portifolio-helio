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
- [x] **Case do Falow (24/08/2026), 21º projeto.** Entrou no grupo `websites`, na sexta
      posição, e a primeira página passou a ser BrasilDTF, MaternaForte, Previa, Geração de
      Leads, AI Block e Falow. O AI Block subiu da nona posição e Site Growth Hub e
      Damascena Films desceram para a segunda página. Miniatura em quadrado 1080 com o fundo
      `#030505` medido no PNG de origem, que é a convenção das outras marcas do acervo
      (`token-logo`, `agents-logo`): quadrado é o único formato em que o `object-cover` não
      corta um logotipo deitado no card de 2 colunas do celular
- [x] **`scripts/publicar-helio.mjs`.** O seed escreve nas tabelas, e o Worker lê a linha
      `is_live` de `portfolio_publications`: sem publicar, o banco fica com o case novo e o
      site continua servindo o payload antigo, sem erro em lugar nenhum

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
- [x] Confirmar que o e-mail de teste caiu na **caixa de entrada** e não no spam. É a
      única parte que eu não consigo verificar daqui. **Confirmado pelo dono em
      23/08/2026**
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
- [x] Pegar os `productId` reais no painel da Hubla para o `PRODUCT_FLAG_MAP`. **Não é o
      slug da URL de pagamento**, é o id que vem no corpo do evento. Confundir os dois faz
      todo evento chegar sem casar flag, ou seja, pagou e não entrou.
      **Resolvido, e o modelo era outro:** o mapa passou a ser por OFERTA, não por produto
      (item do id do bump, mais abaixo). Fechado pela venda real que entrou com as duas flags
- [x] **Criar a regra de webhook do MyPortifolio no painel da Hubla.** Feita pelo dono, e
      a primeira venda real entrou depois dela (item mais abaixo). Descoberto em
      14/08/2026, na marra: a primeira compra real foi feita e a Hubla **não chamou uma vez
      sequer** (zero linha no log de acesso da função). A regra de webhook na Hubla é por
      **produto**, e a única que existe é a do AI Block, com 2 produtos e 1 evento. Os
      produtos do MyPortifolio não estão em regra nenhuma. Eu tinha assumido que o webhook
      era por conta, porque o do AI Block já entregava naquela URL, e escrevi essa suposição
      no código como se fosse fato
- [x] **Token do webhook: é por CONTA, não por regra.** Medido, não suposto: com apenas o
      `HUBLA_WEBHOOK_TOKEN` antigo no ar, o token que o dono passou foi aceito (400 na
      validação seguinte em vez de 401). Ou seja, é o mesmo valor. `HUBLA_WEBHOOK_TOKEN_MP`
      foi removido por ser redundante, e o comentário do código já dizia isso corretamente
- [ ] Ler a taxa da Hubla (percentual e parcela fixa). No low ticket ela decide o ponto de
      equilíbrio, e a conta do plano usa 10% como estimativa (suposição S29)
- [x] **Turnstile: criado pela API da Cloudflare.** Widget `myportifolio`, modo managed,
      domínio `myportifolio.com.br`. As duas chaves em `.env.local`, e o secret foi testado
      contra o `siteverify` (recusou por token inválido, não por secret inválido)
- [x] Preços lidos dos checkouts reais: principal **R$ 47,90**, facilitação **R$ 490,00**
- [x] **Id do bump: CONFIRMADO, e o modelo estava errado.** Ele é id de **oferta**, não de
      produto. A Hubla modela o MyPortifolio como UM produto (`dol37hflBB4LloFHpGab`) com
      duas ofertas: `U9cuWxeCOsTvt4urY5vS` (principal) e `vNYCSzkdxb4ehMKTYLTD`
      (Personalização). O webhook lia só `products[].id` e por isso concedia `main` duas
      vezes. Corrigido: o mapa passa a ser por oferta, o produto só roteia
- [x] **Regra de webhook do MyPortifolio criada na Hubla** (pelo dono) e a primeira venda
      real entrou: `has_main` e `has_custom`, origem `hubla`, os dois eventos fechados
- [x] **Preço do bump corrigido de R$ 37,00 para R$ 37,90**, lido da nota da venda real
      (`totalCents: 8580` menos os R$ 47,90 do principal). A página `/comprar` estava no ar
      com o valor errado

## O que as catorze personas deixaram em aberto (20/08/2026)

Tudo aqui saiu de defeito visto numa página publicada, e não de ideia. A ordem é por
quanto custa, e não por quanto dá trabalho.

- [ ] **O wizard só oferece dez áreas, e três das três últimas personas não se acharam.**
      Corretor, cerimonialista e funileiro chegaram e escolheram "o mais parecido": o
      corretor pegou Arquitetura e pagou com dezessete itens de outra profissão para
      desfazer. O kit é o que decide se a pessoa cai num editor montado ou em branco, então
      não ter a área dela é o pior minuto do produto acontecendo de novo, com outro nome
- [ ] **Áudio não toca.** Só existe embed de YouTube. Spotify, SoundCloud e Bandcamp são
      recusados com "não reconheci este link do YouTube", e o trabalho de uma produtora
      musical É o áudio. Ela tem seis redes e nenhuma faixa na página
- [ ] **A galeria de fotos reintroduz o corte que o card já não faz.** `aspect-[3/2]` fixo
      com `object-cover` e sem `object-position` (projectModal.js:105). Um retrato 2:3
      perde 56% ali dentro, que é exatamente o defeito que o tatuador reportou no card e
      que foi corrigido só no card
- [ ] **Foto de galeria não tem legenda.** É o que torna o antes/depois do funileiro
      ilegível: como ele mesmo escreveu, "um cliente olha e vê duas fotos de carros
      diferentes"
- [ ] **Foto não amplia.** Nada é clicável: o maior tamanho que uma foto alcança é 336x208
      no card e 295x196 na galeria. Para fotógrafo, tatuador e arquiteta, a página inteira
      existe para mostrar imagem, e a imagem nunca passa de um selo
- [ ] **Tema claro.** É a premissa inteira da arquiteta. Custo medido: 4 tokens novos, ~84
      classes `text-white*`, ~39 `bg-white/` e `border-white/` em 5 módulos de render,
      variantes claras de `.glass-card`, `.glass-button`, `.vibecoder-btn` e
      `.metallic-silver` (esta some no claro, porque o gradiente dela inclui branco), e um
      `plate` claro por preset, porque ele viaja inline no HTML
- [ ] **Campos que a profissão pede e não existem**: banca do concurso (professor), ficha
      técnica de área/ano/programa (arquiteta), cicatrizado ou fresco (tatuador), e preço,
      m² e quartos como CAMPOS e não como texto livre (corretor)
- [ ] **O `value` das redes virou dado morto.** O cartão deixou de mostrar o segundo texto,
      e a coluna continua preenchida em todo portfólio publicado antes de 20/08. Some
      sozinho no primeiro salvamento de cada um, mas até lá é dado que ninguém lê
- [ ] **O `shot-diff` não está dentro de nenhum comando que alguém digita.** Foi por isso
      que ele passou sete dias medindo um baseline de 13/08 sem ninguém saber. Ou entra num
      `verificar:visual`, ou a data do baseline precisa ser conferida a cada uso
- [ ] **As catorze demos moram em produção.** Ocupam catorze endereços e entram em qualquer
      contagem de portfólios. `node scripts/limpar-demos.mjs --aplicar` apaga
