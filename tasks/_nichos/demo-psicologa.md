# Bianca Fontes, psicóloga clínica: um portfólio legítimo com ZERO trabalhos

**URL pública final:** https://demo-psicologa.myportifolio.com.br
(no momento responde **404**, porque a primeira publicação da conta está na fila de conferência
desde 16/08/2026 05:36 UTC, `publish_reviews.decided_at` ainda nulo. Isso é o comportamento
previsto em `0004_publicacao.sql`.)

**Prévia (é o que existe de página pronta hoje):**
https://demo-psicologa.myportifolio.com.br/?previa=1df1bbd24a939abc7ac3cb1ee587f1ee0c384bfc04c03658

**Estado no banco:** 0 trabalhos, 5 experiências, 3 números de capa, 10 chips, selo
"Psicóloga clínica" com ícone `brain`, certificado em PDF anexado e com consentimento ligado.

**Tempo:** cerca de 6 minutos de navegador dirigido por script, em 9 execuções
(`scripts/_demos/demo-psicologa.mjs`). Refeito à mão por uma pessoa, o mesmo conteúdo levaria
entre 35 e 50 minutos, e a maior parte disso seria as cinco idas e voltas ao topo da tela para
cadastrar cinco formações.

**Onde foi medido:** tudo contra produção (`https://myportifolio.com.br` e
`demo-psicologa.myportifolio.com.br`), na versão que estava no ar em 16/08/2026. Nenhum arquivo
de código, migration ou `wrangler.jsonc` foi tocado, nada foi commitado e nada foi deployado.
Dois dos defeitos abaixo (D2 e o avatar espremido de D7) já tinham conserto local **não
commitado e não deployado** na árvore de trabalho quando escrevi, vindo de outras personas
rodando em paralelo; está anotado em cada item.

**Veredito em uma frase:** a página sem projetos fica **de pé e digna**, o que é a boa notícia
do teste, mas o caminho até ela passa por dois defeitos que corrompem dado sem avisar (o switch
que morre depois do primeiro clique e o lápis de editar que abre a experiência errada) e por
uma copy que empurra uma psicóloga a publicar caso clínico.

---

## O teste central: o portfólio sem projetos

**Resposta curta: a página fica de pé, não fica com buraco, e o produto não impede publicar.**
Esse é o achado mais importante e ele é positivo.

![Página publicada, sem nenhum trabalho](../../out/psi-17-pagina-previa.png)

Screenshot: `out/psi-17-pagina-previa.png` (1440 px) e `out/psi-22-previa-celular.png` (375 px).

O que foi verificado, item por item:

1. **Publiquei sem nenhum trabalho e a página se sustenta.** `renderProjectsSection` devolve
   string vazia com lista vazia (`src/modules/projects/components/projectsSection.js:52`), então
   não sai card "Meus Projetos / 0 cases" nem funil que não filtra. A página fica: foto, cartão
   de perfil com os números da capa, bio, redes, botão de agendar, faixa de especialidades e a
   seção de experiência com cinco entradas. Nada de espaço morto, nada de placeholder.
   Confirmado por sonda: `temSecaoProjetos: false`, `imgSemSrc: 0`, `imgQuebradas: 0`,
   `larguraDoDocumento === larguraDaJanela` em 1440 e em 375.

