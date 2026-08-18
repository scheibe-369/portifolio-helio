// Agente de nicho da SEGUNDA rodada: Wilson Tavares, corretor de imoveis na Zona Sul de SP
// (slug demo-corretor, CRECI-SP 214.556).
//
// A HIPOTESE QUE ESTA PERSONA EXISTE PARA QUEBRAR: para ele, um "trabalho" e um IMOVEL, e
// imovel e DADO ESTRUTURADO. Preco, area em m2, numero de quartos, numero de vagas, bairro, e
// se e venda ou locacao. Isso nao cabe em texto corrido, e nenhuma das onze personas
// anteriores tinha dado estruturado por trabalho. O catalogo dele tambem MUDA: imovel vendido
// sai do ar ou vira "vendido".
//
// Segunda coisa que ele testa: o CRECI. Profissao regulamentada, numero obrigatorio em peca
// publicitaria por resolucao do COFECI. A migration 0024 criou a coluna. O editor tem campo?
//
// Uso:
//   node scripts/_demos/demo-corretor.mjs                 (tudo)
//   node scripts/_demos/demo-corretor.mjs perfil          (wizard|censo|perfil|pagina|imoveis|experiencias|vendido|publicar|ler)
import { abrirEditor, esperar } from './base.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ETAPA = process.argv[2] || 'tudo';
const fazer = (n) => ETAPA === 'tudo' || ETAPA === n;
const MIDIA = path.resolve('out/midia/demo-corretor');
const m = (f) => path.join(MIDIA, f);
const G = '#ed-gaveta';

const atrito = [];
const nota = (nivel, texto) => { atrito.push(`[${nivel}] ${texto}`); console.log(`  ! ${nivel}: ${texto}`); };

await mkdir('out', { recursive: true });
const t0 = Date.now();
const { pagina, navegador, demo, erros, APEX } = await abrirEditor('demo-corretor', { headless: true });
console.log(`editor aberto para ${demo.nome} (${demo.slug})`);

// ---------------------------------------------------------------- utilitarios
const tiro = async (nome, inteiro = false) => {
  try { await pagina.screenshot({ path: `out/corretor-${nome}.png`, fullPage: inteiro }); } catch {}
};
const textoGaveta = () => pagina.evaluate(() => document.querySelector('#ed-gaveta')?.innerText || '(sem gaveta)');

async function abrirPainelPor(chave) {
  await pagina.click(`[data-abrir="${chave}"]`);
  await esperar(1200);
}

async function abrirTodosOsPassos() {
  await pagina.evaluate(() => {
    document.querySelectorAll('#ed-gaveta details').forEach((d) => { d.open = true; });
  });
  await esperar(300);
}

async function preencher(key, valor) {
  const sel = `${G} [data-campo="${key}"] input:not([type=file]), ${G} [data-campo="${key}"] textarea`;
  const el = pagina.locator(sel).first();
  if (!(await el.count())) { nota('AUSENTE', `campo "${key}" nao existe no formulario`); return false; }
  if (await el.isDisabled()) { nota('BLOQUEADO', `campo "${key}" veio desabilitado`); return false; }
  await el.fill(String(valor));
  await esperar(120);
  return true;
}

async function selecionar(key, valor) {
  const el = pagina.locator(`${G} [data-campo="${key}"] select`).first();
  if (!(await el.count())) { nota('AUSENTE', `select "${key}" nao existe`); return false; }
  await el.selectOption(String(valor));
  await esperar(300);
  return true;
}

async function ligarSwitch(key, ligado = true) {
  const el = pagina.locator(`${G} [data-switch="${key}"]`).first();
  if (!(await el.count())) { nota('AUSENTE', `switch "${key}" nao existe`); return false; }
  if (await el.isDisabled()) { nota('BLOQUEADO', `switch "${key}" veio desabilitado`); return false; }
  const agora = (await el.getAttribute('aria-checked')) === 'true';
  if (agora !== ligado) { await el.click(); await esperar(400); }
  return true;
}

async function chips(key, lista) {
  for (const texto of lista) {
    const inp = pagina.locator(`${G} [data-chip-add="${key}"]`).first();
    if (!(await inp.count())) { nota('AUSENTE', `chips "${key}" nao existe`); return; }
    if (await inp.isDisabled()) { nota('LIMITE', `chips "${key}" travou em "${texto}" (limite atingido)`); return; }
    await inp.fill(texto);
    await inp.press('Enter');
    await esperar(280);
  }
}

