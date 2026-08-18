# demo-corretor · Wilson Tavares, corretor de imóveis na Zona Sul de SP (CRECI-SP 214.556)

**URL:** https://demo-corretor.myportifolio.com.br (publicada, na fila de conferência da primeira publicação; a página de verdade responde pelo link de prévia, em `out/corretor-previa-url.txt`)
**Data:** 18/08/2026 (segunda rodada de nichos, sobre o produto já corrigido pelas onze primeiras personas)
**Tempo:** cerca de 50 minutos de sessão, dos quais 6 minutos e meio de edição efetiva no editor (wizard 13s, perfil 24s, a página 13s, seis imóveis 111s, três experiências 36s, ajustes e limpeza 90s, publicar 18s). Um corretor digitando à mão o que o script digitou levaria de uma a duas horas, com a maior parte do tempo na ficha técnica de cada imóvel.
**O que esta persona existia para quebrar:** um trabalho que é um imóvel, ou seja, **dado estruturado** (preço, área em m², quartos, vagas, bairro, venda ou locação), e um **catálogo que muda**, porque imóvel vendido precisa sair do ar.

**Veredito:** um corretor consegue montar e publicar uma página bonita hoje, mas ela é uma **vitrine e não um catálogo**: a ficha do imóvel vira um parágrafo corrido, metade da linha de preço é cortada no celular, e no dia em que o primeiro apartamento vender ele vai ter que escolher entre apagar o trabalho ou anunciar o que já não existe.

---

## A seção sobre dado estruturado do imóvel (o teste central)

### Onde cada campo conseguiu encaixar

| dado do imóvel | onde foi parar | como ficou |
|---|---|---|
| Preço | `highlight`, "Preço, prazo ou condição" | **funciona.** É o único campo curto que aparece na grade, e ele foi o achado positivo desta persona |
| Área em m² | espremida junto do preço no mesmo `highlight` | cabe, mas rouba espaço do preço e é truncada no celular |
| Quartos e vagas | idem, no mesmo `highlight` | as quatro informações juntas dão 43 caracteres de 60. Cabem por pouco, e só porque abreviei |
| Bairro | `problem` ("Ficha do imóvel"), textarea | vira texto corrido, não é filtrável, não é buscável |
| Condomínio, IPTU, situação | idem | idem |
| Venda ou locação | `category` (aparece como selo no card) **e** `groups` (vira o filtro) | o mesmo dado digitado duas vezes, em dois campos diferentes, para aparecer nos dois lugares |

O `highlight` (migration 0023) é o melhor campo que este produto tem para esta profissão, e ele foi acrescentado por causa de outra persona. Ele sozinho é a diferença entre um card que vende e um card que não diz nada:

```
R$ 4.200.000 · 285 m² · 4 quartos · 4 vagas
R$ 5.400/mês + R$ 890 condomínio · 34 m²
```

### O que ficou feio

**1. A ficha técnica virou um parágrafo.** Digitei sete linhas no textarea "Ficha do imóvel":

```
Bairro: Vila Nova Conceição
Área útil: 142 m²
Dormitórios: 3 quartos (1 suíte)
Vagas de garagem: 2 vagas
Condomínio: R$ 2.100/mês
IPTU: R$ 640/mês
Situação: à venda
```

O banco guardou as quebras de linha corretamente (conferido no payload: `"problem":"Bairro: Vila Nova Conceição\nÁrea útil: 142 m²\n..."`). A página publicada imprime assim:

> Bairro: Vila Nova Conceição Área útil: 142 m² Dormitórios: 3 quartos (1 suíte) Vagas de garagem: 2 vagas Condomínio: R$ 2.100/mês IPTU: R$ 640/mês Situação: à venda

Uma tabela de sete linhas virou uma frase de quarenta palavras. Ver `out/corretor-previa-janela-apartamento-na-vila-nova-conceicao.txt`.

**2. Metade do preço morre no celular.** Medido em três larguras (`out/corretor-medida-preco.txt`), com `scrollWidth > clientWidth` como assinatura do corte:

