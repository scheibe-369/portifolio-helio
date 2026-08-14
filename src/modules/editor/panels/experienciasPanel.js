import { abrirGaveta, repintarCorpo } from '../components/editorDrawer.js';
import { renderLista, mover } from './listaPanel.js';
import { abrirFormulario } from './formPanel.js';
import { CAMPOS_EXPERIENCIA, PASSOS_EXPERIENCIA } from '../data/fieldSchema.js';
import { slugify, slugUnico } from '../lib/slugify.js';
import { iniciais } from '../../experience/lib/iniciais.js';
import { ordenarPorPeriodo } from '../../experience/lib/periodoChave.js';
import {
  criarExperiencia,
  salvarExperiencia,
  apagarExperiencia,
  gravarOrdem,
  experienciaDaLinha,
  carregarExperiencias,
} from '../api/experiencesApi.js';
import { getRascunho, definir } from '../state/draftState.js';

// Painel "Minha experiencia" e o formulario de tres passos. Zona [browser].
//
// A experiencia chega ao editor numa situacao que nenhuma outra area tem: o RENDER JA EXISTE E
// JA ESTA NO AR (src/modules/experience/), e o schema ja esta escrito. O que se entrega aqui e
// formulario, persistencia e um tipo de upload novo, e nao uma secao nova de portfolio.

const vazioNovo = () => ({
  slug: '',
  org: '',
  // 'work' ja escolhido: e a entrada mais comum, e `kind` nao e um campo a mais, e o que
  // decide o rotulo de todos os outros.
  kind: 'work',
  role: '',
  period_start: '',
  period_end: '',
  // O switch nasce LIGADO porque period_end nulo significa ATUAL, e quem cadastra a primeira
  // passagem quase sempre esta cadastrando a de agora.
  atual: true,
  location: '',
  highlights: [],
  note: '',
  logo_path: '',
  logo_url: '',
  plate_bg: '#0b0b12',
  certificate_path: '',
  certificate_mime: '',
  certificate_label: '',
  certificate_public: false,
});

async function recarregar() {
  const { portfolio } = getRascunho();
  definir({ experiencias: await carregarExperiencias(portfolio.id) });
}

export function abrirFormularioExperiencia({ id = null, aoVoltar = null, aoMudar }) {
  const { portfolio, experiencias, temCustom, ehTitular } = getRascunho();
  const linha = id ? experiencias.find((x) => x.id === id) : null;
  const valores = linha ? experienciaDaLinha(linha) : vazioNovo();

  // O slug sai de org + role, e e a chave que amarra a traducao (4.7.1) e o endereco da rota
  // /certificado/. Editavel em "Ajustes finos", derivado enquanto ninguem o tocou.
  const usados = experiencias.filter((x) => x.id !== id).map((x) => x.slug);
  const derivarSlug = () => {
    if (!linha && !valores._slugTocado) valores.slug = slugUnico(`${valores.org} ${valores.role}`, usados);
  };

  abrirFormulario({
    titulo: linha ? valores.org || 'Experiência' : 'Nova experiência',
    subtitulo: 'Organização, cargo e início já bastam para ela aparecer.',
    campos: CAMPOS_EXPERIENCIA,
    passos: PASSOS_EXPERIENCIA,
    valores,
    temCustom,
    // Consentimento de expor documento pessoal e do TITULAR. Quem esta montando pelo bump de
    // facilitacao ve a caixa desabilitada, porque o banco recusa por eh_titular_do_portfolio()
    // e deixar habilitado um controle que sempre falha e desenhar um erro que o operador vai
    // reportar como bug. Ele continua podendo subir o arquivo, que e o servico vendido.
    ehTitular,
    portfolioId: portfolio.id,
    nomeDoArquivo: () => slugify(valores.org) || 'experiencia',
    aoVoltar,
    aoMudar: () => {
      derivarSlug();
      aoMudar();
    },
    aoSalvar: async (v) => {
      derivarSlug();
      if (!v.slug) v.slug = slugUnico(`${v.org} ${v.role}`, usados);
      const opcoes = { podePublicarCertificado: ehTitular };
      if (linha) await salvarExperiencia(linha.id, v, linha, opcoes);
      else await criarExperiencia(portfolio.id, v, experiencias.length, opcoes);
      await recarregar();
      aoMudar();
    },
    aoApagar: linha
      ? async () => {
          await apagarExperiencia(linha.id);
          await recarregar();
          aoMudar();
        }
      : null,
  });
}

