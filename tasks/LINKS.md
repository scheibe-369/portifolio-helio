# Todos os links

Conferido em 16/08/2026: as dez páginas respondem **HTTP 200**. Todas saem com `noindex` na
meta tag e no header, e estão marcadas como cortesia para não entrarem na conciliação de vendas.

## As dez páginas de nicho

| # | Persona | Profissão | Link |
|---|---|---|---|
| 1 | Marina Salgueiro | Chef de cozinha | https://demo-chef.myportifolio.com.br |
| 2 | Renata Vasconcelos | Advogada trabalhista | https://demo-advogada.myportifolio.com.br |
| 3 | Caio Bertolini | Fotógrafo documental | https://demo-fotografo.myportifolio.com.br |
| 4 | Diego Aranha | Personal trainer | https://demo-personal.myportifolio.com.br |
| 5 | Helena Kuroda | Arquiteta | https://demo-arquiteta.myportifolio.com.br |
| 6 | Bianca Fontes | Psicóloga clínica | https://demo-psicologa.myportifolio.com.br |
| 7 | Vitória Alencar | Produtora musical | https://demo-musica.myportifolio.com.br |
| 8 | Sônia Prazeres | Confeiteira | https://demo-confeitaria.myportifolio.com.br |
| 9 | Adriano Peçanha | Professor de concursos | https://demo-professor.myportifolio.com.br |
| 10 | Rafa Ximenes | Tatuador | https://demo-tattoo.myportifolio.com.br |
| 11 | Teresa Bogado | Confeiteira (nasceu com starter kit) | https://demo-kit.myportifolio.com.br |
| 12 | Wilson Tavares | Corretor de imóveis | https://demo-corretor.myportifolio.com.br |
| 13 | Clarice Bonfim | Cerimonialista | https://demo-eventos.myportifolio.com.br |
| 14 | Zé Ricardo Pimenta | Funileiro e pintor | https://demo-funilaria.myportifolio.com.br |

## O que cada uma existe para quebrar

Se for olhar poucas, olhe nesta ordem: são as que mais revelam.

| Ordem | Página | O que procurar nela |
|---|---|---|
| 1º | **Confeiteira** | A pessoa menos técnica das dez. A página dela diz "MEUS PROJETOS", "6 cases" e "STACKS DOMINADAS" para quem vende bolo. E a foto do iPhone dela nem sobe |
| 2º | **Psicóloga** | Portfólio legítimo com **zero trabalhos**, por sigilo profissional. A página fica de pé, mas o produto insiste que ela cadastre "cases" |
| 3º | **Música** | O trabalho é áudio, e não toca nada: Spotify, SoundCloud e Bandcamp são recusados com "não reconheci este link do YouTube" |
| 4º | **Fotógrafo** | Proporções variadas num corte 3:2 fixo. Veja o que sobrou das fotos |
| 5º | **Arquiteta** | A única que precisa de estética clara. O produto é preto absoluto |
| 6º | **Personal** | Vídeo vertical (Shorts). Abra um card com vídeo |
| 7º | **Tatuador** | Galeria vertical pura, e 19 campos de formulário para uma tatuagem que usa 4 |
| 8º | **Advogada** | Trabalho sem imagem nenhuma: caso jurídico não tem print |
| 9º | **Professor** | Certificado é o centro da credibilidade dele |
| 10º | **Chef** | Prato não tem "link no ar" |

## Relatórios dos agentes

Cinco terminaram. Os outros cinco construíram a página inteira mas foram cortados pela cota da
API antes de escrever o documento.

| Relatório | Arquivo |
|---|---|
| Chef | `tasks/_nichos/demo-chef.md` |
| Confeiteira | `tasks/_nichos/demo-confeitaria.md` |
| Personal | `tasks/_nichos/demo-personal.md` |
| Psicóloga | `tasks/_nichos/demo-psicologa.md` |
| Produtora musical | `tasks/_nichos/demo-musica.md` |
| Advogada, Arquiteta, Fotógrafo, Professor, Tatuador | não escrito (página no ar mesmo assim) |

Consolidado com todos os achados cruzados: `tasks/demos-nichos.md`.

## O produto

| O que | Link |
|---|---|
| Portfólio do Helio (a vitrine) | https://myportifolio.com.br |
| Página de venda | https://myportifolio.com.br/comprar |
| Editor | https://myportifolio.com.br/app |
| Fila de primeira publicação | https://myportifolio.com.br/app/admin/fila |
| Conceder e revogar acesso | https://myportifolio.com.br/app/admin/acessos |

## Como entrar em qualquer uma das demos

O login é por código de 8 dígitos no e-mail, e as contas de demo usam alias do seu Gmail. Para
abrir o editor de uma delas já logado, sem passar por caixa de entrada:

```
node scripts/abrir-editor-demo.mjs --slug demo-confeitaria
```

Isso abre um Chrome real, com a sessão daquela persona, no editor. Ctrl+C fecha.

## Quando terminar de olhar

