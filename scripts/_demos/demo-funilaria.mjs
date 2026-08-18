// Agente de nicho, segunda rodada: Zé Ricardo Pimenta, funileiro e pintor (slug demo-funilaria).
//
// TRES hipoteses que nenhuma das onze primeiras personas testou:
//   1. o trabalho e ANTES e DEPOIS, lado a lado. Uma foto sozinha nao prova nada;
//   2. ele tem PONTO FISICO: endereco de rua e horario de funcionamento;
//   3. e o MENOR letramento digital das catorze. So usa WhatsApp. Nao sabe o que e
//      "portfolio", chama a pagina de "meu site", e qualquer palavra de escritorio na tela
//      e um achado, nao um detalhe.
//
// Uso:
//   node scripts/_demos/demo-funilaria.mjs            (tudo)
//   node scripts/_demos/demo-funilaria.mjs perfil     (wizard|perfil|censo|projetos|experiencias|publicar|ler|celular)
import { abrirEditor, esperar } from './base.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ETAPA = process.argv[2] || 'tudo';
const fazer = (n) => ETAPA === 'tudo' || ETAPA === n;
const MIDIA = path.resolve('out/midia/demo-funilaria');
const m = (f) => path.join(MIDIA, f);
const G = '#ed-gaveta';

const atrito = [];
const nota = (nivel, texto) => { atrito.push(`[${nivel}] ${texto}`); console.log(`  ! ${nivel}: ${texto}`); };
const cortes = [];

await mkdir('out', { recursive: true });
const { pagina, navegador, demo, erros, APEX } = await abrirEditor('demo-funilaria', { headless: true });
console.log(`editor aberto para ${demo.nome} (${demo.slug})`);

// ---------------------------------------------------------------- utilitarios
const tiro = async (nome, inteiro = false) => {
  try { await pagina.screenshot({ path: `out/funil-${nome}.png`, fullPage: inteiro }); } catch {}
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
  if (await el.isDisabled()) { nota('BLOQUEADO', `campo "${key}" veio desabilitado (cadeado)`); return false; }
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
  if (agora !== ligado) { await el.click(); await esperar(500); }
  return true;
}

async function chips(key, lista) {
  for (const texto of lista) {
    const inp = pagina.locator(`${G} [data-chip-add="${key}"]`).first();
    if (!(await inp.count())) { nota('AUSENTE', `chips "${key}" nao existe`); return; }
    if (await inp.isDisabled()) { nota('LIMITE', `chips "${key}" travou em "${texto}"`); return; }
    await inp.fill(texto);
    await inp.press('Enter');
    await esperar(320);
  }
}

