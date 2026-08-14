// Experiências (fonte: currículo do Helio). Ordem = mais recente primeiro.
//
// Este formato é de propósito o mesmo que a versão vendida do portfólio vai guardar no
// banco, um campo por coluna, para o dia da migração ser um seed e não uma reescrita.
//
// Campos:
//   slug         chave estável, também usada para achar a tradução em experience.en.js
//   org          nome da empresa, faculdade ou instituição
//   kind         'work' (trabalho) | 'education' (faculdade, curso, certificação)
//   start / end  ano ou 'MM/AAAA'. end null significa "atual"
//   logo         opcional. Sem logo, o card cai no monograma com as iniciais
//   plateBg      cor da plaqueta atrás da logo, igual à convenção dos cards de projeto
//   role         cargo
//   location     opcional
//   highlights   o que foi feito ali, uma entrada por linha
//   note         observação livre. É o campo que o comprador usa para contar a história
//   certificate  opcional { url, label }. Certificado, diploma ou declaração
export const experience = [
  {
    slug: 'growth-hub',
    org: 'Growth Hub',
    kind: 'work',
    start: '2025',
    end: null,
    logo: '/experience/growth-hub.webp',
    plateBg: '#161616',
    role: 'Co-fundador',
    location: 'Rio das Ostras, RJ',
    highlights: [
      'Lidera a arquitetura e a entrega de sistemas de automação, agentes de IA e plataformas SaaS multi-tenant para clientes de hotelaria, serviços financeiros, saúde e varejo.',
      'Definiu o stack técnico padrão da agência (Next.js 15, TypeScript, PostgreSQL, Cloudflare Workers, n8n) e a metodologia de documentação técnica PRD-first aplicada a todos os projetos.',
      'Conduz o ciclo completo de cada projeto: discovery, escopo técnico, desenvolvimento, deploy e onboarding do cliente.',
    ],
    note: null,
    certificate: null,
  },
  {
    slug: 'ion-academy',
    org: 'ION Academy',
    kind: 'work',
    start: '2025',
    end: null,
    logo: '/experience/ion-academy.webp',
    plateBg: '#000000',
    role: 'Co-fundador e Educador',
    location: null,
    highlights: [
      'Co-fundou plataforma educacional de IA, automação e desenvolvimento de software voltada ao público de língua portuguesa.',
      'Lidera o desenho de currículo e as mentorias ao vivo sobre agentes de IA, workflows em n8n, vibe coding e desenvolvimento de SaaS.',
      'Já formou mais de 30 alunos em aplicações práticas e baseadas em projetos das principais ferramentas de IA.',
    ],
    note: null,
    certificate: null,
  },
  {
    slug: 'treemkt',
    org: 'TreeMKT',
    kind: 'work',
    start: '2025',
    end: '2026',
    logo: '/experience/treemkt.webp',
    plateBg: '#f7f7f7',
    role: 'Consultor de Automação',
    location: null,
    highlights: [
      'Implementou sistemas de automação que escalaram as operações internas e a entrega para clientes da agência.',
      'Desenhou workflows conectando ferramentas de marketing, CRMs e canais de mensageria, reduzindo trabalho manual.',
    ],
    note: null,
    certificate: null,
  },
  {
    slug: 'horizon',
    org: 'Horizon',
    kind: 'work',
    start: '2024',
    end: '2025',
    logo: '/experience/horizon.webp',
    plateBg: '#131313',
    role: 'Fundador',
    location: null,
    highlights: [
      'Fundou e liderou agência de IA e automação focada em workflows sob medida, chatbots e agentes de IA para pequenas e médias empresas.',
      'Arquitetou e entregou sistemas de automação ponta a ponta integrando WhatsApp, CRMs, ferramentas de agendamento e LLMs.',
      'Construiu a base técnica reaproveitada posteriormente em diversos projetos SaaS de clientes.',
    ],
    note: null,
    certificate: null,
  },
  {
    slug: 'dg-comunicacao',
    org: 'DG Comunicação',
    kind: 'work',
    start: '2024',
    end: '2025',
    logo: '/experience/dg-comunicacao.webp',
    plateBg: '#ffffff',
    role: 'Desenvolvedor de Automação',
    location: null,
    highlights: [
      'Desenhou e implementou soluções de automação para as operações internas e o portfólio de clientes da agência.',
      'Construiu workflows de marketing e operação integrando CRMs, plataformas de mensageria e ferramentas de conteúdo.',
    ],
    note: null,
    certificate: null,
  },
];

// ex() e iniciais() sairam daqui na fase 0: dado nao importa idioma, e componente nao
// importa dado. Agora vivem em ../lib/experienceField.js e ../lib/iniciais.js.
