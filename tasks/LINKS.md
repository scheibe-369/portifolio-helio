# Todos os links

Conferido em 16/08/2026: as dez páginas respondem **HTTP 200**. Todas saem com `noindex` na
meta tag e no header, e estão marcadas como cortesia para não entrarem na conciliação de vendas.

## As dez páginas de nicho

| # | Persona | Profissão | Link |
|---|---|---|---|
| 1 | Marina Salgueiro | Chef de cozinha | https://demo-chef.myportifolio.com.br |
| 2 | Renata Vasconcelos | Advogada trabalhista | https://demo-advogada.myportifolio.com.br |
| 3 | Caio Bertolini | Fotógrafo documental | https://demo-fotografo.myportifolio.com.br |
| 4 | Diego Aranha | Personal trainer | https://demo-personal.myportifolio.com.br |
| 5 | Helena Kuroda | Arquiteta | https://demo-arquiteta.myportifolio.com.br |
| 6 | Bianca Fontes | Psicóloga clínica | https://demo-psicologa.myportifolio.com.br |
| 7 | Vitória Alencar | Produtora musical | https://demo-musica.myportifolio.com.br |
| 8 | Sônia Prazeres | Confeiteira | https://demo-confeitaria.myportifolio.com.br |
| 9 | Adriano Peçanha | Professor de concursos | https://demo-professor.myportifolio.com.br |
| 10 | Rafa Ximenes | Tatuador | https://demo-tattoo.myportifolio.com.br |

## O que cada uma existe para quebrar

Se for olhar poucas, olhe nesta ordem: são as que mais revelam.

| Ordem | Página | O que procurar nela |
|---|---|---|
| 1º | **Confeiteira** | A pessoa menos técnica das dez. A página dela diz "MEUS PROJETOS", "6 cases" e "STACKS DOMINADAS" para quem vende bolo. E a foto do iPhone dela nem sobe |
| 2º | **Psicóloga** | Portfólio legítimo com **zero trabalhos**, por sigilo profissional. A página fica de pé, mas o produto insiste que ela cadastre "cases" |
| 3º | **Música** | O trabalho é áudio, e não toca nada: Spotify, SoundCloud e Bandcamp são recusados com "não reconheci este link do YouTube" |
| 4º | **Fotógrafo** | Proporções variadas num corte 3:2 fixo. Veja o que sobrou das fotos |
| 5º | **Arquiteta** | A única que precisa de estética clara. O produto é preto absoluto |
| 6º | **Personal** | Vídeo vertical (Shorts). Abra um card com vídeo |
| 7º | **Tatuador** | Galeria vertical pura, e 19 campos de formulário para uma tatuagem que usa 4 |
| 8º | **Advogada** | Trabalho sem imagem nenhuma: caso jurídico não tem print |
| 9º | **Professor** | Certificado é o centro da credibilidade dele |
| 10º | **Chef** | Prato não tem "link no ar" |

## Relatórios dos agentes

Cinco terminaram. Os outros cinco construíram a página inteira mas foram cortados pela cota da
API antes de escrever o documento.

| Relatório | Arquivo |
|---|---|
| Chef | `tasks/_nichos/demo-chef.md` |
| Confeiteira | `tasks/_nichos/demo-confeitaria.md` |
| Personal | `tasks/_nichos/demo-personal.md` |
| Psicóloga | `tasks/_nichos/demo-psicologa.md` |
| Produtora musical | `tasks/_nichos/demo-musica.md` |
| Advogada, Arquiteta, Fotógrafo, Professor, Tatuador | não escrito (página no ar mesmo assim) |

Consolidado com todos os achados cruzados: `tasks/demos-nichos.md`.

## O produto

| O que | Link |
|---|---|
| Portfólio do Helio (a vitrine) | https://myportifolio.com.br |
| Página de venda | https://myportifolio.com.br/comprar |
| Editor | https://myportifolio.com.br/app |
| Fila de primeira publicação | https://myportifolio.com.br/app/admin/fila |
| Conceder e revogar acesso | https://myportifolio.com.br/app/admin/acessos |

## Como entrar em qualquer uma das demos

O login é por código de 8 dígitos no e-mail, e as contas de demo usam alias do seu Gmail. Para
abrir o editor de uma delas já logado, sem passar por caixa de entrada:

```
node scripts/abrir-editor-demo.mjs --slug demo-confeitaria
```

Isso abre um Chrome real, com a sessão daquela persona, no editor. Ctrl+C fecha.

## Quando terminar de olhar

```
node scripts/limpar-demos.mjs            # mostra o que apagaria
node scripts/limpar-demos.mjs --aplicar  # apaga as dez
```

As dez moram em produção porque não existe ambiente de teste com subdomínio curinga. Enquanto
estiverem lá, ocupam dez slugs e aparecem em qualquer contagem de portfólios.