async function subirImagem(key, arquivo, origem, rotuloCorte) {
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
      console.log(`  imagem ${key}: ${origem} -> ${r.w}x${r.h}`);
      if (rotuloCorte) {
        const [ow, oh] = origem.split('x').map(Number);
        const guardado = oh ? Math.round((((r.h / r.w) * ow) / oh) * 100) : 0;
        cortes.push({ peca: rotuloCorte, arquivo, entrada: origem, saida: `${r.w}x${r.h}`, alturaMantida: `${guardado}%` });
      }
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
// Bio no tom dele: frase curta, palavra de oficina, e o endereco enfiado no fim porque nao
// existe campo de endereco em lugar nenhum do produto (ver secao do relatorio).
const BIO = [
  'Sou o Zé Ricardo, funileiro e pintor há 22 anos. Toco a oficina no bairro Amazonas, em Contagem, com meu filho e mais dois ajudantes.',
  'Faço batida de porta, para-choque, repintura da cor inteira, polimento e martelinho de ouro. Pego carro de seguro e carro de particular.',
  'Manda a foto do estrago no WhatsApp que eu te passo o preço no mesmo dia. Ou traz o carro aqui que eu olho na hora e não cobro nada por isso.',
  'A oficina fica na Rua São Geraldo, 412, bairro Amazonas, Contagem, MG. Abro de segunda a sexta das 8h às 18h e no sábado até meio-dia.',
].join(' ');

// WhatsApp em primeiro. "Onde fica" e "Horário" entram aqui na marra, porque o campo de redes
// e o unico lugar do produto que aceita um par rotulo/texto: mas ele EXIGE link.
const SOCIAIS = [
  'WhatsApp | (31) 98844-7120 | https://wa.me/5531988447120',
  'Onde fica | Rua São Geraldo, 412, bairro Amazonas, Contagem MG | https://www.google.com/maps/search/?api=1&query=Rua+Sao+Geraldo+412+Contagem+MG',
  'Horário | Seg a sex 8h às 18h, sábado até meio-dia | https://wa.me/5531988447120',
  'Facebook | Funilaria do Zé Ricardo | https://facebook.com/funilariadozericardo',
].join('\n');

const NUMEROS = [
  'Anos de oficina | 22',
  'Carros por mês | 40',
  'Seguradoras que atendo | 6',
  'Orçamento | na hora',
].join('\n');

const ESPECIALIDADES = [
  'Funilaria', 'Pintura automotiva', 'Martelinho de ouro', 'Polimento e cristalização',
  'Troca de para-choque', 'Solda e alinhamento de chassi', 'Pintura de roda', 'Carro de seguro',
];

// Seis servicos. Cada um leva a capa (foto do trabalho em andamento) e o PAR antes/depois na
// galeria, nessa ordem: e o teste central desta persona.
const SERVICOS = [
  {
    name: 'Porta amassada de Gol',
    category: 'Batida de porta',
    highlight: 'A partir de R$ 450, pronto em 2 dias',
    tagline: 'Bateram na porta do lado do motorista no estacionamento. Puxei a lata, massa fina e pintei a porta inteira.',
    problem: 'Porta funda de um lado só, com o vinco marcado e a tinta rachada. O dono achou que ia ter que trocar a porta.',
    solution: 'Puxei a lata pelo lado de dentro, dei massa fina, lixei e pintei a porta inteira na cor de fábrica. Não trocou peça nenhuma.',
    features: ['Puxada da lata', 'Massa e lixamento', 'Pintura da porta inteira', 'Polimento no fim'],
    stack: ['Tinta PU', 'Massa poliéster', 'Verniz'],
    year: '2025', groups: ['Funilaria', 'Pintura'],
    capa: 'capa-1.jpg', antes: 'antes-1.jpg', depois: 'depois-1.jpg',
  },
  {
    name: 'Para-choque rachado do Onix',
    category: 'Para-choque',
    highlight: 'R$ 380 com a pintura junto',
    tagline: 'Rachou de raspar no meio-fio. Soldei o plástico, dei acabamento e pintei igual ao resto do carro.',
    problem: 'Para-choque rachado de ponta a ponta e com o encaixe quebrado. Peça nova custava três vezes o conserto.',
    solution: 'Soldei o plástico por trás, reforcei o encaixe, dei massa e pintei na cor do carro. Ficou sem emenda aparente.',
    features: ['Solda de plástico', 'Reforço do encaixe', 'Pintura na cor certa'],
    stack: ['Solda plástica', 'Primer para plástico', 'Tinta PU'],
    year: '2025', groups: ['Funilaria'],
    capa: 'capa-2.jpg', antes: 'antes-2.jpg', depois: 'depois-2.jpg',
  },
  {
    name: 'Repintura completa do Palio',
    category: 'Repintura completa',
    highlight: 'A partir de R$ 3.200, 5 dias na oficina',
    tagline: 'Carro de 2008 com a tinta toda desbotada e ferrugem no capô. Saiu daqui parecendo outro.',
    problem: 'Tinta queimada de sol, verniz descascando no teto e ferrugem começando na beirada do capô.',
    solution: 'Tirei a ferrugem, tratei a chapa, lixei o carro inteiro e pintei tudo de novo com verniz por cima.',
    features: ['Tratamento da ferrugem', 'Lixamento do carro inteiro', 'Pintura completa', 'Verniz e polimento'],
    stack: ['Tinta PU', 'Fundo anticorrosivo', 'Verniz alto sólido'],
    year: '2024', groups: ['Pintura'],
    capa: 'capa-3.jpg', antes: 'antes-3.jpg', depois: 'depois-3.jpg',
  },
  {
    name: 'Polimento e cristalização',
    category: 'Polimento',
    highlight: 'R$ 350, fica pronto no mesmo dia',
    tagline: 'Tira risco de lavagem, marca de chuva e deixa a pintura brilhando de novo.',
    problem: 'Pintura opaca, cheia de risco fino de máquina de lavar e mancha de chuva ácida.',
    solution: 'Polimento em três etapas e cristalização na mão. Não pinta nada, só recupera o que já está lá.',
    features: ['Lavagem e descontaminação', 'Polimento em três etapas', 'Cristalização'],
    stack: ['Politriz', 'Massa de corte', 'Cera de carnaúba'],
    year: '2025', groups: ['Polimento'],
    capa: 'capa-4.jpg', antes: 'antes-4.jpg', depois: 'depois-4.jpg',
  },
  {
    name: 'Martelinho de ouro no capô',
    category: 'Martelinho de ouro',
    highlight: 'R$ 180 por mossa, sem pintar',
    tagline: 'Mossa de granizo saiu pelo lado de dentro. Não lixa, não pinta, e a tinta continua a de fábrica.',
    problem: 'Capô e teto marcados de granizo. Pintar de novo tiraria a tinta original e derrubaria o valor do carro.',
    solution: 'Empurrei cada mossa pelo lado de dentro com haste. A tinta de fábrica continua intacta.',
    features: ['Sem lixa e sem tinta', 'Mantém a pintura de fábrica', 'Pronto no mesmo dia'],
    stack: ['Hastes de martelinho', 'Lâmpada de leitura'],
    year: '2024', groups: ['Martelinho de ouro'],
    capa: 'capa-5.jpg', antes: 'antes-5.jpg', depois: 'depois-5.jpg',
  },
  {
    name: 'Batida de frente do HB20',
    category: 'Funilaria pesada',
    highlight: 'Orçamento na hora, atendo seguro',
    tagline: 'Frente inteira amassada. Troquei o que não dava pra puxar e pintei a dianteira toda.',
    problem: 'Batida de frente com longarina torta, farol quebrado e capô enrugado. Carro de seguro, com vistoria.',
    solution: 'Alinhei o chassi na maca, troquei capô e farol, puxei o para-lama e pintei a frente inteira.',
    features: ['Alinhamento de chassi', 'Troca de capô e farol', 'Pintura da dianteira', 'Laudo para a seguradora'],
    stack: ['Maca de alinhamento', 'Tinta PU', 'Peças originais'],
    year: '2024', groups: ['Funilaria', 'Seguro'],
    capa: 'capa-6.jpg', antes: 'antes-6.jpg', depois: 'depois-6.jpg',
  },
];

const EXPERIENCIAS = [
  {
    kind: 'work', org: 'Funilaria do Zé Ricardo', role: 'Dono e funileiro',
    period_start: '2009', atual: true, location: 'Contagem, MG',
    highlights: [
      'Abri a oficina com um compressor emprestado e uma cabine de pintura improvisada',
      'Hoje somos quatro e passam uns 40 carros por mês',
      'Atendo seis seguradoras e faço orçamento na hora, sem cobrar',
    ],
    note: 'A oficina fica na Rua São Geraldo, 412, bairro Amazonas. Segunda a sexta das 8h às 18h, sábado até meio-dia.',
  },
  {
    kind: 'work', org: 'Auto Center Betim', role: 'Funileiro e pintor',
    period_start: '1998', period_end: '2009', atual: false, location: 'Betim, MG',
    highlights: [
      'Onze anos batendo lata e pintando carro de concessionária',
      'Aprendi cabine de pintura e leitura de cor com quem trabalhava na fábrica',
      'Foi lá que peguei o jeito de martelinho de ouro',
    ],
  },
];

// --------------------------------------------------------------------- WIZARD
// O wizard ja passou dentro de abrirEditor. Aqui a sonda: a lista de "Sua area" e o que ele
// encontraria (ou nao) nela.
if (fazer('wizard')) {
  console.log('\n== SONDA: a pergunta "Sua área" do wizard ==');
  const kits = await pagina.evaluate(async () => {
    // A lista vem da RPC listar_starter_kits. Se o wizard ja passou, lemos direto do banco
    // pela mesma sessao que o editor usa.
    const r = await fetch('https://fxchcqlbjszichhbllzm.supabase.co/rest/v1/rpc/listar_starter_kits', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: window.__SB_ANON__ || '',
        Authorization: `Bearer ${JSON.parse(localStorage.getItem('sb-fxchcqlbjszichhbllzm-auth-token') || '{}').access_token}`,
      },
      body: '{}',
    });
    return r.ok ? r.json() : { erro: r.status };
  });
  console.log('  kits oferecidos:', JSON.stringify(kits));
  await writeFile('out/funil-kits.json', JSON.stringify(kits, null, 2), 'utf8');
}