async function subirImagem(key, arquivo, origem = '') {
  const inp = pagina.locator(`${G} [data-arquivo="${key}"]`).first();
  if (!(await inp.count())) { nota('AUSENTE', `campo de imagem "${key}" nao existe`); return null; }
  await inp.setInputFiles(m(arquivo));
  for (let i = 0; i < 40; i++) {
    await esperar(500);
    const r = await pagina.evaluate((k) => {
      const campo = document.querySelector(`#ed-gaveta [data-campo="${k}"]`);
      const img = campo?.querySelector('.ed-drop-previa');
      const erro = campo?.querySelector('[data-erro]')?.textContent?.trim() || '';
      return { url: img?.src || '', w: img?.naturalWidth || 0, h: img?.naturalHeight || 0, erro };
    }, key);
    if (r.url && r.w) {
      console.log(`  imagem ${key} (${arquivo})${origem ? ` ${origem} ->` : ':'} ${r.w}x${r.h}`);
      return r;
    }
    if (r.erro && !/convertendo|enviando/i.test(r.erro)) {
      nota('ERRO-UPLOAD', `"${key}" com ${arquivo}: ${r.erro}`);
      return null;
    }
  }
  nota('TIMEOUT', `upload de "${key}" (${arquivo}) nao terminou em 20s`);
  return null;
}

async function salvar(rotulo) {
  const btn = pagina.locator('#ed-form-salvar');
  if (!(await btn.count())) { nota('AUSENTE', `botao Salvar sumiu em ${rotulo}`); return false; }
  await btn.click();
  for (let i = 0; i < 40; i++) {
    await esperar(500);
    const aberta = await pagina.evaluate(() => document.querySelector('#ed-gaveta')?.classList.contains('is-open'));
    if (!aberta) { console.log(`  salvo: ${rotulo}`); return true; }
    const msg = await pagina.evaluate(() => document.getElementById('ed-form-msg')?.textContent?.trim() || '');
    if (msg && !/salvando/i.test(msg)) { nota('ERRO-SALVAR', `${rotulo}: ${msg}`); return false; }
  }
  nota('TIMEOUT', `salvar ${rotulo} nao respondeu em 20s`);
  return false;
}

// ------------------------------------------------------------------- conteudo
const BIO = [
  'Sou corretor de imóveis há dezenove anos, com CRECI-SP 214.556, e trabalho só na Zona Sul de São Paulo: Moema, Vila Nova Conceição, Brooklin, Campo Belo e Itaim.',
  'Não anuncio imóvel que não visitei. Cada apartamento desta página eu conheço por dentro, sei o valor do condomínio, o barulho da rua e o horário em que bate sol na sala.',
  'Trabalho com venda e com locação, e atendo tanto quem compra para morar quanto quem compra para render. Faço a avaliação sem cobrar e digo o preço real, não o preço que o proprietário queria ouvir.',
  'A negociação passa por mim do começo ao fim: proposta, documentação, financiamento e escritura.',
  'Me chame no WhatsApp com o bairro e a faixa de preço, que eu já respondo com o que tenho na mão.',
].join(' ');

const SOCIAIS = [
  'WhatsApp | (11) 98214-7730 | https://wa.me/5511982147730',
  'Instagram | @wilsontavares.imoveis | https://instagram.com/wilsontavares.imoveis',
  'Imobiliária | Tavares Negócios Imobiliários | https://maps.google.com/?q=Moema+Sao+Paulo',
].join('\n');

const NUMEROS = [
  'Anos de CRECI | 19',
  'Imóveis vendidos | 340',
  'Bairros que eu atendo | 5',
  'Ticket médio | R$ 1,9 mi',
].join('\n');

const ESPECIALIDADES = [
  'Venda residencial', 'Locação', 'Avaliação de imóvel', 'Alto padrão',
  'Financiamento bancário', 'Permuta', 'Imóvel para renda', 'Documentação e escritura',
  'Moema', 'Vila Nova Conceição', 'Brooklin', 'Campo Belo', 'Itaim Bibi',
];

