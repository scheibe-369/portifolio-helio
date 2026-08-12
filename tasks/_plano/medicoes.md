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
