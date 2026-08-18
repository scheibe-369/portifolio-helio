# demo-tattoo · Rafa Ximenes, tatuador blackwork e fineline (Porto Alegre, RS)

**URL:** https://demo-tattoo.myportifolio.com.br (200, sem erro de console em 1440 nem em 375)
**Data:** 17/08/2026 (revisão 2, sobre o produto já corrigido)
**Persona:** blackwork e fineline, estúdio próprio no Bom Fim, agenda pelo direct do Instagram
**O que ela existia para quebrar:** galeria vertical pura, Instagram como O canal, e um formulário de 19 campos para uma tatuagem que usa 4

**Veredito:** um tatuador consegue montar e publicar a página hoje, e o formulário deixou de ser o problema, mas o produto continua **destruindo a foto dele no upload**: toda imagem de trabalho é cortada para 3:2 deitado antes de sair do navegador, e uma tatuagem de braço nasce sem o braço.

Observação de método: o produto foi redeployado no meio desta revisão. A linha de destaque (`highlight`) não pintava na primeira passada e passou a pintar na segunda, com o mesmo dado. Tudo abaixo é a segunda passada.

---

## A seção sobre foto vertical na grade (o teste central)

Este é o achado que organiza todo o resto.

### Os números

As oito fotos que o Rafa sobe são **1000x1500, retrato**, todas (conferido nos arquivos de origem, `out/midia/demo-tattoo/tat-*.jpg`). O que o servidor guarda depois do upload:

| arquivo | entrada | o que ficou armazenado | perda |
|---|---|---|---|
| `project/fechamento-de-braco-*.webp` | 1000x1500 retrato | **1000x667 deitado** | 833 de 1500 linhas, 55% da foto |
| `hero/rafa-ximenes-*.webp` | 1000x1500 retrato | 800x1000 retrato (4:5) | mantém o retrato |
| `avatar/rafa-ximenes-*.webp` | 800x800 | 512x512 | quadrado, correto |

A causa está em `src/modules/media/lib/imagePipeline.js:57`:

```js
project: { pasta: 'project', proporcao: 3 / 2, lado: 1200, orcamento: 90 * 1024 },
```

O crop é **central, fixo e destrutivo**: acontece em canvas no navegador, antes do upload, e o original nunca é guardado. O `hero` já ganhou proporção retrato (`4 / 5`), o `certificate` já ganhou `proporcao: null` (não corta documento). O `project` continuou 3:2, que é a proporção de um screenshot de sistema, que é o que o portfólio de origem tinha ali.

Prova visual em `out/rev2-tattoo-corte-3x2.png`: a foto inteira do fechamento de braço, a faixa vermelha marcando o único pedaço que sobrevive, e o que sobra no card. A mão e o ombro, os dois pontos onde um fechamento começa e termina, ficam fora.

### O enquadramento não conserta, e não podia consertar

"Enquadramento da imagem" (`image_position`) chegou como o controle que salvaria a foto vertical. Ele age **depois** da destruição, e sobre um arquivo que já é 3:2:

- Card em 1440: caixa da imagem **336x208** (proporção 1,615). O arquivo 3:2 (1,499) escalado para 336 de largura dá **224 px** de altura. Sobra de corte: **16 px**. O curso inteiro do slider, de 0 a 100, move a foto 16 px, 7% da altura do card.
- Card em 375: caixa **141x176**, ou seja **retrato**. O arquivo é deitado, então nesse tamanho ele transborda **na horizontal**. O controle grava só o eixo Y (`primitivos.js:173`, `'50% Y%'`), logo **no celular o slider não move nada**. E celular é onde mora o tráfego de um tatuador.

O resultado é visível em `out/rev2-tattoo-grade-375.png`: "Retrato em pontilhismo" vira 60% tecido de camiseta e uma costura, o retrato sumiu; "Borboleta no punho" mostra uma mão e um óculos, a borboleta ficou fora do quadro por cima.

### A galeria repete o mesmo erro, e sem o controle

A galeria de até 8 fotos existe e é uma boa decisão de produto (mora dentro da janela, os slots nascem um de cada vez). Mas:

1. Os slots usam `destino: 'project'`, então **as 8 fotos da galeria também são cortadas para 3:2 deitado** no upload.
2. Na janela, cada foto vai numa caixa `aspect-[3/2]` com `object-cover` e **sem `object-position`** (conferido no bundle em produção, `out/rev2-ctx.js`). O enquadramento por imagem não alcança a galeria: existe um controle para a capa e nenhum para as outras oito.

### O que precisaria existir

