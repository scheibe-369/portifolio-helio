# demo-eventos · Clarice Bonfim, cerimonialista de casamentos (Belo Horizonte, MG)

**URL:** https://demo-eventos.myportifolio.com.br (publicada, na fila de conferência; a página de verdade está no link de prévia)
**Data:** 18/08/2026 · segunda rodada de nichos
**Tempo:** cerca de 1h05, do primeiro login à publicação, sem contar a escrita deste relatório
**Persona:** doze anos de estrada, 214 casamentos, um casamento por fim de semana, nove em cada dez clientes chegam por indicação de outra noiva
**O que ela existia para quebrar:** o produto dela é **prova social** e **data do evento**. Não existe seção de depoimento em lugar nenhum do template, não existe campo de data por trabalho, e nenhuma das onze personas anteriores dependia da palavra de um cliente.

**Veredito:** ela consegue montar e publicar uma página bonita hoje, e ela **não consegue vender com ela**, porque a única frase que fecha contrato na profissão dela ("a Clarice salvou o meu casamento") não tem lugar nenhum onde caiba com autoria, e some inteira da primeira tela.

---

## A seção sobre prova social (o teste central)

### O que eu tentei, uma por uma

Percorri o produto inteiro procurando onde um depoimento de noiva caberia. São **cinco esconderijos possíveis** e nenhum é um lugar. Testei os quatro que aceitam texto livre, um em cada casamento, e medi o resultado no render de verdade (`out/eventos-janelas.json`).

| tentativa | onde | o que aconteceu | por que ficou ruim |
|---|---|---|---|
| 1 | **`features`**, a lista "O que estava incluso" (Marina e Tiago) | entrou inteiro, 172 caracteres, com autoria | a fala da noiva vira **o sexto item de uma lista de entregáveis**, com o mesmo marcador de "Equipe de quatro pessoas no dia". O depoimento passa a ser uma coisa que a Clarice vendeu |
| 2 | **`solution`**, o bloco "Como foi o dia" (Júlia, Larissa, Isabela) | entrou inteiro | mesma fonte, mesma cor, mesmo parágrafo da voz da Clarice. Lido de cima para baixo, **ela parece estar se elogiando na terceira pessoa**. Não há nada que diga ao visitante que quem fala mudou |
| 3 | **`tagline`**, "Uma frase sobre ele" (Bruna e Otávio) | **cortado**: 286 caracteres pedidos, 280 aceitos, e o que caiu foi o fim da autoria ("Bruna Nogueira," e acabou) | o campo tem que servir à frase da Clarice **e** à frase da noiva no mesmo espaço. Quem perde é sempre a segunda |
| 4 | **`link_note`**, "Observação sobre o link" (Camila e Pedro) | **cortado no meio da palavra**: 146 pedidos, 120 aceitos, terminou em "quando vi as fot" | e só existe se houver um link. Casamento não tem URL: **eu tive que inventar um link** (o Instagram dela) para o campo nascer. O depoimento fica pendurado ao lado do botão "Ver o álbum" |
| 5 | **`stats`**, "Números da capa" | testei e **desfiz** | o campo é par `rótulo \| valor` e a frase simplesmente não renderiza (`out/eventos-depoimento.json`, linha 5: `renderizou: false`) |

E duas portas que nem abrem:

- **Painel "Seções"**: só reordena e esconde as três que existem (`stacks`, `projects`, `experience`). **Não há botão de criar seção**, e o código confirma que a lista é fechada (`src/app/secoes.js:8`, `ORDEM_PADRAO`).
- **Perfil**: censo dos 36 campos do perfil, zero encostam em prova social (`out/eventos-censo-perfil.txt`).
- **Formulário de trabalho**: censo dos 19 campos, zero encostam em prova social (`out/eventos-censo-projeto.txt`).

### O achado que resume tudo

**Nenhum dos seis depoimentos aparece na grade.** O card publicado mostra três coisas: categoria, nome e a linha de destaque. Tudo mais mora **atrás de um clique**. Medido em `out/eventos-grade.json`:

```
[marina-e-tiago-na-serra-do-cipo] CASAMENTO NO CAMPO | MARINA E TIAGO, NA SERRA DO CIPÓ | 12 de outubro de 2025 · 180 convidados
```

Ou seja: numa profissão que é vendida por indicação, **a página não tem uma única palavra de terceiro na primeira tela**. A prova social que existe é indireta e escrita pela própria Clarice: "Noivas que indicaram: 9 em 10", enfiado num slot de "Números da capa".

