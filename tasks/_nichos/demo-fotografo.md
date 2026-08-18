# Caio Bertolini, fotógrafo documental (demo-fotografo)

**URL pública:** https://demo-fotografo.myportifolio.com.br (HTTP 200, revisão 2)
**Data:** 18/08/2026
**Veredito:** sim, um fotógrafo consegue usar isso hoje, porque a foto finalmente preenche o card e ele controla o enquadramento, mas ele vai publicar um site onde a maior imagem da vida dele tem 336 px de largura numa tela de 1440, e onde a mesma foto sai deitada no computador e em pé no celular sem que ele possa ver nem escolher esse segundo corte.

O que existe na conta: perfil completo (bio, selo com ícone de câmera, 3 redes, 4 números da capa, 12 itens de equipamento), 8 ensaios (um deles com galeria de 4 fotos), 3 passagens na trajetória, paleta "prata", fundo "grão de filme", rótulos próprios em todos os campos.

**Zero erro de console, zero pageerror e zero resposta 4xx/5xx do Supabase**, tanto na página pública (1440 e 375) quanto na sessão inteira do editor. Evidências em `out/rev2-foto-*`.

---

## 1. O que está resolvido

Comparado com o que esta persona existia para quebrar, a lista abaixo saiu do papel de verdade.

| # | Item | Situação | Prova |
|---|---|---|---|
| R1 | **A foto preenche o card.** Sumiram a tarja e a imagem flutuando no meio | resolvido | `projectsSection.js:22` (`object-cover`) e `:27` (`h-44 md:h-52`), sem letterbox em nenhum dos 8 cards, `out/rev2-foto-1440-inteiro.png` |
| R2 | **Enquadramento por imagem** (slider) e a escolha "Preencher o card / Caber inteira, com respiro" | resolvido, com ressalva grave (ver D1 e a seção 7) | `fieldSchema.js:193`; o valor chega ao HTML publicado: `object-position: 50% 36%` no hero |
| R3 | **Galeria de até 8 fotos dentro da janela** | resolvido | `projectModal.js:77-89`; o card "Quem fotografa" abre com 4 fotos, `out/rev2-foto-1440-modal.png` |
| R4 | **Títulos próprios.** A página diz ENSAIOS, EQUIPAMENTO E PROCESSO, TRAJETÓRIA, O contexto, O olhar | resolvido na página pública | `rotulo_projects="Ensaios"`, `rotulo_stacks="Equipamento e processo"`, `rotulo_experience="Trajetória"`. Nenhum "MEUS PROJETOS" nem "STACKS DOMINADAS" sai publicado |
| R5 | **Selo "Fotógrafo documental" com ícone de câmera**, sem a palavra vibecoder no texto | resolvido | `badge_label`, `badge_icon=camera` |
| R6 | **Fundo grão de filme** | resolvido | camada `pf-bg pf-bg-grao`, SVG de ruído 140x140 em `opacity: 0.5`, cobrindo 1440x900 |
| R7 | **As redes não têm mais rótulo grudado no valor** | resolvido, mas trocou de defeito (ver D4) | folga medida: Instagram 146 px, Behance 135 px, Flickr 169 px |
| R8 | **Rodapé sem crédito de agência** | resolvido | a string "Method Growth" não existe na página (`false` em 1440 e em 375) |
| R9 | Cabeçalho do modal sem "·" solto | resolvido | "RETRATO · 2025", sem separador órfão, mesmo sem cliente |
| R10 | Painel **Seções**, novo, com ordem e "Esconder" por seção | funciona | `out/rev2-foto-ed-sees.png` |
| R11 | Nenhum estouro horizontal no celular | ok | `scrollWidth 375 = innerWidth 375` |

---

## 2. Bloqueio

### B1. Nada travou (severidade nenhuma)
Não houve bloqueio duro nesta passada. Todos os painéis abriram, o formulário de trabalho abriu, a página pública responde 200 nos dois tamanhos. Registro só um atrito de automação, que não é do produto: com uma gaveta aberta, o clique em outro botão da barra fica interceptado pelo overlay até a gaveta fechar. Um humano fecha no X e não percebe.

---

## 3. Defeito

### D1. O enquadramento só mexe na vertical, e no celular quem some é a horizontal (severidade alta)
**O que fiz:** deixei o slider "Enquadramento da imagem" onde estava e medi o mesmo card ("Chandni Chowk, 6h10", imagem 1200x800) nos dois tamanhos.
**O que esperava:** o mesmo corte, ou pelo menos um corte que o slider consiga corrigir.
**O que aconteceu:**