1. **Proporção por dono, não por destino fixo.** Um seletor no passo 1 do trabalho, "Retrato (4:5) / Quadrado (1:1) / Deitado (3:2)", gravado no projeto e usado tanto pelo `DESTINOS.project` quanto pela caixa do card e pela caixa da galeria. A infraestrutura já existe em dois lugares: `hero` já é 4:5, e `youtube_orientation` já faz exatamente essa decisão para vídeo em `projectModal.js` (`aspect-[9/16]` literal contra `aspect-video`). É a mesma decisão, num terceiro eixo.
2. **Se um seletor for muito, o barato é trocar o padrão.** Um portfólio de tatuador, fotógrafo, confeiteira, arquiteta e chef sobe foto vertical de celular. `project: { proporcao: 4/5 }` erra menos gente do que 3:2 erra hoje.
3. **`object-position` na galeria também.** Uma linha, reusando `safePosition`, com um campo por foto ou um único para todas.
4. **Enquadramento nos dois eixos.** Enquanto a caixa do card for retrato no celular e deitada no desktop, um controle só de Y é meio controle.

**Severidade: gravíssimo.** É perda de dado do comprador, irreversível (o original não fica em lugar nenhum) e atinge todo nicho visual, não só tatuagem.

---

## O que está resolvido

Tudo o que a revisão 1 apontou como palavra de programador e como cara de template foi de fato corrigido. Vale registrar item a item, porque é muito.

- **Títulos próprios em toda a página.** "TRABALHOS / 8 tattoos", "TRAJETÓRIA / 2 passagens", "ESTILOS", "SOBRE". Nada de "Meus Projetos", "cases" ou "Stacks Dominadas" na página publicada.
- **Os rótulos da janela do trabalho também.** "A ideia do cliente", "Como ficou", "O que está incluso", "Técnica", "Ver no Instagram". Os cinco campos de `rotulo_*` cobriram a janela inteira.
- **Selo "Tatuador"** com ícone `pen-tool`, no passo 1 do perfil, ao lado do nome. Fora do bump, sem dizer "vibecoder".
- **Fundo "vinheta"** aplicado, discreto, e o texto branco continua legível por cima.
- **A foto preenche o card.** `image_fit: cover` é o padrão e o card não tem mais placa colorida sobrando nem `src=""` quebrado.
- **Galeria de até 8 fotos por trabalho existe no formulário**, com os slots nascendo um de cada vez. A decisão de colocá-la dentro da janela, e não na grade, está certa.
- **Enquadramento por imagem existe** (ainda que, pelo que está acima, quase não tenha o que enquadrar).
- **As redes não têm mais texto grudado.** Cada uma é um botão com rótulo e valor separados. (Virou outro problema, ver Defeito D3.)
- **Rodapé sem "Desenvolvida por Method Growth Hub".** A página publicada não tem `<footer>` nenhum, e o crédito não aparece em lugar algum do HTML.
- **Painel "Seções"** funciona: Trabalhos, Experiência e Especialidades, com subir, descer e esconder, e uma frase honesta explicando que conteúdo escondido continua guardado.
- **Linha de destaque na grade.** "Sessão de 3h · orçamento pelo direct" aparece no card **antes** do clique, que é o comportamento certo para quem vende encomenda.
- **A página abre em 375 sem rolagem horizontal** (`scrollWidth 375 = viewport 375`), e sem um único erro de console nas duas larguras.

---

## Bloqueio

Nenhum. Nada impediu montar, salvar ou publicar as oito tatuagens, e a página está no ar respondendo 200. A revisão anterior tinha bloqueio; esta não tem.

---

## Defeito

### D1. Toda foto de trabalho é cortada para 3:2 deitado no upload, sem volta `[gravíssimo]`

Detalhado na seção acima. Um tatuador que sobe oito fotos de braço perde 55% de cada uma, e nenhum controle do produto devolve o que foi jogado fora.

### D2. "Projetos por página" não faz nada `[grave]`

O Rafa escolheu **8** no perfil. O valor salva, publica no payload (`perPage: 8`, conferido em `out/rev2-tattoo-payload.json`) e chega ao navegador. A página mostra **6** e um paginador "1 / 2": duas das oito tatuagens ficam atrás de uma seta.

A causa é uma constante:

```js
// src/modules/projects/components/projectsInteractions.js:12
const PER_PAGE = 6;
```

No bundle em produção ela aparece como `var f=6`. Ninguém lê `perPage`. É um campo que o comprador vê, escolhe, salva e não recebe. **É a mesma classe de bug do commit "o que o comprador pagou e não recebia", em outro campo.**

