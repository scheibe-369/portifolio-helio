# demo-funilaria · Zé Ricardo Pimenta, funileiro e pintor (Contagem, MG)

**URL:** https://demo-funilaria.myportifolio.com.br
(hoje responde "esta página está quase no ar": a primeira publicação da conta está na fila de conferência, que é o comportamento esperado. Tudo que este relatório mede saiu do link de prévia, que é o mesmo render com o mesmo dado.)

**Data:** 17 e 18/08/2026 · **Tempo:** cerca de 3h10 de ponta a ponta (mídia, montagem, publicação, medição em 1440 e 375)
**Persona:** 22 anos de funilaria e pintura, oficina própria no bairro Amazonas, quatro pessoas, 40 carros por mês. Só usa WhatsApp. Não tem Instagram profissional, não sabe o que é "portfólio", chama isto de "meu site".
**O que ela existia para quebrar:** antes e depois lado a lado, endereço físico e horário de funcionamento, e o menor letramento digital das catorze personas.

**Nota de método:** o repositório andou durante esta rodada. Dois commits entraram no meio (`d458b6e`, a foto do trabalho deixando de ser um selo de 64 px, e `11399d5`, a foto recusada ganhando dois degraus de redução antes da recusa) e um deles corrige exatamente o defeito D3 abaixo, com a mesma solução proposta aqui. Tudo que este relatório mede foi medido contra o que estava **em produção** no momento, e nenhum dos dois commits estava servindo na borda até o fim da medição. Os achados ficam registrados como reproduzidos; onde já existe correção a caminho, está dito no item.

## Veredito

**Não. O Zé Ricardo não faz isto sozinho:** ele para na terceira palavra da primeira tela ("portfólio", "endereço", "case"), e mesmo com alguém do lado lendo tudo para ele a página sai com o preço cortado no meio no celular, sem endereço, sem horário, e com um antes e depois que ninguém consegue distinguir.

---

## Os três testes centrais

### 1. Antes e depois: monta, mas não comunica

O par existe e é fácil de montar: `gallery_1` e `gallery_2` recebem as duas fotos, elas caem lado a lado dentro da janela do card. Isso funciona. O que não funciona é a única coisa que importa.

**Medido em 1440** (`out/funil-galeria-1440.json`): a grade da galeria é `297px 297px`, as duas fotos no mesmo `topo: 972`, ou seja realmente lado a lado. Os `alt` das imagens são **"Porta amassada de Gol 1"** e **"Porta amassada de Gol 2"**. Nada mais.

**Medido em 375** (`out/funil-galeria-375.json`): a grade vira `285px`, uma coluna. As fotos ficam em `topo: 1716` e `topo: 1918`. **No celular o par deixa de ser lado a lado e vira uma foto em cima da outra**, o que é o formato de "duas fotos do serviço", não o de comparação. E celular é onde está todo o tráfego dele.

**O visitante entende qual é qual?** Não. A prova está em `out/funil-modal-1440.png`: à esquerda um carro branco arranhado, à direita um sedã prata inteiro. São carros diferentes na foto, e nada na tela diz que um é o antes do outro. Um cliente olha e conclui "ele fotografou dois carros", não "ele consertou este carro". O sentido do par vive inteiro na ordem de leitura, que ninguém explicou, e que no celular vira ordem vertical.

**Quanto atrapalha não ter legenda por foto:** atrapalha o suficiente para anular a feature. Sem legenda, o antes e depois **não é** antes e depois, é uma galeria de duas fotos. E a única saída que o produto oferece hoje é escrever no texto ("a primeira é como chegou"), que exige que o visitante leia um parágrafo para entender uma imagem. Numa profissão em que a foto é a prova e o texto é decoração, é a troca errada.

**O que precisaria existir**, em ordem de custo:

