import {
  exportarMeusDados,
  pedirExclusao,
  cancelarExclusao,
  pedirReembolso,
  diasDeArrependimentoRestantes,
} from '../state/legalState.js';
import { baixarJson } from '../lib/baixarJson.js';
import { PRAZOS } from '../data/legal.config.js';

// Painel "Conta" do editor. E aqui que os direitos do titular deixam de ser paragrafo e
// viram botao.
//
// Os quatro itens desta tela sao os quatro que o produto nao pode vender sem ter: senha
// opcional (valvula da cota de e-mail), exportar (LGPD art. 18), arrependimento (CDC art. 49)
// e apagar a conta (LGPD art. 18). Nenhum deles depende de falar com o suporte, e essa e a
// diferenca entre cumprir a lei e escrever que cumpre.
//
// O botao de reembolso aparece SO dentro do prazo, com os dias restantes ao lado. Botao que
// aparece sempre vira pedido fora do prazo e discussao de atendimento; prazo escondido vira
// reclamacao. Mostrar o numero e o que evita os dois.

function bloco(titulo, descricao, conteudo) {
  return `
    <section class="glass-card p-6 rounded-2xl flex flex-col gap-3">
      <div>
        <h2 class="text-sm font-medium text-white">${titulo}</h2>
        <p class="text-xs text-white/40 mt-1 leading-relaxed">${descricao}</p>
      </div>
      ${conteudo}
    </section>`;
}

// slotSenha e um buraco no meio da tela, preenchido por quem monta a pagina (a camada app),
// e nao um import do modulo de acesso aqui dentro. Feature nao importa feature: se este
// arquivo importasse setPasswordGate, o modulo juridico passaria a nao compilar sem o modulo
// de acesso, e os dois deixariam de poder mudar sozinhos.
export function renderContaPanel({ email, mainGrantedAt, slotSenha = '' }) {
  const dias = diasDeArrependimentoRestantes(mainGrantedAt);

  const blocoReembolso = dias
    ? bloco(
        'Desistir da compra',
        `Você está dentro do prazo de arrependimento do artigo 49 do Código de Defesa do Consumidor. Restam ${dias} ${dias === 1 ? 'dia' : 'dias'}. O portfólio sai do ar assim que você pedir, e o valor volta integralmente.`,
        `<textarea id="conta-motivo" rows="2" placeholder="Se quiser, conte o motivo (opcional)"
            class="campo-acesso resize-none"></textarea>
         <button type="button" id="conta-reembolso" class="glass-button rounded-xl px-4 py-2.5 text-sm font-medium">
           Solicitar reembolso (${dias} ${dias === 1 ? 'dia' : 'dias'})
         </button>
         <p id="conta-reembolso-msg" class="hidden text-xs"></p>`,
      )
    : '';

  return `
    <main class="max-w-xl mx-auto px-5 py-12 flex flex-col gap-5">
      <header class="flex flex-col gap-1">
        <h1 class="text-xl font-bold text-white">Conta</h1>
        <p class="text-xs text-white/40" id="conta-email"></p>
      </header>

      ${slotSenha}

      ${bloco(
        'Baixar meus dados',
        'Um arquivo com o portfólio, projetos, experiências e a lista dos seus arquivos, com links de download que valem 1 hora.',
        `<button type="button" id="conta-exportar" class="glass-button rounded-xl px-4 py-2.5 text-sm font-medium">
           Baixar meus dados
         </button>
         <p id="conta-exportar-msg" class="hidden text-xs"></p>`,
      )}

      ${blocoReembolso}

      ${bloco(
        'Apagar minha conta',
        `O portfólio sai do ar na hora e a exclusão definitiva acontece ${PRAZOS.carenciaExclusaoDias} dias depois. Dentro desse prazo você pode voltar atrás, aqui ou pelo link do e-mail de confirmação. Depois disso não há como recuperar.`,
        `<div id="conta-exclusao-passo1">
           <button type="button" id="conta-exclusao-abrir" class="rounded-xl px-4 py-2.5 text-sm font-medium border border-red-500/30 text-red-400 hover:bg-red-500/10 transition">
             Quero apagar minha conta
           </button>
         </div>

         <div id="conta-exclusao-passo2" class="hidden flex-col gap-3">
           <p class="text-xs text-white/60">
             Para confirmar, digite o código <span id="conta-exclusao-codigo" class="text-white font-mono tracking-widest"></span> no campo abaixo.
           </p>
           <input type="text" id="conta-exclusao-confirma" autocomplete="off" spellcheck="false"
                  placeholder="Código de confirmação" class="campo-acesso" />
           <div class="flex gap-2">
             <button type="button" id="conta-exclusao-confirmar" class="rounded-xl px-4 py-2.5 text-sm font-medium border border-red-500/30 text-red-400 hover:bg-red-500/10 transition">
               Confirmar exclusão
             </button>
             <button type="button" id="conta-exclusao-cancelar" class="text-xs text-white/40 hover:text-white/70 px-2">
               Deixa pra lá
             </button>
           </div>
         </div>

         <p id="conta-exclusao-msg" class="hidden text-xs"></p>
         <button type="button" id="conta-exclusao-desfazer" class="text-xs text-white/40 hover:text-white/70 text-left">
           Pedi a exclusão e mudei de ideia
         </button>`,
      )}

      <footer class="pt-2 flex flex-wrap gap-x-4 gap-y-1">
        <a href="/termos" class="text-xs text-white/30 hover:text-white/70 transition">Termos de uso</a>
        <a href="/privacidade" class="text-xs text-white/30 hover:text-white/70 transition">Privacidade</a>
      </footer>
    </main>`;
}

