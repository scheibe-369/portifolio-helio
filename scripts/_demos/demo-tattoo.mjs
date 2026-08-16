// Agente de nicho: Rafa Ximenes, tatuador blackwork e fineline (slug demo-tattoo).
//
// A hipotese que esta persona existe para quebrar: GALERIA VERTICAL PURA e INSTAGRAM COMO
// CANAL. Tatuagem de braco e de perna e foto em retrato, sempre, e o cliente chega pelo
// direct, nao por um "link do projeto no ar".
//
// O que o script faz e o que um tatuador faria: perfil, oito tatuagens com foto vertical,
// duas experiencias e publicar. Nao toca no banco por SQL: o que se mede aqui e o editor.
//
// Uso:
//   node scripts/_demos/demo-tattoo.mjs           (tudo)
//   node scripts/_demos/demo-tattoo.mjs perfil    (perfil|campos|projetos|experiencias|publicar|ler|corte)
import { abrirEditor, esperar } from './base.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ETAPA = process.argv[2] || 'tudo';
const fazer = (n) => ETAPA === 'tudo' || ETAPA === n;
const MIDIA = path.resolve('out/midia/demo-tattoo');
const m = (f) => path.join(MIDIA, f);
const G = '#ed-gaveta';

const atrito = [];
const nota = (nivel, texto) => { atrito.push(`[${nivel}] ${texto}`); console.log(`  ! ${nivel}: ${texto}`); };

// Toda imagem que sobe deixa aqui o par entrada -> saida. E a prova numerica do corte 3:2.
const cortes = [];

await mkdir('out', { recursive: true });
const { pagina, navegador, demo, erros, APEX } = await abrirEditor('demo-tattoo', { headless: true });
console.log(`editor aberto para ${demo.nome} (${demo.slug})`);

// ---------------------------------------------------------------- utilitarios
const tiro = async (nome, inteiro = false) => {
  try { await pagina.screenshot({ path: `out/tattoo-${nome}.png`, fullPage: inteiro }); } catch {}
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
    await esperar(300);
  }
}

async function escolherBotao(key, valor) {
  const el = pagina.locator(`${G} [data-escolha="${key}"][data-valor="${valor}"]`).first();
  if (!(await el.count())) { nota('AUSENTE', `botao "${key}=${valor}" nao existe`); return false; }
  await el.click();
  await esperar(500);
  return true;
}

// Sobe a imagem e mede o que saiu do pipeline. `origem` e o tamanho do arquivo original: e o
// unico jeito de dizer no relatorio "entrou 1000x1500 e saiu 1000x667".
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
        cortes.push({ peca: rotuloCorte, arquivo, entrada: origem, saida: `${r.w}x${r.h}`, alturaMantida: `${guardado}%`, url: r.url });
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
const BIO = [
  'Tatuo blackwork e fineline há nove anos, os últimos quatro no meu estúdio, no Bom Fim, em Porto Alegre.',
  'Gosto de preto sólido, linha limpa e desenho que envelheça bem. Se não vai continuar legível daqui a quinze anos, eu não faço.',
  'Trabalho com hora marcada, um cliente por vez, e desenho tudo do zero: não copio tatuagem de ninguém.',
  'Chama no direct com a ideia, a região do corpo e um tamanho aproximado. Respondo todo dia à noite.',
].join(' ');

// Instagram em PRIMEIRO lugar, que e o teste desta persona.
const SOCIAIS = [
  'Instagram | @rafaximenes.tattoo | https://instagram.com/rafaximenes.tattoo',
  'WhatsApp | (51) 99612-4408 | https://wa.me/5551996124408',
  'Estúdio | Bom Fim, Porto Alegre | https://maps.google.com/?q=Bom+Fim+Porto+Alegre',
  'Pinterest | Minhas referências | https://br.pinterest.com/rafaximenes',
].join('\n');

const NUMEROS = [
  'Anos tatuando | 9',
  'Tatuagens fechadas | 1.200',
  'Fechamentos de braço | 38',
  'Fila de espera | 2 meses',
].join('\n');

const ESTILOS = [
  'Blackwork', 'Fineline', 'Pontilhismo', 'Ornamental',
  'Lettering', 'Cobertura', 'Traço único', 'Desenho autoral',
];