Efeito colateral: o **editor mostra as oito** na grade e a página publicada mostra seis. O editor mente sobre o que o visitante vê.

*Nota de 17/08, fim da revisão:* já existe conserto na árvore de trabalho (`perPageDoDom()` lendo `data-per-page` do `#project-count`), ainda não publicado. Medido no ar, o defeito continua de pé.

### D3. As quatro redes e o botão de CTA são truncados em 1440 `[grave]`

Medido no DOM (`out/rev2-tattoo-filtro.json`, `scrollWidth` contra `clientWidth`), print em `out/rev2-tattoo-redes.png`:

| o que ele escreveu | o que o visitante lê | largura pedida / disponível |
|---|---|---|
| `@rafaximenes.tattoo` | `@rafaxime…` | 101 / 63 px |
| `(51) 99612-4408` | `(51) 99612…` | 79 / 61 px |
| `Bom Fim, Porto Alegre` | `Bom Fim, Port…` | 109 / 77 px |
| `Minhas referências` | `Minhas refer…` | 91 / 70 px |
| `Chamar no direct` (botão) | `CHAMAR NO DIRE…` | botão |

O @ do Instagram é o dado mais importante da página de um tatuador, e é o que está cortado. Pior: **o número do WhatsApp aparece truncado**, e número de telefone pela metade não é "texto encurtado", é informação errada. Quem lê no desktop não consegue copiar o contato; precisa clicar e sair da página para descobrir.

Isso é uma regressão de forma: a correção anterior separou rótulo e valor (resolveu o texto grudado) e criou o truncamento, porque a coluna da direita tem cerca de 180 px em 1440. Conserto: deixar o valor quebrar em duas linhas, ou dar a largura da coluna do "SOBRE" para o bloco de redes quando houver 4 ou mais.

### D4. A paleta "Sangue" foi escolhida e a página continua roxa `[grave]`

No editor, "Paleta da página" está em **Sangue**. No payload publicado:

```json
"theme": { "accent": "#7C5CFC", "preset": "sangue", "plateBg": "#0b0b12", "background": {"kind": "vinheta"} }
```

O preset `sangue` é `accent #FF4D4D` / `plate #0F0A0A`. Nenhum dos dois chegou. O resolvedor de tema faz `accent: explicito || preset.accent`, e os campos "Cor de destaque" e "Fundo das placas" gravam o **padrão** `#7C5CFC` / `#0b0b12` em vez de nulo. O valor padrão, que ninguém escolheu, vence o preset, que alguém escolheu.

Resultado visível: o anel do selo "Tatuador", a borda superior da janela do trabalho e a pílula de destaque saem **roxos** numa página cuja identidade é preto e vermelho sangue (ver `out/rev2-tattoo-375-modal.png`).

Agrava: os dois campos de cor estão atrás do cadeado "Personalização". Um comprador sem o add-on **não consegue nem corrigir**: ele escolhe a paleta no campo aberto e ela é anulada por dois campos que ele não pode tocar.

### D5. A janela publica dois títulos com nada embaixo `[médio]`

Sete dos oito trabalhos não têm lista de itens nem lista de técnicas (`features: []`, `stack: []`, no payload). "O que está incluso" e "Técnica" são renderizados **sem condição** em `projectModal.js`, ao contrário de "A ideia do cliente" e "Como ficou", que passam por `block()` e somem quando vazios. O visitante lê dois cabeçalhos órfãos (print: `out/rev2-tattoo-modal-1.png`, `out/rev2-tattoo-375-modal.png`).

Conserto: as duas listas passarem pela mesma guarda de vazio que os dois blocos de texto já têm.

### D6. Os grupos de filtro aparecem como slug para o visitante `[médio]`

O menu de filtro mostra, literalmente: `braco`, `blackwork`, `fineline`, `pontilhismo`, `ombro`. Minúsculo e sem cedilha, porque `projectsApi.js:94` passa cada chip por `slugify()` e `draftState.js:182` usa a própria chave como rótulo (`label: { pt: k }`). O que ele digitou como "Braço" o cliente dele lê como "braco". Um endereço interno virou texto de interface.

---

## Atrito

### A1. O enquadramento está a quinze campos de distância da foto `[médio]`

A foto do trabalho é o **primeiro** campo, no passo "O básico". "Enquadramento da imagem" é o **penúltimo**, no passo "Ajustes finos", atrás de "Endereço do case" e "Como a imagem se encaixa". Para o nicho onde o enquadramento é a decisão mais importante do card, ele está no lugar reservado ao que quase ninguém abre.

### A2. Em projeto novo, o enquadramento nem existe `[médio]`

