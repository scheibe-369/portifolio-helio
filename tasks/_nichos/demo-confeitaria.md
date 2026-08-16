# Sônia Prazeres, confeiteira em Niterói

**URL pública:** https://demo-confeitaria.myportifolio.com.br
(no momento deste relatório o endereço responde **404**, porque a primeira publicação de cada conta
entra na fila de conferência humana. O conteúdo pronto está visível na prévia:
`https://demo-confeitaria.myportifolio.com.br/?previa=064d32a5caf632fe2b6337ad5eb75af3873a0b980e2fb419`)

**Tempo:** cerca de 45 minutos de máquina (6 execuções de script, 5 delas medindo, uma montando).
Uma pessoa fazendo isso à mão, com as mesmas fotos já prontas na pasta, gastaria de 2 a 3 horas.
A Sônia, no celular, sem nunca ter visto o produto, não terminaria numa sessão só.

**Veredito, em uma frase:** não. A Sônia não faz isso sozinha, porque a foto que sai da câmera do
iPhone dela é recusada pelo produto, porque o botão que ela mais precisa (WhatsApp) vem escrito
"Agendar Call" e trocar o texto custa dinheiro extra, e porque a página que ela publicaria diz aos
clientes dela "MEUS PROJETOS", "6 cases" e "STACKS DOMINADAS", palavras que ela não usaria nem
entenderia.

**As três coisas mais graves:**
1. Foto de iPhone (HEIC) é recusada na cara: `formato nao aceito. Envie JPG, PNG, WebP ou AVIF.`
2. Trocar "Agendar Call" por "Chamar no WhatsApp" é um campo pago, com o input `disabled`.
3. Os títulos da página publicada são vocabulário de programador e não têm campo nenhum no editor.

Roteiro reproduzível: `scripts/_demos/demo-confeitaria.mjs` (montagem),
`-recon.mjs` (vocabulário virgem), `-ajustes.mjs` (provas), `-celular.mjs` (375x812),
`-heic.mjs` (foto de iPhone), `-final.mjs` (republicação).
Logs em `out/conf-*.txt`, telas em `out/conf-*.png`.

---

## BLOQUEIO

### B1. A foto que sai do celular dela não sobe (severidade alta)

- **O que fiz:** subi um arquivo com `mimeType: image/heic`, que é o formato padrão da câmera de
  qualquer iPhone desde 2017, no campo de foto de um bolo.
- **Esperava:** o produto converter, como converte tudo o mais (ele já gera WebP por canvas).
- **Aconteceu:** recusa imediata, com a frase `formato nao aceito. Envie JPG, PNG, WebP ou AVIF.`
  Pior: o próprio seletor de arquivo já filtra por `accept="image/jpeg,image/png,image/webp,image/avif"`,
  então no iPhone as fotos dela aparecem **apagadas na galeria**, sem nenhuma explicação.
  Ela não vai concluir que precisa mudar o ajuste de câmera para "Mais compatível". Ela vai desistir.
- **Arquivo:** `src/modules/media/lib/imagePipeline.js` (`TIPOS_ACEITOS`), consumido por
  `src/modules/editor/fields/imagemField.js` (atributo `accept`).
- **Prova:** `out/conf-heic.txt`, `out/conf-34-heic-recusado.png`.
- **Nota:** o Safari do iPhone decodifica HEIC nativamente, então `createImageBitmap` funcionaria lá.
  A allowlist está barrando um caso que o navegador dela resolveria sozinho.

### B2. Ela não consegue trocar "Agendar Call" por "Chamar no WhatsApp" sem pagar de novo (severidade alta)

- **O que fiz:** procurei onde se muda o texto do botão principal. Está em
  Perfil > Contato e redes, campo "Texto do botão", com uma pílula escrita PERSONALIZAÇÃO ao lado.