// Oito tatuagens. Titulo curto, categoria = estilo, uma frase. Sem "O Desafio / A Solução":
// tatuagem nao tem case de negocio, e os campos do passo 2 ficam VAZIOS de proposito.
const TATUAGENS = [
  { name: 'Fechamento de braço', category: 'Blackwork', tagline: 'Oito horas em duas sessões, preto sólido do ombro ao punho.', year: '2025', groups: ['Blackwork', 'Braço'], imagem: 'tat-1-fechamento.jpg' },
  { name: 'Rosas no antebraço', category: 'Blackwork', tagline: 'Sombreado pesado, sem contorno, fechando o antebraço inteiro.', year: '2025', groups: ['Blackwork', 'Braço'], imagem: 'tat-2-rosas.jpg' },
  { name: 'Folha geométrica', category: 'Fineline', tagline: 'Linha fina, traço único, nenhuma sombra.', year: '2025', groups: ['Fineline', 'Braço'], imagem: 'tat-3-geometrico.jpg' },
  { name: 'Buquê e borboleta', category: 'Fineline', tagline: 'Flores de linha fina com o nome da filha logo abaixo.', year: '2024', groups: ['Fineline', 'Braço'], imagem: 'tat-4-buque.jpg' },
  { name: 'Borboleta no punho', category: 'Fineline', tagline: 'Do cotovelo ao punho, feita em duas sessões de quatro horas.', year: '2024', groups: ['Fineline', 'Braço'], imagem: 'tat-5-borboleta.jpg' },
  { name: 'Retrato em pontilhismo', category: 'Pontilhismo', tagline: 'Só pontos, nenhuma linha fechada. Seis horas de paciência.', year: '2024', groups: ['Pontilhismo', 'Braço'], imagem: 'tat-6-pontilhismo.jpg' },
  { name: 'Ornamental no ombro', category: 'Blackwork', tagline: 'Formas cheias jogando com o negativo da pele.', year: '2023', groups: ['Blackwork', 'Ombro'], imagem: 'tat-7-ornamental.jpg' },
  { name: 'Figura em linha', category: 'Fineline', tagline: 'Corpo desenhado quase sem tirar a agulha da pele.', year: '2023', groups: ['Fineline', 'Braço'], imagem: 'tat-8-figura.jpg' },
];

const EXPERIENCIAS = [
  {
    kind: 'work', org: 'Estúdio Rosa Negra', role: 'Tatuador residente',
    period_start: '2016', period_end: '2020', atual: false, location: 'Porto Alegre, RS',
    logo: 'logo-estudio.jpg',
    highlights: [
      'Comecei limpando cabine e desenhando flash, e saí quatro anos depois com agenda cheia',
      'Primeiros fechamentos de braço em blackwork',
      'Aprendi biossegurança e cicatrização com quem tatua desde os anos noventa',
    ],
    note: 'Foi ali que descobri que gosto mais de preto sólido do que de qualquer cor.',
  },
  {
    kind: 'education', org: 'Atelier Livre da Prefeitura', role: 'Desenho e ilustração',
    period_start: '2013', period_end: '2015', atual: false, location: 'Porto Alegre, RS',
    highlights: [
      'Desenho de observação e anatomia',
      'Gravura em metal e xilogravura, que é de onde vem meu traço',
      'Dois anos desenhando antes de encostar numa máquina',
    ],
    note: 'Não dá diploma nem certificado. Dá mão firme, que para tatuar vale mais.',
  },
];

