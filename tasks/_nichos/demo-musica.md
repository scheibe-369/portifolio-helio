# demo-musica · Vitória Alencar, produtora musical (Recife, PE)

**URL:** https://demo-musica.myportifolio.com.br (404 no momento: a primeira publicação caiu na fila de revisão humana, como esperado)
**Tempo até publicar:** cerca de 1 hora de sessão automatizada, em 11 execuções (perfil, áudio, projetos, experiências, switches, publicar, sondas)
**Conteúdo montado:** perfil completo com selo, 5 redes, 4 números de capa, 10 especialidades, 6 trabalhos com imagem, 3 experiências (2 estúdios e 1 formação com certificado)

**Veredito:** o produto monta um portfólio bonito para uma produtora musical e não deixa ele tocar uma única nota, e no caminho eu esbarrei num defeito do formulário que é mais grave que o buraco de áudio: um clique em "remover" apagou dez especialidades de uma vez.

---

## A seção sobre áudio (o teste central)

O trabalho da Vitória é som. O produto tem exatamente um campo de mídia embedada, e ele se chama **"Vídeo no YouTube"**. Testei 11 links no campo. As mensagens abaixo são literais, copiadas do DOM (`out/musica-audio-links.json`).

| O que colei | Nota ao lado do campo | Erro embaixo do campo |
|---|---|---|
| `https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC` | `não reconheci este link` | `nao reconheci este link do YouTube` |
| `https://open.spotify.com/album/1DFixLWuPkv3KT3TnV35m3` | `não reconheci este link` | `nao reconheci este link do YouTube` |
| `https://open.spotify.com/embed/track/...` (o embed oficial) | `não reconheci este link` | `nao reconheci este link do YouTube` |
| `spotify:track:4uLU6hMCjMI75M1A2tKUQC` (URI nativa) | `não reconheci este link` | `nao reconheci este link do YouTube` |
| `https://soundcloud.com/vitoriaalencar/trilha-beira-mar` | `não reconheci este link` | `nao reconheci este link do YouTube` |
| `https://vitoriaalencar.bandcamp.com/album/sessoes-panela` | `não reconheci este link` | `nao reconheci este link do YouTube` |
| `https://music.apple.com/br/album/...` | `não reconheci este link` | `nao reconheci este link do YouTube` |
| `https://www.deezer.com/br/album/123456` | `não reconheci este link` | `nao reconheci este link do YouTube` |
| `https://vimeo.com/76979871` | `não reconheci este link` | `nao reconheci este link do YouTube` |
| `https://music.youtube.com/watch?v=K4DyBUG242c` | `vídeo reconhecido (K4DyBUG242c)` | (vazio) |
| `https://www.youtube.com/watch?v=K4DyBUG242c` | `vídeo reconhecido (K4DyBUG242c)` | (vazio) |

**A mensagem explica o que fazer? Não.** Ela diz o que o link não é, nunca o que ele deveria ser. Nenhuma das duas mensagens cita Spotify, SoundCloud ou Bandcamp, nenhuma diz "este campo só aceita YouTube", e o campo não tem `placeholder` nenhum (conferido no HTML, `out/musica-campo-video.json`). O texto de ajuda diz **"Cole o link como ele veio. Shorts, live e link curto funcionam."**, que para quem trabalha com som lê como um convite: "cole o link como ele veio" é exatamente o que faz uma produtora colar o link do Spotify.

**Pior que recusar, ele bloqueia.** Preenchi nome e categoria de um projeto, colei o link do Spotify no campo e apertei Salvar. Resultado (`out/musica-audio-salvar.json`):

```
gavetaAberta: true
msgRodape:    "Confira os campos marcados."
erroVideo:    "nao reconheci este link do YouTube"
```

O projeto **não salva**. Um campo do passo 3, opcional, com um link que a pessoa colou de boa fé, trava a gravação do trabalho inteiro. A produtora que escreveu problema, solução e oito bullets perde tudo se fechar a aba sem descobrir que a culpa é do link do Spotify lá embaixo.