| imóvel | 1440px | 768px | 390px |
|---|---|---|---|
| Cobertura duplex em Moema | 100% | 79% | **52%** |
| Garden em Moema, com quintal | 100% | 73% | **48%** |
| Studio no Itaim Bibi | 100% | 77% | **50%** |

No celular, que é para onde o link do WhatsApp abre, o cliente lê "R$ 9.800/mês + R$ ..." e não sabe o valor do condomínio, a metragem, nem quantos quartos tem. O corretor escreveu tudo e o produto mostrou metade.

**3. O filtro fala em slug.** Digitei os grupos como "Venda", "Locação" e "Alto padrão". A barra de filtro publica `venda`, `locacao`, `alto-padrao`, em minúscula e sem acento (payload: `"filterGroups":[{"key":"alto-padrao","label":{"pt":"alto-padrao"}}]`).

### O que precisaria existir

Em ordem de quanto muda a vida dele:

1. **Um bloco de "ficha" no formulário de trabalho**, que seja uma lista de pares rótulo e valor, e que a janela renderize como tabela e não como parágrafo. O primitivo já existe: é o `pares`, que "Suas redes" e "Números da capa" já usam. Faltaria só oferecê-lo por trabalho e renderizá-lo em grade.
2. **Um campo de estado do trabalho** (disponível, reservado, vendido, alugado), que decida se o card aparece, se aparece com tarja, ou se sai. Isso resolve o catálogo que muda sem inventar tabela nova.
3. **Preço como número**, e não como texto livre, para dar ordenação por preço e faixa de preço no filtro. Hoje "R$ 1.180.000" e "R$ 9.800/mês" são a mesma coisa para o sistema: string.
4. **Deixar o `highlight` quebrar em duas linhas no celular** em vez de truncar. É uma classe de CSS: hoje é `truncate` em `projectsSection.js:61`.
5. Um campo de **bairro** próprio, que já viraria grupo de filtro sozinho. Corretor não vende "categoria", vende bairro.

---

## Bloqueio

### B1. Não existe onde escrever o CRECI, e para esta profissão isso não é opcional
**Severidade: alta.**

- **O que fiz:** varri os 36 campos do painel de perfil procurando registro profissional (`out/corretor-censo-perfil.txt`), e depois procurei no código.
- **O que eu esperava:** um campo ao lado do nome, como a própria migration `0024_registro_profissional.sql` descreve no cabeçalho dela.
- **O que aconteceu:** nenhum dos 36 campos menciona registro, conselho, CRECI, OAB, CRP ou CRM. A coluna `registro_profissional` **existe** no banco, o `grant update` existe, e `montar_payload_portfolio` já monta `'registro', v_pf.registro_profissional`. O payload publicado do Wilson traz literalmente `"registro": null`. Nenhum arquivo de `src/` escreve nessa coluna nem lê esse campo do payload: `grep -rn "registro_profissional" src worker` não devolve nada, e `profilePanel.js` não conhece `profile.registro`.
- **Arquivos:** `supabase/migrations/0024_registro_profissional.sql` (a coluna e o payload), `src/modules/editor/data/fieldSchema.js` (a lista de campos, sem ele), `src/modules/profile/components/profilePanel.js` (o render, sem ele).
- **Por que é bloqueio e não buraco:** o COFECI exige o número de inscrição em peça publicitária de corretor, como a OAB e o CFP exigem dos seus. Publicar sem ele não é uma página incompleta, é infração disciplinar de quem publicou. O produto tem a coluna pronta e a metade que faltava é a mais barata: uma linha na lista de campos e uma linha no render.
- **O contorno que eu usei:** escrevi "CRECI-SP 214.556" dentro do campo "O que você faz" (que na página vira "Imóveis residenciais · Zona Sul · CRECI-SP 214.556") e repeti na bio. É exatamente o que a advogada e a psicóloga fizeram nos "Números da capa", e é o problema que a 0024 dizia estar resolvendo.

### B2. Vendeu o imóvel, e não há como tirá-lo do ar sem apagar
**Severidade: alta.**