// -------------------------------------------------------------------- PERFIL
if (fazer('perfil')) {
  console.log('\n== PERFIL ==');
  await abrirPainelPor('perfil');
  await abrirTodosOsPassos();
  await tiro('perfil-aberto');

  await preencher('display_name', demo.nome);
  await preencher('role', demo.role);
  await preencher('bio', BIO);

  // Selo: campo novo do passo 1. O rotulo pede "duas palavras que dizem o que voce e".
  await preencher('badge_label', 'Tatuador');
  const icones = await pagina.evaluate(() =>
    [...document.querySelectorAll('#ed-gaveta [data-campo="badge_icon"] option')].map((o) => `${o.value}=${o.textContent.trim()}`));
  console.log(`  icones do selo: ${icones.join(' / ')}`);
  await writeFile('out/tattoo-icones-selo.txt', icones.join('\n'), 'utf8');
  if (!icones.some((i) => /agulha|tatu|maquina|needle/i.test(i))) {
    nota('BURACO', `nenhum dos ${icones.length - 1} icones do selo serve para tatuador; o mais proximo e "Caneta" (pen-tool)`);
  }
  await selecionar('badge_icon', 'pen-tool');

  await subirImagem('hero', 'hero.jpg', '1000x1500', 'perfil (hero 4:5)');
  await abrirTodosOsPassos();
  await subirImagem('avatar', 'avatar.jpg', '800x800');
  await abrirTodosOsPassos();

  const enq = pagina.locator(`${G} [data-enquadramento="hero_object_position"]`).first();
  if (await enq.count()) { await enq.fill('30'); await esperar(200); } else nota('AUSENTE', 'slider de enquadramento');

  await preencher('contact_email', 'contato@rafaximenes.tattoo');
  await ligarSwitch('show_contact_email', false);
  await abrirTodosOsPassos();

  // O canal dele e o direct. O link do botao principal aponta para o Instagram.
  await preencher('cta_url', 'https://ig.me/m/rafaximenes.tattoo');
  const ctaLabel = pagina.locator(`${G} [data-campo="cta_label"] input`).first();
  if (!(await ctaLabel.count())) nota('AUSENTE', 'campo cta_label');
  else if (await ctaLabel.isDisabled()) {
    const rotuloPadrao = await pagina.evaluate(() => {
      const b = document.querySelector('#ed-canvas a[data-cta], #ed-canvas [data-cta]');
      return b ? b.innerText.trim() : '(nao achei o botao no canvas)';
    });
    nota('PAGO', `"Texto do botão" (cta_label) veio com cadeado. O botao publica o rotulo padrao: "${rotuloPadrao}"`);
  } else await ctaLabel.fill('Chamar no direct');

  await preencher('socials', SOCIAIS);
  await preencher('stats', NUMEROS);

  await abrirTodosOsPassos();
  await chips('stacks', ESTILOS);
  await abrirTodosOsPassos();
  await ligarSwitch('show_online_dot', true);
  await abrirTodosOsPassos();
  await selecionar('projects_per_page', '8');
  await preencher('seo_title', 'Rafa Ximenes | Tatuador em Porto Alegre');
  await preencher('seo_description', 'Blackwork, fineline e pontilhismo em estúdio próprio no Bom Fim, Porto Alegre. Agenda pelo direct do Instagram.');

  await tiro('perfil-preenchido');
  await writeFile('out/tattoo-perfil-gaveta.txt', await textoGaveta(), 'utf8');
  await salvar('perfil');
  await esperar(1500);
  await tiro('canvas-com-perfil');
}

// Troca so as duas fotos do perfil, sem reprocessar chips (que sao aditivos e duplicariam).
if (fazer('foto')) {
  console.log('\n== FOTOS DO PERFIL ==');
  await abrirPainelPor('perfil');
  await abrirTodosOsPassos();
  await subirImagem('hero', 'hero.jpg', '1000x1500', 'perfil (hero 4:5)');
  await abrirTodosOsPassos();
  await subirImagem('avatar', 'avatar.jpg', '800x800');
  await abrirTodosOsPassos();
  await salvar('fotos do perfil');
  await esperar(1500);
  await tiro('canvas-com-perfil');
}

// ------------------------------------- CENSO DE CAMPOS DO FORMULARIO DE PECA
if (fazer('campos')) {
  console.log('\n== CENSO DE CAMPOS (uma tatuagem) ==');
  await abrirPainelPor('projetos');
  await pagina.locator(`${G} [data-adicionar]`).first().click();
  await esperar(1000);
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
  console.log(`  TOTAL VISIVEL: ${censo.length}`);
  await writeFile('out/tattoo-censo-campos.txt', `${linhas.join('\n')}\n\nTOTAL VISIVEL: ${censo.length}\n`, 'utf8');
  await tiro('form-tatuagem', true);
  await pagina.keyboard.press('Escape');
  await esperar(700);
}

