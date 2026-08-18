# Renata Vasconcelos, advogada trabalhista: o portfólio de quem não tem print

**URL pública:** https://demo-advogada.myportifolio.com.br
**Editor:** `node scripts/abrir-editor-demo.mjs --slug demo-advogada`
**Data da revisão:** 17/08/2026, contra produção, na versão que estava no ar naquele dia.
**Persona:** Renata Vasconcelos, Direito do Trabalho, contencioso e consultivo, Belo Horizonte.
6 casos, todos SEM IMAGEM. 4 experiências (2 trabalho, 2 estudo). 4 números de capa. 8 áreas de
atuação. Paleta "ouro" (`#c9a227` sobre placa `#0b1220`), fundo "grade técnica".

**Veredito em uma frase:** sim, uma advogada consegue usar isso hoje, a página dela fica digna,
íntegra e no vocabulário certo do lado do visitante, e o que sobrou de errado está quase todo do
lado de dentro (o formulário ainda fala com um programador) e em três lugares onde o texto dela
não cabe no espaço que o produto reservou.

**O que NÃO foi tocado:** nada em `src/`, `worker/`, `supabase/`, `wrangler.jsonc` ou migrations.
Nenhum commit, nenhum deploy, nenhum dado salvo no editor. As leituras de código citadas abaixo
são só leitura. Provas em `out/rev2-advogada-*.png` e `out/rev2-adv-*.txt`.

---

## O que está resolvido

Os oito pontos que a revisão pediu para conferir foram conferidos um a um. Sete passam.

1. **Títulos de seção editáveis, e ela usou os dela. PASSA.**
   A página imprime `ÁREAS DE ATUAÇÃO`, `CASOS E ATUAÇÕES`, `TRAJETÓRIA` e o contador
   `6 casos`. Nenhuma ocorrência de "STACKS DOMINADAS", "MEUS PROJETOS" ou "cases" no texto
   público. Os campos existem em Perfil, sanfona "A PÁGINA": `ed-rotulo_stacks` = "Áreas de
   atuação", `ed-rotulo_projects` = "Casos e atuações", `ed-rotulo_cases` = "casos",
   `ed-rotulo_experience` = "Trajetória". Evidência: `out/rev2-advogada-1440-casos.png`,
   `out/rev2-adv-painel-perfil.txt`.

2. **Selo do perfil. PASSA.**
   Diz `Advogada trabalhista` com ícone de balança (`badge_icon` = `scale`), não "VibeCoder".
   Está no passo 1 do formulário, junto de nome e profissão, e o texto de ajuda hoje cita
   literalmente "Advogada trabalhista" como exemplo (`fieldSchema.js:127`). Evidência:
   `out/rev2-advogada-1440-topo.png`.

3. **Paleta e fundo. PASSA.**
   `ed-theme_preset` = `ouro`, `ed-theme_accent` = `#c9a227`, `ed-theme_plate_bg` = `#0b1220`,
   `ed-background_kind` = `grid`. O ouro aparece onde importa: contorno do selo, borda superior
   da janela do caso, os "check" da lista de resultados. O fundo é a grade de 56px em
   `rgba(255,255,255,.043)`, discreto o bastante para um site jurídico. Nada de roxo de dev
   vazando na página.

4. **Trabalho sem imagem. PASSA, com uma ressalva séria (ver D1).**
   Era o problema principal desta persona e ele foi de fato resolvido na raiz: sem imagem, o
   card **não emite `<img>` nenhum** (`src/modules/projects/components/projectsSection.js:34`),
   ele desenha a placa na cor dela com o título centrado. Sonda: `imgSemSrc: 0`,
   `imgQuebradas: 0` em 1440 e em 375. Não há ícone de figura quebrada, não há buraco cinza, a
   grade de 6 cards fica homogênea e apresentável. No editor, cada item da lista mostra a
   etiqueta `SEM IMAGEM`, que informa sem acusar, e o campo de imagem não tem asterisco.

