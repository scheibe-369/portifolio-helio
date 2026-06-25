# Portfolio — Helio Monteiro

Portfolio pessoal do Helio Monteiro: automacao com IA, desenvolvimento full-stack e sistemas.
Site estatico em Vite + Tailwind CSS, bilingue (PT/EN).

Online: https://helioportifolio.methodgrowthhub.com.br

## Stack

- Vite + Tailwind CSS v4
- JavaScript (vanilla, sem framework)
- Lucide (icones)
- Deploy: Cloudflare Pages

## Estrutura

Arquitetura modular (Feature-Sliced):

- `src/app/` — composicao da pagina e i18n
- `src/modules/profile/` — perfil
- `src/modules/projects/` — projetos (filtro, paginacao e modal)
- `src/modules/stacks/` — carrossel de stacks
- `src/styles/global.css` — estilos globais

## Como rodar

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # gera dist/
npm run preview  # serve o build
```

## Internacionalizacao (PT/EN)

O site e bilingue. O idioma e trocado in-place (sem reload) pelo seletor na stat "Idiomas".
Strings de UI em `src/app/i18n.js`; traducoes dos projetos em `src/modules/projects/data/projects.en.js`.

## Deploy

Cloudflare Pages (projeto `helioportifolio`):

```bash
npm run build
npx wrangler pages deploy dist --project-name=helioportifolio
```
