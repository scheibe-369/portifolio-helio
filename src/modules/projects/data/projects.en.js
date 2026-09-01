// Traduções EN dos projetos (por slug). Resolvidas por px() em projects.data.js.
// Campos traduzíveis; year/client/stack/accent/image/video/link reaproveitam o PT.
// `name` só precisa de entrada aqui quando NÃO for nome próprio/marca (ex.: "Sistema GOAT").
export const projectsEn = {
  brasildtf: {
    category: 'SaaS',
    tagline: 'Image-editing SaaS for the DTF market: halftone, background removal and AI generation, on a subscription.',
    summary:
      'A self-service platform where the client preps images for DTF printing: applies halftone, removes the background and generates new art with AI, paying a recurring subscription.',
    problem:
      'DTF (Direct to Film) printing depends on well-prepped images: calibrated halftone, precisely removed backgrounds and fresh art on demand. Doing it by hand, file by file, stalled the clients operation and created constant rework.',
    solution:
      'We built a web SaaS where the client uploads, applies halftone, removes the background and generates AI images in seconds. Access is by subscription via Stripe, with usage limits per plan.',
    features: [
      'Configurable halftone for DTF printing',
      'Automatic background removal',
      'AI image generation',
      'Recurring subscriptions via Stripe',
      'Usage control and limits per plan',
      'User processing history and gallery',
    ],
    stack: ['Stripe (subscriptions)', 'Image processing', 'Generative AI', 'User authentication', 'Web app'],
    linkNote: 'Provisional link',
  },
  'brasil-dtf-impressoras': {
    name: 'Brasil DTF Printers',
    category: 'Landing Page',
    tagline: 'A catalog landing page for the Brasil DTF DTF and UV-DTF printer line: from the entry-level A3 to the 5-head industrial model, with a selection guide and direct WhatsApp contact.',
    summary:
      'A conversion page that works as a menu of the Brasil DTF machines: it presents the 7 printers segmented by buyer profile, with a "which machine is right for you?" guide, a partnership section (warranty, training, support and supplies), FAQ and direct WhatsApp CTAs.',
    problem:
      'Brasil DTF needed a single showcase for its DTF and UV-DTF printer line: a place where the buyer understands the differences between models, finds the right machine for the moment and talks to the team without friction, instead of chasing scattered answers.',
    solution:
      'We built a conversion-focused landing page: a catalog of the 7 machines segmented by profile (just starting out, small business, 60cm production, high volume and UV/labels), an interactive guide that recommends the ideal machine, a partnership section (warranty, training, WhatsApp support, open supplies and easy terms), FAQ and direct WhatsApp CTAs. Bold visuals with Bebas Neue typography, a metal-shine effect and hover-glow cards, mobile-first.',
    features: [
      'Catalog of the 7 DTF and UV-DTF printers',
      'Segmentation by buyer profile',
      'Interactive "which machine is right for you?" guide',
      'Partnership section: warranty, training, support and supplies',
      'FAQ and direct WhatsApp CTAs',
      'Visuals with Bebas Neue, metal-shine effect and glow cards',
    ],
    stack: ['Astro', 'TypeScript', 'Tailwind CSS', 'Sharp'],
  },
  porceli: {
    category: 'CRM',
    tagline: 'Multi-login CRM for a marketing agency: prospecting, pipeline, AI agent, finance and contracts.',
    summary:
      'A full management platform for the agency: pipeline and kanban, an AI agent with advanced metrics, active prospecting, finance, activity and contract management, integrated with Asaas and WhatsApp.',
    problem:
      'The agency ran on disconnected tools for prospecting, sales, finance and contracts. With no single view, metrics were unreliable, charges slipped through and each team worked in a silo.',
    solution:
      'We built a custom multi-login CRM that unites prospecting, sales pipeline/kanban, activity and contract management, finance integrated with Asaas and an AI agent that supports service and generates advanced metrics, all connected to WhatsApp.',
    features: [
      'Multi-login with roles and permissions',
      'Sales pipeline and kanban',
      'Active prospecting system',
      'AI agent with advanced metrics',
      'Finance integrated with Asaas',
      'Activity and contract management',
      'WhatsApp integration',
    ],
    stack: ['Multi-tenant CRM', 'Asaas API', 'WhatsApp API', 'AI agent', 'Metrics dashboard', 'Contract management'],
  },
  'manhattan-hotel': {
    category: 'CRM',
    tagline: 'Hotel CRM with pipeline, finance and an AI agent that handles leads on Instagram and WhatsApp.',
    summary:
      'A sales-management system for hospitality: bookings kanban, sales pipeline, finance and an AI agent that talks to guests on social media and checks room availability in real time.',
    problem:
      'The sales operation was scattered: Instagram and WhatsApp messages with no record, bookings in spreadsheets and no funnel or finance view. Leads went cold from slow replies and the team did not know real room availability when closing.',
    solution:
      'We centralized everything in a CRM with kanban and pipeline, a finance module and an AI agent integrated with Instagram and WhatsApp that serves and qualifies the lead and queries, via API, the rooms and suites management system to answer availability and close bookings.',
    features: [
      'Bookings and service kanban',
      'Stage-based sales pipeline',
      'Finance module',
      'AI agent on Instagram and WhatsApp',
      'API integration with rooms/suites management',
      'Real-time availability lookup',
    ],
    stack: ['AI agent', 'WhatsApp API', 'Instagram API', 'PMS integration', 'CRM / Pipeline', 'Finance module'],
  },
  newcar: {
    category: 'AI Agent',
    tagline: 'An AI agent that serves, qualifies and routes a car dealership leads, right on WhatsApp.',
    summary:
      'A virtual attendant on WhatsApp that talks to the prospect, checks the real vehicle stock, sends photos, understands audio and only passes truly qualified leads to the salesperson.',
    problem:
      'The dealership got a high volume of WhatsApp contacts, most unqualified. Salespeople spent time answering the curious and digging for stock photos while good leads waited.',
    solution:
      'We created an AI agent that serves 24/7 on WhatsApp: it understands text and audio, queries the vehicle database to know what is in stock, sends photos of the right car, qualifies interest and discards non-leads, passing only hot opportunities to the human salesperson.',
    features: [
      '24/7 service on WhatsApp',
      'Queries the in-stock vehicle database',
      'Automatic sending of car photos',
      'Audio transcription and understanding',
      'Automatic lead qualification and discard',
      'Hands hot leads to the salesperson',
    ],
    stack: ['AI agent (LLM)', 'WhatsApp API', 'Audio transcription (STT)', 'Stock database', 'Lead qualification'],
  },
  maternaforte: {
    category: 'SaaS / Web Platform',
    tagline: 'Website and multi-professional members area for the MaternaForte program.',
    summary:
      'A content and follow-up platform for the MaternaForte product, with login segmented by professional type, video lessons and integrated payments.',
    problem:
      'MaternaForte brings doctors, personal trainers, psychologists and students into the same program, and each profile needs to see different things. They needed a single space that sold the product, unlocked access after payment and organized content by professional type.',
    solution:
      'We delivered the sales site and a members area with multi-login by role (doctor, trainer, psychologist, student), video lessons organized by track and access unlocked through the payment gateway.',
    features: [
      'Presentation and sales site',
      'Members area with video lessons',
      'Multi-login by role (doctor, trainer, psychologist, student)',
      'Access and content control per profile',
      'Payment gateway integration',
      'Automatic access release after purchase',
    ],
    stack: ['Multi-role authentication', 'Members area', 'Video lesson streaming', 'Payment gateway', 'Web app'],
    linkNote: 'Sample link',
  },
  previa: {
    category: 'Automation / Billing',
    tagline: 'Automatic generation and dispatch of boletos via WhatsApp and email, with no manual work.',
    summary:
      'A fully automated billing system: it queries the client API to pull pending accounts, generates a boleto for each debtor and dispatches it via WhatsApp Business API and email, with error handling, retries and delivery confirmation.',
    problem:
      'Processing billing by hand across a large customer base is slow, error-prone and does not scale: boletos generated one by one and dispatches with no delivery tracking.',
    solution:
      'I designed and built the whole integration: the system queries the client API to bring in open accounts, generates the boletos automatically and dispatches them via WhatsApp and email, with no manual work, plus error handling, retry logic and delivery-confirmation tracking from day one.',
    features: [
      'Queries the client API (pending accounts)',
      'Automatic boleto generation per debtor',
      'Dispatch via WhatsApp Business API and email',
      'Runs with no manual intervention',
      'Error handling and retry logic',
      'Delivery-confirmation tracking',
    ],
  },
  'ai-agents-playground': {
    category: 'AI Agents',
    tagline: 'An online sandbox to test 6 production-grade AI agents, each specialized in a niche.',
    summary:
      'A playground where the user chats with 6 AI agents from different verticals (motel bookings, real estate, iPhone retail, car dealership and pet shop). Each agent has its own prompt architecture, switches between PT and EN and supports sending images in the conversation.',
    problem:
      'Showing in practice how an AI agent serves each niche, and granting temporary access for client demos without leaving logins open forever.',
    solution:
      'I built the platform, the agents, the admin panel and the access control solo: each agent runs on a prompt architecture tailored to its industry, accepts photos in the conversation and switches PT/EN. The admin creates temporary logins with an expiration date that auto-revoke when the trial ends, ideal for demos and sales presentations.',
    features: [
      '6 AI agents by niche (motel, real estate, iPhone, cars, pet shop)',
      'Custom prompt architecture per industry',
      'Image sharing in the conversation',
      'Switches between PT and EN',
      'Admin panel with self-expiring temporary logins',
      'Built for demos and sales presentations',
    ],
  },
  'growth-hub-site': {
    name: 'Growth Hub Site',
    category: 'Website',
    tagline: 'Institutional website for a technology agency, from scratch, focused on visual impact and technical credibility.',
    summary:
      'A bilingual (PT/EN) website with a 3D hero, an AI-generated robot image that disintegrates into particles on hover (WebGL + a custom particle system), real client cases, a services architecture section and WhatsApp integration for direct contact.',
    problem:
      'The agency needed a site that conveyed visual impact and technical credibility right away, not just another generic institutional page.',
    solution:
      'I built the site from scratch, with a WebGL hero where the robot image disintegrates into particles on hover (mapping the image pixels and scattering them on mouse movement), bilingual PT/EN, with real cases, a services section and direct contact via WhatsApp.',
    features: [
      '3D hero: a robot that turns into particles on hover (WebGL)',
      'Custom particle system (maps the image pixels)',
      'Bilingual PT/EN',
      'Real client cases',
      'Services architecture section',
      'WhatsApp integration for direct contact',
    ],
  },
  'token-cost-calculator': {
    category: 'AI Tool',
    tagline: 'Simulate AI agent costs before going live, know the cost per conversation before the bill arrives.',
    summary:
      'A web tool that predicts AI agent costs: the user simulates full conversation flows (system prompt, messages and tool calls) across the top models (OpenAI, Claude, Gemini) and sees token usage and projected cost per interaction.',
    problem:
      'Most teams only discover the real LLM cost after the bill arrives, and naive calculators still ignore tool-call overhead.',
    solution:
      'I built (solo, from design to deploy) a tool that simulates the entire conversation across the top models, showing tokens and projected cost per interaction, accounting for tool-call overhead, allowing conversation file imports and with a recommendation engine that flags the best cost-to-quality model for the use case.',
    features: [
      'Simulates full flows (system prompt, messages, tool calls)',
      'Compares the top models (OpenAI, Claude, Gemini)',
      'Shows tokens and projected cost per interaction',
      'Accounts for tool-call overhead',
      'Conversation file import',
      'Best cost-to-quality recommendation engine',
    ],
  },
  'sistema-goat': {
    name: 'GOAT System',
    category: 'Platform / CRM',
    tagline: 'An all-in-one agency management platform: replaces several disconnected tools with one system.',
    summary:
      'A complete operations platform for a digital agency, with a financial-metrics dashboard, client management, a sales pipeline (Kanban CRM), contracts and subscriptions, finance, WhatsApp conversations integrated with the CRM and an AI-powered SDR agent for prospecting.',
    problem:
      'The agency ran on several disconnected tools for sales, service, contracts and finance, with no single view and no way to scale.',
    solution:
      'I architected, built and deployed a single system end to end: financial dashboard, clients, kanban pipeline, contracts/subscriptions, finance (income, expenses, cash flow), WhatsApp conversations inside the CRM and an AI SDR agent for prospecting, with secure role-based auth and multi-user support, built to scale with the agency.',
    features: [
      'Dashboard with financial metrics',
      'Client management',
      'Sales pipeline (Kanban CRM)',
      'Contracts and subscriptions',
      'Finance (income, expenses, cash flow)',
      'WhatsApp conversations integrated with the CRM',
      'AI SDR agent for prospecting',
      'Role-based auth and multi-user',
    ],
    linkNote: 'Demo with sample data',
  },
  'pipeline-video-ia': {
    name: 'AI Video Pipeline',
    category: 'Automation / AI',
    tagline: 'Send the idea on Telegram and the video is created by AI and published on its own.',
    summary:
      'You send a video idea with a reference image on Telegram. An agent builds the master prompt, Google Veo generates the video, and the flow publishes to social media, sends you the finished video back on Telegram and logs everything to a dashboard.',
    problem:
      'Creating and publishing AI video by hand is a hassle: writing a good prompt, generating, downloading, uploading to social and tracking it. Too many manual steps.',
    solution:
      'I built an end-to-end pipeline in n8n: Telegram receives the idea and the image, the AI writes the optimized master prompt, Veo generates the video and the flow publishes to social, returns the video on Telegram and logs everything to a real-time dashboard.',
    features: [
      'Receives the idea and image via Telegram',
      'AI builds the optimized master prompt',
      'Video generation with Google Veo',
      'Automatic publishing to social media',
      'Returns the finished video on Telegram',
      'Logs everything to a real-time dashboard',
    ],
    stack: ['n8n', 'Telegram API', 'Google Veo', 'LLM (prompt generation)'],
  },
  'chatbot-clinicas': {
    name: 'Chatbot for Clinics',
    category: 'Chatbot / Automation',
    tagline: 'An AI chatbot that serves and books on WhatsApp, Instagram and Facebook, all in one flow.',
    summary:
      'A chatbot for health and aesthetic clinics that brings the three channels into one place: it replies in a personalized way, books appointments with calendar reminders, sends videos, images and documents to the patient, handles objections and captures and qualifies leads.',
    problem:
      'The clinic keeps answering the same questions on WhatsApp, Instagram and Facebook, and loses bookings to slow replies. The front desk cannot keep up.',
    solution:
      'I built the full conversational flow: it serves the three channels from a single place, books with a calendar-integrated reminder, sends media and documents to the patient, has paths to handle objections and captures and qualifies leads. The front desk focuses on the patient and the bot handles the rest. Perfect for dental, aesthetic and medical clinics.',
    features: [
      'Serves WhatsApp, Instagram and Facebook in one flow',
      'Personalized automated replies',
      'Booking with calendar reminders',
      'Sends videos, images and documents',
      'Paths to handle objections',
      'Lead capture and qualification',
    ],
    stack: ['ManyChat', 'WhatsApp API', 'Calendar integration'],
  },
  'automacao-financeira-asaas': {
    name: 'Financial Automation (Asaas)',
    category: 'Automation / Billing',
    tagline: 'Automatic payment reminders via WhatsApp and email, integrated with Asaas.',
    summary:
      'Financial automation tied to Asaas that runs two flows: one gets ahead of payments by warning about accounts about to come due, and another chases overdue invoices with a smart follow-up cadence. Every message is built on the fly, based on context.',
    problem:
      'Manual billing is a trap: the client forgets to pay before the due date and defaults grow because nobody does the right follow-up.',
    solution:
      'I built two parallel flows in n8n integrated with Asaas: one warns the client before the due date and another chases the overdue boleto with a smart cadence. Each message is formatted dynamically, so every send goes out personalized and professional, on WhatsApp and email.',
    features: [
      'Integration with Asaas',
      'Reminder flow before the due date',
      'Overdue-chase flow with smart follow-up',
      'Messages built on the fly, based on context',
      'Two parallel channels: WhatsApp and email',
    ],
    stack: ['n8n', 'Asaas API', 'WhatsApp Business API', 'Email'],
  },
  'infra-agentes-ia': {
    name: 'AI Agent Infrastructure',
    category: 'Infrastructure / AI',
    tagline: 'A foundation to run AI agents with intelligent routing and an anti-hallucination layer.',
    summary:
      'A core AI agent infrastructure for internal operations and for clients who need high control and reliability. It has robust state management and an intelligent router that distributes and orchestrates flows, focused on preventing hallucination and protecting information.',
    problem:
      'A loose AI agent with no control hallucinates and leaks information, which is unacceptable in a critical operation.',
    solution:
      'I designed the architecture, the state management, the router and the safety layer: an intelligent router distributes and orchestrates the flows, and everything is built around preventing hallucination and protecting information, so the agent can be trusted where errors are not an option.',
    features: [
      'Robust state management',
      'Intelligent router that distributes and orchestrates flows',
      'Architecture focused on preventing hallucination',
      'Information security layer',
      'A reliable foundation for critical environments',
    ],
    stack: ['Cloudflare Workers', 'TypeScript', 'n8n', 'Custom agent orchestration'],
  },
  'damascena-films': {
    category: 'Landing Page',
    tagline: 'A filmmaker landing page from the Região dos Lagos: video with cinema aesthetics and a strategy mindset.',
    summary:
      'A page for Marcos, the filmmaker behind Damascena Films, to present and sell his work elegantly and professionally: the "image with intent" idea, the services, the cases and contact. Video that becomes positioning, authority and sales, not pretty video that leads nowhere.',
    problem:
      'Marcos needed a showcase worthy of his work: something that sold the audiovisual production elegantly and showed the projects, without looking like just another generic portfolio.',
    solution:
      'I built the landing with the brand language and cinema aesthetics: a strong hero, services (social content, institutional and branded, event coverage and strategic editing), a cases section with a lightbox, process, FAQ and direct contact via WhatsApp. It is still being finalized, waiting on the client to lock the final copy and numbers.',
    features: [
      'Hero with the brand promise ("image with intent")',
      'Services: social content, institutional/branded, events and editing',
      'Cases section with lightbox',
      'Process and FAQ',
      'Direct contact via WhatsApp and Cal.com',
      'Cinema aesthetics, mobile-first',
    ],
    linkNote: 'Being finalized (awaiting the client final tweaks)',
  },
  'deck-proposta-fidc': {
    name: 'Proposal Deck · AI for FIDCs',
    category: 'Sales Presentation',
    tagline: 'A navigable commercial presentation that replaces the proposal PDF with a "site" that adapts to each client.',
    summary:
      'A web deck for selling an AI training program to FIDCs, securitizadoras and asset managers: a single 11-slide engine with data isolated per proposal (name, company, value, timeline), resolved from the URL, without touching proposals already sent.',
    problem:
      'A PDF proposal is static and does not convey the same technical credibility as the product being sold, and creating a version per prospect usually meant duplicating the whole file, with a risk of inconsistency, rework and no control over who could access what.',
    solution:
      'I built a navigable web presentation (not a PDF): a single 11-slide engine with an isolated data file per proposal (client, company, value, timeline), resolved from the URL (?p=slug) and merged over a fixed base of contacts, signature and price anchoring, without touching other clients proposals already sent. The visual identity was cloned from my portfolio (black, glassmorphism, purple #7C5CFC, metallic-silver) to reinforce the same technical authority in the sale.',
    features: [
      'Single slide engine with data isolated per proposal (name, company, value, timeline)',
      'Active proposal resolved from the URL (?p=slug), merged over a shared base',
      'Direct deep-link per slide (?p=client#investment)',
      'Keyboard navigation, on-screen arrows, dots, index and mobile swipe',
      'Non-obvious per-proposal slugs, so no client can guess another one price',
      '11 slides covering pain, positioning, authority, program, edge, investment and timeline',
      'Visual identity cloned from the portfolio: black, glassmorphism, purple #7C5CFC, metallic-silver',
    ],
    linkNote: 'Sample proposal (placeholder data)',
  },
  'ai-block': {
    category: 'Platform / Digital Product',
    tagline:
      'A subscription AI knowledge hub: curated, verified prompts, skills, plugins, artifacts and repositories, all in one place.',
    summary:
      'A members area gathering 430 ready-to-use prompts across 8 categories plus 437 curated AI items (skills, plugins, artifacts, articles, news, repositories and libraries), with access granted automatically on purchase, a per-tier paywall in the database and an admin panel that publishes new content without a redeploy.',
    problem:
      'Anyone using AI daily burns hours digging for prompts, skills, plugins and repositories across scattered threads, and much of what circulates is a dead link, generic filler or material invented by another AI. There was no single archive, verified item by item and easy to browse.',
    solution:
      'I built the whole product, from the archive to the infrastructure. The content is not written, it is mined and verified: a pipeline of parallel AI agents sweeps different search angles, an adversarial reviewer reopens every link and checks title, author, date and stars against the real page, and the final assembly runs as a deterministic script, never as an agent. On top of that, a members area with login, three SKUs unlocked automatically by the purchase webhook, a real paywall in database RLS (hiding a tab in the front end is UI convenience, not protection) and an admin panel to publish content without a new deploy.',
    features: [
      '430 prompts across 8 categories, each with a real source and a recommended AI',
      '437 curated items: skills, plugins, artifacts, articles, news, repositories and libraries',
      'Curation pipeline with parallel agents and an adversarial reviewer that reopens every link',
      'Validator that blocks dead links, duplicates and off-schema items before publishing',
      'Access granted automatically on purchase, via webhook',
      'Per-tier paywall in database RLS, not just hidden in the interface',
      'Admin panel for members and content, publishes without a new deploy',
      'Guide tab with an onboarding lesson and direct support',
    ],
    stack: ['Vite', 'Tailwind CSS v4', 'Vanilla JavaScript', 'Supabase (Auth, RLS, Edge Functions)', 'PostgreSQL', 'Cloudflare Pages'],
    linkNote: 'Members area, restricted access',
  },
  'indicacao-marcos': {
    name: 'Referral Landing Page',
    category: 'Landing Page',
    tagline: 'An invite-only referral landing page, with lead capture that converts better than a plain form.',
    summary:
      'A premium, invite-only page for the client to refer new business: they share the link with prospects and create a high-trust entry point that converts far better than a generic form.',
    problem:
      'A generic referral form does not convey trust and converts poorly, and the referred lead does not arrive qualified or go straight to the sales team.',
    solution:
      'I designed and built the whole page, the animations and the form integration: dark visuals with animated particles, scroll-triggered transitions and social proof (testimonials and numbers). An embedded multi-step form captures the qualified lead and routes it straight to the sales team, all mobile-first and fast.',
    features: [
      'Invite-only page, high trust',
      'Dark visuals with animated particles',
      'Scroll-triggered transitions',
      'Social proof: testimonials and metrics',
      'Multi-step form that captures qualified leads',
      'Routes the lead straight to the sales team',
      'Mobile-first and fast loading',
    ],
  },
  'geracao-leads-previa': {
    name: 'Lead Generation',
    category: 'System / Prospecting',
    tagline:
      'A prospecting engine that mines the client own database and turns the companies that already pay well into a qualified lead list.',
    summary:
      'A system that cross-references the Previa base of payers and clients and returns, with a score and a buying signal, which companies are the best candidates to become new clients. It serves three portfolios, the qualification rules are editable right on the screen, and the list is built in under a second, straight from the real ERP database, not from a purchased list.',
    problem:
      'Prospecting in factoring and receivables funds almost always starts from zero: a cold list, no information on how the company actually pays and a low response rate. Yet the best answer was already in house. Every operation records thousands of payers, the companies that settle the receivables in the portfolio, and nobody looked at them as potential clients, because every attempt at that cross-reference meant querying the ERP database by hand.',
    solution:
      'I built a qualification engine that runs straight against the ERP database, read-only. It aggregates the receivables per payer, computes the payment behaviour indices (rollover, buyback, liquidity and punctuality), automatically drops anyone who is already a client so the team never prospects a current account, and cross-references every company registration number with the credit bureau. That is where the most valuable signal comes from: whoever already assigns receivables to another fund, meaning they already understand the product and just need a better offer. Around that, a panel where the sales team tunes the rules with no help from IT, exports the list to CSV and sees the history of who ran each search.',
    features: [
      'Sweeps the ERP base of payers, with read-only access',
      'Per-company indices: rollover, buyback, liquidity and punctuality',
      'Automatically drops anyone who is already a client, so no one prospects a current account',
      'Per-candidate signals: already assigns to another fund, hub, recurring delay and credit restrictions',
      'Qualification rules editable on the screen, each one switchable on and off',
      'Score from 0 to 100, filtered by portfolio, period, minimum volume and state',
      'Dashboard and metrics screen: qualification rate, potential volume, industry and state',
      'CSV export and a history of the searches the team has run',
    ],
    stack: ['Next.js 16', 'React 19', 'TypeScript', 'SQL Server', 'Tailwind CSS v4', 'On-premise deploy (PM2)'],
    linkNote: 'Navigable demo, placeholder data (any username and password works)',
  },
  falow: {
    category: 'Website',
    tagline:
      'The launch site for Falow, software that answers Instagram DMs and comments by keyword. The page does not show screenshots of the product, it assembles the product in front of the reader.',
    summary:
      'A landing page for a conversational automation tool walking into a market that already has an established name. The sequence builder and the dashboard were rebuilt in HTML and CSS and assemble themselves on scroll, node by node, stitched together by a green stroke lifted from the brand itself. A three-act narrative, a preloader that is the signature drawing itself, and Lighthouse 94 for performance with 100 for accessibility, best practices and SEO.',
    problem:
      'Falow was born to compete on ManyChat ground, an incumbent with a name and years of market behind it. And it was born with nothing to lean on: no clients, no testimonials, no numbers. An institutional page with three bullets and a screenshot does not carry that difference, because a first-time visitor has to understand what the tool does in seconds and feel that it is good before creating an account.',
    solution:
      'I built the entire landing page, from the design system to publishing, and answered the missing social proof by turning the page itself into the demo. Instead of screenshots, the sequence builder and the dashboard were rebuilt in HTML and CSS and assemble on scroll, node by node, with the brand green wires and yellow triggers. The reading follows three acts (the pain in the dark, the product in the light, the invitation in the dark) tied together by the Falow Path, a custom effect that draws the brand stroke as the visitor scrolls and lights a trigger for every card that comes in. The mark was not drawn by eye: the geometry of the ring and the dot came from measuring the official vector, fitting a circle over the outline, and the preloader is that signature assembling itself on screen.',
    features: [
      'A three-act narrative: the pain in the dark, the product in the light, the invitation in the dark',
      'Sequence builder and dashboard rebuilt in HTML and CSS, no screenshots',
      'Two cinematic sticky sections, with the flow assembling itself on scroll',
      'Falow Path: a custom effect that draws the brand stroke and lights the triggers',
      'A preloader that is the brand signature assembling, with the ring measured on the official vector',
      'Ink-blot menu and anchor transitions by wipe, with focus trapping and Escape',
      'Reveal with no content flash and real respect for prefers-reduced-motion',
      'Lighthouse: 94 performance, 100 accessibility, best practices and SEO',
    ],
    stack: ['Vite', 'Tailwind CSS v4', 'Vanilla JavaScript', 'GSAP (ScrollTrigger)', 'Feature-Sliced architecture', 'Cloudflare Pages'],
    linkNote: 'Site is live. Sign-up opens when the platform ships',
  },
  'safe-group': {
    category: 'Website',
    linkNote: 'Temporary domain, the final version moves to safegroup.pt',
    tagline:
      'Institutional site for a growth, commercial intelligence and technology company operating in the automotive, financial and software sectors, on high ticket deals.',
    summary:
      'A multi-page website presenting the full positioning of Safe Group: a 360 diagnostic of each client operation, the fronts it can structure (traffic, automation, software, AI and commercial consulting, combined based on the real problem) and a catalog of real cases, ending in a qualified commercial diagnostic form.',
    problem:
      'Safe Group operates on high ticket deals in the automotive, financial and software sectors, but that offering did not fit a generic agency site: reducing the positioning to "traffic, automation or consulting" hid what actually sets the company apart, which is diagnosing the whole operation and structuring only the front needed to capture the biggest leverage point.',
    solution:
      'I built the multi-page institutional site from scratch: a Home with the 360 diagnostic, fronts and method, plus dedicated pages for About, Solutions, Method, a case catalog (with its own template per case) and Contact with a qualified diagnostic form. Visual identity in deep black, graphite and Safe red, with Space Grotesk in headings and a red-lines video as the main movement gesture. Deployed on Cloudflare Workers via OpenNext, published automatically on every push.',
    features: [
      '360 diagnostic of the client operation, on the Home',
      'Dedicated pages: About, Solutions, Method and Contact',
      'Case catalog with its own template per case',
      'Qualified commercial diagnostic form',
      'Visual identity in deep black, graphite and Safe red',
      'Automatic deploy on every push, via GitHub Actions and Cloudflare Workers',
    ],
    stack: ['Next.js 15', 'React 19', 'TypeScript', 'Tailwind CSS 4', 'Framer Motion', 'OpenNext', 'Cloudflare Workers'],
  },
};
