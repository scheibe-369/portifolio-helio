# Medições

**Este arquivo está vazio de propósito.** Ele é o único lugar do plano onde número de
performance, de limite de plataforma e de preço pode morar. Qualquer número desses citado
em `plano-produto.md` sem estar aqui é suposição, não medição.

A regra existe porque o plano v1 chegou a citar dois valores diferentes para a mesma
medição de render, em duas seções, e ninguém sabia qual valia.

## Como preencher

Uma seção por medição, com: o que foi medido, o comando exato, a data, o resultado e o
ambiente. Nunca sobrescrever uma medição antiga, acrescentar a nova embaixo com a data,
porque a comparação ao longo do tempo é metade do valor.

## O que precisa entrar, e quem manda entrar

| Medição | Comando | Origem no plano |
|---|---|---|
| Render: mediana, p95 e bytes do HTML | `scripts/medir-render.mjs` | Fase 0, item 12 |
| Limites lidos no painel do projeto Supabase novo | Leitura no dia da migração | S6 |
| Precedência de `run_worker_first: false` | Arquivo de sonda no primeiro deploy | S23 |
| Taxa da Hubla, percentual e parcela fixa | Painel da Hubla, e só o dono entra | S29 |
| Extrato de vendas conciliável linha a linha | Painel da Hubla, e só o dono entra | S16 |

S22, S24, S25, S26 e S27 foram fechadas em 23/08/2026, e S18 saiu de pauta. Ver a seção
"Cinco suposições fechadas em produção", no fim deste arquivo.

## Já medido

### Spike 1, TLS em subdomínio curinga (2026-08-12)

Aprovado. O resultado completo, com comando de reexecução, está em
[`spike-tls.md`](spike-tls.md), que é um relatório longo demais para caber aqui.

Resumo do número: certificado com SANs `myportifolio.com.br` e `*.myportifolio.com.br`,
emissor Google Trust Services, validade até 2026-11-10, plano Free, **custo por hostname
igual a zero**.

### Spike 2, cache de resposta de Worker (2026-08-13)

Worker descartável `mp-spike` publicado na zona real com rota `*.myportifolio.com.br/*`,
medido do colo **GIG** (Rio de Janeiro) nas três batidas, e **removido logo depois**. O apex
e o `www` foram deixados passar para a origem dentro do próprio código do spike, senão
publicar a rota curinga tiraria o portfólio do ar.

Cada resposta carrega um nonce gerado na execução. Nonce repetido significa que veio do
cache; nonce novo significa que o código rodou de novo. É a única medida honesta aqui,
porque `cf-cache-status` fala do cache da zona, não do nosso.

| Rota | O que testa | 1ª | 2ª | 3ª | Veredito |
|---|---|---|---|---|---|
| `/a` | só `Cache-Control: public, s-maxage=60` | nonce `16efd805` | `2a4894e5` | `2f29fe97` | **nonce muda sempre** |
| `/b` | Cache API, chave `https://cache/b/v1` | `miss` `e26dc811` | `hit` `e26dc811` | `hit` `e26dc811` | **cache funciona** |
| `/c` | Cache API, chave versionada `v2` | `miss` `993705fa` | `hit` `993705fa` | `hit` `993705fa` | **chave versionada isola** |

**Achado 11 confirmado na prática, e é o resultado mais importante deste spike.** Em `/a`,
com `s-maxage=60` e nada mais, o nonce mudou nas três chamadas: a borda **não** guarda
resposta de Worker sozinha. Sem Cache API explícita, **toda visita a todo portfólio bateria
no Postgres em `sa-east-1`**, para sempre, num produto de pagamento único. O `cache.js` da
fase 1 não é otimização, é o que faz a margem existir.

**Suposição S3 (cf-cache-status):** anotado, não é portão. Em `/b` e `/c` o `cf-cache-status`
veio `HIT` junto com o nosso `hit`, e `age` subiu de 2 para 4 segundos entre as batidas.
Em `/a` o header nem apareceu.

**Suposição S15 (`caches.default.delete`): CONFIRMADA.**

```
1. /b antes      -> hit    colo=GIG   nonce e26dc811
2. /d?apagar=1   -> colo=GIG          apagou=true
3. /b depois     -> miss   colo=GIG   nonce fcfffc07   (nonce novo)
```

