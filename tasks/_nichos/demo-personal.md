# Diego Aranha, personal trainer (demo-personal)

**URL pública:** https://demo-personal.myportifolio.com.br
(responde **HTTP 404** enquanto a primeira publicação está na fila de conferência humana. A fila é esperada; o que o 404 diz não é, ver **B1**)
**URL de prévia (HTTP 200, é a que mostra tudo):** https://demo-personal.myportifolio.com.br/?previa=898f319f71cb999bf6cbb67d598a796f06b5f00118ebb150
**Tempo:** cerca de 50 minutos no total, dos quais 6 minutos de execução dentro do editor (14 fases medidas, soma de 365 s).
**Veredito:** o produto sabe mostrar um Short na proporção certa exatamente uma vez, e desfaz isso sozinho no segundo salvar, num editor onde os interruptores param de obedecer depois da segunda repintura do formulário.

## O que foi construído

Perfil completo (bio de 4 linhas, selo "Personal trainer" com ícone de halter, 4 redes incluindo Instagram e TikTok, 3 números da capa, botão principal de WhatsApp com rótulo próprio, 9 especialidades), **6 trabalhos** (programas de treino, consultoria online, transformações e retorno pós-cirurgia), **3 vídeos reais do YouTube** (2 Shorts verticais e 1 horizontal, todos validados por oembed), **3 experiências** (studio próprio, Bacharelado em Educação Física com certificado anexado, e certificação NSCA), **11 fotos reais do Unsplash** subidas pelo editor, incluindo duas em retrato 2:3 de propósito.

Scripts: `scripts/_demos/demo-personal.mjs` (14 fases) e `scripts/_demos/demo-personal-publico.mjs` (mede a moldura do vídeo na página do visitante, em 1440 e em 375). Evidências em `out/personal-*.png` e mídia em `out/midia/demo-personal/`.

**Zero erro de console e zero resposta HTTP 4xx/5xx do Supabase** durante todo o preenchimento. Nada aqui é crash. Tudo aqui é o produto fazendo o que foi escrito.

---

# O teste do vídeo vertical

Esta persona existe para isto. O resultado tem três partes, e a terceira anula a primeira.

## Parte 1: colando `youtube.com/shorts/<id>`, funciona

Trabalho **"Recomposição em 16 semanas"**, link colado no formato original `https://www.youtube.com/shorts/83k-_6c1DtE` (Short público e real, "Níveis exercício: Squat", Holmes Place Portugal; oembed devolve `width: 113, height: 200`, ou seja vertical).

Medido na página do visitante:

| | moldura | iframe | proporção |
|---|---|---|---|
| Short (`/shorts/`) | `aspect-[9/16] max-w-[320px] mx-auto` | 318 x 567 | **0,561** (alto e estreito) |
| Vídeo horizontal | `aspect-video w-full` | 604 x 339 | 1,782 |

Print: `out/personal-modal-recomposicao-em-16-semanas.png` (vertical, o vídeo preenche a moldura, sem tarja) contra `out/personal-modal-consultoria-online-forca-total.png` (horizontal, 16:9, também correto). Em 375 px o vertical fica 283 x 505 e continua certo (`out/personal-modal-recomposicao-em-16-semanas-m375b.png`).

Isto é o conserto de 16/08/2026 (`projectModal.js:57`) funcionando. **Metade do problema está resolvida.**

## Parte 2: colando o MESMO tipo de Short como `youtu.be/<id>`, quebra em silêncio

Trabalho **"Transformação da Camila"**, link `https://youtu.be/AeRoPukf078` (Short "Agachamento: O Rei dos Exercícios", Tua Saúde; oembed também devolve `113 x 200`, vertical).

O editor respondeu exatamente a mesma frase que respondeu para o Short do outro formato: **"vídeo reconhecido (AeRoPukf078)"**. Não há uma palavra sobre orientação. Na página, ele saiu em `aspect-video w-full`, 604 x 339, com o vídeo ocupando cerca de um terço da largura e o YouTube preenchendo as laterais (`out/personal-modal-transformacao-da-camila.png`). O título do vídeo sai cortado no meio ("...para Membros Infe").

