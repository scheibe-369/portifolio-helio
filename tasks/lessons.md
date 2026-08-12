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