// -------------------------------------------------------------------- PERFIL
if (fazer('perfil')) {
  console.log('\n== PERFIL ==');
  await abrirPainelPor('perfil');
  await abrirTodosOsPassos();
  await tiro('perfil-aberto', true);

  // Censo do vocabulario: TODO rotulo e ajuda que a tela mostra, para julgar palavra por
  // palavra pelos olhos de quem so usa WhatsApp.
  const vocab = await pagina.evaluate(() => {
    const g = document.querySelector('#ed-gaveta');
    return [...g.querySelectorAll('.ed-field')].map((f) => ({
      key: f.dataset.campo || '',
      passo: f.closest('details')?.querySelector('.ed-passo-titulo')?.innerText.trim() || '(sempre aberto)',
      label: (f.querySelector('.ed-label')?.innerText || '').trim().replace(/\n/g, ' '),
      help: (f.querySelector('.ed-help')?.innerText || '').trim().replace(/\n/g, ' '),
      lock: Boolean(f.querySelector('.ed-lock')),
    }));
  });
  await writeFile('out/funil-vocab-perfil.txt',
    vocab.map((v, i) => `${String(i + 1).padStart(2)}. <${v.passo}> ${v.lock ? '[CADEADO] ' : ''}${v.key} :: "${v.label}"${v.help ? ` :: ajuda="${v.help}"` : ''}`).join('\n'), 'utf8');
  console.log(`  ${vocab.length} campos de perfil catalogados em out/funil-vocab-perfil.txt`);

  await preencher('display_name', demo.nome);
  await preencher('role', demo.role);
  await preencher('bio', BIO);
  await preencher('badge_label', 'Funileiro e pintor');

  const icones = await pagina.evaluate(() =>
    [...document.querySelectorAll('#ed-gaveta [data-campo="badge_icon"] option')].map((o) => `${o.value}=${o.textContent.trim()}`));
  await writeFile('out/funil-icones-selo.txt', icones.join('\n'), 'utf8');
  if (!icones.some((i) => /carro|car|spray|pincel|martelo/i.test(i))) {
    nota('BURACO', `nenhum dos ${icones.length - 1} icones do selo e de oficina; o mais proximo e "Chave inglesa" (wrench), que e de mecanico, nao de funileiro`);
  }
  await selecionar('badge_icon', 'wrench');

  await subirImagem('hero', 'hero.jpg', '1400x1716', 'perfil (foto grande)');
  await abrirTodosOsPassos();
  await subirImagem('avatar', 'avatar.jpg', '1400x1867', 'perfil (foto pequena)');
  await abrirTodosOsPassos();

  await preencher('contact_email', 'zericardo.funilaria@gmail.com');
  await ligarSwitch('show_contact_email', false);
  await abrirTodosOsPassos();

  await preencher('cta_url', 'https://wa.me/5531988447120');
  const ctaLabel = pagina.locator(`${G} [data-campo="cta_label"] input`).first();
  if (!(await ctaLabel.count())) nota('AUSENTE', 'campo cta_label');
  else if (await ctaLabel.isDisabled()) {
    const rotuloPadrao = await pagina.evaluate(() => {
      const b = document.querySelector('#ed-canvas a[data-cta], #ed-canvas [data-cta]');
      return b ? b.innerText.trim() : '(nao achei o botao)';
    });
    nota('PAGO', `"Texto do botão" veio com cadeado. O botao publica: "${rotuloPadrao}"`);
  } else await ctaLabel.fill('Chamar no WhatsApp');

  await preencher('socials', SOCIAIS);
  await preencher('stats', NUMEROS);
  await abrirTodosOsPassos();
  await chips('stacks', ESPECIALIDADES);
  await abrirTodosOsPassos();

  // Passo 3, "A página": rotulos das secoes, paleta e fundo.
  await preencher('rotulo_stacks', 'O que eu faço');
  await preencher('rotulo_projects', 'Serviços da oficina');
  await preencher('rotulo_cases', 'serviços');
  await preencher('rotulo_experience', 'Onde eu trabalhei');
  await preencher('rotulo_about', 'Sobre mim');
  await abrirTodosOsPassos();
  await selecionar('theme_preset', 'sangue');
  await abrirTodosOsPassos();
  await selecionar('background_kind', 'vinheta');
  await abrirTodosOsPassos();
  await selecionar('projects_per_page', '6');
  await ligarSwitch('show_online_dot', true);
  await abrirTodosOsPassos();

  // Ajustes finos: os quatro rotulos de dentro da janela do trabalho.
  await preencher('rotulo_challenge', 'Como o carro chegou');
  await preencher('rotulo_solution', 'Como ele saiu');
  await preencher('rotulo_features', 'O que está incluso');
  await preencher('rotulo_stackLabel', 'Material que usei');
  await preencher('rotulo_visit', 'Falar comigo');
  await abrirTodosOsPassos();
  await preencher('seo_title', 'Funilaria do Zé Ricardo | Contagem, MG');
  await preencher('seo_description', 'Funilaria e pintura em Contagem, MG. Batida de porta, repintura, polimento e martelinho de ouro. Orçamento na hora pelo WhatsApp.');

  await tiro('perfil-preenchido', true);
  await writeFile('out/funil-perfil-gaveta.txt', await textoGaveta(), 'utf8');
  await salvar('perfil');
  await esperar(1500);
  await tiro('canvas-com-perfil', true);
}

