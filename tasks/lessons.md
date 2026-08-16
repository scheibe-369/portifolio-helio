# Lessons

## Cloudflare Pages: nunca testar a URL nua de um asset novo logo apos o deploy

**Data:** 2026-08-08
**Contexto:** adicionei o case AI Block, subi `public/projects/ai-block-logo.webp`, deployei
e conferi o asset com `curl` na URL nua. Deu `200 text/html`. Segundos depois, com cache
buster, deu `200 image/webp`. Na producao o card renderizava quebrado.

**O que aconteceu de fato:**
1. Depois do `wrangler pages deploy`, o HTML/JS novo aparece no dominio quase na hora,
   mas o asset estatico demora mais alguns segundos pra ficar disponivel na borda.
2. Nessa janela, uma request pro asset cai no fallback do SPA e recebe o `index.html`
   com `200 OK`.
3. O `public/_headers` deste projeto aplica `Cache-Control: public, max-age=31536000,
   immutable` em `/assets/*`, `/*.webp`, `/favicon.png` e `/projects/*`. Nomes em
   `/projects/*` NAO tem hash de conteudo.
4. Resultado: a Cloudflare cacheou o HTML de fallback naquela URL de imagem por **um ano**.
   Quem envenenou a entrada foi a minha propria request de verificacao.

**Por que nao deu pra so purgar:** nem o token MASTER nem o DEPLOY tem permissao de
Cache Purge (ambos devolvem `Authentication error [code: 10000]` em
`POST /zones/{zone}/purge_cache`). Purge de zona exige permissao `Cache Purge`, que
nenhum dos dois carrega.

**Regra pra proxima vez:**
- Depois de um deploy, verificar asset novo **sempre com cache buster**
  (`?probe=123`) ou na URL do deployment (`https://<hash>.<projeto>.pages.dev/...`),
  que tem cache proprio. So bater na URL nua depois que a versao com cache buster
  responder com o content-type certo.
- Se a URL nua ja estiver envenenada e nao houver permissao de purge, a saida barata e
  **renomear o arquivo** (caminho novo = cache limpo). Foi o que resolveu aqui:
  `/projects/ai-block-logo.webp` virou `/projects/ai-block.webp`.
- Cuidado geral: `immutable` de 1 ano em caminho sem hash de conteudo significa que
  qualquer resposta errada cacheada fica presa por um ano. Vale considerar hash no nome
  dos arquivos em `/projects/` ou um `max-age` menor, mas isso muda politica de cache do
  projeto e precisa de decisao do dono.

**Padrao mais amplo:** "verifiquei e deu 200" nao e prova de que esta certo. Conferir
tambem o `Content-Type`, o tamanho e, quando o alvo e uma imagem, se o browser realmente
decodifica (`img.naturalWidth > 0`). Um `200` servindo HTML no lugar de imagem passa
batido em qualquer checagem que so olhe o status code.

## Ausencia de evidencia tem causa. Nao confunda com evidencia de ausencia

**Data:** 2026-08-12
**Contexto:** o produto novo precisa entregar `<slug>.myportifolio.com.br` para cada
comprador, e isso so fecha se a Cloudflare emitir TLS para subdominio arbitrario sob um
registro curinga proxiado. Antes de ter o dominio, fui olhar os certificados que as zonas
existentes da conta ja servem, para estimar a resposta.

**O que eu vi, e estava certo:** `methodgrowthhub.com.br`, `helioportifolio.methodgrowthhub.com.br`
e `area.methodcipher.com` servem certificado **por hostname**, sem nenhum SAN `*.zona`.

**A conclusao que tirei, e estava errada:** que a conta nao ganha certificado curinga, e
que a arquitetura ia precisar de Total TLS ou de Cloudflare for SaaS (que custa por
hostname acima de 100, o que estragaria a conta de um produto de pagamento unico).