1. **Um campo de legenda por foto da galeria.** Já existe o padrão de campo dependente (`link_note` só nasce depois de `link`); um `gallery_N_caption` seguindo a mesma regra é uma entrada em `fieldSchema.js` e uma linha no `projectModal.js`, que hoje escreve `alt="${nome} ${i + 1}"` e nada mais. Resolve também o `alt`, que hoje é inútil para leitor de tela.
2. **Um modo "antes e depois" no trabalho**, que é o que resolve de verdade: um switch que, ligado, rotula a primeira foto como ANTES e a segunda como DEPOIS, mantém as duas lado a lado **inclusive no celular** (`grid-cols-2` fixo nesse modo, em vez do `grid-cols-1 sm:grid-cols-2` de hoje) e escreve os dois selos por cima da imagem. Zero campos novos para preencher, e é a hipótese inteira desta persona resolvida com um clique.
3. **Se nem isso: pelo menos parar de quebrar em uma coluna no celular quando a galeria tem exatamente duas fotos.** Duas fotos de 141 px de largura lado a lado ainda comparam; empilhadas com 200 px de distância, não.

Severidade: **alta**. Não é estética, é a razão de a página existir para esta profissão.

### 2. Endereço e horário: não existe lugar nenhum

Ele tem ponto físico. O cliente precisa saber onde é e que abre sábado até meio-dia. Percorri o produto inteiro atrás de onde escrever isso. As tentativas, na ordem em que um funileiro tentaria:

| # | Onde tentei | O que aconteceu |
|---|---|---|
| 1 | "O que você faz" (`role`, 160 caracteres) | Cabe "Contagem, MG" no fim e é o que a persona já usava. Cabe a **cidade**, não a rua nem o horário. |
| 2 | Passo 1 do perfil, procurando "Endereço" | Existe um campo chamado "Seu endereço" no wizard e "Endereço desta página" no trabalho: os dois são **o link do site**, não o lugar. Para ele, essa palavra já foi gasta no sentido errado. |
| 3 | "Sobre você" (bio, 2000 caracteres) | Funcionou, e foi onde a rua e o horário acabaram parando: as duas últimas frases da bio. Fica no meio de um parágrafo corrido, sem destaque, sem link para mapa e sem estrutura. |
| 4 | "Suas redes" (`socials`, pares "rótulo \| texto \| link") | **É o único slot com forma de dado**, e exige link em toda linha. Consegui um item "Onde fica" e um "Horário" só porque inventei links (um Google Maps e o próprio WhatsApp de novo). Um endereço não é uma rede social e um horário não tem link. |
| 5 | "Números da capa" (`stats`) | Coube "Orçamento \| na hora". Rua e horário não cabem: o valor é curto por desenho, e ali é vitrine de métrica. |
| 6 | Campo "Onde" da experiência (`location`) | Existe, mas mora **dentro de uma passagem de trabalho** e a ajuda diz "Ex: São Paulo, remoto": é cidade, não rua, e descreve o passado, não onde atender hoje. |
| 7 | Varredura automática dos seis painéis (`out/funil-procura-endereco.json`) | Perfil: 36 campos, **zero** de endereço ou horário. Trabalho: 19 campos, zero. Experiência: zero. Seções, Conta e Publicar não têm campo nenhum. |

**O resultado publicado é o defeito visível.** As duas linhas que salvei em "Suas redes" saem **cortadas na página**, e não só no celular: em **1440**, "Rua São Geraldo, 412, bairro Amazonas, Contagem MG" precisa de 267 px numa caixa de 126 px (**141 px cortados, mais da metade**) e vira "Rua São Geraldo, 412, b…"; "Seg a sex 8h às 18h, sábado até meio-dia" precisa de 200 px em 126 px e vira "Seg a sex 8h às 18h, sáb…". Ou seja: o único lugar do produto onde o endereço e o horário cabem é também um lugar que os trunca. Está em `out/funil-final-1440.png`, coluna da direita.

**O que precisaria existir:**

1. **Um bloco "A minha oficina" no perfil**, com três campos: endereço (texto livre, uma linha), horário (texto livre, duas linhas) e um switch "mostrar mapa". A precedência já existe: a migration `0024_registro_profissional` foi criada exatamente por este motivo, "o produto não tinha onde pôr, e as duas personas regulamentadas acabaram enfiando o registro num slot de Números da capa". Aqui aconteceu a mesma coisa, com endereço e horário indo parar em "Suas redes". É o mesmo achado, um ano de personas depois, num campo diferente.
2. **Não truncar valor de contato.** Uma placa de contato que corta o endereço no meio é pior do que não ter a placa. `white-space: normal` e duas linhas resolvem; a caixa já é vertical.
3. Vale para muito mais gente do que funileiro: salão, barbearia, pet shop, restaurante, consultório, estúdio de tatuagem (que também tem ponto físico e virou "Estúdio \| Bom Fim" em Suas redes na persona anterior). É a lacuna estrutural mais reaproveitável das catorze.

