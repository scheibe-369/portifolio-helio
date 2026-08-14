import { aceitarTermos } from '../state/legalState.js';
import { TERMS_VERSION } from '../data/legal.config.js';

// Caixa de aceite dos termos, mostrada no primeiro acesso e de novo a cada versao nova.
//
// Ela e um PORTAO e nao um aviso: enquanto nao houver linha em terms_consents para a versao
// vigente, o editor nao abre. Consentimento presumido por "continuar navegando" nao sustenta
// nada, e a pergunta que aparece quando ele e questionado e sempre a mesma: qual versao,
// quando, de onde. Por isso o registro tem versao, data e IP, e por isso a versao anterior
// nunca e sobrescrita.
//
// A caixa comeca DESMARCADA. Caixa pre-marcada nao e consentimento: e o padrao que a ANPD e
// o proprio CDC tratam como abusivo.
export function renderTermsConsent() {
  return `
    <div class="min-h-screen flex items-center justify-center px-5">
      <div class="glass-card w-full max-w-md p-8 flex flex-col gap-5">
        <div>
          <h1 class="text-lg font-bold text-white">Antes de começar</h1>
          <p class="text-xs text-white/40 mt-1">Versão ${TERMS_VERSION} dos nossos documentos.</p>
        </div>

        <p class="text-sm text-white/60 leading-relaxed">
          Você vai publicar uma página em um endereço nosso, e ela pode citar o nome de clientes seus.
          Vale a pena ler o que isso significa: os dois documentos são curtos e diretos.
        </p>

        <div class="flex gap-4">
          <a href="/termos" target="_blank" rel="noopener" class="text-sm text-white/70 hover:text-white underline">Termos de uso</a>
          <a href="/privacidade" target="_blank" rel="noopener" class="text-sm text-white/70 hover:text-white underline">Política de privacidade</a>
        </div>

        <label class="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" id="termos-aceite" class="mt-1 accent-white" />
          <span class="text-sm text-white/60 leading-relaxed">
            Li e aceito os termos de uso e a política de privacidade, e confirmo que tenho autorização
            para publicar o conteúdo e os nomes de clientes que eu inserir.
          </span>
        </label>

        <button type="button" id="termos-continuar" disabled
          class="glass-button rounded-xl px-4 py-2.5 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed">
          Continuar
        </button>
        <p id="termos-erro" class="hidden text-xs text-red-400"></p>
      </div>
    </div>
  `;
}

export function initTermsConsent({ aoAceitar }) {
  const caixa = document.querySelector('#termos-aceite');
  const botao = document.querySelector('#termos-continuar');
  const erro = document.querySelector('#termos-erro');
  if (!caixa || !botao) return;

  caixa.addEventListener('change', () => {
    botao.disabled = !caixa.checked;
  });

  botao.addEventListener('click', async () => {
    erro.classList.add('hidden');
    botao.disabled = true;
    botao.textContent = 'Registrando...';
    try {
      await aceitarTermos();
      await aoAceitar();
    } catch {
      erro.textContent = 'Não consegui registrar o aceite agora. Tente de novo em instantes.';
      erro.classList.remove('hidden');
      botao.disabled = false;
      botao.textContent = 'Continuar';
    }
  });
}