### A data do evento

Não existe campo de data. Existe um `select` de **Ano** com 25 opções. Enfiei a data por extenso no campo `highlight`, cujo rótulo é **"Preço, prazo ou condição"** e cuja ajuda dá exemplos de preço ("A partir de R$ 180").

**O seletor de ano não basta, e por três razões concretas:**

1. **"2025" não é um casamento.** A profissão inteira se organiza por data: a noiva pergunta "você tem 12 de outubro livre?", não "você tem 2025 livre?". Um portfólio com quatro casamentos em 2025 e nenhum com dia mostra quatro vezes o mesmo número.
2. **A gambiarra funciona visualmente e some no celular.** No desktop o card mostra `12 de outubro de 2025 · 180 convidados` numa pílula colorida, e ficou bom. Em 390px o card tem 150px de largura e a linha é cortada: `22 de março de 202…`, `15 de novembro de …`, `7 de dezembro de 2…`. **A única informação de data da página perde o ano exatamente onde a noiva chega, que é o link do Instagram no celular.**
3. **Nada usa a data.** A grade não ordena por ela, o filtro não filtra por ela, e a janela do trabalho ainda imprime o ano de novo, cru, no cabeçalho: `CASAMENTO NO CAMPO · 2025 · MARINA E TIAGO`, logo acima de `12 de outubro de 2025`. O mesmo ano, duas vezes, em dois formatos.

### O que precisaria existir

Três coisas, em ordem de valor. Sou concreto de propósito: isto vira requisito.

**1. Campo `testimonial` por trabalho** (o mínimo que resolve 80% do problema)

Três subcampos no passo "Provas", logo abaixo da galeria:

- `testimonial_text`, textarea, até **400** caracteres (400 e não 280: o depoimento útil é o que conta um episódio, e os quatro que escrevi aqui têm 120 a 175);
- `testimonial_author`, texto, até 60 ("Marina Rezende");
- `testimonial_role`, texto, até 40 ("noiva", "mãe do noivo", "pai da noiva").

**Quem escreve:** a dona da página, copiando do WhatsApp. É assim que a profissão já funciona, e qualquer coisa que exija a noiva voltar num link para digitar não vai acontecer. Consentimento é responsabilidade dela, igual ao nome do cliente que o produto já pede.

**O que aparece:** dentro da janela do trabalho, **em bloco citado visualmente distinto** (barra na cor de destaque, itálico, aspas curvas, autoria em linha própria e menor). O ponto inteiro é o visitante saber, sem ler, que quem fala mudou. Um por trabalho: dois viram parede de texto.

**Sem foto e sem estrelas.** Foto de terceiro é direito de imagem, e estrela pede um sistema de avaliação que o produto não tem e cuja credibilidade seria zero por ser auto-declarada.

**2. Seção `testimonials`, quarta entrada do painel de Seções**

Depoimentos avulsos, **não presos a um trabalho**: a maioria das indicações de uma cerimonialista vem de casamentos cuja foto ela não pode publicar. De **3 a 12**, cada um com os mesmos três subcampos acima mais um `context` opcional ("Casamento em Tiradentes, novembro de 2024"). Renderiza como grade de cartões, dois ou três por linha no desktop, carrossel no celular. Precisa ser reordenável e escondível como as outras três, e precisa entrar em `ORDEM_PADRAO` **ligada**, que é a regra 3 de `secoes.js` (seção nova nasce visível para quem já publicou).

**3. Um depoimento marcável como destaque, que sobe para o topo**

Um `switch` "Mostrar na capa" em exatamente um depoimento, que o renderiza no card do perfil, ao lado dos "Números da capa". É o item que muda o resultado comercial: hoje **a prova social só existe depois de um clique**, e a decisão da noiva acontece na primeira tela.

**4. Campo `event_date`, data de verdade, por trabalho**

Tipo `date`, opcional. Quando preenchido: renderiza por extenso ("12 de outubro de 2025"), **passa a ser a chave de ordenação padrão da grade**, e o `year` vira derivado dele em vez de um segundo campo que a pessoa preenche de novo. Quando vazio, tudo continua como hoje. Isso libera o `highlight` para o que ele é ("A partir de R$ 12.000", "Agenda aberta para 2027"), que uma cerimonialista também tem e hoje não pode dizer, porque o campo está ocupado pela data.

---