```
node scripts/limpar-demos.mjs            # mostra o que apagaria
node scripts/limpar-demos.mjs --aplicar  # apaga as dez
```

As dez moram em produção porque não existe ambiente de teste com subdomínio curinga. Enquanto
estiverem lá, ocupam dez slugs e aparecem em qualquer contagem de portfólios.


## O que mudou depois que você olhou

Todas as onze páginas foram refeitas com o produto corrigido. O que era template de programador
virou template de qualquer profissão:

| Antes | Agora |
|---|---|
| "MEUS PROJETOS", "STACKS DOMINADAS", "cases" iguais para todos | cada profissão escreve os títulos das próprias seções |
| Uma cor só, roxo, para todo mundo | 12 paletas, validadas por contraste |
| Fundo preto liso | 7 padrões em CSS puro, mais foto própria |
| Uma foto por trabalho | até oito, em galeria dentro da janela |
| Corte central fixo em toda imagem | enquadramento ajustável |
| Ordem das seções fixa | ordem e visibilidade escolhidas pelo dono |
| Portfólio nascia vazio | starter kit por área monta a página no wizard |
| Selo "VibeCoder" para toda profissão | selo próprio, com 20 ícones |
| Foto de iPhone (HEIC) recusada | sobe |
| Endereço na fila se anunciava à venda | página "quase no ar", sem oferta |
| Campo opcional inválido travava o trabalho inteiro | avisa e grava o resto |
| Crédito da agência no rodapé do comprador | só na vitrine |

**Para ver o antes e o depois do primeiro minuto do produto**, compare `demo-confeitaria`
(montada à mão, antes dos kits) com `demo-kit` (nasceu pelo wizard, já montada).


## Segunda rodada: as três últimas

Escolhidas por hipótese que as onze primeiras não cobriam, e não por variedade. Nenhuma tem
starter kit correspondente, o que também é teste: é o que acontece com quem chega e não se
acha na lista de dez áreas.

| Persona | Hipótese | O que ela provou |
|---|---|---|
| **Corretor** | trabalho é dado estruturado (preço, m², quartos) | a coluna `registro_profissional` estava órfã, quebra de linha sumia em todo texto longo, e não havia como tirar um imóvel vendido do ar sem apagar |
| **Cerimonialista** | o que vende é depoimento de cliente | quatro das seis fotos de casamento eram recusadas no upload, e não existia onde escrever a fala da noiva |
| **Funileiro** | antes/depois, endereço físico, menor letramento digital | não havia campo de endereço nem horário, e o antes/depois não se distingue sem legenda |

**O que saiu dessas três:** registro profissional ligado de ponta a ponta, endereço e horário,
depoimento por trabalho, quebras de linha preservadas, esconder trabalho sem apagar, redução de
imagem antes de recusar, e a correção de uma regressão minha que matava a paleta ao trocá-la.


## O card de identidade, refeito (20/08/2026)

Você olhou a página do corretor e disse que o primeiro card estava com letra cortada, número
fora do lugar e um monte de espaço vazio. Estava mesmo, e dava para medir. Em 1440, o card tem
528px e os quatro números ocupavam de x=756 a x=1016: **218px de preto liso à direita deles**.
O "5" de "Bairros que eu atendo" saía **12px abaixo** do "R$ 1,9 mi" ao lado, porque o rótulo
dele quebrava em duas linhas e empurrava o próprio número. "Tavares Negócios Imobil…" e
"FALAR NO WHATS…" eram cortados por 18px e por 7px. E entre a última rede e o botão havia
**238px de vão vazio**, com a bio de 722 caracteres espremida numa coluna de 310px ao lado.

| O que era | O que é |
|---|---|
| Quatro números viravam uma coluna estreita encostada à esquerda | de quatro em diante viram faixa de largura inteira, com um fio separando |
| Rótulo de duas linhas afundava o próprio número | `items-end` na grade: todos os números na mesma base |
| Valor da rede cortado com reticência | desce uma linha e aparece inteiro |
| Rótulo do botão cortado no meio da palavra | cabe, e quebra em duas linhas se precisar |
| Bio numa coluna de 310px com 238px de vão do lado | com menos de quatro redes, a bio ocupa a largura inteira e as redes viram fileira |
| Rede era só texto | símbolo da marca, tirado do próprio link |
| Logo da trajetória recortada em quadrado no upload | encaixada inteira; foto preenche a placa |

**Medido nas oito páginas, em 360, 768 e 1440:** nenhum valor cortado, nenhum número fora de
linha, nenhuma barra de rolagem horizontal.

**A sua página não mudou**, e isso foi verificado e não suposto: 0 diferenças de DOM, e no
teste de pixel só 361 pixels em 5 milhões, todos no rótulo do botão "Agendar Call", que subiu
1px e passou a ficar no centro exato do botão. O símbolo das redes **está desligado na sua**;
é um interruptor no editor ("Mostrar o símbolo de cada rede"), ligado por padrão só para quem
comprar daqui pra frente.