**Causa:** `src/modules/projects/lib/youtube.js:75-78`. A orientação é deduzida do segmento `/shorts/` do caminho. `youtu.be/<id>` não tem esse segmento, então cai em `horizontal` sem qualquer sinal. `youtube.com/watch?v=<id>` tem o mesmo destino (linha 61), e Short aberto no computador abre justamente em `/watch`.

## Parte 3 (a grave): abrir o trabalho certo e clicar em Salvar destrói a orientação

Reabri o trabalho "Recomposição em 16 semanas", **não mexi em nada**, cliquei em **Salvar**.

O campo, ao reabrir, não mostrava mais o que eu tinha colado. Mostrava `https://youtu.be/83k-_6c1DtE`. `projectsApi.js:37` reconstrói o campo a partir da coluna `youtube_id`, e sempre no formato curto:

```js
video: p.youtube_id ? `https://youtu.be/${p.youtube_id}` : '',
```

O salvar re-analisa esse texto (`projectsApi.js:58`), `youtu.be` não carrega a marca de Shorts, e a coluna `youtube_orientation` volta ao banco como `horizontal`.

Mesma URL, mesma página, medida antes e depois do clique em Salvar:

| | moldura | iframe |
|---|---|---|
| antes | `aspect-[9/16] max-w-[320px] mx-auto` | 318 x 567 |
| **depois de um Salvar sem alteração** | `aspect-video w-full` | **604 x 339** |

Prints lado a lado: `out/personal-modal-recomposicao-em-16-semanas.png` (antes) e `out/personal-modal-recomposicao-em-16-semanas-depois-do-salvar.png` (depois). São o mesmo trabalho, o mesmo vídeo, e a única coisa que aconteceu entre os dois foi um clique em Salvar.

**Consequência:** a orientação vertical sobrevive apenas ao primeiro insert. Trocar o título, subir outra foto, corrigir um erro de digitação ou acrescentar um grupo de filtro derruba a proporção. O personal trainer, cujo trabalho inteiro é gravado em vertical, tem um portfólio que fica certo no dia em que ele cadastra e errado no dia em que ele revisa.

**Agravante:** não existe nenhuma forma de perceber isso de dentro do editor. Clicar no próprio card no canvas **não abre o modal** (testado, e também no modo "Ver como visitante"). A única maneira de ver a moldura do vídeo é gerar um link de prévia e abrir noutra aba.

**Correção que fecha os três buracos de uma vez:** guardar a orientação como dado da coluna e nunca re-deduzi-la de uma URL reconstruída. Em `patchDoProjeto`, quando o parser devolver `horizontal` mas a linha já tiver `youtube_orientation = 'portrait'` **e o mesmo `youtube_id`**, manter o que está gravado. Complemento barato: no campo, dizer qual das duas molduras vai ser usada ("vídeo reconhecido, vertical" contra "vídeo reconhecido, horizontal"), e oferecer a troca manual. Hoje o texto de ajuda promete "Shorts, live e link curto funcionam", e link curto de Short não funciona.

## Formatos aceitos no campo (todos testados, fase `formatos`)

| formato | aceito? | orientação resultante |
|---|---|---|
| `https://www.youtube.com/shorts/<id>` | sim | **vertical** |
| `https://youtube.com/shorts/<id>?feature=share` | sim | **vertical** |
| `https://m.youtube.com/shorts/<id>` | sim | **vertical** |
| `https://youtu.be/<id>` | sim | horizontal (errado para Short) |
| `https://youtu.be/<id>?t=30` | sim | horizontal (errado para Short) |
| `https://www.youtube.com/watch?v=<id>` | sim | horizontal |
| `https://www.youtube.com/watch?v=<id>&t=30s` | sim | horizontal |
| `https://www.youtube.com/embed/<id>` | sim | horizontal |
| `https://www.youtube.com/@canal` | **recusado**, corretamente | ("não reconheci este link") |

O parser aceita tudo que uma pessoa cola de verdade, e isso está muito bem feito. O problema não é aceitar, é que os oito aceitos dizem a mesma frase e produzem duas páginas diferentes.

---

# 1. Bloqueio