5. **Rótulo e valor das redes não estão mais grudados. PASSA como bug, falha como resultado.**
   O `gap-3` e o `shrink-0` no rótulo entraram (`profile/components/profilePanel.js:126`), então
   acabou o "Instagram@renata.trabalhista". Só que o conserto foi por reticência, e o efeito
   colateral é o defeito D2 abaixo.

6. **O nome não espreme os números da capa. PASSA.**
   Com "Renata Vasconcelos" e quatro números, o cartão quebra em duas linhas antes de espremer
   qualquer coisa. Medido: os quatro valores (`12`, `340`, `128.447`, `190`) renderizam com
   `whitespace-nowrap` e largura natural, nenhum deles cortado, `scrollWidth === clientWidth`
   nos quatro. Em 375 eles caem em grade 2x2, também inteiros.

7. **Rodapé sem crédito de agência. PASSA.**
   Não existe elemento `footer` na página, e a busca por `/Method Growth|Desenvolvid/i` no
   `innerText` inteiro dá `false`, nos dois tamanhos. A página é dela.

8. **A janela do trabalho fala Direito. PASSA, e é o melhor achado do teste.**
   Abrindo o card "Reversão de justa causa em rede varejista", os blocos são
   `A SITUAÇÃO`, `A TESE E A ESTRATÉGIA`, `O QUE FOI FEITO`, `MATÉRIAS ENVOLVIDAS`. Zero
   ocorrência de "O Desafio", "A Solução", "Recursos" ou "Stack". Evidência:
   `out/rev2-advogada-1440-modal.png`. Vindo de um template de dev, ler uma peça jurídica
   inteira sem uma palavra de software é o resultado mais forte desta persona.

**Sanidade geral:** zero erro de console e zero erro de rede nas duas larguras, zero overflow
horizontal (`scrollWidth - innerWidth = 0` em 1440 e em 375), imagens do perfil em WebP com
`loading="lazy"` no avatar e eager no hero (a ordem certa para o LCP).

---

## Bloqueio

**Nenhum bloqueio absoluto.** A página foi lida inteira, o card foi aberto, os cinco painéis do
editor foram percorridos e todos os formulários abriram.

**Um obstáculo menor, contornado:** com a gaveta `#ed-gaveta` aberta, ela intercepta os cliques
na barra de painéis do topo, e o helper `abrirPainel` de `scripts/_demos/base.mjs` trava com
timeout ao tentar ir direto de um painel para outro. Contornei com `Escape` antes de cada troca.
Para uma pessoa isso não é bloqueio (ela fecha no ×), mas o helper compartilhado dos agentes de
nicho quebra nesse ponto e vale consertar lá. Severidade **baixa**.

---

## Defeito

### D1. Cada card sem imagem imprime o mesmo título duas vezes
**Severidade: alta.**
- *O que fiz:* abri a seção "Casos e atuações" em 1440 e em 375.
- *O que esperava:* um card por caso, com o título uma vez.
- *O que aconteceu:* o título aparece na placa (que substitui a imagem) **e** de novo no rodapé
  do card, em maiúsculas. Seis cards, doze repetições. Em 375 fica pior: o card vira um bloco
  onde a mesma frase aparece duas vezes seguidas, e a segunda ainda vem cortada
  ("RECONHECIMEN…"). Evidência: `out/rev2-advogada-375-casos.png`,
  `out/rev2-advogada-1440-casos.png`.
- *Arquivo:* `src/modules/projects/components/projectsSection.js:36` (a placa emite `${nome}`)
  e a linha 60 (o rodapé emite `${nome}` de novo, sempre). O ramo sem imagem é deliberado e está
  comentado no arquivo, o que faltou foi tirar a duplicata: sem imagem, ou a placa carrega o
  título e o rodapé carrega outra coisa (a frase curta, o ano, o resultado), ou o rodapé some.
- *Por que importa para ela:* é justamente a persona cujo portfólio inteiro cai nesse caminho.
  Um dev com print nunca vê esse bug. Uma advogada vê seis vezes.