Severidade: **alta**, e é o buraco de template mais claro do produto hoje.

### 3. Celular: dá para editar, mas ele não vai perceber que está editando

Medido em 375x812 (`out/funil-editor-375.json`, `out/funil-editor-375-perfil.png`):

- **Não há vazamento horizontal**: `scrollWidth 375` contra `innerWidth 375`. A barra de painéis quebra em duas linhas e os seis botões ficam todos visíveis, nenhum fora da tela. Isso é bom e não era garantido.
- **Digitar funciona.** Cliquei na caixa de texto da bio e digitei sem nenhum problema; a caixa tem 249 px de altura, que é confortável.
- **Os alvos de toque têm 34 px de altura**, abaixo dos 44 px recomendados. Com dedo de quem trabalha com lata, erra.
- **A gaveta cobre 100% da tela** (375 de 375, `canvasVisivelAtras: 0`). No desktop, a graça do editor é ver a página mudando atrás enquanto se digita. No celular esse elo se perde: ele preenche um formulário no escuro e só descobre o resultado ao fechar. Para quem não tem modelo mental de "página", perder o feedback ao vivo é perder a coisa que explicava o produto sozinha.
- **O que ele veria ao publicar pelo celular:** o preço de cada serviço cortado no meio (ver Defeito 1) e a placa de endereço cortada. Ou seja, o aparelho onde ele edita é o mesmo onde a página fica pior.

Conclusão do teste 3: o editor **não impede** o celular, e isso já é mérito. Mas o produto no celular entrega uma página mutilada, então "dá para editar pelo telefone" hoje significa "dá para publicar um resultado ruim pelo telefone".

---

## Bloqueio

**B1. O wizard pergunta "Sua área" e nenhuma das dez opções é a dele. Severidade: alta.**

A lista completa, lida da tela (`out/funil-wizard-kits.txt`): Chef / Gastronomia, Advocacia / Direito, Fotografia, Personal trainer / Saúde, Arquitetura / Interiores, Psicologia / Terapia, Música / Áudio, Confeitaria / Food, Professor / Educação, Tatuagem / Arte. Mais "Prefiro começar do zero".

**O que ele faria diante dessa lista:** leria as dez, não acharia oficina, não acharia mecânico, não acharia "serviço", não acharia nem uma categoria guarda-chuva tipo "Outro". Sete das dez são profissões de diploma ou de arte. A leitura que ele faz não é "meu ramo não está aqui": é **"isto não é para mim"**, e essa é a leitura que faz fechar a aba. A opção que sobra chama-se "Prefiro começar do zero", que soa como escolha de quem é avançado, não como saída para quem não se encontrou.

Não é bloqueio técnico (dá para seguir), é bloqueio de pertencimento, e é o mais caro dos dois. **O que precisaria existir:** (a) uma opção final honesta, "Minha área não está na lista", com o mesmo efeito de "do zero" mas sem o subtexto; (b) kits de **serviço local** (oficina, salão e barbearia, reforma e obra, pet), que é a categoria inteira que falta e que é onde mora o público que menos sabe montar página sozinho; (c) o kit de serviço local já viria com os campos de endereço e horário preenchidos com exemplo, o que resolveria dois achados com uma coisa só.

---

## Defeito

### D1. No celular, o preço é cortado no meio em todos os seis cards. Severidade: alta.