### B1. O endereço do Diego, enquanto está em conferência, anuncia que está livre (severidade alta)
**O que fiz:** publiquei pelo painel, li a mensagem de fila de revisão, abri `https://demo-personal.myportifolio.com.br/`.
**O que esperava:** "esta página está em conferência", ou no pior caso um 404 mudo.
**O que aconteceu:** HTTP 404 com o título **"Endereço livre"** e o texto **"Este endereço ainda está livre. Ninguém publicou um portfólio em demo-personal.myportifolio.com.br ainda"**, mais um botão **"Quero este endereço"** (`out/personal-404-em-revisao.png`).
**Por que dói:** na janela entre pagar e ser aprovado, o produto convida quem recebeu o link a tomar o endereço do dono. Não existe estado intermediário entre "livre" e "no ar".
**Arquivo:** `worker/rotas/tenant.js`.
**Já registrado em** `tasks/_nichos/demo-chef.md` (B1) e em `demo-confeitaria.md`. Confirmo pela terceira vez, o que sugere que é fila e não caso isolado.
**Consequência:** não entrego URL pública funcionando. Entrego a de prévia.

### B2. O interruptor do formulário deixa de obedecer depois da segunda repintura, e trava campos que dependem dele (severidade alta)
**O que fiz:** cadastrei os 6 trabalhos e as 3 experiências pelo formulário normal.
**O que esperava:** ligar "Foi para um cliente" e digitar o nome; desligar "Ainda estou cursando" e digitar o ano de conclusão.
**O que aconteceu:** em 2 dos 6 trabalhos o campo "Nome do cliente" **nunca nasceu**, e nas 2 entradas de Estudo o campo "Até" **nunca nasceu em 6 cliques**, deixando o Bacharelado em Educação Física publicado como se o Diego estivesse cursando desde 2011.

Isolei o comportamento numa fase própria (`node scripts/_demos/demo-personal.mjs switch`), sempre no mesmo interruptor "Foi para um cliente":

```
0 repinturas -> antes=false
  depois do clique = true    (esperado: true)   OK
  depois de desligar = true  (esperado: false)  ERRADO
1 repintura  -> antes=true
  depois do clique = false   (esperado: true)   ERRADO
2 repinturas -> antes=false
  depois do clique = true    (esperado: false)  ERRADO
```

**Causa, e ela é de uma linha:** `src/modules/editor/components/editorDrawer.js:61-68`.

```js
export function repintarCorpo(html, aoLigar) {
  const corpo = raiz?.querySelector('[data-gaveta-corpo]');
  corpo.innerHTML = html;   // MESMO elemento, so o conteudo muda
  aoLigar?.(corpo, raiz);   // e liga MAIS um jogo de listeners nele
}
```

`corpo` é sempre o mesmo nó do DOM. Cada repintura chama `ligarFormulario(corpo, ...)` de novo, que faz seis `corpo.addEventListener(...)`. Ninguém remove os anteriores. Depois de N repinturas existem N+1 handlers de clique, e o handler do interruptor faz `valores[key] = !valores[key]`: **um clique vale N+1 inversões.** Com N+1 par, o valor volta ao que era e o interruptor parece morto. Pior, cada clique fracassado dispara mais repinturas, então o número de handlers dobra e o interruptor fica travado para sempre naquele formulário.

O que dispara repintura: subir imagem, adicionar chip, clicar em botão de tipo, clicar em qualquer interruptor. Digitar não dispara. Por isso o defeito é intermitente e parece azar: nos trabalhos em que a Stack tinha 3 chips o cliente entrou, nos que tinha 2 chips não entrou.

Regra prática que caiu exata em todos os 10 formulários que preenchi: **contagem par de repinturas antes do clique = interruptor funciona; ímpar = interruptor morto.** Criar uma entrada de Estudo obriga a clicar em "Estudo" primeiro, que é 1 repintura, o que garante que "Ainda estou cursando" nunca mais desliga naquele formulário. **Toda formação com data de fim é impossível de cadastrar de primeira.**

Contorno que existe mas que ninguém descobre: fechar, salvar e reabrir a entrada já gravada. Aí são 0 repinturas e o primeiro clique obedece (foi assim que consertei, fases `cliente` e `fimdocurso`).

**Correção:** trocar o nó em vez de reciclá-lo (`corpo.replaceChildren()` num elemento novo), ou guardar um `AbortController` por ligação e passar `{ signal }` nos `addEventListener`, abortando antes de religar.

