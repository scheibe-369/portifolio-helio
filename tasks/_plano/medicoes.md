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
| CPU por invocação do Worker | `wrangler tail` no Worker publicado, 50 requisições em miss forçado | S22 |
| `cf-cache-status` e `X-Portfolio-Cache` num deploy real | Spike 2, fase 0 | S24 |
| Limites lidos no painel do projeto Supabase novo | Leitura no dia da migração | S6 |
| Cloudflare for SaaS: tamanho da faixa gratuita e preço por hostname | Tela de billing da conta | S18 |
| Precedência de `run_worker_first: false` | Arquivo de sonda no primeiro deploy | S23 |

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

### Render da página, medido em Node (2026-08-18)

50 execuções de aquecimento e 300 de medição, por idioma, sobre o
portfólio do Helio (20 projetos, 5 experiências).

| Idioma | Mediana | p95 | Bytes de HTML |
|---|---|---|---|
| PT | 0.090 ms | 0.256 ms | 55589 |
| EN | 0.113 ms | 0.291 ms | 55353 |

Tetos de regressão: mediana abaixo de 6 ms e p95 abaixo de 12 ms.
Resultado: **dentro do orçamento**.

Este número é de Node, não do isolate do Worker, então ele **não** prova que cabe no teto de
CPU da plataforma. Ele serve para detectar regressão. A prova real é a segunda metade do
critério 12: 500 requisições em miss forçado contra o Worker publicado, todas devolvendo o
nosso corpo. Isso só existe a partir da fase 1.
