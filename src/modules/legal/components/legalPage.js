// Renderizador dos dois documentos juridicos. FUNCAO PURA, zona [iso]: nao toca o DOM, nao
// toca objeto global do navegador e nao le variavel de ambiente do Vite, porque nada disso
// existe dentro de um Worker.
//
// Ela e pura porque quem serve /termos e /privacidade e o Worker, no apex, montando o HTML
// na borda. Termos que so aparecem depois que o JavaScript roda nao servem: eles precisam
// existir para um leitor sem script, para o robo do buscador e para quem for imprimir a
// pagina como prova do que estava escrito no dia da compra.
//
// NAO existe escape aqui de proposito, e isso e uma afirmacao sobre o dado e nao um
// esquecimento: tudo que entra nesta pagina vem de src/modules/legal/data/, escrito por nos
// e versionado no repositorio. Nenhum caractere dela vem de comprador. No dia em que algum
// campo vier de fora, o escape entra junto com ele.

function renderBloco(bloco) {
  if (bloco.tipo === 'lista') {
    return `<ul class="flex flex-col gap-2 pl-5 list-disc marker:text-white/25">
      ${bloco.itens.map((i) => `<li class="text-sm text-white/60 leading-relaxed">${i}</li>`).join('')}
    </ul>`;
  }
  return `<p class="text-sm text-white/60 leading-relaxed">${bloco.texto}</p>`;
}

function renderSecao(secao) {
  return `
    <section id="${secao.id}" class="flex flex-col gap-3 scroll-mt-24">
      <h2 class="text-base font-semibold text-white">${secao.titulo}</h2>
      ${secao.blocos.map(renderBloco).join('')}
    </section>`;
}

// O indice no topo existe por um motivo pratico: a pergunta que traz alguem a esta pagina e
// quase sempre uma so (como cancelo, o que voces guardam, o que acontece com o meu
// endereco). Rolar dez secoes atras dela e o que faz o leitor desistir e abrir um ticket.
function renderIndice(secoes) {
  return `
    <nav class="flex flex-wrap gap-x-4 gap-y-1 border-y border-white/10 py-4">
      ${secoes
        .map(
          (s) =>
            `<a href="#${s.id}" class="text-xs text-white/40 hover:text-white/80 transition">${s.titulo}</a>`,
        )
        .join('')}
    </nav>`;
}

export function renderLegalPage(doc) {
  return `
    <main class="max-w-2xl mx-auto px-5 py-14 flex flex-col gap-8">
      <header class="flex flex-col gap-3">
        <a href="/" class="text-xs text-white/40 hover:text-white/80 transition">MyPortifolio</a>
        <h1 class="text-2xl font-bold text-white">${doc.titulo}</h1>
        <p class="text-sm text-white/50">${doc.resumo}</p>
        <p class="text-xs text-white/30">Versão ${doc.versao}</p>
      </header>

      ${renderIndice(doc.secoes)}

      <div class="flex flex-col gap-8">
        ${doc.secoes.map(renderSecao).join('')}
      </div>

      <footer class="border-t border-white/10 pt-6 flex flex-col gap-2">
        <p class="text-xs text-white/40">
          <a href="/termos" class="hover:text-white/80 transition">Termos de uso</a>
          <span class="text-white/20"> · </span>
          <a href="/privacidade" class="hover:text-white/80 transition">Privacidade</a>
        </p>
        <p class="text-[10px] text-white/25">
          Desenvolvido por
          <a href="https://methodgrowthhub.com.br" target="_blank" rel="noopener" class="text-white/40 hover:text-white/70 transition">Method Growth Hub</a>
        </p>
      </footer>
    </main>`;
}

// Metadados do <head> de cada documento. O Worker usa isto para montar o head do apex sem
// precisar conhecer o conteudo. noindex NAO entra aqui: termos e privacidade indexados sao
// sinal de produto serio, e sao a pagina que um comprador desconfiado procura antes de pagar.
export function headLegal(doc, caminho) {
  return {
    title: `${doc.titulo} · MyPortifolio`,
    description: doc.resumo,
    canonical: `https://myportifolio.com.br${caminho}`,
  };
}