- **O que fiz:** abri a lista de imóveis e depois o formulário de um deles, procurando um interruptor de visibilidade, de arquivar ou de rascunho.
- **O que eu esperava:** um switch "mostrar na página", já que a coluna existe.
- **O que aconteceu:** as únicas ações da lista são subir, descer e editar (`out/corretor-lista-imoveis.txt`). No formulário, os 19 campos não incluem nenhum de visibilidade. A coluna `is_visible` existe em `portfolio_projects` e o payload **já filtra por ela** (`where pj.is_visible and not pj.is_sample`). O editor simplesmente não a expõe.
- **Arquivos:** `src/modules/editor/data/fieldSchema.js` (`CAMPOS_PROJETO`, sem `is_visible`), `src/modules/editor/api/projectsApi.js`, `supabase/migrations/0024_registro_profissional.sql` (o filtro no payload).
- **Consequência para ele:** um corretor com 340 vendas no currículo troca o catálogo várias vezes por mês. Hoje ele escolhe entre apagar (e perder foto, texto, galeria e a prova de que aquele imóvel foi vendido por ele) ou deixar no ar um anúncio falso. Apagar também é irreversível e a foto já subiu contra a cota dele.
- **O contorno que eu usei:** escrevi "VENDIDO em 08/2026 · era R$ 2.850.000" no campo de preço. Funciona, mas o card continua em **primeiro lugar** na grade, e no celular a tarja aparece cortada como "VENDIDO em 08/20...".

---

## Defeito

### D1. Toda quebra de linha some na página publicada
**Severidade: alta.**

- **O que fiz:** escrevi sete linhas no textarea "Ficha do imóvel" de cada um dos seis imóveis.
- **O que eu esperava:** sete linhas na janela do imóvel, já que o editor mostra sete linhas enquanto se digita.
- **O que aconteceu:** um parágrafo corrido. O `\n` viaja intacto até o payload e morre no render.
- **Arquivo:** `src/modules/projects/components/projectModal.js:29` (`<p class="text-sm text-white/70 leading-relaxed">${esc(t)}</p>`) e `src/modules/profile/components/profilePanel.js:170` (a bio, mesmo caso). A classe `whitespace-pre-line` não aparece em lugar nenhum de `src/`.
- **Alcance:** não é só do corretor. Atinge bio, "O Desafio", "A Solução" e a observação de cada experiência, ou seja, todos os campos longos de todas as catorze personas. É o defeito de melhor relação entre gravidade e custo de conserto do relatório.

### D2. A linha de preço é truncada em tudo que não seja desktop largo
**Severidade: alta.** Números na tabela da seção de dado estruturado, acima.
- **Arquivo:** `src/modules/projects/components/projectsSection.js:61`, a classe `truncate` no `<p>` do destaque.
- Vale notar que o mesmo `truncate` cortou também o texto da rede "Imobiliária" ("Tavares Negócios Imobiliários", conferido com `scrollWidth > clientWidth`).

### D3. "Ver como visitante" não abre a janela do imóvel
**Severidade: alta.**

- **O que fiz:** cliquei em "Ver como visitante" e depois num card de imóvel. Depois tentei Enter com o card em foco. Depois repeti pelo link de prévia.
- **O que eu esperava:** a janela do imóvel, que é onde a ficha inteira mora.
- **O que aconteceu:** nada. `#project-modal` continua com a classe `hidden` e `innerHTML` vazio, o clique e o Enter não fazem efeito, e **não há erro nenhum no console**. Pelo link de prévia a mesma janela abre normalmente.
- **Causa:** `initProjectModal` só é chamado em `src/main.js:94`, que é o boot da página pública. O editor renderiza o mesmo HTML dentro de `#ed-canvas` mas nunca liga as interações: `alternarVisitante` é literalmente `document.body.classList.toggle('is-editing')` (`src/modules/editor/components/editorApp.js:52`).
- **Arquivos:** `src/modules/editor/components/editorApp.js:52`, `src/modules/projects/components/projectModalInteractions.js:11`, `src/main.js:94`.
- **Por que dói nesta persona mais do que nas outras:** para um corretor, tudo o que não coube na grade está dentro da janela. O botão se chama "ver como visitante" e o visitante vê uma coisa que ele não consegue ver. Ele publica sem nunca ter conferido a ficha. A barra de filtro, que para ele é "venda ou locação", também não funciona ali.

