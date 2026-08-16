// Caio Bertolini, fotografo documental. O portfolio inteiro montado pelo editor, como um
// comprador montaria, e a prova do corte de imagem.
//
// POR QUE ESTE SCRIPT EXISTE SEPARADO DOS OUTROS NICHOS: a persona do fotografo nao estressa
// texto, estressa PIXEL. O produto corta toda imagem de trabalho num 3:2 central fixo
// (imagePipeline.js, DESTINOS.project) e o unico controle de enquadramento do produto e o
// slider vertical do hero. Para um fotografo o corte E o trabalho, entao o teste central
// daqui e subir a MESMA cena em tres proporcoes (retrato 2:3, panoramica 2.86:1 e quadrada
// 1:1) e medir o que sobrou, baixando de volta o WebP que o produto gerou.
//
// Uso: node scripts/_demos/demo-fotografo.mjs
import { abrirEditor, abrirPainel, textoDaTela, esperar } from './base.mjs';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const MIDIA = resolve('out/midia/demo-fotografo');
const arq = (n) => resolve(MIDIA, n);

mkdirSync('out', { recursive: true });
const linhas = [];
const log = (...a) => { const s = a.map(String).join(' '); linhas.push(s); console.log(s); };
const gravarLog = () => writeFileSync('out/foto-diario.txt', linhas.join('\n'), 'utf8');

// Tudo que travou, atritou ou saiu diferente do esperado vira uma linha aqui.
const achados = [];
const achado = (tipo, sev, titulo, detalhe) => {
  achados.push({ tipo, sev, titulo, detalhe });
  log(`\n>>> [${tipo}/${sev}] ${titulo}\n    ${detalhe}\n`);
};

const { pagina, navegador, demo, erros } = await abrirEditor('demo-fotografo');
const t0 = Date.now();
log('# DIARIO demo-fotografo', new Date().toISOString());
log('persona:', demo.nome, '|', demo.role);

const foto = (nome) => pagina.screenshot({ path: `out/foto-${nome}.png`, fullPage: false });
const fotoInteira = (nome) => pagina.screenshot({ path: `out/foto-${nome}.png`, fullPage: true });

// ---------------------------------------------------------------- helpers de formulario
const abrirTudo = async () => {
  await pagina.evaluate(() => { document.querySelectorAll('#ed-gaveta details').forEach((d) => { d.open = true; }); });
  await esperar(350);
};

const existe = (sel) => pagina.locator(`#ed-gaveta ${sel}`).count().then((n) => n > 0);

async function preencher(key, valor) {
  const sel = `#ed-gaveta [data-k="${key}"]`;
  if (!(await existe(`[data-k="${key}"]`))) { log(`  ! campo ${key} nao existe`); return false; }
  const bloqueado = await pagina.locator(sel).first().isDisabled();
  if (bloqueado) { log(`  ! campo ${key} esta DESABILITADO (cadeado)`); return false; }
  await pagina.fill(sel, valor);
  return true;
}

async function preencherBloco(attr, key, texto) {
  const sel = `#ed-gaveta [data-${attr}="${key}"]`;
  if (!(await existe(`[data-${attr}="${key}"]`))) { log(`  ! campo ${key} nao existe`); return false; }
  await pagina.fill(sel, texto);
  return true;
}

async function chips(key, lista) {
  for (const item of lista) {
    const sel = `#ed-gaveta [data-chip-add="${key}"]`;
    if (!(await existe(`[data-chip-add="${key}"]`))) { log(`  ! chips ${key} sumiu`); return; }
    if (await pagina.locator(sel).first().isDisabled()) { log(`  ! chips ${key} cheio, parei em "${item}"`); return; }
    await pagina.fill(sel, item);
    await pagina.keyboard.press('Enter');
    await esperar(220);
  }
}

async function selecionar(key, valor) {
  const sel = `#ed-gaveta select[data-k="${key}"]`;
  if (!(await existe(`select[data-k="${key}"]`))) { log(`  ! select ${key} nao existe`); return; }
  await pagina.selectOption(sel, valor);
  await esperar(250);
}