| tela | caixa do card | proporção da caixa | o que a foto perde |
|---|---|---|---|
| 1440 | 336x208 | 1.615 | 7% da altura |
| 375 | 141x176 | **0.80 (retrato)** | **47% da largura** |

No celular a caixa é mais alta do que larga, então o `cover` escala pela altura e o que transborda é a **largura**. O slider escreve só o eixo Y (`50% 36%`, X cravado em 50%), então **no corte que mais destrói a foto o controle não faz nada**. Comparar `out/rev2-foto-corte-card-1440.png` com `out/rev2-foto-corte-card-375.png`: no desktop se vê o beco inteiro com o carrinho à direita; no celular sobrou uma fatia central e o lado direito da cena foi embora.
**Arquivo:** `src/modules/projects/components/projectsSection.js:27` (`h-44 md:h-52` com largura livre, isto é, proporção do card decidida pelo viewport) e `src/modules/editor/data/fieldSchema.js:193` (`tipo: 'enquadramento'`, ajuda "Sobe ou desce o corte").
**Por que dói nesta persona:** o comprador nunca vê o corte do celular. O editor mostra o canvas em 1440. Ele aprova um corte e publica outro.

### D2. A paleta "Prata" escolhida não vale, porque o editor grava a cor roxa de fábrica por cima (severidade alta)
**O que fiz:** conferi o que está salvo. `theme_preset = prata` e `background_kind = grao` no formulário.
**O que esperava:** accent branco e placa `#0A0A0A`, que é o que `PRESETS.prata` define.
**O que aconteceu:** o payload publicado carrega, literalmente:
`"theme":{"accent":"#7C5CFC","preset":"prata","plateBg":"#0b0b12", ...}`
O accent salvo é exatamente o padrão de fábrica, e `resolverTema` documenta que "cor livre do bump vence o preset". Resultado visível: a borda do topo do modal e o anel do selo saem **roxos** numa página que o dono pediu monocromática (`out/rev2-foto-1440-modal.png`).
**Como isso acontece:** `src/modules/editor/api/portfolioApi.js:98-99` preenche o formulário com `pf.theme_accent ?? '#7C5CFC'` e `pf.theme_plate_bg ?? '#0b0b12'`; `:181-182` salva com `ouNulo(...)`, e `'#7C5CFC'` não é vazio. Um `<input type="color">` nunca fica em branco, então **basta abrir o editor e salvar qualquer coisa uma vez para a cor de fábrica virar escolha explícita e matar todos os 12 presets para sempre**.
**Arquivos:** `src/modules/editor/api/portfolioApi.js:98,99,181,182`, `src/modules/editor/data/fieldSchema.js:133,134`, `src/modules/portfolio/theme/presets.js:47-53`.
**Alcance:** não é só do fotógrafo. Qualquer conta com o bump de personalização que escolher uma paleta cai nisso.

### D3. A janela publica dois títulos com nada embaixo (severidade média)
**O que fiz:** abri o card "Quem fotografa". O trabalho não tem "O que está incluso" nem "Equipamento" preenchidos, o que é o normal de um ensaio.
**O que esperava:** as seções vazias não aparecerem, como já acontece com "O contexto" e "O olhar".
**O que aconteceu:** a janela termina com **"O QUE ESTÁ INCLUSO"** e **"EQUIPAMENTO"** soltos, seguidos de `<ul>` e `<div>` vazios.
**Arquivo:** `src/modules/projects/components/projectModal.js:139-148`. As linhas 137 e 138 usam `block(...)`, que tem guarda de vazio; os dois blocos seguintes escrevem o `<h3>` direto.
**Por que dói:** o fotógrafo escreve pouco de propósito ("as imagens falam, eu escrevo pouco"). Toda janela dele acaba com duas promessas em branco.

### D4. O valor da rede é cortado com reticências enquanto sobra espaço no card (severidade média)
**O que fiz:** medi os pares rótulo/valor no bloco de redes em 1440.
**O que aconteceu:** `@caiobertolini` precisa de 71 px e recebe 63 (sai "@caiobert..."); "Ensaios completos" precisa de 90 e recebe 72 (sai "Ensaios com..."). No mesmo elemento a folga entre rótulo e valor é de 146 px e 135 px.
**Efeito:** o conserto do rótulo grudado (R7) empurrou o problema para o outro lado. O @ do Instagram, que é a coisa que um fotógrafo mais quer que seja lida, é a que fica cortada.
**Arquivo:** bloco de redes em `src/modules/profile/components/profilePanel.js` (par de `<span>` com `justify-between`, sem `min-w-0` no valor e sem ceder a folga).