// --------------------------------------- CENSO DE CAMPOS DO FORMULARIO DE SERVICO
if (fazer('censo')) {
  console.log('\n== CENSO DE CAMPOS (um serviço) ==');
  await abrirPainelPor('projetos');
  await pagina.locator(`${G} [data-adicionar]`).first().click();
  await esperar(1000);
  await abrirTodosOsPassos();
  const censo = await pagina.evaluate(() => {
    const g = document.querySelector('#ed-gaveta');
    return [...g.querySelectorAll('.ed-field')].map((f) => ({
      key: f.dataset.campo || '',
      passo: f.closest('details')?.querySelector('.ed-passo-titulo')?.innerText.trim() || '(sempre aberto)',
      label: (f.querySelector('.ed-label')?.innerText || '').trim().replace(/\n/g, ' '),
      help: (f.querySelector('.ed-help')?.innerText || '').trim().replace(/\n/g, ' '),
      lock: Boolean(f.querySelector('.ed-lock')),
    }));
  });
  const linhas = censo.map((c, i) => `${String(i + 1).padStart(2)}. <${c.passo}> ${c.lock ? '[CADEADO] ' : ''}${c.key} :: "${c.label}"${c.help ? ` :: ajuda="${c.help}"` : ''}`);
  console.log(linhas.join('\n'));
  await writeFile('out/funil-censo-servico.txt', `${linhas.join('\n')}\n\nTOTAL VISIVEL: ${censo.length}\n`, 'utf8');
  await tiro('form-servico', true);
  await pagina.keyboard.press('Escape');
  await esperar(800);
}

