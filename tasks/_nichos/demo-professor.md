# Adriano Peçanha, professor de Direito Constitucional para concursos

**URL pública:** https://demo-professor.myportifolio.com.br
**Data da revisão:** 17/08/2026 (medido contra produção, na versão que estava no ar)
**Persona:** `scripts/demos.config.mjs`, slug `demo-professor`. O que ela existe para quebrar:
muitas experiências e poucos trabalhos, e o certificado como centro da credibilidade.

**Veredito em uma frase:** sim, um professor de concursos consegue usar isto hoje, porque as
duas coisas que faltavam para ele (título próprio de seção e poder colocar a titulação acima
do material didático) estão resolvidas e funcionam de ponta a ponta, mas ele publica com a
paleta que escolheu sendo ignorada em silêncio e com o número que mais o vende, "412 alunos
aprovados", num bloco de capa que quebra de layout justamente quando ele tem quatro números.

**Estado no ar no fim da revisão:** 3 trabalhos, 6 experiências (3 trabalho, 3 estudo), 3
certificados anexados e visíveis, 4 números de capa, 8 chips, selo "Professor de Direito" com
ícone de capelo, seção de experiência no topo da página.

**Escopo do que mexi:** nada em `src/`, `worker/`, `supabase/`, `wrangler.jsonc` ou migrations.
Nada commitado, nada deployado. As únicas alterações foram no conteúdo do próprio portfólio de
demonstração, pelo editor: a ordem das seções (que é o teste pedido) e uma troca de paleta
para reproduzir um defeito, desfeita e conferida no fim.

---

## O teste central: 6 experiências e a seção que virou a primeira

A seção de experiência era a última e a menos cuidada do template. Para o Adriano ela é a
página inteira: quem procura professor de concurso quer ver aprovação, titulação e de onde ele
veio, antes de querer ver apostila.

**Resultado: a seção aguenta as 6 entradas sem nenhum sintoma de quebra.** Sem estouro
horizontal em 1440 nem em 375 (`scrollWidth === innerWidth` nos dois), sem imagem quebrada,
sem erro de console e sem erro de rede em nenhuma das execuções. Cada entrada carrega placa,
cargo, organização, período, local, até 6 marcadores, uma observação em itálico e o botão de
certificado, e a densidade continua legível empilhada seis vezes.

![Página em 1440, com a titulação no topo](../../out/rev2-prof-1440.png)
![A mesma página em 375](../../out/rev2-prof-375.png)

**A ordenação por período faz sentido, e a regra está escrita.** `ordenarPorPeriodo`
(`src/modules/experience/lib/periodoChave.js:38`) ordena pelo FIM, decrescente, com a entrada
atual em primeiro e desempate pelo início. Na prática do Adriano isso produz: Gran Cursos
(desde 02/2016), AGU (05/2012 a 01/2018), CERS (08/2014 a 01/2016), mestrado UnB (03/2012 a
12/2014), curso de formação da AGU (02/2012 a 04/2012), graduação UERJ (03/2005 a 12/2009).
É defensável e é consistente: a AGU aparece acima do CERS porque terminou depois, mesmo tendo
começado antes. O painel ainda oferece o botão "Colocar em ordem, da mais recente para a mais
antiga", que rodei e devolveu exatamente a mesma lista, ou seja, o automático e o manual
concordam. Nada a corrigir aqui.

**"Estudo" se distingue de "Trabalho", mas por ausência.** A entrada de estudo ganha um chip
"FORMAÇÃO" com ícone de diploma; a de trabalho não ganha chip nenhum
(`experienceSection.js`, ramo `e.kind === 'education'`). O chip existe e é legível, mas está a
8,5 px com opacidade 40%, e é o único sinal. Numa lista de seis onde metade é titulação, o
leitor não enxerga dois grupos, enxerga seis linhas parecidas. Detalhado em "Buraco de
template" abaixo.

---

## O que está resolvido

Confirmei item a item o que a revisão pediu para conferir, e a lista está boa.

1. **Títulos próprios de seção funcionam. Severidade: resolvido.** A página publica
   "DISCIPLINAS", "CURSOS E MATERIAIS" e "TITULAÇÃO E APROVAÇÕES", e não "STACKS DOMINADAS",
   "MEUS PROJETOS" nem "EXPERIÊNCIA". Os três vêm de `ui_labels` via `rotulo()`
   (`src/app/rotulos.js`), com volta ao padrão quando a chave está vazia. Este era o pior
   problema de vocabulário do template para esta profissão e ele acabou.