// Codigo de confirmacao da exclusao. Ele nao e seguranca (quem esta logado ja e o dono da
// conta): ele e atrito deliberado contra o clique automatico. Apagar conta e a unica acao
// irreversivel do produto, e a unica que nao pode acontecer por memoria muscular.
function gerarCodigo() {
  const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sem I, O, 0 e 1: confundem na leitura
  let s = '';
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  for (const b of bytes) s += letras[b % letras.length];
  return s;
}

export function initContaPanel({ email }) {
  const eco = document.querySelector('#conta-email');
  if (eco) eco.textContent = email || '';

  function aviso(el, texto, ok = false) {
    el.textContent = texto;
    el.className = `text-xs ${ok ? 'text-emerald-400' : 'text-red-400'}`;
  }

  // ------------------------------------------------------------------ exportar
  const btnExportar = document.querySelector('#conta-exportar');
  const msgExportar = document.querySelector('#conta-exportar-msg');
  btnExportar?.addEventListener('click', async () => {
    btnExportar.disabled = true;
    btnExportar.textContent = 'Preparando...';
    try {
      const dados = await exportarMeusDados();
      const dia = new Date().toISOString().slice(0, 10);
      baixarJson(`myportifolio-meus-dados-${dia}.json`, dados);
      aviso(msgExportar, 'Pronto. Os links de arquivo dentro do JSON valem 1 hora.', true);
    } catch {
      aviso(msgExportar, 'Não consegui gerar a exportação agora. Tente de novo em instantes.');
    } finally {
      btnExportar.disabled = false;
      btnExportar.textContent = 'Baixar meus dados';
    }
  });

  // ------------------------------------------------------------------ reembolso
  const btnReembolso = document.querySelector('#conta-reembolso');
  const msgReembolso = document.querySelector('#conta-reembolso-msg');
  btnReembolso?.addEventListener('click', async () => {
    btnReembolso.disabled = true;
    btnReembolso.textContent = 'Enviando...';
    try {
      await pedirReembolso(document.querySelector('#conta-motivo')?.value);
      aviso(
        msgReembolso,
        'Pedido registrado. O portfólio saiu do ar e o estorno será processado pela Hubla.',
        true,
      );
    } catch {
      aviso(msgReembolso, 'Não consegui registrar o pedido. Escreva para o suporte.');
      btnReembolso.disabled = false;
      btnReembolso.textContent = 'Solicitar reembolso';
    }
  });

  // ------------------------------------------------------------------ apagar conta
  const passo1 = document.querySelector('#conta-exclusao-passo1');
  const passo2 = document.querySelector('#conta-exclusao-passo2');
  const ecoCodigo = document.querySelector('#conta-exclusao-codigo');
  const inputCodigo = document.querySelector('#conta-exclusao-confirma');
  const msgExclusao = document.querySelector('#conta-exclusao-msg');
  let codigoEsperado = '';

  document.querySelector('#conta-exclusao-abrir')?.addEventListener('click', () => {
    codigoEsperado = gerarCodigo();
    ecoCodigo.textContent = codigoEsperado;
    passo1.classList.add('hidden');
    passo2.classList.remove('hidden');
    passo2.classList.add('flex');
    inputCodigo.value = '';
    inputCodigo.focus();
  });

  document.querySelector('#conta-exclusao-cancelar')?.addEventListener('click', () => {
    passo2.classList.add('hidden');
    passo2.classList.remove('flex');
    passo1.classList.remove('hidden');
  });

  document.querySelector('#conta-exclusao-confirmar')?.addEventListener('click', async () => {
    if (inputCodigo.value.trim().toUpperCase() !== codigoEsperado) {
      aviso(msgExclusao, 'O código não confere.');
      msgExclusao.classList.remove('hidden');
      return;
    }
    try {
      const prazo = await pedirExclusao();
      const quando = new Date(prazo).toLocaleDateString('pt-BR');
      aviso(
        msgExclusao,
        `Portfólio fora do ar. A exclusão definitiva acontece em ${quando}, e até lá você pode voltar atrás.`,
        true,
      );
      msgExclusao.classList.remove('hidden');
      passo2.classList.add('hidden');
      passo2.classList.remove('flex');
    } catch {
      aviso(msgExclusao, 'Não consegui registrar o pedido. Tente de novo em instantes.');
      msgExclusao.classList.remove('hidden');
    }
  });

  document.querySelector('#conta-exclusao-desfazer')?.addEventListener('click', async () => {
    try {
      const havia = await cancelarExclusao();
      aviso(
        msgExclusao,
        havia
          ? 'Exclusão cancelada. Se o portfólio estava no ar antes do pedido, ele já voltou.'
          : 'Não há pedido de exclusão em aberto nesta conta.',
        havia,
      );
      msgExclusao.classList.remove('hidden');
    } catch {
      aviso(msgExclusao, 'Não consegui cancelar agora. Tente de novo em instantes.');
      msgExclusao.classList.remove('hidden');
    }
  });
}