// SEIS IMOVEIS. O campo `highlight` ("Preço, prazo ou condição") e o unico slot curto que
// aparece na grade, entao ele carrega o PRECO. Area, quartos, vagas e bairro nao tem campo:
// o teste e ver onde eles cabem e o quanto fica feio.
const IMOVEIS = [
  {
    name: 'Apartamento na Vila Nova Conceição',
    category: 'Venda',
    // O preco cabe. O resto do dado estruturado NAO cabe aqui: sao 60 caracteres.
    highlight: 'R$ 2.850.000 · 142 m² · 3 quartos · 2 vagas',
    tagline: 'Andar alto na rua Domingos Fernandes, sala em L com varanda de frente para o Ibirapuera. Condomínio de R$ 2.100.',
    bairro: 'Vila Nova Conceição',
    area: '142 m²', quartos: '3 quartos (1 suíte)', vagas: '2 vagas', condominio: 'R$ 2.100/mês', iptu: 'R$ 640/mês',
    year: '2025',
    groups: ['Venda', 'Alto padrão'],
    imagem: 'im-1-sala.jpg',
    panoramica: true,
    galeria: ['g-cozinha-1.jpg', 'g-quarto-1.jpg', 'g-varanda.jpg'],
  },
  {
    name: 'Cobertura duplex em Moema',
    category: 'Venda',
    highlight: 'R$ 4.200.000 · 285 m² · 4 quartos · 4 vagas',
    tagline: 'Duplex com terraço de 60 m², churrasqueira e ofurô. Uma quadra do parque, rua sem saída.',
    bairro: 'Moema',
    area: '285 m² (60 m² de terraço)', quartos: '4 quartos (2 suítes)', vagas: '4 vagas', condominio: 'R$ 3.400/mês', iptu: 'R$ 1.180/mês',
    year: '2025',
    groups: ['Venda', 'Alto padrão'],
    imagem: 'im-2-cobertura.jpg',
    galeria: ['g-cozinha-2.jpg', 'g-fachada.jpg'],
  },
  {
    name: 'Apartamento no Brooklin, pronto para morar',
    category: 'Venda',
    highlight: 'R$ 1.180.000 · 88 m² · 3 quartos · 2 vagas',
    tagline: 'Reformado inteiro em 2023, piso vinílico novo e cozinha americana. Prédio com portaria 24h.',
    bairro: 'Brooklin',
    area: '88 m²', quartos: '3 quartos (1 suíte)', vagas: '2 vagas', condominio: 'R$ 980/mês', iptu: 'R$ 310/mês',
    year: '2025',
    groups: ['Venda'],
    imagem: 'im-3-living.jpg',
    galeria: ['g-quarto-1.jpg'],
  },
  {
    name: 'Studio mobiliado no Itaim Bibi',
    category: 'Locação',
    highlight: 'R$ 5.400/mês + R$ 890 condomínio · 34 m²',
    tagline: 'Mobiliado, com academia e coworking no prédio. Aceita contrato de doze meses, entra com dois fiadores ou seguro-fiança.',
    bairro: 'Itaim Bibi',
    area: '34 m²', quartos: '1 dormitório', vagas: 'sem vaga', condominio: 'R$ 890/mês', iptu: 'R$ 145/mês',
    year: '2025',
    groups: ['Locação'],
    imagem: 'im-4-studio.jpg',
    galeria: [],
  },
  {
    name: 'Duplex no Campo Belo',
    category: 'Venda',
    highlight: 'R$ 1.650.000 · 156 m² · 3 quartos · 2 vagas',
    tagline: 'Pé-direito duplo na sala, escada de concreto aparente. Prédio de sete andares, dois por andar.',
    bairro: 'Campo Belo',
    area: '156 m²', quartos: '3 quartos (1 suíte)', vagas: '2 vagas', condominio: 'R$ 1.450/mês', iptu: 'R$ 520/mês',
    year: '2024',
    groups: ['Venda'],
    imagem: 'im-5-duplex.jpg',
    galeria: ['g-cozinha-1.jpg'],
  },
  {
    name: 'Garden em Moema, com quintal',
    category: 'Locação',
    highlight: 'R$ 9.800/mês + R$ 1.620 condomínio · 190 m²',
    tagline: 'Térreo com 70 m² de quintal privativo, aceita pet de grande porte. Locação com contrato de trinta meses.',
    bairro: 'Moema',
    area: '190 m² (70 m² de quintal)', quartos: '3 quartos (1 suíte)', vagas: '3 vagas', condominio: 'R$ 1.620/mês', iptu: 'R$ 700/mês',
    year: '2024',
    groups: ['Locação'],
    imagem: 'im-6-garden.jpg',
    galeria: ['g-varanda.jpg'],
  },
];