**Três mensagens diferentes para o mesmo evento**, e duas delas em ortografias diferentes: `não reconheci este link` (com acento, `formulario.js:90`), `nao reconheci este link do YouTube` (sem acento, `primitivos.js:222`) e `Confira os campos marcados.` no rodapé. Quem lê rápido acha que são três problemas.

### O YouTube resolve como paliativo? Parcialmente, e o custo é alto

Usei dois vídeos reais e validados por oembed (`K4DyBUG242c`, NCS, e `fJ9rUzIMcZQ`, Queen) em 2 dos 6 trabalhos. O que se ganha: os dois cards ganham selo de play na grade e o modal abre um iframe `aspect-video` (`projectModal.js:64`). Funciona.

O que se perde:

1. **Quatro dos seis trabalhos continuam mudos.** Mixagem, single e vinheta de rádio não têm clipe no YouTube, e nunca vão ter. Na grade publicada, 2 cards têm play e 4 são foto parada (`out/musica-canvas-inteiro.png`).
2. **Para usar o paliativo ela precisa produzir um vídeo que não existe.** Subir uma faixa no YouTube significa montar um MP4 de imagem estática, subir, esperar processar e torcer para o Content ID não derrubar. Em disco de gravadora ela normalmente **não tem direito** de subir o master no próprio canal. O paliativo depende de uma permissão que o cliente dela é quem tem.
3. **A moldura é 16:9 para som.** Um player de áudio ocupa uma faixa de 80px de altura; aqui ele ocupa um retângulo de vídeo com uma imagem parada dentro. O card fica com cara de vídeo quebrado.
4. **O selo de play mente.** Ele promete um vídeo, e o que existe é uma música.

### O que precisaria existir (isto vira requisito)

Por ordem de esforço contra retorno:

1. **Renomear o campo e ampliar a allowlist do parser, mantendo o modelo de dado atual.** `youtube.js` já guarda id + orientação e monta a URL no render (decisão certa). O mesmo formato serve para os outros: `{ provedor, id, orientacao }`. Provedores mínimos para música: `open.spotify.com` (track, album, playlist, artist), `soundcloud.com`, `*.bandcamp.com`. Todos os três publicam embed oficial em iframe e todos aceitam ser servidos de domínio de terceiro. O CHECK de `youtube_id` vira CHECK de `(provedor, id)`.
2. **Altura por provedor, não `aspect-video` fixo.** Spotify track compacto tem 152px de altura, álbum tem 352px, SoundCloud tem 166px. A infraestrutura para isso já existe: `youtube_orientation` (0007) já resolve Shorts com `aspect-[9/16]` no mesmo `projectModal.js:59`. É a mesma decisão, aplicada a mais um eixo.
3. **Allowlist genérica com host fixo, nunca `includes()`.** O comentário de `youtube.js:20` já diz por quê, e a regra continua valendo: host exato em `Set`, id validado por regex, nada de casar substring.
4. **Se nada disso couber agora, a correção barata é a mensagem.** Trocar `nao reconheci este link do YouTube` por algo que diga a verdade inteira: `este campo só aceita YouTube. Spotify, SoundCloud e Bandcamp ainda não entram aqui; por enquanto, cole o link deles em "Link do projeto no ar".` Isso custa uma linha e desarma o bloqueio de salvar, porque a pessoa sabe para onde levar o link.
5. **Mais de uma faixa por trabalho.** Um álbum tem 11 faixas. Hoje cabe um embed por projeto. Uma lista de 1 a 5 embeds por trabalho é o que transforma o card de "case" em "disco".

### O nome do campo, e o que ele comunica

`"Vídeo no YouTube"` aparece assim no rótulo do formulário (`fieldSchema.js:118`), e o texto de venda repete: `"Foto, bio, projetos, imagens, vídeo do YouTube e experiências"` (`oferta.data.js:27`). É honesto e é consistente, e é exatamente o problema: para quem trabalha com som, o produto está dizendo, em dois lugares, que este não é um lugar para o trabalho dela. Uma produtora musical lê "vídeo do YouTube" na página de vendas e fecha a aba antes de comprar. Sugestão de rótulo depois do item 1: **"Vídeo ou faixa"**, com ajuda `YouTube, Spotify, SoundCloud ou Bandcamp. Cole o link como ele veio.`