**Efeito colateral que já estava medido:** o mesmo empilhamento multiplica o custo de digitar. Depois de 3 repinturas, digitar 60 caracteres levou **6.094 ms**, cerca de 100 ms por tecla, headless, em máquina de mesa. O relatório da chef mediu 39,6 ms por tecla num formulário mais novo; a diferença é o número de repinturas acumuladas. Não é lentidão de render, é o mesmo bug.

---

# 2. Defeito

### D1. A "Cor de destaque" do perfil é vendida, é gravada, viaja no payload publicado e não pinta um pixel (severidade alta)
**O que fiz:** a conta tem a Personalização ativa (os campos não estão desabilitados e o rótulo próprio do botão sai na página). Defini `theme_accent = #B6FF3C`, o verde limão da persona, e publiquei.
**O que esperava:** o selo, o botão principal, os números ou os chips assumirem a cor.
**O que aconteceu:** a página inteira continua branca sobre preto, e o único roxo `#7C5CFC` que aparece é o `accent` de cada card. Reabri o editor: `theme_accent gravado = #b6ff3c`. Li o payload servido: `"theme":{"accent":"#b6ff3c","plateBg":"#0b0b12"}`.
**Causa:** `src/modules/portfolio/lib/ctx.js:88`. O `theme` do payload é consumido em um lugar só, e para virar um booleano:

```js
flags: { hasCustom: Boolean(adaptado.theme && Object.keys(adaptado.theme).length), ... }
```

E `hasCustom` não é lido em lugar nenhum: `grep -rn "hasCustom" src/ worker/` devolve a própria linha que o cria e uma constante `false` em `src/main.js:53`. Não existe consumidor. A cor faz a viagem inteira, do formulário ao HTML do visitante, e morre no último metro.
**Por que dói:** é um campo de bump pago. O comprador escolhe uma cor, salva, publica, e a página fica idêntica. Não há mensagem de erro para ele reclamar.

### D2. "Observação sobre o link" não existe até o formulário repintar por outro motivo (severidade média)
**O que fiz:** num trabalho novo, preenchi "Link do projeto no ar" e fui procurar o campo de observação logo abaixo.
**O que esperava:** ele nascer ao terminar de digitar o link.
**O que aconteceu:** não existe. Nos dois trabalhos em que eu tinha uma observação para escrever, ela se perdeu.
**Causa:** `dependeDe: (v) => Boolean(v.link)` em `fieldSchema.js:120` só é avaliado quando o formulário repinta, e digitar chama `aoMudar(false)`, que de propósito não repinta (`formulario.js:95`). O campo aparece se, depois de digitar o link, a pessoa por acaso adicionar um chip. Medido: `link_note existia antes do chip? 0 | depois do chip? 1`.
**Sugestão:** repintar quando o valor de um campo do qual outro depende cruza de vazio para preenchido, comparando antes e depois em vez de repintar a cada tecla.

### D3. As redes sociais se sobrepõem quando o texto ao lado é comprido (severidade média)
**O que fiz:** cadastrei 4 redes no formato pedido pela ajuda, `rótulo | texto ao lado | link`, com os textos que um personal trainer usa de verdade (`@diegoaranha.treino`, `Treino com o Diego`, `(11) 98765-4321`).
**O que aconteceu:** em 1440 px a linha do Instagram sai grudada (`Instagram@diegoaranha.treino`), a do YouTube quebra em duas linhas por cima do próprio rótulo, e a do WhatsApp escreve o telefone por cima da palavra "WhatsApp" (`out/personal-publico-final.png`, coluna da direita).
**Causa:** `src/modules/profile/components/profilePanel.js:84-88`. O `<a>` é `flex items-center justify-between` com dois `<span>` sem `gap`, sem `min-w-0` e sem `truncate`. A coluna é `md:col-span-2` de um grid de 5, ou seja estreita por construção. Em 375 px, onde a coluna vira largura cheia, fica correto, então o defeito é só do desktop.
**Sugestão:** `gap-3` no `<a>`, `shrink-0` no rótulo e `min-w-0 truncate text-right` no valor.