### D2. As redes ficam ilegíveis em 1440
**Severidade: média.**
- *O que fiz:* li o cartão de redes em 1440.
- *O que esperava:* "LinkedIn  renata-vasconcelos-adv".
- *O que aconteceu:* "LinkedIn  renata-vasco…" e "Instagram  @renata.tr…". Medido: a coluna tem
  160px, o rótulo e os paddings comem cerca de 95px, e sobram 71px para um valor que precisa de
  115px. Em 375 não trunca, é defeito só de desktop.
- *Arquivo:* `src/modules/profile/components/profilePanel.js:127` (`min-w-0 truncate`). O
  conserto do "grudado" foi feito cedendo o valor à reticência, e o valor é exatamente o
  identificador que o visitante precisa ler. Para uma advogada, o perfil do LinkedIn é
  credencial, não enfeite. Caminho: com uma rede só por linha em 160px, o par rótulo + valor
  deveria empilhar em duas linhas em vez de disputar a mesma linha.

### D3. O botão principal corta a própria palavra
**Severidade: alta.**
- *O que fiz:* li o CTA na coluna direita, em 1440.
- *O que esperava:* "AGENDAR CONSULTA".
- *O que aconteceu:* "AGENDAR CONSU…". Medido: botão de 160px, `.btn-text` com
  `max-width: calc(100% - 60px)` fica com 98px de caixa para um texto que mede 102px. Falta por
  4px. Em 375 o mesmo texto cabe.
- *Arquivo:* `src/styles/global.css:153` a `168`. O comentário do arquivo explica que a
  reticência entrou para evitar a amputação no meio da palavra ("CHAMAR NO WHATSA"), e isso está
  certo, mas a largura ficou pequena demais para praticamente qualquer CTA de duas palavras em
  português. "Agendar consulta", "Falar comigo", "Marcar reunião", "Pedir orçamento": nenhum
  desses cabe com folga. O campo aceita 40 caracteres e o botão exibe uns 15.
- *Gravidade real:* é o único botão de conversão da página. Sair truncado é o pior lugar
  possível para uma reticência.

### D4. O checklist de publicação cobra dela uma coisa que ela não pode entregar
**Severidade: alta.**
- *O que fiz:* cliquei em "Publicar".
- *O que esperava:* uma lista verde, já que a página está completa e no ar.
- *O que aconteceu:* `○ Todos os projetos têm imagem`, o único item não marcado de oito. Ela
  tem seis casos, nenhum com imagem, e nenhum deles pode ter: caso trabalhista não tem print, e
  o que existiria de imagem (petição, acórdão, folha de ponto) é sigiloso.
- *Arquivo:* `src/modules/editor/state/publishState.js:20`.
- *Por que é grave:* o produto tomou a decisão certa no render (card sem imagem é card legítimo,
  está escrito em `projectsSection.js:29`) e a decisão contrária no checklist. As duas telas
  discordam sobre a mesma regra. O resultado é uma página perfeita que se apresenta como
  incompleta para sempre, toda vez que ela abre o modal de publicar. Isso já tinha sido
  registrado no relatório da psicóloga e continua aberto.

### D5. O seletor de cor do card mostra roxo numa página dourada
**Severidade: média.**
- *O que fiz:* abri "Editar" num caso, sanfona "AJUSTES FINOS".
- *O que esperava:* a cor dela, `#c9a227`, ou um estado de "usando a paleta da página".
- *O que aconteceu:* "Cor de destaque do card: **#7C5CFC**" e "Fundo da placa: **#0b0b12**", o
  roxo e o preto que são o padrão de fábrica do portfólio de dev.
- *Arquivo:* `src/modules/editor/data/fieldSchema.js:194-195` (`padrao: '#7C5CFC'`). O render
  está correto e trata esse valor como sentinela: `src/modules/portfolio/lib/ctx.js:62` só usa a
  cor do card quando ela é diferente de `#7c5cfc`, então a página pinta dourado. O defeito é o
  formulário mentindo sobre o que vai sair. Ela vê roxo escrito, a página sai dourada, e não há
  como saber qual manda. Como um `<input type=color>` não representa "vazio", esses dois campos
  precisam de um estado explícito ("segue a paleta da página") em vez de um hex de fábrica.