// ------------------------------------------------------------------- SERVICOS
if (fazer('projetos')) {
  console.log('\n== SERVIÇOS ==');
  await abrirPainelPor('projetos');
  const jaTem = await pagina.evaluate(() =>
    [...document.querySelectorAll('#ed-gaveta .ed-lista-titulo')].map((e) => e.textContent.trim()));
  console.log(`  ja cadastrados: ${jaTem.length ? jaTem.join(', ') : '(nenhum)'}`);

  for (const s of SERVICOS) {
    if (jaTem.includes(s.name)) { console.log(`  pulando "${s.name}" (ja existe)`); continue; }
    console.log(`  -> ${s.name}`);
    await pagina.locator(`${G} [data-adicionar]`).first().click();
    await esperar(1000);
    await abrirTodosOsPassos();

    await preencher('name', s.name);
    await preencher('category', s.category);
    await preencher('highlight', s.highlight);
    await preencher('tagline', s.tagline);
    await abrirTodosOsPassos();
    await preencher('problem', s.problem);
    await preencher('solution', s.solution);
    await preencher('features', s.features.join('\n'));
    await abrirTodosOsPassos();
    await chips('stack', s.stack);
    await abrirTodosOsPassos();
    await selecionar('year', s.year);
    await abrirTodosOsPassos();
    await chips('groups', s.groups);
    await abrirTodosOsPassos();

    await subirImagem('image', s.capa, '1400x933', `${s.name} (capa)`);
    await abrirTodosOsPassos();
    // O PAR: antes na foto 1, depois na foto 2. Nao ha campo de legenda por foto.
    await subirImagem('gallery_1', s.antes, '1400x?', `${s.name} (ANTES)`);
    await abrirTodosOsPassos();
    await subirImagem('gallery_2', s.depois, '1400x?', `${s.name} (DEPOIS)`);
    await abrirTodosOsPassos();

    await salvar(s.name);
    await esperar(1200);
    if (!(await pagina.locator(`${G} [data-adicionar]`).count())) await abrirPainelPor('projetos');
    await esperar(600);
  }
  await pagina.keyboard.press('Escape');
  await esperar(1200);
  await tiro('grade-servicos', true);
}