const EXPERIENCIAS = [
  {
    kind: 'work', org: 'Tavares Negócios Imobiliários', role: 'Corretor titular e responsável técnico',
    period_start: '2016', atual: true, location: 'Moema, São Paulo',
    logo: 'logo-imob.jpg',
    highlights: [
      'Abri a minha própria carteira depois de dez anos em imobiliária grande',
      'Trabalho sozinho, com dois estagiários de corretagem, e atendo cinco bairros da Zona Sul',
      'Média de 18 vendas por ano, com ticket médio de R$ 1,9 milhão',
    ],
    note: 'Trabalhar por conta significa que quem responde o WhatsApp sou eu, e quem visita o imóvel antes de anunciar também.',
  },
  {
    kind: 'work', org: 'Lopes Consultoria de Imóveis', role: 'Corretor sênior',
    period_start: '2007', period_end: '2016', atual: false, location: 'São Paulo, SP',
    highlights: [
      'Nove anos em lançamento e revenda de alto padrão na Zona Sul',
      'Fui campeão de vendas da regional em 2012 e em 2014',
      'Aprendi a montar dossiê de financiamento, que é onde a maioria das vendas trava',
    ],
    note: 'Foi onde eu entendi que corretor bom não é o que fala mais: é o que conhece o prédio.',
  },
  {
    kind: 'education', org: 'SENAC São Paulo', role: 'Técnico em Transações Imobiliárias (TTI)',
    period_start: '2006', period_end: '2007', atual: false, location: 'São Paulo, SP',
    highlights: [
      'Curso técnico exigido pelo COFECI para tirar o CRECI',
      'Direito imobiliário, avaliação de imóveis e ética profissional',
    ],
    note: 'O TTI é o que habilita a inscrição no CRECI. Sem ele não existe corretor legal.',
  },
];

// ------------------------------------------------------- 0. O WIZARD, "SUA ÁREA"
// O que a base.mjs faz por baixo e responder NADA nesse campo, entao o portfolio nasce sem
// kit. Aqui a gente le a lista e registra por escrito que nao ha imoveis nela.
if (fazer('wizard')) {
  console.log('\n== A PERGUNTA "SUA ÁREA" DO WIZARD ==');
  const areas = await pagina.evaluate(() => {
    const s = document.getElementById('wz-kit');
    if (!s) return null;
    return [...s.options].map((o) => `${o.value || '(vazio)'}=${o.textContent.trim()}`);
  });
  if (!areas) {
    console.log('  (o wizard ja tinha passado nesta sessao; a lista sai da RPC list_starter_kits)');
  } else {
    console.log(areas.join('\n'));
    await writeFile('out/corretor-areas-wizard.txt', areas.join('\n'), 'utf8');
  }
}

// ------------------------------------------------- 1. CENSO DOS CAMPOS DE PERFIL
if (fazer('censo')) {
  console.log('\n== CENSO DE CAMPOS DO PERFIL (procurando o CRECI) ==');
  await abrirPainelPor('perfil');
  await abrirTodosOsPassos();
  const censo = await pagina.evaluate(() => {
    const g = document.querySelector('#ed-gaveta');
    return [...g.querySelectorAll('.ed-field')].map((f) => ({
      key: f.dataset.campo || '',
      passo: f.closest('details')?.querySelector('.ed-passo-titulo')?.innerText.trim() || 'O básico (sempre aberto)',
      label: (f.querySelector('.ed-label')?.innerText || '').trim().replace(/\n/g, ' '),
      help: (f.querySelector('.ed-help')?.innerText || '').trim(),
      lock: Boolean(f.querySelector('.ed-lock')),
    }));
  });
  const linhas = censo.map((c, i) => `${String(i + 1).padStart(2)}. <${c.passo}> ${c.lock ? '[CADEADO] ' : ''}${c.key} :: "${c.label}"${c.help ? ` :: ajuda="${c.help}"` : ''}`);
  console.log(linhas.join('\n'));
  await writeFile('out/corretor-censo-perfil.txt', `${linhas.join('\n')}\n\nTOTAL: ${censo.length}\n`, 'utf8');

  const temRegistro = censo.some((c) => /registro|creci|conselho|oab|crp|crm/i.test(`${c.key} ${c.label} ${c.help}`));
  if (!temRegistro) {
    nota('BLOQUEIO', `NAO existe campo de registro profissional no perfil. ${censo.length} campos varridos, nenhum menciona registro/CRECI/conselho. A migration 0024 criou a coluna registro_profissional e a montou no payload como profile.registro, mas nenhum arquivo de src/ escreve nela nem a renderiza: e coluna morta.`);
  }
  await pagina.keyboard.press('Escape');
  await esperar(600);

  // O mesmo censo no formulario de um imovel: e ali que preco/area/quartos/bairro precisariam
  // caber, e o relatorio precisa da lista exata do que existe.
  console.log('\n== CENSO DE CAMPOS DE UM IMÓVEL ==');
  await abrirPainelPor('projetos');
  await pagina.locator(`${G} [data-adicionar]`).first().click();
  await esperar(1200);
  await abrirTodosOsPassos();
  const censoP = await pagina.evaluate(() => {
    const g = document.querySelector('#ed-gaveta');
    return [...g.querySelectorAll('.ed-field')].map((f) => ({
      key: f.dataset.campo || '',
      passo: f.closest('details')?.querySelector('.ed-passo-titulo')?.innerText.trim() || 'O básico (sempre aberto)',
      label: (f.querySelector('.ed-label')?.innerText || '').trim().replace(/\n/g, ' '),
      help: (f.querySelector('.ed-help')?.innerText || '').trim(),
      lock: Boolean(f.querySelector('.ed-lock')),
    }));
  });
  const lp = censoP.map((c, i) => `${String(i + 1).padStart(2)}. <${c.passo}> ${c.lock ? '[CADEADO] ' : ''}${c.key} :: "${c.label}"${c.help ? ` :: ajuda="${c.help}"` : ''}`);
  console.log(lp.join('\n'));
  await writeFile('out/corretor-censo-imovel.txt', `${lp.join('\n')}\n\nTOTAL: ${censoP.length}\n`, 'utf8');
  await tiro('form-imovel', true);
  await pagina.keyboard.press('Escape');
  await esperar(800);
}

