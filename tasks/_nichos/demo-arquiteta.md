# Helena Kuroda, arquiteta em Curitiba: o produto já veste a profissão, menos na cor

**URL pública:** https://demo-arquiteta.myportifolio.com.br (HTTP 200, `noindex, nofollow`)
**Data da revisão:** 17/08/2026
**Onde foi medido:** produção. Página pública em 1440 e em 375, e o editor em
`myportifolio.com.br/app` com sessão injetada por `scripts/_demos/base.mjs`. Nada foi
commitado, nada foi deployado, nada em `src/`, `worker/`, `supabase/` ou `wrangler.jsonc`
foi tocado. Zero erro de console e zero resposta 4xx/5xx em todas as execuções.

**Aviso sobre a árvore de trabalho:** quando escrevi, havia conserto local **não commitado e
não deployado** vindo de outras personas rodando em paralelo, e ele cobre três achados meus
(D3, A1 e B2). Está anotado em cada item. Tudo que está medido aqui foi medido contra o que
está NO AR, não contra a árvore.

**Veredito em uma frase:** uma arquiteta consegue usar isso hoje e a página fica digna, mas
ela vai publicar em roxo mesmo tendo escolhido "Terra" (a paleta não chega na página quando a
conta tem o bump), e a janela do trabalho mostra a obra num selo de 64 px, que é o oposto do
que a profissão precisa.

---

## O TESTE CENTRAL: as 12 paletas escuras resolvem para arquitetura?

**Não. Falta tema claro, e essa é a conclusão principal desta persona.**

Mas a resposta honesta tem duas camadas, e a primeira é mais grave que a segunda.

### Camada 1: hoje nem as 12 paletas escuras chegam na página

Antes de discutir tema claro, o dado bruto: no editor, `theme_preset` está em **`terra`**
(`out/rev2-arq-ed-apagina.png`, campo "Paleta da página"). Na página publicada, o que sai é:

```
<section style="--pf-accent: #7C5CFC; --pf-plate: #0b0b12;">
```

Roxo de fábrica e placa roxo escuro. Terra é `#A67C52` sobre `#14110E`. **A paleta escolhida
não aparece em lugar nenhum da página.** Está no selo do perfil (borda roxa,
`out/rev2-arq-375-projetos.png`), na borda de topo da janela do trabalho e nos tiques da lista
de escopo (`out/rev2-arq-modal-1.png`).

Ou seja: o teste "12 paletas escuras bastam?" não chegou a ser feito de verdade, porque nesta
conta nenhuma paleta é aplicada. O mecanismo está detalhado em **D1**, abaixo.

### Camada 2: mesmo com terra funcionando, arquitetura pede claro

Arquitetura se apresenta em branco, e isso não é gosto: planta baixa é desenho em preto sobre
branco, prancha é branca, maquete é branca, ArchDaily e o portfólio de qualquer escritório são
brancos. O que existe no produto hoje são 12 variações de escuro (`src/modules/portfolio/theme/presets.js`),
e a `plate` mais clara de todas é `#1A1008`. Não existe nada acima de 10% de luminância.

O sintoma mais direto está no card do estudo do Sobrado Juveve (`out/rev2-arq-card-planta.png`):
a prancha branca vira um retângulo branco cravado numa página preta, sem transição nenhuma. Ela
é legível, mas parece um erro de layout, não uma escolha. Numa página clara ela seria o próprio
tecido da página.

### O que precisaria existir, em concreto

Não é "um seletor claro/escuro". É transformar cinco decisões hoje cravadas em literal para
token. Na ordem:

1. **Fundo do documento.** `body { background-color: #000000 }` e `.pf-bg { background-color: #000 }`
   (`src/styles/global.css:5` e `:472`) são hex literais. Viram `var(--pf-page-bg)`.
2. **Cor do texto.** `body { color: white }` mais **84 ocorrências** de `text-white`,
   `text-white/70`, `text-white/40` etc. nos módulos que renderizam a página
   (projects 38, profile 22, experience 19, portfolio 3, stacks 2). Cada uma precisa virar
   `text-[color:var(--pf-fg)]` ou equivalente, ou o texto some.