### D4. Foto de interior de 1400px é recusada, e a mensagem culpa a foto
**Severidade: média.**

- **O que fiz:** subi seis fotos de imóvel, todas de 1400px de largura, vindas do mesmo lugar.
- **O que eu esperava:** que subissem, ou que o produto reduzisse o que precisasse reduzir.
- **O que aconteceu:** cinco subiram e uma falhou com "não consegui deixar esta imagem abaixo de 140 KB. Tente uma imagem mais simples ou menor". O apartamento do Campo Belo ficou sem capa e eu só percebi olhando a saída do script. A **mesma foto**, baixada em 1000px em vez de 1400px, subiu de primeira.
- **Arquivo:** `src/modules/media/lib/imagePipeline.js`, `codificarDentroDoOrcamento`: o laço tenta qualidade 0.82, 0.72 e 0.62 e desiste, sempre no mesmo `lado: 1400`. Nunca reduz resolução antes de desistir.
- **Por que dói aqui:** foto de interior é o pior caso possível para compressão (textura de tecido, madeira, plantas, luz difusa). É o tipo de foto que este profissional sobe o dia inteiro. E "tente uma imagem mais simples" é um conselho que ele não tem como seguir: a foto é do imóvel, ele não escolhe a complexidade dela.

### D5. O texto do botão principal é cortado, e só no desktop
**Severidade: baixa.**

- Escrevi "Falar no WhatsApp" (17 caracteres, num campo que aceita 40). Em 1440px o botão mostra 98px de 105px e imprime "Falar no WhatsA...". Em 390px cabe inteiro. O campo cobra pelo bump de personalização e entrega o texto cortado justamente na tela grande.

---

## Atrito

### A1. Nenhuma das dez áreas é imóveis, e escolher a mais próxima suja a página
**Severidade: média.**

As dez opções de "Sua área" (`out/corretor-areas-wizard.txt`): Chef, Advocacia, Fotografia, Personal trainer, Arquitetura / Interiores, Psicologia, Música, Confeitaria, Professor / Educação, Tatuagem.

**O que eu fiz, e por quê:** escolhi **"Arquitetura / Interiores"**, a mais próxima, e não "Prefiro começar do zero". A razão é que um corretor que acabou de pagar não escolhe voltar ao vazio quando há uma lista na frente dele: ele procura a que menos o exclui, e arquitetura é a única das dez que fala de imóvel, ainda que do lado de quem projeta e não de quem vende. Registrar essa escolha era o teste.

O que ela custou, medido:

- O card do Wilson nasceu com o selo **"Arquiteta"**, no feminino e da profissão errada, e isso ficou visível no canvas antes de qualquer edição dele (`out/corretor-canvas-com-kit.png`).
- A bio nasceu com "Fale do seu partido, do tipo de obra que você assina". "Partido" é vocabulário de arquiteto.
- Os rótulos das seções vieram "Projetos", "O programa", "O partido", "Escopo entregue". Troquei os dez a mão.
- Quatro especialidades de arquitetura (Residencial, Reforma, Interiores, Projeto executivo) entraram em `stacks`, e o campo de chips é **aditivo**: o meu conteúdo foi somado por cima do dele em vez de substituí-lo. Foram **quatro cliques no X**, um por chip, porque não existe "limpar tudo" (`scripts/_demos/demo-corretor-chips.mjs`).
- Um projeto de exemplo ("Residência de 120 m2") e uma experiência de exemplo ("Escritório Exemplo", cargo "Arquiteta") ficaram para apagar, um a um, cada um com confirmação dupla ("Apagar" e depois "Apagar mesmo?").

Nada disso é defeito do mecanismo de kit, que funciona bem. É o custo de a lista ter dez áreas e a pessoa não estar nela. Vale registrar que a faixa "Exemplo, troque por um seu" faz o trabalho dela: eu soube na hora o que era plantado.

