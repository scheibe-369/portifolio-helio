import '../styles/global.css';

// Boot do editor. Zona [browser]. Esta e a UNICA entrada do bundle que pode importar o
// @supabase/supabase-js: o bundle publico (src/main.js) nao pode, e o
// scripts/import-graph.mjs reprova se alguem tentar. O motivo nao e tamanho, e superficie:
// a pagina publica de um comprador nao tem nenhum motivo para carregar cliente de banco.
//
// Nesta fase ele e so o esqueleto que prova que a segunda entrada do Vite existe e que o
// preparar-shell.mjs consegue extrair os dois shells. O editor de verdade entra nos itens
// seguintes da fase 1.
const app = document.querySelector('#app');

app.innerHTML = `
  <main class="max-w-md mx-auto px-4 py-16 flex flex-col gap-4">
    <h1 class="text-xl font-bold text-white">Editor</h1>
    <p class="text-sm text-white/60">
      Esqueleto da segunda entrada do build. A tela de acesso e o editor entram nos
      proximos itens da fase 1.
    </p>
  </main>`;

requestAnimationFrame(() => app.classList.add('ready'));