## A pergunta "Sua área", para quem não está na lista

O wizard oferece **dez opções e nenhuma é evento**: Chef/Gastronomia, Advocacia/Direito, Fotografia, Personal trainer/Saúde, Arquitetura/Interiores, Psicologia/Terapia, Música/Áudio, Confeitaria/Food, Professor/Educação, Tatuagem/Arte (`out/eventos-areas.json`). Busquei por evento, casamento, cerimonial, festa, noiva e assessoria nos dez rótulos: nenhum acerto.

**O que eu fiz:** escolhi **"Confeitaria / Food"**, que é a única cujo vocabulário encosta em festa de casamento (o kit tem "Bolo de casamento" nas especialidades e "A festa" como rótulo). Não escolhi "Prefiro começar do zero" de propósito: quem acabou de pagar não quer cair numa tela em branco, e queria medir o preço da escolha errada.

**O preço:** a página nasceu dizendo que a Clarice é **Confeiteira**, com a seção de trabalhos chamada **"Meus doces"**, contador em **"encomendas"**, paleta rosa, fundo pontilhado, quatro especialidades sobre brigadeiro e um trabalho de exemplo chamado "Bolo de casamento de três andares" (`out/eventos-canvas-recem-nascido.png`). São **17 itens herdados** para desfazer, espalhados por três painéis: 1 selo, 1 paleta, 1 fundo, 9 rótulos de seção, 4 especialidades, 1 bio de exemplo, mais um projeto e uma experiência de exemplo.

O script desfez em 15 segundos. Uma pessoa não: ela precisa **descobrir que cada um daqueles textos é do kit e não do produto**, e "Meus doces" não vem com nenhuma marca dizendo que dá para trocar. Pior, um dos 17 (a paleta) **não dá para desfazer pelo caminho normal**, ver D2.

Conclusão prática: para quem não está entre as dez áreas, **"Prefiro começar do zero" é hoje a opção certa, e o wizard não diz isso**. O texto de ajuda diz "Deixa a página já montada com os textos da sua área", o que empurra na direção contrária.

---

## Bloqueio

### B1. Não existe seção de depoimentos e não há como criar uma `[gravíssimo]`

Único bloqueio real, e é o motivo desta persona existir. O painel "Seções" tem três itens fixos e nenhum botão de adicionar (`out/eventos-secoes.txt`, `src/app/secoes.js:8`). Os quatro esconderijos que testei estão na tabela lá em cima: todos custam autoria, limite de caracteres ou os dois. Segui e registrei, como manda a regra.

---

## Defeito

### D1. Quatro das seis fotos de casamento foram recusadas no upload `[gravíssimo]`

- **O que fiz:** subi seis capas de casamento e trinta fotos de galeria, todas 1400px de lado maior, JPEG de Unsplash, entre 74 KB e 818 KB.
- **O que esperava:** que o pipeline reduzisse e aceitasse, como aceitou as trinta e poucas fotos das personas anteriores.
- **O que aconteceu:** **quatro das seis capas e três fotos de galeria foram recusadas** com "nao consegui deixar esta imagem abaixo de 140 KB. Tente uma imagem mais simples ou menor." (`out/eventos-atrito.txt`).
- **Arquivo:** `src/modules/media/lib/imagePipeline.js:79` (`project: { proporcao: null, lado: 1400, orcamento: 140 * 1024 }`) e `codificarDentroDoOrcamento` (linha 156), que tenta WebP em 0.82, 0.72 e 0.62 e **desiste** em vez de reduzir a dimensão.

Foto de casamento é o pior caso possível para um orçamento de bytes: multidão, folhagem, renda, bokeh e luz baixa são ruído fino, que é exatamente o que o WebP não comprime. Medi o preço da volta, redimensionando a mesma foto até passar (`out/eventos-placar-capas.json`):

| foto | 1400px | 1100px | 900px | 700px |
|---|---|---|---|---|
| Marina e Tiago (capa) | recusada | **aceita** | | |
| Larissa e Diego (capa) | recusada | **aceita** | | |
| Bruna e Otávio (capa) | recusada | recusada | recusada | **aceita** |
| Camila e Pedro (capa) | recusada | recusada | recusada | **aceita** |
| Júlia e Rafael (galeria 4) | recusada | **aceita** | | |
| Camila e Pedro (galeria 2) | recusada | recusada | **aceita** | |
| Isabela e Gustavo (galeria 2) | recusada | **aceita** | | |