### A2. A gaveta fecha os passos a cada foto que sobe
**Severidade: média.** Cada upload repinta o formulário e fecha os `<details>`. Numa galeria de quatro fotos, isso são quatro reaberturas dos três passos. Como os slots de galeria também nascem um de cada vez, subir quatro fotos num imóvel exige oito interações que não são a foto em si. Foi o que mais consumiu tempo nos 111 segundos dos seis imóveis.

### A3. O filtro de venda e locação mora atrás de um ícone sem rótulo
**Severidade: média.** A primeira pergunta de todo cliente de imóvel é "é venda ou aluguel?". A resposta está num botão de ícone no canto da seção, sem texto, que precisa ser clicado para o menu aparecer (`out/corretor-previa-menu-filtro.png`). Funciona bem quando se acha, mas ninguém procura.

### A4. Depois de publicar, o botão continua dizendo "Publicar meu portfólio"
**Severidade: baixa.** A mensagem de recebido aparece, mas o botão não muda de estado e "Tirar minha página do ar" não nasce, porque `first_published_at` só é preenchido depois da conferência. Ele pode clicar de novo achando que não funcionou.

### A5. O aceite dos termos não mostra progresso
**Severidade: baixa.** O botão só troca para "Registrando...". Já era conhecido, e continua.

---

## Buraco de template

### T1. Nenhum ícone de selo serve para quem vende imóvel
**Severidade: média.** Os vinte ícones (`out/corretor-icones-selo.txt`) são: Código, Chapéu de chef, Balança, Câmera, Halter, Régua, Cérebro, Música, Bolo, Capelo, Caneta, Maleta, Brilhos, Coração, Estrela, Paleta, Microfone, Tesoura, **Chave inglesa**, Folha. Não há casa, chave de porta nem prédio. A única "chave" da lista é a inglesa, que é do funileiro. Escolhi "Maleta", que serve para qualquer profissão e por isso não diz nada. Um ícone de casa e um de chave resolveriam corretor, arquiteto, diarista, chaveiro e reforma de uma vez.

### T2. Não existe campo de endereço nem mapa por imóvel
**Severidade: média.** O único endereço da página é o link de mapa que eu enfiei na lista de redes, como se a imobiliária fosse uma rede social. Cada imóvel tem uma localização, e ela é metade da decisão de compra.

### T3. Não existe editor para o rótulo do filtro
**Severidade: média.** `filter_labels` existe na tabela e no payload, e o `montar_payload_portfolio` já sabe usá-lo, mas não há campo nenhum em `fieldSchema.js`. Por isso o filtro publica `alto-padrao`. É o mesmo padrão do B1 e do B2: a coluna existe, o editor não a alcança.

### T4. A ordem das seções ficou vazia
**Severidade: baixa.** O payload publica `"sections": []`. Passei pelo painel "Seções" e não configurei nada, então a página caiu na ordem padrão. Para um corretor, "Imóveis disponíveis" deveria poder subir acima de "Quem é o Wilson": quem chega pelo WhatsApp quer ver o apartamento, não a biografia.

### T5. O formulário pergunta o ano, e imóvel não tem ano
**Severidade: baixa.** Preenchi 2025 e 2024 querendo dizer "é a safra atual do meu catálogo". Na janela ele aparece como "VENDA · 2025", que um cliente lê como ano de construção do prédio. Ano de entrega, ano de reforma e ano do anúncio são três coisas diferentes e o campo só cabe uma.

---

## Palavra errada

Todas do **editor**, e não da página publicada. A página inteira falou a língua dele depois que renomeei as seções, o que é um avanço real em relação às onze primeiras personas. O formulário é que não seguiu junto em alguns lugares.