// -------------------------------------------------------------------- 2. PERFIL
if (fazer('perfil')) {
  console.log('\n== PERFIL ==');
  await abrirPainelPor('perfil');
  await abrirTodosOsPassos();

  await preencher('display_name', demo.nome);
  await preencher('role', demo.role);
  await preencher('bio', BIO);

  await preencher('badge_label', 'Corretor CRECI-SP');
  const icones = await pagina.evaluate(() =>
    [...document.querySelectorAll('#ed-gaveta [data-campo="badge_icon"] option')].map((o) => `${o.value}=${o.textContent.trim()}`));
  console.log(`  icones do selo: ${icones.join(' / ')}`);
  await writeFile('out/corretor-icones-selo.txt', icones.join('\n'), 'utf8');
  if (!icones.some((i) => /casa|home|chave|key|predio|building|imov/i.test(i))) {
    nota('BURACO', `nenhum dos ${icones.length - 1} icones do selo e casa, chave ou predio. O menos errado para um corretor e "Maleta" (briefcase), que serve para qualquer profissao e nao diz nada.`);
  }
  await selecionar('badge_icon', 'briefcase');

  await subirImagem('hero', 'hero.jpg', '(1200x1500)');
  await abrirTodosOsPassos();
  await subirImagem('avatar', 'avatar.jpg', '(800x800)');
  await abrirTodosOsPassos();

  await preencher('contact_email', 'wilson@tavaresimoveis.com.br');
  await ligarSwitch('show_contact_email', true);
  await abrirTodosOsPassos();

  await preencher('cta_url', 'https://wa.me/5511982147730');
  const ctaLabel = pagina.locator(`${G} [data-campo="cta_label"] input`).first();
  if (!(await ctaLabel.count())) nota('AUSENTE', 'campo cta_label');
  else if (await ctaLabel.isDisabled()) {
    const rotuloPadrao = await pagina.evaluate(() => {
      const b = document.querySelector('#ed-canvas a[data-cta], #ed-canvas [data-cta]');
      return b ? b.innerText.trim() : '(nao achei o botao no canvas)';
    });
    nota('PAGO', `"Texto do botão" (cta_label) veio com cadeado. O botao publica o rotulo padrao: "${rotuloPadrao}"`);
  } else await ctaLabel.fill('Falar no WhatsApp');

  await preencher('socials', SOCIAIS);
  await preencher('stats', NUMEROS);

  await abrirTodosOsPassos();
  await chips('stacks', ESPECIALIDADES);
  await abrirTodosOsPassos();
  await ligarSwitch('show_online_dot', true);
  await selecionar('projects_per_page', '6');
  await abrirTodosOsPassos();
  await preencher('seo_title', 'Wilson Tavares | Corretor de imóveis na Zona Sul de SP');
  await preencher('seo_description', 'Venda e locação em Moema, Vila Nova Conceição, Brooklin, Campo Belo e Itaim. CRECI-SP 214.556. Avaliação sem custo.');

  await writeFile('out/corretor-perfil-gaveta.txt', await textoGaveta(), 'utf8');
  await tiro('perfil-preenchido');
  await salvar('perfil');
  await esperar(1500);
}