### D5. "Projetos por página" está em 9 e a grade pagina de 6 em 6 (severidade média)
**O que fiz:** o campo `projects_per_page` está salvo em **9**. Com 8 ensaios, deveria caber tudo numa página.
**O que aconteceu:** a grade mostra 6 e imprime o paginador **"1 / 2"**, nos dois tamanhos.
**Arquivo:** `src/modules/projects/components/projectsInteractions.js:12`, `const PER_PAGE = 6;` fixo. O valor escolhido é lido em `src/modules/editor/state/draftState.js:131` (`perPage`) e **ninguém mais no repositório consome esse campo** (`grep -rn "perPage" src worker` devolve só essa linha).
**Efeito:** dois cliques a mais entre o cliente e metade do portfólio, por causa de um controle que o produto vende e não obedece.

### D6. A faixa de equipamento é lida duas vezes por leitor de tela e por qualquer extração de texto (severidade baixa)
A `stacks-marquee` duplica os 12 itens para o laço infinito, e a cópia não é `aria-hidden`. O texto da página sai com "Leica Q2 ... Fotojornalismo" duas vezes seguidas.
**Arquivo:** o bloco `stacks-track` do render de especialidades.

### D7. O selo é um `<button>` que não faz nada (severidade baixa)
O selo "Fotógrafo documental" é um `<button class="inline-flex vibecoder-btn ...">` sem handler e sem `aria`. Ele entra na ordem de tabulação e não responde ao Enter. O nome da classe ainda é `vibecoder-btn`, resíduo do portfólio de origem: não aparece para o visitante, mas é o que vai no HTML da página de um fotógrafo.

---

## 4. Atrito

### A1. O controle mais importante do fotógrafo está enterrado em "Ajustes finos" (severidade média)
"Como a imagem se encaixa" e "Enquadramento da imagem" ficam no fim do formulário, dentro de um `details` fechado chamado **AJUSTES FINOS**, depois de "Endereço do case". Para quem vende texto isso é um ajuste fino. Para quem vende imagem, é o campo principal, e ele está três rolagens abaixo do campo de subir a foto.
**Arquivo:** `src/modules/editor/data/fieldSchema.js:193`, `passo: 'fino'`.

### A2. A galeria não tem enquadramento, nem ajuste, nem nada (severidade alta, detalhada na seção 7)
As 4 fotos da galeria entram em caixas `aspect-[3/2]` com `object-cover` e sem `object-position`. Não existe campo de enquadramento por foto da galeria (os únicos controles de imagem do formulário são `image_fit` e `ed-image_position`, os dois da capa).

### A3. Uma foto sobe de cada vez, sem arrastar em lote (severidade média)
A galeria abre slot por slot ("Foto 2", "Foto 3", "Foto 4", "Foto 5", cada um com o seu "Escolher ou arrastar uma imagem"). Montar um ensaio de 8 fotos são 8 diálogos de arquivo. Quem sobe foto sobe pasta.

### A4. O painel Conta não é gaveta, é outra página (severidade baixa)
Clicar em "Conta" troca a tela inteira e o caminho de volta é um link pequeno "‹ Voltar para o editor" no canto superior esquerdo. Os outros quatro botões da mesma barra abrem gaveta por cima do canvas. Dois comportamentos na mesma barra.

---

## 5. Buraco de template

### T1. Não existe lightbox, nem zoom, nem foto em tamanho de tela (severidade alta)
Medido: a maior renderização de uma fotografia neste site, numa tela de 1440, é **336x208 px** no card e **295x196 px** na galeria. As fotos da galeria não estão dentro de `<a>`, `<button>` nem `[role=button]` (`clickable: false` nas 4), e clicar numa delas não muda nada no DOM (15 `<img>` antes, 15 depois). Um portfólio de fotógrafo em que a foto nunca passa de 300 px não é um portfólio de fotógrafo.

### T2. Não existe crédito, legenda, ano nem equipamento por foto (severidade alta)
Os campos de ano, categoria e equipamento são do **trabalho**, não da **foto**. Um ensaio de 8 imagens feito em três anos, com três lentes, é publicado com um ano só e sem uma linha por imagem. Nada no formulário de galeria aceita texto: os slots são só de arquivo.

