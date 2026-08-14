import { abrirFormulario } from './formPanel.js';
import { CAMPOS_PERFIL, PASSOS_PERFIL } from '../data/fieldSchema.js';
import { salvarPerfil } from '../api/portfolioApi.js';
import { getRascunho, definir, perfilAtual } from '../state/draftState.js';
import { slugify } from '../lib/slugify.js';

// Painel de perfil. Zona [browser]. Ele e fino de proposito: tudo que ele sabe fazer ja esta
// em fieldSchema.js e em formPanel.js, e o que sobra aqui e so o "de onde vem" e o "para onde
// vai" do dado.

export function abrirPainelPerfil({ aoMudar, passoInicial = 1 }) {
  const { portfolio, temCustom } = getRascunho();
  const valores = perfilAtual();

  abrirFormulario({
    titulo: 'Seu perfil',
    subtitulo: passoInicial === 1 ? 'É o que aparece no topo da página.' : '',
    campos: CAMPOS_PERFIL,
    passos: PASSOS_PERFIL,
    valores,
    temCustom,
    portfolioId: portfolio.id,
    nomeDoArquivo: () => slugify(valores.display_name) || 'perfil',
    aoMudar,
    aoSalvar: async (v) => {
      const linha = await salvarPerfil(portfolio.id, v, portfolio, { temCustom });
      definir({ portfolio: linha });
      aoMudar();
    },
  });
}
