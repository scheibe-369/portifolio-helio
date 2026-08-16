# Marina Salgueiro, chef de cozinha (demo-chef)

**URL pública:** https://demo-chef.myportifolio.com.br (hoje responde **HTTP 404**, ver Bloqueio B1)
**URL de prévia (essa funciona, HTTP 200):** https://demo-chef.myportifolio.com.br/?previa=75b64a545a4b06ebf0f742b46d34206b0a0f61c165367352
**Tempo:** cerca de 45 minutos no total, dos quais 21 de execução dentro do editor.
**Veredito:** consegue montar a página inteira, mas publica um portfólio que fala a língua de outra profissão, com a foto do rosto dela espremida numa tira de 25 px, e no fim não tem um link para mandar para o cliente.

O que foi construído: perfil completo (bio de 4 linhas, selo "Chef de cozinha" com ícone de chapéu, 4 redes, 4 números da capa, CTA de WhatsApp, 8 especialidades), 6 trabalhos (um com vídeo real do YouTube, `aEUpj9F0TfM`, Alex Atala e Celinha), 4 experiências (uma do tipo Estudo, com certificado anexado e consentimento ligado), 10 imagens reais do Unsplash subidas pelo editor. Scripts em `scripts/_demos/demo-chef*.mjs`, evidências em `out/chef-*`.

Zero erro de console e zero resposta HTTP 4xx/5xx do Supabase durante todo o preenchimento (`out/chef-erros.txt` está vazio). Nada aqui é crash. É pior: é tudo funcionando exatamente como foi escrito.

---

## 1. Bloqueio

### B1. O endereço da chef, durante a revisão, anuncia que está livre (severidade alta)
**O que fiz:** publiquei pelo painel, recebi a mensagem de fila de revisão, e abri `https://demo-chef.myportifolio.com.br/`.
**O que esperava:** uma página dizendo "esta página está em conferência" ou, no pior caso, um 404 mudo.
**O que aconteceu:** HTTP 404 com o texto **"Este endereço ainda está livre. Ninguém publicou um portfólio em demo-chef.myportifolio.com.br ainda. Se você chegou aqui por um link, confira se o endereço está escrito certo."** e um botão **"Quero este endereço"**.

A fila de revisão é esperada. O que não é esperado é que, na janela em que a chef acabou de pagar, publicar e mandar o link para o primeiro cliente, o produto diga para esse cliente que o endereço dela está à venda e ofereça o botão para ele tomar. Não existe estado intermediário entre "livre" e "no ar".
**Arquivo:** `worker/rotas/tenant.js` (rota principal chama `naoExiste()` para qualquer slug sem publicação, sem distinguir "nunca existiu" de "existe e está em conferência"). O texto está em `naoExiste`, no render do worker.
**Consequência direta:** não consigo entregar a URL pública pedida. Entrego a de prévia.

### B2. Não dá para conferir o certificado antes de publicar (severidade média)
**O que fiz:** anexei o diploma na entrada de Estudo, liguei o consentimento ("Deixar o certificado visível na minha página"), abri a prévia e cliquei no botão "Diplôme de Cuisine" que aparece no card.
**O que esperava:** abrir o documento, que é justamente o que eu estava consentindo em expor.
**O que aconteceu:** o botão aponta para `https://demo-chef.myportifolio.com.br/certificado/le-cordon-bleu-rio-de-janeiro-diplome-de-cuisine`, **sem carregar o `?previa=`**, e responde **404**.
**Arquivo:** `worker/rotas/tenant.js:44-48`. A rota testa `?previa` antes de `/certificado/`, e `servirCertificado()` só sabe ler portfólio publicado. Resultado: dentro da prévia o certificado nunca abre, nem com token nem sem token.
**Por que dói:** o consentimento é a decisão mais séria que o formulário pede (o próprio texto avisa que o documento traz nome completo e CPF). É exatamente a coisa que a pessoa precisa ver antes de ligar, e é a única que a prévia não mostra.

