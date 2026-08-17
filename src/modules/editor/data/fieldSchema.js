import { ANOS } from '../config/editor.config.js';
import { ICONES_SELO } from '../../profile/lib/iconesSelo.js';

// As opcoes do icone do selo, em pares [valor gravado, rotulo mostrado].
//
// A lista de valores NAO e escrita aqui: ela sai de ICONES_SELO, que e a mesma fonte que o
// render consulta e que o bundle registra no lucide. Duas listas divergem com o tempo, e a
// divergencia aqui seria um icone oferecido no editor que simplesmente nao desenha na
// pagina, sem erro nenhum (ver scripts/testar-icones.mjs).
const ROTULO_ICONE = {
  'code': 'Código', 'chef-hat': 'Chapéu de chef', 'scale': 'Balança', 'camera': 'Câmera',
  'dumbbell': 'Halter', 'ruler': 'Régua', 'brain': 'Cérebro', 'music': 'Música',
  'cake': 'Bolo', 'graduation-cap': 'Capelo', 'pen-tool': 'Caneta', 'briefcase': 'Maleta',
  'sparkles': 'Brilhos', 'heart': 'Coração', 'star': 'Estrela', 'palette': 'Paleta',
  'mic': 'Microfone', 'scissors': 'Tesoura', 'wrench': 'Chave inglesa', 'leaf': 'Folha',
};
const OPCOES_ICONE_SELO = [['', 'Sem ícone'], ...Object.keys(ICONES_SELO).map((k) => [k, ROTULO_ICONE[k] || k])];

// FONTE UNICA de campo, tipo, rotulo e limite do editor. Zona [browser].
//
// Esta e a decisao de maior alavancagem do editor: os paineis sao GERADOS desta lista, entao
// acrescentar campo depois e uma entrada aqui, e nao quatro arquivos alterados em lugares que
// divergem entre si. Os limites sao os mesmos CHECK do banco, copiados de proposito: o
// contador na tela precisa dizer a mesma coisa que o insert, senao o comprador escreve 2.600
// caracteres e leva um erro de constraint depois de ter escrito tudo.
//
// Chaves de uma entrada:
//   key        nome do campo no rascunho (a API traduz para a coluna, inclusive os *_i18n)
//   tipo       um dos seis primitivos de 6.2, mais 'imagem', 'arquivo', 'botoes' e 'cor'
//   i18n       true quando o campo e traduzivel (vira {pt: valor}); a pilula PT|EN e fase 3
//   passo      1, 2 ou 3, ou 'fino'. Pode ser funcao de (valores) quando a ordem depende do
//              proprio conteudo, que e o caso do certificado em experiencia
//   feature    'custom' marca campo do bump de personalizacao (6.10)
//   dependeDe  o campo so nasce quando a funcao devolve true. E a regra do link_note, que so
//              existe depois que o link tem valor
//
// O QUE NAO ESTA AQUI, e por que: `summary` do projeto (nenhum componente o renderiza hoje,
// entao pedir o texto seria pedir trabalho que nao vira pagina) e a pilula PT|EN (fase 3, o
// ex() e o px() ja caem no PT sozinhos enquanto isso).

export const PASSOS_PROJETO = {
  1: 'O básico',
  2: 'O case',
  3: 'Provas',
  fino: 'Ajustes finos',
};

export const PASSOS_EXPERIENCIA = {
  1: 'O básico',
  2: 'A organização',
  3: 'Observação',
  fino: 'Ajustes finos',
};

export const PASSOS_PERFIL = {
  1: 'Quem é você',
  2: 'Contato e redes',
  3: 'A página',
  fino: 'Ajustes finos',
};

