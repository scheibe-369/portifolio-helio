// Dados do perfil. Campos traduzíveis são { pt, en } (resolvidos por t() no i18n).
export const profile = {
  name: 'Helio Monteiro',
  role: {
    pt: 'Automação com IA · Dev SaaS · Sistemas · Rio das Ostras, RJ',
    en: 'AI Automation · SaaS Dev · Systems · Rio das Ostras, RJ',
  },
  avatar: '/avatar.png',
  mainImage: '/hero.png',
  bio: {
    pt: 'Especialista em automação com IA e desenvolvedor full-stack com 3+ anos de experiência construindo agentes de IA, automações e plataformas SaaS de ponta a ponta. Lidero a frente técnica de uma agência de IA e automação, de SaaS multi-tenant a CRMs com IA, e formo uma comunidade de 30+ alunos na ION Academy. Autodidata e movido a resultado, estou aberto a novas oportunidades.',
    en: 'AI automation specialist and full-stack developer with 3+ years of experience building AI agents, automations and SaaS platforms end to end. I lead the technical side of an AI and automation agency, from multi-tenant SaaS to AI-powered CRMs, and I teach a community of 30+ students at ION Academy. Self-taught and results-driven, I am open to new opportunities.',
  },
  email: 'heliomonteiroprofissional@gmail.com',
  socials: [
    { label: 'Instagram', value: '1000+', href: 'https://www.instagram.com/heliomonteir0.ia/' },
    { label: 'TikTok', value: '2800+', href: 'https://www.tiktok.com/@heliomonteir0' },
    { label: 'LinkedIn', value: { pt: 'Perfil', en: 'Profile' }, href: 'https://www.linkedin.com/in/helio-monteiro-a4278b399/' },
    { label: 'YouTube', value: { pt: 'Canal', en: 'Channel' }, href: 'https://www.youtube.com/@heliomonteiro_ia' },
  ],
  stats: [
    { label: { pt: 'Projetos', en: 'Projects' }, value: '30+' },
    { label: { pt: 'Experiência', en: 'Experience' }, value: { pt: '3+ anos', en: '3+ years' } },
    { label: { pt: 'Idiomas', en: 'Languages' }, value: 'PT/EN', lang: true },
  ],
};