// ---------------------------------------- 3. "A PÁGINA": rotulos, paleta e fundo
if (fazer('pagina')) {
  console.log('\n== A PÁGINA (rótulos, paleta, fundo) ==');
  await abrirPainelPor('perfil');
  await abrirTodosOsPassos();

  await preencher('rotulo_projects', 'Imóveis disponíveis');
  await preencher('rotulo_cases', 'imóveis');
  await preencher('rotulo_stacks', 'Onde eu atuo');
  await preencher('rotulo_experience', 'Minha trajetória');
  await preencher('rotulo_about', 'Quem é o Wilson');
  await abrirTodosOsPassos();
  // Os quatro de dentro da janela do imovel. Sao o unico lugar onde dado estruturado pode
  // ganhar nome proprio, e por isso valem ouro para esta persona.
  await preencher('rotulo_challenge', 'Ficha do imóvel');
  await preencher('rotulo_solution', 'O que eu acho dele');
  await preencher('rotulo_features', 'Detalhes e condições');
  await preencher('rotulo_stackLabel', 'Lazer e infraestrutura');
  await preencher('rotulo_visit', 'Ver no portal');

  await abrirTodosOsPassos();
  const paletas = await pagina.evaluate(() =>
    [...document.querySelectorAll('#ed-gaveta [data-campo="theme_preset"] option')].map((o) => `${o.value}=${o.textContent.trim()}`));
  console.log(`  paletas: ${paletas.join(' / ')}`);
  await writeFile('out/corretor-paletas.txt', paletas.join('\n'), 'utf8');
  await selecionar('theme_preset', 'ouro');
  await abrirTodosOsPassos();
  await selecionar('background_kind', 'grid');

  await tiro('pagina-preenchida');
  await salvar('a página');
  await esperar(1500);
}

// ------------------------------------------------------------------- 4. IMÓVEIS
if (fazer('imoveis')) {
  console.log('\n== IMÓVEIS ==');
  await abrirPainelPor('projetos');
  const jaTem = await pagina.evaluate(() =>
    [...document.querySelectorAll('#ed-gaveta .ed-lista-titulo')].map((e) => e.textContent.trim()));
  console.log(`  ja cadastrados: ${jaTem.length ? jaTem.join(', ') : '(nenhum)'}`);

  for (const im of IMOVEIS) {
    if (jaTem.includes(im.name)) { console.log(`  pulando "${im.name}" (ja existe)`); continue; }
    console.log(`  -> ${im.name}`);
    await pagina.locator(`${G} [data-adicionar]`).first().click();
    await esperar(1200);
    await abrirTodosOsPassos();

    await preencher('name', im.name);
    await preencher('category', im.category);
    // O UNICO campo curto que aparece na grade. Levo o preco, e tento levar tambem area,
    // quartos e vagas: se estourar o maxlength, o relatorio precisa saber onde cortou.
    const antes = im.highlight;
    await preencher('highlight', antes);
    const gravado = await pagina.evaluate(() =>
      document.querySelector('#ed-gaveta [data-campo="highlight"] input')?.value || '');
    if (gravado !== antes) {
      nota('DEFEITO', `"Preço, prazo ou condição" cortou em ${gravado.length} de ${antes.length} caracteres. Queria "${antes}", ficou "${gravado}". Preco + area + quartos + vagas nao cabem em 60.`);
    }
    await preencher('tagline', im.tagline);

    await abrirTodosOsPassos();
    // A FICHA DO IMOVEL nao tem campo nenhum. O jeito de nao perder o dado e enfiar no
    // textarea do passo 2, que na pagina publica vira um paragrafo de texto corrido.
    await preencher('problem', [
      `Bairro: ${im.bairro}`,
      `Área útil: ${im.area}`,
      `Dormitórios: ${im.quartos}`,
      `Vagas de garagem: ${im.vagas}`,
      `Condomínio: ${im.condominio}`,
      `IPTU: ${im.iptu}`,
      `Situação: ${im.category === 'Venda' ? 'à venda' : 'para locação'}`,
    ].join('\n'));
    await preencher('solution', 'Visitei este imóvel pessoalmente antes de anunciar. Agende comigo pelo WhatsApp e eu levo a documentação na visita.');
    const feats = pagina.locator(`${G} [data-linhas="features"]`).first();
    if (await feats.count()) {
      await feats.fill([
        `Aceita financiamento bancário${im.category === 'Locação' ? ' (não se aplica: é locação)' : ''}`,
        'Documentação conferida e escritura regular',
        'Visita com hora marcada, de segunda a sábado',
      ].join('\n'));
      await esperar(200);
    }

    await abrirTodosOsPassos();
    await selecionar('year', im.year);
    await abrirTodosOsPassos();
    await chips('groups', im.groups);
    await abrirTodosOsPassos();
    await chips('stack', ['Portaria 24h', 'Elevador social e de serviço', 'Piscina', 'Salão de festas']);

    await abrirTodosOsPassos();
    await selecionar('image_fit', 'cover');
    await abrirTodosOsPassos();
    await subirImagem('image', im.imagem, im.panoramica ? '(panoramica 2000x700)' : '');

    // GALERIA: os slots nascem um de cada vez, entao entre uma foto e a proxima e preciso
    // reabrir os passos para o slot novo existir.
    let i = 1;
    for (const foto of im.galeria) {
      await abrirTodosOsPassos();
      const ok = await subirImagem(`gallery_${i}`, foto);
      if (!ok) break;
      i += 1;
    }

    await abrirTodosOsPassos();
    await salvar(im.name);
    await esperar(1200);
    await abrirPainelPor('projetos');
  }
  await tiro('lista-imoveis');
  await pagina.keyboard.press('Escape');
  await esperar(700);
}