async function ligarSwitch(key, ligado = true) {
  const sel = `#ed-gaveta [data-switch="${key}"]`;
  if (!(await existe(`[data-switch="${key}"]`))) { log(`  ! switch ${key} nao existe`); return; }
  const on = (await pagina.locator(sel).first().getAttribute('aria-checked')) === 'true';
  if (on !== ligado) { await pagina.locator(sel).first().click(); await esperar(500); }
}

// Sobe um arquivo e espera a previa trocar. Devolve a URL final no Storage (ou '' se falhou).
async function subirImagem(key, caminho, { timeout = 90000 } = {}) {
  if (!existsSync(caminho)) throw new Error(`arquivo nao existe: ${caminho}`);
  const antes = await pagina.locator(`#ed-gaveta [data-campo="${key}"] img.ed-drop-previa`).first().getAttribute('src').catch(() => null);
  await pagina.setInputFiles(`#ed-gaveta [data-arquivo="${key}"]`, caminho);
  const t = Date.now();
  try {
    await pagina.waitForFunction(
      ([k, ant]) => {
        const img = document.querySelector(`#ed-gaveta [data-campo="${k}"] img.ed-drop-previa`);
        return Boolean(img && img.src && img.src !== ant);
      },
      [key, antes],
      { timeout },
    );
  } catch {
    const msg = await pagina.locator(`#ed-gaveta [data-campo="${key}"] [data-erro]`).first().innerText().catch(() => '');
    log(`  ! upload de ${key} nao terminou. mensagem no campo: "${msg}"`);
    return '';
  }
  const url = await pagina.locator(`#ed-gaveta [data-campo="${key}"] img.ed-drop-previa`).first().getAttribute('src');
  log(`  upload ${key}: ${((Date.now() - t) / 1000).toFixed(1)}s -> ${url}`);
  return url || '';
}

async function salvar(rotulo) {
  await pagina.click('#ed-form-salvar');
  try {
    await pagina.waitForSelector('#ed-gaveta .ed-form', { state: 'detached', timeout: 60000 });
  } catch {
    const msg = await pagina.locator('#ed-form-msg').innerText().catch(() => '');
    achado('Defeito', 'alta', `Salvar travou em ${rotulo}`, `mensagem no rodape: "${msg}"`);
    await pagina.keyboard.press('Escape');
  }
  await esperar(1200);
}

// Baixa uma imagem do Storage e devolve { bytes, largura, altura } lendo o cabecalho do WebP.
async function medirRemota(url) {
  if (!url) return null;
  const r = await pagina.evaluate(async (u) => {
    const resp = await fetch(u, { cache: 'no-store' });
    const buf = new Uint8Array(await resp.arrayBuffer());
    const img = await createImageBitmap(new Blob([buf]));
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    c.getContext('2d').drawImage(img, 0, 0);
    return { bytes: buf.length, largura: img.width, altura: img.height, png: c.toDataURL('image/png') };
  }, url);
  return r;
}

async function baixarProcessada(url, nomeArquivo) {
  const r = await medirRemota(url);
  if (!r) return null;
  writeFileSync(arq(nomeArquivo), Buffer.from(r.png.split(',')[1], 'base64'));
  log(`  processada: ${nomeArquivo} ${r.largura}x${r.altura} (${(r.largura / r.altura).toFixed(3)}) ${(r.bytes / 1024).toFixed(0)} KB`);
  return r;
}

// =============================================================== 1. PERFIL
log('\n\n===== 1. PERFIL =====');
await foto('01-canvas-virgem');

await pagina.click('[data-abrir="perfil"]');
await esperar(1000);
await abrirTudo();

log('\n-- imagens do perfil --');
const urlHero = await subirImagem('hero', arq('hero.jpg'));
await abrirTudo();
const urlAvatar = await subirImagem('avatar', arq('avatar.jpg'));
await abrirTudo();

log('\n-- texto --');
await preencher('display_name', 'Caio Bertolini');
await preencher('role', 'Fotógrafo documental · São Paulo');
await preencherBloco('k', 'bio',
  'Fotografo há doze anos. Ando com uma câmera só, luz natural e tempo. '
  + 'Ensaio, editorial e documentário de rua. As imagens falam, eu escrevo pouco.');