**O que era de fato:** nenhuma daquelas zonas tem registro DNS curinga. Sem curinga no DNS,
nao existe motivo para a Cloudflare apresentar SAN curinga. O certificado por hostname era
**efeito da ausencia de curinga**, nao prova de que curinga nao funciona. Assim que a zona
nova ativou e o `AAAA * -> 100::` proxiado foi criado, tres subdominios que nunca tiveram
registro proprio fecharam handshake com SANs `myportifolio.com.br` e `*.myportifolio.com.br`,
emissor Google Trust Services, no plano Free.

**Regra pra proxima vez:**
- Ao inferir capacidade de plataforma a partir do estado observado, perguntar antes **o que
  teria que ser verdade para o sinal aparecer**. Se a pre condicao nunca foi satisfeita, o
  sinal ausente nao informa nada.
- Marcar esse tipo de leitura como "indicio", nunca como "evidencia contra", e nao deixar
  ela mudar decisao de arquitetura sozinha.
- Quando o teste real custa 15 minutos e um registro DNS reversivel, **testar** vale mais
  que qualquer quantidade de inferencia sobre a doc ou sobre o estado vizinho.

**Padrao mais amplo, o mesmo do caso do cache:** "eu olhei e estava assim" nao explica
**por que** estava assim. As duas licoes deste arquivo sao a mesma doenca em roupas
diferentes: parar a investigacao no primeiro sinal que parece conclusivo.

## Agente que revisa o proprio plano declara resolvido o que so foi mencionado

**Data:** 2026-08-12
**Contexto:** o plano do produto passou por tres rodadas (desenho, critica adversarial,
dois verificadores). Os tres piores defeitos achados na ultima rodada estavam, no
documento, **escritos como resolvidos**: uma chave de cache que colidia entre clientes
(serviria o portfolio de um cliente no subdominio de outro, com `immutable` de um ano e
sem permissao de purge na conta), um login contornavel direto no `/auth/v1/otp` com a anon
key publica, e um `410 Gone` de banimento que o SQL nao conseguia produzir porque a funcao
tinha tres ramos e nenhum era esse.

**Por que passaram batido:** em todos os tres, o texto discutia o problema com propriedade.
Uma revisao que le o texto conclui que esta tratado. So quem confere o **SQL e o criterio
de pronto** contra a afirmacao descobre que a implementacao nao produz o comportamento
descrito.

**Regra pra proxima vez:**
- Em revisao de plano ou de spec, a instrucao ao revisor precisa dizer explicitamente:
  **"falou sobre" nao e "corrigiu"**. Exigir citacao do trecho que prova, e tratar
  discussao sem implementacao como nao corrigido.
- Rodar o verificador como agente **separado**, sem o contexto de quem escreveu. Quem
  escreveu ja sabe o que quis dizer e le a intencao no lugar do texto.
- Todo criterio de pronto tem que ser capaz de **falhar**. "Funciona", "sem erro" e "ficou
  visualmente igual" nao reprovam ninguem e por isso nao provam nada.


## curl le bytes, navegador executa (14/08/2026)

**O que aconteceu:** subi `/comprar`, `/termos` e `/privacidade` no apex e conferi com
`curl`. Titulo certo, canonical certo, dois botoes de checkout, zero travessao, credito no
rodape. Tudo verde. Aberto num navegador de verdade, as tres paginas mostravam **o
portfolio do Helio**.

**A causa:** `src/main.js` termina com `app.innerHTML = renderPortfolioPage(ctx)`, sem
condicao. Numa pagina sem `<script id="pf-payload">` ele cai no dado estatico e repinta o
`#app` inteiro por cima do que a borda serviu, mais o `document.title`. O HTML que o `curl`
le esta perfeito; ele so nao sobrevive a primeira linha de JavaScript.

**O que isso revelou de brinde:** as paginas de `404` e `410` tinham o MESMO defeito, desde
antes deste trabalho. Ninguem tinha visto porque ninguem tinha aberto essas rotas num
navegador. Um endereco banido respondia `410` no cabecalho e mostrava um portfolio no
corpo.