// -------------------------------------------------------------- 5. EXPERIÊNCIAS
if (fazer('experiencias')) {
  console.log('\n== EXPERIÊNCIAS ==');
  await abrirPainelPor('experiencias');
  const jaTem = await pagina.evaluate(() =>
    [...document.querySelectorAll('#ed-gaveta .ed-lista-titulo')].map((e) => e.textContent.trim()));
  console.log(`  ja cadastradas: ${jaTem.length ? jaTem.join(', ') : '(nenhuma)'}`);

  for (const x of EXPERIENCIAS) {
    if (jaTem.includes(x.org)) { console.log(`  pulando "${x.org}" (ja existe)`); continue; }
    console.log(`  -> ${x.org}`);
    await pagina.locator(`${G} [data-adicionar]`).first().click();
    await esperar(1200);
    await abrirTodosOsPassos();

    const btn = pagina.locator(`${G} [data-escolha="kind"][data-valor="${x.kind}"]`).first();
    if (await btn.count()) { await btn.click(); await esperar(600); }
    await abrirTodosOsPassos();

    await preencher('org', x.org);
    await preencher('role', x.role);
    await preencher('period_start', x.period_start);
    await ligarSwitch('atual', Boolean(x.atual));
    await abrirTodosOsPassos();
    if (!x.atual) await preencher('period_end', x.period_end);
    await abrirTodosOsPassos();
    await preencher('location', x.location);
    const hl = pagina.locator(`${G} [data-linhas="highlights"]`).first();
    if (await hl.count()) { await hl.fill(x.highlights.join('\n')); await esperar(200); }
    await abrirTodosOsPassos();
    await preencher('note', x.note);
    if (x.logo) { await abrirTodosOsPassos(); await subirImagem('logo', x.logo); }

    await abrirTodosOsPassos();
    await salvar(x.org);
    await esperar(1000);
    await abrirPainelPor('experiencias');
  }
  await pagina.keyboard.press('Escape');
  await esperar(700);
}

// ------------------------------------ 6. O CATÁLOGO QUE MUDA: o imóvel foi vendido
// Esta e a segunda metade da hipotese. Vendeu, e agora? Existe "tirar do ar sem apagar"?
if (fazer('vendido')) {
  console.log('\n== O IMÓVEL VENDEU. E AGORA? ==');
  await abrirPainelPor('projetos');
  await esperar(800);
  const lista = await textoGaveta();
  await writeFile('out/corretor-lista-imoveis.txt', lista, 'utf8');

  const acoes = await pagina.evaluate(() => {
    const g = document.querySelector('#ed-gaveta');
    return [...g.querySelectorAll('button')].map((b) =>
      `${(b.innerText || b.getAttribute('aria-label') || '').trim()} [${Object.keys(b.dataset).join(',')}]`).filter(Boolean);
  });
  console.log(`  acoes na lista: ${acoes.join(' | ')}`);

  // Abro o primeiro e procuro por um switch de visibilidade / "vendido" / "arquivar".
  await pagina.locator(`${G} [data-editar]`).first().click();
  await esperar(1200);
  await abrirTodosOsPassos();
  const chaves = await pagina.evaluate(() =>
    [...document.querySelectorAll('#ed-gaveta .ed-field')].map((f) => `${f.dataset.campo}::${(f.querySelector('.ed-label')?.innerText || '').trim()}`));
  const temVisivel = chaves.some((k) => /visivel|visible|ocultar|arquiv|rascunho|publicad/i.test(k));
  if (!temVisivel) {
    nota('BLOQUEIO', `nao existe "ocultar sem apagar" por trabalho. A coluna is_visible existe no banco e o payload ja filtra por ela (where pj.is_visible), mas nenhum campo do formulario a expoe. Vendeu o imovel, so ha duas saidas: APAGAR (perde a foto, o texto e a prova de que ele vendeu) ou deixar no ar anunciando o que nao existe mais.`);
  }
  // O contorno possivel hoje, e ele e feio: escrever "VENDIDO" no campo de preco.
  const hl = pagina.locator(`${G} [data-campo="highlight"] input`).first();
  if (await hl.count()) {
    const antes = await hl.inputValue();
    await hl.fill('VENDIDO em 08/2026 · era R$ 2.850.000');
    console.log(`  contorno aplicado no primeiro imovel: "${antes}" -> "VENDIDO em 08/2026 · era R$ 2.850.000"`);
    await abrirTodosOsPassos();
    await salvar('imóvel marcado como vendido');
  }
  await esperar(1000);
  await pagina.keyboard.press('Escape');
  await esperar(700);
}