| onde | o que diz | o que deveria dizer |
|---|---|---|
| rodapé da seção, no canvas | "Adicionar ou reordenar **projetos**" | eu já escrevi que se chamam "imóveis"; o rótulo é fixo em `editorShell.js:118` |
| gaveta de lista | "Meus **projetos**", "Adicionar **projeto**", "**Novo projeto**" | idem, `projetosPanel.js` |
| campo de imagem | "Imagem do **case**" | `fieldSchema.js`, `CAMPOS_PROJETO[0]` |
| subtítulo do formulário | "Preencha só o básico e ele já aparece na **grade**" | "grade" é palavra de quem desenha layout |
| passos do formulário | "O **case**", "**Provas**" | um imóvel não tem case nem provas |
| perfil | "**Projetos** com vídeo primeiro", "**Projetos** por página" | os dois no passo "A página", depois de eu ter escrito "imóveis" três campos acima |
| ajuda do campo "O que você faz" | `Ex: "Desenvolvedor e criador de produtos"` | é a última frase do portfólio de origem que ainda está visível no primeiro minuto de quem compra |
| checklist de publicação | "Tem pelo menos um **projeto**" | idem |

Uma a mais, que não é de vocabulário: a mensagem depois de publicar diz **"Enquanto isso o link de prévia já mostra tudo"**, e eu ainda não tinha gerado link de prévia nenhum. Ela cita um recurso que pode não existir para quem está lendo.

Sobre a clareza da mensagem de fila, que era a pergunta: **ela é clara.** "Recebido. A primeira publicação de cada conta passa por uma conferência rápida antes de ir ao ar." Diz o que aconteceu, que é a primeira vez, e que é rápido. A única coisa que falta é dizer **quanto tempo** e **como ele vai saber** que saiu da fila. Hoje ele precisaria ficar recarregando a própria URL.

---

## O que funcionou bem, e merece ser dito

- **"Preço, prazo ou condição"** é o campo mais valioso que este produto tem para vendedor, e ele resolve sozinho boa parte da hipótese desta persona.
- **A galeria de oito fotos** é exatamente o que um anúncio de imóvel precisa. As três fotos do apartamento da Vila Nova Conceição aparecem em mosaico dentro da janela, e ficam bem (`out/corretor-previa-janela-apartamento-na-vila-nova-conceicao.png`).
- **A panorâmica passou.** Subi uma foto 2000x700 de sala como capa e uma de fachada na galeria. Depois do conserto do corte destrutivo, o arquivo inteiro é guardado e quem recorta é o CSS: a foto ficou 1400x490 no servidor e o card mostra o pedaço certo. Para um corretor, que fotografa sala e fachada na horizontal larga, isso importa.
- **Renomear as seções funcionou de ponta a ponta.** "Imóveis disponíveis", "6 imóveis", "Onde eu atuo", "Minha trajetória", "Ficha do imóvel", "Detalhes e condições", "Lazer e infraestrutura". A página publicada não tem uma palavra de programador.
- **A paleta "Ouro" com fundo "Grade técnica"** ficou apropriada para alto padrão, e a escolha levou dois cliques.
- **Zero erro de console e zero erro de rede** em toda a sessão, em todas as etapas.

---

## Arquivos desta rodada

Scripts (`scripts/_demos/`): `demo-corretor-wizard.mjs` (a pergunta "Sua área" e a escolha do kit), `demo-corretor.mjs` (censo, perfil, a página, imóveis, experiências, o imóvel vendido, publicar, ler), `demo-corretor-ajustes.mjs` (apagar os exemplos do kit e a foto de 140 KB), `demo-corretor-chips.mjs` (desfazer as especialidades de arquitetura), `demo-corretor-janela.mjs` e `demo-corretor-janela2.mjs` (a sonda do modal que não abre no editor), `demo-corretor-previa.mjs` (a página de verdade, filtro e janela), `demo-corretor-medir.mjs` (a medida do corte da linha de preço).

Provas (`out/`): `corretor-areas-wizard.txt`, `corretor-censo-perfil.txt`, `corretor-censo-imovel.txt`, `corretor-icones-selo.txt`, `corretor-medida-preco.txt`, `corretor-previa.png`, `corretor-previa-celular.png`, `corretor-previa-janela-*.png`, `corretor-canvas-com-kit.png`, `corretor-publicar-depois.txt`. Mídia original em `out/midia/demo-corretor/`.