---

## 2. Defeito

### D1. Os lápis de "Editar" da seção de Experiência grudam nos marcadores e apontam para a entrada errada (severidade alta)
**O que fiz:** cadastrei 4 experiências, todas com 2 a 4 marcadores em "O que você fez ali?", e olhei o canvas do editor.
**O que esperava:** um lápis por entrada, cada um abrindo a sua.
**O que aconteceu:** a seção tem 15 `li` (4 entradas mais 11 marcadores) e o editor pendura as 4 âncoras nos 4 primeiros `li` em ordem de documento, que são: a entrada 1 e os três primeiros marcadores dela.

Medido no DOM (`scripts/_demos/demo-chef-conferir.mjs`):

| `li` | texto | `data-edit` que recebeu |
|---|---|---|
| 1 | "Chef executiva · Casa Amaro" | (fica com o dela, no fim) |
| 2 | "Comando de brigada de nove pessoas" | `experiencia:manjericao-da-ribeira-sous-chef` |
| 3 | "Menu autoral trocado a cada estação" | `experiencia:origem-cozinheira-de-praca` |
| 4 | "Rede própria de doze fornecedores do Recôncavo" | `experiencia:le-cordon-bleu-rio-de-janeiro-diplome-de-cuisine` |
| 6, 10, 13 | as entradas 2, 3 e 4 | **nenhum** |

Ou seja: clicar no lápis do marcador "Comando de brigada de nove pessoas" (que é do Casa Amaro) abre o formulário do **Manjericão da Ribeira**. E as entradas 2, 3 e 4 ficam **sem nenhum ponto de edição no canvas**. Visualmente a lista de marcadores fica salpicada de "✎ Editar" no meio das frases (`out/chef-canvas.txt`, `out/chef-canvas-inteiro.png`).
**Arquivo:** `src/modules/editor/components/editorShell.js:118`, `experiencia.querySelectorAll('ul > li')`. O seletor não distingue a `ul` das entradas da `ul` dos marcadores.
**Por que só apareceu agora:** só quebra quando a primeira entrada tem marcadores. O portfólio de origem provavelmente foi testado com o canvas de outra forma.

### D2. Depois de publicar, o editor esquece que publicou (severidade alta)
**O que fiz:** publiquei, li a mensagem de revisão, fechei o navegador, entrei de novo.
**O que esperava:** algum sinal de "em conferência".
**O que aconteceu:** a barra do topo diz **"RASCUNHO"**, o botão continua **"Publicar meu portfólio"** (e não "Publicar alterações"), **não existe** o link "Tirar minha página do ar", e a palavra "revisão" não aparece em lugar nenhum da tela (medido: `a tela fala em revisao? false`).

A frase que explica a fila existe uma vez só, em memória, como resultado do clique. Ao recarregar, ela some. `em_revisao` aparece em exatamente um lugar no front inteiro.
**Arquivos:** `src/modules/editor/state/publishState.js:39` (a RPC devolve o status e ninguém o guarda), `src/modules/editor/panels/publicarPanel.js:118` (mensagem transitória), `src/modules/editor/components/editorShell.js:27` (o selo da barra só conhece `first_published_at ? 'no ar' : 'rascunho'`), `src/modules/editor/panels/publicarPanel.js:73` e `:76` (rótulo do botão e link de tirar do ar dependem do mesmo `first_published_at`).
**Efeito prático:** a chef publica, o endereço dela responde "está livre" (B1) e o editor diz "rascunho". Ela vai concluir que não publicou e vai publicar de novo. Nada no produto diz o contrário.

