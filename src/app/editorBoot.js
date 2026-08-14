import '../styles/global.css';
import '../modules/access/styles/access.css';

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
  const caminho = window.location.pathname.replace(/\/+$/, '') || '/';
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

  // Fase 1: o editor de verdade (canvas, perfil, projetos, publicar) e outro item. O que ja
  // existe atras do login e a area de Conta, que e o pacote juridico executavel: senha
  // opcional, exportar, arrependimento e apagar a conta.
  const { email, mainGrantedAt } = getAccessState();
  pintar(renderContaPanel({ email, mainGrantedAt, slotSenha: renderSetPasswordGate() }));
  initContaPanel({ email });
  initSetPasswordGate();
}

rodar();