**Por que a suite inteira passou:** `build` compila, `import-graph` confere import,
`dom-diff` compara o HTML da pagina publica consigo mesma, `medir-render` mede tempo.
Nenhuma das quatro executa a pagina servida. Tres defeitos desta base ja se esconderam
exatamente nesse vao: o `PER_PAGE` que matava modal, filtro e idioma depois do
`innerHTML`, o `main.js` que reescrevia o SSR do tenant, e agora este.

**Regra pra proxima vez:**
- Rota nova que serve HTML so conta como pronta depois de **abrir num navegador** e
  conferir o que aparece na tela, nao o que vem no corpo da resposta. `npm run
  verificar:no-ar` existe para isso.
- A asserção que importa nessas paginas nao e "o conteudo certo esta la", e sim **"o
  conteudo errado NAO esta"**: o teste procura por "Helio Monteiro" nas paginas que nao sao
  dele. Afirmacao positiva passa mesmo com a pagina clobberizada, porque o HTML original
  continua no corpo por alguns milissegundos.
- Quando a correcao pode ser "ensinar o codigo a se calar" ou "nao mandar o codigo",
  preferir a segunda. Marcador no HTML que o servidor precisa lembrar de por tem um modo de
  falha silencioso (esquecer o marcador = defeito de volta); nao mandar o bundle nao tem
  como ser esquecido pela metade.
- Depois de deployar, **esperar antes de testar**. A primeira rodada do teste reprovou 8
  itens porque rodou colada no `wrangler deploy` e pegou a versao anterior no edge. Oito
  falsos negativos custam a mesma investigacao que oito defeitos.


## O teste que eu escrevi provava a minha suposicao, nao a realidade (14/08/2026)

**O que aconteceu:** o webhook da Hubla tinha 24 testes, todos passando, rodados contra a
function de PRODUCAO, incluindo um chamado "o id do bump concede has_custom". Na primeira
venda real, com o bump marcado, o comprador recebeu `has_main` e **nao** recebeu
`has_custom`. Os dois eventos fecharam com `processed_result = 'ok'`. Nenhum alarme, nenhum
500, nenhuma linha na fila de travados.

**A causa:** a Hubla modela o produto assim:

    product  dol37hflBB4LloFHpGab  "My portifolio"
      +-- offer  U9cuWxeCOsTvt4urY5vS  "principal"
      +-- offer  vNYCSzkdxb4ehMKTYLTD  "Personalizacao"

O order bump nao e um produto, e outra **oferta do mesmo produto**. Comprar os dois gera
dois eventos com o **mesmo** `products[].id`, e o que os distingue mora em
`products[].offers[].id`. O codigo so lia `products[].id`, entao os dois eventos casaram
`main` e o segundo nao acrescentou nada.

**Por que os 24 testes nao pegaram:** porque eu escrevi o corpo do evento. O helper montava
`products: [{ id }]`, sem `offers`, porque era assim que eu **achava** que a Hubla mandava.
O teste do bump passava mandando o id da oferta no lugar do id do produto, ou seja, ele
provava que o mapa estava ligado, num formato que a Hubla nunca usou. Teste sobre payload
inventado mede a coerencia da minha suposicao com ela mesma.

**O agravante:** eu tinha escrito no proprio arquivo, em caixa alta, "o unico id em que se
pode confiar e o que chega no corpo de um evento real". E, faltando evento real, aceitei um
id do painel e chamei de aposta informada. A aposta ate acertou o **valor**; errou o
**nivel**: era id de oferta, e eu registrei como id de produto.

**Regra pra proxima vez:**
- Integracao com terceiro so tem teste de verdade depois que UM payload real foi capturado.
  Antes disso, o que existe e ensaio, e ele deve dizer isso no nome e no comentario.
- Guardar o payload cru desde o primeiro dia (`payload jsonb` na tabela de auditoria) foi o
  que permitiu diagnosticar e **reprocessar** em minutos, sem pedir nada ao gateway. Isso se
  paga sozinho.