// ------------------------------------------------------------------ TATUAGENS
if (fazer('projetos')) {
  console.log('\n== TATUAGENS ==');
  await abrirPainelPor('projetos');
  const jaTem = await pagina.evaluate(() =>
    [...document.querySelectorAll('#ed-gaveta .ed-lista-titulo')].map((e) => e.textContent.trim()));
  console.log(`  ja cadastradas: ${jaTem.length ? jaTem.join(', ') : '(nenhuma)'}`);

  for (const t of TATUAGENS) {
    if (jaTem.includes(t.name)) { console.log(`  pulando "${t.name}" (ja existe)`); continue; }
    console.log(`  -> ${t.name}`);
    await pagina.locator(`${G} [data-adicionar]`).first().click();
    await esperar(1000);
    await abrirTodosOsPassos();

    await preencher('name', t.name);
    await preencher('category', t.category);
    await preencher('tagline', t.tagline);
    // problem / solution / features / link / tem_cliente ficam VAZIOS: tatuagem nao tem case.
    await abrirTodosOsPassos();
    await selecionar('year', t.year);
    await abrirTodosOsPassos();
    await chips('groups', t.groups);
    await abrirTodosOsPassos();
    await selecionar('image_fit', 'cover');
    await abrirTodosOsPassos();
    await subirImagem('image', t.imagem, '1000x1500', t.name);
    await abrirTodosOsPassos();

    await salvar(t.name);
    await esperar(1200);
    if (!(await pagina.locator(`${G} [data-adicionar]`).count())) await abrirPainelPor('projetos');
    await esperar(600);
  }
  await pagina.keyboard.press('Escape');
  await esperar(1200);
  await tiro('grade-tatuagens');
  await pagina.screenshot({ path: 'out/tattoo-grade-inteira.png', fullPage: true });
}

// -------------------------------------------------------------- EXPERIENCIAS
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
    if (x.kind === 'education') await escolherBotao('kind', 'education');
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
    if (x.logo) { await subirImagem('logo', x.logo, '800x800'); await abrirTodosOsPassos(); }

    await salvar(x.org);
    await esperar(1200);
    if (!(await pagina.locator(`${G} [data-adicionar]`).count())) await abrirPainelPor('experiencias');
    await esperar(600);
  }
  await pagina.keyboard.press('Escape');
  await esperar(1000);
  await tiro('canvas-com-experiencia');
}

// Sonda do "Até": reproduz o passo a passo do formulario de ESTUDO e fotografa cada estado.
if (fazer('sonda-ate')) {
  console.log('\n== SONDA: campo "Até" no formulario de estudo ==');
  const estado = async (quando) => {
    const r = await pagina.evaluate(() => {
      const g = document.querySelector('#ed-gaveta');
      const sw = g.querySelector('[data-switch="atual"]');
      return {
        atual: sw ? sw.getAttribute('aria-checked') : '(sem switch)',
        rotuloAtual: sw?.closest('.ed-field')?.querySelector('.ed-label')?.innerText.trim().replace(/\n/g, ' ') || '',
        temAte: Boolean(g.querySelector('[data-campo="period_end"]')),
        campos: [...g.querySelectorAll('.ed-field')].map((f) => f.dataset.campo).join(','),
      };
    });
    console.log(`  ${quando}: atual=${r.atual} ("${r.rotuloAtual}") temAte=${r.temAte}`);
    return r;
  };
  const clicar = async () => {
    const sw = pagina.locator(`${G} [data-switch="atual"]`).first();
    if (await sw.count()) { await sw.click(); await esperar(800); }
  };

  // A: formulario de TRABALHO, sem tocar no tipo.
  await abrirPainelPor('experiencias');
  await pagina.locator(`${G} [data-adicionar]`).first().click();
  await esperar(1000);
  await estado('A1 trabalho, formulario novo');
  await clicar();
  await estado('A2 trabalho, um clique no switch');
  await pagina.keyboard.press('Escape');
  await esperar(900);

  // B: mesmo formulario, mas trocando para ESTUDO antes.
  await abrirPainelPor('experiencias');
  await pagina.locator(`${G} [data-adicionar]`).first().click();
  await esperar(1000);
  await escolherBotao('kind', 'education');
  await estado('B1 estudo, logo depois de trocar o tipo');
  await clicar();
  await estado('B2 estudo, um clique no switch');
  await clicar();
  await estado('B3 estudo, dois cliques no switch');
  await tiro('sonda-ate', true);
  await pagina.keyboard.press('Escape');
  await esperar(900);

  // C: estudo, mas voltando para trabalho depois.
  await abrirPainelPor('experiencias');
  await pagina.locator(`${G} [data-adicionar]`).first().click();
  await esperar(1000);
  await escolherBotao('kind', 'education');
  await escolherBotao('kind', 'work');
  await estado('C1 estudo e de volta para trabalho');
  await clicar();
  await estado('C2 trabalho de novo, um clique no switch');
  await pagina.keyboard.press('Escape');
  await esperar(800);
}

