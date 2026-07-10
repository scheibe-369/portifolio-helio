// Projetos da Growth Hub. Campos opcionais: video (YouTube), link/linkNote (acesso externo),
// fit ('cover' p/ screenshots | default 'contain' p/ logos).
import { projectsEn } from './projects.en.js';
import { getLang } from '../../../app/i18n.js';

export const projects = [
  {
    slug: 'brasildtf',
    name: 'BrasilDTF',
    client: 'BrasilDTF',
    category: 'SaaS',
    year: '2025',
    accent: '#F2B705',
    plateBg: '#ffffff',
    image: '/projects/brasildtf.webp',
    video: 'https://youtu.be/Rj3TplIKEho',
    tagline:
      'SaaS de edição de imagem para o mercado DTF: halftone, remoção de fundo e geração por IA, via assinatura.',
    summary:
      'Plataforma self-service onde o cliente trata imagens para impressão DTF: aplica halftone, remove fundo e gera novas artes por IA, pagando por assinatura recorrente.',
    problem:
      'A impressão DTF (Direct to Film) depende de imagens bem tratadas: halftone calibrado, fundos removidos com precisão e artes novas sob demanda. Fazer isso manualmente, arquivo por arquivo, travava a operação dos clientes e gerava retrabalho constante.',
    solution:
      'Construímos um SaaS web em que o próprio cliente faz upload, aplica halftone, remove o fundo e gera imagens por IA em segundos. O acesso é por assinatura via Stripe, com limites e controle de uso por plano.',
    features: [
      'Halftone configurável para impressão DTF',
      'Remoção de fundo automática',
      'Geração de imagens por IA',
      'Assinaturas recorrentes via Stripe',
      'Controle de uso e limites por plano',
      'Histórico e galeria de processamentos do usuário',
    ],
    stack: ['Stripe (assinaturas)', 'Processamento de imagem', 'IA generativa', 'Autenticação de usuários', 'Web app'],
    link: 'https://stampai-joao-frontend.brasildtf.workers.dev/login',
    linkNote: 'Link provisório',
  },
  {
    slug: 'porceli',
    name: 'Porceli Co.',
    client: 'Porceli Co.',
    category: 'CRM',
    year: '2025',
    accent: '#8B73FF',
    plateBg: '#0d0d0d',
    image: '/projects/porceli.webp',
    tagline:
      'CRM multilogin para agência de marketing: prospecção, pipeline, agente de IA, financeiro e contratos.',
    summary:
      'Plataforma de gestão completa para agência: pipeline e kanban, agente de IA com métricas avançadas, prospecção ativa, financeiro, gestão de atividades e de contratos, integrada a Asaas e WhatsApp.',
    problem:
      'A agência operava com ferramentas desconectadas para prospecção, vendas, financeiro e contratos. Sem uma visão única, faltavam métricas confiáveis, cobranças escapavam e cada equipe trabalhava em silo.',
    solution:
      'Construímos um CRM multilogin sob medida que une prospecção, pipeline/kanban de vendas, gestão de atividades e de contratos, financeiro integrado ao Asaas e um agente de IA que apoia o atendimento e gera métricas avançadas, tudo conectado ao WhatsApp.',
    features: [
      'Multilogin com papéis e permissões',
      'Pipeline e kanban de vendas',
      'Sistema de prospecção ativa',
      'Agente de IA com métricas avançadas',
      'Financeiro integrado ao Asaas',
      'Gestão de atividades e de contratos',
      'Integração com WhatsApp',
    ],
    stack: ['CRM multi-tenant', 'Asaas API', 'WhatsApp API', 'Agente de IA', 'Dashboard de métricas', 'Gestão de contratos'],
  },
  {
    slug: 'manhattan-hotel',
    name: 'Manhattan Hotel',
    client: 'Manhattan Hotel',
    category: 'CRM',
    year: '2025',
    accent: '#7E9CD8',
    plateBg: '#020028',
    image: '/projects/hotel.webp',
    tagline:
      'CRM hoteleiro com pipeline, financeiro e um agente de IA que atende leads no Instagram e WhatsApp.',
    summary:
      'Sistema de gestão comercial para hotelaria: kanban de reservas, pipeline de vendas, financeiro e um agente de IA que conversa com hóspedes nas redes e consulta a disponibilidade de quartos em tempo real.',
    problem:
      'A operação comercial vivia espalhada: mensagens no Instagram e WhatsApp sem registro, reservas em planilhas e nenhuma visão de funil ou financeiro. Leads esfriavam pela demora na resposta e a equipe não sabia a real disponibilidade de quartos na hora de fechar.',
    solution:
      'Centralizamos tudo em um CRM com kanban e pipeline, módulo financeiro e um agente de IA integrado ao Instagram e ao WhatsApp, que atende e qualifica o lead e consulta, via API, o sistema de gestão de quartos e suítes para responder disponibilidade e fechar reservas.',
    features: [
      'Kanban de reservas e atendimento',
      'Pipeline de vendas por etapas',
      'Módulo financeiro',
      'Agente de IA no Instagram e WhatsApp',
      'Integração via API com a gestão de quartos/suítes',
      'Consulta de disponibilidade em tempo real',
    ],
    stack: ['Agente de IA', 'WhatsApp API', 'Instagram API', 'Integração com PMS', 'CRM / Pipeline', 'Módulo financeiro'],
  },
  {
    slug: 'newcar',
    name: 'NewCar',
    client: 'NewCar Automóveis',
    category: 'Agente de IA',
    year: '2024',
    accent: '#E5362F',
    plateBg: '#00192a',
    image: '/projects/newcar.webp',
    tagline:
      'Agente de IA que atende, qualifica e distribui leads de uma revenda de carros, direto no WhatsApp.',
    summary:
      'Atendente virtual no WhatsApp que conversa com o interessado, consulta o estoque real de veículos, envia fotos, entende áudios e só repassa para o vendedor os leads realmente qualificados.',
    problem:
      'A revenda recebia um volume alto de contatos no WhatsApp, a maioria desqualificada. Vendedores gastavam tempo respondendo curiosos e procurando fotos no estoque, enquanto os bons leads esperavam.',
    solution:
      'Criamos um agente de IA que atende 24/7 no WhatsApp: entende texto e áudio, consulta o banco de dados de veículos para saber o que há em estoque, envia fotos do carro certo, qualifica o interesse e descarta quem não é lead, repassando ao vendedor humano apenas as oportunidades quentes.',
    features: [
      'Atendimento 24/7 no WhatsApp',
      'Consulta ao banco de dados de veículos em estoque',
      'Envio automático de fotos dos carros',
      'Transcrição e entendimento de áudios',
      'Qualificação e descarte automático de leads',
      'Repasse de leads quentes para o vendedor',
    ],
    stack: ['Agente de IA (LLM)', 'WhatsApp API', 'Transcrição de áudio (STT)', 'Banco de dados de estoque', 'Qualificação de leads'],
  },
  {
    slug: 'maternaforte',
    name: 'MaternaForte',
    client: 'MaternaForte',
    category: 'SaaS / Plataforma Web',
    year: '2025',
    accent: '#C96A41',
    plateBg: '#fdf4ef',
    image: '/projects/maternaforte.webp',
    video: 'https://youtu.be/jwuYRA94UuU',
    tagline: 'Site e área de membros multiprofissional para o programa MaternaForte.',
    summary:
      'Plataforma de conteúdo e acompanhamento para o produto MaternaForte, com login segmentado por tipo de profissional, aulas em vídeo e pagamentos integrados.',
    problem:
      'O MaternaForte reúne médicos, personal trainers, psicólogos e alunas no mesmo programa, e cada perfil precisa ver coisas diferentes. Era preciso um ambiente único que vendesse o produto, liberasse acesso após o pagamento e organizasse o conteúdo por tipo de profissional.',
    solution:
      'Entregamos o site de venda e uma área de membros com multilogin por papel (médico, personal, psicólogo, aluna), aulas em vídeo organizadas por trilha e liberação de acesso integrada ao gateway de pagamento.',
    features: [
      'Site de apresentação e venda',
      'Área de membros com aulas em vídeo',
      'Multilogin por papel (médico, personal, psicólogo, aluna)',
      'Controle de acesso e conteúdo por perfil',
      'Integração com gateway de pagamento',
      'Liberação automática de acesso após a compra',
    ],
    stack: ['Autenticação multi-perfil', 'Área de membros', 'Streaming de aulas em vídeo', 'Gateway de pagamento', 'Web app'],
    link: 'https://maternaforte-landing.pages.dev',
    linkNote: 'Link de amostragem',
  },
  {
    slug: 'previa',
    name: 'Previa',
    client: 'Previa',
    category: 'Automação / Cobrança',
    year: '2025',
    accent: '#D11F36',
    plateBg: '#ffffff',
    image: '/projects/previa.webp',
    video: 'https://youtu.be/nE1K4U8VSBQ',
    tagline: 'Geração e disparo automático de boletos via WhatsApp e e-mail, sem intervenção manual.',
    summary:
      'Sistema de cobrança totalmente automatizado: consulta a API do cliente para puxar as contas pendentes, gera o boleto de cada devedor e dispara por WhatsApp Business API e e-mail, com tratamento de erro, retry e confirmação de entrega.',
    problem:
      'Processar cobrança manualmente em uma base grande de clientes é lento, sujeito a erro e não escala: boletos gerados um a um e disparos sem rastreio de entrega.',
    solution:
      'Desenhei e construí toda a integração: o sistema consulta a API do cliente para trazer as contas em aberto, gera os boletos automaticamente e dispara por WhatsApp e e-mail, sem intervenção manual, com tratamento de erros, lógica de retry e rastreamento de confirmação de entrega desde o início.',
    features: [
      'Consulta a API do cliente (contas pendentes)',
      'Geração automática de boletos por devedor',
      'Disparo por WhatsApp Business API e e-mail',
      'Operação sem intervenção manual',
      'Tratamento de erros e lógica de retry',
      'Rastreamento de confirmação de entrega',
    ],
    stack: ['Node.js', 'TypeScript', 'WhatsApp Business API', 'REST APIs', 'PostgreSQL'],
  },
  {
    slug: 'ai-agents-playground',
    name: 'AI Agents Playground',
    client: 'Growth Hub',
    category: 'Agentes de IA',
    year: '2025',
    accent: '#7C5CFC',
    fit: 'cover',
    image: '/projects/agents.webp',
    video: 'https://youtu.be/lB_ZH0cKZf8',
    link: 'https://agentes.methodgrowthhub.com.br',
    tagline: 'Sandbox online para testar 6 agentes de IA de nível produção, cada um especializado em um nicho.',
    summary:
      'Um playground onde o usuário conversa com 6 agentes de IA de segmentos diferentes (reservas de motel, imobiliária, varejo de iPhone, revenda de carros e petshop). Cada agente tem arquitetura de prompt própria, alterna entre PT e EN e aceita envio de imagens na conversa.',
    problem:
      'Mostrar na prática como um agente de IA atende em cada nicho, e liberar acessos temporários para demos de clientes sem deixar logins abertos para sempre.',
    solution:
      'Construí sozinho a plataforma, os agentes, o painel admin e o controle de acesso: cada agente roda em uma arquitetura de prompt sob medida para o seu setor, aceita envio de fotos na conversa e alterna PT/EN. O admin cria logins temporários com data de expiração, que removem o acesso automaticamente quando o trial acaba, ideal para demos e apresentações de venda.',
    features: [
      '6 agentes de IA por nicho (motel, imobiliária, iPhone, carros, petshop)',
      'Arquitetura de prompt própria por setor',
      'Envio de imagens na conversa',
      'Alterna entre PT e EN',
      'Painel admin com logins temporários que expiram sozinhos',
      'Feito para demos e apresentações de venda',
    ],
    stack: ['Next.js', 'TypeScript', 'OpenAI API', 'PostgreSQL', 'Prompt Engineering'],
  },
  {
    slug: 'growth-hub-site',
    name: 'Site Growth Hub',
    client: 'Growth Hub',
    category: 'Website',
    year: '2025',
    accent: '#8B5CF6',
    fit: 'cover',
    image: '/projects/growth-hub-cover.webp',
    video: 'https://youtu.be/ZWsXiQ96Rlw',
    link: 'https://methodgrowthhub.com.br',
    tagline: 'Site institucional de uma agência de tecnologia, do zero, com foco em impacto visual e credibilidade técnica.',
    summary:
      'Website bilíngue (PT/EN) com hero 3D, uma imagem de robô gerada por IA que se desfaz em partículas no hover (WebGL + sistema de partículas próprio), cases reais de clientes, seção de arquitetura de serviços e integração com WhatsApp para contato direto.',
    problem:
      'A agência precisava de um site que transmitisse impacto visual e credibilidade técnica logo de cara, não apenas mais um institucional genérico.',
    solution:
      'Construí o site do zero, com um hero em WebGL onde a imagem do robô se desintegra em partículas no hover (mapeando os pixels da imagem e espalhando no movimento do mouse), bilíngue PT/EN, com cases reais, seção de serviços e contato direto via WhatsApp.',
    features: [
      'Hero 3D: robô que vira partículas no hover (WebGL)',
      'Sistema de partículas próprio (mapeia os pixels da imagem)',
      'Bilíngue PT/EN',
      'Cases reais de clientes',
      'Seção de arquitetura de serviços',
      'Integração com WhatsApp para contato direto',
    ],
    stack: ['Next.js 15', 'TypeScript', 'Tailwind CSS', 'Three.js', 'Framer Motion', 'Vercel'],
  },
  {
    slug: 'token-cost-calculator',
    name: 'AI Token Cost Calculator',
    client: 'Growth Hub',
    category: 'Ferramenta IA',
    year: '2025',
    accent: '#7C5CFC',
    fit: 'cover',
    image: '/projects/token.webp',
    video: 'https://youtu.be/hUPErH-prS0',
    link: 'https://contagem-tokens.methodgrowthhub.com.br',
    tagline: 'Simule o custo de agentes de IA antes de colocar em produção, saiba o preço por conversa antes da fatura chegar.',
    summary:
      'Ferramenta web que prevê o custo de agentes de IA: o usuário simula fluxos completos de conversa (system prompt, mensagens e tool calls) nos principais modelos (OpenAI, Claude, Gemini) e vê o uso de tokens e o custo projetado por interação.',
    problem:
      'A maioria dos times só descobre o custo real de LLM depois que a fatura chega, e calculadoras ingênuas ainda ignoram o overhead das tool calls.',
    solution:
      'Criei sozinho (do design ao deploy) uma ferramenta que simula a conversa inteira nos principais modelos, mostrando tokens e custo projetado por interação, contabilizando o overhead das tool calls, permitindo importar arquivos de conversa e com um motor de recomendação que aponta o melhor modelo em custo-benefício para o caso de uso.',
    features: [
      'Simula fluxos completos (system prompt, mensagens, tool calls)',
      'Compara os principais modelos (OpenAI, Claude, Gemini)',
      'Mostra tokens e custo projetado por interação',
      'Contabiliza o overhead das tool calls',
      'Importação de arquivos de conversa',
      'Motor de recomendação de melhor custo-benefício',
    ],
    stack: ['Next.js', 'TypeScript', 'Tailwind CSS', 'Cloudflare'],
  },
  {
    slug: 'sistema-goat',
    name: 'Sistema GOAT',
    client: 'Growth Hub',
    category: 'Plataforma / CRM',
    year: '2025',
    accent: '#7C5CFC',
    fit: 'cover',
    image: '/projects/goat.webp',
    video: 'https://youtu.be/kj62cah0MFU',
    link: 'https://sistemagoat.methodgrowthhub.com.br',
    linkNote: 'Demo com dados fictícios',
    tagline: 'Plataforma all-in-one de gestão para agência: substitui várias ferramentas soltas por um sistema único.',
    summary:
      'Plataforma completa de operações para uma agência digital, com dashboard de métricas financeiras, gestão de clientes, pipeline de vendas (Kanban CRM), contratos e assinaturas, financeiro, conversas de WhatsApp integradas ao CRM e um agente SDR de prospecção com IA.',
    problem:
      'A agência operava com várias ferramentas desconectadas para vendas, atendimento, contratos e financeiro, sem uma visão única e sem conseguir escalar.',
    solution:
      'Arquitetei, desenvolvi e fiz o deploy ponta a ponta de um sistema único: dashboard financeiro, clientes, pipeline kanban, contratos/assinaturas, financeiro (receitas, despesas, fluxo de caixa), conversas de WhatsApp dentro do CRM e um agente SDR de IA para prospecção, com autenticação segura, acesso por papéis e suporte multiusuário, feito para escalar com a agência.',
    features: [
      'Dashboard com métricas financeiras',
      'Gestão de clientes',
      'Pipeline de vendas (Kanban CRM)',
      'Contratos e assinaturas',
      'Financeiro (receitas, despesas, fluxo de caixa)',
      'Conversas de WhatsApp integradas ao CRM',
      'Agente SDR de IA para prospecção',
      'Autenticação por papéis e multiusuário',
    ],
    stack: ['Next.js', 'TypeScript', 'PostgreSQL', 'WhatsApp API'],
  },
  {
    slug: 'pipeline-video-ia',
    name: 'Pipeline de Vídeo com IA',
    client: 'Growth Hub',
    category: 'Automação / IA',
    year: '2025',
    accent: '#7C5CFC',
    fit: 'cover',
    image: '/projects/pipeline-video-ia.webp',
    tagline: 'Manda a ideia no Telegram e o vídeo é criado por IA e publicado sozinho.',
    summary:
      'Você envia uma ideia de vídeo com uma imagem de referência no Telegram. Um agente monta o prompt mestre, o Google Veo gera o vídeo, e o fluxo publica nas redes, te devolve o vídeo pronto no Telegram e registra tudo num dashboard.',
    problem:
      'Criar e publicar vídeo com IA na mão dá trabalho: escrever um prompt bom, gerar, baixar, subir nas redes e ainda acompanhar. Muito passo manual.',
    solution:
      'Montei um pipeline ponta a ponta no n8n: o Telegram recebe a ideia e a imagem, a IA escreve o prompt mestre otimizado, o Veo gera o vídeo e o fluxo publica nas redes, devolve o vídeo no Telegram e loga tudo num dashboard em tempo real.',
    features: [
      'Recebe a ideia e a imagem pelo Telegram',
      'IA monta o prompt mestre otimizado',
      'Geração de vídeo com Google Veo',
      'Publicação automática nas redes',
      'Devolve o vídeo pronto no Telegram',
      'Registra tudo num dashboard em tempo real',
    ],
    stack: ['n8n', 'Telegram API', 'Google Veo', 'LLM (geração de prompt)'],
  },
  {
    slug: 'chatbot-clinicas',
    name: 'Chatbot para Clínicas',
    client: 'Growth Hub',
    category: 'Chatbot / Automação',
    year: '2024',
    accent: '#2563EB',
    fit: 'cover',
    image: '/projects/chatbot-clinicas.webp',
    tagline: 'Chatbot de IA que atende e agenda no WhatsApp, Instagram e Facebook, tudo num fluxo só.',
    summary:
      'Chatbot para clínicas de saúde e estética que junta o atendimento das três redes num lugar só: responde de forma personalizada, agenda consultas com lembrete no calendário, envia vídeos, imagens e documentos para o paciente, contorna objeções e ainda captura e qualifica leads.',
    problem:
      'A clínica vive respondendo as mesmas perguntas no WhatsApp, Instagram e Facebook, e perde agendamento pela demora. A recepção não dá conta de tudo.',
    solution:
      'Montei o fluxo de conversa completo: atende nas três redes a partir de um único lugar, agenda com lembrete integrado ao calendário, dispara mídia e documentos para o paciente, tem caminhos para contornar objeção e captura e qualifica os leads. A recepção foca no paciente e o bot cuida do resto. Perfeito para clínicas odontológicas, estéticas e médicas.',
    features: [
      'Atende no WhatsApp, Instagram e Facebook num fluxo só',
      'Respostas personalizadas e automáticas',
      'Agendamento com lembrete no calendário',
      'Envio de vídeos, imagens e documentos',
      'Caminhos para contornar objeções',
      'Captura e qualificação de leads',
    ],
    stack: ['ManyChat', 'WhatsApp API', 'Integração com calendário'],
  },
  {
    slug: 'automacao-financeira-asaas',
    name: 'Automação Financeira (Asaas)',
    client: 'Growth Hub',
    category: 'Automação / Cobrança',
    year: '2025',
    accent: '#10B981',
    fit: 'cover',
    image: '/projects/automacao-financeira-asaas.webp',
    tagline: 'Lembrete de pagamento automático por WhatsApp e e-mail, integrado ao Asaas.',
    summary:
      'Automação financeira ligada ao Asaas que roda dois fluxos: um se antecipa avisando das contas perto de vencer, e outro corre atrás das vencidas com uma cadência de follow-up inteligente. Toda mensagem é montada na hora, conforme o contexto.',
    problem:
      'Cobrar na mão é furada: o cliente esquece de pagar antes do vencimento e a inadimplência cresce porque ninguém faz o follow-up certo.',
    solution:
      'Montei dois fluxos paralelos no n8n integrados ao Asaas: um avisa o cliente antes do vencimento e outro persegue o boleto vencido com uma cadência inteligente. Cada mensagem é formatada dinamicamente, então todo envio sai personalizado e profissional, no WhatsApp e no e-mail.',
    features: [
      'Integração com o Asaas',
      'Fluxo de lembrete antes do vencimento',
      'Fluxo de cobrança de vencidos com follow-up inteligente',
      'Mensagens montadas na hora, conforme o contexto',
      'Dois canais em paralelo: WhatsApp e e-mail',
    ],
    stack: ['n8n', 'Asaas API', 'WhatsApp Business API', 'E-mail'],
  },
  {
    slug: 'infra-agentes-ia',
    name: 'Infraestrutura de Agentes de IA',
    client: 'Growth Hub',
    category: 'Infraestrutura / IA',
    year: '2025',
    accent: '#06B6D4',
    fit: 'cover',
    image: '/projects/infra-agentes-ia.webp',
    tagline: 'Base para rodar agentes de IA com roteamento inteligente e camada anti-alucinação.',
    summary:
      'Uma infraestrutura central de agentes de IA para a operação interna e para clientes que exigem controle e confiabilidade altos. Tem gestão de estado robusta e um roteador inteligente que distribui e orquestra os fluxos, com o foco em prevenir alucinação e proteger a informação.',
    problem:
      'Agente de IA solto, sem controle, alucina e vaza informação, e isso não dá para aceitar em operação crítica.',
    solution:
      'Desenhei a arquitetura, a gestão de estado, o roteador e a camada de segurança: um roteador inteligente distribui e orquestra os fluxos, e tudo é montado em torno de prevenir alucinação e proteger a informação, para dar para confiar no agente onde não pode dar erro.',
    features: [
      'Gestão de estado robusta',
      'Roteador inteligente que distribui e orquestra os fluxos',
      'Arquitetura focada em prevenir alucinação',
      'Camada de segurança da informação',
      'Base confiável para ambientes críticos',
    ],
    stack: ['Cloudflare Workers', 'TypeScript', 'n8n', 'Orquestração de agentes própria'],
  },
  {
    slug: 'damascena-films',
    name: 'Damascena Films',
    client: 'Damascena Films',
    category: 'Landing Page',
    year: '2026',
    accent: '#2F6BFF',
    fit: 'cover',
    image: '/projects/damascena-films.webp',
    video: 'https://youtu.be/_LGj734-vew',
    link: 'https://damascenafilms.com.br',
    linkNote: 'Em finalização (aguardando os ajustes finais do cliente)',
    tagline: 'Landing de um filmmaker da Região dos Lagos: vídeo com estética de cinema e cabeça de estratégia.',
    summary:
      'Página para o Marcos, filmmaker por trás da Damascena Films, apresentar e vender o trabalho de forma elegante e profissional: a ideia de "imagem com intenção", os serviços, os cases e o contato. Vídeo que vira posicionamento, autoridade e venda, não vídeo bonito que não leva a lugar nenhum.',
    problem:
      'O Marcos precisava de uma vitrine à altura do trabalho dele: algo que vendesse a produção audiovisual de forma elegante e mostrasse os projetos, sem parecer mais um portfólio genérico.',
    solution:
      'Construí a landing com a linguagem da marca e estética de cinema: hero forte, serviços (conteúdo para redes, institucional e branded, cobertura de evento e edição estratégica), seção de cases com lightbox, processo, FAQ e contato direto por WhatsApp. Ainda está em finalização, esperando o cliente fechar os textos e números finais.',
    features: [
      'Hero com a proposta da marca ("imagem com intenção")',
      'Serviços: conteúdo para redes, institucional/branded, evento e edição',
      'Seção de cases com lightbox',
      'Processo e FAQ',
      'Contato direto por WhatsApp e Cal.com',
      'Estética de cinema, mobile-first',
    ],
    stack: ['Astro', 'TypeScript', 'Tailwind CSS'],
  },
  {
    slug: 'indicacao-marcos',
    name: 'Landing de Indicação',
    client: 'Growth Hub',
    category: 'Landing Page',
    year: '2026',
    accent: '#7C5CFC',
    fit: 'cover',
    image: '/projects/indicacao-marcos.webp',
    video: 'https://youtu.be/rItFfYZCH_k',
    link: 'https://indicacaomarcos.methodgrowthhub.com.br',
    tagline: 'Landing de indicação só por convite, com captura de leads que converte mais que formulário comum.',
    summary:
      'Uma página premium e só por convite para o cliente indicar novos negócios: ele compartilha o link com os prospects e cria um ponto de entrada de alta confiança, que converte muito mais que um formulário genérico.',
    problem:
      'Formulário de indicação genérico não passa confiança e converte pouco, e o lead indicado não chega qualificado nem vai direto pro time de vendas.',
    solution:
      'Desenhei e construí a página inteira, as animações e a integração do formulário: visual dark com partículas animadas, transições no scroll e prova social (depoimentos e números). Um formulário multi-etapas embutido captura o lead qualificado e o manda direto pro time de vendas, tudo mobile-first e rápido.',
    features: [
      'Página só por convite, de alta confiança',
      'Visual dark com partículas animadas',
      'Transições disparadas no scroll',
      'Prova social: depoimentos e métricas',
      'Formulário multi-etapas que captura leads qualificados',
      'Roteia o lead direto pro time de vendas',
      'Mobile-first e carregamento rápido',
    ],
    stack: ['Next.js', 'TypeScript', 'Framer Motion', 'Tailwind CSS'],
  },
  {
    slug: 'brasil-dtf-impressoras',
    name: 'Brasil DTF Impressoras',
    client: 'Brasil DTF',
    category: 'Landing Page',
    year: '2026',
    accent: '#F2B705',
    plateBg: '#0B1220',
    image: '/projects/brasildtf-impressoras.webp',
    video: 'https://youtu.be/iS_OtZVSeWE',
    tagline:
      'Landing page de catálogo das impressoras DTF e UV-DTF da Brasil DTF — da iniciante A3 à industrial de 5 cabeças, com guia de escolha e contato direto no WhatsApp.',
    summary:
      'Página de conversão que funciona como um menu das máquinas da Brasil DTF: apresenta as 7 impressoras segmentadas por perfil de comprador, com um guia "qual máquina é pra você?", seção de parceria (garantia, treinamento, suporte e insumos), FAQ e CTAs diretos para o WhatsApp.',
    problem:
      'A Brasil DTF precisava de uma vitrine única para sua linha de impressoras DTF e UV-DTF: um lugar onde o comprador entende as diferenças entre os modelos, encontra a máquina certa para o seu momento e fala com a equipe sem fricção, em vez de tirar dúvidas espalhadas.',
    solution:
      'Construímos uma landing page focada em conversão: um catálogo das 7 máquinas segmentado por perfil (começando agora, pequeno negócio, produção 60cm, alto volume e UV/rótulos), um guia interativo que recomenda a máquina ideal, seção de parceria (garantia, treinamento, suporte por WhatsApp, insumos abertos e condições facilitadas), FAQ e CTAs diretos para o WhatsApp. Visual forte com tipografia Bebas Neue, efeito metal-shine e cards com brilho no hover, mobile-first.',
    features: [
      'Catálogo das 7 impressoras DTF e UV-DTF',
      'Segmentação por perfil de comprador',
      'Guia interativo "qual máquina é pra você?"',
      'Seção de parceria: garantia, treinamento, suporte e insumos',
      'FAQ e CTAs diretos para o WhatsApp',
      'Visual com Bebas Neue, efeito metal-shine e cards com glow',
    ],
    stack: ['Astro', 'TypeScript', 'Tailwind CSS', 'Sharp'],
    link: 'https://brasildtfimpressoras.com.br',
  },
];