### D3. A foto pequena do perfil é espremida numa tira de 25 px por causa de um `shrink-0` que falta (severidade alta)
**O que fiz:** subi um avatar quadrado, como o campo pede ("Foto pequena. A do cantinho. Quadrada, até 25 KB"). O pipeline gerou corretamente um WebP de **512x512**.
**O que esperava:** um círculo de 56x56.
**O que aconteceu:** medido em produção, `getBoundingClientRect` do `<img>`: **25x56 px em 1440**, **44x56 px em 375** (`out/chef-layout-1440.json`). O `object-fit: cover` então corta uma fatia vertical de 25 px do meio do rosto. Na página, a chef aparece como uma faixa preta e azul irreconhecível (`out/chef-zoom-cabecalho.png`).
**Arquivo:** `src/modules/profile/components/profilePanel.js:55`, `class="w-14 h-14 object-cover ring-white/10 ring-2 rounded-full"`, dentro de `<div class="flex items-center gap-4">` (linha 91). Sem `shrink-0`, o flex esmaga o primeiro item quando o `<h1>` do nome precisa de espaço.
**Gatilho:** nome que quebra em duas linhas. "Marina Salgueiro" quebra. "Helio" não quebra. O defeito nasce no dia em que o comprador tem nome comprido, o que é a maioria dos brasileiros.

### D4. Cada tecla digitada no formulário repinta a página inteira (severidade alta)
**O que fiz:** medi. Digitei 65 caracteres num campo do formulário de trabalho, com um `MutationObserver` contando reconstruções (`scripts/_demos/demo-chef-medir.mjs`).
**Resultado:** **65 teclas, 65 repinturas do canvas, 65 repinturas da casca do editor, 2572 ms, 39,6 ms por tecla**, com apenas 6 projetos cadastrados, headless, numa máquina de mesa.
**Arquivos:** `src/modules/editor/components/formulario.js:95` chama `aoMudar(false)` a cada evento de `input`; `formPanel.js:114` repassa; `projetosPanel.js:71` repassa; `editorApp.js:34-42` faz `raiz.innerHTML = renderCasca(...)` e `pintarCanvas()` inteiro, mais `createIcons()`.
**Por que dói nessa persona:** o campo "O que você entregou?" aceita 2500 caracteres. Escrever a descrição de um menu autoral são 2500 repinturas do portfólio inteiro. No celular, que é onde uma chef escreve, isso é digitar com o teclado engasgando. E o custo cresce com o número de trabalhos: quanto melhor o portfólio, pior de editar.
**Efeito colateral que eu mesmo bati:** na primeira passada, o campo "Até" do formulário de Estudo não apareceu depois de eu desligar "Ainda estou cursando", porque o script continuou 700 ms depois do clique e o formulário ainda estava se reconstruindo. Com 1500 ms funcionou. Um humano rápido no toque encontra a mesma corrida.

### D5. O painel de publicar acusa um problema de ordem que não existe (severidade média)
**O que fiz:** liguei "Projetos com vídeo primeiro" e abri o painel de publicar. Na grade, o trabalho com vídeo ("Moqueca de curral") **é o primeiro card**, tanto no canvas quanto na prévia.
**O que esperava:** silêncio.
**O que aconteceu:** "**1 case com vídeo não está no topo da grade. Reordenar?**", com botão. O aviso é permanente e não some, porque compara contra o `position` cru do banco enquanto a página já aplica a ordenação de vídeo no payload.
**Arquivo:** `src/modules/editor/state/publishState.js:28-34`. `sugestaoVideoPrimeiro` mede `projetos.indexOf(p) > i` sobre a lista não ordenada, e não sobre a ordem que `montarPayloadDoRascunho()` de fato renderiza.
**Efeito:** a última coisa que o comprador lê antes de clicar em publicar é um aviso falso de que a página dele está errada.

### D6. O cabeçalho do modal termina com um "·" solto em todo trabalho sem cliente (severidade média)
**O que fiz:** abri o modal de um prato. Nenhum dos 6 trabalhos de uma chef tem "cliente".
**O que aconteceu:** "PRATO AUTORAL · 2025 ·" (verificado no texto extraído do modal e em `out/chef-modal-video.png`).
**Arquivo:** `src/modules/projects/components/projectModal.js:83`, `${categoria} · ${ano} · ${cliente}` com separadores fixos e sem guarda de vazio. Vale para os 6 cards.