### D4. A bio perde as quebras de linha (severidade média)
**O que fiz:** escrevi a bio em 4 parágrafos, com Enter entre eles, no campo "Sobre você".
**O que aconteceu:** a página publica um bloco único de 4 linhas de texto corrido.
**Causa:** `profilePanel.js:116`, `<p class="text-sm ...">${esc(t(profile.bio, lang))}</p>`. Sem `whitespace-pre-line`, o HTML colapsa `\n`.
**Por que dói:** o formulário aceita 2000 caracteres e a caixa é um `<textarea>` de várias linhas, ou seja, ele convida a escrever em parágrafos e depois desfaz.
**Sugestão:** acrescentar `whitespace-pre-line` na classe. Uma palavra.

### D5. Os números da capa não se alinham entre si (severidade baixa)
**O que fiz:** três números com rótulos de tamanhos diferentes ("Alunos atendidos", "Anos de treino", "Transformações").
**O que aconteceu:** os rótulos quebram em 2 e 3 linhas, e os valores 340, 11 e 128 ficam em três alturas diferentes. E o nome "Diego Aranha" quebra em duas linhas porque o bloco de números come a largura.
**Causa:** `profilePanel.js:104` e `statItem`, `flex flex-col text-center` sem altura mínima no rótulo.
**Nota:** o campo aceita **6** números. Com 3 já desalinha.
**Sugestão:** `items-end` na fileira, ou `min-h` no rótulo, ou empurrar o valor para baixo com `mt-auto`.

### D6. Publicar não muda nada na tela (severidade média)
**O que fiz:** publiquei, e depois publiquei de novo.
**O que aconteceu:** a barra do topo continua dizendo **"RASCUNHO"**, o botão continua **"Publicar meu portfólio"** (e não "Publicar alterações"), o link "Tirar minha página do ar" não aparece, e a única frase que explica a fila some ao recarregar. Na segunda publicação a mensagem repete "A **primeira** publicação de cada conta passa por uma conferência rápida", o que agora está errado como texto.
**Arquivo:** `publicarPanel.js:73-76` depende de `portfolio.first_published_at`, que continua nulo enquanto o portfólio está na fila.
**Já registrado em** `demo-chef.md` (D2). Confirmo.
**O que a tela acerta:** a frase do momento do clique é boa e explica exatamente o que precisa ser explicado, inclusive que a prévia continua valendo. O problema é só ela não sobreviver ao F5.

---

# 3. Atrito

### A1. Não dá para ver o próprio vídeo sem sair do editor (severidade alta para esta persona)
Clicar num card no canvas não abre o modal, nem no modo de edição nem em "Ver como visitante" (medido: `false` nos dois). O modal só existe na página servida pelo Worker. Para conferir se o Short ficou em pé, o caminho é: abrir Publicar, gerar link de prévia, copiar, abrir noutra aba, rolar até o card, clicar. Para um profissional cujo produto **é** o vídeo, o item mais importante da página é o único que o editor não mostra.

### A2. "Ver como visitante" não esconde a barra do editor
O botão remove os lápis de edição, mas `#ed-barra` continua visível (medido). "Como o visitante veria" ainda tem MYPORTIFOLIO, o selo RASCUNHO e seis botões em cima. `out/personal-visitante.png`.

### A3. O campo de vídeo esquece que reconheceu
Ao reabrir um trabalho salvo, a nota "vídeo reconhecido (...)" está vazia, porque ela só é escrita no evento `input` (`formulario.js:87-92`). O comprador reabre um case com vídeo e não tem nenhuma confirmação de que o link continua bom.

### A4. A gaveta cobre o card que está sendo editado
A gaveta ocupa a direita e escurece o canvas. Editando o terceiro trabalho, o card dele fica atrás da gaveta ou fora da tela. `out/personal-projeto-foto-vertical.png`.

### A5. A pílula "Personalização" continua aparecendo para quem já tem a Personalização
Três campos do perfil exibem a pílula roxa mesmo com os campos habilitados e funcionando. Já registrado em `demo-chef.md`. É uma etiqueta, não um cadeado, mas para quem pagou ela lê como "isto está bloqueado".

### A6. O upload não mostra progresso
Enquanto a imagem converte e sobe, a única sinalização é o texto "convertendo e enviando..." no lugar da mensagem de erro do campo. Numa foto de 2 MB de celular, em 4G, isso é silêncio.

---

# 4. Buraco de template