---

## Bloqueio

### B1. Um clique em "remover" apagou as dez especialidades. Os switches travam depois do primeiro clique. `[gravíssimo, atinge todos os nichos]`

**O que fiz:** cadastrei cinco chips em "Stack usada" e cliquei no × do primeiro.
**O que esperava:** sobrarem quatro.
**O que aconteceu:** sobrou zero. Os cinco sumiram com um clique.

No mesmo formulário, cliquei quatro vezes seguidas no switch "Foi para um cliente" (`out/musica-sonda-condicionais.txt`):

```
switch "tem_cliente" no form novo: false
clique 1: aria-checked=true
clique 2: aria-checked=true
clique 3: aria-checked=true
clique 4: aria-checked=true
```

Depois do primeiro clique o switch **nunca mais desliga**. Não dá para corrigir sem recarregar a página, e nada na tela avisa que o clique não fez efeito.

**Causa, confirmada no código:** `repintarCorpo` (`src/modules/editor/components/editorDrawer.js:61`) troca o `innerHTML` do **mesmo** elemento e chama `aoLigar(corpo)` em seguida; `ligarFormulario` (`src/modules/editor/components/formulario.js:60`) faz `corpo.addEventListener(...)` sem nunca remover o anterior. Como o nó `[data-gaveta-corpo]` sobrevive à repintura, cada repintura **soma** um jogo inteiro de sete ouvintes ao mesmo nó. Um clique passa a disparar N handlers.

O estrago varia com o handler:

- **switch** (`formulario.js:124`): `valores[k] = !valores[k]`, N vezes. Com N par, o clique não faz nada. Como cada handler ainda chama `aoMudar(true)`, o próprio clique multiplica os ouvintes, e a paridade trava.
- **remover chip** (`formulario.js:135`): `filter((_, idx) => idx !== i)`, N vezes, cada uma sobre a lista já filtrada. Um clique remove N itens. Foi o que apagou os cinco.
- **remover imagem** (`formulario.js:152`) e **consentimento do certificado** (`formulario.js:166`): mesma família, mesmo risco.

**Arquivos:** `src/modules/editor/components/editorDrawer.js:61`, `src/modules/editor/components/formulario.js:60`.
**Repro:** `node scripts/_demos/demo-musica-sonda.mjs`.
**Contorno que usei:** mexer em um switch por abertura da gaveta e salvar entre um e outro, porque `fecharGaveta` zera `raiz.innerHTML` e descarta os ouvintes (etapa `switches` do meu script, com conferência de estado no fim).

### B2. Nenhum lugar do produto toca áudio `[bloqueio do nicho]`

Coberto inteiro na seção acima. Registro aqui só o veredito: um portfólio de produtora musical que não toca som é um portfólio mudo, e hoje o produto não tem campo de áudio, não tem embed genérico e não aceita nenhuma das três casas onde música mora.

---

## Defeito

### D1. A entrada de formação foi publicada como "DESDE 2010" `[alto]`

**O que fiz:** cadastrei o bacharelado na UFPE, 2010 a 2014, desligando "Ainda estou cursando".
**O que esperava:** o campo "Até" nascer e aceitar 2014.
**O que aconteceu:** o campo `period_end` nunca apareceu, o switch não desligou, e a página publicada diz **"DESDE 2010"**. A Vitória aparece como graduanda há dezesseis anos (`out/musica-canvas-inteiro.png`).

É consequência direta de B1: `period_end` tem `dependeDe: (v) => !v.atual` (`fieldSchema.js:156`) e o switch nasce ligado (`experienciasPanel.js:35`). Como o switch não desliga depois da primeira repintura (e trocar o tipo para "Estudo" já é uma repintura), o campo é **inalcançável em toda entrada de estudo**. Na sonda: `depois de kind=estudo: period_end existe? false / depois de desligar: period_end existe? false`.

**Arquivo:** `src/modules/editor/panels/experienciasPanel.js:35` + a causa em B1.

### D2. Foto de perfil real de 800x800 é recusada `[alto]`

