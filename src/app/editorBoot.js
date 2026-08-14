import '../styles/global.css';
import '../modules/access/styles/access.css';
import '../modules/editor/styles/editor.css';

import { initAccess, getAccessState } from '../modules/access/state/accessState.js';
import { renderLoginGate, initLoginGate, renderSemCompra, initSemCompra } from '../modules/access/components/loginGate.js';
import { renderConfirmGate, initConfirmGate, lerTokenDaUrl } from '../modules/access/components/confirmAuthGate.js';
import { renderSetPasswordGate, initSetPasswordGate } from '../modules/access/components/setPasswordGate.js';
import { renderTermsConsent, initTermsConsent } from '../modules/legal/components/termsConsentGate.js';
import { renderContaPanel, initContaPanel } from '../modules/legal/components/contaPanel.js';
import { renderLegalPage } from '../modules/legal/components/legalPage.js';
import { termos } from '../modules/legal/data/termos.data.js';
import { privacidade } from '../modules/legal/data/privacidade.data.js';
import { precisaAceitarTermos } from '../modules/legal/state/legalState.js';
import { montarEditor } from '../modules/editor/components/editorApp.js';
import { fecharGaveta } from '../modules/editor/components/editorDrawer.js';
import { renderFilaPanel, initFilaPanel } from '../modules/admin/components/filaPanel.js';
import { rotaInterna, BASE } from './rotaInterna.js';

// Boot do editor. Zona [browser].
//
// Esta e a UNICA entrada do bundle que pode alcancar o @supabase/supabase-js: o bundle
// publico (src/main.js) nao pode, e scripts/import-graph.mjs reprova se alguem tentar. O
// motivo nao e tamanho, e superficie: a pagina publica de um comprador nao tem nenhum motivo
// para carregar cliente de banco.
//
// A ORDEM DOS PORTOES ABAIXO E A REGRA, e ela nao e estetica:
//   1. termos e privacidade saem antes de qualquer chamada de sessao, porque quem le os
//      termos costuma ser quem AINDA NAO comprou;
//   2. link de e-mail vira tela com botao, e nunca confirmacao automatica;
//   3. sem sessao, login;
//   4. com sessao e sem compra, a tela de sem compra (que so aparece DEPOIS de a pessoa
//      provar posse do e-mail, entao ela nao vaza nada);
//   5. com compra e sem aceite da versao vigente dos termos, o editor NAO abre.
const app = document.querySelector('#app');

function pintar(html) {
  app.innerHTML = html;
  requestAnimationFrame(() => app.classList.add('ready'));
}

// As duas paginas juridicas sao servidas pelo Worker no apex, ja renderizadas no HTML. Este
// ramo existe para o desenvolvimento local e para navegacao dentro do editor continuarem
// mostrando o MESMO texto, saido do MESMO modulo: duas copias do texto legal divergem, e a
// que divergir e a que vale contra nos.
const PAGINAS_JURIDICAS = {
  '/termos': termos,
  '/privacidade': privacidade,
};

async function rodar() {
  const caminho = rotaInterna(window.location.pathname);
  const doc = PAGINAS_JURIDICAS[caminho];
  if (doc) return pintar(renderLegalPage(doc));

  // Link de e-mail (recovery, magiclink). Nada e consumido aqui: so a leitura do parametro.
  const doLink = lerTokenDaUrl(window.location.href);
  if (doLink) {
    pintar(renderConfirmGate(doLink.tipo));
    initConfirmGate({
      tokenHash: doLink.tokenHash,
      tipo: doLink.tipo,
      aoConfirmar: async () => {
        // Limpa o token da barra de enderecos antes de seguir: token ja usado no historico
        // do navegador so serve para reaparecer num compartilhamento de tela.
        window.history.replaceState({}, '', window.location.pathname);
        await rodar();
      },
    });
    return;
  }

  const estado = await initAccess();

  if (estado.status === 'anon') {
    pintar(renderLoginGate());
    await initLoginGate({ aoEntrar: async () => { await rodar(); } });
    return;
  }

  if (estado.status === 'no-purchase') {
    pintar(renderSemCompra());
    initSemCompra(estado.email);
    return;
  }

  if (await precisaAceitarTermos()) {
    pintar(renderTermsConsent());
    initTermsConsent({ aoAceitar: async () => { await rodar(); } });
    return;
  }

  // Passado o ultimo portao, o editor. A area de Conta continua existindo e passa a ser uma
  // rota de dentro dele (/conta e o botao "Conta" da barra), porque o pacote juridico executavel
  // (senha opcional, exportar, arrependimento, apagar a conta) nao pode depender de o comprador
  // achar uma tela escondida.
  const { email, mainGrantedAt, acesso } = getAccessState();

  // O botao de voltar e montado AQUI, e nao dentro de renderContaPanel: aquele componente
  // pertence ao modulo juridico e nao pode passar a depender da existencia de um editor.
  const abrirConta = () => {
    fecharGaveta();
    document.body.classList.remove('is-editing');
    pintar(
      `<div class="ed-voltar"><button type="button" id="conta-voltar" class="ed-link">‹ Voltar para o editor</button></div>` +
        renderContaPanel({ email, mainGrantedAt, slotSenha: renderSetPasswordGate() }),
    );
    initContaPanel({ email });
    initSetPasswordGate();
    document.getElementById('conta-voltar')?.addEventListener('click', () => {
      // BASE e nao '/': a raiz do dominio serve o portfolio do Helio, entao voltar para '/'
      // deixaria a barra de enderecos apontando para um lugar que, num F5, nao e o editor.
      window.history.replaceState({}, '', BASE);
      rodar();
    });
  };

  if (caminho === '/conta') return abrirConta();

  // A fila do dono. Ela nao aparece em menu nenhum: quem chega aqui digita o endereco, e
  // quem nao e admin recebe a explicacao em vez de quatro listas vazias (o `is_admin()`
  // devolve false enquanto o MFA nao for confirmado, e o sintoma disso parece defeito).
  if (caminho === '/admin/fila') {
    fecharGaveta();
    document.body.classList.remove('is-editing');
    pintar(renderFilaPanel());
    await initFilaPanel();
    return;
  }

  await montarEditor({ raiz: app, temCustom: Boolean(acesso?.has_custom), aoAbrirConta: abrirConta });
  requestAnimationFrame(() => app.classList.add('ready'));
}

rodar();