Medido: num trabalho recém-criado, "Ajustes finos" traz **4** campos e `image_position` não está entre eles; num trabalho já salvo, traz **5** e ele aparece. A condição é `image_fit !== 'contain'`, e num rascunho novo `image_fit` ainda não tem valor. Ou seja: quem sobe a foto e enquadra na mesma sessão, que é o caminho natural, não encontra o controle.

### A3. A galeria mora em "Provas", longe da foto de capa `[baixo]`

Para o Rafa, as oito fotos **são** o trabalho, não a prova dele. Elas ficam no passo 3, depois de vídeo do YouTube, link do projeto no ar e stack. Ele sobe a capa no passo 1 e precisa atravessar dois passos e quatro campos de software para subir a segunda foto da mesma tatuagem.

### A4. A linha de destaque desalinha a fileira `[baixo]`

Só o primeiro trabalho tem destaque preenchido. Medido: os cards 1, 2 e 3 ficam com **265 px** e os 4, 5, 6 com **250 px**. A grade estica a fileira inteira pela altura do card mais alto, e os cards 2 e 3 ganham um vazio embaixo do título. No celular a linha ainda trunca: `Sessão de 3h · orç…`.

---

## Buraco de template

O que um tatuador precisa e não existe em campo nenhum. Ordenado pelo que ele perguntaria primeiro.

1. **Cicatrizado x fresco `[alto]`.** Toda foto de tatuagem tem essa etiqueta no mundo real, e ela é a diferença entre "olha como eu tatuo" e "olha como meu traço envelhece", que é literalmente o argumento de venda dele ("se não vai continuar legível daqui a quinze anos, eu não faço"). Não há campo, não há etiqueta, não há como dizer isso. É o buraco mais barato de fechar: um switch por foto da galeria, ou um par de grupos.
2. **Região do corpo `[médio]`.** Ele conseguiu improvisar com "Grupos de filtro" (`braco`, `ombro`), mas o filtro tem **teto de 4 grupos por trabalho** e ele já gasta 1 ou 2 com o estilo. Braço, perna, costas, costela, mão e pescoço não cabem junto com blackwork, fineline e pontilhismo. E o improviso é o que produz o defeito D6.
3. **Tempo de sessão e orçamento `[médio, parcialmente resolvido]`.** A linha de destaque cobre isso como texto livre ("Sessão de 3h · orçamento pelo direct") e aparece na grade, que é o certo. O que falta é campo estruturado: horas, número de sessões e faixa de preço não são compará­veis nem filtráveis enquanto forem uma frase.
4. **Instagram como canal, e não como item da lista `[médio]`.** O produto deixa ele chegar perto: o botão principal aponta para `ig.me/m/...`, o texto é "Chamar no direct", o rótulo do link do trabalho virou "Ver no Instagram" e o Instagram é a primeira rede. Mas: o botão de direct é o **quinto** item de uma coluna estreita, abaixo do Pinterest; o painel "Seções" governa só Trabalhos, Experiência e Especialidades, então **não dá para subir o bloco de contato**; e não existe nada que exiba o feed nem que marque uma rede como principal. Para quem vive de direct, o direct devia ser o elemento mais alto da página depois do nome.
5. **Consentimento e crédito da foto `[baixo]`.** A foto é do corpo de um cliente. Não há campo para "autorizo publicar" nem para creditar quem fotografou. Não bloqueia hoje, mas é o tipo de coisa que vira problema depois de vender.
6. **Agenda ou fila `[baixo]`.** "Fila de espera: 2 meses" coube num "Número da capa", o que funcionou bem. Nada a fazer aqui por enquanto.

---

## Palavra errada

Rótulos que continuam falando do portfólio de programador de onde o produto nasceu. **Todos** aparecem no formulário do trabalho, que é onde ele passa 90% do tempo.

| onde | está escrito | o que é, para ele |
|---|---|---|
| Trabalho, passo 3 | **Stack usada** | ele já renomeou a exibição para "Técnica" e o formulário continua dizendo Stack |
| Trabalho, passo 2 | **O que o sistema faz?** | não existe sistema; é o que a tatuagem tem |
| Trabalho, passo 3 | **Link do projeto no ar** | tatuagem não fica "no ar" |
| Trabalho, passo 3 | **Vídeo no YouTube** | o vídeo dele é reels; YouTube é o único aceito |
| Trabalho, passo 1 | **Imagem do case** / **Nome do projeto** | é foto, e é tatuagem |
| Trabalho, ajustes finos | **Endereço do case** | |
| Trabalho, passo 1 | Categoria, *"Ex: Landing page, Automação, App."* | o exemplo é literalmente de uma agência de software |
| Trabalho, passo 3 | **Grupos de filtro** | vocabulário de painel, não de pessoa |
| Cabeçalho da gaveta | **Novo projeto** | |
| Perfil, passo 3 | **Projetos por página**, **Projetos com vídeo primeiro** | (e o primeiro nem funciona, ver D2) |