### T1. Foto em retrato 2:3 num corte 3:2 perde 56% da altura, no centro
**O que fiz:** de propósito, subi duas fotos verticais (1400 x 2099 e 1400 x 2101, retrato 2:3) no campo "Imagem do case", que corta 3:2 (`imagePipeline.js:34`).
**O que aconteceu:** o corte é central e fixo (`imagePipeline.js:163-173`). De 2099 px de altura sobram 933, ou seja **descarta 55,6% da imagem, metade em cima e metade embaixo**.

No trabalho "Transformação da Camila" a foto original é uma composição vertical: a barra no alto, o braço descendo em diagonal, o corpo e a anilha embaixo. O que sobrou no card é a faixa do meio, mãos fechadas numa barra (`out/personal-publico-final.png`, terceiro card, contra `out/midia/demo-personal/p5-vertical.jpg`). A leitura vertical, que é o assunto da foto, some. Para uma seção que se chama "Transformação", cortar a pessoa e deixar as mãos é o oposto do que o dono queria mostrar.

Não existe controle de enquadramento aqui. O único do produto é o slider vertical da foto grande do perfil (`hero_object_position`). O cropper livre foi cortado em 6.1, e essa decisão está escrita e é defensável; o que falta é o barato: **um slider de enquadramento igual ao do hero, no campo de imagem do trabalho**. Metade das profissões não técnicas fotografa gente em pé.

### T2. Todo trabalho novo nasce com a foto encolhida dentro de uma placa preta
`vazioNovo()` em `projetosPanel.js:37` cria o trabalho com `image_fit: 'contain'`, e o campo que muda isso mora em "Ajustes finos", chamado "Tipo da imagem", com as opções "Logo (com respiro)" e "Print (preenche a placa)". Um personal trainer não sobe logo nem print, sobe foto.

Medido no HTML servido, com as 6 fotos em `object-fit: contain`:

| largura | caixa da placa | foto renderizada | placa vazia |
|---|---|---|---|
| 1440 px | 336 x 208 | 312 x 208 | 7% |
| **375 px** | 141 x 176 | **141 x 94** | **47%** |

No celular, que é onde o cliente de personal trainer abre o link, quase metade de cada card é preto. Já registrado em `demo-confeitaria.md`; a medida em 375 px é o que acrescento.
**Sugestão:** `cover` como padrão para quem não é dev, ou deduzir do próprio arquivo (foto com muitos pixels não transparentes é `cover`), ou no mínimo subir o campo do "Ajustes finos" para o passo 1 com rótulo de foto e não de logo.

### T3. Instagram e TikTok são o canal, não mais um item numa lista
As redes viram quatro botões cinzas idênticos, com o mesmo peso, abaixo da bio. Para esta profissão o Instagram é onde o trabalho vive: um bloco de ícone reconhecível, ou o próprio `@` em destaque, valeria mais que os quatro retângulos. O formato `rótulo | texto | link` é flexível e correto de estrutura, mas o render trata "Instagram" e "E-mail" como a mesma coisa.

### T4. "Logo" é campo esperado na experiência, e um studio de rua não tem logo
O campo se chama "Logo", pede quadrado e sugere PNG com fundo transparente. Studio Aranha Performance, Universidade e NSCA: só a última tem arquivo. As iniciais como fallback existem e funcionam bem; o rótulo é que promete algo que a maioria não tem. "Logo ou foto do lugar" cobriria os dois.

### T5. Um curso que começa e termina no mesmo ano imprime "2021 a 2021"
A certificação NSCA de 2021 sai como **"2021 A 2021"** (`out/personal-publico-final.png`). Certificação costuma ser um evento, não um período.
**Sugestão:** quando início e fim forem iguais, imprimir só o ano.

### T6. O checklist de publicar não conhece o vídeo
Ele confere nome, o que você faz, foto, bio, projeto, imagem em todos, link do botão e experiência. Para esta persona faltaria "pelo menos um trabalho com vídeo", que é o que a própria opção "Projetos com vídeo primeiro" pressupõe. Detalhe fino: o interruptor "Projetos com vídeo primeiro" **funcionou** e a sugestão de reordenar apareceu corretamente quando fazia sentido. Essa parte está bem feita.

---

# 5. Palavra errada