3. **As placas de vidro.** `.glass-card` e `.glass-button` são gradientes de
   `rgba(255,255,255,0.12)` sobre `rgba(10,10,10,0.7)`, mais borda `rgba(255,255,255,0.1)`.
   São **41 usos de `rgba(255, 255, 255, ...)` no `global.css`**. Glassmorphism claro existe,
   mas é o inverso: fundo branco translúcido, borda escura de baixa opacidade, e uma sombra
   real (no escuro a borda faz o papel da sombra; no claro sem sombra o card desaparece).
4. **A cor da placa dos projetos.** Ela **não** é CSS: sai como `style="background-color: #0b0b12"`
   inline em cada card e na moldura da galeria (`projectsSection.js:28`, `projectModal.js:104`),
   vinda de `theme.plateBg`. Cada preset precisa de um par claro, ou o `plate` precisa deixar de
   ser um hex único e virar um par (claro, escuro).
5. **Os títulos de seção.** `.metallic-silver` (`global.css:255`) pinta o texto com
   `linear-gradient(#9ca3af → #ffffff → #9ca3af)` e `color: transparent`. Sobre fundo claro o
   gradiente inclui o próprio branco: "SERVIÇOS", "PROJETOS" e "TRAJETÓRIA" **somem**. Precisa
   de uma segunda rampa (grafite → preto → grafite) trocada pelo token.

Faltam ainda, em segundo plano: os fundos `pf-bg-grid`, `pf-bg-dots` e `pf-bg-vinheta`, todos
desenhados com `rgba(255,255,255,0.045)` sobre preto (invisíveis no claro), e o `pf-bg-grao`,
que é ruído SVG branco.

### O que quebra hoje se alguém tentar, com screenshot

Simulei as duas tentativas ingênuas na página real, por CSS injetado, sem tocar em `src/`.

**Tentativa 1, só o fundo (`out/rev2-arq-tema-claro-quebrado.png`):**
a página vira uma moldura bege em volta de cinco lajes cinza-escuras. Os cards mantêm o
preenchimento próprio (`rgba(10,10,10,0.7)`), então o texto continua legível, mas o resultado
não é "tema claro", é "tema escuro sobre papel". E os títulos de seção já começam a sumir,
porque o feixe branco do `metallic-silver` bate no bege.

**Tentativa 2, fundo claro + placas claras (`out/rev2-arq-tema-claro-etapa2.png`):**
**a página inteira fica em branco sobre branco.** Nome, bio, redes, todos os textos da
trajetória, tudo desaparece. Sobrevivem exatamente três coisas, e todas pelo mesmo motivo (elas
carregam fundo escuro inline, não CSS): as placas dos cards de projeto, os quadradinhos de
iniciais da trajetória e o botão "AGENDAR CALL". É a prova visual de que `text-white` está
espalhado no markup, não centralizado.

### Requisito, escrito para virar tarefa

> Um modo claro que valha alguma coisa exige: (a) 4 tokens novos (`--pf-page-bg`, `--pf-fg`,
> `--pf-fg-muted`, `--pf-surface`) declarados na `<section>` junto de `--pf-accent`; (b) troca
> de ~84 classes `text-white*` e ~39 `bg-white/` e `border-white/` por esses tokens nos cinco
> módulos de render; (c) variantes claras de `.glass-card`, `.glass-button`, `.vibecoder-btn` e
> `.metallic-silver`; (d) um `plate` claro por preset, porque ele viaja inline no HTML; (e) 3 a
> 4 presets claros novos (o mínimo defensável para arquitetura: off-white `#F4F2EF` com texto
> `#1A1815` e acento terra `#8A5A34`, que passa 4.5:1); (f) o mesmo teste de contraste de
> `scripts/testar-presets.mjs` rodando também no par claro.
>
> Estimativa honesta: isso não é uma tarde. É a maior mudança de superfície que o produto tem
> pendente, e é o que separa "portfólio de dev que outros usam" de "template de portfólio".

---

## O que está resolvido

Tudo que a lista de conferência pedia foi de fato corrigido, e vale registrar porque é muita
coisa que uma arquiteta não precisa mais engolir.