- Ter um `--reprocessar` que reabre o evento e reenvia com o MESMO idempotency transforma
  "venda errada" em "roda de novo". O `processed_at` nulo de proposito, que parecia zelo
  excessivo quando foi escrito, foi exatamente o que salvou a venda.
- Quando um teste sintetico e um evento real discordam, o teste esta errado. Corrigir o
  teste para falar a lingua do payload real, e nao o contrario.
- Preco em pagina publica sai da NOTA, nao do painel nem da memoria. A fatura veio com
  `totalCents: 8580`; 85,80 menos 47,90 da 37,90, e o `/comprar` anunciava 37,00.


## A service role nao e toda-poderosa neste schema (14/08/2026)

**O que aconteceu:** a tela de aceite dos termos falhou em producao com
`permission denied for table terms_consents`. A Edge Function escrevia direto na tabela
usando a service role key.

**A causa:** as migrations fazem `revoke ... from public` nas tabelas, e isso tira junto o
privilegio que `service_role` recebia por HERANCA de `public`. A chave tem cara de
toda-poderosa (ela ignora RLS) e nao e: RLS e privilegio de tabela sao coisas diferentes, e
ela so escapa da primeira.

**Ja tinha acontecido antes, com outro nome:** em 12/08 nenhuma venda liberava acesso, e a
causa era a mesma, `service_role` sem execute na RPC de concessao. Consertei o caso e nao a
classe, entao a classe voltou.

**O que a busca sistematica achou depois:** so `hubla_events`, `setup_requests` e
`vendas_conferidas` tem grant para a service role. E a `request-refund` escrevia direto em
`refund_requests` e `portfolio_publications`. Ou seja, **o botao de arrependimento de 7 dias
(CDC art. 49) estava quebrado desde que foi escrito**, e ninguem tinha visto porque ninguem
tinha pedido reembolso. O comprador clicaria, receberia "nao foi possivel registrar", e o
pedido nao existiria em lugar nenhum.

**Regra pra proxima vez:**
- Edge Function com service role **nao escreve em tabela**. Ela chama RPC `security definer`.
  Isso resolve a permissao de uma vez e, de quebra, mantem regra de negocio no banco: "o que
  conta como dentro do prazo" nao pertencia a uma funcao de transporte.
- Quando um defeito de permissao aparecer, **listar a classe inteira antes de fechar**. A
  consulta que resolveu isto em um minuto:
  `select table_name, privilege_type from information_schema.role_table_grants where grantee='service_role' and table_schema='myportifolio'`.
- Caminho que so roda em situacao rara (reembolso, chargeback, exclusao de conta) precisa de
  teste de fumaca no dia em que e escrito. Ele nao tem usuario para descobrir o defeito, e
  quando tiver, a pessoa ja vai estar irritada e com razao.

## A suite inteira passou verde enquanto o campo de video estava 100% quebrado (16/08/2026)

**O que aconteceu:** `parseYoutubeId` devolvia string ou `null`, e os tres chamadores
(`primitivos.js:221`, `formulario.js:89`, `projectsApi.js:58`) liam `.id` e `.orientation`,
porque foram escritos contra a secao 6.6 do plano. O modulo ficou para tras da spec e ninguem
percebeu.

**O efeito, que era duplo e silencioso:** link VALIDO caia em `!r.id` (undefined) e o editor
respondia "nao reconheci este link do YouTube", **bloqueando o salvar**; link invalido devolvia
`null` e `r.id` lancava TypeError, derrubando o formulario. Ou seja: **nenhum comprador
conseguia salvar um projeto com video**. Como `has_video` e coluna gerada de `youtube_id`, a
invariante editorial "video primeiro" (`projects_video_first`) nunca disparava e a badge de
play nunca aparecia. O campo existe no editor, no passo "Provas", e vende conversao.

