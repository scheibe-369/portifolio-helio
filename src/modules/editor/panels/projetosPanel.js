import { abrirGaveta, repintarCorpo } from '../components/editorDrawer.js';
import { renderLista, mover } from './listaPanel.js';
import { abrirFormulario } from './formPanel.js';
import { CAMPOS_PROJETO, PASSOS_PROJETO } from '../data/fieldSchema.js';
import { ANOS } from '../config/editor.config.js';
import { slugify, slugUnico } from '../lib/slugify.js';
import {
  criarProjeto,
  salvarProjeto,
  apagarProjeto,
  gravarOrdem,
  projetoDaLinha,
  carregarProjetos,
} from '../api/projectsApi.js';
import { getRascunho, definir } from '../state/draftState.js';

// Painel "Meus projetos" e o formulario de tres passos. Zona [browser].

const vazioNovo = () => ({
  slug: '',
  name: '',
  category: '',
  tagline: '',
  problem: '',
  solution: '',
  features: [],
  stack: [],
  video: '',
  link: '',
  link_note: '',
  tem_cliente: false,
  client: '',
  year: ANOS[0],
  groups: [],
  image_path: '',
  image_url: '',
  image_fit: 'contain',
  accent: '#7C5CFC',
  plate_bg: '#0b0b12',
});

async function recarregar() {
  const { portfolio } = getRascunho();
  definir({ projetos: await carregarProjetos(portfolio.id) });
}

export function abrirFormularioProjeto({ id = null, aoVoltar = null, aoMudar }) {
  const { portfolio, projetos, temCustom } = getRascunho();
  const linha = id ? projetos.find((p) => p.id === id) : null;
  const valores = linha ? projetoDaLinha(linha) : vazioNovo();

  // O slug SAI DO NOME sozinho, e so vira campo em "Ajustes finos". Pedir o endereco do case
  // antes do nome e pedir que a pessoa nomeie uma coisa que ela ainda nao descreveu.
  const usados = projetos.filter((p) => p.id !== id).map((p) => p.slug);
  const derivarSlug = () => {
    if (!linha && !valores._slugTocado) valores.slug = slugUnico(valores.name, usados);
  };

  abrirFormulario({
    titulo: linha ? valores.name || 'Projeto' : 'Novo projeto',
    subtitulo: 'Preencha só o básico e ele já aparece na grade.',
    campos: CAMPOS_PROJETO,
    passos: PASSOS_PROJETO,
    valores,
    temCustom,
    portfolioId: portfolio.id,
    nomeDoArquivo: () => slugify(valores.name) || 'projeto',
    aoVoltar,
    aoMudar: () => {
      derivarSlug();
      aoMudar();
    },
    aoSalvar: async (v) => {
      derivarSlug();
      if (!v.slug) v.slug = slugUnico(v.name, usados);
      if (linha) await salvarProjeto(linha.id, v, linha);
      else await criarProjeto(portfolio.id, v, projetos.length);
      await recarregar();
      aoMudar();
    },
    aoApagar: linha
      ? async () => {
          await apagarProjeto(linha.id);
          await recarregar();
          aoMudar();
        }
      : null,
  });
}

export function abrirPainelProjetos({ aoMudar }) {
  let ordem = getRascunho().projetos.map(projetoDaLinha);

  const html = () =>
    renderLista({
      itens: ordem.map((p) => ({
        id: p.id,
        titulo: p.name || '(sem nome)',
        subtitulo: [p.category, p.year].filter(Boolean).join(' · '),
        imagem: p.image_url,
        cor: p.plate_bg,
        iniciais: (p.name || '?').slice(0, 2).toUpperCase(),
        selos: [p.video ? 'vídeo' : '', p.image_url ? '' : 'sem imagem'].filter(Boolean),
      })),
      vazio: 'Você ainda não cadastrou nenhum projeto. É o coração do portfólio: comece por um.',
      rotuloAdicionar: 'Adicionar projeto',
    });

  const voltar = () => abrirPainelProjetos({ aoMudar });

  const ligar = (corpo) => {
    corpo.addEventListener('click', async (e) => {
      const editar = e.target.closest('[data-editar]');
      if (editar) return abrirFormularioProjeto({ id: editar.dataset.editar, aoVoltar: voltar, aoMudar });

      if (e.target.closest('[data-adicionar]')) {
        return abrirFormularioProjeto({ aoVoltar: voltar, aoMudar });
      }

      const subir = e.target.closest('[data-subir]');
      const descer = e.target.closest('[data-descer]');
      if (subir || descer) {
        ordem = mover(ordem, (subir || descer).dataset[subir ? 'subir' : 'descer'], subir ? -1 : 1);
        repintarCorpo(html(), ligar);
        try {
          await gravarOrdem(ordem);
          await recarregar();
          aoMudar();
        } catch (erro) {
          const msg = document.getElementById('ed-lista-msg');
          if (msg) msg.textContent = erro.message || 'nao consegui gravar a ordem';
        }
      }
      return undefined;
    });
  };

  abrirGaveta({
    titulo: 'Meus projetos',
    subtitulo: 'As setas mudam a ordem na grade.',
    html: html(),
    aoLigar: ligar,
  });
}