- **R1. Títulos próprios de seção.** "SERVIÇOS", "PROJETOS" e "TRAJETÓRIA" saem na página no
  lugar de "Especialidades / Meus Projetos / Experiência". Os campos existem no editor
  (`ed-rotulo_stacks`, `ed-rotulo_projects`, `ed-rotulo_experience`, `ed-rotulo_cases`) e o
  contador "6 projetos" também segue o rótulo dela.
- **R2. Selo "Arquiteta e urbanista", com ícone de régua.** Sem jargão de dev, e com
  `badge_icon = ruler` na lista de 20 ícones.
- **R3. Rótulos da janela do trabalho renomeáveis.** Ela trocou por "O programa", "O partido",
  "Escopo entregue". Isso muda completamente a leitura de um case de arquitetura.
- **R4. Fundo "vinheta" aplicado.** Sai `<div class="pf-bg pf-bg-vinheta">` no HTML publicado.
  Funciona, e é o único item de tema que de fato chegou na página.
- **R5. Fotos preenchendo o card.** As cinco imagens que existem preenchem a placa
  (`object-cover`, 1200x800), sem faixa vazia e sem ícone de imagem quebrada.
- **R6. Enquadramento por imagem.** `ed-image_position` é um range **por projeto**, não mais
  global. E `ed-image_fit` oferece "Caber inteira, com respiro", que é exatamente o que uma
  planta baixa precisa.
- **R7. Galeria por trabalho.** Campo "Mais fotos deste trabalho" existe e a janela renderiza
  em grade 2 colunas com a proporção da placa. (Ressalva pesada em **D2**.)
- **R8. Redes sem texto grudado.** "Instagram · @helenakuroda.arq" saem em colunas separadas
  com respiro. (Ressalva em **A2**.)
- **R9. Rodapé sem "Desenvolvida por Method Growth Hub".** Confirmado: `document.querySelector('footer')`
  devolve `null`. (Isso abre outro buraco, ver **B1**.)
- **R10. Painel "Seções" novo.** Especialidades, Trabalhos e Experiência podem ser reordenados
  ou escondidos, com o aviso certo ("o conteúdo dela continua guardado aqui"). Para uma
  arquiteta que não quer mostrar trajetória, resolve.
- **R11. Página sã nas duas larguras.** `scrollWidth === innerWidth` em 1440 e em 375, zero
  erro de console, zero imagem quebrada, todas as imagens abaixo da dobra com `loading="lazy"`
  e a do hero eager.

---

## Bloqueio

Nenhum. Ela publica, a página fica no ar e responde 200. Não existe item que impeça a entrega.

---

## Defeito

### D1. A paleta escolhida não chega na página de quem tem o bump (GRAVE)

`theme_preset = terra` no editor, `--pf-accent: #7C5CFC` na página. O caminho:

1. `portfolioApi.js:98` carrega o formulário com `theme_accent: pf.theme_accent ?? '#7C5CFC'`.
   O campo de cor **nunca aparece vazio**: ele já nasce preenchido com o roxo de fábrica.
2. Qualquer "Salvar" no painel Perfil grava esse literal em `theme_accent` (e `#0b0b12` em
   `theme_plate_bg`), porque `ouNulo` só anula string vazia, e `#7C5CFC` não é vazia.
3. `montar_payload_portfolio` só zera essas colunas quando `v_custom` é falso
   (`0019_galeria.sql:78`). Nesta conta o bump existe, então os dois hex viajam no payload.
4. `resolverTema` (`presets.js:49`) resolve `accent: accent || base.accent`. A cor livre vence
   o preset, por desenho. Só que aqui a "cor livre" não foi escolhida por ninguém: é o padrão
   do formulário se fazendo passar por escolha.

O resultado é perverso: **quem pagou o bump é o único que não consegue usar as paletas**, e o
produto não avisa nada. O editor mostra "Terra" selecionado o tempo todo. Confirmado em três
lugares da página publicada (`--pf-accent` na section, borda do selo `rgb(124,92,252)`, borda
de topo e tiques da janela do trabalho).