- **Esperava:** digitar "Chamar no WhatsApp" e salvar.
- **Aconteceu:** para uma conta que comprou só o produto base, o input vem `disabled`.
  Medido de verdade, forçando `has_custom: false` na resposta da API (o roteiro de demo do repositório
  concede o extra por cortesia, então sem essa interceptação o teste mentiria):

  ```json
  { "campo": "cta_label", "rotulo": "Texto do botão PERSONALIZAÇÃO", "inputDesabilitado": true }
  ```

  O próprio painel de venda confirma, listando "O texto do botão principal" entre os cinco itens da
  Personalização. Ou seja: a Sônia publica um botão escrito **Agendar Call** apontando para o
  WhatsApp dela, e para consertar isso paga um extra.
- **Por que é bloqueio e não atrito:** o `estressa` desta persona é exatamente esse. O canal dela é
  WhatsApp e o assunto é encomenda. Um botão "Agendar Call" numa página de bolo não é só feio, é
  um convite errado.
- **Arquivos:** `src/modules/editor/data/fieldSchema.js` (`cta_label` com `feature: 'custom'`),
  `src/modules/editor/fields/primitivos.js` (`dis = bloqueado ? ' disabled' : ''`),
  `src/modules/editor/panels/bumpPanel.js` (a lista do que é vendido).
- **Prova:** `out/conf-ajustes.txt` seção G, `out/conf-16-sem-personalizacao.png`.
- **Sugestão:** o mesmo argumento que tirou o selo do bump em 16/08/2026 vale aqui, inteiro. Cobrar
  para o comprador parar de dizer "Agendar Call" quando ele vende bolo não é personalizar, é
  consertar. `cta_label` deveria descer para a base, junto de `cta_url`, e a Personalização fica com
  as cores.

---

## DEFEITOS

### D1. O texto do botão principal sai cortado no computador (severidade alta)

- **O que fiz:** publiquei com "Chamar no WhatsApp" e abri a página em 1440, 1024, 768 e 375.
- **Esperava:** o texto inteiro em qualquer largura.
- **Aconteceu:** em 1440 e 1024 lê-se **"CHAMAR NO WHATSA"**. O botão é `width: 100%` com
  `overflow: hidden` e sem reticências. Medido:

  | largura da tela | largura do botão | espaço para o texto | texto precisa de | corta? |
  |---|---|---|---|---|
  | 1440 | 160 px | 109 px | 119 px | **sim** |
  | 1024 | 134 px | 83 px | 119 px | **sim** |
  | 768 | 236 px | 185 px | 119 px | não |
  | 375 | 301 px | 250 px | 119 px | não |

  O defeito nunca apareceu porque "Agendar Call" cabe. Qualquer rótulo real de português com mais de
  15 caracteres não cabe. O editor deixa digitar 40.
- **Arquivos:** `src/styles/global.css` (`.bookmarkBtn`, `overflow: hidden`),
  `src/modules/profile/components/profilePanel.js` (`renderCta`),
  `src/modules/editor/data/fieldSchema.js` (`cta_label` com `maxLength: 40`).
- **Prova:** `out/conf-15-previa-publica.png` (canto direito superior).

### D2. Depois de publicar, o endereço dela oferece o próprio endereço para outra pessoa (severidade alta)

- **O que fiz:** cliquei em "Publicar meu portfólio", li a mensagem de recebido e abri o endereço.
- **Esperava:** algo como "sua página está em conferência, volte em algumas horas".
- **Aconteceu:** HTTP 404 com o texto:

  > **Este endereço ainda está livre**
  > Ninguém publicou um portfólio em demo-confeitaria.myportifolio.com.br ainda. Se você chegou aqui
  > por um link, confira se o endereço está escrito certo.
  > **[Quero este endereço]**

  A Sônia acabou de publicar. A página diz que ninguém publicou, diz que ela pode ter digitado
  errado, e oferece a venda do endereço dela para quem estiver olhando. Se ela mandar o link para
  uma cliente nesse intervalo (e ela vai mandar, é o primeiro impulso), a cliente lê que a Sônia não
  existe. O link no topo do editor, ao lado do slug, leva exatamente para essa tela.