### D7. Na lista de redes, o rótulo e o valor se encostam (severidade média)
**O que fiz:** cadastrei 4 redes no formato pedido (`rótulo | texto ao lado | link`).
**O que aconteceu, medido:** folga horizontal entre rótulo e valor de **0 px** no Instagram, **0 px** no WhatsApp, **1 px** no LinkedIn (`out/chef-layout-1440.json`). Sai escrito "Instagram@marinasalgueiro" e "WhatsApp(71) 98844-0132", e o valor do WhatsApp ainda desalinha 8 px na vertical em relação ao rótulo.
**Arquivo:** `src/modules/profile/components/profilePanel.js:80-85`, `justify-between` sem `gap` e sem `min-w-0` nos dois `<span>`. Só não encosta quando o valor é curto, que é o caso de "GitHub / helio".

### D8. O corte de imagem descarta até 60% da foto, sem aviso e sem prévia do corte (severidade média)
Isto era o alvo declarado da persona, e o resultado é pior do que o esperado. Subi de propósito uma panorâmica e uma quadrada. Medido em `out/chef-layout-*.json` e `out/chef-corte-projetos.png`:

| campo | entrou | saiu | o que sumiu |
|---|---|---|---|
| Foto grande (4:5) | 1200x1800 | 800x1000 | 33% da altura |
| Foto pequena (1:1) | 800x800 | 512x512 | nada, e ainda assim ver D3 |
| Trabalho "Jantar Dendê e Fogo" (3:2) | 1400x1867 | 1200x800 | 55% da altura |
| Trabalho "Casa Amaro" (3:2) | 1400x2100 | 1200x800 | 60% da altura |
| Trabalho "Da feira ao prato" (3:2) | **2400x640** | **960x640** | **60% da largura** |
| Trabalho "Doces de tabuleiro" (3:2) | 1400x1400 | 1200x800 | 33% da altura |

Dois problemas somados:
1. **Nenhuma tela mostra o que vai ser cortado antes de cortar.** O único controle de enquadramento do produto é o slider vertical da foto grande do perfil. Trabalho não tem nenhum. A ajuda diz "Corte 3:2, ate 90 KB", que não é aviso, é uma sigla.
2. **A panorâmica sai com resolução menor que as vizinhas.** O pipeline nunca amplia, então uma foto larga e baixa vira um asset de 960x640 num grid onde todos os outros são 1200x800. Aquele card fica visivelmente mais mole que os outros cinco.

**Arquivo:** `src/modules/media/lib/imagePipeline.js:162-176` (corte central fixo) e `:175` (`Math.min(1, ...)`, que é o que impede a ampliação).
**Para uma chef isso não é detalhe:** foto de prato é o produto. Cortar 60% de um prato empratado é entregar outro prato.

### D9. A pílula "Personalização" continua no campo mesmo quando a conta tem a personalização (severidade baixa)
Medido: `theme_accent` habilitado, `cta_label` habilitado e preenchido ("Reservar mesa", que sai na página), e mesmo assim os três campos exibem a pílula de cadeado "Personalização".
**Arquivo:** `src/modules/editor/fields/primitivos.js:31`. A pílula é impressa por `campo.feature === 'custom'`, sem olhar `bloqueado`. Quem pagou continua vendo o selo de "isto é pago" em cima do que já comprou.

### D10. A página publicada de uma chef carrega uma classe CSS chamada `vibecoder-btn` (severidade baixa)
O selo "Chef de cozinha" é renderizado como `<button class="inline-flex vibecoder-btn ...">`. Um cliente que abrir o inspetor lê a palavra.
**Arquivos:** `src/modules/profile/components/profilePanel.js:39`, `src/styles/global.css:33`.