// PERFIL ---------------------------------------------------------------------
// A lista de colunas escrevivel aqui e um subconjunto do `grant update (...)` de 0002. Coluna
// que nao esta naquele grant responde 42501 no PATCH, ANTES de a RLS ser avaliada, e nenhuma
// interface consegue contornar isso, que e exatamente o objetivo do achado 2.
export const CAMPOS_PERFIL = [
  { key: 'hero', tipo: 'imagem', destino: 'hero', label: 'Sua foto grande', help: 'Aparece no topo. Corte 4:5, ate 120 KB.', passo: 1 },
  { key: 'avatar', tipo: 'imagem', destino: 'avatar', label: 'Foto pequena', help: 'A do cantinho. Quadrada, ate 25 KB.', passo: 1 },
  { key: 'display_name', tipo: 'texto', label: 'Seu nome', maxLength: 80, passo: 1, obrigatorio: true },
  { key: 'role', tipo: 'texto', i18n: true, label: 'O que você faz', help: 'Uma linha. Ex: "Desenvolvedor e criador de produtos".', maxLength: 160, passo: 1, obrigatorio: true },
  { key: 'bio', tipo: 'textarea', i18n: true, label: 'Sobre você', maxLength: 2000, passo: 1 },
  { key: 'hero_object_position', tipo: 'enquadramento', label: 'Enquadramento da foto', help: 'Sobe ou desce o corte da foto grande.', passo: 1 },

  { key: 'contact_email', tipo: 'texto', label: 'E-mail de contato', maxLength: 120, passo: 2 },
  { key: 'show_contact_email', tipo: 'switch', label: 'Mostrar o e-mail na página', help: 'Desligado, ele fica só aqui dentro.', passo: 2 },
  { key: 'cta_url', tipo: 'texto', label: 'Link do botão principal', help: 'Sua agenda, seu WhatsApp, o que você quiser. Precisa começar com https://', maxLength: 300, passo: 2 },
  { key: 'cta_label', tipo: 'texto', i18n: true, label: 'Texto do botão', maxLength: 40, passo: 2, feature: 'custom' },
  // socials e stats sao listas curtas de pares, editadas em BLOCO, uma por linha. Nao ganham
  // um construtor visual proprio na v1 de proposito: seriam o setimo e o oitavo primitivo de
  // um sistema que 6.2 fecha em seis, e o ganho sobre "rotulo | valor" e estetico.
  { key: 'socials', tipo: 'pares', label: 'Suas redes', help: 'Uma por linha, no formato: rótulo | texto ao lado | https://link', maxLength: 8, passo: 2 },
  { key: 'stats', tipo: 'pares', label: 'Números da capa', help: 'Um por linha, no formato: rótulo | valor', maxLength: 6, passo: 2 },

  // "Stacks" so faz sentido para quem escreve codigo. O campo continua sendo a mesma lista, e
  // o nome dela na pagina agora e escolha da pessoa (rotulo_stacks, logo abaixo).
  { key: 'stacks', tipo: 'chips', label: 'O que você usa no trabalho', help: 'Ferramentas, técnicas, materiais ou especialidades. Enter para adicionar.', maxLength: 40, passo: 3 },
  { key: 'show_online_dot', tipo: 'switch', label: 'Mostrar a bolinha de "disponível"', passo: 3 },
  { key: 'projects_video_first', tipo: 'switch', label: 'Projetos com vídeo primeiro', help: 'Case com vídeo converte mais. Ligado, eles sobem para o topo da grade.', passo: 3 },
  { key: 'projects_per_page', tipo: 'select', label: 'Projetos por página', opcoes: ['3', '4', '6', '8', '9', '12'], passo: 3 },
  { key: 'english_enabled', tipo: 'switch', label: 'Página em inglês', help: 'Na fase atual o conteúdo em inglês ainda não é editável: ligar isto serve para reservar o botão.', passo: 3 },

  // OS TITULOS DAS SECOES, escritos pela pessoa. Vazio = o texto padrao, que e o de hoje.
  //
  // Eles moram no passo 3 ("A página") e nao nos ajustes finos porque, para quem nao e
  // programador, trocar "Stacks Dominadas" por "Minhas especialidades" nao e ajuste fino: e a
  // diferenca entre a pagina falar a lingua dela ou a de outra profissao. O placeholder de
  // cada um mostra o padrao, entao ninguem precisa adivinhar o que acontece deixando vazio.
  { key: 'rotulo_stacks', tipo: 'texto', i18n: true, label: 'Título da seção de especialidades', help: 'Ex: "Minhas especialidades", "Técnicas da casa", "Áreas de atuação". Vazio, fica "Stacks Dominadas".', maxLength: 40, passo: 3 },
  { key: 'rotulo_projects', tipo: 'texto', i18n: true, label: 'Título da seção de trabalhos', help: 'Ex: "Meus pratos", "Ensaios", "Casos". Vazio, fica "Meus Projetos".', maxLength: 40, passo: 3 },
  { key: 'rotulo_cases', tipo: 'texto', i18n: true, label: 'Como você chama cada trabalho', help: 'Aparece no contador, no plural. Ex: "receitas", "ensaios", "tatuagens". Vazio, fica "cases".', maxLength: 40, passo: 3 },
  { key: 'rotulo_experience', tipo: 'texto', i18n: true, label: 'Título da seção de experiência', help: 'Ex: "Onde eu cozinhei", "Formação". Vazio, fica "Experiência".', maxLength: 40, passo: 3 },
  { key: 'rotulo_about', tipo: 'texto', i18n: true, label: 'Título do texto sobre você', help: 'Vazio, fica "Sobre".', maxLength: 40, passo: 3 },

  // Os quatro de dentro da janela de um trabalho. Ficam nos ajustes finos porque so aparecem
  // depois que o visitante clica num card.
  { key: 'rotulo_challenge', tipo: 'texto', i18n: true, label: 'Na janela do trabalho: primeiro bloco', help: 'Vazio, fica "O Desafio".', maxLength: 40, passo: 'fino' },
  { key: 'rotulo_solution', tipo: 'texto', i18n: true, label: 'Na janela do trabalho: segundo bloco', help: 'Vazio, fica "A Solução".', maxLength: 40, passo: 'fino' },
  { key: 'rotulo_features', tipo: 'texto', i18n: true, label: 'Na janela do trabalho: lista de itens', help: 'Ex: "O que está incluído", "O que fizemos". Vazio, fica "Recursos".', maxLength: 40, passo: 'fino' },
  { key: 'rotulo_stackLabel', tipo: 'texto', i18n: true, label: 'Na janela do trabalho: lista de ferramentas', help: 'Ex: "Ingredientes", "Equipamento". Vazio, fica "Stack".', maxLength: 40, passo: 'fino' },
  { key: 'rotulo_visit', tipo: 'texto', i18n: true, label: 'Na janela do trabalho: texto do link', help: 'Vazio, fica "Acessar".', maxLength: 40, passo: 'fino' },

  { key: 'avatar_shape', tipo: 'select', label: 'Formato da foto pequena', opcoes: [['circulo', 'Redonda'], ['oval', 'Oval']], passo: 'fino' },

  { key: 'seo_title', tipo: 'texto', i18n: true, label: 'Título no Google e no WhatsApp', maxLength: 70, passo: 'fino' },
  { key: 'seo_description', tipo: 'texto', i18n: true, label: 'Descrição no Google e no WhatsApp', maxLength: 180, passo: 'fino' },
  // O selo saiu do bump e subiu para o passo 1, junto com nome e profissao (migration 0014).
  // Ele e a segunda coisa que se le no card, e enquanto morava nos "ajustes finos" atras de
  // um cadeado o comprador so descobria que existia depois de publicar uma pagina que dizia
  // que ele e vibecoder.
  { key: 'badge_label', tipo: 'texto', label: 'Selo do seu perfil', help: 'Duas palavras que dizem o que você é. Ex: "Chef", "Advogada trabalhista", "Fotógrafo". Em branco, o selo não aparece.', maxLength: 24, passo: 1 },
  { key: 'badge_icon', tipo: 'select', label: 'Ícone do selo', opcoes: OPCOES_ICONE_SELO, passo: 1 },
  { key: 'theme_accent', tipo: 'cor', label: 'Cor de destaque', padrao: '#7C5CFC', passo: 'fino', feature: 'custom' },
  { key: 'theme_plate_bg', tipo: 'cor', label: 'Fundo das placas', padrao: '#0b0b12', passo: 'fino', feature: 'custom' },
];

