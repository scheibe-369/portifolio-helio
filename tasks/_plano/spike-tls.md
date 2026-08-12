# Spike 1: TLS em subdomínio curinga

**Pergunta:** a Cloudflare emite certificado válido para um subdomínio arbitrário de
`myportifolio.com.br` que nunca teve registro DNS próprio, servido só por um registro
curinga proxiado, no plano Free?

**Por que ela travava tudo:** o produto entrega `<slug>.myportifolio.com.br` para cada
comprador. Se a resposta fosse não, seria preciso Total TLS, ou Cloudflare for SaaS (que
cobra por hostname acima de uma faixa gratuita), ou certificado avançado pago. Sob
pagamento único, custo mensal por hostname contra receita única muda a viabilidade do
negócio, não só a implementação.

**Resposta: SIM.** Executado em 2026-08-12, logo depois da zona ativar.

---

## O que foi feito

Registro criado na zona `myportifolio.com.br` (id `67579cef2f0a7010548217ab9e59547b`):

```
AAAA  *.myportifolio.com.br  ->  100::   proxiado
id: 7a37f8029ccc4bd7df6c7fec54f0db81
```

`100::` é o endereço de descarte (bloco IPv6 de descarte, RFC 6666). O padrão de hostname
servido só por Worker, sem origem real, e já usado nesta conta em
`agentes.methodgrowthhub.com.br`. Quem responde de fato é a rota do Worker, que ainda não
existe.

## O que foi medido

Três subdomínios que nunca tiveram registro próprio. Todos resolveram pelo curinga e
fecharam handshake TLS:

| Hostname | Handshake | SANs do certificado |
|---|---|---|
| `zz-teste-tls-01.myportifolio.com.br` | OK | `myportifolio.com.br`, `*.myportifolio.com.br` |
| `joao.myportifolio.com.br` | OK | `myportifolio.com.br`, `*.myportifolio.com.br` |
| `maria.myportifolio.com.br` | OK | `myportifolio.com.br`, `*.myportifolio.com.br` |

```
Emissor:   Google Trust Services
Validade:  até 2026-11-10
Plano:     Free
```

O HTTP responde `522`, e isso é esperado e não contradiz nada: `522` é erro de camada de
aplicação, emitido **depois** do TLS ter fechado, porque não existe Worker nem origem
atrás do `100::`. Quando a rota `*.myportifolio.com.br/*` existir, o Worker intercepta
antes da origem e o `522` desaparece.

## Como reexecutar

Este spike é **portão que se reexecuta**, não pergunta fechada: certificado vence e
configuração de zona muda. Rodar no início da fase 0 e sempre que a zona for mexida.

```bash
for H in zz-teste-tls-01 joao maria; do
  echo | openssl s_client -connect "$H.myportifolio.com.br:443" \
    -servername "$H.myportifolio.com.br" 2>/dev/null \
  | openssl x509 -noout -text 2>/dev/null \
  | grep -A1 "Subject Alternative Name"
done
```

**Reprova se:** o handshake falhar, o certificado não trouxer o SAN
`*.myportifolio.com.br`, ou o registro curinga tiver sumido da zona.

## O que este teste NÃO prova

Universal SSL cobre o apex e **um** nível de subdomínio. `a.b.myportifolio.com.br`
continua descoberto. O slug do cliente já é obrigado a ser rótulo DNS válido (sem ponto),
então nada no produto cai nesse caso, mas **a validação de slug nunca pode afrouxar para
aceitar ponto**. Isso não é preferência de estilo, é o que mantém este spike válido.

## O erro de leitura que quase mudou a arquitetura

Antes do teste, olhei os certificados das outras zonas da conta e vi que todos são por
hostname, sem SAN `*.zona`:

```
methodgrowthhub.com.br                  -> methodgrowthhub.com.br, automotivo..., *.automotivo...
helioportifolio.methodgrowthhub.com.br  -> só ele
area.methodcipher.com                   -> só ele
```

Tratei isso como evidência contra o curinga. A observação estava certa e a conclusão sobre
a causa estava errada: **nenhuma daquelas zonas tem registro curinga**, então nunca houve
motivo para a Cloudflare apresentar um SAN curinga nelas. Certificado por hostname era
efeito da ausência de curinga, não prova de que curinga não funciona.

Fica registrado para ninguém reabrir a discussão com a mesma observação. A lição geral
está em `tasks/lessons.md`.
