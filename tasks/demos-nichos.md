# Dez portfólios de nicho: os links para você analisar

Dez personas de profissões diferentes, cada uma construída por um agente dedicado, com foto e
vídeo reais buscados por ele, preenchidas **pelo editor de verdade** (nada por SQL) e
publicadas em produção. Cada persona foi escolhida para estressar uma hipótese que o template,
nascido do portfólio de um programador, nunca testou.

**Todas as dez estão no ar e respondem 200.** Os relatórios individuais foram escritos antes de
eu liberar a fila de primeira publicação, então vários dizem "responde 404": isso está
desatualizado, era a fila de conferência humana, e já foi aprovada para os slugs `demo-`.

As dez páginas saem com `noindex` na meta tag e no header `X-Robots-Tag`, e estão marcadas como
cortesia para não entrarem na conciliação de vendas. `node scripts/limpar-demos.mjs` apaga tudo
quando você terminar de olhar.

## Os links

| # | Nicho | Persona | Endereço | O que essa página existe para quebrar |
|---|---|---|---|---|
| 1 | Chef de cozinha | Marina Salgueiro | https://demo-chef.myportifolio.com.br | Trabalho sem "link no ar"; prato não tem URL |
| 2 | Advogada | Renata Vasconcelos | https://demo-advogada.myportifolio.com.br | Trabalho **sem imagem nenhuma**: caso jurídico não tem print |
| 3 | Fotógrafo | Caio Bertolini | https://demo-fotografo.myportifolio.com.br | Só imagem, proporções variadas, corte 3:2 fixo |
| 4 | Personal trainer | Diego Aranha | https://demo-personal.myportifolio.com.br | **Vídeo vertical (Shorts)** |
| 5 | Arquiteta | Helena Kuroda | https://demo-arquiteta.myportifolio.com.br | Precisa de estética **clara**; o produto é preto absoluto |
| 6 | Psicóloga | Bianca Fontes | https://demo-psicologa.myportifolio.com.br | **Zero trabalhos**, por sigilo profissional |
| 7 | Produtora musical | Vitória Alencar | https://demo-musica.myportifolio.com.br | O trabalho é **áudio**; só existe YouTube |
| 8 | Confeiteira | Sônia Prazeres | https://demo-confeitaria.myportifolio.com.br | WhatsApp e preço, não "Agendar Call". A menos técnica das dez |
| 9 | Professor de concursos | Adriano Peçanha | https://demo-professor.myportifolio.com.br | Muitas experiências, poucos trabalhos, certificado no centro |
| 10 | Tatuador | Rafa Ximenes | https://demo-tattoo.myportifolio.com.br | Galeria vertical pura; Instagram é O canal |

## Relatórios

Cinco agentes terminaram o relatório completo. Os outros cinco construíram o portfólio inteiro
(o conteúdo está lá, e as páginas estão no ar) mas foram cortados no meio pela cota da API antes
de escrever o documento.

| Nicho | Relatório | Veredito do agente |
|---|---|---|
| Chef | `tasks/_nichos/demo-chef.md` | Monta a página inteira, mas publica um portfólio que fala a língua de outra profissão, com a foto do rosto espremida numa tira de 25px, e no fim não tem link para mandar ao cliente |
| Confeiteira | `tasks/_nichos/demo-confeitaria.md` | **Não.** A foto do iPhone dela é recusada, o botão que ela mais precisa vem escrito "Agendar Call" e trocar custa dinheiro, e a página diz "MEUS PROJETOS / 6 cases / STACKS DOMINADAS" |
| Personal | `tasks/_nichos/demo-personal.md` | Mostra um Short na proporção certa exatamente uma vez, e desfaz isso sozinho no segundo salvar |
| Psicóloga | `tasks/_nichos/demo-psicologa.md` | A página sem trabalhos **fica de pé e digna**. Mas a copy empurra a violar sigilo e não há campo para o CRP |
| Música | `tasks/_nichos/demo-musica.md` | Monta um portfólio bonito para uma produtora musical e não deixa ele tocar uma nota |
| Advogada, Arquiteta, Fotógrafo, Professor, Tatuador | não escrito | Portfólio construído e no ar; agente cortado pela cota antes do relatório |