// --------------------------------------------------------------- EXPERIENCIAS
if (fazer('experiencias')) {
  console.log('\n== EXPERIÊNCIA ==');
  await abrirPainelPor('experiencias');
  const jaTem = await pagina.evaluate(() =>
    [...document.querySelectorAll('#ed-gaveta .ed-lista-sub, #ed-gaveta .ed-lista-titulo')].map((e) => e.textContent.trim()));

  for (const x of EXPERIENCIAS) {
    if (jaTem.some((s) => s.includes(x.org))) { console.log(`  pulando "${x.org}" (ja existe)`); continue; }
    console.log(`  -> ${x.org}`);
    await pagina.locator(`${G} [data-adicionar]`).first().click();
    await esperar(1000);
    await abrirTodosOsPassos();

    await preencher('org', x.org);
    await preencher('role', x.role);
    await preencher('period_start', x.period_start);
    if (!x.atual) {
      await ligarSwitch('atual', false);
      await abrirTodosOsPassos();
      await preencher('period_end', x.period_end);
    }
    await abrirTodosOsPassos();
    await preencher('location', x.location);
    await preencher('highlights', x.highlights.join('\n'));
    if (x.note) await preencher('note', x.note);
    await abrirTodosOsPassos();

    await salvar(x.org);
    await esperar(1200);
    if (!(await pagina.locator(`${G} [data-adicionar]`).count())) await abrirPainelPor('experiencias');
    await esperar(600);
  }
  await pagina.keyboard.press('Escape');
  await esperar(1000);
  await tiro('canvas-com-experiencia', true);
}

// -------------------------------------------------------- PROCURA DE ENDERECO
// Varre TODOS os paineis atras de um campo que aceite "Rua tal, 123" e "sábado até 12h".
if (fazer('endereco')) {
  console.log('\n== PROCURA: onde cabe endereço e horário ==');
  const achados = [];
  for (const painel of ['perfil', 'projetos', 'experiencias', 'publicar', 'conta']) {
    try {
      await abrirPainelPor(painel);
      await abrirTodosOsPassos();
      const campos = await pagina.evaluate(() => {
        const g = document.querySelector('#ed-gaveta');
        if (!g) return [];
        return [...g.querySelectorAll('.ed-field')].map((f) => ({
          key: f.dataset.campo || '',
          label: (f.querySelector('.ed-label')?.innerText || '').trim().replace(/\n/g, ' '),
          help: (f.querySelector('.ed-help')?.innerText || '').trim().replace(/\n/g, ' '),
        }));
      });
      const relevante = campos.filter((c) => /endere|onde|local|hor|rua|mapa|cidade|telefone|contato/i.test(`${c.key} ${c.label} ${c.help}`));
      achados.push({ painel, total: campos.length, relevantes: relevante });
      console.log(`  ${painel}: ${campos.length} campos, ${relevante.length} com cara de endereço/horário -> ${relevante.map((r) => r.key || r.label).join(', ') || '(nenhum)'}`);
      await pagina.keyboard.press('Escape');
      await esperar(600);
    } catch (e) { console.log(`  ${painel}: ${e.message.slice(0, 80)}`); }
  }
  await writeFile('out/funil-procura-endereco.json', JSON.stringify(achados, null, 2), 'utf8');
}