### D11. Acentos faltando nas ajudas e nas mensagens de erro (severidade baixa)
"Corte 4:5, **ate** 120 KB", "Quadrada, **ate** 25 KB", "Corte 3:2, **ate** 90 KB" (`fieldSchema.js:67,68,107`), e as mensagens "**nao** reconheci este link do YouTube", "o link precisa **comecar** com https://", "e-mail **invalido**" (`primitivos.js:219-226`). Convivem com textos vizinhos corretamente acentuados, o que deixa parecendo erro de digitação e não escolha.

---

## 3. Atrito

### A1. Redes e números da capa são digitados como texto com barra vertical (severidade alta)
"Uma por linha, no formato: rótulo | texto ao lado | https://link". Uma chef precisa aprender uma micro sintaxe para cadastrar o Instagram dela. Não há validação: se ela esquecer uma barra, o campo vira rótulo vazio e ela só descobre olhando a página. É o único lugar do editor que pede formato em vez de campos, e é justamente o que quase todo mundo vai querer preencher.
**Arquivo:** `src/modules/editor/data/fieldSchema.js:81-82` e `primitivos.js:194-205`. O comentário do código assume a decisão de propósito ("seria o sétimo primitivo"). A decisão custa mais para essa persona do que economiza.

### A2. O produto oferece a prévia como consolo da revisão, e não gera a prévia (severidade média)
A mensagem de publicação diz "Enquanto isso o link de prévia já mostra tudo". Naquele instante não existe link de prévia nenhum: é preciso rolar para cima, achar "Gerar link de prévia" e clicar. Duas telas depois ela ainda não tem link para mandar para ninguém.
**Arquivo:** `src/modules/editor/panels/publicarPanel.js:122`.

### A3. Todo trabalho novo começa com as três sanfonas fechadas (severidade média)
"O case", "Provas" e "Ajustes finos" nascem recolhidos em cada projeto novo. Cadastrar 6 trabalhos custou 18 aberturas de sanfona só para chegar nos campos, e a foto do prato (a coisa mais importante) está no passo 1, mas o vídeo e o ano estão escondidos no passo 3.
**Arquivo:** `src/modules/editor/components/formulario.js:36-40`.

### A4. Não existe nenhum caminho visível para editar a segunda experiência em diante (severidade média)
Consequência direta de D1, mas vale separado porque é o que o usuário sente: no canvas, as entradas 2, 3 e 4 não têm lápis. Quem não descobrir o botão "Experiência" na barra do topo conclui que só a primeira é editável.

### A5. O formulário do trabalho tem 19 campos e nenhum é da profissão (severidade média)
Preenchi os 19 e não existe onde escrever ingrediente, tempo de preparo, número de pessoas, preço ou onde comer aquilo. Ver seção 4.

### A6. "Ano" só oferece 8 opções, de 2026 a 2019 (severidade baixa)
Uma chef com 12 anos de cozinha não consegue registrar o prato de 2014 que fez o nome dela. `src/modules/editor/config/editor.config.js:20-23`.

---

## 4. Buraco de template

### T1. Não existe preço nem faixa de investimento (severidade alta)
Jantar fechado e consultoria de cardápio são vendidos por valor. A página tem um botão de WhatsApp e nenhum lugar para dizer "a partir de R$ X por pessoa". A confeiteira da lista de personas vai bater no mesmo buraco.

### T2. Não existe cardápio, no sentido de lista de itens com nome e descrição curta (severidade alta)
O mais perto é "O que o sistema faz?", que vira uma lista de marcadores com ícone de check. Um menu de sete tempos não é uma lista de recursos com check.

### T3. Um trabalho aceita uma imagem só (severidade alta)
Um menu degustação tem sete pratos e sete fotos. O card aceita **uma** foto e **um** vídeo do YouTube. Para mostrar o menu inteiro, a chef precisa cadastrar sete "projetos", o que quebra a grade e a barra de filtro. Falta galeria por trabalho.