2. **Selo aparece e não diz "vibecoder". Severidade: resolvido.** Sai "Professor de Direito"
   com ícone `graduation-cap`, dentro do cartão de perfil. O campo é livre, com limite de 24
   caracteres, e o seletor de ícone tem capelo na lista.
3. **Contador de seção com palavra própria.** "6 passagens" na experiência e "3 cursos" nos
   trabalhos. "Passagens" cobre trabalho e estudo na mesma lista sem mentir em nenhum dos dois.
4. **Redes sem texto grudado. Severidade: resolvido em 375, novo problema em 1440.** No
   celular cada cartão mostra rótulo e valor separados e inteiros ("Telegram" /
   "Jurisprudência da semana"). Em 1440 o espaçamento também está certo, mas o valor passou a
   ser cortado por reticências (ver Defeito D3).
5. **Rodapé sem "Desenvolvida por Method Growth Hub". Severidade: resolvido.** Não existe
   elemento `<footer>` na página e a busca por esse texto no `innerText` não retorna nada.
6. **Fundo "grade" está aplicado.** O elemento `.pf-bg.pf-bg-grid` existe, é `fixed`, cobre a
   viewport e desenha os dois `linear-gradient`. Funciona (com a ressalva de contraste em A4).
7. **Enquadramento de logo existe e é o campo novo certo.** No formulário de experiência, em
   "AJUSTES FINOS", há "Enquadramento da logo" como `input[type=range]`, com a ajuda "Sobe ou
   desce o corte da logo dentro da placa". Ele só aparece quando existe logo, o que é a decisão
   correta: nas quatro entradas sem logo o campo não polui o formulário.
8. **Rótulos do formulário de experiência mudam com o tipo. Severidade: resolvido, e é um
   acerto grande.** Trocando "Trabalho" por "Estudo" no mesmo registro, "Empresa" vira
   "Instituição", "Cargo" vira "Curso ou formação", "Entrei em" vira "Comecei em", "Estou aqui
   até hoje" vira "Ainda estou cursando" e "O que você fez ali?" vira "O que você estudou ou
   construiu ali?". Para quem cadastra um mestrado, isso é a diferença entre o produto parecer
   feito para ele ou não.
9. **Sem entulho de erro.** Nas seis execuções do editor, `pageerror`, `console.error` e
   respostas 4xx/5xx do Supabase vieram todos vazios.

![Formulário de experiência com tipo Trabalho](../../out/rev2-prof-ed-03-exp-agu.png)
![O mesmo formulário com tipo Estudo, com todos os rótulos trocados](../../out/rev2-prof-ed-04-exp-como-estudo.png)

---

## Certificados

Esta é a seção que mais importa para o Adriano, então testei de ponta a ponta e não só de
olho. **Resultado: o mecanismo está inteiro e correto. O que falta é peso visual.**

### O que funciona

Os três certificados aparecem como botão no pé da entrada correspondente, com ícone de clipe e
texto escrito por ele: "Termo de posse" (AGU), "Diploma de mestrado" (UnB) e "Diploma de
graduação" (UERJ). Cliquei nos três e segui a cadeia inteira:

- O botão aponta para `https://demo-professor.myportifolio.com.br/certificado/<slug>`, com
  `target="_blank"` e `rel="noopener noreferrer"`.
- Essa rota responde **302** com `cache-control: private, no-store` e
  `x-robots-tag: noindex, noarchive`, e redireciona para uma URL assinada do Storage.
- A URL assinada responde **200 `application/pdf`**, sem `content-disposition`, ou seja, abre
  no visualizador do navegador em vez de baixar.
- O arquivo é PDF de verdade e tem o conteúdo certo. Extraí o texto do termo de posse da AGU:
  "ADVOCACIA-GERAL DA UNIAO / Termo de posse no cargo de Advogado da Uniao, ADRIANO PECANHA DE
  SOUZA, CPF 000.000.000-00, aprovado em 7o lugar no concurso publico de 2011, empossado em 3
  de maio de 2012."