**O que fiz:** subi uma foto de 800x800 e 140 KB no campo "Foto pequena".
**O que esperava:** o pipeline reduzir e aceitar, como fez com o hero.
**O que aconteceu:** `nao consegui deixar esta imagem abaixo de 25 KB. Tente uma imagem mais simples ou menor.`

O destino `avatar` mira 512px com orçamento de 25 KB e três tentativas de qualidade que param em 0.62 (`src/modules/media/lib/imagePipeline.js:32` e `:100`). Foto de pessoa, com pele e textura, não cabe em 25 KB a 512px. Só passou quando reduzi a fonte **na mão** para 256x256, e aí a saída ficou 256x256, metade do que o próprio pipeline tem como alvo.

O conselho da mensagem funciona pela metade: "menor" resolve, "mais simples" não quer dizer nada para quem tem uma foto. E a mensagem não diz **quanto** menor. Quem não sabe editar imagem trava no item "Tem pelo menos uma foto sua" do checklist de publicação.

**Sugestão:** ou subir o orçamento do avatar, ou deixar o pipeline reduzir sozinho em degraus até caber antes de desistir (ele já tem `reduzirEmDegraus`), ou a mensagem dizer o número: `tente uma foto menor, até 300 pixels de lado`.
**Arquivo:** `src/modules/media/lib/imagePipeline.js:32,100,206`.

### D3. O texto do botão principal é cortado no desktop `[médio]`

**O que fiz:** escrevi `Falar sobre seu disco` em "Texto do botão" (limite do campo: 40 caracteres).
**O que aconteceu:** no desktop sai **"FALAR SOBRE SEU DISC"**, com o O comido. Medido (`out/musica-medidas.json`): a 1440px a caixa tem 160px e o conteúdo tem 168px. A 768px e a 375px cabe.

O campo promete 40 caracteres e o botão aguenta uns 20 na largura cheia. É o pior formato de defeito: quem revisa no celular vê certo e publica errado.

**Arquivos:** `fieldSchema.js:77` (maxLength 40) contra o botão em `src/modules/profile/components/profilePanel.js` (`renderCta`).
**Repro:** `node scripts/_demos/demo-musica-medidas.mjs`.

### D4. Capa de disco quadrada perde um terço da altura `[médio, e é o corte que mais dói neste nicho]`

Subi três imagens 1:1, que é o formato de toda capa de álbum que existe. Saíram todas 1200x800:

```
Maré de Dentro    1400x1400 -> 1200x800
Câmbio Preto      1400x1400 -> 1200x800
Sessões Panela    1400x933  -> 1200x800   (esta já era 3:2, saiu inteira)
Vinheta (2400x640)          -> 960x640    (perdeu 60% da largura)
Trilha (1400x2100)          -> 1200x800   (perdeu 62% da altura)
```

O destino `project` é `proporcao: 3/2` fixo (`imagePipeline.js:34`). Capa de disco cortada em 3:2 corta o nome do artista, que costuma estar no topo ou no rodapé da arte. Não existe controle de enquadramento em projeto: o slider de `object-position` só existe no hero.

**Sugestão:** "Tipo da imagem" já tem duas opções (`Logo (com respiro)` e `Print (preenche a placa)`). Uma terceira, `Capa (quadrada)`, resolveria o nicho inteiro com uma entrada em `DESTINOS` e uma opção no select.
**Arquivos:** `src/modules/media/lib/imagePipeline.js:34`, `fieldSchema.js:128`.

### D5. "Observação sobre o link" só nasce depois de mexer em outra coisa `[médio]`

**O que fiz:** preenchi "Link do projeto no ar" com o álbum no Spotify e procurei o campo de observação para escrever "Ouça o disco completo".
**O que esperava:** o campo aparecer, já que ele depende do link.
**O que aconteceu (sonda 2):**

```
form novo:                      link_note existe? false
depois de DIGITAR o link:       link_note existe? false
depois de sair do campo (blur): link_note existe? false
depois de adicionar um chip:    link_note existe? true
```

O campo só nasce quando alguma **outra** interação repinta o formulário. Digitar não repinta, e é de propósito (`formulario.js:56`, repintar durante a digitação rouba o foco), mas o efeito é um campo que existe no schema e que ninguém encontra. É o único jeito hoje de rotular um link de Spotify como "ouça aqui", e ele está escondido atrás de um acaso.