// Sonda da causa: repintarCorpo troca o innerHTML e RELIGA os eventos no MESMO no, entao cada
// repintura empilha mais um listener. Com numero par de listeners, todo clique de switch
// alterna duas vezes e volta ao lugar. Aqui a contagem sai medida, sem salvar nada.
if (fazer('sonda-listeners')) {
  console.log('\n== SONDA: listeners empilhados a cada repintura ==');
  await abrirPainelPor('perfil');
  await abrirTodosOsPassos();
  const ler = async () => pagina.evaluate(() => {
    const g = document.querySelector('#ed-gaveta');
    return {
      online: g.querySelector('[data-switch="show_online_dot"]')?.getAttribute('aria-checked'),
      chips: [...g.querySelectorAll('[data-chips="stacks"] .ed-chip')].map((c) => c.innerText.replace('×', '').trim()),
    };
  });
  const clicarOnline = async () => {
    await pagina.locator(`${G} [data-switch="show_online_dot"]`).first().click();
    await esperar(600);
    await abrirTodosOsPassos();
  };
  console.log('  estado inicial:', JSON.stringify(await ler()));
  await clicarOnline();
  console.log('  1o clique no switch "disponível":', JSON.stringify((await ler()).online));
  await clicarOnline();
  console.log('  2o clique:', JSON.stringify((await ler()).online));
  await clicarOnline();
  console.log('  3o clique:', JSON.stringify((await ler()).online));

  const antes = (await ler()).chips;
  console.log(`  chips antes de remover UM: ${antes.length} -> ${antes.join(', ')}`);
  await pagina.locator(`${G} [data-chips="stacks"] .ed-chip-x`).first().click();
  await esperar(800);
  await abrirTodosOsPassos();
  const depois = (await ler()).chips;
  console.log(`  chips depois de UM clique no × : ${depois.length} -> ${depois.join(', ')}`);
  if (antes.length - depois.length > 1) {
    nota('DEFEITO', `um clique no × removeu ${antes.length - depois.length} chips de uma vez`);
  }
  await tiro('sonda-listeners', true);
  // Sai SEM salvar: a sonda nao pode estragar o portfolio montado.
  await pagina.keyboard.press('Escape');
  await esperar(900);
}

// ------------------------------------------------------------------ PUBLICAR
if (fazer('publicar')) {
  console.log('\n== PUBLICAR ==');
  await abrirPainelPor('publicar');
  await esperar(900);
  const antes = await textoGaveta();
  await writeFile('out/tattoo-publicar-antes.txt', antes, 'utf8');
  console.log(antes.slice(0, 1200));
  await tiro('publicar-antes');

  const btn = pagina.locator(`${G} [data-publicar]`).first();
  if (!(await btn.count())) nota('AUSENTE', 'botao Publicar');
  else if (await btn.isDisabled()) nota('BLOQUEIO', 'botao Publicar veio desabilitado');
  else {
    await btn.click();
    await esperar(8000);
    const depois = await textoGaveta();
    await writeFile('out/tattoo-publicar-depois.txt', depois, 'utf8');
    console.log('--- depois ---');
    console.log(depois.slice(0, 1200));
    await tiro('publicar-depois');
  }
}