---

## Atrito

### A1. Renomear uma seção e reordenar a mesma seção ficam em painéis diferentes
**Severidade: média.**
O painel novo "Seções" faz reordenar e esconder. Renomear ("Casos e atuações") está em
Perfil, sanfona "A PÁGINA", que é outro painel, atrás de outra sanfona. São duas decisões sobre
o mesmo objeto em dois lugares que não se citam. Quem entra em "Seções" para trocar o nome da
seção não encontra e conclui que não dá.

### A2. Redes e números da capa são digitados com uma sintaxe de barra vertical
**Severidade: média.**
`Suas redes` é um textarea livre: "rótulo | texto ao lado | https://link". `Números da capa` é
outro: "rótulo | valor". Foi assim que "OAB/MG | 128.447" entrou na página. Funciona, mas é o
único ponto do editor que pede sintaxe em vez de campo, e é onde uma advogada de 50 anos que
comprou a ferramenta para não depender de ninguém vai parar. O resto do editor tem chips com ×
para exatamente esse tipo de lista (as áreas de atuação usam), então o primitivo já existe.

### A3. Um vão morto de 219px na coluna das redes
**Severidade: baixa.**
Medido em 1440: as duas redes terminam em y=439, o botão começa em y=658. Com poucas redes o
`flex-1` combinado com `max-h-16` deixa um buraco preto do tamanho de um cartão inteiro entre a
última rede e o CTA. Quem tem cinco redes não vê isso. Uma advogada tem duas.
Evidência: `out/rev2-advogada-1440-topo.png`.

### A4. A gaveta bloqueia a barra de painéis
**Severidade: baixa.**
Com a gaveta aberta, os botões Perfil / Projetos / Experiência / Seções / Conta continuam
visíveis mas não recebem clique (a `<aside id="ed-gaveta">` intercepta). Visualmente eles
parecem disponíveis. Fechar primeiro resolve, mas o estado "clicável na aparência, inerte no
comportamento" é o pior dos dois mundos.

---

## Buraco de template

### B1. Não existe campo para a OAB
**Severidade: alta.**
É o número de registro profissional, é o que torna a pessoa advogada, é o que o cliente confere
antes de contratar e é obrigatório em material de divulgação pelo Provimento 205/2021 da OAB. Ela
só conseguiu publicar isso porque **enfiou a OAB num slot de "número da capa"**, ao lado de "anos
de atuação" e "casos conduzidos". Fica lá com a mesma tipografia de uma métrica de vaidade, como
se 128.447 fosse um placar. O mesmo buraco vale para CRM, CREA, CRP e CRO: qualquer profissão
regulamentada precisa de um campo de registro que apareça perto do nome, não na régua de números.

### B2. As áreas de atuação passam correndo e não têm peso
**Severidade: média.**
A faixa de especialidades é uma esteira infinita de 40 segundos
(`stacksScroll`, `src/styles/global.css:237`), que só pausa no hover e em `prefers-reduced-motion`.
Para um dev listando "React, Node, Postgres" isso é decoração e funciona. Para uma advogada, as
oito áreas são o **critério de decisão** do visitante: quem chegou com um problema de assédio
moral precisa achar "assédio moral" na hora, e ela precisa poder dizer que o carro-chefe dela é
rescisão, não insalubridade. Hoje não há ordem estável, não há destaque, não há como fixar, não há
como listar em coluna. Só existe esconder a seção inteira (painel Seções). Em 375 chegam a ver 1,5
chip por vez.

### B3. Não há como marcar um caso como confidencial ou anonimizado
**Severidade: média.**
Ela escreveu "Um gerente de loja com nove anos de casa", ou seja, anonimizou na mão, no meio do
texto corrido. O produto tem um switch "Foi para um cliente" que, desligado, some com o nome. O
que falta é o passo à frente: uma marca visível de "caso anonimizado" ou "sob sigilo", que é o
que dá segurança jurídica para ela publicar. Sem isso, o campo "Nome do cliente" é uma armadilha
aberta: preencher com o nome real de uma parte em processo trabalhista é violação de sigilo, e
nada no formulário avisa.