// Grupos do filtro (chave estável + label traduzível). Um projeto pode estar em vários.
export const FILTER_GROUPS = [
  { key: 'agentes-ia', label: { pt: 'Agentes IA', en: 'AI Agents' } },
  { key: 'sistemas', label: { pt: 'Sistemas', en: 'Systems' } },
  { key: 'websites', label: { pt: 'Websites', en: 'Websites' } },
  { key: 'automacao', label: { pt: 'Automação', en: 'Automation' } },
];

export const projectGroups = {
  brasildtf: ['sistemas'],
  'brasil-dtf-impressoras': ['websites'],
  porceli: ['sistemas', 'agentes-ia'],
  'manhattan-hotel': ['sistemas', 'agentes-ia'],
  newcar: ['agentes-ia'],
  maternaforte: ['websites', 'sistemas'],
  previa: ['automacao'],
  'ai-agents-playground': ['agentes-ia'],
  'growth-hub-site': ['websites'],
  'token-cost-calculator': ['sistemas'],
  'sistema-goat': ['sistemas', 'agentes-ia'],
  'pipeline-video-ia': ['automacao', 'agentes-ia'],
  'chatbot-clinicas': ['agentes-ia', 'automacao'],
  'automacao-financeira-asaas': ['automacao'],
  'infra-agentes-ia': ['agentes-ia', 'sistemas'],
  'damascena-films': ['websites'],
  'indicacao-marcos': ['websites'],
};

// Resolve um campo traduzível do projeto (EN via projects.en.js quando o idioma é EN).
export const px = (p, field) => {
  if (getLang() === 'en') {
    const v = projectsEn[p.slug] && projectsEn[p.slug][field];
    if (v != null && v !== '') return v; // '' não conta como tradução: cai no PT
  }
  return p[field];
};