Duas capas só entraram a **700px**, metade da resolução do resto da página. E isto foi um script tentando quatro larguras: uma cerimonialista não sabe redimensionar imagem, e a mensagem manda ela "tentar uma imagem mais simples", que numa foto de casamento **não é uma instrução que se possa cumprir**. O caminho dela é desistir da foto.

Vale registrar a ironia: o comentário no próprio arquivo explica que o corte 3:2 foi removido para salvar a foto vertical do tatuador, e o orçamento subiu de 90 para 140 KB para compensar. Guardar a imagem inteira em 1400px pesa mais do que guardar um recorte 3:2, e **140 KB não acompanhou**. O conserto de uma persona virou o bloqueio da outra.

**O que resolveria:** antes de recusar, reduzir a dimensão em degraus (1400, 1100, 900, 700) mantendo a qualidade em 0.72. É o que eu fiz na mão, e é a única coisa que o pipeline ainda não tentou quando desiste.

### D2. A paleta escolhida no editor não muda a página `[grave]`

- **O que fiz:** no passo "A página", troquei "Paleta da página" de Rosa (herdada do kit) para **Lavanda**, e salvei.
- **O que esperava:** a página ficar lavanda.
- **O que aconteceu:** o `select` grava e mostra "Lavanda" a cada reabertura do editor, e **o canvas e a página publicada continuaram rosa**. Medido: `borderColor` do selo = `rgb(255, 143, 163)` = `#FF8FA3` = o accent do preset **Rosa**, com `theme_preset = 'lavanda'` no banco. Troquei depois para **Menta** só para confirmar: continuou rosa.
- **Arquivo:** `src/modules/editor/api/mapear.js:111` e `:208`.

A causa é uma linha que existe para consertar outra coisa. Na leitura, `theme_accent: pf.theme_accent ?? efetivo.accent` preenche o campo "Cor de destaque" com a cor **efetiva do preset atual** (rosa, `#ff8fa3`). Na gravação, `corPropria(v.theme_accent, resolverTema({ preset: v.theme_preset }).accent)` só descarta a cor livre se ela for igual à do preset **novo**. Como `#ff8fa3` ≠ `#c4a7e7`, ela é gravada como cor livre. E cor livre vence preset. Resultado: **abrir o formulário de perfil uma vez congela a paleta atual para sempre**, e todo `select` de paleta depois disso é inerte, sem uma mensagem sequer.

Isso é mais grave para quem veio de um starter kit do que para quem começou do zero, porque quem veio do kit tem uma paleta preenchida que ele nunca escolheu. Consegui lavanda só escrevendo `#c4a7e7` e `#141021` à mão nos dois campos de cor dos "Ajustes finos", que estão atrás do rótulo "PERSONALIZAÇÃO" e cujo nome não sugere nenhuma relação com o `select` de paleta.

### D3. No celular a data do evento é cortada `[grave]`

- **O que fiz:** pus a data por extenso mais o número de convidados na linha de destaque, que é o único campo curto que aparece na grade.
- **O que esperava:** ler a data no card.
- **O que aconteceu:** em 390px o card tem **150px** de largura e a linha é truncada em uma linha só: `22 de março de 202…`, `15 de novembro de …`, `7 de dezembro de 2…`, `3 de maio de 2025 …`. Cinco dos seis cards perdem informação, e três perdem o ano.
- **Arquivo:** prova em `out/eventos-final-celular.png`; medidas do card em `out/eventos-grade.json` (desktop 338x265, celular 150x260).

Celular é de onde vem o tráfego de uma cerimonialista (link na bio do Instagram). Enquanto não houver campo de data, esta linha **é** a data da página, e ela é a que quebra primeiro.

### D4. O texto do botão principal é cortado `[médio]`

- **O que fiz:** escrevi "Me conta a sua data" no campo "Texto do botão", que aceita 40 caracteres.
- **O que aconteceu:** o botão publica **"ME CONTA A SUA ..."**. Dezenove caracteres não cabem num campo que promete quarenta.
- **Arquivo:** `out/eventos-topo.png`, canto inferior direito do card de perfil.

O campo e o botão discordam por mais que o dobro. Ou o `maxLength` cai para o que cabe (e o contador avisa), ou o botão quebra em duas linhas.

### D5. O trabalho de exemplo do starter kit sumiu sozinho `[médio]`