export function abrirPainelExperiencias({ aoMudar }) {
  let ordem = getRascunho().experiencias.map(experienciaDaLinha);
  let previaCronologica = null;

  const periodo = (x) => (x.period_end ? `${x.period_start} a ${x.period_end}` : `Desde ${x.period_start}`);

  const itens = (lista) =>
    lista.map((x) => ({
      id: x.id,
      titulo: x.role || '(sem cargo)',
      subtitulo: `${x.org} · ${periodo(x)}`,
      imagem: x.logo_url,
      cor: x.plate_bg,
      iniciais: iniciais(x.org),
      selos: [
        x.kind === 'education' ? 'estudo' : '',
        x.certificate_path ? (x.certificate_public ? 'certificado visível' : 'certificado só seu') : '',
      ].filter(Boolean),
    }));

  const html = () => `
    ${renderLista({
      itens: itens(previaCronologica || ordem),
      vazio: 'Nenhuma passagem cadastrada ainda. Uma já deixa a seção de pé.',
      rotuloAdicionar: 'Adicionar experiência',
    })}
    ${
      previaCronologica
        ? `<div class="ed-sugestao">
             <p>Esta é a ordem da mais recente para a mais antiga. Aplicar?</p>
             <div class="ed-rodape-botoes">
               <button type="button" class="ed-btn" data-cancelar-ordem>Cancelar</button>
               <button type="button" class="ed-btn e-primario" data-aplicar-ordem>Aplicar</button>
             </div>
           </div>`
        : `<button type="button" class="ed-link" data-sugerir-ordem>Colocar em ordem, da mais recente para a mais antiga</button>`
    }`;

  const voltar = () => abrirPainelExperiencias({ aoMudar });

  const ligar = (corpo) => {
    corpo.addEventListener('click', async (e) => {
      const editar = e.target.closest('[data-editar]');
      if (editar) return abrirFormularioExperiencia({ id: editar.dataset.editar, aoVoltar: voltar, aoMudar });
      if (e.target.closest('[data-adicionar]')) {
        return abrirFormularioExperiencia({ aoVoltar: voltar, aoMudar });
      }

      // A sugestao de ordem MOSTRA o resultado antes de aplicar e nunca roda sozinha, pela
      // mesma razao de 6.4: reordenar em silencio mexe justamente no que o comprador acabou de
      // arrumar. A comparacao usa periodoChave.js, que e a copia declarada de periodo_chave().
      if (e.target.closest('[data-sugerir-ordem]')) {
        previaCronologica = ordenarPorPeriodo(ordem);
        return repintarCorpo(html(), ligar);
      }
      if (e.target.closest('[data-cancelar-ordem]')) {
        previaCronologica = null;
        return repintarCorpo(html(), ligar);
      }
      if (e.target.closest('[data-aplicar-ordem]')) {
        ordem = previaCronologica;
        previaCronologica = null;
        repintarCorpo(html(), ligar);
        return gravar();
      }

      const subir = e.target.closest('[data-subir]');
      const descer = e.target.closest('[data-descer]');
      if (subir || descer) {
        if (previaCronologica) return undefined;
        ordem = mover(ordem, (subir || descer).dataset[subir ? 'subir' : 'descer'], subir ? -1 : 1);
        repintarCorpo(html(), ligar);
        return gravar();
      }
      return undefined;
    });
  };

  async function gravar() {
    try {
      await gravarOrdem(ordem);
      await recarregar();
      aoMudar();
    } catch (erro) {
      const msg = document.getElementById('ed-lista-msg');
      if (msg) msg.textContent = erro.message || 'nao consegui gravar a ordem';
    }
  }

  abrirGaveta({
    titulo: 'Minha experiência',
    subtitulo: 'Trabalho e estudo na mesma lista. As setas mudam a ordem.',
    html: html(),
    aoLigar: ligar,
  });
}