O formulário também está certo: além de anexar (PDF ou imagem, até 3 MB), há "Texto do botão
no card" para nomear o anexo e um interruptor "Deixar o certificado visível na minha página",
com um aviso que cita nome completo e CPF em texto claro. Para um documento que traz CPF, esse
aviso é a decisão correta e o padrão desligado é o correto. A lista do painel marca
"CERTIFICADO VISÍVEL" nas três entradas que têm.

![A entrada da AGU com o botão do certificado](../../out/rev2-prof-crop-entrada-certificado.png)

### O que falta

**C1. O certificado é o elemento MENOR do cartão. Severidade: média.** O botão está a 10 px,
`text-white/75`, no fim da entrada, abaixo dos marcadores (11,5 px) e da observação (11,5 px).
Ou seja: numa página em que a prova documental é o argumento de venda, ela é tipograficamente o
último item da hierarquia. Para o Adriano, "posse na AGU com termo anexado" deveria ser tão
visível quanto o cargo. Um selo ao lado do título da entrada, ou o chip do período dizendo
"COM DOCUMENTO", resolveria sem reprojetar nada.

**C2. Um certificado por experiência, e só. Severidade: baixa.** Uma aprovação em concurso
costuma render dois papéis (edital de homologação e termo de posse) e um mestrado rende
diploma e histórico. O campo é singular e o segundo documento não tem onde entrar.