- **O que fiz:** criei o portfólio com o kit de confeitaria e fechei o navegador.
- **O que esperava:** achar o exemplo "Bolo de casamento de três andares" na lista de projetos para apagar.
- **O que aconteceu:** o card estava no canvas logo depois do wizard (`out/eventos-canvas-recem-nascido.png`), e na sessão seguinte **o painel "Meus projetos" estava vazio** e o canvas mostrava o estado de "nenhum projeto" (`out/eventos-sonda-projetos.png`). A experiência de exemplo do mesmo kit sobreviveu e eu apaguei na mão.

Não achei a causa lendo o código: `carregarProjetos` não filtra `is_sample` e `apply_starter_kit` só apaga exemplos quando vai inserir outros. Registro como observação com as duas provas, sem cravar diagnóstico. O que importa para o produto é que **metade do kit evaporou**: quem escolhe uma área e volta no dia seguinte vê menos do que viu na hora, sem explicação.

### D6. Com a gaveta aberta, a barra do topo é visível e não clicável `[médio]`

- **O que fiz:** com o painel "Projetos" aberto, cliquei em "Experiência" na barra do topo.
- **O que aconteceu:** nada, por 30 segundos, até o timeout. O Playwright explica: `<h2 class="ed-gaveta-titulo">Meus projetos</h2> from <aside id="ed-gaveta"> subtree intercepts pointer events`. A gaveta cobre a barra, que continua desenhada e legível por cima do escurecimento.
- **Arquivo:** `src/modules/editor/styles/editor.css` (empilhamento da gaveta); reproduzido em `scripts/_demos/demo-eventos.mjs`, que precisou de um `Escape` antes de cada troca de painel.

Um botão que se vê e não responde é pior do que um botão desabilitado. Ou a gaveta escurece a barra junto, ou o clique na barra fecha a gaveta e abre o painel pedido.

### D7. A observação do link corta no meio da palavra, sem contador `[baixo]`

146 caracteres viraram 120, terminando em "quando vi as fot". O campo é `input` com `maxlength` e **nenhum contador visível**, ao contrário dos campos grandes. Quem cola um texto do WhatsApp não percebe que perdeu o fim.

---

## Atrito

### A1. A galeria pede uma repintura por foto `[médio]`

Trinta fotos de galeria, uma de cada vez, cada uma esperando o slot seguinte nascer. A decisão de os slots nascerem um a um é boa e está bem argumentada no código, mas para quem sobe **álbum** (que é o caso de todo casamento) o resultado é trinta ciclos de arrastar, esperar converter e esperar o campo seguinte aparecer. Falta o caso "selecionar oito de uma vez": o `input` aceitaria `multiple` e o resto do pipeline já é o mesmo.

### A2. A galeria mora em "Provas", longe da foto de capa `[baixo]`

A capa é o primeiro campo do formulário e a galeria é o décimo quinto, num passo fechado chamado "Provas". Para uma profissão em que o trabalho **é** o álbum, as duas deviam ser vizinhas.

### A3. O enquadramento não existe em trabalho novo `[baixo]`

`image_position` só nasce quando `image_fit` é "Preencher o card", e trabalho novo nasce em "Caber inteira, com respiro". Ou seja, a foto de casamento nasce com moldura preta em volta e o controle que resolveria isso está escondido atrás de outro controle, dois passos adiante. Tive que escolher "Preencher o card" em cada um dos seis.

### A4. Publicar leva a página para uma fila e nada avisa antes `[baixo]`

Está tudo certo e o texto de depois é bom ("Recebido. A primeira publicação de cada conta passa por uma conferência rápida"). Mas o botão antes dizia só "Publicar meu portfólio", e a lista de sete itens verdes acima dele ("✓ Tem pelo menos um projeto") promete que o clique põe no ar. Uma linha antes do clique custaria nada.

---

## Buraco de template