- **O que fiz:** preenchi "Preço, prazo ou condição" (`highlight`) nos seis serviços, com textos entre 26 e 39 caracteres, exatamente no espírito do exemplo do próprio campo ("A partir de R$ 180").
- **O que esperava:** que a linha coubesse, ou quebrasse em duas.
- **O que aconteceu:** em 375 a linha é truncada em **todos os seis**, cortando de 31 a 76 px de um texto que ocupa 93 px de caixa. Medido em `out/funil-grade-375.png`: "A partir de R$ 450, pronto em 2 dias" vira **"A partir de R$ 450…"** e "R$ 380 com a pintura junto" vira **"R$ 380 com a pint…"**. O prazo, que é metade da informação de venda, some.
- **Causa provável:** em 375 a grade da vitrine fica com **duas colunas**, e a caixa útil do texto sobra em 93 px. Card de 141 px de largura no aparelho onde está todo o tráfego.
- **Arquivo:** `src/modules/projects/components/projectsSection.js` (grade e truncamento do card).
- **Correção sugerida:** uma coluna em 375 (a página inteira já é uma coluna nessa largura), ou duas linhas permitidas no `highlight`. Este campo é novo e foi criado justamente porque, para quem vende serviço, "isso não é detalhe: é a informação que decide o contato". Hoje ele decide metade.

### D2. A paleta escolhida não vale: a página publica no roxo de fábrica. Severidade: alta.

- **O que fiz:** no passo "A página", escolhi a paleta **Sangue** e o fundo **Vinheta**, salvei.
- **O que esperava:** a página em vermelho.
- **O que aconteceu:** o banco gravou `theme_preset = "sangue"` corretamente (conferido em `out/funil-tema.json`), mas o payload publicado saiu com `{"accent":"#7C5CFC","preset":"sangue"}` e a página inteira, inclusive a janela do trabalho, veio **roxa**. Comparar `out/funil-publico-1440.png` (roxo) com `out/funil-final-1440.png` (vermelho, depois do contorno).
- **Causa, confirmada:** `resolverTema()` resolve `accent: accent || base.accent` (`src/modules/portfolio/theme/presets.js`), ou seja cor livre vence paleta. E quem grava a cor livre é o próprio salvamento: `patchDoPerfil` em `src/modules/editor/api/portfolioApi.js:206` faz `theme_accent: corPropria(v.theme_accent, resolverTema({ preset: v.theme_preset }).accent)`. No instante do salvamento, o campo "Cor de destaque" ainda mostra `#7C5CFC`, porque o formulário foi montado **antes** da troca de paleta, enquanto a comparação já usa a cor da paleta **nova**. Como diferem, o código conclui "a pessoa escolheu uma cor própria" e grava o roxo para sempre. O comentário logo acima dessa linha descreve exatamente o acidente que a linha causa ("cor IGUAL a efetiva da paleta não é escolha, e sim o campo devolvendo o que ele mesmo mostrou").
- **É pegajoso:** salvar de novo não conserta, porque agora `#7C5CFC` está gravado e continua diferindo da paleta. A única saída é achar "Cor de destaque" dentro de "Ajustes finos" e digitar o hexadecimal da paleta à mão, que foi o que fiz para provar o diagnóstico (`scripts/_demos/demo-funilaria-tema.mjs`), e que o Zé Ricardo não faz nem com ajuda.
- **Arquivo:** `src/modules/editor/api/portfolioApi.js:206-207`.
- **Correção sugerida:** repintar o campo de cor com a cor efetiva da paleta no mesmo evento em que a paleta muda (o formulário já repinta por outros motivos), ou comparar contra a cor efetiva **de antes** da troca, não a de depois.

### D3. Duas das doze fotos da galeria foram recusadas por tamanho, e a recusa apagou o campo da foto seguinte. Severidade: alta.