**Sugestão:** repintar no `blur` do campo de que outros dependem, ou renderizar `link_note` sempre e só desabilitá-lo enquanto o link estiver vazio.
**Arquivo:** `src/modules/editor/components/formulario.js:56,94`.

### D6. As pílulas de rede colam rótulo e valor no desktop `[baixo]`

A 1440px sai `Instagram@vitoriaalencar.som` e `SoundCloudvitoriaalencar`, sem espaço entre as duas partes, e o WhatsApp quebra o número em duas linhas dentro de uma pílula desenhada para uma (altura 61px contra 39px nas outras larguras). Com cinco redes, que é o mínimo de quem vive de música, a coluna fica apertada. Visível em `out/musica-medidas-1440.png`.

**Arquivo:** `src/modules/profile/components/profilePanel.js:80`.

### D7. O carrossel de especialidades corta o primeiro chip `[baixo]`

Na primeira pintura aparece `usical` no lugar de `Produção musical`, cortado na borda esquerda (`out/musica-canvas-inteiro.png`). É o comportamento do marquee, mas a primeira coisa que se lê na seção é uma palavra pela metade.

### D8. O campo de rótulo do certificado não é endereçável como os outros `[baixo]`

Todo campo do editor mora dentro de `[data-campo="<key>"]`. O rótulo do certificado é a exceção: ele é um `<input data-k="certificate_label">` dentro de um `.ed-field.ed-sub` **sem** `data-campo`, aninhado em `[data-campo="certificate"]` (`src/modules/editor/fields/certificado.js:68`). Resultado prático: o certificado da UFPE foi publicado com o rótulo padrão "Certificado" em vez de "Diploma de Bacharelado em Música". Quebra a própria convenção do formulário e é o tipo de exceção que só aparece quando alguém automatiza ou testa.

---

## Atrito

- **O bloqueio do salvar não diz onde está o problema.** "Confira os campos marcados." com o formulário rolado no passo 1 e o erro no passo 3, dentro de um `<details>` que pode estar fechado. Não há rolagem até o campo nem abertura automática do passo.
- **O campo de vídeo não tem placeholder.** Campo vazio, rótulo "Vídeo no YouTube" e nada mais. Um `https://youtube.com/watch?v=...` cinza economizaria metade das tentativas erradas.
- **O aviso da fila de revisão só aparece depois de publicar.** O painel lista oito itens verdes e um botão "Publicar meu portfólio", e só depois do clique aparece: *"Recebido. A primeira publicação de cada conta passa por uma conferência rápida antes de ir ao ar. Enquanto isso o link de prévia já mostra tudo."* O texto é bom, chega tarde. Quem publica achando que vai ao ar em segundos manda o link para o cliente antes da hora.
- **Quatro números de capa espremem o cabeçalho.** Com quatro estatísticas, "STREAMS SOMADOS / 12,4 mi" quebra em duas linhas e "ANOS DE ESTÚDIO" em três. O campo permite seis.
- **O vídeo mora no passo 3.** Para quem tem trabalho audiovisual, o embed é a primeira coisa a preencher, não a décima.
- **A sigla da experiência sai estranha.** "UFPE, Departamento de Música" vira o monograma **UD**. A vírgula no nome atrapalha a extração de iniciais.

---

## Buraco de template

- **Não existe faixa.** O modelo é "projeto com uma imagem, um link e um vídeo". Um álbum tem 11 faixas, cada uma com duração e crédito próprio. Não há lista de faixas, nem duração, nem um segundo embed.
- **Não existe crédito por papel.** Em música o mesmo profissional é produtor num disco, mixador em outro e apenas técnico no terceiro, e essa distinção é a coisa mais importante do currículo dela. Hoje isso só cabe no texto livre de "Categoria", que é um campo de 40 caracteres.
- **As redes são texto puro, sem ícone.** `socialItem` (`profilePanel.js:80`) desenha só duas `<span>`. "Spotify" aparece como palavra, do mesmo tamanho e cor que "WhatsApp". Para um profissional cujo Spotify é o cartão de visita, a plataforma mais importante da carreira dele é indistinguível de um telefone.
- **Não há proporção quadrada para imagem de trabalho.** Ver D4.
- **O botão do link no card é sempre "Acessar"** (`i18n.js:32`). Para um link de disco, o rótulo certo é "Ouvir no Spotify". `link_note` seria o remendo, e ele está escondido (D5).
- **Não há como marcar um trabalho como "não meu".** O switch "Foi para um cliente" cobre metade: em música existe o disco que ela produziu mas cuja arte e master pertencem à gravadora, e por isso ela não pode subir nem áudio nem imagem.