log('\n-- selo (campo novo, passo 1) --');
await preencher('badge_label', 'Fotógrafo documental');
await selecionar('badge_icon', 'camera');

log('\n-- contato, redes e numeros --');
await preencher('contact_email', 'heliomonteiro164+demofoto@gmail.com');
await ligarSwitch('show_contact_email', true);
await abrirTudo();
await preencher('cta_url', 'https://wa.me/5511988887777');
const ctaOk = await preencher('cta_label', 'Pedir orçamento');
if (!ctaOk) {
  achado('Defeito', 'alta', 'O texto do botão principal está atrás do paywall',
    'O rótulo padrão é "Agendar Call" (i18n.js: bookCall). Um fotógrafo não agenda call, ele recebe pedido de orçamento. '
    + 'O campo cta_label existe, mas vem com cadeado de "Personalização", então a página nasce falando a língua de um consultor de tecnologia.');
}
await preencherBloco('pares', 'socials', [
  'Instagram | @caiobertolini | https://instagram.com/caiobertolini',
  'Behance | Ensaios completos | https://www.behance.net/caiobertolini',
  'Flickr | Arquivo de rua | https://www.flickr.com/photos/caiobertolini',
].join('\n'));
await preencherBloco('pares', 'stats', [
  'Ensaios entregues | 240',
  'Anos de estrada | 12',
  'Cidades | 18',
  'Exposições | 3',
].join('\n'));

log('\n-- o que ele usa no trabalho --');
await abrirTudo();
await chips('stacks', [
  'Leica Q2', 'Nikon Z6 II', '35mm f/1.4', '85mm f/1.8', 'Luz natural',
  'Filme 35mm', 'Revelação P&B', 'Lightroom', 'Capture One',
  'Fotografia de rua', 'Ensaio documental', 'Fotojornalismo',
]);
await abrirTudo();
await selecionar('projects_per_page', '9');
await preencher('seo_title', 'Caio Bertolini · Fotógrafo documental');
await preencher('seo_description', 'Ensaio, editorial e documentário de rua em São Paulo. Luz natural, tempo e uma câmera só.');

await foto('02-perfil-preenchido');
await salvar('perfil');
await foto('03-canvas-com-perfil');
gravarLog();

// =============================================================== 2. OS OITO ENSAIOS
log('\n\n===== 2. OS OITO ENSAIOS =====');

// Os tres primeiros sao O TESTE: mesma pergunta, tres proporcoes de entrada.
const ENSAIOS = [
  {
    arquivo: 'teste-retrato-2x3.jpg', apelido: 'retrato-2x3',
    name: 'Quem fotografa', category: 'Retrato',
    tagline: 'Um retrato vertical fechado. A cabeça ocupa o terço de cima do quadro.',
    groups: ['Retrato'], year: '2025', fit: null,
  },
  {
    arquivo: 'teste-panoramica.jpg', apelido: 'panoramica',
    name: 'Campo, fim de tarde', category: 'Fotografia de rua',
    tagline: 'Panorâmica. O que interessa está nas duas pontas, não no meio.',
    groups: ['Rua'], year: '2024', fit: null,
  },
  {
    arquivo: 'teste-quadrada.jpg', apelido: 'quadrada',
    name: 'Chandni Chowk, 6h10', category: 'Ensaio documental',
    tagline: 'Quadrada, de rolo médio formato. O céu e a sombra fazem o enquadramento.',
    groups: ['Documental'], year: '2024', fit: null,
  },
  {
    arquivo: 'trab-1.jpg', apelido: 'noturno',
    name: 'Marquise às 3h47', category: 'Fotografia de rua',
    tagline: 'Três meses de madrugadas até a luz do letreiro cair no lugar certo.',
    groups: ['Rua'], year: '2024', fit: 'cover',
  },
  {
    arquivo: 'trab-2.jpg', apelido: 'praca',
    name: 'Recreio no largo', category: 'Ensaio documental',
    tagline: 'Uma tarde inteira sentado no mesmo banco.',
    groups: ['Documental'], year: '2023', fit: 'cover',
  },
  {
    arquivo: 'trab-3.jpg', apelido: 'beco',
    name: 'O beco às seis', category: 'Ensaio documental',
    tagline: 'A luz entra no beco por catorze minutos por dia.',
    groups: ['Documental'], year: '2023', fit: 'cover',
  },
  {
    arquivo: 'trab-4.jpg', apelido: 'editorial',
    name: 'Oficina, série completa', category: 'Editorial',
    tagline: 'Editorial de doze páginas sobre quem conserta.',
    groups: ['Editorial'], year: '2025', fit: 'cover',
  },
  {
    arquivo: 'trab-8.jpg', apelido: 'portao',
    name: 'Portão da rua velha', category: 'Fotografia de rua',
    tagline: 'Fui até o portão dezessete vezes. Na décima oitava a bicicleta passou.',
    groups: ['Rua'], year: '2025', fit: 'cover',
  },
];