// ------------------------------------------------------------------ 7. PUBLICAR
if (fazer('publicar')) {
  console.log('\n== PUBLICAR ==');
  await abrirPainelPor('publicar');
  await esperar(1000);
  const antes = await textoGaveta();
  await writeFile('out/corretor-publicar-antes.txt', antes, 'utf8');
  console.log(antes.slice(0, 1500));
  await tiro('publicar-antes');

  const btn = pagina.locator(`${G} [data-publicar]`).first();
  if (!(await btn.count())) nota('AUSENTE', 'botao Publicar');
  else if (await btn.isDisabled()) nota('BLOQUEIO', 'botao Publicar veio desabilitado');
  else {
    await btn.click();
    await esperar(9000);
    const depois = await textoGaveta();
    await writeFile('out/corretor-publicar-depois.txt', depois, 'utf8');
    console.log('--- depois ---');
    console.log(depois.slice(0, 1500));
    await tiro('publicar-depois');
  }
}

// ------------------------------------------------------------------- 8. LEITURA
if (fazer('ler')) {
  console.log('\n== COMO O CLIENTE VÊ ==');
  await pagina.goto(`${APEX}/app?cb=${Date.now()}`, { waitUntil: 'networkidle' });
  await esperar(3000);
  const ver = pagina.locator('[data-abrir="ver-visitante"], button:has-text("Ver como visitante")').first();
  if (await ver.count()) { await ver.click(); await esperar(4500); }
  else nota('AUSENTE', 'botao "Ver como visitante" na barra do topo');

  await pagina.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 400) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 110)); }
    window.scrollTo(0, 0);
  });
  await esperar(1500);
  await pagina.screenshot({ path: 'out/corretor-visitante.png', fullPage: true });
  const visita = await pagina.evaluate(() => document.body.innerText);
  await writeFile('out/corretor-visitante.txt', visita, 'utf8');
  console.log(visita.slice(0, 3000));

  // A janela de um imovel, que e onde a ficha tecnica foi parar.
  const card = pagina.locator('[data-projeto], .proj-card, article').first();
  if (await card.count()) {
    await card.click();
    await esperar(2500);
    await pagina.screenshot({ path: 'out/corretor-janela-imovel.png', fullPage: true });
    const modal = await pagina.evaluate(() =>
      document.querySelector('[role="dialog"], .modal, #modal')?.innerText || '(nao achei a janela)');
    await writeFile('out/corretor-janela-imovel.txt', modal, 'utf8');
    console.log('\n-- janela do imovel --');
    console.log(modal.slice(0, 2500));
  }

  // No celular, que e de onde o cliente de imovel abre o link do WhatsApp.
  await pagina.keyboard.press('Escape');
  await esperar(800);
  await pagina.setViewportSize({ width: 390, height: 844 });
  await esperar(2500);
  await pagina.screenshot({ path: 'out/corretor-visitante-celular.png', fullPage: true });
  await pagina.setViewportSize({ width: 1440, height: 900 });

  const r = await pagina.request.get(`https://${demo.slug}.myportifolio.com.br/`);
  console.log(`\nURL publica: HTTP ${r.status()}`);
  const corpo = await r.text();
  await writeFile('out/corretor-url-publica.txt', `HTTP ${r.status()}\n\n${corpo.slice(0, 5000)}`, 'utf8');
  if (/registro|CRECI/i.test(corpo)) console.log('  a pagina publica MENCIONA o CRECI');
  else nota('CONFIRMA', 'o HTML publico nao tem a palavra CRECI em lugar nenhum fora do que eu digitei a mao em campos de texto livre');
}

// ------------------------------------------------------------------- FECHAMENTO
console.log(`\n== ATRITO (${atrito.length}) ==`);
console.log(atrito.join('\n') || '(nenhum)');
console.log(`\n== ERROS DE CONSOLE / REDE (${erros.length}) ==`);
console.log([...new Set(erros)].slice(0, 40).join('\n') || '(nenhum)');
console.log(`\ntempo: ${Math.round((Date.now() - t0) / 1000)}s`);
await writeFile('out/corretor-atrito.txt',
  `${atrito.join('\n')}\n\n--- erros ---\n${[...new Set(erros)].join('\n')}\n`, 'utf8');
await navegador.close();
