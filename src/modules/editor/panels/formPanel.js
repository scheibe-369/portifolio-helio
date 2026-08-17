import { esc } from '../../portfolio/lib/sanitize.js';
import { abrirGaveta, repintarCorpo, fecharGaveta } from '../components/editorDrawer.js';
import { renderFormulario, ligarFormulario, passosAbertos, classificarValidacao } from '../components/formulario.js';
import { processarImagem } from '../../media/lib/imageUpload.js';
import { subirCertificado } from '../../media/lib/docUpload.js';
import { apagarArquivo, urlAssinadaDoc, BUCKET_DOCS } from '../../media/lib/storage.js';

// A gaveta de edicao de UM item (o perfil, um projeto, uma experiencia). Zona [browser].
//
// Um arquivo so para os tres porque a diferenca entre eles ja esta declarada em
// fieldSchema.js: rotulo, passo e limite. Um "painel de projeto" e um "painel de experiencia"
// escritos a mao seriam duas copias da mesma logica de upload, salvar e validar, e a segunda a
// divergir e a que produz o defeito que ninguem acha.

const botao = (id, texto, classe = 'ed-btn') => `<button type="button" id="${id}" class="${classe}">${esc(texto)}</button>`;

export function abrirFormulario({
  titulo,
  subtitulo = '',
  campos,
  passos,
  valores,
  temCustom,
  ehTitular = true,
  portfolioId,
  nomeDoArquivo = () => 'arquivo',
  aoSalvar,
  aoApagar = null,
  aoVoltar = null,
  aoMudar = () => {},
}) {
  let abertos = [];

  const html = () => renderFormulario({ campos, valores, passos, temCustom, ehTitular, abertos });

  const mensagem = (texto, tipo = 'erro') => {
    const el = document.getElementById('ed-form-msg');
    if (el) {
      el.textContent = texto;
      el.className = `ed-msg e-${tipo}`;
    }
  };

  const repintar = () => {
    const corpo = document.querySelector('[data-gaveta-corpo]');
    if (corpo) abertos = passosAbertos(corpo);
    repintarCorpo(html(), ligar);
  };

  async function tratarArquivo(campo, arquivo) {
    if (!campo || campo.tipo !== 'imagem') return;
    const alvo = document.querySelector(`[data-campo="${CSS.escape(campo.key)}"] [data-erro]`);
    if (alvo) alvo.textContent = 'convertendo e enviando...';
    try {
      const r = await processarImagem(arquivo, {
        destino: campo.destino,
        portfolioId,
        nome: nomeDoArquivo(),
        caminhoAnterior: valores[`${campo.key}_path`],
      });
      valores[`${campo.key}_path`] = r.caminho;
      valores[`${campo.key}_url`] = r.url;
      valores[`${campo.key}_mime`] = r.mime;
      repintar();
      aoMudar();
    } catch (erro) {
      if (alvo) alvo.textContent = erro.message || 'nao consegui enviar esta imagem';
    }
  }

  async function tratarCertificado(acao, arquivo) {
    const alvo = document.querySelector('[data-campo="certificate"] [data-erro]');
    try {
      if (acao === 'subir') {
        if (alvo) alvo.textContent = 'enviando...';
        const r = await subirCertificado(arquivo, {
          portfolioId,
          slug: valores.slug || nomeDoArquivo(),
          caminhoAnterior: valores.certificate_path,
        });
        valores.certificate_path = r.caminho;
        valores.certificate_mime = r.mime;
        valores.certificate_bytes = r.bytes;
        valores.certificate_nome = r.nomeOriginal;
        valores.certificate_preview = r.previewUrl;
        if (!valores.certificate_label) valores.certificate_label = 'Certificado';
        repintar();
        aoMudar();
      } else if (acao === 'remover') {
        // Consentimento desliga junto, e nao por gentileza: o CHECK
        // experiences_cert_consentimento recusa `certificate_public` verdadeiro sem arquivo.
        await apagarArquivo({ bucket: BUCKET_DOCS, caminho: valores.certificate_path });
        valores.certificate_path = '';
        valores.certificate_mime = '';
        valores.certificate_public = false;
        valores.certificate_preview = '';
        repintar();
        aoMudar();
      } else if (acao === 'abrir') {
        // Aba nova com URL assinada de vida curta. Nunca embutido: o bucket e privado porque
        // PDF sabe executar JavaScript, e embutir aqui seria abrir a mesma porta por dentro.
        const url = valores.certificate_preview || (await urlAssinadaDoc(valores.certificate_path));
        window.open(url, '_blank', 'noopener');
      }
    } catch (erro) {
      if (alvo) alvo.textContent = erro.message || 'nao consegui tratar este arquivo';
    }
  }

  function ligar(corpo) {
    ligarFormulario(corpo, {
      campos,
      valores,
      aoMudar: (precisaRepintar) => {
        if (precisaRepintar) repintar();
        aoMudar();
      },
      aoArquivo: tratarArquivo,
      aoCertificado: tratarCertificado,
    });
  }

  abrirGaveta({
    titulo,
    subtitulo,
    html: html(),
    aoVoltar,
    rodape: `
      <p id="ed-form-msg" class="ed-msg"></p>
      <div class="ed-rodape-botoes">
        ${aoApagar ? botao('ed-form-apagar', 'Apagar', 'ed-btn e-perigo') : ''}
        ${botao('ed-form-salvar', 'Salvar', 'ed-btn e-primario')}
      </div>`,
    aoLigar: (corpo, raiz) => {
      ligar(corpo);

      raiz.querySelector('#ed-form-salvar').addEventListener('click', async (e) => {
        const { bloqueios, avisos } = classificarValidacao(campos, valores);
        const mostrar = (mapa) => Object.keys(mapa).forEach((k) => {
          const el = corpo.querySelector(`[data-campo="${CSS.escape(k)}"] [data-erro]`);
          if (el) el.textContent = mapa[k];
        });

        if (Object.keys(bloqueios).length) {
          mostrar(bloqueios);
          return mensagem('Confira os campos marcados.');
        }

        // Campo opcional que a gente nao entendeu sai do patch e o resto grava. Sem isto, um
        // link de Spotify colado no campo de video segurava o trabalho inteiro.
        const chavesAviso = Object.keys(avisos);
        if (chavesAviso.length) {
          mostrar(avisos);
          chavesAviso.forEach((k) => { valores[k] = ''; });
        }
        e.target.disabled = true;
        mensagem('salvando...', 'neutro');
        try {
          await aoSalvar(valores);
          fecharGaveta();
        } catch (erro) {
          e.target.disabled = false;
          mensagem(erro.message || 'nao consegui salvar');
        }
        return undefined;
      });

      raiz.querySelector('#ed-form-apagar')?.addEventListener('click', async (e) => {
        if (e.target.dataset.confirmando !== 'sim') {
          e.target.dataset.confirmando = 'sim';
          e.target.textContent = 'Apagar mesmo?';
          return;
        }
        e.target.disabled = true;
        try {
          await aoApagar();
          fecharGaveta();
        } catch (erro) {
          e.target.disabled = false;
          mensagem(erro.message || 'nao consegui apagar');
        }
      });

      // A pilula de personalizacao abre a explicacao do bump, e nunca um alerta de "compre".
      // O campo continua visivel com o valor padrao: esconde-lo faria o comprador nunca
      // descobrir que a personalizacao existe.
      corpo.addEventListener('click', (ev) => {
        if (ev.target.closest('[data-abrir-bump]')) {
          document.dispatchEvent(new CustomEvent('editor:abrir-bump'));
        }
      });
    },
  });
}