- **O que fiz:** subi o par antes/depois em seis serviços, doze fotos, todas JPEG de 1400 px vindas do mesmo lugar.
- **O que esperava:** doze uploads.
- **O que aconteceu:** dois voltaram com **"não consegui deixar esta imagem abaixo de 140 KB. Tente uma imagem mais simples ou menor."** (`depois-1.jpg`, 413 KB de entrada, e `antes-2.jpg`, 669 KB). E aí veio a parte cara: como o slot `gallery_2` só nasce quando `gallery_1` tem caminho gravado (`dependeDe` em `fieldSchema.js:222`), a recusa da **primeira** foto **fez o campo da segunda desaparecer**. O serviço "Para-choque rachado do Onix" ficou sem antes E sem depois, e nada na tela disse isso: o campo simplesmente não estava lá.
- **Causa:** `codificarDentroDoOrcamento` (`src/modules/media/lib/imagePipeline.js:156`) tenta WebP em 0,82 / 0,72 / 0,62 e desiste. O `project` deixou de cortar em 3:2 (correção certa, feita depois da persona do tatuador) e passou a guardar `lado: 1400` inteiro, mas o orçamento só subiu de 90 para 140 KB. Foto de oficina é o pior caso possível para WebP: textura de asfalto, folhagem, reflexo em lataria, ruído em toda a área. Quem sobe foto de celular vai bater nisso.
- **Contorno que usei:** a mesma foto baixada em 900 px em vez de 1400 passa (`scripts/_demos/demo-funilaria-galeria.mjs`). Ele não tem como fazer isso: "uma imagem mais simples" não quer dizer nada para quem tirou a foto do carro que estava na frente dele.
- **Arquivo:** `src/modules/media/lib/imagePipeline.js:76` e `:156`.
- **Correção sugerida:** quando as três qualidades falham, **reduzir o lado** (1400 → 1100 → 900) antes de desistir. Nunca é preciso recusar uma foto por peso: sempre existe um tamanho em que ela cabe. E o slot seguinte não deveria depender do anterior ter sucesso quando o anterior falhou por erro do produto.
- **Já corrigido no meio desta rodada,** pelo commit `11399d5`, com exatamente essa solução ("agora são dois degraus de redução antes de qualquer recusa"). Fica registrado porque a segunda metade do achado **continua de pé**: o slot da segunda foto sumir quando a primeira falha é um efeito colateral do `dependeDe`, e vale para qualquer motivo de falha, não só o peso.

### D4. Upload que sobe o arquivo e não pinta a prévia. Severidade: média.

- **O que fiz:** subi `depois-1-menor.jpg` em `gallery_2`.
- **O que aconteceu:** 20 segundos sem prévia e sem mensagem de erro. Na segunda tentativa, com o mesmo arquivo, a prévia apareceu e o console registrou `HTTP 400 project/porta-amassada-de-gol-55058ae7.webp :: {"statusCode":"409","error":"Duplicate"}`. Ou seja: **o arquivo tinha subido na primeira vez**, e só a interface não soube. Como o nome é endereçado por conteúdo, a segunda subida bateu em duplicata e a interface se recuperou.
- **Por que importa para esta persona:** quem não entende o que é upload não repete; conclui que "não deu" e para. Um estado que só se resolve tentando de novo é, para ele, um estado final.
- **Arquivo:** caminho de upload da galeria (`src/modules/editor/fields/imagemField.js` e `imagePipeline.js`).

### D5. O texto do botão principal sai cortado. Severidade: média.

"Chamar no WhatsApp" precisa de 119 px numa caixa de 98 px e publica como **"CHAMAR NO WHA…"** em 1440 (`out/funil-final-1440.png`, canto inferior direito da placa de contato). O campo aceita 40 caracteres; a placa comporta cerca de 15. Ele escreveu 18 e o botão que é a razão de existir da página está com o nome pela metade.

### D6. A imagem do trabalho nasce em "caber inteira" e o card vira uma moldura preta. Severidade: média.

O padrão do banco é `image_fit default 'contain'` (`supabase/migrations/0003_projetos_e_midia.sql:33`), mas o editor lista "Preencher o card" **primeiro** e o comentário no código diz "a ordem também inverteu: preencher passou a ser o primeiro porque virou o padrão". Não virou: quem não abre "Ajustes finos" e não mexe fica com `contain`. O resultado está em `out/funil-final-1440.png`: seis cards em que a foto ocupa metade da placa e o resto é preto. Para quem vende com foto, é o pior padrão possível, e ele nunca vai encontrar o seletor, que se chama "Como a imagem se encaixa" e mora no último passo.

E o preço desse padrão acabou de subir: o commit `d458b6e`, feito no meio desta rodada, faz a foto do trabalho deixar de ser um selo de 64 px dentro da janela, **mas só para quem escolheu "preencher"**. Medido depois dele, a capa dos seis serviços continua num quadrado de 62x62 ao lado do título, porque nenhum deles é "preencher": o padrão do banco decidiu por ele. Quem não mexe no seletor perde as duas coisas ao mesmo tempo, o card e a janela. Trocar o `default 'contain'` para `'cover'` na coluna resolve os dois de uma vez e alinha o banco com a ordem que o editor já mostra.

