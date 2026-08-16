// Agente de nicho: Marina Salgueiro, chef de cozinha (slug demo-chef).
//
// O que este script faz e o que uma chef faria no editor: preencher o perfil, cadastrar seis
// trabalhos (um com video), quatro experiencias (uma de estudo com certificado) e publicar.
// Ele NAO toca no banco por SQL de proposito: o que se mede aqui e o editor.
//
// Uso:
//   node scripts/_demos/demo-chef.mjs            (tudo)
//   node scripts/_demos/demo-chef.mjs perfil     (so uma etapa: perfil|projetos|experiencias|publicar|ler)
import { abrirEditor, esperar } from './base.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ETAPA = process.argv[2] || 'tudo';
const fazer = (n) => ETAPA === 'tudo' || ETAPA === n;
const MIDIA = path.resolve('out/midia/demo-chef');
const m = (f) => path.join(MIDIA, f);

// Tudo que doeu vira linha aqui. Sem coleta, achado vira lembranca.
const atrito = [];
const nota = (nivel, texto) => { atrito.push(`[${nivel}] ${texto}`); console.log(`  ! ${nivel}: ${texto}`); };

await mkdir('out', { recursive: true });
const { pagina, navegador, demo, erros } = await abrirEditor('demo-chef', { headless: true });
console.log(`editor aberto para ${demo.nome} (${demo.slug})`);

// ---------------------------------------------------------------- utilitarios
const G = '#ed-gaveta';
const tiro = async (nome) => { try { await pagina.screenshot({ path: `out/chef-${nome}.png`, fullPage: false }); } catch {} };
const textoGaveta = () => pagina.evaluate(() => document.querySelector('#ed-gaveta')?.innerText || '(sem gaveta)');

async function abrirPainelPor(chave) {
  await pagina.click(`[data-abrir="${chave}"]`);
  await esperar(1200);
}

async function abrirTodosOsPassos() {
  await pagina.evaluate(() => {
    document.querySelectorAll('#ed-gaveta details[data-passo]').forEach((d) => { d.open = true; });
  });
  await esperar(300);
}

async function existe(sel) { return (await pagina.locator(`${G} ${sel}`).count()) > 0; }

async function preencher(key, valor) {
  const sel = `${G} [data-campo="${key}"] input:not([type=file]), ${G} [data-campo="${key}"] textarea`;
  const el = pagina.locator(sel).first();
  if (!(await el.count())) { nota('AUSENTE', `campo "${key}" nao existe no formulario`); return false; }
  await el.fill(String(valor));
  await esperar(120);
  return true;
}

async function selecionar(key, valor) {
  const el = pagina.locator(`${G} [data-campo="${key}"] select`).first();
  if (!(await el.count())) { nota('AUSENTE', `select "${key}" nao existe`); return false; }
  await el.selectOption(String(valor));
  await esperar(200);
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
    await esperar(320);
  }
}

async function escolherBotao(key, valor) {
  const el = pagina.locator(`${G} [data-escolha="${key}"][data-valor="${valor}"]`).first();
  if (!(await el.count())) { nota('AUSENTE', `botao "${key}=${valor}" nao existe`); return false; }
  await el.click();
  await esperar(500);
  return true;
}