// ------------------------------------------------------------------- LEITURA
if (fazer('ler')) {
  console.log('\n== CANVAS ==');
  await pagina.keyboard.press('Escape');
  await esperar(800);
  const canvas = await pagina.evaluate(() => document.getElementById('ed-canvas')?.innerText || '');
  await writeFile('out/tattoo-canvas.txt', canvas, 'utf8');
  console.log(canvas.slice(0, 2000));
  await pagina.screenshot({ path: 'out/tattoo-canvas-inteiro.png', fullPage: true });

  // Como o cliente do Rafa ve, que e o unico julgamento que importa.
  await pagina.goto(`${APEX}/app?cb=${Date.now()}`, { waitUntil: 'networkidle' });
  await esperar(2500);
  const barra = await pagina.evaluate(() => [...document.querySelectorAll('#ed-barra button, #ed-barra a')]
    .map((e) => `${e.tagName.toLowerCase()}[${e.dataset.abrir || ''}] "${(e.innerText || '').trim()}"`));
  console.log('  barra do topo:', barra.join(' | '));
  const verVisitante = pagina.locator('[data-abrir="ver-visitante"], button:has-text("Ver como visitante")').first();
  if (await verVisitante.count()) { await verVisitante.click(); await esperar(4000); }
  else nota('AUSENTE', `botao "Ver como visitante" sumiu da barra depois de publicar. Barra: ${barra.join(' | ')}`);
  await pagina.screenshot({ path: 'out/tattoo-visitante.png', fullPage: true });
  const visita = await pagina.evaluate(() => document.body.innerText);
  await writeFile('out/tattoo-visitante.txt', visita, 'utf8');
  console.log('\n-- visitante --');
  console.log(visita.slice(0, 2500));

  // A mesma pagina no celular, que e de onde o cliente de tatuagem chega.
  await pagina.setViewportSize({ width: 390, height: 844 });
  await esperar(2000);
  await pagina.screenshot({ path: 'out/tattoo-visitante-celular.png', fullPage: true });
  await pagina.setViewportSize({ width: 1440, height: 900 });

  // E a URL publica, que na primeira publicacao ainda esta em revisao.
  const r = await pagina.request.get(`https://${demo.slug}.myportifolio.com.br/`);
  console.log(`\nURL publica: HTTP ${r.status()}`);
  const corpo = await r.text();
  await writeFile('out/tattoo-url-publica.txt', `HTTP ${r.status()}\n\n${corpo.slice(0, 4000)}`, 'utf8');
}