---

## Palavra errada

Ordenado pelo que mais destoa para quem não é programador.

| Onde | Está escrito | Sugestão |
|---|---|---|
| `fieldSchema.js:116`, rótulo de `features` do projeto | **"O que o sistema faz?"** | "O que esse trabalho entrega?" Um disco não é um sistema. |
| `fieldSchema.js:121`, rótulo de `stack` do projeto | **"Stack usada"** | "Ferramentas e técnicas" |
| `fieldSchema.js:84`, rótulo de `stacks` do perfil | **"Stacks que você domina"** | "O que você usa no trabalho", que é o texto que o próprio editor já usa no bloco vazio (`editorShell.js:78`). Hoje a mesma coisa tem **três nomes**: "O que você usa no trabalho" no bloco vazio, "Stacks que você domina" no formulário e **"STACKS DOMINADAS"** na página publicada (`i18n.js:19`). |
| `i18n.js:19`, título da seção publicada | **"Stacks Dominadas"** | "Especialidades". É a palavra mais visível da página, e é jargão de dev impresso no portfólio de uma produtora musical. |
| `fieldSchema.js:109`, ajuda de `category` | **"Ex: Landing page, Automação, App."** | "Ex: Álbum, Trilha, Mixagem, Ensaio, Cardápio." Três exemplos, os três de software. |
| `fieldSchema.js:118`, rótulo de `video` | **"Vídeo no YouTube"** | "Vídeo ou faixa" (depende do requisito 1 da seção de áudio) |
| `fieldSchema.js:119`, rótulo de `link` | **"Link do projeto no ar"** | "Link para ver ou ouvir". Disco não fica "no ar", fica lançado. |
| `primitivos.js:222` contra `formulario.js:90` | **"nao reconheci este link do YouTube"** (sem acento) e **"não reconheci este link"** (com acento) | Uma mensagem só, acentuada, dizendo o que o campo aceita. |
| `PASSOS_PROJETO` (`fieldSchema.js:41`) | **"O case"**, **"Provas"** | "A história", "O resultado" |
| Cabeçalho da grade | **"MEUS PROJETOS"** e **"6 cases"** | "Trabalhos" e "6 trabalhos". "Case" é palavra de agência e de dev. |
| Cabeçalho de experiência | **"3 passagens"** | Aceitável, mas com uma formação no meio ficou estranho: um diploma não é passagem. |

---

## Arquivos gerados

Scripts: `scripts/_demos/demo-musica.mjs` (etapas `perfil`, `switches`, `audio`, `projetos`, `experiencias`, `publicar`, `visitante`, `ler`), `scripts/_demos/demo-musica-sonda.mjs` (ouvintes empilhados e campos condicionais), `scripts/_demos/demo-musica-medidas.mjs` (estouro do CTA e das pílulas).

Provas: `out/musica-audio-links.json`, `out/musica-audio-salvar.json`, `out/musica-campo-video.json`, `out/musica-sonda-condicionais.txt`, `out/musica-medidas.json`, `out/musica-switches.json`, `out/musica-canvas-inteiro.png`, `out/musica-medidas-{1440,768,375}.png`, `out/musica-publicar-depois.txt`.

Mídia real do Unsplash, subida pelo editor: `out/midia/demo-musica/`. Vídeos do YouTube validados por oembed antes de usar: `K4DyBUG242c` (NCS) e `fJ9rUzIMcZQ` (Queen).

Nenhum erro de console e nenhum HTTP 4xx ou 5xx do Supabase em toda a sessão (`out/musica-erros.txt` vazio). Todos os defeitos acima são silenciosos.