// ------------------------------------------------------------------ PUBLICAR
if (fazer('publicar')) {
  console.log('\n== PUBLICAR ==');
  await abrirPainelPor('publicar');
  await esperar(900);
  const antes = await textoGaveta();
  await writeFile('out/funil-publicar-antes.txt', antes, 'utf8');
  console.log(antes.slice(0, 1200));
  await tiro('publicar-antes');

  const btn = pagina.locator(`${G} [data-publicar]`).first();
  if (!(await btn.count())) nota('AUSENTE', 'botao Publicar');
  else if (await btn.isDisabled()) nota('BLOQUEIO', 'botao Publicar veio desabilitado');
  else {
    await btn.click();
    await esperar(9000);
    const depois = await textoGaveta();
    await writeFile('out/funil-publicar-depois.txt', depois, 'utf8');
    console.log('--- depois ---');
    console.log(depois.slice(0, 1500));
    await tiro('publicar-depois');
  }
}

// -------------------------------------------------------------------- LEITURA
if (fazer('ler')) {
  console.log('\n== A PÁGINA PÚBLICA ==');
  const url = `https://${demo.slug}.myportifolio.com.br/?cb=${Date.now()}`;
  const p2 = await pagina.context().newPage();
  const errosPub = [];
  p2.on('pageerror', (e) => errosPub.push(String(e).slice(0, 200)));
  p2.on('console', (m2) => { if (m2.type() === 'error') errosPub.push(m2.text().slice(0, 200)); });
  const r = await p2.goto(url, { waitUntil: 'networkidle' });
  console.log(`  HTTP ${r.status()}`);
  await esperar(1500);
  await p2.screenshot({ path: 'out/funil-publico-1440.png', fullPage: true });
  const texto = await p2.evaluate(() => document.body.innerText);
  await writeFile('out/funil-publico-texto.txt', texto, 'utf8');

  // Abre a janela do primeiro servico e mede o par antes/depois.
  const card = p2.locator('[data-project-card], .project-card, article').first();
  if (await card.count()) {
    await card.click();
    await esperar(2000);
    await p2.screenshot({ path: 'out/funil-modal-1440.png', fullPage: false });
    const galeria = await p2.evaluate(() => {
      const imgs = [...document.querySelectorAll('[role="dialog"] img')];
      return imgs.map((i) => ({ alt: i.alt, w: i.naturalWidth, h: i.naturalHeight, box: `${Math.round(i.getBoundingClientRect().width)}x${Math.round(i.getBoundingClientRect().height)}`, src: i.src.split('/').pop() }));
    });
    console.log('  imagens na janela:', JSON.stringify(galeria, null, 2));
    await writeFile('out/funil-galeria-1440.json', JSON.stringify(galeria, null, 2), 'utf8');
  } else nota('AUSENTE', 'nao achei card de servico na pagina publica');

  if (errosPub.length) console.log('  erros na pagina publica:', errosPub.join(' | '));
  await writeFile('out/funil-erros-publico.txt', errosPub.join('\n') || '(nenhum)', 'utf8');
  await p2.close();
}