O padrão: a **página** já fala a língua do dono, porque os `rotulo_*` cobriram tudo o que o visitante lê. O **formulário** não fala, e não tem como falar: não existe rótulo configurável para os campos do editor. Quem paga vê "Stack usada" para sempre. Sugestão de menor esforço, ligada ao selo que ele já preencheu: quando `badge_label` ou a profissão do wizard existirem, trocar seis rótulos por um conjunto neutro, "O que você usou", "O que ficou pronto", "Link", "Vídeo", "Foto do trabalho", "Etiquetas". Neutro erra menos que específico de software.

Um acerto no meio disso, que merece registro: a ajuda de "Como você chama cada trabalho" já usa **"tatuagens"** como exemplo, e a de "Preço, prazo ou condição" usa **"Sessão de 3h"**. Alguém já pensou nele ali.

---

## Contagem de campos por tatuagem

Medida no editor em produção, não no código.

| situação | campos na tela |
|---|---|
| Tatuagem nova, gaveta como ela abre | **5** (foto, nome, categoria, preço/prazo/condição, uma frase) |
| Tudo expandido, galeria vazia | **19** |
| Tudo expandido, galeria com as 8 fotos | **26** |
| Teto absoluto (com cliente e observação do link) | **28** |

Os três passos, "O case", "Provas" e "Ajustes finos", **nascem fechados** (`aberto: false` nos três, medido). E o cabeçalho da gaveta diz: *"Preencha só o básico e ele já aparece na grade."*

**O que o Rafa preenche de verdade por tatuagem: 5 a 7.** Foto, nome, categoria, preço/prazo, a frase. Mais ano e um ou dois grupos de filtro, se quiser a barra de filtro. Depois, N uploads de galeria, que são um botão repetido, não um campo novo para decidir.

**O formulário ficou pior? Não. Ficou melhor, mesmo tendo mais campos.** Antes eram 19 campos empilhados e ele usaria 4. Agora o teto subiu para 26 e o **piso caiu para 5**, que é o número que importa: é o que aparece quando ele abre a gaveta. Os passos não são decoração, eles de fato escondem: os 14 campos de software (`problem`, `solution`, `features`, `video`, `link`, `stack`, `tem_cliente`, `year`, `groups`, `slug`, `image_fit`, `image_position`, `accent`, `plate_bg`) estão todos atrás de um `summary` fechado, e um trabalho publica sem nenhum deles. A galeria acompanha a mesma regra: um slot na tela, e o oitavo só existe se o sétimo tiver foto.

**Ele terminaria as 8 tatuagens? Sim.** Cinco campos curtos e um upload por tatuagem, sem nenhum campo obrigatório que ele não saiba responder (só nome e categoria têm asterisco). O que o faria parar não é o formulário: é abrir a página publicada e ver que as fotos foram cortadas.

---

## Prints

| arquivo | o que mostra |
|---|---|
| `out/rev2-tattoo-corte-3x2.png` | **a prova do corte 3:2**: original 1000x1500, a faixa que sobrevive, e o card |
| `out/rev2-tattoo-1440-topo.png` | topo em 1440: selo, números, redes, "TRABALHOS / 8 tattoos" |
| `out/rev2-tattoo-grade-1440.png` | a grade em 1440, com a linha de destaque e o paginador "1 / 2" |
| `out/rev2-tattoo-grade-375.png` | a grade em 375: a caixa do card é retrato e o arquivo é deitado |
| `out/rev2-tattoo-redes.png` | as quatro redes e o CTA, todos truncados |
| `out/rev2-tattoo-modal-1.png` | janela do trabalho: foto de 62x62 e dois títulos vazios |
| `out/rev2-tattoo-375-modal.png` | a mesma janela no celular, com a borda roxa da paleta que não aplicou |
| `out/rev2-tattoo-ed-03-projeto-todos-passos.png` | editor com a gaveta do trabalho e os oito cards na grade |
| `out/rev2-tattoo-ed-04-secoes.png` | painel "Seções" |
| `out/rev2-tattoo-payload.json` | payload publicado (tema, perPage, highlight, gallery) |
| `out/rev2-tattoo-editor.json`, `out/rev2-tattoo-sonda.json` | contagem de campos e valores do tema, medidos no editor |