// Sonda do render publico: mede o avatar, a caixa das redes e se toda imagem da grade carrega.
if (fazer('sonda-render')) {
  console.log('\n== SONDA: render da pagina publica em 1440 ==');
  await pagina.goto(`${APEX}/app?cb=${Date.now()}`, { waitUntil: 'networkidle' });
  await esperar(2500);
  await pagina.locator('[data-abrir="ver-visitante"], button:has-text("Ver como visitante")').first().click();
  await esperar(3500);
  // Rola ate o fim para o lazy-load das ultimas imagens acontecer de verdade.
  await pagina.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 400) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 120)); }
    window.scrollTo(0, 0);
  });
  await esperar(2500);
  const r = await pagina.evaluate(() => {
    const imgs = [...document.querySelectorAll('img')].filter((i) => /\/project\//.test(i.src));
    const av = [...document.querySelectorAll('img')].find((i) => /\/avatar\//.test(i.src));
    const redes = [...document.querySelectorAll('a[href*="instagram"], a[href*="wa.me"]')].map((a) => {
      const b = a.getBoundingClientRect();
      return { texto: a.innerText.replace(/\n/g, ' ').trim(), w: Math.round(b.width), h: Math.round(b.height) };
    });
    return {
      grade: imgs.map((i) => {
        const b = i.getBoundingClientRect();
        return { ok: i.complete && i.naturalWidth > 0, nat: `${i.naturalWidth}x${i.naturalHeight}`, box: `${Math.round(b.width)}x${Math.round(b.height)}`, lazy: i.loading };
      }),
      avatar: av ? (() => { const b = av.getBoundingClientRect(); return { box: `${Math.round(b.width)}x${Math.round(b.height)}`, nat: `${av.naturalWidth}x${av.naturalHeight}` }; })() : null,
      redes,
    };
  });
  console.log('  avatar na pagina:', JSON.stringify(r.avatar));
  const porQue = await pagina.evaluate(() => {
    const av = [...document.querySelectorAll('img')].find((i) => /\/avatar\//.test(i.src));
    if (!av) return null;
    const cs = getComputedStyle(av);
    const pai = av.parentElement, csp = getComputedStyle(pai);
    const vo = getComputedStyle(pai.parentElement);
    return {
      img: { classe: av.className, width: cs.width, height: cs.height, minWidth: cs.minWidth, flexShrink: cs.flexShrink },
      pai: { classe: pai.className, width: csp.width, flexShrink: csp.flexShrink },
      avo: { classe: pai.parentElement.className, display: vo.display, width: vo.width, flexShrink: vo.flexShrink },
    };
  });
  console.log('  por que:', JSON.stringify(porQue, null, 2));
  console.log('  imagens da grade:'); r.grade.forEach((g, i) => console.log(`    ${i + 1}. carregou=${g.ok} natural=${g.nat} caixa=${g.box} loading=${g.lazy}`));
  console.log('  links de rede:'); r.redes.forEach((x) => console.log(`    "${x.texto}" ${x.w}x${x.h}`));
  await writeFile('out/tattoo-sonda-render.json', JSON.stringify(r, null, 2), 'utf8');
  if (r.avatar && Number(r.avatar.box.split('x')[0]) < 24) {
    nota('DEFEITO', `avatar do topo renderiza com ${r.avatar.box} px na pagina publica em 1440 (a arte e ${r.avatar.nat})`);
  }
  await pagina.screenshot({ path: 'out/tattoo-visitante-topo.png' });
}

// Sonda da pagina de UMA tatuagem: o que sobra quando "O CASE" inteiro fica vazio.
if (fazer('sonda-case')) {
  console.log('\n== SONDA: a tela de uma tatuagem ==');
  await pagina.goto(`${APEX}/app?cb=${Date.now()}`, { waitUntil: 'networkidle' });
  await esperar(2500);
  await pagina.locator('[data-abrir="ver-visitante"], button:has-text("Ver como visitante")').first().click();
  await esperar(3500);
  const cards = await pagina.evaluate(() => {
    const img = [...document.querySelectorAll('img')].find((i) => /\/project\//.test(i.src));
    let n = img, caminho = [];
    while (n && n !== document.body) { caminho.push(`${n.tagName.toLowerCase()}.${(n.className || '').toString().split(' ').slice(0, 3).join('.')}${n.dataset && Object.keys(n.dataset).length ? `[${Object.keys(n.dataset).join(',')}]` : ''}`); n = n.parentElement; }
    return caminho;
  });
  console.log('  caminho do card:', cards.join(' < '));
  const alvo2 = pagina.locator('.project-card[data-slug="fechamento-de-braco"], .project-card').first();
  if (!(await alvo2.count())) { nota('AUSENTE', 'nao achei o card para abrir a tatuagem'); }
  else {
    await alvo2.click({ force: true });
    await esperar(3000);
    await pagina.screenshot({ path: 'out/tattoo-case-aberto.png' });
    const txt = await pagina.evaluate(() => {
      const mod = document.querySelector('#project-modal, [data-modal], .modal, dialog');
      return mod ? mod.innerText : `(sem modal)\n${document.body.innerText.slice(0, 800)}`;
    });
    await writeFile('out/tattoo-case-aberto.txt', txt, 'utf8');
    console.log('--- conteudo da tela da tatuagem ---');
    console.log(txt.slice(0, 2200));
  }
}

// A pagina de verdade, pelo link de previa: e o unico jeito de ver o render publicado
// enquanto a primeira publicacao esta na fila de revisao.
if (fazer('previa')) {
  console.log('\n== PREVIA (a pagina de verdade) ==');
  await abrirPainelPor('publicar');
  await esperar(900);
  const gerar = pagina.locator(`${G} button`, { hasText: /Gerar link de pr/i }).first();
  if (await gerar.count()) { await gerar.click(); await esperar(5000); }
  const link = await pagina.evaluate(() => {
    const g = document.querySelector('#ed-gaveta');
    const a = [...g.querySelectorAll('a,input')].map((e) => e.value || e.href || '').find((v) => /previa|preview|token|\?p=/i.test(v));
    return a || g.innerText.match(/https?:\/\/\S+/)?.[0] || '';
  });
  console.log(`  link de previa: ${link || '(nao achei)'}`);
  if (!link) { nota('ATRITO', 'nao consegui capturar o link de previa na gaveta'); }
  else {
    const p3 = await pagina.context().newPage();
    await p3.setViewportSize({ width: 1440, height: 900 });
    await p3.goto(link, { waitUntil: 'networkidle' });
    await esperar(3000);
    await p3.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 400) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 100)); }
      window.scrollTo(0, 0);
    });
    await esperar(2000);
    await p3.screenshot({ path: 'out/tattoo-previa.png', fullPage: true });
    // Abre uma tatuagem e le o que sobra sem "O CASE".
    const card = p3.locator('.project-card').first();
    if (await card.count()) {
      await card.click();
      await esperar(2500);
      await p3.screenshot({ path: 'out/tattoo-previa-uma-tatuagem.png' });
      const txt = await p3.evaluate(() => {
        const m = [...document.querySelectorAll('div,section,dialog')].find((e) => /fixed|modal/i.test(e.className) && e.offsetHeight > 300 && e.innerText.includes('FECHAMENTO'));
        return m ? m.innerText : `(nao achei modal)\n${document.body.innerText.slice(0, 600)}`;
      });
      await writeFile('out/tattoo-previa-uma-tatuagem.txt', txt, 'utf8');
      console.log('--- a tela de UMA tatuagem ---');
      console.log(txt.slice(0, 1800));
    } else nota('AUSENTE', 'card de projeto nao existe na previa');
    await p3.close();
  }
}