// PROJETO --------------------------------------------------------------------
// Dezenove campos, QUATRO na primeira tela (6.3). Pedir os dezenove para cadastrar o primeiro
// projeto e o ponto exato onde o comprador fecha a aba. Ao digitar o nome, o card ja aparece
// na grade atras da gaveta, e o projeto ja e publicavel ao fim do passo 1.
export const CAMPOS_PROJETO = [
  { key: 'image', tipo: 'imagem', destino: 'project', label: 'Imagem do case', help: 'Corte 3:2, ate 90 KB.', passo: 1 },
  { key: 'name', tipo: 'texto', i18n: true, label: 'Nome do projeto', maxLength: 60, passo: 1, obrigatorio: true },
  { key: 'category', tipo: 'texto', i18n: true, label: 'Categoria', help: 'Ex: Landing page, Automação, App.', maxLength: 40, passo: 1, obrigatorio: true },
  { key: 'tagline', tipo: 'textarea', i18n: true, label: 'Uma frase sobre ele', maxLength: 280, passo: 1 },

  // Os rotulos do passo 2 sao PERGUNTAS de proposito: "Problema" faz a pessoa escrever um
  // substantivo, "O que estava travando antes?" faz ela contar a historia.
  { key: 'problem', tipo: 'textarea', i18n: true, label: 'O que estava travando antes?', maxLength: 2500, passo: 2 },
  { key: 'solution', tipo: 'textarea', i18n: true, label: 'O que você entregou?', maxLength: 2500, passo: 2 },
  { key: 'features', tipo: 'linhas', i18n: true, label: 'O que o sistema faz?', help: 'Um por linha, até 12.', maxLinhas: 12, maxLength: 200, passo: 2 },

  { key: 'video', tipo: 'youtube', label: 'Vídeo no YouTube', help: 'Cole o link como ele veio. Shorts, live e link curto funcionam.', passo: 3 },
  { key: 'link', tipo: 'texto', label: 'Link do projeto no ar', help: 'Precisa começar com https://', maxLength: 300, passo: 3 },
  { key: 'link_note', tipo: 'texto', i18n: true, label: 'Observação sobre o link', maxLength: 120, passo: 3, dependeDe: (v) => Boolean(v.link) },
  { key: 'stack', tipo: 'chips', i18n: true, label: 'Stack usada', maxLinhas: 16, maxLength: 60, passo: 3 },
  { key: 'tem_cliente', tipo: 'switch', label: 'Foi para um cliente', help: 'Desligado, o projeto é seu.', passo: 3 },
  { key: 'client', tipo: 'texto', label: 'Nome do cliente', maxLength: 60, passo: 3, dependeDe: (v) => Boolean(v.tem_cliente) },
  { key: 'year', tipo: 'select', label: 'Ano', opcoes: ANOS, passo: 3 },
  { key: 'groups', tipo: 'chips', label: 'Grupos de filtro', help: 'No máximo 4. É o que vira a barra de filtro da grade.', maxLinhas: 4, maxLength: 40, passo: 3 },

  { key: 'slug', tipo: 'texto', label: 'Endereço do case', help: 'Sai do nome sozinho. Só letras, números e hífen.', maxLength: 60, passo: 'fino' },
  // "Logo (com respiro)" e "Print (preenche a placa)" descreviam o portfolio de onde o produto
  // nasceu, onde todo trabalho e uma logo de cliente ou um screenshot de sistema. Um fotografo,
  // uma confeiteira e um tatuador sobem FOTO, e nenhuma das duas palavras dizia nada para eles.
  // A ordem tambem inverteu: preencher passou a ser o primeiro porque virou o padrao.
  { key: 'image_fit', tipo: 'select', label: 'Como a imagem se encaixa', opcoes: [['cover', 'Preencher o card'], ['contain', 'Caber inteira, com respiro']], passo: 'fino' },
  // Enquadramento, o mesmo controle que a foto do topo ja tinha. Ele so faz sentido quando a
  // imagem preenche o card: com "caber inteira" nao ha corte para reposicionar.
  { key: 'image_position', tipo: 'enquadramento', label: 'Enquadramento da imagem', help: 'Sobe ou desce o corte. Serve quando a imagem preenche o card.', passo: 'fino', dependeDe: (v) => v.image_fit !== 'contain' },
  { key: 'accent', tipo: 'cor', label: 'Cor de destaque do card', padrao: '#7C5CFC', passo: 'fino', feature: 'custom' },
  { key: 'plate_bg', tipo: 'cor', label: 'Fundo da placa', padrao: '#0b0b12', passo: 'fino', feature: 'custom' },
];