- **A gaveta de publicar explica bem** ("Recebido. A primeira publicação de cada conta passa por uma
  conferência rápida antes de ir ao ar. Enquanto isso o link de prévia já mostra tudo."). O problema
  é que a explicação some no instante em que ela fecha a gaveta, e nada mais no produto repete isso:
  a barra de cima continua dizendo **RASCUNHO**, e o endereço continua dizendo que está livre.
- **Prova:** `out/conf-28-endereco-em-revisao.png`, `out/conf-final.txt`.
- **Sugestão:** enquanto houver publicação na fila para aquele slug, o endereço deveria servir uma
  tela de "em conferência" (e o topo do editor um selo "em conferência", não "rascunho").

### D3. As redes sociais dela viram duas caixas grandes com o texto colado (severidade alta)

- **O que fiz:** cadastrei duas redes, que é tudo que ela tem: Instagram e WhatsApp.
- **Esperava:** duas linhas normais.
- **Aconteceu:** medido na página publicada:

  | largura | altura da caixa | espaço entre rótulo e valor | linhas do valor |
  |---|---|---|---|
  | 1440 | 131 px | **0 px** | 1 |
  | 1024 | 166 px | **0 px** | 3 |
  | 768 | 86 px | 46 px | 1 |

  Sai `Instagram@soniaprazeres.bolos` grudado, e o telefone quebrado no meio:
  `(21) 99887-` numa linha, `7665` na outra. E cada caixa tem 131 px de altura para uma linha de
  texto, porque o item usa `flex-1` dentro de uma coluna: com poucas redes, cada uma estica.
  O portfólio de origem tinha quatro ou cinco redes, então isso nunca apareceu.
- **Arquivo:** `src/modules/profile/components/profilePanel.js` (`socialItem`, classe
  `flex-1 flex items-center justify-between`, sem `gap` e sem `min-w-0`).
- **Prova:** `out/conf-15-previa-publica.png`, `out/conf-ajustes.txt`.

### D4. Os botões de "Editar" da experiência ficam todos em cima da primeira entrada (severidade média)

- **O que fiz:** cadastrei três entradas (um trabalho e dois cursos) e olhei o canvas do editor.
- **Esperava:** um lápis em cada entrada.
- **Aconteceu:** os três lápis aparecem empilhados dentro da **primeira** entrada. Lido do DOM:

  ```
  experiencia:senac-rio-de-janeiro...   dentro de "Faço todos os bolos e doces sozinha..."
  experiencia:atelie-doce-arte...       dentro de "Já entreguei mais de 1.200 bolos..."
  experiencia:doces-da-sonia...         dentro de "DS Confeiteira e dona · Doces da Sônia..."
  ```

  A ancoragem usa `experiencia.querySelectorAll('ul > li')` e casa por índice com a lista do
  contexto. Só que os marcadores de "O que você fez ali?" também são `ul > li`: com 3 destaques na
  primeira entrada, foram encontrados **10** `li` para **3** entradas. Quem tem uma entrada só nunca
  vê o defeito. Quem escreve destaques (que é justamente quem o produto quer) vê sempre.
- **Arquivo:** `src/modules/editor/components/editorShell.js:118`.
- **Prova:** `out/conf-ajustes.txt` seção C, `out/conf-10-canvas-completo.png`.

### D5. O ícone do selo não desenha dentro do editor, mas desenha na página publicada (severidade média)

- **O que fiz:** escolhi o ícone "Bolo" para o selo "Confeiteira".
- **Esperava:** ver o bolinho ao lado da palavra, no editor.
- **Aconteceu:** no canvas do editor o elemento fica `<i data-lucide="cake">` cru, sem SVG
  (`temSvg: false`). Na página publicada ele aparece certo (`temSvg: true`). O editor chama
  `createIcons({ icons: { Code, ArrowRight, ArrowUpRight } })`, uma lista de três, enquanto o
  `main.js` registra a lista inteira. A Sônia escolhe o ícone, não vê nada mudar e conclui que não
  funcionou. Existe até um script de teste dedicado a esse tipo de divergência
  (`scripts/testar-icones.mjs`), e o editor escapou dele.
- **Arquivo:** `src/modules/editor/components/editorApp.js:1` e `:40`.
- **Prova:** `out/conf-ajustes.txt` seção D.

### D6. Clicar no cadeado apaga o que estava sendo escrito (severidade média)

- **O que fiz:** abri o perfil, digitei na bio, e cliquei na pílula PERSONALIZAÇÃO para entender o
  que era.
- **Esperava:** uma explicação e um caminho de volta.
- **Aconteceu:** a gaveta inteira é substituída pelo painel de venda. Não há botão de voltar
  (`temVoltar: false`), não há aviso, e o formulário deixou de existir (`aindaTemFormulario: false`).
  Fechando e reabrindo, o que eu tinha digitado sumiu. Quem clica no cadeado é exatamente quem não
  sabe o que ele significa, ou seja, a Sônia.
- **Arquivos:** `src/modules/editor/panels/formPanel.js` (dispara `editor:abrir-bump`),
  `src/modules/editor/panels/bumpPanel.js` (`abrirGaveta` sem `aoVoltar`).
- **Prova:** `out/conf-execucao.txt`, `out/conf-03-cadeado-botao.png`.

### D7. A pílula "PERSONALIZAÇÃO" continua aparecendo para quem já comprou (severidade média)

- **O que fiz:** rodei com a conta que tem o extra liberado.
- **Aconteceu:** o input está liberado, mas a pílula de venda continua colada no rótulo dos três
  campos. Quem pagou continua vendo o anúncio do que já é dele.
- **Arquivo:** `src/modules/editor/fields/primitivos.js`, função `moldura`: a pílula é renderizada
  por `campo.feature === 'custom'` sem olhar `bloqueado`.

### D8. Toda foto de bolo entra na grade com tarja preta dos dois lados (severidade média)

- **O que fiz:** cadastrei seis bolos sem mexer em nada além do básico.
- **Esperava:** a foto preenchendo o quadro do card.
- **Aconteceu:** todas as seis saíram com `object-contain p-5`, ou seja, a foto encolhida dentro de
  um retângulo com sobra. O padrão de um trabalho novo é `image_fit: 'contain'`, que o editor chama
  de "Logo (com respiro)". Para um portfólio de programador (cheio de logotipo de cliente) o padrão
  faz sentido. Para qualquer profissão visual, o padrão está invertido.
- **Custo para corrigir:** o campo mora em "Ajustes finos", que é a última seção recolhida de cada
  trabalho, um por um. Foram 6 idas, com abrir lista, abrir trabalho, abrir "Ajustes finos", trocar
  o select, salvar. E as duas opções se chamam "Logo (com respiro)" e "Print (preenche a placa)",
  duas palavras que ela não usa.
- **Arquivos:** `src/modules/editor/panels/projetosPanel.js` (`vazioNovo`, `image_fit: 'contain'`),
  `src/modules/projects/components/projectsSection.js:17`.
- **Prova:** antes `out/conf-08-canvas-com-bolos-padrao.png`, depois `out/conf-08b-canvas-com-bolos-cover.png`.

### D9. O modal do trabalho mostra um título "STACK" com nada embaixo (severidade média)

- **O que fiz:** cliquei num bolo, como um cliente faria.
- **Aconteceu:** o modal termina com o cabeçalho **STACK** e nada abaixo dele, porque a Sônia não
  preencheu "Stack usada" (e não vai preencher nunca). O bloco de "O Desafio" e "A Solução" tem
  guarda de vazio, os de "RECURSOS" e "STACK" não têm. A linha de baixo do título também sai com
  separador solto: `BOLO DE CASAMENTO · 2025 ·`, porque o cliente é vazio.
- **Arquivo:** `src/modules/projects/components/projectModal.js` (o `block()` guarda os dois
  primeiros; os dois últimos são renderizados sempre; e a linha
  `${category} · ${year} · ${client}` monta os separadores sem checar o conteúdo).
- **Prova:** `out/conf-27-celular-modal.png`, `out/conf-celular.txt`.

### D10. Cada tecla digitada repinta a página inteira (severidade média)

- **O que fiz:** medi, no viewport de celular, o custo de digitar 11 letras no campo do selo.
- **Aconteceu:** 11 letras, **11 repintes completos do `#app`**, 918 ms no total, num desktop com
  rede boa. Cada repinte reexecuta `renderPortfolioPage` (perfil, 6 cards com imagem, experiência,
  carrossel). No aparelho da Sônia isso é meio segundo de travada por letra.
- **Arquivo:** `src/modules/editor/components/editorApp.js` (`repintar` como `aoMudar`),
  chamado por `src/modules/editor/panels/formPanel.js` a cada evento de `input`.
- **Prova:** `out/conf-celular.txt`.

### D11. O campo "Observação sobre o link" não nasce enquanto se digita o link (severidade baixa)

- **O que fiz:** digitei o link do Instagram no campo "Link do projeto no ar" e esperei.
- **Esperava:** o campo dependente aparecer.
- **Aconteceu:** não apareceu. Ele só existe depois de um repinte, e digitar texto chama
  `aoMudar(false)`, que de propósito não repinta (para não roubar o foco). O campo aparece na
  próxima vez que o formulário for aberto. O espelho do defeito também acontece: apagando o link, o
  campo de observação **continua** na tela, órfão.
- **Arquivos:** `src/modules/editor/components/formulario.js` (`aoMudar(false)` no `input`),
  `src/modules/editor/data/fieldSchema.js` (`link_note.dependeDe`).
- **Prova:** `out/conf-execucao.txt` e `out/conf-ajustes.txt` seção B.

### D12. O carrossel de especialidades começa com o primeiro item cortado (severidade baixa)

O primeiro chip do `.stacks-marquee` começa em `-52 px` em relação à caixa: lê-se "amento" no lugar
de "Bolo de casamento". A primeira especialidade da lista é a mais importante e é justamente a que
nunca se vê inteira. Prova: `out/conf-final.txt`, `out/conf-15-previa-publica.png`.

### D13. No celular, todos os botões do editor são menores que o alvo mínimo de toque (severidade baixa)

A barra de cima quebra em duas fileiras (o que está certo) mas os sete controles têm 34 px de
altura, abaixo dos 44 px recomendados. Prova: `out/conf-celular.txt`, `out/conf-20-celular-canvas.png`.

### D14. Curso que começa e termina no mesmo ano vira "2018 A 2018" (severidade baixa)

Bastaria imprimir "2018". Arquivo: `src/modules/experience/components/experienceSection.js`, função
`periodo`.

---

## ATRITO

### A1. Não existe "ver como o cliente vê" de verdade (severidade média)

"Ver como visitante" só tira a classe do body e esconde os lápis. O modal do trabalho **não abre**
dentro do editor (li o `#project-modal` e ele veio vazio). Ou seja, a única forma de a Sônia ver o
que a cliente dela lê ao tocar num bolo é gerar um "link de prévia", copiar e abrir noutra aba. O
modal é onde está o preço que ela escreveu. Prova: `out/conf-ajustes.txt` seção E, contra
`out/conf-27-celular-modal.png` (na prévia funciona).

### A2. As redes e os números da capa são digitados num bloco de texto com barras verticais

`Uma por linha, no formato: rótulo | texto ao lado | https://link`. É a sintaxe mais próxima de
programação em todo o editor, e cai justamente no campo mais importante dela (Instagram e WhatsApp).
Um erro de barra e a rede some sem aviso (o filtro descarta linhas sem `label` e sem `extra`).

### A3. O produto usa quatro nomes para a mesma coisa

Na tela vazia do canvas: **Trabalhos**. Na barra de cima: **Projetos**. Na gaveta: **Meus projetos**
e **Novo projeto**. Nos campos: **case** ("Imagem do case", "O case", "Endereço do case"). Na página
publicada: **MEUS PROJETOS** e **6 cases**. No checklist de publicar: "Tem pelo menos um projeto".

### A4. Trocar o enquadramento de 6 fotos custou 30 toques

Ver D8. Faltaria um "aplicar a todos" ou, melhor, um padrão que sirva para foto.

### A5. Não há como escolher o corte da foto

Subi de propósito uma foto quadrada de Instagram (1200x1200) no campo do bolo de 15 anos, que corta
3:2. O resultado gravado foi 1200x800: **um terço da altura foi embora**, 200 px em cima e 200 px
embaixo, com corte central fixo. Nessa foto, o topo do bolo (o andar de cima, que é o que ela
mostraria) e o pé do prato saíram. Não existe nenhum controle: o único enquadramento ajustável do
produto é o slider vertical da foto grande do perfil. Quem vende bolo fotografa quadrado, porque é o
formato do Instagram. Prova: `out/conf-07-foto-quadrada-cortada.png`, `out/conf-execucao.txt`.

### A6. O primeiro texto do produto promete duas informações e pede três

O wizard diz "Duas informações e o seu portfólio existe" acima de três campos.
Arquivo: `src/modules/editor/components/wizardSlug.js`.

### A7. Todos os exemplos dos campos são de programador

- "O que você faz": exemplo `Desenvolvedor e criador de produtos` (no wizard e no perfil).
- "Categoria" do trabalho: `Ex: Landing page, Automação, App.`
- "Curso ou formação": `Ex: "Bacharelado em Design", "Certificação AWS".`

O único campo com exemplo de gente de verdade é o selo do perfil, que cita chef, advogada e
fotógrafo. Esse é o padrão a copiar nos outros.

### A8. Os avisos de tamanho de arquivo falam em KB e proporção

"Corte 4:5, ate 120 KB", "Quadrada, ate 25 KB", "Corte 3:2, ate 90 KB", "PNG com fundo transparente
fica melhor". O produto **já** redimensiona e converte sozinho: esses números são o orçamento
interno vazando para a tela. A Sônia não sabe o que é KB nem 4:5, e o único efeito prático dessa
frase é assustar.

---

## BURACO DE TEMPLATE

### T1. Não existe preço, nem prazo de encomenda, nem quantas pessoas o bolo serve (severidade alta)

Os 19 campos de um trabalho são: `image, name, category, tagline, problem, solution, features,
video, link, link_note, stack, tem_cliente, client, year, groups, slug, image_fit, accent, plate_bg`.
Nenhum é preço. A busca por qualquer rótulo com "preço", "valor", "R$", "encomenda", "prazo" ou
"porção" devolveu **zero** campos.

Preço e prazo são a primeira e a segunda pergunta de todo cliente dela. O que sobrou como saída:

1. Enfiar "A partir de R$ 680. Encomenda com 30 dias de antecedência." dentro de **"Uma frase sobre
   ele"**, que é um campo de 280 caracteres pensado para uma frase de efeito. Funciona, e o
   resultado fica bom no card, mas o preço vira prosa e não dá para filtrar, ordenar nem destacar.
2. Repetir os números em **"O que o sistema faz?"** (o campo `features`), que é uma lista com
   marcador de check. É onde ficou melhor visualmente ("A partir de R$ 680 ✓ / Serve 80 pessoas ✓ /
   Encomenda com 30 dias ✓"), mas o campo se chama "O que o sistema faz?" e aparece na página como
   **RECURSOS**. Ela nunca acharia esse campo sozinha, e se achasse não escreveria preço ali.

**Sugestão mínima:** dois campos de texto curto no passo 1, `price_from` ("A partir de") e
`lead_time` ("Preciso de quanto tempo de antecedência"), impressos no card abaixo do nome e no topo
do modal. É a informação que o produto todo existe para transportar, nesta profissão e em pelo menos
metade das outras nove personas.

### T2. Os títulos da página publicada são de programador e não têm campo nenhum (severidade alta)

Nada disso é editável, nem comprando a Personalização. Está fixo em `src/app/i18n.js`:

| na página dela hoje | o que deveria dizer |
|---|---|
| MEUS PROJETOS | Meus bolos, ou um campo livre |
| 6 cases | 6 trabalhos |
| STACKS DOMINADAS | O que eu faço |
| 3 passagens | 3 lugares onde trabalhei e estudei |
| RECURSOS (no modal) | O que está incluído |
| STACK (no modal) | O que usei |
| O Desafio / A Solução | O que a pessoa queria / O que eu fiz |
| Acessar | Ver |
| Agendar Call | ver B2 |

Uma cliente da Sônia lê "STACKS DOMINADAS" acima de "Brigadeiro gourmet" e "Bem-casado". É a coisa
mais visivelmente errada da página inteira, e é a única que nem dinheiro resolve.

### T3. Não há onde dizer a área de atendimento (severidade média)

Bolo é produto com entrega. "Atendo Niterói e São Gonçalo" só coube dentro da bio, misturado com a
história da avó. É informação de decisão de compra, e devia ter linha própria perto do botão.

### T4. "Experiência" com "Empresa", "Cargo" e "passagens" não descreve uma autônoma (severidade média)

A entrada mais importante dela é "Doces da Sônia", que não é empresa e onde ela não tem cargo. O
formulário funcionou (ela virou "Confeiteira e dona" da "Doces da Sônia"), mas o vocabulário faz
parecer que a seção não é para ela. O tipo "Estudo" salvou os dois cursos, e o certificado foi o
único momento do teste em que o produto pareceu feito para ela: o texto do consentimento é claro,
diz o que acontece ao ligar e cita CPF. Esse é o padrão de escrita do resto.

### T5. Duas redes deixam a coluna de contato vazia e enorme (severidade média)

Ver D3. A estrutura da coluna assume quatro ou cinco redes. Instagram e WhatsApp é o mundo inteiro
dela, e o produto trata isso como caso degenerado.

### T6. Não há onde por selo de vigilância sanitária, MEI ou alvará (severidade baixa)

O único anexo do produto é o certificado, e ele mora dentro de uma entrada de experiência. Para
comida caseira vendida por encomenda, esse tipo de documento vale mais que diploma.

---

## PALAVRA ERRADA

Levantamento exaustivo. Passei por todas as telas do editor (perfil nos 4 passos, trabalho nos 4
passos, experiência nos 2 tipos, publicar, conta) e pela página publicada. A coluna da direita é a
sugestão, escrita como a Sônia falaria.

### Na página que os clientes dela leem (o mais grave, porque é público)

| hoje | sugestão |
|---|---|
| MEUS PROJETOS | MEUS TRABALHOS |
| 6 **cases** | 6 trabalhos |
| **STACKS DOMINADAS** | O QUE EU FAÇO |
| 3 **passagens** | 3 lugares |
| **RECURSOS** | O QUE ESTÁ INCLUÍDO |
| **STACK** | O QUE USEI |
| **O Desafio** | O que a pessoa precisava |
| **A Solução** | O que eu fiz |
| **Acessar** | Ver |
| **Agendar Call** | (deveria ser dela, de graça) |

### No editor

| hoje | sugestão |
|---|---|
| Projetos / Meus projetos / Novo projeto | Trabalhos / Meus trabalhos / Novo trabalho (o canvas já acerta) |
| Imagem do **case** | Foto do trabalho |
| **O case** (título do passo 2) | A história |
| Endereço do **case** | Endereço desta página |
| **Stacks** que você domina | O que você faz de especial |
| **Stack** usada | O que você usou |
| **Grupos de filtro**. "É o que vira a barra de filtro da grade." | Etiquetas para separar seus trabalhos |
| Link do projeto **no ar** | Link para ver este trabalho na internet |
| **O que o sistema faz?** | O que está incluído? |
| O que estava **travando** antes? | O que a pessoa precisava? |
| Tipo da imagem: **Logo (com respiro)** / **Print (preenche a placa)** | Como mostrar a foto: Foto (preenche o quadro) / Logotipo (com moldura) |
| **Ajustes finos** | Detalhes, ou Opcional |
| **Provas** (título do passo 3) | Onde ver este trabalho |
| Fundo das **placas** | Cor de fundo dos quadrinhos |
| "Corte 4:5, ate 120 KB" / "Quadrada, ate 25 KB" / "Corte 3:2, ate 90 KB" | "Pode mandar a foto como ela está, a gente ajusta" |
| "PNG com fundo transparente fica melhor" | (tirar) |
| Vídeo no YouTube: "**Shorts, live** e link curto funcionam" | "Cole o link do YouTube do jeito que ele veio" |
| Mostrar a bolinha de "**disponível**" | Mostrar que estou aceitando encomendas |
| Projetos com vídeo primeiro: "Case com vídeo **converte** mais" | "Trabalho com vídeo chama mais atenção" |
| Projetos por página | Quantos trabalhos aparecem de cada vez |
| Página em inglês: "ligar isto serve para **reservar o botão**" | "Ainda estamos preparando. Ligue para guardar seu lugar." |
| Endereço da entrada: "É a **chave que amarra a tradução**" | (tirar a segunda frase inteira) |
| **Empresa** (rótulo em Experiência > Trabalho) | Onde você trabalha ou trabalhou |
| **Cargo** | O que você faz lá |
| **PERSONALIZAÇÃO** (pílula) | ok, mas ver D6 e D7 |
| "Duas informações e o seu portfólio existe" (com três campos) | "Três informações e o seu portfólio existe" |

### Acentos faltando no produto (todas visíveis para o comprador)

Estas frases estão sem acento no código e chegam à tela assim:

- `Aparece no topo. Corte 4:5, ate 120 KB.` e `A do cantinho. Quadrada, ate 25 KB.` (**até**)
- Aba Conta: `Opcional. Com senha voce entra sem esperar o codigo chegar por e-mail.` (**você**, **código**)
- `formato nao aceito. Envie JPG, PNG, WebP ou AVIF.` (**não**)
- `o link precisa comecar com https://` (**começar**)
- `e-mail invalido` (**inválido**)
- `nao reconheci este link do YouTube` / `nao consegui salvar` / `nao consegui publicar` /
  `nao consegui gerar o link` / `nao consegui gravar a ordem` / `nao consegui apagar` (**não**)
- `imagem com resolucao alta demais` (**resolução**)
- `nao foi possivel ler esta imagem` (**possível**)
- `personalizacao nao liberada nesta conta` (**personalização**)

Arquivos: `src/modules/editor/data/fieldSchema.js`, `src/modules/editor/fields/primitivos.js`,
`src/modules/media/lib/imagePipeline.js`, `src/modules/editor/panels/*.js`,
`src/modules/access/components/setPasswordGate.js`.

---

## O QUE FUNCIONOU BEM (para não desfazer sem querer)

- O canvas vivo. Ela digita e vê o próprio site mudando atrás. É o melhor do produto.
- O passo 1 sempre aberto e o resto recolhido. Quatro campos para cadastrar um bolo é a medida certa.
- O checklist de publicar, escrito em português de gente: "Tem pelo menos uma foto sua",
  "Tem um texto sobre você". Só troque "projeto" por "trabalho".
- O texto do consentimento do certificado, que diz o que acontece e cita CPF. Melhor copy do produto.
- A aba Conta inteira: reembolso pelo artigo 49, apagar conta com 7 dias de arrependimento, baixar
  os próprios dados. Nada disso confundiu.
- O bloco vazio do canvas ("Enquanto estiver vazia, esta seção não aparece na sua página") resolve a
  dúvida antes dela nascer.
- O selo do perfil, com exemplos de chef e advogada e um ícone de bolo na lista. Foi a única vez em
  que o produto pareceu ter sido escrito pensando nela.
- O celular funciona: a gaveta vira folha de baixo, nada rola de lado, o formulário cabe em uma tela
  e o botão Salvar fica fixo no rodapé. Fora dos alvos de 34 px e da lentidão de digitação, editar
  pelo telefone é viável.