### T3. O seletor de ano cobre 8 anos e para em 2019 (severidade média)
`ANOS` é `Array.from({length: 8}, (_, i) => ano - i)`, em `src/modules/editor/config/editor.config.js:21-24`. Hoje isso é 2026 a 2019. O Caio fotografa há doze anos e tem TCC de 2013 na trajetória. Um arquivo de rua de 2014 não tem como ser datado, e a experiência aceita "2011 a 2013" enquanto o trabalho não aceita.

### T4. Não há como escolher o formato da grade (severidade média)
Não existe opção de grade de 1 ou 2 colunas, nem de imagem em pé, nem de proporção do card. A única alavanca de layout ("Projetos por página") está quebrada (D5). Fotógrafo trabalha com séries verticais, e o produto só oferece a caixa deitada que o viewport decidir.

### T5. Não existe marca d'água nem qualquer defesa da imagem (severidade baixa)
Botão direito, arrastar e salvar funcionam normalmente, e as URLs do Storage são públicas e diretas. Não é bug, é decisão ausente. É a primeira pergunta de todo fotógrafo que publica ensaio na internet.

---

## 6. Palavra errada

Os rótulos da **página** já são configuráveis e estão certos. O problema é que os rótulos do **editor** não seguem, e o comprador passa o dia inteiro dentro do editor.

> Nota de leitura: tudo nesta seção foi observado no editor **em produção**. Enquanto eu media, apareceu no diretório de trabalho uma alteração não commitada em `src/modules/editor/data/fieldSchema.js`, de outra frente, que ataca exatamente isto (faz o formulário do trabalho ler os rótulos da profissão). Ela não é minha e ainda não está no ar. Vale conferir se ela cobre a lista abaixo antes de abrir tarefa nova.

| Onde | O que está escrito | O que o fotógrafo diria | Arquivo |
|---|---|---|---|
| Painel de lista | "Meus projetos" e "Adicionar projeto" | Ensaios (é o que ele digitou em `rotulo_projects`) | `src/modules/editor/panels/projetosPanel.js:106,139` |
| Painel Seções | "Trabalhos" / "A grade com as suas entregas" | mesma seção, terceiro nome diferente | `src/modules/editor/panels/secoesPanel.js:21` |
| Formulário do trabalho | "Imagem do case", "Endereço do case" | foto de capa, endereço do ensaio | `fieldSchema.js` |
| Ajuda da categoria | "Ex: Landing page, Automação, App." | ele acabou de digitar Retrato, Fotografia de rua, Ensaio documental | `fieldSchema.js` |
| Campo de itens | "O que o sistema faz?" | é o campo que a página publica como "O que está incluso" | `fieldSchema.js` |
| Campos do case | "O que estava travando antes?" / "O que você entregou?" | a página já mostra "O contexto" e "O olhar", o editor não | `fieldSchema.js` |
| Campo de provas | "Stack usada" e "Link do projeto no ar" | equipamento, e o ensaio não tem link no ar | `fieldSchema.js` |
| Tela de senha | "Opcional. Com senha **voce** entra sem esperar o **codigo** chegar por e-mail." | dois acentos faltando na copy do produto | `src/modules/access/components/setPasswordGate.js:20` |
| Classe do selo | `vibecoder-btn` | resíduo do portfólio de origem no HTML publicado | render do selo |

Severidade do conjunto: média. Nada quebra, mas a pessoa que pagou fica traduzindo a profissão dela para a linguagem de outra a cada campo.

---

## 7. Imagem: proporção, corte e galeria

Esta persona existe por isto, então vai medido e com número.

### 7.1 O que cada caixa devolve

Todas as fotos deste portfólio foram publicadas em 3:2 pelo pipeline. Mesmo assim:

| elemento | tela | imagem original | caixa | proporção da caixa | perde |
|---|---|---|---|---|---|
| Hero (retrato do Caio) | 1440 | 758x947 (4:5) | 526x461 | 1.14 | **30% da altura** |
| Hero | 375 | 758x947 | 341x378 | 0.90 | 11% da altura |
| Card da grade | 1440 | 1200x800 | 336x208 | 1.61 | 7% da altura |
| Card da grade | 375 | 1200x800 | 141x176 | **0.80** | **47% da largura** |
| Foto da galeria | 1440 | 1200x800 | 295x196 | 1.50 | 0% |
| Foto da galeria | 375 | 1200x800 | 283x188 | 1.50 | 0% |
| Miniatura do modal | 1440 | 1000x667 | 62x62 | 1.00 | 33% da largura |

