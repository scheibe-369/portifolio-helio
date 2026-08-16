// As 10 personas do teste de nicho. Fonte unica, usada pelo script de sessao, pelos agentes
// que preenchem o editor e pelo script de limpeza.
//
// POR QUE ELAS EXISTEM: o template do produto nasceu do portfolio de um dev e nunca foi
// vestido por outra profissao. Cada persona aqui foi escolhida para estressar uma hipotese
// diferente que o template nunca testou, e nao para "ficar bonita". O campo `estressa` diz o
// que cada uma existe para quebrar, e e por ele que se julga se o teste valeu.
//
// POR QUE O E-MAIL E ALIAS DO GMAIL DO DONO: nenhum e-mail chega a ser enviado (a sessao sai
// por generateLink, que devolve o codigo sem disparar mensagem), mas se algum dia disparar,
// cai numa caixa que existe e que e do dono, em vez de bater num dominio inventado que o Auth
// pode recusar.
//
// POR QUE O SLUG LEVA `demo-`: `demo` sozinho e rotulo reservado (worker/lib/reservados.js),
// e a checagem la e de igualdade exata, entao `demo-chef` passa. O prefixo tambem e o que o
// script de limpeza usa para achar o que apagar, e o que marca a pagina como noindex.
export const DEMOS = [
  {
    slug: 'demo-chef',
    email: 'heliomonteiro164+demochef@gmail.com',
    nome: 'Marina Salgueiro',
    profissao: 'Chef de cozinha',
    role: 'Cozinha de raiz brasileira · Menu autoral · Salvador, BA',
    paleta: { accent: '#E8833A', plate: '#1A1008', nome: 'ambar' },
    fotoBusca: 'brazilian female chef portrait kitchen',
    trabalhoBusca: 'plated food fine dining',
    estressa: 'Trabalho sem "link no ar": prato nao tem URL. Imagem quadrada num campo que corta 3:2.',
  },
  {
    slug: 'demo-advogada',
    email: 'heliomonteiro164+demoadv@gmail.com',
    nome: 'Renata Vasconcelos',
    profissao: 'Advogada trabalhista',
    role: 'Direito do Trabalho · Contencioso e consultivo · Belo Horizonte, MG',
    paleta: { accent: '#C9A227', plate: '#0B1220', nome: 'ouro' },
    fotoBusca: 'brazilian female lawyer portrait office',
    trabalhoBusca: 'law office documents desk',
    estressa: 'Trabalho SEM IMAGEM NENHUMA: caso juridico nao tem print. A grade exige imagem em todo card.',
  },
  {
    slug: 'demo-fotografo',
    email: 'heliomonteiro164+demofoto@gmail.com',
    nome: 'Caio Bertolini',
    profissao: 'Fotógrafo documental',
    role: 'Documental · Ensaio · Editorial · São Paulo, SP',
    paleta: { accent: '#FFFFFF', plate: '#0A0A0A', nome: 'monocromatico' },
    fotoBusca: 'male photographer portrait camera',
    trabalhoBusca: 'documentary photography street',
    estressa: 'So imagem e quase nenhum texto. Retrato 2:3 e panoramica num crop 3:2 fixo.',
  },
  {
    slug: 'demo-personal',
    email: 'heliomonteiro164+demopersonal@gmail.com',
    nome: 'Diego Aranha',
    profissao: 'Personal trainer',
    role: 'Treino de força · Recomposição corporal · Online e presencial',
    paleta: { accent: '#B6FF3C', plate: '#0D1207', nome: 'limao' },
    fotoBusca: 'personal trainer portrait gym',
    trabalhoBusca: 'strength training gym workout',
    estressa: 'VIDEO VERTICAL (Shorts). O banco tem youtube_orientation e o modal cravou aspect-video.',
  },
  {
    slug: 'demo-arquiteta',
    email: 'heliomonteiro164+demoarq@gmail.com',
    nome: 'Helena Kuroda',
    profissao: 'Arquiteta',
    role: 'Residencial · Reforma · Interiores · Curitiba, PR',
    paleta: { accent: '#A67C52', plate: '#14110E', nome: 'terra' },
    fotoBusca: 'female architect portrait studio',
    trabalhoBusca: 'minimalist architecture interior',
    estressa: 'Pede estetica CLARA. O produto e preto absoluto e o glassmorphism e branco sobre preto.',
  },
  {
    slug: 'demo-psicologa',
    email: 'heliomonteiro164+demopsi@gmail.com',
    nome: 'Bianca Fontes',
    profissao: 'Psicóloga clínica',
    role: 'Terapia cognitivo-comportamental · Adultos · Atendimento online',
    paleta: { accent: '#C4A7E7', plate: '#141021', nome: 'lavanda' },
    fotoBusca: 'female psychologist portrait office',
    trabalhoBusca: 'calm therapy room interior',
    estressa: 'ZERO PROJETOS: a profissao nao tem portfolio de trabalhos. A secao nao tem guarda de vazio.',
  },
  {
    slug: 'demo-musica',
    email: 'heliomonteiro164+demomusica@gmail.com',
    nome: 'Vitória Alencar',
    profissao: 'Produtora musical',
    role: 'Produção musical · Mixagem · Trilha · Recife, PE',
    paleta: { accent: '#FF3FA4', plate: '#12071A', nome: 'magenta' },
    fotoBusca: 'female music producer studio portrait',
    trabalhoBusca: 'music studio mixing console',
    estressa: 'O trabalho e AUDIO. So existe embed de YouTube; Spotify e SoundCloud nao entram.',
  },
  {
    slug: 'demo-confeitaria',
    email: 'heliomonteiro164+democonf@gmail.com',
    nome: 'Sônia Prazeres',
    profissao: 'Confeiteira',
    role: 'Bolos artesanais e doces de festa · Encomendas · Niterói, RJ',
    paleta: { accent: '#FF8FA3', plate: '#1B0F14', nome: 'rosa' },
    fotoBusca: 'female baker portrait bakery',
    trabalhoBusca: 'decorated cake dessert',
    estressa: 'CTA e WhatsApp e preco, nao "Agendar Call". O rotulo do botao e fixo no componente.',
  },
  {
    slug: 'demo-professor',
    email: 'heliomonteiro164+demoprof@gmail.com',
    nome: 'Adriano Peçanha',
    profissao: 'Professor de concursos',
    role: 'Direito Constitucional para concursos · Aprovações · Brasília, DF',
    paleta: { accent: '#4C9AFF', plate: '#0A1020', nome: 'azul' },
    fotoBusca: 'male teacher portrait classroom',
    trabalhoBusca: 'classroom lecture students',
    estressa: 'Muitas experiencias e poucos trabalhos. O certificado e o centro, nao o acessorio.',
  },
  {
    slug: 'demo-tattoo',
    email: 'heliomonteiro164+demotattoo@gmail.com',
    nome: 'Rafa Ximenes',
    profissao: 'Tatuador',
    role: 'Blackwork e fineline · Estúdio próprio · Porto Alegre, RS',
    paleta: { accent: '#FF4D4D', plate: '#0F0A0A', nome: 'sangue' },
    fotoBusca: 'tattoo artist portrait studio',
    trabalhoBusca: 'blackwork tattoo arm',
    estressa: 'Galeria vertical pura. Instagram e O canal, nao mais um item na lista de redes.',
  },
];

export const porSlug = (slug) => DEMOS.find((d) => d.slug === slug);