const medidas = [];

for (const [i, e] of ENSAIOS.entries()) {
  log(`\n-- ensaio ${i + 1}/8: ${e.name} (${e.apelido}) --`);
  await pagina.click('[data-abrir="projetos"]');
  await esperar(900);
  await pagina.click('#ed-gaveta [data-adicionar]');
  await esperar(900);

  const url = await subirImagem('image', arq(e.arquivo));
  await abrirTudo();
  await preencher('name', e.name);
  await preencher('category', e.category);
  await preencherBloco('k', 'tagline', e.tagline);
  await abrirTudo();
  await selecionar('year', e.year);
  await chips('groups', e.groups);
  await abrirTudo();
  if (e.fit) await selecionar('image_fit', e.fit);

  // Os tres primeiros ficam com o fit PADRAO de proposito, para a captura mostrar o que o
  // comprador ve sem tocar em nada.
  const fitAgora = await pagina.locator('#ed-gaveta select[data-k="image_fit"]').first().inputValue().catch(() => '?');
  log(`  image_fit no salvar: ${fitAgora}`);

  if (i < 3) {
    await pagina.locator(`#ed-gaveta [data-campo="image"]`).first().screenshot({ path: `out/foto-corte-${e.apelido}-previa.png` }).catch(() => {});
    const m = await baixarProcessada(url, `processada-${e.apelido}.png`);
    if (m) medidas.push({ apelido: e.apelido, arquivo: e.arquivo, ...m, png: undefined });
  }

  await salvar(`ensaio ${e.name}`);
  await esperar(600);
}

await foto('04-grade-oito-ensaios');
await fotoInteira('05-canvas-inteiro');
gravarLog();

// Card de cada teste, isolado, do jeito que o visitante ve.
log('\n-- cards dos tres testes, isolados --');
for (const e of ENSAIOS.slice(0, 3)) {
  const alvo = pagina.locator(`.project-card`).filter({ hasText: e.name }).first();
  if (await alvo.count()) {
    await alvo.screenshot({ path: `out/foto-card-${e.apelido}.png` });
    log(`  card ${e.apelido} capturado`);
  } else {
    log(`  ! card ${e.apelido} nao achado na grade`);
  }
}

// =============================================================== 3. EXPERIENCIA
log('\n\n===== 3. EXPERIENCIA =====');

const EXPS = [
  {
    kind: 'work', org: 'Folha de S.Paulo', role: 'Fotógrafo colaborador',
    period_start: '03/2019', atual: false, period_end: '12/2023', location: 'São Paulo, SP',
    highlights: ['Pauta de cidade e cultura, três a cinco pautas por semana.', 'Duas capas de caderno.'],
    note: '',
  },
  {
    kind: 'education', org: 'Escola Panamericana de Arte e Design', role: 'Fotografia',
    period_start: '2011', atual: false, period_end: '2013', location: 'São Paulo, SP',
    highlights: ['Laboratório de preto e branco, revelação e ampliação.', 'TCC em ensaio documental de rua.'],
    note: '',
  },
  // Premio/exposicao NAO TEM TIPO. Vai como 'work' porque so existem 'Trabalho' e 'Estudo'.
  {
    kind: 'work', org: 'Prêmio Vladimir Herzog', role: 'Menção honrosa, categoria Fotografia',
    period_start: '2022', atual: false, period_end: '2022', location: 'São Paulo, SP',
    highlights: ['Série "Marquise às 3h47", seis imagens.', 'Exposição coletiva no Sesc Pompeia, 2022.'],
    note: 'Também exposto na Bienal de Fotografia de Curitiba em 2023.',
    premio: true,
  },
];