**Por que nada pegou:** o `npm run verificar` tem quatro ferramentas e nenhuma olha para
ali. O build compila (JS nao tem tipo), o `import-graph` confere fronteira de execucao, o
`dom-diff` compara a pagina publica (e o defeito e do editor) e o `medir-render` mede tempo.
**Quatro luzes verdes sobre um caminho que nenhuma delas percorre.** E a mesma familia da
licao de 14/08: o teste provava a minha suposicao, nao a realidade.

**Regra pra proxima vez:**
- **Quando um modulo e escrito contra uma spec e os chamadores tambem, alguem tem que checar
  que os dois falam a mesma lingua.** Em JS isso nao aparece em build: `undefined` propaga
  calado e so vira sintoma na mao do cliente. Ao mudar a FORMA de um retorno, grep nos
  chamadores no mesmo commit, sempre.
- **Todo campo de formulario que o comprador preenche precisa de um teste que o exercite de
  ponta a ponta.** Nao basta o render estar certo: entre o que ele digita e o que o banco
  guarda tem parser, validador e patch, e nenhum dos tres esta na pagina publica que o
  dom-diff vigia.
- **O teste tem que ser capaz de falhar, e isso se demonstra, nao se afirma.** Aqui o defeito
  foi reintroduzido de proposito e o `testar-youtube.mjs` reprovou com 31 falhas antes de
  entrar na suite. Sem essa demonstracao, um teste novo e so mais uma luz verde.
- Ao achar um defeito assim, **procurar os irmaos dele**: o mesmo commit achou um parser
  ad-hoc (`split('/').pop()`) no `draftState.js`, que fazia o previa do editor mentir sobre a
  propria pagina.

## Trocar innerHTML nao remove ouvinte do proprio no, e isso publicou dado errado (16/08/2026)

**O que aconteceu:** `repintarCorpo` (`editorDrawer.js`) trocava `corpo.innerHTML` e chamava
`ligarFormulario` de novo. Os ouvintes do formulario sao registrados POR DELEGACAO no proprio
no do corpo, e trocar o innerHTML destroi os filhos, nao o pai. Cada repintura somava mais um
jogo completo de ouvintes ao mesmo elemento.

**O efeito, proporcional ao numero de repinturas:**
- Switch executa `valores[k] = !valores[k]` N vezes. Com N par, o clique nao faz nada: depois
  do primeiro clique o interruptor nunca mais desliga.
- Remover um chip filtra a lista N vezes e leva N itens: **um clique apagou dez
  especialidades**.
- E o pior, porque chegou na pagina publicada: o campo "ate quando" so nasce quando o switch
  "ainda estou aqui" desliga. Como ele nao desligava, **duas personas publicaram formacao
  concluida como "DESDE 2012"**, uma delas dizendo que uma psicologa formada ha dez anos ainda
  esta cursando.

**Por que nada pegou:** zero erro de console, zero resposta HTTP 4xx/5xx, zero diff de DOM na
pagina publica (o defeito e do editor). O `npm run verificar` inteiro passava verde. Foram
tres personas de teste diferentes esbarrando no mesmo comportamento que fizeram o padrao
aparecer.

**Regra pra proxima vez:**
- **Ao repintar por innerHTML, substitua o NO, nao o conteudo dele.** `no.cloneNode(false)` +
  `replaceWith` devolve um elemento identico e sem ouvinte nenhum, e custa uma linha. Se o
  codigo re-registra ouvinte depois de repintar, essa e a unica forma barata de garantir que
  ele seja o primeiro e unico.
- **Defeito de estado acumulado nao aparece na primeira interacao.** Todo teste de formulario
  que repinta precisa clicar no MESMO controle pelo menos tres vezes e conferir que o valor
  alterna todas as vezes. Clicar uma vez e ver funcionar e o teste que este defeito passava.
- **Uma pessoa de teste acha um bug; dez acham um padrao.** O que tornou este achado possivel
  foi rodar dez perfis diferentes contra o mesmo produto: o mesmo defeito apareceu com sintomas
  completamente diferentes (chip sumindo, switch travado, data errada publicada), e nenhum dos
  tres sozinho apontaria para a causa.
