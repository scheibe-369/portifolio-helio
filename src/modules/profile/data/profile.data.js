// Dados do perfil. Campos traduzíveis são { pt, en } (resolvidos por t() no i18n).
export const profile = {
  name: 'Helio Monteiro',
  role: {
    pt: 'Automação com IA · Dev SaaS · Sistemas · Rio das Ostras, RJ',
    en: 'AI Automation · SaaS Dev · Systems · Rio das Ostras, RJ',
  },
  avatar: '/avatar.webp',
  mainImage: '/hero.webp',
  // Enquadramento do hero. Era a classe Tailwind object-[50%_36%], que o scanner do v4 nao
  // gera quando o valor vem de dado. Virou campo, e o render poe em style inline.
  heroObjectPosition: '50% 36%',
  // CTA do painel de perfil. Estava hard-coded no componente; na versao vendida cada
  // comprador poe o link dele, entao ja nasce como dado.
  ctaUrl: 'https://cal.com/growth-hub/reuniao-gh',
  // O selo do card de perfil. Estes tres campos existem no banco desde a 0002 e viajavam no
  // payload sem consumidor: o componente imprimia "VibeCoder" e o icone de codigo literais,
  // entao TODO comprador publicava uma pagina dizendo que e vibecoder. Aqui eles aparecem
  // como dado pelo mesmo motivo de heroObjectPosition e ctaUrl: esta fixture e o espelho da
  // linha real do Helio no banco, e e ela que o snapshot usa como baseline.
  badgeLabel: 'VibeCoder',
  badgeIcon: 'code',
  showOnlineDot: true,
  bio: {
    pt: 'Especialista em automação com IA e desenvolvedor full-stack com 3+ anos de experiência construindo agentes de IA, automações e plataformas SaaS de ponta a ponta. Lidero a frente técnica de uma agência de IA e automação, de SaaS multi-tenant a CRMs com IA, e formo uma comunidade de 30+ alunos na ION Academy. Autodidata e movido a resultado, estou aberto a novas oportunidades.',
    en: 'AI automation specialist and full-stack developer with 3+ years of experience building AI agents, automations and SaaS platforms end to end. I lead the technical side of an AI and automation agency, from multi-tenant SaaS to AI-powered CRMs, and I teach a community of 30+ students at ION Academy. Self-taught and results-driven, I am open to new opportunities.',
  },
  email: 'heliomonteiroprofissional@gmail.com',
  // O SIMBOLO ENTROU AQUI TAMBEM. Ele nasceu desligado no apex, de proposito, porque ligar
  // mexeria na pagina do dono por efeito colateral de uma feature pedida para os outros. O
  // motivo caiu quando o cartao perdeu o texto de apoio: sem "1000+" ao lado e sem desenho, o
  // cartao vira a palavra "Instagram" sozinha num retangulo. O simbolo nao e enfeite aqui, e o
  // que substitui a informacao que saiu.
  socialsIcons: true,
  // O `value` PERMANECE NA FIXTURE e nao e mais lido por ninguem. Ele fica como registro do
  // que a linha real do Helio ainda tem no banco: esta fixture e o espelho dela, e apagar aqui
  // o que continua la faria o baseline mentir sobre o payload de producao.
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