for (const [i, x] of EXPS.entries()) {
  log(`\n-- experiencia ${i + 1}/3: ${x.org} --`);
  await pagina.click('[data-abrir="experiencias"]');
  await esperar(900);
  await pagina.click('#ed-gaveta [data-adicionar]');
  await esperar(900);

  await pagina.click(`#ed-gaveta [data-escolha="kind"][data-valor="${x.kind}"]`).catch(() => {});
  await esperar(600);

  if (x.premio) {
    const rotOrg = await pagina.locator('#ed-gaveta [data-campo="org"] .ed-label').first().innerText();
    const rotRole = await pagina.locator('#ed-gaveta [data-campo="role"] .ed-label').first().innerText();
    const rotIni = await pagina.locator('#ed-gaveta [data-campo="period_start"] .ed-label').first().innerText();
    achado('Buraco de template', 'alta', 'Prêmio e exposição não têm tipo próprio',
      `O seletor "Tipo" só oferece Trabalho e Estudo. Um prêmio virou "${rotOrg.replace(/\s*\*$/, '')}: Prêmio Vladimir Herzog" e `
      + `"${rotRole.replace(/\s*\*$/, '')}: Menção honrosa", com "${rotIni.replace(/\s*\*$/, '')}". `
      + 'Para fotógrafo, prêmio e exposição são o currículo, não anexo.');
  }

  await preencher('org', x.org);
  await preencher('role', x.role);
  await preencher('period_start', x.period_start);
  await ligarSwitch('atual', Boolean(x.atual));
  await abrirTudo();
  if (!x.atual) await preencher('period_end', x.period_end);
  await abrirTudo();
  await preencher('location', x.location);
  await preencherBloco('linhas', 'highlights', x.highlights.join('\n'));
  if (x.note) { await abrirTudo(); await preencherBloco('k', 'note', x.note); }

  await foto(`06-exp-${i + 1}`);
  await salvar(`experiencia ${x.org}`);
  await esperar(600);
}

await fotoInteira('07-canvas-completo');
gravarLog();

// =============================================================== 4. COMO O VISITANTE VE
log('\n\n===== 4. VER COMO VISITANTE =====');
await pagina.click('[data-ver-visitante]').catch(() => {});
await esperar(2000);
await fotoInteira('08-visitante-inteiro');
await foto('09-visitante-topo');

log('\n-- texto integral da pagina do visitante --');
log((await textoDaTela(pagina)).slice(0, 4000));

// Volta ao editor pelo atalho: a barra de cima some no modo visitante.
await pagina.locator('body').click({ position: { x: 5, y: 5 } }).catch(() => {});
await pagina.keyboard.press('v');
await esperar(1500);
if (!(await pagina.locator('#ed-barra').isVisible().catch(() => false))) {
  await pagina.click('[data-ver-visitante]').catch(() => {});
  await esperar(1200);
}
gravarLog();

// =============================================================== 5. PUBLICAR
log('\n\n===== 5. PUBLICAR =====');
await pagina.click('[data-abrir="publicar"]').catch(async () => {
  await abrirPainel(pagina, 'Publicar');
});
await esperar(1500);
await foto('11-publicar-checklist');
log('\n-- checklist --');
log(await pagina.locator('#ed-gaveta').innerText().catch(() => '(gaveta vazia)'));