As três no mesmo colo, o que importa porque o cache é por colo. O `delete` devolveu `true` e
a chamada seguinte voltou a executar o código. Isso é o que o caminho de banimento (5.8)
usa para tirar a cópia de socorro da borda **sem purge**, que a conta não tem permissão de
fazer. Com S15 de pé, o `max-age` da cópia de socorro pode continuar em 24 horas.

**O que este spike não mediu, e continua valendo como registrado:** hit ratio real no perfil
"muitos tenants, poucas visitas cada". Cache é por colo, e um portfólio visitado uma vez por
semana de um lugar diferente sempre vai dar miss. O cache protege o tenant com tráfego, não
a cauda longa.

### Render da página, medido em Node (2026-08-24)

50 execuções de aquecimento e 300 de medição, por idioma, sobre o
portfólio do Helio (21 projetos, 5 experiências).

| Idioma | Mediana | p95 | Bytes de HTML |
|---|---|---|---|
| PT | 0.131 ms | 0.309 ms | 60707 |
| EN | 0.112 ms | 0.323 ms | 60468 |

Tetos de regressão: mediana abaixo de 6 ms e p95 abaixo de 12 ms.
Resultado: **dentro do orçamento**.

Este número é de Node, não do isolate do Worker, então ele **não** prova que cabe no teto de
CPU da plataforma. Ele serve para detectar regressão. A prova real é a segunda metade do
critério 12: 500 requisições em miss forçado contra o Worker publicado, todas devolvendo o
nosso corpo. Isso só existe a partir da fase 1.

### Cinco suposições fechadas em produção (2026-08-23)

Medidas no produto no ar, e não em spike, contra `demo-arquiteta` e o apex, do colo **GIG**.

| # | O que dizia a suposição | O que foi medido | Veredito |
|---|---|---|---|
| S24 | O cache de resposta funciona no deploy real | 1ª chamada `X-Portfolio-Cache: miss`; 2ª e 3ª `hit`, com `CF-Cache-Status: HIT` | **confirmada** |
| S25 | `/cdn-cgi/*` é reservado pela plataforma e nunca chega ao Worker | `curl .../cdn-cgi/trace` devolveu o corpo da plataforma (`fl=`, `h=`, `ip=`, `ts=`), e não o nosso HTML | **confirmada** |
| S26 | Workers tem versões e `wrangler rollback` sem rebuild | `deployments list` lista as versões com o tráfego em 100%, e `rollback [version-id]` existe no CLI | **confirmada** |
| S22 | Dá para ler CPU por invocação (e o plano B, que é o que importa) | 100 requisições em **miss forçado** contra o apex, que é o tenant mais pesado (20 projetos): **100 responderam 200 e as 100 traziam o nosso corpo**. Nenhuma resposta de erro de plataforma | **plano B satisfeito**: o render está dentro do teto de CPU |
| S27 | A thumb de um ID inexistente devolve um placeholder cinza, e não `404` | `https://i.ytimg.com/vi/AAAAAAAAAAA/hqdefault.jpg` devolveu **`HTTP 404`** com 1097 bytes | **REFUTADA** |

**S27 estava errada, e isso é bom.** O plano assumia que imagem quebrada no card não era
sinal de ID errado, e por isso a checagem do editor teria que passar pelo oEmbed. Como a
thumb devolve 404 de verdade, o status dela serve de checagem barata, e o oEmbed passa a ser
redundância em vez de único caminho. Nada muda no código hoje: o `parseYoutubeId` já valida a
forma do ID, e a defesa continua desenhada como estava. O que muda é que a suposição virou
fato, e o fato é o contrário do que estava escrito.

**S18 saiu da lista, e não por ter sido medida.** Ela pergunta o tamanho da faixa gratuita e
o preço por hostname do Cloudflare for SaaS. O produto não usa Cloudflare for SaaS: ele serve
subdomínios da PRÓPRIA zona, por rota curinga (`*.myportifolio.com.br/*` em `wrangler.jsonc`),
cobertos pelo certificado curinga da zona. Custom hostname só entra em cena no dia em que um
comprador quiser apontar o domínio dele, que não é o produto de hoje. Enquanto isso, ela é
pergunta de uma feature futura, e não pendência da atual.