### T4. Não existe campo de cidade, área de atendimento ou endereço no perfil (severidade média)
"Salvador, BA" só entrou porque eu enfiei na linha de "O que você faz". Para quem vende serviço presencial, onde é a coisa mais consultada da página, e ela não é um campo.

### T5. Não existe depoimento nem avaliação (severidade média)
Para vender jantar a vinte pessoas, a frase de um cliente vale mais que "O Desafio". O template tem espaço para narrativa de projeto e nenhum para prova social.

### T6. Não existe data nem agenda (severidade média)
Jantar fechado é evento com data. O único campo temporal do trabalho é "Ano", num select.

### T7. O CTA é um só, global (severidade média)
"Reservar mesa" serve para o restaurante e não serve para a consultoria de cardápio nem para o jantar particular. Cada trabalho tem "Link do projeto no ar", que é uma URL, e não um botão de encomenda.

### T8. Certificado só existe pendurado numa entrada de Experiência (severidade média)
Alvará sanitário, curso de manipulação de alimentos, prêmio de guia gastronômico: tudo isso é documento que a chef quer mostrar e que não é "uma passagem por uma organização". Para exibir o certificado ela precisou inventar uma linha de currículo.

### T9. Redes são texto livre e não conhecem os canais da profissão (severidade média)
TikTok, iFood, Google Meu Negócio e Instagram são os canais de venda de uma chef. Todos entram como "rótulo | valor | link" digitado à mão, sem ícone e sem validação.

### T10. A paleta não pode ser aplicada nesta fase (severidade baixa, registrada a pedido)
A persona pede âmbar `#E8833A` sobre `#1A1008`. Onde faria falta, em ordem: o selo do perfil e o botão de CTA (hoje roxo `#7C5CFC` sobre preto absoluto, que briga com toda foto de comida quente), a cor de destaque dos cards e o fundo das placas. Comida é laranja, vermelha e dourada; o roxo padrão aparece atrás de todas as seis fotos e é a única cor da página que não veio do prato.

---

## 5. Palavra errada

Esta é a seção que justifica o experimento. Nada abaixo está quebrado: está tudo escrito para outra pessoa.

### No editor

| Onde | Diz hoje | Devia dizer |
|---|---|---|
| Gaveta de lista | "Meus projetos" / "Adicionar projeto" | "Meus trabalhos" / "Adicionar trabalho" |
| Formulário, título | "Novo projeto" | "Novo trabalho" |
| Campo de imagem | "Imagem do case" | "Foto do trabalho" |
| Passo 2, título | "O CASE" | "A história" |
| Campo | "Nome do projeto" | "Nome do trabalho" |
| Ajuda de "Categoria" | "Ex: Landing page, Automação, App." | "Ex: Menu degustação, Jantar fechado, Consultoria de cardápio" |
| Campo | "O que estava travando antes?" | "Por que este trabalho existiu?" |
| Campo | **"O que o sistema faz?"** | "O que tem nele?" |
| Campo | **"Link do projeto no ar"** | "Link, se existir". Prato não tem URL. Cinco dos seis trabalhos ficaram sem link, e o rótulo faz parecer que falta alguma coisa |
| Campo | **"Stack usada"** | "Técnicas e ingredientes" |
| Campo | "Foi para um cliente" / "Desligado, o projeto é seu" | "Foi encomenda de alguém" |
| Campo | "Grupos de filtro" | "Etiquetas" |
| Ajustes finos | "Endereço do case" | "Endereço do trabalho" |
| Ajustes finos | "Tipo da imagem: Logo (com respiro) / Print (preenche a placa)" | "Enquadramento: com moldura / preenchendo o card". Foto de prato não é logo nem print |
| Perfil, passo 3 | **"Stacks que você domina"** | "Suas especialidades" |
| Perfil, ajuda de "O que você faz" | 'Ex: "Desenvolvedor e criador de produtos"' | 'Ex: "Chef de cozinha e consultora de cardápio"' |
| Perfil, passo 3 | "Projetos com vídeo primeiro" / "Case com vídeo converte mais" | "Trabalhos com vídeo primeiro" |
| Perfil, passo 3 | "Projetos por página" | "Trabalhos por página" |