---

## Atrito

- **A1 (média).** Publicar exige achar a aba "Publicar", que é a última de seis. Nada no editor diz, enquanto ele preenche, que existe um botão final. A lista de sete conferências ("Seu nome está preenchido", "Tem pelo menos um projeto") é boa e clara; o problema é chegar até ela.
- **A2 (média).** No celular a gaveta cobre a tela inteira e ele perde a página de vista enquanto edita. O elo "eu digito aqui, muda ali" é a coisa que ensina o produto sozinho, e é justamente o que se perde no único aparelho dele.
- **A3 (baixa).** Alvos de toque de 34 px na barra de painéis, abaixo dos 44 px.
- **A4 (baixa).** O contador da seção de experiência diz **"2 passagens"**. É a única palavra da página que ele não escolheu e não pode trocar (está documentado em `src/app/rotulos.js` que `experienceCount` fica de fora por ter singular e plural). "Passagem" é vocabulário de currículo. Ele diria "onde eu trabalhei", e escreveu isso no título logo ao lado, o que deixa a incoerência visível na mesma linha.
- **A5 (baixa).** A faixa de especialidades corta a última etiqueta ("Carro de segu…") na borda direita em 1440. É uma marquise que anima, então o corte se resolve sozinho, mas na primeira olhada parece defeito.
- **A6 (baixa).** Nenhum ícone de selo serve para oficina. Os vinte: Código, Chapéu de chef, Balança, Câmera, Halter, Régua, Cérebro, Música, Bolo, Capelo, Caneta, Maleta, Brilhos, Coração, Estrela, Paleta, Microfone, Tesoura, **Chave inglesa**, Folha. Usei Chave inglesa, que é de mecânico: funileiro bate lata e pinta, não aperta parafuso. Faltam martelo, pistola de pintura e carro.

---

## Buraco de template

1. **Não existe endereço nem horário de funcionamento** (detalhado no teste 2). É o buraco maior, e ele não é do funileiro: é de toda profissão com ponto físico, que é a maioria do mercado que este produto diz atender. Severidade: **alta**.
2. **Não existe modo antes e depois**, nem legenda por foto de galeria (teste 1). Severidade: **alta**.
3. **Não existe categoria de serviço local nos starter kits** (bloqueio B1). Dez kits, sete de profissão de diploma ou de arte, nenhum de serviço de bairro. Severidade: **alta**.
4. **"Números da capa" continua sendo o buraco onde tudo que não tem lugar vai parar.** A migration `0024` registrou isso para o registro profissional; aqui aconteceu de novo com "Orçamento \| na hora", que não é número e não é métrica: é condição comercial. O padrão se repete porque o produto tem um único slot livre de pares.
5. **O campo `registro_profissional` existia no banco desde a migration 0024 e não existia no editor**: `grep -rn "registro" src/` não devolvia campo nenhum. Não afeta o Zé Ricardo (funileiro não tem conselho), mas afetava advogada, psicóloga, arquiteta e nutricionista. Achado também pela persona do corretor e **corrigido no commit `11399d5`** durante esta rodada. Fica aqui só como confirmação independente.

---

## Palavra errada

Esta é a contribuição principal desta persona. A lista abaixo é exaustiva e saiu do censo de tela (`out/funil-vocab-perfil.txt`, 36 campos de perfil, e `out/funil-censo-servico.txt`, 19 campos de trabalho). O critério é único: **o Zé Ricardo entende isto sem alguém explicar?**

### Palavras que ele não entende de jeito nenhum