## O que os agentes acharam, cruzando as personas

Ordenado por gravidade. O que aparece em várias personas ao mesmo tempo está marcado.

### Já corrigido nesta sessão

| Achado | Onde | Estado |
|---|---|---|
| Campo de vídeo rejeitava **todo** link válido e estourava com link inválido: ninguém salvava projeto com vídeo | `youtube.js` | corrigido, 27 casos em teste |
| Selo "VibeCoder" na página de toda profissão, sem escapatória nem pagando o bump | `profilePanel.js` + migration 0014 | virou campo da base, 20 ícones |
| Clicar num card não abria nada em nenhum portfólio de comprador | `main.js` | corrigido |
| **Listeners empilhados a cada repintura**: switch parava de desligar, um clique em "remover" apagava dez chips (3 personas) | `editorDrawer.js` | corrigido |
| Lápis "Editar" da experiência abria a entrada errada (3 personas) | `editorShell.js` | corrigido |
| Foto do rosto virava tira de 25px quando o nome quebrava em duas linhas (2 personas) | `profilePanel.js` | corrigido |
| Rótulo do botão cortado no meio da palavra: "CHAMAR NO WHATSA" (2 personas) | `global.css` | agora trunca com reticências |
| Ícone do selo não desenhava dentro do editor | `editorApp.js` | corrigido |
| `<img src="">`, seção "0 cases" com filtro morto, carrossel girando vazio | vários | guardas de vazio |
| Shorts em moldura deitada | `projectModal.js` | proporção vem do dado |

### Aberto, e o que eu faria primeiro

| Achado | Severidade | Personas que bateram |
|---|---|---|
| **Foto de iPhone (HEIC) é recusada**, e o `accept` do input deixa as fotos apagadas na galeria do celular | alta | confeiteira |
| **O endereço, durante a revisão, se anuncia como livre** com botão "Quero este endereço" apontando para o checkout | alta | chef, confeiteira, psicóloga |
| Depois de publicar, nada na tela lembra que existe revisão pendente: a barra volta a dizer "RASCUNHO" | alta | chef, psicóloga |
| **Um campo opcional inválido trava o salvar do trabalho inteiro** | alta | música |
| Não existe áudio: Spotify, SoundCloud, Bandcamp, Apple Music e Deezer são todos recusados com "não reconheci este link do YouTube" | alta | música |
| Vocabulário de programador na página publicada: "MEUS PROJETOS", "cases", "STACKS DOMINADAS", "O Desafio", "A Solução", "Recursos", "Stack", "passagens" | alta | **todas** |
| O mesmo campo tem **três nomes diferentes** ("Stacks que você domina" / "O que você usa no trabalho" / "STACKS DOMINADAS") | alta | chef, música |
| Trocar o rótulo do botão principal é recurso pago, e é o botão que mais importa para quem vende por WhatsApp | alta | confeiteira |
| Corte 3:2 fixo sem controle de enquadramento: capa de álbum, bolo quadrado e tatuagem vertical perdem um terço | alta | fotógrafo, música, confeiteira, tatuador |
| Avatar mira 25 KB e recusa foto real de 800x800 | média | música |
| Sem campo para preço, prazo ou porções | média | confeiteira |
| Sem campo para CRP/OAB, exigido por conselho profissional em peça publicitária | média | psicóloga, advogada |
| Formulário de trabalho tem 19 campos, e uma tatuagem usa 4 | média | tatuador |
| Textos do editor sem acento ("ate", "voce", "nao", "codigo", "comecar", "invalido") | média | confeiteira |
| Digitar custa uma repintura completa do canvas por tecla | média | chef, confeiteira |
| Alvos de toque de 34px no celular | média | confeiteira |

## Como olhar

Sugestão de ordem, se quiser ir do mais revelador para o menos:

1. **Confeiteira** e **psicóloga**: os dois extremos do público que o produto promete atender.
2. **Música** e **fotógrafo**: onde o formato do trabalho não cabe no template.
3. **Arquiteta**: a única que pede tema claro, para você decidir se isso entra.
4. O resto.

Em todas, repare no que está escrito **em cima da seção de especialidades**, e no rodapé do card
de perfil. É onde o produto ainda fala de programação para quem não programa.