**O caso mais grave é o mesmo campo com três nomes diferentes.** As especialidades da chef aparecem como:
- **"Stacks que você domina"** no formulário (`fieldSchema.js:84`),
- **"O que você usa no trabalho"** no bloco vazio do canvas (`editorShell.js:78`),
- **"STACKS DOMINADAS"** na página publicada (`i18n.js:19`).

Alguém já percebeu que "stacks" não serve e corrigiu **um** dos três lugares. Os outros dois continuam dizendo que uma chef domina stacks.

### Na página publicada

| Onde | Diz hoje | Devia dizer |
|---|---|---|
| Título da seção | "MEUS PROJETOS" | "MEUS TRABALHOS" |
| Contador | "6 **cases**" | "6 trabalhos" |
| Carrossel | "STACKS DOMINADAS" | "ESPECIALIDADES" |
| Modal | "O DESAFIO" | "O PONTO DE PARTIDA" |
| Modal | "A SOLUÇÃO" | "O QUE EU FIZ" |
| Modal | "RECURSOS" | "O QUE TEM" |
| Modal | "STACK" | "TÉCNICAS" |
| Modal, link | "Acessar" | "Ver" |
| Experiência | "4 **passagens**" | "4 experiências" |
| CTA, padrão de fábrica | **"Agendar Call"** | Para uma chef, "Reservar mesa" ou "Pedir orçamento". E esse texto está atrás do bump de Personalização: sem pagar, a chef publica um botão de WhatsApp escrito "Agendar Call" |
| HTML | `class="vibecoder-btn"` no selo do perfil | qualquer nome que não seja a profissão do dono anterior |

Todas as strings de página vivem em `src/app/i18n.js:15-41`. São 12 palavras, num objeto só. É a correção mais barata deste relatório e a que mais muda o que o comprador sente ao ver a própria página pela primeira vez.

---

## Apêndice: evidências

| Arquivo | O que mostra |
|---|---|
| `out/chef-previa-inteira.png` | a página inteira, como o cliente veria |
| `out/chef-zoom-cabecalho.png` | o avatar espremido em 25 px (D3) |
| `out/chef-corte-projetos.png` | a grade dos 6 trabalhos, com o estrago do corte (D8) |
| `out/chef-modal-video.png` | o modal com o vídeo do YouTube e o "·" solto (D6) |
| `out/chef-canvas.txt` | os "✎ Editar" salpicados nos marcadores (D1) |
| `out/chef-layout-1440.json`, `out/chef-layout-375.json` | as medidas de caixa do avatar e a folga zero das redes (D3, D7) |
| `out/chef-publicar-antes.txt`, `out/chef-publicar-depois.txt` | o checklist, o aviso falso de ordem e a mensagem de revisão (D5, D2) |
| `out/chef-publico.txt` | "Este endereço ainda está livre" (B1) |
| `out/chef-form-projeto.txt`, `out/chef-perfil-tela.txt` | os rótulos do editor, palavra por palavra (seção 5) |
| `out/chef-erros.txt` | vazio: nenhum erro de console ou de rede em toda a sessão |

Scripts: `scripts/_demos/demo-chef.mjs` (preenchimento), `demo-chef-corrigir.mjs` (retomada da entrada de Estudo), `demo-chef-medir.mjs` (medição de repintura e publicação), `demo-chef-conferir.mjs` (âncoras, imagens, prévia, modal), `demo-chef-layout.mjs` (medidas de caixa em 1440 e 375), `demo-chef-final.mjs` (estado pós-publicação e certificado).