// -------------------------------------------------------------------- CELULAR
if (fazer('celular')) {
  console.log('\n== 375x812: o único aparelho dele ==');
  const p3 = await pagina.context().newPage();
  await p3.setViewportSize({ width: 375, height: 812 });

  // Primeiro a pagina publica.
  await p3.goto(`https://${demo.slug}.myportifolio.com.br/?cb=${Date.now()}`, { waitUntil: 'networkidle' });
  await esperar(1500);
  await p3.screenshot({ path: 'out/funil-publico-375.png', fullPage: true });
  const card = p3.locator('[data-project-card], .project-card, article').first();
  if (await card.count()) {
    await card.click();
    await esperar(2000);
    await p3.screenshot({ path: 'out/funil-modal-375.png', fullPage: false });
    const gal = await p3.evaluate(() => {
      const cont = document.querySelector('[role="dialog"] .grid-cols-1, [role="dialog"] [class*="grid"]');
      const imgs = [...document.querySelectorAll('[role="dialog"] img')];
      return {
        colunas: cont ? getComputedStyle(cont).gridTemplateColumns : '(nao achei a grade)',
        imgs: imgs.map((i) => ({ alt: i.alt, box: `${Math.round(i.getBoundingClientRect().width)}x${Math.round(i.getBoundingClientRect().height)}`, y: Math.round(i.getBoundingClientRect().top) })),
      };
    });
    console.log('  galeria no celular:', JSON.stringify(gal, null, 2));
    await writeFile('out/funil-galeria-375.json', JSON.stringify(gal, null, 2), 'utf8');
    await p3.keyboard.press('Escape');
  }

  // Depois o EDITOR no mesmo tamanho: e ele que precisa funcionar no telefone.
  await p3.goto(`${APEX}/app?cb=${Date.now()}`, { waitUntil: 'networkidle' });
  await esperar(3000);
  await p3.screenshot({ path: 'out/funil-editor-375.png', fullPage: true });
  const medidas = await p3.evaluate(() => {
    const largura = document.documentElement.scrollWidth;
    const janela = window.innerWidth;
    const alvos = [...document.querySelectorAll('[data-abrir]')].map((b) => {
      const r = b.getBoundingClientRect();
      return { alvo: b.dataset.abrir, w: Math.round(r.width), h: Math.round(r.height), visivel: r.width > 0 && r.height > 0 };
    });
    return { scrollWidth: largura, innerWidth: janela, vazaHorizontal: largura > janela + 1, alvos };
  });
  console.log('  editor em 375:', JSON.stringify(medidas, null, 2));
  if (medidas.vazaHorizontal) nota('DEFEITO', `editor em 375 tem scroll horizontal: scrollWidth ${medidas.scrollWidth} contra innerWidth ${medidas.innerWidth}`);
  for (const a of medidas.alvos) {
    if (a.visivel && (a.h < 40 || a.w < 40)) nota('CELULAR', `alvo "${a.alvo}" mede ${a.w}x${a.h} px, abaixo dos 44x44 de toque confortável`);
  }
  await writeFile('out/funil-editor-375.json', JSON.stringify(medidas, null, 2), 'utf8');

  // Tenta abrir o painel de perfil e digitar, que e o gesto real dele.
  try {
    await p3.click('[data-abrir="perfil"]');
    await esperar(1800);
    await p3.screenshot({ path: 'out/funil-editor-375-perfil.png', fullPage: true });
    const gaveta = await p3.evaluate(() => {
      const g = document.querySelector('#ed-gaveta');
      if (!g) return { existe: false };
      const r = g.getBoundingClientRect();
      return { existe: true, w: Math.round(r.width), h: Math.round(r.height), pctTela: Math.round((r.width / window.innerWidth) * 100), campos: g.querySelectorAll('.ed-field').length };
    });
    console.log('  gaveta em 375:', JSON.stringify(gaveta));
    await writeFile('out/funil-gaveta-375.json', JSON.stringify(gaveta, null, 2), 'utf8');
  } catch (e) { nota('CELULAR', `nao consegui abrir o painel de perfil em 375: ${e.message.slice(0, 120)}`); }
  await p3.close();
}

// ----------------------------------------------------------------- FECHAMENTO
console.log('\n== CORTES MEDIDOS ==');
console.table(cortes);
await writeFile('out/funil-cortes.json', JSON.stringify(cortes, null, 2), 'utf8');

console.log('\n== ATRITO ==');
console.log(atrito.length ? atrito.join('\n') : '(nenhum)');
await writeFile('out/funil-atrito.txt', atrito.join('\n') || '(nenhum)', 'utf8');

console.log('\n== ERROS DE CONSOLE E REDE ==');
console.log(erros.length ? [...new Set(erros)].join('\n') : '(nenhum)');
await writeFile('out/funil-erros.txt', [...new Set(erros)].join('\n') || '(nenhum)', 'utf8');

await navegador.close();