// EXPERIENCIA ----------------------------------------------------------------
// Quatro campos na primeira tela, pela mesma razao de 6.3, e um formulario SO para trabalho e
// para estudo. Isso nao e economia de esforco: e a consequencia direta da decisao de 4.7.1 de
// ter uma tabela unica com `kind`. Se o formulario de estudo pedisse uma coluna que o de
// trabalho nao tem, aquela decisao estaria errada, e o que precisaria ser reaberto seria ela.
export const LABEL_POR_KIND = {
  org: { work: 'Empresa', education: 'Instituição' },
  role: { work: 'Cargo', education: 'Curso ou formação' },
  role_help: { work: '', education: 'Ex: "Bacharelado em Design", "Certificação AWS".' },
  period_start: { work: 'Entrei em', education: 'Comecei em' },
  atual: { work: 'Estou aqui até hoje', education: 'Ainda estou cursando' },
  highlights: { work: 'O que você fez ali?', education: 'O que você estudou ou construiu ali?' },
};

const rotulo = (chave, valores) => LABEL_POR_KIND[chave][valores.kind === 'education' ? 'education' : 'work'];

export const CAMPOS_EXPERIENCIA = [
  { key: 'kind', tipo: 'botoes', label: 'Tipo', opcoes: [['work', 'Trabalho'], ['education', 'Estudo']], passo: 1 },
  { key: 'org', tipo: 'texto', label: (v) => rotulo('org', v), maxLength: 60, passo: 1, obrigatorio: true },
  { key: 'role', tipo: 'texto', i18n: true, label: (v) => rotulo('role', v), help: (v) => rotulo('role_help', v), maxLength: 80, passo: 1, obrigatorio: true },
  { key: 'period_start', tipo: 'periodo', label: (v) => rotulo('period_start', v), help: 'Ano (2024) ou mês e ano (03/2024).', passo: 1, obrigatorio: true },
  { key: 'atual', tipo: 'switch', label: (v) => rotulo('atual', v), passo: 1 },
  // period_end so nasce quando o switch e desligado, mesma regra do link_note.
  { key: 'period_end', tipo: 'periodo', label: 'Até', help: 'Ano (2025) ou mês e ano (11/2025).', passo: 1, dependeDe: (v) => !v.atual },

  { key: 'logo', tipo: 'imagem', destino: 'experience', label: 'Logo', help: 'Quadrada, até 90 KB. PNG com fundo transparente fica melhor.', passo: 2 },
  // A placa da logo recorta em quadrado de 56px, e ate aqui o corte era o centro geometrico,
  // fixo. Logo que nao esteja centrada no arquivo saia torta e nao havia como arrumar.
  { key: 'logo_position', tipo: 'enquadramento', label: 'Enquadramento da logo', help: 'Sobe ou desce o corte da logo dentro da placa.', passo: 'fino', dependeDe: (v) => Boolean(v.logo_path) },
  { key: 'location', tipo: 'texto', i18n: true, label: 'Onde', help: 'Ex: São Paulo, remoto.', maxLength: 60, passo: 2 },
  { key: 'highlights', tipo: 'linhas', i18n: true, label: (v) => rotulo('highlights', v), help: 'Um por linha, até 6.', maxLinhas: 6, maxLength: 300, passo: 2 },

  { key: 'note', tipo: 'textarea', i18n: true, label: 'Observação', help: 'O campo livre para contar a história.', maxLength: 700, passo: 3 },

  // O certificado SOBE para o passo 2 quando kind = 'education', porque nesse tipo de entrada
  // ele e a prova principal, e nao um anexo opcional do fim do formulario.
  { key: 'certificate', tipo: 'certificado', label: 'Certificado', passo: (v) => (v.kind === 'education' ? 2 : 3) },

  { key: 'slug', tipo: 'texto', label: 'Endereço da entrada', help: 'Sai da organização e do cargo. É a chave que amarra a tradução.', maxLength: 60, passo: 'fino' },
  { key: 'plate_bg', tipo: 'cor', label: 'Fundo da placa', padrao: '#0b0b12', passo: 'fino', feature: 'custom' },
];

// Campos traduziveis de experiencia, DERIVADOS do i18n acima e nunca de uma segunda lista
// escrita a mao: role, location, highlights, note e o rotulo do certificado. Nao traduzem org,
// kind, periodo, logo, plate_bg e slug, que e a mesma regra que o cabecalho de
// experience.en.js ja documenta ("nome de empresa e ano nao traduzem").
export const traduziveis = (campos) => campos.filter((c) => c.i18n).map((c) => c.key);

// Resolve rotulo/ajuda/passo que dependem do proprio conteudo.
export const resolver = (valor, valores) => (typeof valor === 'function' ? valor(valores) : valor);

export const camposDoPasso = (campos, passo, valores) =>
  campos.filter((c) => resolver(c.passo, valores) === passo && (!c.dependeDe || c.dependeDe(valores)));