// Link de previa: e a unica forma de ver a pagina REAL (com modal, filtro e paginacao)
// antes de a fila de revisao liberar o dominio.
let urlPrevia = '';
if (await pagina.locator('#ed-gaveta [data-girar-previa]').count()) {
  await pagina.click('#ed-gaveta [data-girar-previa]');
  await esperar(4000);
  urlPrevia = await pagina.locator('#ed-gaveta [data-previa-url]').first().inputValue().catch(() => '');
  log(`link de previa: ${urlPrevia}`);
}

const btnPub = pagina.locator('#ed-gaveta [data-publicar]');
if (await btnPub.count()) {
  const travado = await btnPub.first().isDisabled();
  log(`botao publicar desabilitado? ${travado}`);
  if (!travado) {
    await btnPub.first().click();
    await esperar(6000);
    await foto('12-publicado');
    log('\n-- resposta da publicacao --');
    log(await pagina.locator('#ed-gaveta').innerText().catch(() => ''));
  }
} else {
  achado('Bloqueio', 'alta', 'Botão de publicar não apareceu', 'O painel Publicar abriu sem [data-publicar].');
}

// =============================================================== 5b. A PAGINA DE VERDADE
if (urlPrevia) {
  log('\n\n===== 5b. PAGINA REAL PELA PREVIA =====');
  const p2 = await pagina.context().newPage();
  await p2.goto(urlPrevia, { waitUntil: 'networkidle' }).catch((e) => log('  ! previa nao abriu: ' + e));
  await esperar(2500);
  await p2.screenshot({ path: 'out/foto-13-previa-inteira.png', fullPage: true });
  await p2.screenshot({ path: 'out/foto-14-previa-topo.png' });

  // Cards dos tres testes, na pagina publica de verdade.
  for (const e of ENSAIOS.slice(0, 3)) {
    const alvo = p2.locator('.project-card').filter({ hasText: e.name }).first();
    if (await alvo.count()) {
      await alvo.scrollIntoViewIfNeeded();
      await esperar(400);
      await alvo.screenshot({ path: `out/foto-card-publico-${e.apelido}.png` });
      log(`  card publico ${e.apelido} capturado`);
    } else {
      log(`  ! card publico ${e.apelido} nao achado`);
    }
  }

  // A grade inteira, para comparar as tres proporcoes lado a lado.
  const grade = p2.locator('#project-count').first().locator('xpath=ancestor::div[contains(@class,"glass-card")][1]');
  if (await grade.count()) {
    await grade.scrollIntoViewIfNeeded();
    await esperar(500);
    await grade.screenshot({ path: 'out/foto-15-grade-publica.png' });
  }

  // O modal: e aqui que "O Desafio / A Solução" apareceriam. Um ensaio nao tem nenhum dos dois.
  const card1 = p2.locator('.project-card').filter({ hasText: ENSAIOS[0].name }).first();
  if (await card1.count()) {
    await card1.click();
    await esperar(1800);
    await p2.screenshot({ path: 'out/foto-16-modal-do-ensaio.png' });
    const txt = await p2.locator('#project-modal').first().innerText().catch(() => '');
    log('\n-- texto do modal do ensaio --\n' + txt.slice(0, 1500));
    await p2.keyboard.press('Escape');
    await esperar(600);
  }

  log('\n-- texto integral da pagina publicada --');
  log((await p2.evaluate(() => document.body.innerText)).slice(0, 5000));
  await p2.close();
}

// =============================================================== 6. FECHAMENTO
log('\n\n===== ERROS DE CONSOLE/REDE =====');
log(erros.length ? erros.join('\n') : '  (nenhum)');

log('\n\n===== MEDIDAS DO CORTE =====');
log(JSON.stringify(medidas, null, 2));

log('\n\n===== ACHADOS REGISTRADOS PELO SCRIPT =====');
achados.forEach((a) => log(`[${a.tipo}/${a.sev}] ${a.titulo}\n    ${a.detalhe}`));

log(`\ntempo total: ${((Date.now() - t0) / 60000).toFixed(1)} min`);
gravarLog();
writeFileSync('out/foto-medidas.json', JSON.stringify({ medidas, achados, erros }, null, 2), 'utf8');
console.log('\n>>> diario em out/foto-diario.txt');
await navegador.close();