**O corte 3:2 fixo acabou, e o que veio no lugar é pior de prever.** O card não tem mais proporção declarada: tem altura fixa (`h-44` no celular, `h-52` no desktop) e largura decidida pela grade. Isso significa que a proporção do card muda com o tamanho da tela, e que a mesma foto é recortada de duas maneiras diferentes, uma delas em retrato, sem que o dono veja a segunda em nenhum lugar do editor.

Comparação direta, mesma foto, mesmos segundos:
`out/rev2-foto-corte-card-1440.png` (o beco inteiro) x `out/rev2-foto-corte-card-375.png` (uma fatia central, 47% da cena descartada).

### 7.2 O enquadramento resolve metade

O slider funciona e chega ao HTML publicado (`object-position: 50% 36%` no hero, e `safePosition(p.imagePosition)` no card). Mas ele escreve **só o eixo vertical**. No único lugar onde a perda é horizontal (a grade no celular, 47%), o controle é inerte. Um "enquadramento" de fotografia que só sobe e desce é meio enquadramento.

E ele não existe para as fotos da galeria: os quatro slots aceitam arquivo e nada mais.

### 7.3 A galeria: existe, e é pequena demais para o que ela promete

O que ficou bom: até 8 fotos por trabalho, entram na janela do card, duas colunas no desktop e uma no celular, todas `loading="lazy"` (correto, o modal só entra no DOM no clique), com placa de fundo e borda coerentes com o resto.

O que falta, em ordem de gravidade:

1. **Sem lightbox.** A foto não é clicável (`clickable: false` nas 4) e o clique não faz nada. Teto absoluto de 295x196 px por foto num monitor de 1440.
2. **Caixa 3:2 travada, sem escapatória.** `projectModal.js:83` escreve `aspect-[3/2]` com `object-cover` e sem `object-position`. Um retrato 2:3 nessa caixa perde **56% da altura**, cortado exatamente no meio, e não existe nem o "caber inteira" que a capa tem. Aqui o 3:2 fixo que a persona veio denunciar continua inteiro, só mudou de lugar: saiu do card e foi para a galeria.
3. **Sem legenda, sem ano, sem crédito, sem equipamento por foto.**
4. **Sem ordem visível e sem arrastar.** A ordem é a dos slots, e trocar duas fotos de lugar é subir as duas de novo.
5. **A miniatura do cabeçalho do modal** joga uma foto 3:2 num quadrado de 62 px e come 33% dela, do lado, num lugar onde ela é decoração.

### 7.4 O que fica de saldo

Antes, a foto flutuava no meio de uma tarja. Isso acabou, e é a maior conquista desta rodada: a página finalmente parece de fotografia (`out/rev2-foto-1440-inteiro.png`). O que sobrou é o degrau seguinte, e ele é o degrau que importa para vender ensaio: **a foto nunca fica grande, e o corte do celular não é escolhido por ninguém.**

---

## 8. Evidências

| arquivo | o que mostra |
|---|---|
| `out/rev2-foto-1440-topo.png`, `out/rev2-foto-1440-inteiro.png` | página pública em 1440 |
| `out/rev2-foto-375-inteiro.png` | página pública em 375 |
| `out/rev2-foto-1440-modal.png`, `out/rev2-foto-375-modal-inteiro.png` | a janela com a galeria de 4 fotos |
| `out/rev2-foto-corte-card-1440.png` x `out/rev2-foto-corte-card-375.png` | o mesmo card, dois cortes diferentes (D1) |
| `out/rev2-foto-corte-hero-1440.png`, `out/rev2-foto-corte-hero-375.png` | o hero recortado nos dois tamanhos |
| `out/rev2-foto-publico.txt` | medidas de todas as imagens, redes, rodapé e HTML do modal |
| `out/rev2-foto-editor-run.txt` | Perfil, Projetos, Experiência, Seções e Conta, com todos os campos e valores |
| `out/rev2-foto-proj-run.txt`, `out/rev2-foto-ed-trabalho.png` | o formulário de um trabalho, com galeria, `image_fit` e `ed-image_position` |
| `out/rev2-foto-ed-perfil.png`, `-projetos.png`, `-experincia.png`, `-sees.png`, `-conta.png` | os painéis do editor |

Scripts desta revisão (só leem, não salvam nada): `scripts/_demos/demo-fotografo-rev2.mjs`, `scripts/_demos/demo-fotografo-rev2-editor.mjs`, `scripts/_demos/demo-fotografo-rev2-projeto.mjs`.