// ---------------------------------------------- A PROVA VISUAL DO CORTE 3:2
// Monta uma pagina com o arquivo ORIGINAL em retrato ao lado do que o pipeline gravou, para o
// relatorio poder mostrar o que o corte central tirou de cada tatuagem.
if (fazer('corte')) {
  console.log('\n== CORTE 3:2 ==');
  // Quando a etapa roda sozinha, as URLs saem da propria grade ja salva.
  if (!cortes.length) {
    await pagina.keyboard.press('Escape');
    await esperar(800);
    const daGrade = await pagina.evaluate(() =>
      [...document.querySelectorAll('#ed-canvas img')]
        .filter((i) => /\/project\//.test(i.src))
        .map((i) => ({ url: i.src, w: i.naturalWidth, h: i.naturalHeight, alt: i.alt || '' })));
    console.log(`  ${daGrade.length} imagens de projeto na grade`);
    TATUAGENS.forEach((t, i) => {
      const g = daGrade[i];
      if (!g) return;
      cortes.push({
        peca: t.name, arquivo: t.imagem, entrada: '1000x1500',
        saida: `${g.w}x${g.h}`, alturaMantida: `${Math.round(((g.h / g.w) * 1000 / 1500) * 100)}%`, url: g.url,
      });
    });
  }
  console.table(cortes.map(({ url, ...r }) => r));
  await writeFile('out/tattoo-cortes.json', JSON.stringify(cortes, null, 2), 'utf8');

  const pares = cortes.filter((c) => c.entrada === '1000x1500' && !/hero/.test(c.peca)).slice(0, 4);
  // O original entra como data: URI porque file:// nao carrega dentro de uma pagina https.
  const { readFile } = await import('node:fs/promises');
  for (const c of pares) c.dataUri = `data:image/jpeg;base64,${(await readFile(m(c.arquivo))).toString('base64')}`;
  const html = `<html><body style="margin:0;background:#0F0A0A;color:#fff;font:14px system-ui">
    <div style="padding:18px 20px;font-size:19px">O que o corte 3:2 fez com a tatuagem: entrou 1000x1500 (retrato), saiu 1000x667.</div>
    <div style="display:flex;gap:18px;padding:0 20px 24px">
      ${pares.map((c) => `<div style="flex:1">
        <div style="opacity:.75;margin-bottom:6px">${c.peca} — como o Rafa fotografou</div>
        <img src="${c.dataUri}" style="width:100%;display:block;border:1px solid #444">
        <div style="color:#FF4D4D;margin:12px 0 6px">virou isto no card (sobrou ${c.alturaMantida} da altura)</div>
        <img src="${c.url}" style="width:100%;display:block;border:1px solid #FF4D4D">
      </div>`).join('')}
    </div></body></html>`;
  const p2 = await pagina.context().newPage();
  await p2.setViewportSize({ width: 1500, height: 1400 });
  await p2.setContent(html);
  await esperar(2500);
  await p2.screenshot({ path: 'out/tattoo-corte-3x2.png', fullPage: true });
  await p2.close();
}

console.log('\n== ERROS DE CONSOLE E REDE ==');
console.log(erros.length ? [...new Set(erros)].join('\n') : '(nenhum)');
await writeFile('out/tattoo-erros.txt', [...new Set(erros)].join('\n'), 'utf8');
console.log('\n== ATRITO COLETADO ==');
console.log(atrito.length ? atrito.join('\n') : '(nenhum)');
await writeFile('out/tattoo-atrito.txt', atrito.join('\n'), 'utf8');
console.log(`\npagina: ${APEX.replace('//', `//${demo.slug}.`)}`);

await navegador.close();
