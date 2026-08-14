// Widget do Cloudflare Turnstile, em modo EXPLICITO.
//
// POR QUE EXPLICITO E NAO O data-sitekey automatico: token de Turnstile e de USO UNICO, e o
// mesmo visitante pode pedir codigo mais de uma vez (errou o e-mail, clicou em reenviar).
// Com render explicito da para emitir um token novo a cada pedido, sem recarregar a pagina.
//
// (Ate a mudanca do login, cada pedido gastava DOIS tokens, um para a Edge Function e outro
// para o /auth/v1/otp do Supabase. Hoje o /auth/v1/otp saiu do caminho e sobrou um so. O
// comentario antigo dizia dois, e foi lido como justificativa para o reset que quebrava o
// widget, entao ele fica registrado aqui em vez de sumir.)
//
// A sitekey e publica de proposito (ela vai no HTML). O segredo mora so no servidor.
const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY;
const URL_API = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

let promessaScript = null;

function carregarScript() {
  if (promessaScript) return promessaScript;
  promessaScript = new Promise((ok, erro) => {
    if (window.turnstile) return ok();
    const s = document.createElement('script');
    s.src = URL_API;
    s.async = true;
    s.onload = () => ok();
    s.onerror = () => erro(new Error('turnstile-indisponivel'));
    document.head.appendChild(s);
  });
  return promessaScript;
}

// Cada montagem guarda o resolvedor da execucao corrente. O callback do Turnstile e global
// por widget, entao sem esta gaveta o token de uma execucao chegaria na promessa de outra.
const pendentes = new Map();

export async function montarTurnstile(elemento) {
  if (!SITE_KEY) throw new Error('turnstile-sem-sitekey');
  await carregarScript();

  const id = window.turnstile.render(elemento, {
    sitekey: SITE_KEY,
    // appearance interaction-only deixa o widget invisivel ate a Cloudflare decidir que
    // aquele visitante precisa de desafio. Quem e comprador de verdade nunca ve nada.
    appearance: 'interaction-only',
    execution: 'execute',
    callback: (token) => {
      const p = pendentes.get(id);
      if (p) {
        pendentes.delete(id);
        p.ok(token);
      }
    },
    'error-callback': () => {
      const p = pendentes.get(id);
      if (p) {
        pendentes.delete(id);
        p.erro(new Error('turnstile-falhou'));
      }
    },
    'expired-callback': () => {
      const p = pendentes.get(id);
      if (p) {
        pendentes.delete(id);
        p.erro(new Error('turnstile-expirou'));
      }
    },
  });
  return id;
}

// Emite UM token novo. Chamar duas vezes seguidas devolve dois tokens diferentes, que e
// exatamente o que o fluxo de pedir codigo precisa.
// Widgets que ja emitiram um token pelo menos uma vez. So eles precisam de reset.
const jaExecutou = new Set();

// Emite UM token novo.
//
// O `reset` SO ENTRA A PARTIR DA SEGUNDA VEZ, e essa condicao e o conserto de um defeito que
// travava o login inteiro: resetar um widget `execution: 'execute'` que ainda nao executou
// derruba ele com "Turnstile Widget seem to have crashed" e o erro 300031. Sem token, o
// pedido de codigo nao sai, e o visitante fica olhando uma tela que nao responde.
//
// O TIMEOUT existe pelo mesmo motivo: quando o widget morre daquele jeito, ele nao chama nem
// `callback` nem `error-callback`, entao a promessa ficaria pendurada para sempre e o botao
// nunca voltaria. Falhar em 20 s com mensagem e melhor do que nao falhar nunca.
export function obterTokenTurnstile(id) {
  return new Promise((ok, erro) => {
    const relogio = setTimeout(() => {
      pendentes.delete(id);
      erro(new Error('turnstile-sem-resposta'));
    }, 20000);
    const fim = (fn) => (v) => { clearTimeout(relogio); fn(v); };
    pendentes.set(id, { ok: fim(ok), erro: fim(erro) });
    try {
      if (jaExecutou.has(id)) window.turnstile.reset(id);
      jaExecutou.add(id);
      window.turnstile.execute(id);
    } catch (e) {
      clearTimeout(relogio);
      pendentes.delete(id);
      erro(e);
    }
  });
}

export function removerTurnstile(id) {
  pendentes.delete(id);
  jaExecutou.delete(id);
  try {
    window.turnstile.remove(id);
  } catch {
    // widget ja removido junto com o DOM: nao e motivo para quebrar a troca de tela
  }
}