1. **Não existe seção de depoimentos**, e não existe como criar uma. É o B1 e é o buraco central.
2. **Não existe campo de data por trabalho.** Só `year`, um `select` de 25 opções. A profissão inteira se organiza por dia.
3. **Não existe autoria de terceiro em campo nenhum.** Mesmo colando a frase da noiva, não há onde dizer *quem* falou de um jeito que o render trate diferente da voz da dona da página. Isto é o buraco por trás do buraco: o template tem **um único falante**.
4. **Nenhum dos 20 ícones de selo diz casamento ou evento** (`out/eventos-icones-selo.txt`): Código, Chapéu de chef, Balança, Câmera, Halter, Régua, Cérebro, Música, Bolo, Capelo, Caneta, Maleta, Brilhos, Coração, Estrela, Paleta, Microfone, Tesoura, Chave inglesa, Folha. Fiquei com "Coração". Faltam aliança, taça e calendário, que serviriam a eventos, bodas, buffet e fotografia de casamento de uma vez.
5. **Nenhuma das dez áreas do wizard é evento**, e eventos não é um nicho pequeno: cerimonialista, buffet, decorador, DJ, fotógrafo de casamento e assessor de festa infantil são o mesmo template.
6. **Não existe nada entre "trabalho" e "número".** A Clarice tem três informações que a profissão usa e que não têm casa: quantos convidados, quanto custa a partir de, e quando a agenda abre. As três acabaram espremidas na mesma linha de 60 caracteres.

---

## Palavra errada

| onde | o que diz | por que está errado para ela |
|---|---|---|
| campo `highlight`, no formulário de trabalho | **"Preço, prazo ou condição"**, ajuda `Ex: "A partir de R$ 180", "Sessão de 3h", "Encomende com 7 dias"` | é o único lugar onde a data do evento cabe, e o rótulo fala de dinheiro. Ela precisa **desobedecer o rótulo** para usar o campo certo |
| ajuda do campo `category` | `Ex: "Retrato", "Contencioso", "Bolo de festa"` | três exemplos de três outras profissões, num formulário que já sabe que ela chama os trabalhos de "casamentos". O mecanismo de rótulo por profissão existe e esta ajuda ficou de fora |
| `tem_cliente` | **"Foi para um cliente" · "Desligado, o projeto é seu"** | casamento **nunca** é "seu". Não existe casamento sem noivos, e a pergunta não faz sentido nesta profissão. Ela tem que ligar um switch obrigatório em todos os seis |
| painel **Seções** | "Especialidades", "Trabalhos", "Experiência" | ela renomeou as três para "O que eu cuido", "Casamentos que assinei" e "Minha trajetória", e o painel que **reordena essas mesmas seções** continua chamando pelos nomes de fábrica. As duas telas discordam sobre o nome da mesma coisa |
| título da gaveta | **"Meus projetos"**, "Novo projeto", "Adicionar projeto" | mesma coisa: a página diz "Casamentos que assinei" e a gaveta atrás dela continua dizendo projeto |
| `link_note` | "Observação sobre o link" | acabou virando o campo de depoimento por eliminação, e o nome não tem nenhuma relação com isso |
| `gallery_1` | "Mais fotos deste trabalho" | para casamento, isto é **o álbum**, não "mais fotos" |

---

## Contagem de campos por casamento

19 campos visíveis no formulário (`out/eventos-censo-projeto.txt`). A Clarice usou **14** e deixou 5 vazios (`video`, `link` em cinco dos seis, `image_position`, `accent`, `plate_bg`). O formulário não é o problema desta persona: ele já fala a língua dela em 6 dos 19 rótulos, por causa dos rótulos que ela escreveu no passo "A página". O problema é o campo que não existe.

---

## Scripts e provas

- `scripts/_demos/demo-eventos-wizard.mjs` — lê e fotografa as dez áreas, escolhe, e captura a página recém-nascida com o kit errado
- `scripts/_demos/demo-eventos.mjs` — o portfólio inteiro, por etapas (`limpar-kit|perfil|pagina|censo|projetos|experiencias|secoes|publicar|ler|previa`)
- `scripts/_demos/demo-eventos-capas.mjs` — mede em que largura cada foto recusada passa
- `scripts/_demos/demo-eventos-depoimento.mjs` — a caça ao depoimento, campo a campo
- `scripts/_demos/demo-eventos-janela.mjs` — abre as seis janelas na prévia e mede onde cada depoimento e cada data foram parar
- `scripts/_demos/demo-eventos-sonda.mjs` — sonda solta, sem gravar nada

**Prints:** `out/eventos-final-desktop.png`, `out/eventos-final-celular.png` (a página pronta), `out/eventos-topo.png` (botão cortado), `out/eventos-canvas-recem-nascido.png` (o kit de confeitaria), `out/eventos-janela-1.png` e `out/eventos-janela-3.png` (depoimento em `features` e em `tagline`), `out/eventos-secoes.png`, `out/eventos-url-nua.png` ("quase no ar").

**Erros de console e de rede: nenhum**, em nenhuma das doze execuções (`out/eventos-erros.txt`).
