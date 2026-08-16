import { createIcons } from 'lucide';
import { ICONES_LUCIDE } from '../../profile/lib/iconesLucide.js';
import { renderCasca, pintarCanvas } from './editorShell.js';
import { renderWizardSlug, initWizardSlug } from './wizardSlug.js';
import { carregarRascunho, getRascunho, montarCtxDoRascunho } from '../state/draftState.js';
import { abrirPainelPerfil } from '../panels/perfilPanel.js';
import { abrirPainelProjetos, abrirFormularioProjeto } from '../panels/projetosPanel.js';
import { abrirPainelExperiencias, abrirFormularioExperiencia } from '../panels/experienciasPanel.js';
import { abrirPainelPublicar } from '../panels/publicarPanel.js';
import { abrirPainelBump } from '../panels/bumpPanel.js';

// A montagem do editor. Zona [browser]. Este arquivo e cola: quem decide alguma coisa sao os
// paineis, o schema e o estado.
//
// Ele so e chamado DEPOIS dos portoes de acesso (login, compra, termos), que ja existiam no
// editorBoot.js. A ordem daqueles portoes e regra de negocio e nao muda por causa daqui.

let ligado = false;

export async function montarEditor({ raiz, temCustom, aoAbrirConta }) {
  await carregarRascunho({ temCustom });

  // Portfolio ainda nao existe: o webhook NAO cria a linha (achado 9), porque no momento da
  // compra ninguem escolheu endereco e slug e display_name sao not null. Quem cria e o
  // comprador, aqui, com create_my_portfolio().
  if (!getRascunho().portfolio) {
    raiz.innerHTML = renderWizardSlug();
    initWizardSlug({ aoCriar: () => montarEditor({ raiz, temCustom, aoAbrirConta }) });
    return;
  }

  // Repintar a casca inteira e nao so o canvas: o endereco e o selo de "no ar" mudam com o
  // dado, e a gaveta e IRMA de #app justamente para sobreviver a isto.
  const repintar = () => {
    const { portfolio, experiencias } = getRascunho();
    raiz.innerHTML = renderCasca({
      portfolio,
      statusPublicacao: portfolio.first_published_at ? 'no_ar' : 'rascunho',
    });
    pintarCanvas(montarCtxDoRascunho(), { temExperiencia: experiencias.length > 0 });
    // O MESMO mapa do bundle publico. Com tres icones fixos aqui, o selo que o comprador
    // acabou de escolher desenhava na pagina publicada e NAO desenhava no previa do editor,
    // que e onde ele decide se gostou. Duas listas de icone e uma delas sempre fica para tras.
    createIcons({ icons: ICONES_LUCIDE });
    requestAnimationFrame(() => raiz.classList.add('ready'));
  };

  const alternarVisitante = () => document.body.classList.toggle('is-editing');

  document.body.classList.add('is-editing');
  repintar();

  const abrir = (chave) => {
    const aoMudar = repintar;
    if (chave === 'perfil' || chave === 'perfil-foto' || chave === 'perfil-stacks') return abrirPainelPerfil({ aoMudar });
    if (chave === 'projetos') return abrirPainelProjetos({ aoMudar });
    if (chave === 'experiencias') return abrirPainelExperiencias({ aoMudar });
    if (chave === 'publicar') return abrirPainelPublicar({ aoMudar });
    if (chave === 'conta') return aoAbrirConta();
    if (chave.startsWith('projeto:')) {
      const slug = chave.slice('projeto:'.length);
      const linha = getRascunho().projetos.find((p) => p.slug === slug);
      return linha ? abrirFormularioProjeto({ id: linha.id, aoMudar }) : undefined;
    }
    if (chave.startsWith('experiencia:')) {
      const slug = chave.slice('experiencia:'.length);
      const linha = getRascunho().experiencias.find((x) => x.slug === slug);
      return linha ? abrirFormularioExperiencia({ id: linha.id, aoMudar }) : undefined;
    }
    return undefined;
  };

  // Um listener so, delegado na raiz: o canvas e repintado por inteiro a cada alteracao, entao
  // qualquer listener preso a um elemento de dentro morreria no primeiro salvar.
  //
  // A guarda existe porque montarEditor() e chamada de novo depois do wizard, e sem ela cada
  // clique abriria a gaveta duas vezes.
  if (ligado) return;
  ligado = true;

  raiz.addEventListener('click', (e) => {
    const editar = e.target.closest('[data-edit]');
    if (editar) {
      // O card de projeto abre o modal no clique. Dentro do editor, clicar no lapis tem que
      // editar e nao abrir o modal, entao a propagacao para aqui.
      e.preventDefault();
      e.stopPropagation();
      return abrir(editar.dataset.edit);
    }
    const barra = e.target.closest('[data-abrir]');
    if (barra) return abrir(barra.dataset.abrir);
    if (e.target.closest('[data-ver-visitante]')) return alternarVisitante();
    return undefined;
  });

  document.addEventListener('editor:abrir-bump', abrirPainelBump);

  // Atalho V, ignorado enquanto a pessoa esta digitando: um atalho de uma letra que dispara
  // dentro de um textarea some com a interface no meio de uma frase.
  const teclado = (e) => {
    const em = e.target.tagName;
    if (e.key.toLowerCase() !== 'v' || e.metaKey || e.ctrlKey || e.altKey) return;
    if (em === 'INPUT' || em === 'TEXTAREA' || em === 'SELECT' || e.target.isContentEditable) return;
    alternarVisitante();
  };
  document.addEventListener('keydown', teclado);
}