| Palavra | Onde | Por que trava | Como ele diria |
|---|---|---|---|
| **portfólio** | wizard ("Criar meu portfólio"), painel Publicar ("Publicar meu portfólio"), marca do produto | É a palavra central do produto e é a única que ele nunca ouviu. Portfólio é palavra de faculdade e de agência. | "meu site", "minha página" |
| **case** | "Imagem do case" (primeiro campo de todo trabalho), passo "O case" | Estrangeirismo de consultoria. Ele lê "cáse" e não associa a nada. Pior: é o **primeiro rótulo do primeiro campo** que ele encontra ao cadastrar o primeiro serviço. | "serviço", "trabalho" |
| **stack** | "Stack" é o padrão do rótulo da lista de materiais dentro da janela | Termo de programador. Sem o renome, um funileiro publica "STACK: Tinta PU, massa poliéster". | "material que usei" |
| **slug / endereço da página** | "Endereço desta página" (trabalho), "Endereço da entrada" (experiência) | "Endereço" para ele é rua e número. Aqui significa três coisas diferentes e nenhuma é a oficina. | "o link" |
| **SEO** (o conceito) | "Título no Google e no WhatsApp", "Descrição no Google e no WhatsApp" | O rótulo evita a sigla, o que é bom, mas o conceito de "um título diferente do título" continua sem sentido para ele. | (deixaria em branco) |
| **enquadramento** | "Enquadramento da foto", "Enquadramento da imagem", "Enquadramento da logo" | Palavra de fotógrafo. | "subir ou descer a foto" |
| **preset / paleta** | "Paleta da página" | Paleta, para ele, é a paleta de tintas da cabine, o que atrapalha em vez de ajudar: ele vai procurar as cores do carro. | "a cor do site" |
| **grade** | "aparece já na grade", "o que vira a barra de filtro da grade" | Grade é a grade do radiador. | "a lista", "a página" |
| **passagens** | contador da seção de experiência, "2 passagens" | Vocabulário de currículo, e não é editável. | "lugares onde trabalhei" |
| **i18n / "Página em inglês"** | passo "A página" | Não é palavra difícil, mas é ruído: ele nunca vai atender em inglês e o campo ainda avisa que o conteúdo em inglês não é editável. | (esconder para quem não pediu) |

### Palavras e frases que ele lê e entende errado

| Texto | Onde | O que ele entende |
|---|---|---|
| **"Ex: Desenvolvedor e criador de produtos"** | ajuda de "O que você faz", passo 1, um dos dois campos obrigatórios | O exemplo do produto no campo mais visível ainda é o do programador de quem o produto nasceu. Ele lê e conclui que o site é para gente de computador. É a segunda coisa que ele lê na primeira tela. |
| **"Projetos com vídeo primeiro"** e **"Projetos por página"** | passo "A página" | "Projeto" para ele é planta de obra. Os dois rótulos ficaram fora do sistema de renome, então mesmo depois de ele renomear tudo para "Serviços da oficina", o editor continua dizendo "Projetos". |
| **"O projeto é seu"** | ajuda do switch "Foi para um cliente" | Todo carro que entra na oficina é de um cliente. O switch e a ajuda não descrevem nada que exista no mundo dele. |
| **"Grupos de filtro"** | passo Provas do trabalho | Duas palavras técnicas juntas. Ele não vai preencher, e é justamente o campo que faria a vitrine dele ficar navegável por tipo de serviço. |
| **"Link deste serviço"** e **"Vídeo no YouTube"** | passo Provas | Um serviço de funilaria não tem link nem vídeo no YouTube. São dois dos seis campos de um passo inteiro que, para ele, é vazio. |
| **"Sessão de 3h", "Encomende com 7 dias"** | ajuda do campo de preço | Os exemplos vieram de fotógrafo e confeiteira. Nenhum é de serviço de oficina. Aqui o texto acertou o essencial ("A partir de R$ 180") e depois se afastou. |
| **"Uma frase sobre ele"** | campo `tagline` | "Ele" quem? O rótulo se refere ao trabalho, mas depois de renomear tudo para "serviço", "uma frase sobre ele" fica solto. |
| **"trate como segredo"** | ajuda do link de prévia | A frase certa, o registro errado. Ele vai mandar o link no grupo da família assim mesmo. |

### O que já está certo e merece ficar

Não é elogio de cortesia, é para não regredir:

- **Os rótulos das seções são editáveis, e isso salva a página.** "SERVIÇOS DA OFICINA", "O QUE EU FAÇO", "ONDE EU TRABALHEI", "COMO O CARRO CHEGOU", "COMO ELE SAIU", "MATERIAL QUE USEI": nenhuma palavra estranha sobrou na página pública, e o **editor também passou a falar a língua dele** (o campo virou "Nome deste serviço", a ajuda virou "Como você agrupa este tipo de serviço"). Este é o acerto mais importante do produto para esta persona.
- **"Preço, prazo ou condição"** é o rótulo mais bem escrito do editor inteiro: três palavras, nenhuma difícil, e diz o que fazer.
- **"Duas palavras que dizem o que você é"** (selo) e **"Ferramentas, técnicas, materiais ou especialidades"** (especialidades) resolvem sem jargão.
- **A mensagem de HEIC** ("este navegador não abre foto de iPhone... vá em Ajustes, Câmera, Formatos") é o padrão que o resto das mensagens de erro deveria seguir: diz o que fazer, não o que falhou. Compare com a mensagem que ele levou de verdade em D3, "tente uma imagem mais simples", que não diz nada.

---

## A mensagem de "quase no ar"

O que ele lê depois de clicar em publicar, no painel: **"Recebido. A primeira publicação de cada conta passa por uma conferência rápida antes de ir ao ar. Enquanto isso o link de prévia já mostra tudo."** E na página: **"Esta página está quase no ar. Ela foi publicada e está passando por uma conferência rápida, do jeito que acontece com toda página nova por aqui. Volte daqui a pouco."**

**Faz sentido para ele?** Sim, e é dos melhores textos do produto. Três coisas certas: diz que **deu certo** ("recebido", "foi publicada"), diz que é **com todo mundo** ("do jeito que acontece com toda página nova"), o que remove a suspeita de que ele fez algo errado, e diz **o que fazer agora** ("volte daqui a pouco", "o link de prévia já mostra tudo").

Duas ressalvas, ambas pequenas:

- **"conferência rápida" não é prazo.** Ele vai perguntar "rápida é quanto?" e não tem resposta na tela. "Costuma levar até um dia útil" fecharia a pergunta.
- **"link de prévia"** é a única palavra difícil do parágrafo, e ela aparece nos dois textos. Ele não sabe que gerou um, nem onde está. "O seu link de teste, ali em cima, já mostra tudo" já ajudaria.

---

## Arquivos desta rodada

- Scripts: `scripts/_demos/demo-funilaria.mjs` (montagem completa), `demo-funilaria-wizard.mjs` (sonda da pergunta "Sua área", roda antes de o portfólio existir), `demo-funilaria-galeria.mjs` (conserto dos dois pares recusados), `demo-funilaria-tema.mjs` (diagnóstico da paleta), `demo-funilaria-previa.mjs` (medição em 1440 e 375), `demo-funilaria-paineis.mjs` (varredura de texto dos painéis).
- Mídia: `out/midia/demo-funilaria/` (21 arquivos, Unsplash, baixados por curl).
- Medidas: `out/funil-galeria-1440.json`, `funil-galeria-375.json`, `funil-editor-375.json`, `funil-tema.json`, `funil-cortes.json`, `funil-procura-endereco.json`.
- Censos: `out/funil-vocab-perfil.txt` (36 campos), `funil-censo-servico.txt` (19 campos), `funil-wizard-kits.txt`, `funil-icones-selo.txt`, `funil-paineis.txt`.
- Imagens: `out/funil-final-1440.png`, `funil-final-375.png`, `funil-modal-1440.png` (o par antes/depois), `funil-modal-375.png`, `funil-grade-375.png` (o preço cortado), `funil-editor-375-perfil.png`, `funil-publico-1440.png` (a página roxa, antes do contorno da paleta).

## As três coisas mais graves

1. **Não existe onde escrever endereço e horário**, e o slot improvisado ("Suas redes") ainda corta o texto pela metade na página publicada. É a lacuna de template mais reaproveitável do produto.
2. **O antes e depois não comunica**: sem legenda por foto, sem modo de comparação e empilhado em uma coluna no celular, ele deixa de ser antes e depois e vira duas fotos soltas.
3. **No celular, o preço é cortado no meio nos seis cards**, e a paleta escolhida não vale (a página publica no roxo de fábrica, de forma pegajosa e sem aviso).