2. **O produto não bloqueia.** O botão veio `desabilitado: false` e a publicação foi aceita. Só
   `display_name` e `role` travam (`montarChecklist`, `publishState.js:15`). A decisão está
   escrita no código ("barra de completude que impede publicar transforma um produto pago em
   lista de tarefas") e ela está certa.

3. **O checklist cobra "Tem pelo menos um projeto", e cobra mal.** Dois problemas distintos:
   - O item aparece com bolinha vazia e a psicóloga não tem como resolvê-lo sem violar sigilo.
     Ele é o único item vermelho de uma lista de oito, o que faz uma página completa parecer
     incompleta para sempre.
   - Logo abaixo dele, **"Todos os projetos têm imagem ✓" vem marcado em verde com zero
     projetos** (verdade vacuosa de `projetos.every(...)`). A lista mostra um erro e um acerto
     sobre a mesma coisa que não existe. Isso não é só feio, é confuso.

4. **O editor deixa claro que a seção some quando vazia, e isso está bem feito.** O bloco de
   estado vazio diz literalmente "Enquanto estiver vazia, esta seção não aparece na sua página"
   (`src/modules/editor/components/editorShell.js:69`). Ninguém acha que quebrou. O problema não
   é a mecânica, é a frase que vem junto (ver "Palavra errada").

5. **A seção de experiência assume o papel de vitrine sem precisar de nada novo.** Com cinco
   entradas, badge "FORMAÇÃO", período, local, marcadores, observação e botão de certificado, ela
   entrega exatamente o que uma psicóloga tem para mostrar. É o achado de produto desta persona:
   **para profissão de sigilo, "Experiência" já é o portfólio.** Ela só está no lugar errado
   (por último) e com o nome errado no resto da interface.

---

## Bloqueio

Nenhum bloqueio absoluto. O portfólio foi construído inteiro e publicado. O que chegou perto:

- **B1 (média).** Depois de salvar uma experiência, a gaveta inteira fecha e o comprador volta
  ao canvas. Para cadastrar as cinco formações eu precisei reabrir o painel "Experiência" cinco
  vezes. No primeiro roteiro isso derrubou o script com timeout em `[data-adicionar]`, porque o
  botão de adicionar simplesmente não existe mais depois de salvar
  (`src/modules/editor/panels/formPanel.js:153`, `fecharGaveta()` sem respeitar o `aoVoltar` que
  o próprio painel passou).

---

## Defeito

### D1. O switch morre depois do primeiro clique, e publica mentira (severidade **ALTA**)

- **O que fiz:** abri "Nova experiência", desliguei "Ainda estou cursando" para poder informar
  o ano de conclusão do bacharelado.
- **O que esperava:** o campo "Até" nascer e eu digitar 2016.
- **O que aconteceu:** o switch não mudou de estado, o campo "Até" nunca apareceu e a entrada foi
  salva como atual. A página publicou **"Bacharelado em Psicologia, Universidade Federal de São
  Paulo, DESDE 2012"**, ou seja, uma psicóloga formada há dez anos anunciando ao público que
  ainda está na graduação.
- **Reprodução isolada** (`node scripts/_demos/demo-psicologa.mjs listeners`, quatro cliques
  seguidos no mesmo switch, gaveta recém aberta):

  ```
  clique 1: true -> false
  clique 2: false -> false  (NAO MUDOU)
  clique 3: false -> false  (NAO MUDOU)
  clique 4: false -> false  (NAO MUDOU)
  ```

- **Causa, lida no código:** `repintarCorpo()` troca o `innerHTML` do **mesmo** elemento e chama
  `aoLigar(corpo, raiz)` de novo (`src/modules/editor/components/editorDrawer.js:61`), e
  `ligarFormulario()` pendura mais um jogo de listeners nesse mesmo nó
  (`src/modules/editor/components/formulario.js:58`). Com N jogos, um clique executa o handler
  N vezes. Como switch é **alternância** (`valores[key] = !valores[key]`, linha 126), N par
  significa "nada mudou", e cada clique ainda dobra N. Depois da primeira repintura o switch
  está morto até a gaveta ser fechada e reaberta.
- **Alcance:** todos os switches do produto (`show_contact_email`, `show_online_dot`,
  `projects_video_first`, `english_enabled`, `tem_cliente`, `atual`) e a caixa de consentimento
  do certificado (`data-cert-publico`), que é a mais grave das duas porque decide se um documento
  com nome completo e CPF fica público. O que salva os outros controles é serem **atribuição** e
  não alternância: `data-escolha` (tipo trabalho/estudo), chips e campos de texto sobrevivem à
  repetição por acidente, não por desenho.
- **Prova de que é isso:** reabrindo a mesma entrada com a gaveta limpa
  (`node ... arrumar1`), um único clique funcionou: `switch "ainda estou cursando": true -> false`.
- **Arquivos:** `src/modules/editor/components/editorDrawer.js:61`,
  `src/modules/editor/components/formulario.js:58`, `src/modules/editor/panels/formPanel.js:44`.
- **Sugestão:** em `repintarCorpo`, substituir o nó (`corpo.replaceChildren` não basta, os
  listeners estão no próprio `corpo`) por um wrapper interno recriado a cada pintura, ou ligar os
  listeners uma única vez na criação da gaveta e nunca dentro de `aoLigar`.

### D2. O lápis "Editar" da experiência abre a entrada errada (severidade **ALTA**)

- **O que fiz:** com as cinco experiências cadastradas, olhei o canvas do editor.
- **O que esperava:** um lápis "Editar" em cada uma das cinco entradas.
- **O que aconteceu:** três lápis empilhados em cima de marcadores (as bolinhas de "o que você
  fez ali"), um lápis correto na primeira entrada, um lápis na segunda entrada que abre a
  **quarta**, e nenhum lápis nas três últimas.
- **Medição** (`node scripts/_demos/demo-psicologa.mjs ancoras`):

  ```
   0 ENTRADA  "UF"                                            -> universidade-federal...  (certo)
   1 MARCADOR "Estágio em clínica-escola com atendimento..."   -> instituto-de-terapia...  (errado)
   2 MARCADOR "Iniciação científica em transtornos..."         -> puc-sp-especializacao... (errado)
   3 ENTRADA  "IT"                                            -> clinica-espaco-sereno...  (ERRADO)
   4 MARCADOR "480 horas entre teoria, prática..."             -> consultorio-proprio...   (errado)
   5..13                                                      -> sem lápis
  ```

- **Causa:** `editorShell.js:118` usa `experiencia.querySelectorAll('ul > li')`. Os marcadores de
  destaque também são `<li>` dentro de um `<ul>` aninhado
  (`src/modules/experience/components/experienceSection.js:54`), então o seletor casa 14 elementos
  onde existem 5 entradas, e o pareamento por índice com `ctx.portfolio.experience` desanda a
  partir do segundo item.
- **Por que é grave nesta persona:** a página dela é quase só experiência. Clicar em "Editar" no
  cartão do bacharelado abre o formulário do estágio em TCC. Quem não conferir o cabeçalho da
  gaveta sobrescreve a formação errada.
- **Correção:** trocar o seletor por `:scope > ul > li` (só as entradas). É uma linha.
- **Arquivo:** `src/modules/editor/components/editorShell.js:118` (código commitado, que é o que
  está no ar e é onde eu medi).
- **Confirmação independente:** no momento em que escrevi isto, a árvore de trabalho já tinha um
  conserto local **não commitado e não deployado** para exatamente esta linha, vindo de outra
  persona rodando em paralelo (`git diff src/modules/editor/components/editorShell.js`). Duas
  personas diferentes tropeçaram no mesmo defeito de forma independente, o que diz que ele atinge
  qualquer pessoa com mais de uma experiência com destaques, e não só quem tem a página inteira
  feita de formação.

### D3. O endereço reservado é oferecido à venda para estranhos (severidade **ALTA**)

- **O que fiz:** abri `https://demo-psicologa.myportifolio.com.br` logo depois de publicar.
- **O que esperava:** uma página dizendo que o endereço está reservado e em conferência, ou pelo
  menos um 404 neutro.
- **O que aconteceu:** 404 com o título **"Este endereço ainda está livre"**, o texto "Ninguém
  publicou um portfólio em demo-psicologa.myportifolio.com.br ainda" e um botão **"Quero este
  endereço"** que leva a `/comprar?slug=demo-psicologa`. Essa página de compra reforça: *"Você
  veio de demo-psicologa.myportifolio.com.br, que ainda está livre. Ele fica reservado para você
  assim que o portfólio for publicado."*
- **Por que é grave:** o slug **não** está livre. Ele já tem dono, já foi pago, e está preso na
  fila só porque o produto exige conferência humana na primeira publicação. Um estranho paga
  R$ 47,90 acreditando na frase e só descobre no wizard, depois de pagar, que
  `portfolios_slug_unico` recusa. O dano cai nos dois lados: quem comprou fica sem o endereço que
  o site prometeu, e a psicóloga corre o risco de perder o endereço que ela já divulgou.
- **Nuance justa:** o comentário de `0004_publicacao.sql:291` argumenta que "ainda está livre" é
  a verdade para o mundo, e para o **visitante** é. O problema não é o texto de topo, é o **botão
  de compra** e a promessa de reserva embaixo dele.
- **Arquivos:** `worker/render/paginas.js:58`, `src/modules/oferta/components/ofertaPage.js:27`.
- **Sugestão:** no ramo em que existe `publish_reviews` sem decisão, responder 404 sem o CTA, e
  no `/comprar?slug=` checar a disponibilidade real antes de afirmar que o endereço fica
  reservado.

### D4. Depois de publicar, nada lembra que existe uma revisão pendente (severidade **MÉDIA ALTA**)

- **O que fiz:** publiquei, li a mensagem, fechei a gaveta e voltei ao editor como se fosse no
  dia seguinte.
- **O que esperava:** algum sinal permanente de "em conferência".
- **O que aconteceu:** o selo da barra de cima continua dizendo **"RASCUNHO"**, o botão volta a
  dizer **"Publicar meu portfólio"**, e a palavra "revisão" não aparece em lugar nenhum da tela
  de publicar (medido: `a palavra "revis" aparece na tela de publicar? false`). A única frase que
  explica a espera vive dentro de `resultado`, uma variável de memória da gaveta, e morre no
  primeiro fechamento (`src/modules/editor/panels/publicarPanel.js:118`).
- **Consequência previsível:** ela clica em publicar de novo, o `on conflict` reseta o
  `requested_at`, e ela abre ticket dizendo que publicou três vezes e não foi.
- **A frase em si é boa** ("Recebido. A primeira publicação de cada conta passa por uma
  conferência rápida antes de ir ao ar. Enquanto isso o link de prévia já mostra tudo"). O
  problema é ela ser volátil. `publish_reviews` já tem RLS de select para o dono
  (`0004_publicacao.sql`), então o dado para pintar o selo já está acessível.

### D5. O botão "Ver certificado" da prévia responde 404 (severidade **MÉDIA ALTA**)

- **O que fiz:** abri o link de prévia e cliquei em "Ver certificado" na formação em TCC.
- **O que esperava:** o PDF, já que a tela promete "Enquanto isso o link de prévia já mostra
  tudo".
- **O que aconteceu:** `GET .../certificado/instituto-de-terapia-... -> 404`.
- **Causa:** em `worker/rotas/tenant.js:46`, o ramo `previa` retorna antes de qualquer coisa, e o
  link do card não carrega o token. Quando a requisição cai em `servirCertificado`, ela chama
  `get_published_portfolio`, que devolve `not_found` para um portfólio que nunca foi publicado
  (`worker/rotas/tenant.js:211`).
- **Por que dói nesta persona:** o certificado é a única prova documental que ela pode publicar, e
  esse documento carrega nome completo e CPF. A prévia é exatamente o lugar onde ela deveria
  conferir **antes** de o mundo ver se o consentimento ficou como ela quis. Hoje ela só descobre
  depois de a página estar pública.
- **Sugestão:** propagar o token de prévia no `href` do card quando `ctx.isPreview`, e aceitar o
  token na rota `/certificado/`.

### D6. Imagem minúscula sobe em silêncio e é ampliada 5x (severidade **MÉDIA**)

- **O que fiz:** subi `https://randomuser.me/api/portraits/women/44.jpg` (128x128) no campo
  "Sua foto grande".
- **O que esperava:** algum aviso de que a foto é pequena demais para o topo da página.
- **O que aconteceu:** nenhuma palavra. O pipeline recortou para 4:5, gerou um WebP de **102x128**
  e subiu (`.../hero/bianca-fontes-5456d8aa.webp`, 1 POST no Storage, `erro=""`). Na página esse
  arquivo é exibido a **526x652 CSS px**, ou seja, mais de 5x de ampliação, e mais de 10x em tela
  retina.
- **Agravante:** a prévia dentro do editor tem **64x80 px**. É pequena demais para alguém
  perceber que subiu lixo. O comprador só descobre quando abre a própria página publicada.
- **O código já sabe fazer isso:** `imagePipeline.js` recusa acima de 15 MB e acima de 50 MP, e
  calcula `escala = Math.min(1, cfg.lado / max(recorte))`. Falta o outro lado da régua.
- **Arquivo:** `src/modules/media/lib/imagePipeline.js:175`.
- **Sugestão:** quando `escala === 1` e o lado maior for menor que, digamos, 60% de `cfg.lado`,
  aceitar mesmo assim mas escrever na linha de ajuda: "esta foto tem 128 px e vai aparecer
  ampliada, o ideal são 1000 px ou mais".

### D7. A linha de "números da capa" e o card de redes quebram em 1440 px (severidade **MÉDIA**)

- **O que fiz:** preenchi números de capa que uma psicóloga usaria (`CRP | 06/148372`,
  `Clínica | 8 anos`, `Atendimento | Online`) e redes com telefone e e-mail.
- **O que aconteceu, visível em `out/psi-17-pagina-previa.png`:**
  - `8 anos` quebra em duas linhas ("8" em cima, "anos" pendurado embaixo, fora do alinhamento),
    porque `statItem` não tem `whitespace-nowrap`
    (`src/modules/profile/components/profilePanel.js:20`). O template foi desenhado para valores
    de uma palavra.
  - O nome "Bianca Fontes" é empurrado para duas linhas porque a linha de stats come a largura.
  - `(11) 98812-4470` quebra no meio do número e encosta no rótulo "WhatsApp"; o e-mail
    transborda a borda do card e "E-mail" vira "E-/mail". `socialItem` usa
    `flex items-center justify-between` sem `min-w-0`, sem `gap` e sem truncamento
    (`profilePanel.js:78`).
  - Sonda confirma: `A.flex-1 flex items-center justify-between 176>158` (18 px de transbordo).
  - **A foto do cartão vira uma tira vertical.** Como "Bianca Fontes" quebra em duas linhas, o
    flex espreme o avatar: o WebP de 512x512 é desenhado com uns 25 px de largura por 56 de
    altura, em vez do círculo de 56x56. Visível em `out/psi-17-pagina-previa.png`, ao lado do
    nome. Falta `shrink-0` no `<img>` e no `<div class="relative">` que o embrulha
    (`profilePanel.js:53` e `:92`). O gatilho é nome comprido, ou seja quase todo nome
    brasileiro com sobrenome. **Este item também já tinha conserto local não commitado na árvore
    de trabalho, vindo de outra persona.** Os outros dois (o "8 anos" quebrado e o transbordo das
    redes) continuam abertos.
- **Em 375 px está tudo certo.** É defeito só do layout largo, o que torna fácil não perceber
  testando no celular.

### D8. As quebras de parágrafo da bio somem (severidade **MÉDIA**)

Escrevi a bio em quatro parágrafos, que é como uma psicóloga escreve (acolhimento, o que ela
trata, como conduz, como começar). A página imprime tudo em um único bloco de 8 linhas, porque
`renderProfilePanel` joga `esc(t(profile.bio))` dentro de um `<p>` só
(`src/modules/profile/components/profilePanel.js:110`). O campo aceita 2000 caracteres e a
`<textarea>` preserva os `\n`, então o dado existe e é o render que o descarta. Para uma
profissão em que a bio **é** o produto, isso é perda de leitura, não de estilo.

### D9. No canvas do editor, o certificado aponta para o apex (severidade **BAIXA**)

Dentro do editor (e portanto dentro de "Ver como visitante"), o botão do certificado resolve para
`https://myportifolio.com.br/certificado/...`, que é 404 no apex, porque o `href` é relativo e o
editor mora em outro host. Na página publicada o link está certo.

---

## Atrito

- **A1 (média).** Salvar experiência fecha a gaveta inteira em vez de voltar para a lista, mesmo
  quando o formulário foi aberto com `aoVoltar` definido. Cinco formações, cinco viagens ao topo
  da tela. Para esta profissão, que tem muitas formações e nenhum projeto, esse é o caminho
  principal do produto, não um caso de canto. `formPanel.js:153`.
- **A2 (média).** "Conta" é o único dos cinco botões da barra que **não** abre gaveta: ele
  substitui a tela inteira do editor e exige um "‹ Voltar para o editor". Isso quebrou meu script
  e vai quebrar a expectativa de quem clicou nos outros quatro antes. `editorBoot.js:108`.
- **A3 (média).** Três controles de projeto ficam visíveis e ativos no perfil de quem nunca terá
  projeto: "Projetos com vídeo primeiro", "Projetos por página" e o texto de ajuda "Case com
  vídeo converte mais". A psicóloga lê isso no passo "A página" e pensa que está deixando de
  fazer algo.
- **A4 (baixa).** O upload não tem indicador de progresso: a única sinalização é o texto
  "convertendo e enviando..." escrito na **linha de erro** do campo (`formPanel.js:53`). Estado de
  carregamento e estado de erro no mesmo lugar, com o mesmo estilo.
- **A5 (baixa).** O aceite dos termos leva alguns segundos sem qualquer progresso, só o botão
  virando "Registrando...". Já está anotado em `base.mjs`, e continua verdadeiro.
- **A6 (baixa).** Sem o bump de personalização (R$ 37,90), o campo "Texto do botão" nasce
  desabilitado e a página publica **"AGENDAR CALL"**. Conferi que esta conta demo tem
  `has_custom = true`, então eu consegui trocar; quem compra só o básico não consegue. A palavra
  mais importante da página de uma psicóloga (o convite para marcar a primeira sessão) está atrás
  de um paywall, escrita em jargão de agência.

---

## Buraco de template

- **T1 (alta).** **Não existe campo para registro profissional.** CRP, e por extensão OAB, CRM,
  CREA, CRN. Eu tive que esconder o CRP dentro de "Números da capa", um campo cuja moldura
  ("números", valor grande em negrito) sugere métrica de vaidade, não identificação legal. Ver a
  seção de ética abaixo: para psicólogo isso não é conveniência, é exigência.
- **T2 (alta).** **Não existe nenhuma seção que substitua a grade de trabalhos.** Profissão de
  sigilo não tem case, mas tem "como funciona", "quanto custa", "para quem eu atendo", "o que
  esperar da primeira sessão". Hoje o único lugar para isso é a bio (um bloco de texto corrido) ou
  os chips. O produto tem uma seção inteira reservada para uma coisa que ela nunca vai preencher e
  nenhuma para as quatro que ela precisa.
- **T3 (média).** Os chips misturam coisas de natureza diferente sem separação: "Terapia
  cognitivo-comportamental" (abordagem) fica lado a lado com "Burnout" (queixa) e "Adultos"
  (público). Faltam dois grupos rotuláveis, ou pelo menos um rótulo editável para a faixa.
- **T4 (média).** O marquee de especialidades foi desenhado para palavras curtas de tecnologia. Com
  "Terapia cognitivo-comportamental" (31 caracteres) a faixa fica com pílulas de larguras muito
  desiguais e a primeira sempre entra cortada pela animação.
- **T5 (média).** A bio é um parágrafo só (ver D8). Sem `white-space: pre-line` ou split por
  `\n\n`, não existe texto longo legível no produto.
- **T6 (baixa).** Nenhum campo aceita uma foto do consultório sem que ela vire "projeto". A
  psicóloga tem uma foto óbvia para mostrar (a sala, o setting online) e não tem onde colocar.
- **T7 (baixa).** Não há campo de horário, modalidade (online/presencial), convênio ou faixa de
  preço, que é o conjunto de perguntas que um paciente faz antes de agendar.

---

## Palavra errada

| Onde | Está escrito | Problema | Sugestão |
|---|---|---|---|
| Página pública, título da faixa de chips (`i18n.js:19`) | **"Stacks Dominadas"** | É a palavra mais fora de lugar da página. Uma psicóloga anunciando "stacks dominadas" para pacientes com crise de pânico. É jargão de dev servido ao público final. | Rótulo editável, com padrão neutro: **"Especialidades"**. Se precisar de padrão fixo, "O que eu trabalho". |
| Editor, campo (`fieldSchema.js:84`) | "Stacks que você domina" | Mesma palavra, e ainda por cima diverge das outras duas. | "Suas especialidades" |
| Canvas do editor, bloco vazio (`editorShell.js:79`) | "O que você usa no trabalho" | Terceiro nome para a mesma coisa. Três nomes para um campo é como se perde a confiança em um produto. | Unificar com os dois de cima. |
| Canvas, bloco vazio de trabalhos (`editorShell.js:72`) | **"É o coração do portfólio: comece por um."** | Dito a quem, por dever profissional, não pode ter nenhum. Ver a seção de ética. | "Se a sua profissão tem trabalho para mostrar, é aqui. Nem toda tem, e a página funciona sem." |
| Painel de projetos (`projetosPanel.js:105`) | "Você ainda não cadastrou nenhum projeto. É o coração do portfólio: comece por um." | Mesma frase, mesmo problema. | Idem. |
| Checklist de publicar (`publishState.js:19`) | "Tem pelo menos um projeto" | Vira uma pendência permanente e insolúvel. | Tornar o item condicional, ou reescrever como sugestão sem bolinha vermelha: "Trabalhos, se você tiver o que mostrar". |
| Checklist (`publishState.js:20`) | "Todos os projetos têm imagem ✓" com zero projetos | Verdade vacuosa exibida como conquista. | Esconder o item quando `projetos.length === 0`. |
| Barra do topo vs canvas vs painel | "Projetos" / "Trabalhos" / "Meus projetos" / "Adicionar trabalho" / "Adicionar projeto" / "cases" | Cinco palavras para uma seção. | Escolher **"Trabalhos"** e usar em todos os seis lugares. |
| Ajuda de "O que você faz" (`fieldSchema.js:70`) | `Ex: "Desenvolvedor e criador de produtos"` | O único exemplo do campo mais importante do perfil ainda é de dev. O campo do selo, ao lado, já foi generalizado ("Chef", "Advogada trabalhista", "Fotógrafo"), o que deixa a inconsistência mais visível. | `Ex: "Psicóloga clínica, atendimento online"` ou uma rotação de três exemplos de profissões diferentes. |
| Ajuda de "Suas redes" (`fieldSchema.js:81`) | "rótulo \| texto ao lado \| https://link" | `safeUrl` aceita `mailto:` e `tel:` (`sanitize.js:20`), e eu confirmei que `mailto:` renderiza certo. Mas a ajuda diz https, então ninguém descobre. As duas redes mais naturais de um profissional de saúde são telefone e e-mail. | "...\| https://, mailto: ou tel:" |
| Botão principal, padrão (`i18n.js:27`) | "Agendar Call" | Jargão de agência. Para consultório, o convite é "Agendar sessão" ou "Marcar uma conversa". E hoje trocar isso é item pago. | Padrão neutro **"Falar comigo"**, e tirar `cta_label` do bump. |
| Painel de experiência, vazio (`experienciasPanel.js:126`) | "Nenhuma passagem cadastrada ainda. Uma já deixa a seção de pé." | Está bom. Registrado como contraste: é assim que a frase do bloco de trabalhos deveria soar. | Manter. |

---

## A dimensão ética (é onde esta persona mais informa o produto)

O Código de Ética Profissional do Psicólogo (Resolução CFP 010/2005) e a Resolução CFP 01/2009
mudam o que "portfólio" pode significar para essa profissão. Três consequências diretas:

1. **Sigilo profissional (arts. 9 a 13).** Não existe "case de sucesso" publicável. Nem
   anonimizado com print, nem "atendi uma executiva de 34 anos com burnout". Qualquer material
   clínico exposto em peça publicitária é infração, e o dano recai sobre um paciente real. **Toda
   a copy do produto que empurra para preencher a grade ("É o coração do portfólio: comece por
   um", repetida em dois lugares, mais o item vermelho do checklist, mais a página de venda que
   promete "os seus projetos") é, para essa profissional, um empurrão em direção a uma infração
   ética.** Um comprador menos atento resolve o item vermelho do jeito mais fácil: inventando um
   caso. Severidade **ALTA**, e é achado de produto, não de código.
2. **CRP obrigatório em peça publicitária (Res. CFP 010/2005, art. 20).** Toda divulgação de
   serviço psicológico precisa trazer nome e número de registro. O produto **não tem campo para
   isso** e não pergunta. Eu só coloquei o CRP na página porque sabia da regra: enfiei em "Números
   da capa" e repeti dentro da bio. Uma psicóloga que confie no formulário publica uma peça
   publicitária irregular sem nunca ser avisada. Severidade **ALTA** (ver T1). O conserto barato
   é um campo opcional "Registro profissional" no passo 1, com ajuda explicando que várias
   profissões regulamentadas o exigem, renderizado junto ao nome.
3. **Vedação a sensacionalismo e a promessa de resultado (mesmo art. 20).** "Números da capa" é um
   campo que convida a métrica. Para dev, "40 projetos entregues" é currículo; para psicólogo,
   "300 pacientes atendidos" flerta com usar paciente como material de propaganda. Severidade
   **MÉDIA**, e o conserto é de texto de ajuda, não de código.

**O que o produto acertou aqui, e merece ficar registrado:** o fluxo do certificado é o melhor
pedaço de UX que encontrei. O consentimento nasce desligado, o texto ao lado diz exatamente o
risco ("Ligando isto, qualquer pessoa com o endereço da página consegue abrir o documento.
Certificado costuma trazer nome completo e CPF. Desligado, o arquivo fica guardado e só você
vê."), o payload nem carrega o caminho sem consentimento, o bucket é privado e a entrega sai por
URL assinada de 120 segundos. O painel "Conta" também está bem resolvido: exportação de dados,
reembolso pelo art. 49 do CDC com prazo na tela, exclusão com janela de arrependimento de 7 dias.
Para um produto que vende para profissionais regulamentados, isso vale muito.

---

## Como reproduzir

```bash
node scripts/_demos/demo-psicologa.mjs                 # tudo
node scripts/_demos/demo-psicologa.mjs listeners       # D1, quatro cliques no mesmo switch
node scripts/_demos/demo-psicologa.mjs ancoras         # D2, onde caiu cada lápis
node scripts/_demos/demo-psicologa.mjs imagem          # D6, 128 px aceito em silêncio
node scripts/_demos/demo-psicologa.mjs estado          # D3 e D4
node scripts/_demos/demo-psicologa.mjs publicar publica
```

Mídia real em `out/midia/demo-psicologa/` (duas fotos do Unsplash, o JPG de 128 px da
randomuser.me e um PDF de certificado gerado por `_gerar-certificado.mjs`). Diários em
`out/psi-diario*.txt`. Screenshots em `out/psi-*.png`:

| Arquivo | O que mostra |
|---|---|
| `psi-01-editor-vazio.png` | o editor recém criado, com os três blocos de estado vazio |
| `psi-09-projetos-vazio.png` | o painel de trabalhos, aberto e fechado sem cadastrar nada |
| `psi-11-certificado.png` | o bloco de certificado com o aviso de CPF |
| `psi-13-canvas-completo.png` | os lápis "Editar" empilhados nos marcadores (D2) |
| `psi-14-publicar-checklist.png` | o item vermelho de projeto ao lado do verde vacuoso |
| **`psi-17-pagina-previa.png`** | **a página publicada, sem nenhum trabalho** |
| `psi-18-pagina-publica.png` | "Este endereço ainda está livre" no endereço já reservado (D3) |
| `psi-22-previa-celular.png` | a mesma página em 375 px, onde o layout não quebra |
| `psi-23-voltando-depois.png` | o editor no dia seguinte, sem sinal de revisão pendente (D4) |
| `psi-25-comprar-slug-ocupado.png` | a página de venda oferecendo o endereço ocupado (D3) |

---

## As três coisas mais graves

1. **D1**, o switch que morre depois do primeiro clique, porque corrompe dado em silêncio e já
   publicou uma afirmação falsa sobre a formação dela. E porque atinge a caixa que decide se um
   documento com CPF fica público.
2. **D2**, o lápis "Editar" ancorado nos marcadores, porque abre a experiência errada e some nas
   três últimas entradas, justamente na seção que é o portfólio inteiro desta profissão.
3. **A copy que empurra uma psicóloga a publicar caso clínico** ("É o coração do portfólio:
   comece por um", em dois lugares, mais o item vermelho permanente do checklist), somada à
   **ausência de campo para o CRP**, que o CFP exige em toda peça publicitária.