**C3. O endereço do certificado é derivado e cortado em 60 caracteres. Severidade: baixa, não
reproduzida.** O slug da entrada sai de organização + cargo, tem limite de 60 no formulário e
no banco (`experiences_slug_formato`), e é único por portfólio
(`experiences_slug_unico`). O da UERJ já saiu truncado no meio da palavra
(`...bacharelado-em-dire`), o que funciona mas é feio quando alguém copia o link. O risco real
é outro: duas titulações longas na mesma instituição ("Universidade de Brasília, Mestrado em
Direito Constitucional" e "Universidade de Brasília, Doutorado em Direito Constitucional")
podem truncar para o mesmo slug e bater no `unique`. Não consegui reproduzir dentro do tempo,
então fica registrado como risco e não como defeito confirmado.

**C4. Não há nenhum sinal de que o documento é conferível.** O botão abre um PDF e pronto. Não
há data, não há emissor visível fora do próprio arquivo, não há miniatura. Para concurso, onde
o aluno decide por confiança, mostrar o emissor ("Advocacia-Geral da União") no próprio chip
valeria mais que o texto livre do botão.

---

## O painel "Seções"

Este é o recurso mais relevante para esta profissão, e é o que melhor passou no teste.

**Testei o caminho inteiro: mover a experiência para o topo, ver o canvas mudar, publicar e
conferir a página pública.** Funcionou nas duas direções, ida e volta.

Ordem inicial (a canônica de `ORDEM_PADRAO`): `stacks`, `projects`, `experience`.
Depois de dois cliques em "Subir" na linha "Experiência": `experience`, `stacks`, `projects`.

O que observei, medido:

1. **O canvas atrás da gaveta repinta na hora.** Com a ordem padrão, os títulos ficam em
   Disciplinas y=1042, Cursos e materiais y=1197, Titulação e aprovações y=1623. Depois de
   subir: Titulação y=1042, Disciplinas y=2200, Cursos y=2355. Não é preview simulado, é o
   mesmo render.
2. **Grava a cada clique, sem botão de salvar.** Dois cliques com a persistência inteira
   levaram 3,5 s. A decisão está escrita no próprio `secoesPanel.js` e está certa para uma
   lista de três itens.
3. **A página pública reflete depois de publicar.** Em 1440: "Titulação e aprovações" y=987,
   "Disciplinas" y=2105, "Cursos e materiais" y=2260. Em 375: 1634, 3216 e 3363. Ou seja, a
   titulação é a primeira coisa abaixo do cartão de perfil, nas duas larguras.
4. **Setas em vez de arrastar, e desabilitadas nas pontas.** A seta "Subir" da primeira linha
   vem `disabled` de verdade (foi o que fez meu script falhar quando tentei subir de novo o que
   já estava no topo), então não existe clique que não faz nada.
5. **O texto explica o que não dá para mover.** "Sua foto e o seu perfil ficam sempre no topo.
   Seção escondida não aparece na sua página, e o conteúdo dela continua guardado aqui." Isso
   evita a busca inútil por um item que não está na lista.

![Painel de Seções, ordem padrão](../../out/rev2-prof-sec-B-padrao-painel.png)
![Painel de Seções, experiência no topo](../../out/rev2-prof-secoes-painel-final.png)
![Canvas com a ordem padrão](../../out/rev2-prof-sec-C-canvas-padrao.png)
![Canvas com a titulação no topo](../../out/rev2-prof-sec-D-canvas-experiencia-no-topo.png)

**Para esta profissão, essa é a ordem correta e agora ela é alcançável.** Titulação e aprovação
valem mais que material didático para quem escolhe cursinho, e antes disso o produto forçava a
ordem de portfólio de desenvolvedor. Único senão, e é pequeno:

**S1. O painel não avisa que a mudança ainda não está no ar. Severidade: baixa.** Ele grava o
rascunho a cada clique e o canvas muda na hora, o que passa a sensação de "pronto". A página
pública só muda depois de "Publicar alterações", num painel diferente. Uma linha do tipo
"publique para o visitante ver" fecharia o vão.

**S2. "Trabalhos" no painel, "Cursos e materiais" na página. Severidade: baixa.** Ver "Palavra
errada", P1.

---

## Bloqueio

**Nenhum.** Não houve nada que impedisse cadastrar, ordenar, publicar ou conferir. Todas as
oito linhas do checklist de publicação vieram marcadas, inclusive "Tem pelo menos um projeto",
e "Publicar alterações" respondeu "No ar. Pode abrir o seu endereço." em menos de 9 s nas três
publicações que fiz.

O único travamento que registro é meu, não do produto: com uma gaveta aberta os botões da barra
do topo ficam visíveis mas não clicáveis, porque a gaveta é `role="dialog" aria-modal="true"` e
intercepta o ponteiro. É comportamento correto de modal (Escape fecha), mas derrubou o script
duas vezes até eu passar a fechar antes de trocar de painel. Fica anotado para quem escrever o
próximo agente.

---

## Defeito

**D1. A paleta escolhida é ignorada em silêncio. Severidade: GRAVE.**

O Adriano tem "Oceano" selecionado no editor. A página pública sai com o roxo de fábrica.

Reproduzi e achei a causa. O payload publicado carrega
`"theme":{"accent":"#7C5CFC","preset":"oceano","plateBg":"#0b0b12", ...}`. Em `resolverTema`
(`src/modules/portfolio/theme/presets.js`), a cor livre do bump vence o preset, por decisão
declarada no próprio comentário. O problema é que `#7C5CFC` é **exatamente o valor de fábrica**,
e o campo "Cor de destaque" é um `input[type=color]`, que não tem estado vazio: ele sempre
mostra e sempre grava alguma coisa. Resultado: para uma conta com personalização liberada, o
seletor de paleta vira decoração permanente.

Testei trocando de Oceano para Menta e salvando: o `style` do canvas continuou
`--pf-accent: #7C5CFC`, a borda do selo continuou `rgb(124, 92, 252)`, e não houve nenhum aviso.
Doze paletas na lista, todas com contraste testado em build, e nenhuma delas alcançável por
quem pagou pela personalização.

O conserto já existe no código, aplicado ao lugar errado: `src/modules/portfolio/lib/ctx.js:62`
faz `p.accent && p.accent.toLowerCase() !== '#7c5cfc' ? p.accent : tema.accent` para o accent de
projeto, ou seja, alguém já decidiu que "#7c5cfc significa não escolhi". Falta a mesma regra em
`resolverTema` para o accent da página, ou um botão "voltar para a cor da paleta" ao lado do
poço de cor.

Contas sem personalização não sofrem: a função de publicação zera `theme_accent` quando
`v_custom` é falso, então para elas o preset funciona. O defeito atinge só quem comprou o bump.

**Nota de conferência, escrita depois de medir.** Ao terminar, encontrei na árvore de trabalho
o arquivo não commitado `supabase/operacao/0004_reparar_paleta.sql`, vindo de outra persona
rodando em paralelo, com exatamente este diagnóstico e um `update` que zera `theme_accent` onde
existe preset e a cor é o par de fábrica. O comentário dele diz que o conserto do formulário já
foi feito. Nada disso estava deployado na hora da medição, e a página do Adriano continuava
saindo roxa: o que registro acima é o comportamento observado em produção, não um achado
inédito. O que vale reter é que o dado errado já gravado sobrevive ao conserto do formulário e
continua vencendo o preset a cada republicação até o script de operação rodar.

![Paleta trocada para Menta, canvas sem mudar](../../out/rev2-prof-paleta-menta.png)

**D2. O quarto número da capa quebra o bloco. Severidade: média, e cara para esta profissão.**

O Adriano tem quatro números: alunos aprovados 412, anos de magistério 13, turmas concluídas 68,
horas de aula gravadas 900. Em 1440 os três primeiros ficam numa linha e o quarto cai sozinho
numa segunda, colado na direita, com o rótulo quebrando em duas linhas ("HORAS DE AULA /
GRAVADAS") e um vazio grande à esquerda. Fica com cara de erro, não de escolha.

A causa é `profilePanel.js:154`: `flex flex-wrap ... justify-start sm:justify-end`. Quebra de
linha com `justify-end` empurra o resto para a direita e deixa buraco. O formulário permite até
6 números, então quem usa 4 ou 5 cai nisto sempre. E o número que quebra é justamente o tipo de
prova que vende um professor de concursos.

![Cartão de capa em 1440, com o quarto número órfão](../../out/rev2-prof-crop-capa.png)

**D3. Em 1440 todo texto de rede social é cortado pela metade. Severidade: média.**

Medido elemento a elemento: "@profadrianopecanha" precisa de 108 px e tem 63; "Constitucional
Sem Susto" precisa de 123 e tem 71; "Turmas e matrícula" precisa de 92 e tem 61;
"Jurisprudência da semana" precisa de 125 e tem 68. Os quatro saem com reticências. O visitante
de desktop lê "Jurisprudên...", que não informa nada.

O mesmo conteúdo aparece inteiro em 375. É um defeito só de desktop, causado pela coluna
estreita das redes ao lado do bloco "SOBRE".

**D4. O rótulo do botão principal também é cortado em 1440. Severidade: média.**

"Falar sobre a turma" pede 112 px e tem 98 disponíveis. Sai "FALAR SOBRE A TU...". É o botão de
conversão da página, o único caminho para o WhatsApp de matrícula, e ele aparece truncado
exatamente na largura em que a maioria dos compradores confere a própria página depois de
publicar. Em 375 sai inteiro.

![O botão principal cortado](../../out/rev2-prof-crop-cta.png)

---

## Atrito

**A1. Uma seção só para trabalho e estudo, e um título só. Severidade: média.** O Adriano teve
que inventar "TITULAÇÃO E APROVAÇÕES" para cobrir três empregos de professor e três formações.
O título ficou bom, mas ele não é verdade sobre metade da lista: o CERS e o Gran Cursos não são
titulação nem aprovação, são docência. Um professor de concursos apresenta essas duas coisas
separadas, porque respondem a perguntas diferentes do aluno ("ele passou?" e "ele sabe dar
aula?").

**A2. As disciplinas passam de lado e quase nunca são lidas inteiras. Severidade: baixa.** A
faixa de chips é uma marquise, e o primeiro chip visível aparece cortado no meio da palavra
("...cionalidade"). Em 375 cabem menos de dois chips por vez. As oito disciplinas são o índice
do curso dele, e num print da página o leitor vê duas. A lista ainda é duplicada no DOM, o que
é como marquise se faz, mas a cópia não está marcada como decorativa, então leitor de tela lê
as oito disciplinas duas vezes.

**A3. Os títulos das três seções são o menor texto da página. Severidade: média.**
"TITULAÇÃO E APROVAÇÕES", "DISCIPLINAS" e "CURSOS E MATERIAIS" saem em `span` de 10 px com
`text-white/30`. Não são cabeçalhos: a página inteira tem um `h1` (o nome) e um único `h2`
("SOBRE"). Duas consequências. A visual: o produto deixou o comprador escrever o título da
seção e depois o escondeu. A de busca: quem procura "professor direito constitucional Brasília"
não encontra estrutura nenhuma para indexar abaixo do nome.

**A4. O fundo "grade" é indistinguível de "preto liso".** Os traços são
`rgba(255,255,255,0.043)`. Testei em 1440 e em 375, e nas capturas não é possível dizer qual
fundo está ligado. Como a lista tem oito opções e a ajuda já avisa "todos são discretos de
propósito", isto pode ser intencional. Registro porque o comprador escolhe uma coisa e vê
nenhuma, que é a mesma sensação de D1 numa dose menor.

**A5. Publicar é um painel separado do que se acabou de editar. Severidade: baixa.** Ver S1.

---

## Buraco de template

**B1. Não existe campo para número de aprovados, e o que existe não é campo, é texto livre.
Severidade: média.** O "412" está nos números de capa, um par rótulo/valor genérico. Funciona,
e o produto merece crédito por isso ser flexível. Mas nada no produto sabe que aquilo é uma
aprovação: não dá para listar aprovações por concurso, por ano ou por colocação, que é
exatamente a tabela que todo cursinho publica. O Adriano teve que enfiar "412 alunos aprovados
em concurso com nota registrada na disciplina" num marcador de experiência, onde ninguém que
está comparando professores vai procurar.

**B2. Não existe campo para banca. Severidade: média.** CESPE/Cebraspe, FGV, FCC e Vunesp são
o primeiro filtro de quem escolhe cursinho, e não há onde dizer para qual banca cada curso
prepara. Ele resolveu jogando os órgãos na bio ("AGU, TRF, TRT, Câmara, Senado, PGE e Banco do
Brasil"), que é texto corrido e não filtra nada. A grade de trabalhos já tem grupos de filtro,
então o encaixe natural seria banca como grupo de filtro dos cursos.

**B3. Trabalho e estudo não formam grupos. Severidade: média.** As 6 entradas saem numa lista
única, distinguidas só pelo chip "FORMAÇÃO" a 8,5 px e opacidade 40%. Não há subtítulo, não há
separador, e o painel "Seções" não permite quebrar experiência em duas seções ordenáveis.
Para esta persona, "TITULAÇÃO" e "EXPERIÊNCIA DOCENTE" como dois blocos independentes seria o
ganho maior que sobrou depois do painel de Seções.

**B4. Concurso público não tem "empresa" nem "cargo", tem edital, ano e colocação.** O 7º lugar
no concurso de 2011 é o dado mais forte que o Adriano tem, e está como o primeiro marcador de
uma entrada de trabalho, no meio de outros dois marcadores, no mesmo tamanho e na mesma cor. Um
campo próprio de colocação viraria um chip ao lado do cargo.

**B5. Quatro das seis placas caem no monograma. Severidade: baixa.** AGU, CERS, Escola da AGU e
UERJ ficaram com "AU", "CC", "EA" e "UE" em cinza. O monograma é a decisão certa (melhor que
buraco), e as iniciais estão corretas, mas numa seção onde a credibilidade é institucional a
falta da marca do órgão custa. Não é defeito do produto, é o custo de exigir uma logo quadrada
de até 90 KB de instituições públicas.

---

## Palavra errada

**P1. "Trabalhos" e "A grade com as suas entregas", no painel de Seções. Severidade: baixa.**
O painel chama a seção de "Trabalhos" mesmo depois de o comprador ter renomeado o título para
"Cursos e materiais". São vocabulários diferentes para a mesma coisa em duas telas do mesmo
produto, e "entregas" é palavra de agência, não de professor. O painel deveria mostrar o rótulo
que a pessoa escolheu, com o nome interno como subtítulo.

**P2. "Experiência" e "Onde você passou e o que estudou", no painel de Seções.** Mesma questão
de P1: na página está escrito "TITULAÇÃO E APROVAÇÕES" e o painel insiste em "Experiência".

**P3. "3 cursos" contando um canal do YouTube.** O contador usa o rótulo escrito pelo comprador
("cases" renomeado para "cursos"), e um dos três itens é "Constitucional Sem Susto, canal no
YouTube". Não é bug, é o preço de um contador com uma palavra só. Anoto porque a palavra certa
para ele seria "materiais", que ele já usou no título da seção e não pôde usar no contador.

**P4. "Empresa" e "Cargo" no formulário de experiência, com o tipo em "Trabalho".** Está certo
para o Gran Cursos e para a AGU, mas o comprador só descobre que existem "Instituição" e "Curso
ou formação" depois de trocar o tipo. Quem entra para cadastrar o mestrado e vê "Empresa" pode
concluir que o produto não serve, antes de achar o botão "Estudo" logo acima. Uma ajuda no
seletor de tipo ("Estudo troca os campos para instituição e curso") resolveria.

**P5. "Endereço da entrada" e "É a chave que amarra a tradução".** O campo de slug da
experiência explica a si mesmo com um conceito interno (tradução, i18n) que não existe para
quem não ligou o inglês. Aparece em "AJUSTES FINOS", então o dano é pequeno.

---

## Screenshots

Todos em `out/`, capturados em produção em 17/08/2026.

| Arquivo | O que mostra |
| --- | --- |
| `rev2-prof-1440.png` | Página pública inteira, 1440, com a titulação no topo |
| `rev2-prof-375.png` | Página pública inteira, 375 |
| `rev2-prof-1440-dobra.png` / `rev2-prof-375-dobra.png` | Primeira tela nas duas larguras |
| `rev2-prof-crop-capa.png` | D2, o quarto número da capa órfão na segunda linha |
| `rev2-prof-crop-cta.png` | D4, o botão principal truncado |
| `rev2-prof-crop-entrada-certificado.png` | A entrada da AGU com o botão "Termo de posse" |
| `rev2-prof-crop-disciplinas.png` | A2, a marquise de disciplinas cortada |
| `rev2-prof-crop-projetos.png` | A grade de cursos e materiais |
| `rev2-prof-ed-01-perfil.png` | Painel Perfil |
| `rev2-prof-ed-01-projetos.png` | Painel Projetos, 3 itens |
| `rev2-prof-ed-01-experiencias.png` | Painel Experiência, 6 itens, com as marcas ESTUDO e CERTIFICADO VISÍVEL |
| `rev2-prof-ed-01-secoes.png` | Painel Seções |
| `rev2-prof-ed-02-exp-aberta.png` | Formulário da experiência atual, com o enquadramento de logo |
| `rev2-prof-ed-03-exp-agu.png` | Formulário da AGU, com o certificado anexado e o aviso de CPF |
| `rev2-prof-ed-04-exp-como-estudo.png` | O mesmo formulário com tipo "Estudo", rótulos trocados |
| `rev2-prof-sec-B-padrao-painel.png` | Seções na ordem padrão |
| `rev2-prof-secoes-painel-final.png` | Seções com experiência no topo |
| `rev2-prof-sec-C-canvas-padrao.png` | Canvas antes de mover |
| `rev2-prof-sec-D-canvas-experiencia-no-topo.png` | Canvas depois de mover |
| `rev2-prof-sec-04-publicar.png` / `rev2-prof-sec-05-publicado.png` | Checklist e confirmação de publicação |
| `rev2-prof-tema-01-perfil-tudo.png` | Painel Perfil aberto inteiro, com fundo e paleta |
| `rev2-prof-paleta-menta.png` | D1, paleta trocada e nada muda |

Scripts de reprodução, também em `out/` e fora do código do produto:
`_rev2-prof-pub.mjs`, `_rev2-prof-cert.mjs`, `_rev2-prof-cert2.mjs`, `_rev2-prof-editor.mjs`,
`_rev2-prof-ed2.mjs`, `_rev2-prof-secoes.mjs`, `_rev2-prof-sec2.mjs`, `_rev2-prof-tema.mjs`,
`_rev2-prof-paleta.mjs`, `_rev2-prof-crop.mjs`, `_rev2-prof-crop2.mjs`, `_rev2-prof-fim.mjs`.

---

## As três coisas mais graves que sobraram

1. **D1, a paleta não faz nada para quem pagou pela personalização.** Doze cores validadas e
   nenhuma alcançável, sem nenhum aviso, porque a cor de fábrica gravada num `input[type=color]`
   vence o preset.
2. **D2 mais A3, a página esconde a prova.** O número que mais vende o professor cai órfão numa
   segunda linha, e os títulos das seções, que o produto acabou de deixar o comprador escrever,
   saem em 10 px e opacidade 30%, sem serem cabeçalho.
3. **B1, B2 e B3, o vocabulário da profissão não tem onde morar.** Aprovados, banca e a
   separação entre titulação e docência são os três eixos pelos quais um aluno escolhe
   cursinho, e os três viraram texto livre em campos que não sabem o que estão guardando.