A mesma seção tem **três nomes diferentes** dependendo de onde se olha, e nenhum dos três serve para quem não escreve código.

| onde | hoje | sugestão |
|---|---|---|
| página publicada (`i18n.js:19`) | **"Stacks Dominadas"** | "O que eu uso no trabalho" |
| bloco vazio do editor (`editorShell.js:78`) | "O que você usa no trabalho" | manter, e usar essa em todo lugar |
| rótulo do campo (`fieldSchema.js:84`) | "Stacks que você domina" | "Suas especialidades" |

E o mesmo acontece com os trabalhos:

| onde | hoje | sugestão |
|---|---|---|
| página publicada (`i18n.js:17`) | **"Meus Projetos"** | "Meus trabalhos" |
| contador (`i18n.js:18`) | **"6 cases"** | "6 trabalhos" |
| bloco vazio do editor (`editorShell.js:71`) | "Trabalhos" | manter |
| painel do editor | "Meus projetos" | "Meus trabalhos" |

Resto do inventário, todas em `src/app/i18n.js` salvo indicação:

| hoje | onde aparece | sugestão |
|---|---|---|
| **"Recursos"** (`features`) | título da lista dentro do modal | "O que está incluído" |
| **"Stack"** (`stackLabel`) | chips no rodapé do modal | "Especialidades" ou "O que uso" |
| **"Acessar"** (`visit`) | botão do link, que aqui é um WhatsApp | "Abrir" ou usar a observação do link |
| **"Agendar Call"** (`bookCall`) | rótulo padrão do botão principal | "Falar comigo" |
| **"O que o sistema faz?"** (`fieldSchema.js:116`) | rótulo do campo de itens | "O que está incluído?" |
| **"Link do projeto no ar"** (`fieldSchema.js:119`) | rótulo do campo de link | "Link para saber mais" |
| **"Ex: Landing page, Automação, App."** (`fieldSchema.js:109`) | ajuda de Categoria | "Ex: Consultoria online, Turma presencial" |
| **"Stack usada"** (`fieldSchema.js:121`) | campo do trabalho | "O que você usou" |
| **"Logo (com respiro)" / "Print (preenche a placa)"** (`fieldSchema.js:128`) | tipo da imagem | "Deixar a imagem inteira" / "Preencher o quadro" |
| **"Endereço do case"** (`fieldSchema.js:127`) | slug do trabalho | "Endereço deste trabalho" |
| **"Grupos de filtro"** (`fieldSchema.js:125`) | chips de grupo | "Categorias para filtrar" |

Nota: "O Desafio" e "A Solução" no modal funcionam bem para esta profissão e não precisam mudar. Os rótulos em pergunta do passo 2 ("O que estava travando antes?") também: o Diego respondeu sem hesitar.

---

# Como reproduzir

```bash
node scripts/_demos/demo-personal.mjs olhar          # estado inicial
node scripts/_demos/demo-personal.mjs perfil         # perfil completo, 2 imagens
node scripts/_demos/demo-personal.mjs projetos       # 6 trabalhos, 3 videos, 2 fotos 2:3
node scripts/_demos/demo-personal.mjs experiencias   # 3 experiencias, 1 certificado
node scripts/_demos/demo-personal.mjs switch         # PROVA do interruptor (B2)
node scripts/_demos/demo-personal.mjs formatos       # tabela de formatos de link
node scripts/_demos/demo-personal.mjs conferir       # o que voltou do banco
node scripts/_demos/demo-personal.mjs regressao      # PROVA do vertical que vira horizontal
node scripts/_demos/demo-personal.mjs restaurar      # recoloca a URL de Shorts
node scripts/_demos/demo-personal.mjs cliente        # conserta o que o interruptor comeu
node scripts/_demos/demo-personal.mjs fimdocurso     # conserta o fim da formacao
node scripts/_demos/demo-personal.mjs publicar        # publica e gera previa
node scripts/_demos/demo-personal.mjs visitante      # clique no card dentro do editor

# mede a moldura do video na pagina do visitante (1440 e 375)
node scripts/_demos/demo-personal-publico.mjs "<url da previa>" -final
node scripts/_demos/demo-personal-publico.mjs "<url da previa>" -m375 375
```

Nenhuma linha foi escrita por SQL. Tudo entrou pelo editor.