### B4. Números da capa não aceitam texto, só o que parecer número
**Severidade: baixa.**
"128.447" passou porque é numérico. Um registro tipo "OAB/MG 128.447" ou "128.447/MG" no valor
não foi testado aqui, e o rótulo já está gasto com "OAB/MG". Registrado como suspeita, não como
defeito confirmado.

---

## Palavra errada

O produto renomeou as seções da **página** e não renomeou os rótulos do **formulário** que
alimenta essas mesmas seções. O resultado é que a advogada digita, num campo chamado "O que o
sistema faz?", o texto que a página dela vai publicar sob o título "O que foi feito". Todos os
itens abaixo estão em `src/modules/editor/data/fieldSchema.js`.

| Onde | O editor diz | A página dela diz | Severidade |
|---|---|---|---|
| Modal do caso, campo `features` (linha 154) | **"O que o sistema faz?"** | "O que foi feito" | **alta** |
| Modal do caso, campo `stack` (linha 159) | **"Stack usada"** | "Matérias envolvidas" | **alta** |
| Modal do caso, campo `problem` (linha 152) | "O que estava travando antes?" | "A situação" | média |
| Modal do caso, campo `solution` (linha 153) | "O que você entregou?" | "A tese e a estratégia" | média |
| Modal do caso, ajuda de `category` (linha 144) | **"Ex: Landing page, Automação, App."** | (categoria: "Contencioso trabalhista") | **alta** |
| Modal do caso, `image` / `slug` / sanfona (linhas 142, 165) | "Imagem do **case**", "Endereço do **case**", "O CASE" | "casos" | média |
| Modal do caso, `name` (linha 143) | "Nome do **projeto**" | "Casos e atuações" | média |
| Modal do caso, `link` (linha 157) | "Link do projeto **no ar**" | (ela não tem, e nunca vai ter) | média |
| Painel lateral | "Meus **projetos**", "Adicionar **projeto**" | "Casos e atuações" | média |
| Painel Seções | "**Trabalhos** / A grade com as suas **entregas**" | "Casos e atuações" | média |
| Painel Seções | "**Especialidades**" | "Áreas de atuação" | baixa |
| Ajuda de `role` (perfil) | 'Ex: "Desenvolvedor e criador de produtos"' | (ela é advogada) | média |
| Ícone do selo, primeira opção da lista | "**Código**" | (ela usa "Balança") | baixa |

Três observações sobre essa tabela:

1. **"O que o sistema faz?" é o pior de todos.** É a pergunta que uma advogada tem que responder
   para listar "Justa causa revertida por unanimidade em segunda instância". Não existe sistema.
   O rótulo desmonta a confiança de que a ferramenta é para ela, e é o primeiro campo que ela
   encontra depois de já ter renomeado tudo na página.

2. **"Ex: Landing page, Automação, App." aparece no passo 1, no segundo campo obrigatório do
   primeiro caso que ela cadastra.** É o primeiro contato com o formulário de trabalho, e a
   primeira frase diz que o produto é para outra pessoa.

3. **O conserto já existe no próprio arquivo, e a experiência prova isso.** `CAMPOS_EXPERIENCIA`
   resolve rótulo por função (`label: (v) => rotulo('org', v)`), e por isso "Empresa" vira
   "Instituição" e "Cargo" vira "Curso ou formação" quando o tipo é Estudo. O `resolver()` da
   linha 244 já aceita função em qualquer campo. Falta aplicar o mesmo mecanismo em
   `CAMPOS_PROJETO`, com os `rotulo_*` que ela já digitou como fonte: quem escreveu "Matérias
   envolvidas" em "A PÁGINA" deveria ver "Matérias envolvidas" no formulário do caso, e não
   "Stack usada". Enquanto isso não acontece, o editor obriga uma tradução mental a cada campo,
   e é onde a persona da advogada ainda dói.

Fora dessa tabela, a copy do lado público está limpa: nenhum "vibecoder", nenhum "stack", nenhum
"deploy", nenhum "case study" no texto que o visitante lê.