// Sobe a imagem e mede o que saiu do pipeline. `origem` e o tamanho do arquivo original,
// so para o relatorio conseguir dizer "entrou 2400x640 e saiu 1200x800".
async function subirImagem(key, arquivo, origem) {
  const inp = pagina.locator(`${G} [data-arquivo="${key}"]`).first();
  if (!(await inp.count())) { nota('AUSENTE', `campo de imagem "${key}" nao existe`); return null; }
  await inp.setInputFiles(m(arquivo));
  // A previa aparece quando o upload resolve; o erro aparece no mesmo lugar do "convertendo".
  for (let i = 0; i < 40; i++) {
    await esperar(500);
    const r = await pagina.evaluate((k) => {
      const campo = document.querySelector(`#ed-gaveta [data-campo="${k}"]`);
      const img = campo?.querySelector('.ed-drop-previa');
      const erro = campo?.querySelector('[data-erro]')?.textContent?.trim() || '';
      return { url: img?.src || '', w: img?.naturalWidth || 0, h: img?.naturalHeight || 0, erro };
    }, key);
    if (r.url && r.w) {
      console.log(`  imagem ${key}: ${origem} -> ${r.w}x${r.h}  (${r.url.split('/').pop().slice(0, 60)})`);
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
  'Cozinho a Bahia que aprendi no quintal da minha avó, em Santo Amaro, e que continuei estudando por doze anos de cozinha profissional.',
  'Meu trabalho começa no produtor: dendê de prensa artesanal, peixe de curral, mandioca da feira de São Joaquim, pimenta que vem de quintal e não de atacado.',
  'Assino menus autorais, jantares fechados para até vinte pessoas e consultoria de cardápio para casas que querem sotaque próprio.',
  'Hoje comando a cozinha do Casa Amaro, em Salvador, e rodo o Recôncavo atrás de fornecedor e de receita que quase ninguém faz mais.',
].join(' ');

const SOCIAIS = [
  'Instagram | @marinasalgueiro | https://instagram.com/marinasalgueiro',
  'YouTube | Cozinha de Raiz | https://youtube.com/@marinasalgueiro',
  'WhatsApp | (71) 98844-0132 | https://wa.me/5571988440132',
  'LinkedIn | Marina Salgueiro | https://linkedin.com/in/marinasalgueiro',
].join('\n');

const NUMEROS = [
  'Anos de cozinha | 12',
  'Menus autorais | 34',
  'Jantares fechados | 180',
  'Cidades no Recôncavo | 9',
].join('\n');

const ESPECIALIDADES = [
  'Cozinha baiana', 'Dendê artesanal', 'Fermentação', 'Peixes e frutos do mar',
  'Menu degustação', 'Doce de tabuleiro', 'Fogo de chão', 'Curadoria de fornecedor',
];

const TRABALHOS = [
  {
    name: 'Menu Recôncavo', category: 'Menu degustação',
    tagline: 'Sete tempos que refazem o caminho do dendê, do canavial de Santo Amaro até o prato.',
    problem: 'O Casa Amaro tinha um cardápio bonito e sem lugar nenhum: dava para servir o mesmo prato em Salvador, em Curitiba ou em Lisboa. O salão enchia de turista e esvaziava de baiano.',
    solution: 'Reescrevi o menu inteiro em sete tempos, cada um amarrado a um produtor com nome e cidade. Passei três meses no Recôncavo antes de escrever a primeira linha, e a carta hoje traz o nome de quem plantou.',
    features: ['Sete tempos servidos em sequência', 'Harmonização com destilados de cana do Recôncavo', 'Ficha técnica por prato com origem do ingrediente', 'Versão vegetariana completa, não adaptada'],
    stack: ['Dendê de prensa', 'Peixe de curral', 'Fermentação de mandioca', 'Defumação em folha de bananeira'],
    year: '2025', groups: ['Menu', 'Restaurante'], imagem: 'trab-1.jpg', origem: '1400x1400 (quadrada)',
    link: '', video: '',
  },
  {
    name: 'Moqueca de curral', category: 'Prato autoral',
    tagline: 'A moqueca sem atalho: peixe inteiro, dendê de prensa e panela de barro de Maragogipinho.',
    problem: 'Moqueca virou prato de foto. Quase toda casa serve com azeite comum, peixe congelado em posta e leite de coco de caixinha, e o cliente já não sabe mais o que é a original.',
    solution: 'Voltei ao método do curral: peixe inteiro comprado na maré, dendê de prensa artesanal e panela de barro curada. Filmei o processo com o Alex Atala e a Celinha para explicar o porquê de cada etapa.',
    features: ['Peixe inteiro, comprado no dia', 'Panela de barro de Maragogipinho', 'Dendê de prensa, nunca refinado', 'Pirão feito na hora com o caldo'],
    stack: ['Panela de barro', 'Dendê de prensa', 'Peixe inteiro', 'Pirão de caldo'],
    year: '2025', groups: ['Prato', 'Vídeo'], imagem: 'trab-2.jpg', origem: '1400x1400 (quadrada)',
    link: '', video: 'https://www.youtube.com/watch?v=aEUpj9F0TfM',
  },
  {
    name: 'Jantar Dendê e Fogo', category: 'Jantar fechado',
    tagline: 'Vinte lugares, fogo de chão no quintal e cinco tempos servidos por mim na mesa.',
    problem: 'Quem queria me contratar para um jantar em casa não tinha o que olhar: eu só tinha foto solta no celular e recado no WhatsApp.',
    solution: 'Montei um formato fechado de vinte lugares, com fogo de chão, cinco tempos e serviço feito por mim na mesa. Roda uma vez por mês e a lista de espera hoje passa de duzentos nomes.',
    features: ['Vinte lugares por edição', 'Cinco tempos servidos na mesa', 'Fogo de chão montado no quintal', 'Conversa sobre cada ingrediente antes de servir'],
    stack: ['Fogo de chão', 'Brasa de coco', 'Serviço à mesa'],
    year: '2024', groups: ['Evento'], imagem: 'trab-3.jpg', origem: '1400x1867 (retrato)',
    link: '', video: '',
  },
  {
    name: 'Casa Amaro: abertura', category: 'Consultoria de cardápio',
    tagline: 'Da planta da cozinha ao primeiro serviço: seis meses montando a casa inteira.',
    problem: 'Os sócios tinham o ponto na Ribeira, a reforma parada e nenhuma decisão de cozinha tomada. Não havia cardápio, ficha técnica, fornecedor nem gente contratada.',
    solution: 'Assumi a abertura inteira: desenho do fluxo da cozinha, cardápio, ficha técnica de trinta e dois pratos, escolha de fornecedor e treinamento da brigada. A casa abriu no prazo e fechou o primeiro trimestre no azul.',
    features: ['Desenho de fluxo da cozinha', 'Trinta e dois pratos com ficha técnica', 'Rede de doze fornecedores do Recôncavo', 'Treinamento de brigada de nove pessoas'],
    stack: ['Ficha técnica', 'Custo por prato', 'Escala de brigada'],
    year: '2024', groups: ['Consultoria', 'Restaurante'], imagem: 'trab-4.jpg', origem: '1400x2100 (retrato alto)',
    link: 'https://www.instagram.com/casaamaro', video: '',
  },
  {
    name: 'Da feira ao prato', category: 'Evento',
    tagline: 'Cozinha aberta dentro da feira de São Joaquim, com o ingrediente comprado na frente de quem come.',
    problem: 'A feira de São Joaquim é a maior despensa de Salvador e quase nenhum cliente de restaurante já pisou lá. O ingrediente chega ao prato sem história.',
    solution: 'Montei uma cozinha aberta dentro da feira. Compro na hora, com o público junto, e sirvo em quarenta minutos. Já rodou seis edições e virou pauta de televisão local.',
    features: ['Compra feita com o público', 'Serviço em quarenta minutos', 'Cardápio decidido pelo que a feira tinha no dia'],
    stack: ['Cozinha aberta', 'Compra na feira', 'Fogo portátil'],
    year: '2023', groups: ['Evento'], imagem: 'trab-5-panoramica.jpg', origem: '2400x640 (panorâmica)',
    link: '', video: '',
  },
  {
    name: 'Doces de tabuleiro', category: 'Sobremesa',
    tagline: 'Cocada, bolo de puba e queijadinha refeitos com a técnica que aprendi na França.',
    problem: 'Doce de tabuleiro é tratado como lembrancinha de turista. Ninguém trabalha ponto de açúcar, textura ou temperatura, e o doce chega à mesa seco.',
    solution: 'Refiz seis doces de tabuleiro com controle de ponto e temperatura, mantendo a receita das baianas. A cocada agora sai com miolo cremoso, e o bolo de puba passou a ser servido morno.',
    features: ['Seis doces refeitos, receita mantida', 'Controle de ponto de açúcar por termômetro', 'Servido na temperatura certa, não na bancada'],
    stack: ['Ponto de açúcar', 'Puba fermentada', 'Coco ralado na hora'],
    year: '2023', groups: ['Prato'], imagem: 'trab-6-quadrada.jpg', origem: '1400x1400 (quadrada)',
    link: '', video: '',
  },
];

const EXPERIENCIAS = [
  {
    kind: 'work', org: 'Casa Amaro', role: 'Chef executiva', period_start: '03/2022', atual: true,
    location: 'Salvador, BA', logo: 'logo-exp.jpg',
    highlights: ['Comando de brigada de nove pessoas', 'Menu autoral trocado a cada estação', 'Rede própria de doze fornecedores do Recôncavo', 'Custo de prato caiu 18% sem trocar ingrediente'],
    note: 'A casa nasceu de uma consultoria que virou convite. Fiquei porque me deixaram escrever o cardápio inteiro do meu jeito.',
  },
  {
    kind: 'work', org: 'Manjericão da Ribeira', role: 'Sous chef', period_start: '2018', period_end: '02/2022', atual: false,
    location: 'Salvador, BA',
    highlights: ['Praça de peixes e frutos do mar', 'Padronização de ficha técnica de 40 pratos', 'Formação de três cozinheiros que hoje são chefs'],
    note: '',
  },
  {
    kind: 'work', org: 'Origem', role: 'Cozinheira de praça', period_start: '2015', period_end: '2017', atual: false,
    location: 'Salvador, BA',
    highlights: ['Praça quente e entradas', 'Primeira cozinha com serviço de menu degustação'],
    note: '',
  },
  {
    kind: 'education', org: 'Le Cordon Bleu Rio de Janeiro', role: 'Diplôme de Cuisine', period_start: '2013', period_end: '2014', atual: false,
    location: 'Rio de Janeiro, RJ',
    highlights: ['Técnica clássica francesa completa', 'Trabalho final sobre dendê aplicado a molhos-mãe'],
    note: 'Fui atrás da técnica francesa para voltar e aplicar no que já sabia de casa.',
    certificado: 'cert.jpg',
  },
];

// -------------------------------------------------------------------- PERFIL
if (fazer('perfil')) {
  console.log('\n== PERFIL ==');
  await abrirPainelPor('perfil');
  await abrirTodosOsPassos();
  await writeFile('out/chef-perfil-tela.txt', await textoGaveta(), 'utf8');
  await tiro('perfil-aberto');

  await preencher('display_name', demo.nome);
  await preencher('role', demo.role);
  await preencher('bio', BIO);
  await preencher('badge_label', 'Chef de cozinha');
  await selecionar('badge_icon', 'chef-hat');

  await subirImagem('hero', 'hero.jpg', '1200x1800 (retrato)');
  await abrirTodosOsPassos();
  await subirImagem('avatar', 'avatar.jpg', '800x800 (quadrada)');
  await abrirTodosOsPassos();

  const enq = pagina.locator(`${G} [data-enquadramento="hero_object_position"]`).first();
  if (await enq.count()) { await enq.fill('28'); await esperar(200); } else nota('AUSENTE', 'slider de enquadramento');

  await preencher('contact_email', 'contato@marinasalgueiro.com.br');
  await ligarSwitch('show_contact_email', true);
  await abrirTodosOsPassos();
  await preencher('cta_url', 'https://wa.me/5571988440132');

  // O texto do botao e campo do bump. Se estiver travado, a chef publica "Agendar Call".
  const ctaLabel = pagina.locator(`${G} [data-campo="cta_label"] input`).first();
  if (await ctaLabel.count()) {
    if (await ctaLabel.isDisabled()) nota('PAGO', 'campo "Texto do botão" (cta_label) veio desabilitado: sem ele o botão publica "Agendar Call"');
    else await ctaLabel.fill('Reservar mesa');
  } else nota('AUSENTE', 'campo cta_label');

  await preencher('socials', SOCIAIS);
  await preencher('stats', NUMEROS);

  await abrirTodosOsPassos();
  await chips('stacks', ESPECIALIDADES);
  await abrirTodosOsPassos();
  await ligarSwitch('show_online_dot', true);
  await abrirTodosOsPassos();
  await ligarSwitch('projects_video_first', true);
  await abrirTodosOsPassos();
  await selecionar('projects_per_page', '6');
  await preencher('seo_title', 'Marina Salgueiro | Chef de cozinha em Salvador');
  await preencher('seo_description', 'Cozinha de raiz baiana, menu autoral e jantares fechados no Recôncavo. Consultoria de cardápio para restaurantes.');

  await tiro('perfil-preenchido');
  await writeFile('out/chef-perfil-preenchido.txt', await textoGaveta(), 'utf8');
  await salvar('perfil');
  await esperar(1500);
  await tiro('canvas-com-perfil');
}

// ------------------------------------------------------------------ PROJETOS
if (fazer('projetos')) {
  console.log('\n== TRABALHOS ==');
  await abrirPainelPor('projetos');
  const jaTem = await pagina.evaluate(() =>
    [...document.querySelectorAll('#ed-gaveta .ed-lista-titulo')].map((e) => e.textContent.trim()));
  console.log(`  ja cadastrados: ${jaTem.length ? jaTem.join(', ') : '(nenhum)'}`);
  await writeFile('out/chef-lista-projetos.txt', await textoGaveta(), 'utf8');

  for (const t of TRABALHOS) {
    if (jaTem.includes(t.name)) { console.log(`  pulando "${t.name}" (ja existe)`); continue; }
    console.log(`  -> ${t.name}`);
    await pagina.locator(`${G} [data-adicionar]`).first().click();
    await esperar(1000);
    await abrirTodosOsPassos();
    if (t === TRABALHOS[0]) { await writeFile('out/chef-form-projeto.txt', await textoGaveta(), 'utf8'); await tiro('form-projeto'); }

    await preencher('name', t.name);
    await preencher('category', t.category);
    await preencher('tagline', t.tagline);
    await preencher('problem', t.problem);
    await preencher('solution', t.solution);
    await preencher('features', t.features.join('\n'));
    if (t.video) {
      await preencher('video', t.video);
      await esperar(600);
      const nota_yt = await pagina.evaluate(() =>
        document.querySelector('#ed-gaveta [data-campo="video"] [data-nota-youtube]')?.textContent?.trim() || '');
      console.log(`     youtube: ${nota_yt || '(sem retorno)'}`);
      if (!/reconhecido/i.test(nota_yt)) nota('DEFEITO', `link do YouTube nao reconhecido: ${t.video}`);
    }
    if (t.link) await preencher('link', t.link);
    await abrirTodosOsPassos();
    await chips('stack', t.stack);
    await abrirTodosOsPassos();
    await selecionar('year', t.year);
    await abrirTodosOsPassos();
    await chips('groups', t.groups);
    await abrirTodosOsPassos();
    await selecionar('image_fit', 'cover');
    await abrirTodosOsPassos();
    await subirImagem('image', t.imagem, t.origem);
    await abrirTodosOsPassos();

    await salvar(t.name);
    await esperar(1200);
    // Voltar para a lista para o proximo.
    if (!(await pagina.locator(`${G} [data-adicionar]`).count())) await abrirPainelPor('projetos');
    await esperar(600);
  }
  await tiro('canvas-com-projetos');
}

// -------------------------------------------------------------- EXPERIENCIAS
if (fazer('experiencias')) {
  console.log('\n== EXPERIÊNCIA ==');
  await abrirPainelPor('experiencias');
  const jaTem = await pagina.evaluate(() =>
    [...document.querySelectorAll('#ed-gaveta .ed-lista-sub')].map((e) => e.textContent.trim()));
  await writeFile('out/chef-lista-experiencias.txt', await textoGaveta(), 'utf8');

  for (const x of EXPERIENCIAS) {
    if (jaTem.some((s) => s.startsWith(x.org))) { console.log(`  pulando "${x.org}" (ja existe)`); continue; }
    console.log(`  -> ${x.org}`);
    await pagina.locator(`${G} [data-adicionar]`).first().click();
    await esperar(1000);
    if (x.kind === 'education') await escolherBotao('kind', 'education');
    await abrirTodosOsPassos();
    if (x.kind === 'education') { await writeFile('out/chef-form-estudo.txt', await textoGaveta(), 'utf8'); await tiro('form-estudo'); }
    else if (x === EXPERIENCIAS[0]) { await writeFile('out/chef-form-experiencia.txt', await textoGaveta(), 'utf8'); }

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
    if (x.logo) { await subirImagem('logo', x.logo, '600x600 (quadrada)'); await abrirTodosOsPassos(); }

    if (x.certificado) {
      const inp = pagina.locator(`${G} [data-cert-input]`).first();
      if (!(await inp.count())) nota('AUSENTE', 'campo de certificado');
      else {
        await inp.setInputFiles(m(x.certificado));
        let ok = false;
        for (let i = 0; i < 30; i++) {
          await esperar(500);
          const r = await pagina.evaluate(() => ({
            anexo: Boolean(document.querySelector('#ed-gaveta .ed-anexo')),
            erro: document.querySelector('#ed-gaveta [data-campo="certificate"] [data-erro]')?.textContent?.trim() || '',
          }));
          if (r.anexo) { ok = true; break; }
          if (r.erro && !/enviando/i.test(r.erro)) { nota('ERRO-UPLOAD', `certificado: ${r.erro}`); break; }
        }
        if (ok) {
          await abrirTodosOsPassos();
          await preencher('certificate_label', 'Diplôme de Cuisine');
          const chk = pagina.locator(`${G} [data-cert-publico]`).first();
          if (await chk.count()) {
            if (await chk.isDisabled()) nota('BLOQUEADO', 'consentimento do certificado veio desabilitado');
            else { await chk.click(); await esperar(500); }
          }
          await tiro('certificado');
        }
      }
      await abrirTodosOsPassos();
    }

    await salvar(x.org);
    await esperar(1200);
    if (!(await pagina.locator(`${G} [data-adicionar]`).count())) await abrirPainelPor('experiencias');
    await esperar(600);
  }
  await tiro('canvas-com-experiencia');
}

// ------------------------------------------------------------------ PUBLICAR
if (fazer('publicar')) {
  console.log('\n== PUBLICAR ==');
  await abrirPainelPor('publicar');
  await esperar(800);
  const antes = await textoGaveta();
  await writeFile('out/chef-publicar-antes.txt', antes, 'utf8');
  console.log(antes.slice(0, 900));
  await tiro('publicar-antes');

  const btn = pagina.locator(`${G} [data-publicar]`).first();
  if (!(await btn.count())) nota('AUSENTE', 'botao Publicar');
  else if (await btn.isDisabled()) nota('BLOQUEIO', 'botao Publicar veio desabilitado');
  else {
    await btn.click();
    await esperar(6000);
    const depois = await textoGaveta();
    await writeFile('out/chef-publicar-depois.txt', depois, 'utf8');
    console.log('--- depois ---');
    console.log(depois.slice(0, 900));
    await tiro('publicar-depois');
  }
}

// ------------------------------------------------------------------ LEITURA
if (fazer('ler') || ETAPA === 'tudo') {
  console.log('\n== CANVAS ==');
  const canvas = await pagina.evaluate(() => document.getElementById('ed-canvas')?.innerText || '');
  await writeFile('out/chef-canvas.txt', canvas, 'utf8');
  console.log(canvas.slice(0, 1600));
  await pagina.screenshot({ path: 'out/chef-canvas-inteiro.png', fullPage: true });
}

console.log('\n== ERROS DE CONSOLE E REDE ==');
console.log(erros.length ? [...new Set(erros)].join('\n') : '(nenhum)');
await writeFile('out/chef-erros.txt', [...new Set(erros)].join('\n'), 'utf8');
console.log('\n== ATRITO COLETADO ==');
console.log(atrito.length ? atrito.join('\n') : '(nenhum)');
await writeFile('out/chef-atrito.txt', atrito.join('\n'), 'utf8');

await navegador.close();
