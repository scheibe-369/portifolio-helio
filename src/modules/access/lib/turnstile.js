// Widget do Cloudflare Turnstile, em modo EXPLICITO.
//
// POR QUE EXPLICITO E NAO O data-sitekey automatico: cada pedido de codigo consome DOIS
// tokens, um para a Edge Function (request-access-code) e outro para o /auth/v1/otp do
// Supabase, que e quem realmente manda o e-mail. Token de Turnstile e de uso unico: se os
// dois lados receberem o mesmo, o segundo siteverify falha e o comprador nunca recebe o
// codigo. Com render explicito da para resetar e executar de novo, e emitir um token novo
// por chamada, que e uma linha e nao um problema de desenho.
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
export function obterTokenTurnstile(id) {
  return new Promise((ok, erro) => {
    pendentes.set(id, { ok, erro });
    try {
      window.turnstile.reset(id);
      window.turnstile.execute(id);
    } catch (e) {
      pendentes.delete(id);
      erro(e);
    }
  });
}

export function removerTurnstile(id) {
  pendentes.delete(id);
  try {
    window.turnstile.remove(id);
  } catch {
    // widget ja removido junto com o DOM: nao e motivo para quebrar a troca de tela
  }
}