Sugestão de correção, na ordem de menor risco: fazer o campo de cor mostrar a cor **efetiva**
(a do preset resolvido) em vez da de fábrica, e o patch distinguir "não mexeu" de "escolheu
exatamente esta cor". Assim ausência de escolha volta a produzir ausência de dado, que é a
regra que o resto do arquivo já segue.

**Sendo consertado localmente agora, não deployado:** apareceu na árvore de trabalho, enquanto
eu escrevia, um diff em `portfolioApi.js` que carrega o campo com `resolverTema({ preset }).accent`
em vez de `'#7C5CFC'`, e o próprio comentário do diff chama isso de "metade do conserto".
Confirmo que é metade, e a outra metade é o que falta dizer: **isso não repara quem já foi
atingido**. A linha da Helena já tem `theme_accent = '#7C5CFC'` gravado no banco. Com o novo
carregamento ela continua publicando roxo, porque o valor deixou de ser padrão de formulário e
virou dado. Toda conta com o bump que salvou o perfil alguma vez está no mesmo estado. Falta
uma migration que zere `theme_accent` e `theme_plate_bg` nas linhas onde eles são exatamente
`#7C5CFC` e `#0b0b12` **e** existe `theme_preset` preenchido: nesse par específico, é
impossível a pessoa ter escolhido a cor de fábrica de propósito depois de escolher um preset
diferente.

### D2. A janela do trabalho mostra a obra num selo de 64 px (GRAVE para esta profissão)

`projectModal.js:104`: a imagem principal do projeto é renderizada dentro de um
`<div class="w-16 h-16 rounded-2xl">`, ao lado do título, no papel de avatar. A galeria
(`p.gallery`) é um array **separado**: a imagem de capa **não entra nela**.

Consequência: um trabalho com uma foto só nunca é visto grande. Em `out/rev2-arq-375-modal.png`
está o caso extremo: o estudo do Sobrado Juveve existe **para** mostrar a planta baixa
redesenhada, e na janela ela é um quadradinho de 64 px, ilegível, seguido de 600 palavras de
texto. A pessoa clicou no card justamente para ver a prancha maior, e ela ficou menor.

Para dev isso funcionava (um print de tela é contexto, o link é o produto). Para arquitetura,
fotografia, tatuagem e confeitaria, a imagem **é** o produto.

Correção mínima: quando não há vídeo, renderizar `p.image` como primeira peça da galeria, em
largura total e na proporção da placa, e manter o selo de 64 px só quando existir vídeo ou
quando a imagem já estiver na galeria.

### D3. O card sem imagem escreve o nome duas vezes (MÉDIO)

`out/rev2-arq-card-sem-imagem.png`. Sem `p.image`, `projectsSection.js:35` põe o nome no centro
da placa, e a barra de baixo já mostra o mesmo nome em caixa alta. Sai "Casa Guaira" no meio e
"CASA GUAIRA" embaixo, no mesmo card, a 90 px de distância. O card sem imagem funciona (é o
achado da persona advogada), mas ele fica com cara de bug.

Sugestão: no lugar do nome, usar a categoria em corpo grande, ou o `highlight`, ou apenas um
ícone neutro. Qualquer coisa que não repita a linha de baixo.

**Já consertado localmente, não deployado:** o diff pendente em `projectsSection.js` troca o
`<span>` do nome por string vazia, deixando só a placa colorida e o selo de categoria. Resolve.

### D4. Marca d'água da paleta no seletor de "Ano" (MÉDIO)

`ed-year` é um `<select>` com exatamente 8 opções: 2019 a 2026. Uma arquiteta com 12 anos de
carreira (a própria Helena, formada em 2007) não consegue cadastrar a obra de 2016 que ela
mais gosta. Arquitetura tem projeto que dura três anos e portfólio que dura trinta. O campo de
experiência aceita 2007 sem reclamar, o de projeto não.

---

## Atrito

### A1. O formulário e a página falam línguas diferentes (MÉDIO)

Ela renomeou os rótulos da janela do trabalho para "O programa", "O partido" e "Escopo
entregue". O **formulário do editor continua perguntando**:

| O que o editor pergunta | O que ela está preenchendo |
|---|---|
| "O que estava travando antes?" | o terreno, o desnível, a insolação |
| "O que você entregou?" | o partido arquitetônico |
| "O que o sistema faz?" | área construída, programa, estrutura, vedação |
| "Stack usada" | concreto aparente, madeira cumaru, cobertura verde |

O rótulo público é configurável, o rótulo do formulário não. Ela renomeia uma vez e continua
lendo "O que o sistema faz?" toda vez que abre um projeto. Correção barata: espelhar o rótulo
que a pessoa escreveu no `label` do campo correspondente, com o texto de fábrica como reserva.

**Já consertado localmente, não deployado:** o diff pendente em `fieldSchema.js` faz
exatamente isso, com `rotuloUi(valores, chave, padrao)` lendo `valores._ui`, e ainda deriva o
singular da profissão ("Nome deste projeto"). Também troca a ajuda de "Categoria" por
exemplos que não são de software. Quando isso subir, A1 e três das linhas da tabela de
"Palavra errada" morrem juntas.

### A2. Os valores das redes truncam com reticências (BAIXO)

Em 1440, "@helenakuroda.arq" vira "@helenaku…", "Referências e paletas" vira "Referencias …" e
"Obras publicadas" vira "Obras publi…" (`out/rev2-arq-1440-inteiro.png`). O texto grudado foi
resolvido, mas a coluna ficou estreita demais para o que cabe nela. Como a coluna de redes é a
mais estreita das três do topo, o corte acontece já no desktop, não só no celular.

### A3. Não existe caminho de recuperação para imagem que não subiu (MÉDIO)

O projeto "Casa Guaira" está publicado **sem imagem** e o editor sinaliza isso corretamente com
uma etiqueta "SEM IMAGEM" na lista (`out/rev2-arq-ed-projetos.png`). O sinal está certo. O que
falta é o sinal aparecer **antes de publicar**: a pré-visualização mostra o card no formato
"sem imagem" sem dizer que aquilo não foi uma escolha. Uma arquiteta publica achando que subiu.

E isso piora na árvore de trabalho: o diff pendente em `publishState.js` **remove** o item
"Todos os projetos têm imagem" do checklist de publicação, e a justificativa dele está certa
(para uma advogada aquele item ficava eternamente vermelho e resolvê-lo exigiria violar
sigilo). Só que com ele fora, some o último aviso antes de publicar. A saída não é reverter,
é separar as duas coisas: "sem imagem de propósito" e "o upload falhou" são estados
diferentes e hoje o produto só tem um. Um botão de "este trabalho não tem imagem" no
formulário resolveria os dois casos sem um checklist que acusa quem não tem culpa.

### A4. O painel abre por cima da barra do topo (BAIXO)

Com o painel Perfil aberto, os botões "Projetos", "Experiência" e "Seções" ficam atrás do
overlay e não recebem clique. Só há um caminho: fechar o painel e abrir o outro. Não é grave a
mão (o × está visível), mas obriga a fechar e reabrir a cada troca, e foi o que quebrou meu
primeiro script.

---

## Buraco de template

### B1. Não existe ficha técnica, e ela é o formato canônico da profissão (GRAVE)

Não há campo para **área construída, área do terreno, ano de conclusão, localização, tipo de
obra, etapa ou registro CAU**. Helena resolveu do único jeito possível: escreveu tudo como
itens de lista no campo de features. O resultado, em `out/rev2-arq-modal-1.png`:

```
✓ Area construida: 174 m2
✓ Terreno: 360 m2
✓ Localizacao: Bacacheri, Curitiba, PR
```

Tiques roxos de "concluído" ao lado de medidas. O tique é semanticamente errado: 174 m2 não é
uma entrega marcada, é um dado. Toda ficha técnica de arquitetura publicada no mundo é uma
tabela de chave e valor, alinhada, sem ícone. Aqui virou checklist.

Requisito: um campo repetível `rótulo: valor` por projeto, renderizado como tabela de duas
colunas, separado da lista de entregas. Serve arquitetura (área, terreno, ano, local),
fotografia (equipamento, local, cliente), advocacia (vara, instância, duração) e chef
(tempo, rendimento, custo). Não é campo de nicho, é o campo que falta.

