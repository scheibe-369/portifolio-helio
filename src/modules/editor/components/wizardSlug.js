import { esc } from '../../portfolio/lib/sanitize.js';
import { APEX_HOST } from '../config/editor.config.js';
import { slugify } from '../lib/slugify.js';
import { slugDisponivel, criarPortfolio } from '../api/portfolioApi.js';

// O primeiro minuto depois da compra: escolher o endereco e dizer o nome. Zona [browser].
//
// Sao TRES campos e nao um wizard de sete telas, porque o portfolio ja e util com eles e tudo
// o mais tem lugar proprio no editor. O endereco vem antes do resto por um motivo de banco: o
// webhook NAO cria linha em portfolios (achado 9), entao a linha nasce aqui, e slug e
// display_name sao not null.
//
// A checagem de disponibilidade e uma RPC (slug_available) e nao um select: ela olha tambem os
// reservados e o historico de slug liberado, que o cliente nao pode ler. Ela e so authenticated
// de proposito, senao vira scanner publico de enderecos.

export function renderWizardSlug(sugestaoNome = '') {
  return `
    <main class="ed-wizard">
      <header>
        <h1>Vamos colocar você no ar</h1>
        <p>Duas informações e o seu portfólio existe. O resto dá para mudar depois.</p>
      </header>

      <div class="ed-field">
        <label class="ed-label" for="wz-nome">Seu nome<span class="ed-req">*</span></label>
        <input id="wz-nome" class="ed-input" type="text" maxlength="80" value="${esc(sugestaoNome)}" autocomplete="name">
      </div>

      <div class="ed-field">
        <label class="ed-label" for="wz-slug">Seu endereço<span class="ed-req">*</span></label>
        <div class="ed-endereco-campo">
          <input id="wz-slug" class="ed-input" type="text" maxlength="63" placeholder="seunome" autocomplete="off" spellcheck="false">
          <span class="ed-endereco-apex">.${esc(APEX_HOST)}</span>
        </div>
        <p class="ed-help">Só letras minúsculas, números e hífen. Dá para trocar depois, mas só duas vezes a cada 90 dias: cada troca quebra os links que você já espalhou.</p>
        <p class="ed-erro" id="wz-slug-msg"></p>
      </div>

      <div class="ed-field">
        <label class="ed-label" for="wz-role">O que você faz</label>
        <input id="wz-role" class="ed-input" type="text" maxlength="160" placeholder="Desenvolvedor e criador de produtos">
      </div>

      <button type="button" id="wz-criar" class="ed-btn e-primario ed-largo">Criar meu portfólio</button>
      <p id="wz-msg" class="ed-msg"></p>
    </main>`;
}

export function initWizardSlug({ aoCriar }) {
  const nome = document.getElementById('wz-nome');
  const slug = document.getElementById('wz-slug');
  const role = document.getElementById('wz-role');
  const msgSlug = document.getElementById('wz-slug-msg');
  const msg = document.getElementById('wz-msg');
  const botao = document.getElementById('wz-criar');

  let tocouSlug = false;
  let timer = null;

  const conferir = async () => {
    const v = slugify(slug.value);
    if (!v) {
      msgSlug.textContent = slug.value ? 'endereço curto ou com caracteres não aceitos' : '';
      msgSlug.className = 'ed-erro';
      return;
    }
    try {
      const livre = await slugDisponivel(v);
      msgSlug.textContent = livre ? `${v}.${APEX_HOST} está livre` : 'esse endereço já está em uso';
      msgSlug.className = livre ? 'ed-erro e-ok' : 'ed-erro';
    } catch {
      msgSlug.textContent = '';
    }
  };

  slug.addEventListener('input', () => {
    tocouSlug = true;
    clearTimeout(timer);
    timer = setTimeout(conferir, 350);
  });

  // Enquanto ninguem tocou no endereco, ele acompanha o nome. E o comportamento que faz a
  // pessoa nao precisar pensar duas vezes na mesma coisa.
  nome.addEventListener('input', () => {
    if (tocouSlug) return;
    slug.value = slugify(nome.value);
    clearTimeout(timer);
    timer = setTimeout(conferir, 350);
  });

  botao.addEventListener('click', async () => {
    const v = slugify(slug.value);
    if (!nome.value.trim() || !v) {
      msg.textContent = 'Preencha o nome e o endereço.';
      msg.className = 'ed-msg e-erro';
      return;
    }
    botao.disabled = true;
    msg.textContent = 'criando...';
    msg.className = 'ed-msg e-neutro';
    try {
      await criarPortfolio({ slug: v, displayName: nome.value.trim(), role: role.value.trim() });
      await aoCriar();
    } catch (erro) {
      botao.disabled = false;
      msg.textContent = erro.message || 'não consegui criar agora';
      msg.className = 'ed-msg e-erro';
    }
  });
}