### B2. O CAU virou "número de capa" (MÉDIO)

Ela pôs `CAU / A123456-7` como um dos quatro números da capa, ao lado de "34 obras entregues" e
"12 anos de projeto". Funciona, mas mistura vaidade com obrigação legal: registro profissional
não é métrica. O mesmo problema deve aparecer com OAB, CRP, CREA e CRM. Um campo de registro
profissional, renderizado discreto perto do nome ou num rodapé, resolveria para metade das
profissões testadas nesta rodada.

**Já resolvido localmente, não aplicado:** a migration `0024_registro_profissional.sql` está
na árvore de trabalho, cria `portfolios.registro_profissional` (texto livre, até 40
caracteres, ao lado do nome no card do topo) e cita CAU junto de OAB, CRP, CRM e CREA. Quando
subir, o CAU sai da vitrine de métricas. Este achado nasceu independente em três personas, o
que é o melhor sinal de que o campo faltava mesmo.

### B3. Não existe rodapé nenhum (MÉDIO)

A remoção do crédito da Method Growth Hub tirou o elemento inteiro. A página termina no último
bullet da FAU USP e acaba, sem linha de fecho, sem ano, sem "© 2026 Helena Kuroda", sem repetir
o contato. Numa página de venda de serviço, o rodapé é onde o visitante que rolou tudo procura
o telefone. Aqui ele tem que rolar de volta ao topo.

---

## Palavra errada

| Onde | Está escrito | Problema | Severidade |
|---|---|---|---|
| Form. do projeto | "O que o sistema faz?" | ela está listando área e materiais, não um sistema | média |
| Form. do projeto | "Stack usada" | concreto aparente e madeira cumaru não são stack | média |
| Form. do projeto | "Imagem do case" / "Endereço do case" | "case" é palavra de agência e de dev; para arquitetura é "obra" ou "projeto", e o rótulo público já é configurável, o do form não | média |
| Form. do projeto | "Categoria: Ex: Landing page, Automação, App." | os três exemplos são de software, num campo onde ela digitou "Residencia unifamiliar" | média |
| Perfil | "Uma linha. Ex: 'Desenvolvedor e criador de produtos'." | mesmo problema, no primeiro campo obrigatório que a pessoa lê | média |
| Janela do trabalho | "FERRAMENTAS" (padrão de `rotulo_stackLabel`) | é renomeável e portanto não é defeito, mas o padrão devia ser neutro ("Materiais e recursos", "O que foi usado") | baixa |
| Perfil | "Duas palavras que dizem o que você é" (ajuda do selo) | "Arquiteta e urbanista" são três, ocupam 21 dos 24 caracteres, e o limite não é mencionado na ajuda | baixa |
| Painel Projetos | "Preencha só o básico e ele já aparece na grade" | correto e bom; anotado como exemplo do tom certo | nenhuma |

---

## Anexo: arquivos gerados

Página pública: `out/rev2-arq-1440-topo.png`, `out/rev2-arq-1440-inteiro.png`,
`out/rev2-arq-375-inteiro.png`, `out/rev2-arq-375-projetos.png`, `out/rev2-arq-375-modal.png`.
Janela do trabalho: `out/rev2-arq-modal-0.png` (sem imagem), `out/rev2-arq-modal-1.png`,
`out/rev2-arq-modal-5.png` (a planta).
Cards em detalhe: `out/rev2-arq-card-planta.png`, `out/rev2-arq-card-sem-imagem.png`.
**Tema claro:** `out/rev2-arq-tema-claro-quebrado.png` (só o fundo) e
`out/rev2-arq-tema-claro-etapa2.png` (fundo mais placas, a página some).
Editor: `out/rev2-arq-ed-perfil-aberto.png`, `out/rev2-arq-ed-apagina.png`,
`out/rev2-arq-ed-projetos.png`, `out/rev2-arq-ed-projeto-tudo.png`,
`out/rev2-arq-ed-experiencia.png`, `out/rev2-arq-ed-secoes.png`.
