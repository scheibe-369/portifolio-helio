// Helena Kuroda, arquiteta em Curitiba. O que esta persona existe para quebrar esta escrito em
// demos.config.mjs: "pede estetica CLARA. O produto e preto absoluto e o glassmorphism e branco
// sobre preto". Arquitetura se apresenta em branco, e essa e a convencao da profissao inteira.
//
// O script monta o portfolio inteiro pelo editor (perfil, 6 projetos, 4 experiencias, servicos),
// varre TODO controle de cor/tema/fundo que existe, tenta usar o que estiver liberado, publica e
// fotografa a pagina publicada. Nada entra por SQL.
//
// Uso: node scripts/_demos/demo-arquiteta.mjs
import { abrirEditor, esperar } from './base.mjs';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';

const MIDIA = 'out/midia/demo-arquiteta';
mkdirSync('out', { recursive: true });

const linhas = [];
const log = (...a) => { const s = a.map(String).join(' '); linhas.push(s); console.log(s); };
const salvarLog = () => writeFileSync('out/arq-log.txt', linhas.join('\n'), 'utf8');
const t0 = Date.now();
const cron = () => `[${String(Math.round((Date.now() - t0) / 1000)).padStart(4)}s]`;

const { pagina, navegador, demo, erros, APEX } = await abrirEditor('demo-arquiteta');
pagina.setDefaultTimeout(15000);
log('# DEMO ARQUITETA', new Date().toISOString());
log('persona:', demo.nome, '|', demo.role, '| slug', demo.slug);

// ---------------------------------------------------------------------------- utilitarios

const foto = async (nome, inteiro = false) => {
  await pagina.screenshot({ path: `out/arq-${nome}.png`, fullPage: inteiro });
  log(cron(), `  foto: out/arq-${nome}.png`);
};

const abrirTudo = () => pagina.evaluate(() => {
  document.querySelectorAll('#ed-gaveta details').forEach((d) => { d.open = true; });
});

const fecharGaveta = async () => {
  await pagina.keyboard.press('Escape').catch(() => {});
  await esperar(700);
};

const abrir = async (chave) => {
  await pagina.click(`[data-abrir="${chave}"]`);
  await pagina.waitForSelector('#ed-gaveta.is-open', { timeout: 15000 });
  await esperar(1000);
  await abrirTudo();
  await esperar(400);
};

// Preenche um campo de texto/textarea pela key do fieldSchema. Devolve o que de fato ficou
// gravado no input, que e como se pega truncamento por maxlength sem aviso.
const escrever = async (key, texto) => {
  const sel = `#ed-${key}`;
  if (!(await pagina.locator(sel).count())) { log(`   !! campo ${key} nao existe`); return null; }
  await pagina.fill(sel, texto);
  await esperar(120);
  const ficou = await pagina.inputValue(sel);
  if (ficou !== texto) log(`   !! ${key} TRUNCOU: pedi ${texto.length} chars, gravou ${ficou.length}`);
  return ficou;
};

const selecionar = async (key, valor) => {
  const sel = `#ed-${key}`;
  if (!(await pagina.locator(sel).count())) { log(`   !! select ${key} nao existe`); return; }
  await pagina.selectOption(sel, valor).catch((e) => log(`   !! select ${key}=${valor} recusou: ${String(e).slice(0, 120)}`));
  await esperar(200);
};

const ligarSwitch = async (key, querLigado = true) => {
  const sel = `button[data-switch="${key}"]`;
  if (!(await pagina.locator(sel).count())) { log(`   !! switch ${key} nao existe`); return; }
  const estaLigado = (await pagina.getAttribute(sel, 'aria-checked')) === 'true';
  if (estaLigado !== querLigado) { await pagina.click(sel); await esperar(600); await abrirTudo(); await esperar(200); }
};

const chips = async (key, lista) => {
  for (const item of lista) {
    const sel = `input[data-chip-add="${key}"]`;
    if (!(await pagina.locator(sel).count())) { log(`   !! chips ${key} sumiu`); return; }
    if (await pagina.locator(sel).isDisabled()) { log(`   !! chips ${key} chegou no limite antes de "${item}"`); return; }
    await pagina.fill(sel, item);
    await pagina.press(sel, 'Enter');
    await esperar(450);
    await abrirTudo();
    await esperar(150);
  }
};

const subirImagem = async (key, arquivo) => {
  if (!existsSync(arquivo)) { log(`   !! arquivo nao existe: ${arquivo}`); return false; }
  const input = `input[data-arquivo="${key}"]`;
  if (!(await pagina.locator(input).count())) { log(`   !! campo de imagem ${key} nao existe`); return false; }
  const antes = Date.now();
  await pagina.setInputFiles(input, arquivo);
  // A previa so nasce quando o upload resolve; o erro aparece no <p data-erro> do mesmo campo.
  for (let i = 0; i < 60; i += 1) {
    const est = await pagina.evaluate((k) => {
      const campo = document.querySelector(`[data-campo="${k}"]`);
      if (!campo) return { sumiu: true };
      return {
        temPrevia: Boolean(campo.querySelector('img.ed-drop-previa')),
        erro: (campo.querySelector('[data-erro]')?.textContent || '').trim(),
      };
    }, key);
    if (est.sumiu) return false;
    if (est.temPrevia) { log(`   imagem ${key} subiu em ${Math.round((Date.now() - antes) / 1000)}s`); await abrirTudo(); return true; }
    if (est.erro && !/convertendo|enviando/i.test(est.erro)) { log(`   !! upload ${key} FALHOU: ${est.erro}`); return false; }
    await esperar(700);
  }
  log(`   !! upload ${key} nao terminou em 42s`);
  return false;
};

const salvar = async (rotulo) => {
  const btn = '#ed-form-salvar';
  if (!(await pagina.locator(btn).count())) { log(`   !! sem botao Salvar em ${rotulo}`); return false; }
  await pagina.click(btn);
  for (let i = 0; i < 40; i += 1) {
    await esperar(500);
    const aberta = await pagina.locator('#ed-gaveta.is-open').count();
    if (!aberta) { log(cron(), `   salvo: ${rotulo}`); return true; }
    const msg = (await pagina.locator('#ed-form-msg').textContent().catch(() => '')) || '';
    if (msg && !/salvando/i.test(msg)) { log(`   !! salvar ${rotulo} reclamou: "${msg.trim()}"`); return false; }
  }
  log(`   !! salvar ${rotulo} nao respondeu`);
  return false;
};

// Dump completo dos campos visiveis na gaveta agora, com cadeado e tipo.
const dumpCampos = () => pagina.evaluate(() => {
  const g = document.querySelector('#ed-gaveta');
  if (!g) return [];
  return [...g.querySelectorAll('.ed-field')].map((f) => {
    const inp = f.querySelector('input,select,textarea,button[data-switch]');
    return {
      key: f.dataset.campo || '',
      label: (f.querySelector('.ed-label')?.innerText || '').trim().replace(/\n/g, ' '),
      help: (f.querySelector('.ed-help')?.innerText || '').trim(),
      cadeado: Boolean(f.querySelector('.ed-lock')),
      desabilitado: Boolean(inp?.disabled),
      tipoInput: inp ? `${inp.tagName.toLowerCase()}${inp.type ? ':' + inp.type : ''}` : '-',
      valor: inp && 'value' in inp ? String(inp.value).slice(0, 40) : '',
      passo: f.closest('details')?.querySelector('.ed-passo-titulo')?.innerText.trim() || '(passo 1)',
    };
  });
});

// ============================================================ 1. RECON DE COR, TEMA E APARENCIA
log(`\n\n${cron()} ===== 1. O QUE EXISTE DE COR / TEMA / FUNDO / APARENCIA =====`);
await foto('00-editor-virgem', true);

// 'conta' fica FORA desta lista de proposito. Ele nao abre gaveta como os outros quatro botoes
// vizinhos: troca a pagina inteira e destroi a barra do editor, e so volta pelo link "Voltar
// para o editor". Descobri isso do jeito caro, com o script inteiro perdendo o editor no meio.
const PAINEIS = ['perfil', 'projetos', 'experiencias'];
const achadosCor = [];
for (const p of PAINEIS) {
  try {
    await abrir(p);
    const campos = await dumpCampos();
    log(`\n-- painel ${p}: ${campos.length} campos`);
    campos.forEach((c) => {
      const marca = c.cadeado ? '[CADEADO]' : c.desabilitado ? '[DESABILITADO]' : '';
      if (/cor|tema|fundo|cores|aparen|claro|escuro|plate|accent|theme|bg/i.test(`${c.key} ${c.label} ${c.help}`)) {
        achadosCor.push({ painel: p, ...c });
        log(`   >>> COR/TEMA ${marca} ${c.key} :: "${c.label}" :: ${c.tipoInput} :: valor=${c.valor} :: passo=${c.passo}`);
      }
    });
    // Texto integral do painel, para pegar controle que nao seja .ed-field.
    const texto = await pagina.evaluate(() => document.querySelector('#ed-gaveta')?.innerText || '');
    const pistas = texto.split('\n').filter((l) => /cor|tema|fundo|aparen|claro|escuro|paleta|visual|estilo/i.test(l));
    if (pistas.length) log(`   texto com pista de aparencia: ${JSON.stringify(pistas)}`);
    await fecharGaveta();
  } catch (e) { log(`   !! painel ${p} falhou: ${String(e).slice(0, 200)}`); await fecharGaveta(); }
}

// O formulario de projeto e o de experiencia tambem tem campo de cor proprio.
try {
  await abrir('projetos');
  await pagina.click('[data-adicionar]');
  await esperar(1200);
  await abrirTudo();
  await esperar(300);
  const campos = await dumpCampos();
  log('\n-- formulario de PROJETO novo');
  campos.filter((c) => /cor|fundo|accent|plate/i.test(`${c.key} ${c.label}`)).forEach((c) => {
    achadosCor.push({ painel: 'projeto', ...c });
    log(`   >>> COR ${c.cadeado ? '[CADEADO]' : ''} ${c.key} :: "${c.label}" :: valor=${c.valor}`);
  });
  await foto('01-projeto-novo-ajustes-finos');
  await fecharGaveta(); await fecharGaveta();
} catch (e) { log('   !! recon projeto falhou:', String(e).slice(0, 200)); await fecharGaveta(); await fecharGaveta(); }

// O botao Conta: mesma barra, mesmo tamanho, comportamento completamente diferente.
try {
  await pagina.click('[data-abrir="conta"]');
  await esperar(2000);
  const sobrou = await pagina.evaluate(() => ({
    barra: Boolean(document.querySelector('#ed-barra')),
    canvas: Boolean(document.querySelector('#ed-canvas')),
    voltar: Boolean(document.querySelector('#conta-voltar')),
    texto: (document.body.innerText || '').slice(0, 700),
  }));
  log('\n-- botao CONTA (mesma barra dos outros quatro):');
  log(`   a barra do editor sobreviveu? ${sobrou.barra} | o canvas sobreviveu? ${sobrou.canvas} | tem link de voltar? ${sobrou.voltar}`);
  log(sobrou.texto.split('\n').map((l) => '   | ' + l).join('\n'));
  await foto('02b-painel-conta', true);
  if (sobrou.voltar) { await pagina.click('#conta-voltar'); await pagina.waitForSelector('#ed-barra', { timeout: 20000 }); await esperar(1500); }
} catch (e) { log('   !! conta falhou:', String(e).slice(0, 250)); }

// O painel da Personalizacao (o que o cadeado vende).
try {
  await abrir('perfil');
  await pagina.locator('.ed-lock').first().click();
  await esperar(1500);
  const bump = await pagina.evaluate(() => document.querySelector('#ed-gaveta')?.innerText || '');
  log('\n-- painel do cadeado (Personalizacao):');
  log(bump.split('\n').map((l) => '   | ' + l).join('\n'));
  await foto('02-painel-personalizacao');
  await fecharGaveta();
} catch (e) { log('   !! bump falhou:', String(e).slice(0, 200)); await fecharGaveta(); }

log(`\n>> RESUMO: ${achadosCor.length} controles de cor no produto inteiro; ` +
  `${achadosCor.filter((c) => c.cadeado).length} atras de cadeado. ` +
  `Nenhum deles se chama "tema", "claro" ou "fundo da pagina".`);

// ============================================================ 2. PERFIL
log(`\n\n${cron()} ===== 2. PERFIL =====`);
const BIO = [
  'Arquiteta e urbanista formada pela FAU USP, com escritorio proprio em Curitiba desde 2018.',
  'Projeto casas, reformas e interiores partindo sempre do lugar: orientacao solar, ventilacao cruzada e o modo real como a familia usa cada comodo.',
  'Meu processo comeca em estudo de partido e maquete fisica, e so depois vira projeto executivo com detalhamento de marcenaria.',
  'Acompanho a obra ate a ultima visita, porque projeto que nao vira obra e desenho bonito.',
  'Ja foram 34 projetos entregues, do estudo preliminar ao as built, entre Curitiba, litoral do Parana e Santa Catarina.',
].join('\n');

try {
  await abrir('perfil');
  await subirImagem('hero', `${MIDIA}/retrato-helena.jpg`);
  await subirImagem('avatar', `${MIDIA}/retrato-helena.jpg`);
  await abrirTudo();
  await escrever('display_name', 'Helena Kuroda');
  await escrever('role', 'Arquitetura residencial, reforma e interiores. Curitiba, PR');
  await escrever('bio', BIO);
  await escrever('badge_label', 'Arquiteta e urbanista');
  await selecionar('badge_icon', 'ruler');
  await escrever('contact_email', 'heliomonteiro164+demoarq@gmail.com');
  await ligarSwitch('show_contact_email', true);
  await escrever('cta_url', 'https://wa.me/5541988887777');
  await escrever('socials', [
    'Instagram | @helenakuroda.arq | https://instagram.com/helenakuroda.arq',
    'Pinterest | Referencias e paletas | https://br.pinterest.com/helenakuroda',
    'LinkedIn | Helena Kuroda | https://www.linkedin.com/in/helenakuroda',
    'ArchDaily | Obras publicadas | https://www.archdaily.com.br',
  ].join('\n'));
  await escrever('stats', [
    'Obras entregues | 34',
    'Anos de projeto | 12',
    'CAU | A123456-7',
    'Cidades atendidas | 6',
  ].join('\n'));
  await chips('stacks', [
    'Projeto residencial', 'Reforma e retrofit', 'Interiores e marcenaria',
    'Projeto executivo', 'Acompanhamento de obra', 'Aprovacao na prefeitura',
    'AutoCAD', 'SketchUp', 'Revit', 'Lumion', 'Maquete fisica', 'Moodboard e paleta',
  ]);
  await selecionar('projects_per_page', '6');
  await ligarSwitch('show_online_dot', true);
  await escrever('seo_title', 'Helena Kuroda | Arquitetura residencial em Curitiba');
  await escrever('seo_description', 'Projetos de casas, reformas e interiores em Curitiba. Estudo de partido, executivo e acompanhamento de obra.');
  await foto('03-perfil-preenchido', true);
  await salvar('perfil');
} catch (e) { log('   !! perfil falhou:', String(e).slice(0, 300)); await fecharGaveta(); }

// ============================================================ 3. PROJETOS
log(`\n\n${cron()} ===== 3. SEIS PROJETOS =====`);

// O que uma arquiteta precisa dizer de cada obra: partido, programa, area, ano e localizacao.
// Como nao ha campo para nada disso, cada um vai empurrado para o campo que "mais ou menos"
// serve, e o registro de para onde foi empurrado E o achado.
const PROJETOS = [
  {
    arquivo: 'p1-residencia-concreto.jpg',
    name: 'Casa Guaira',
    category: 'Residencia unifamiliar',
    tagline: 'Casa de concreto aparente e madeira num terreno em declive, com o programa social virado para o vale.',
    problem: 'Terreno de 18 por 42 metros com 4 metros de desnivel e a melhor vista virada para o oeste, que e onde bate o sol da tarde no verao curitibano.',
    solution: 'Partido: dois blocos deslocados no nivel, ligados por uma passarela coberta. O bloco social desce para acompanhar o terreno e ganha um beiral de 2,10 m que corta o sol baixo sem fechar a vista.',
    features: [
      'Area construida: 286 m2',
      'Terreno: 756 m2',
      'Programa: 3 suites, estar integrado, cozinha com despensa, escritorio, garagem para 2 carros',
      'Localizacao: Sao Jose dos Pinhais, PR',
      'Estrutura: concreto aparente moldado in loco',
      'Vedacao: alvenaria com revestimento em madeira cumaru',
      'Etapa: executivo completo e acompanhamento de obra',
      'Obra concluida em 2023',
    ],
    stack: ['Concreto aparente', 'Madeira cumaru', 'Esquadria de aluminio preto', 'Cobertura verde'],
    ano: '2023',
    groups: ['Residencial'],
    fit: 'cover',
    cliente: 'Familia Antunes',
  },
  {
    arquivo: 'p2-casa-patio.jpg',
    name: 'Casa Patio Bacacheri',
    category: 'Residencia unifamiliar',
    tagline: 'Casa de patio em lote de meio de quadra, resolvida por dentro porque nao havia vista para fora.',
    problem: 'Lote de 10 metros de frente espremido entre dois sobrados de tres pavimentos. Nenhuma face com vista e insolacao direta so no fundo, por duas horas.',
    solution: 'Partido: a casa vira as costas para os vizinhos e se abre para um patio central de 5 por 6 metros, com pergolado de madeira. Toda a circulacao social passa pelo patio, entao a luz entra pelo meio da planta e nao pelas bordas.',
    features: [
      'Area construida: 174 m2',
      'Terreno: 360 m2',
      'Programa: 3 dormitorios, patio central, estar e jantar integrados, ateliê nos fundos',
      'Localizacao: Bacacheri, Curitiba, PR',
      'Pergolado de madeira com brise movel sobre o patio',
      'Piso continuo de cimento queimado',
      'Etapa: estudo preliminar, executivo e detalhamento de marcenaria',
    ],
    stack: ['Cimento queimado', 'Pergolado de madeira', 'Brise movel', 'Marcenaria sob medida'],
    ano: '2022',
    groups: ['Residencial'],
    fit: 'cover',
    cliente: null,
  },
  {
    arquivo: 'p3-reforma-cozinha.jpg',
    name: 'Reforma Apartamento Batel',
    category: 'Reforma',
    tagline: 'Apartamento de 1978 com planta compartimentada virou planta integrada sem tocar em nenhuma viga.',
    problem: 'Apartamento de 132 m2 com sete paredes internas, cozinha de servico isolada e area de servico maior que o segundo dormitorio. Estrutura em alvenaria estrutural parcial, entao meia planta nao podia cair.',
    solution: 'Partido: derrubar so o que a laudo estrutural liberou e resolver o resto com marcenaria de piso a teto que funciona como parede. A cozinha vira o centro social e a area de servico encolhe para um armario tecnico.',
    features: [
      'Area: 132 m2',
      'Programa: 3 dormitorios sendo 1 suite, estar e jantar integrados a cozinha, lavabo, armario tecnico',
      'Localizacao: Batel, Curitiba, PR',
      'Laudo estrutural antes de qualquer demolicao',
      'Marcenaria de piso a teto substituindo tres paredes',
      'Reforma com moradores no imovel, obra em duas etapas',
      'Etapa: projeto de reforma, executivo, gerenciamento de obra',
    ],
    stack: ['Marcenaria sob medida', 'Laudo estrutural', 'Iluminacao embutida', 'Porcelanato de grande formato'],
    ano: '2024',
    groups: ['Reforma'],
    fit: 'cover',
    cliente: 'Particular',
  },
  {
    arquivo: 'p4-interiores-sala.jpg',
    name: 'Interiores Apto Cabral',
    category: 'Interiores',
    tagline: 'Projeto de interiores completo para um apartamento entregue no osso, com paleta de madeira clara e linho.',
    problem: 'Apartamento novo entregue sem nenhum acabamento, com pe direito de 2,60 m e uma sala longa e estreita que a construtora vendia como "living ampliado".',
    solution: 'Partido: quebrar o comprimento da sala em tres ambientes de leitura clara com tapete, marcenaria e mudanca de forro. A paleta e madeira clara, linho cru e cinza pedra, para o apartamento nao depender de cor para parecer acabado.',
    features: [
      'Area: 96 m2',
      'Programa: estar, jantar, home office integrado, 2 dormitorios',
      'Localizacao: Cabral, Curitiba, PR',
      'Paleta: madeira clara, linho cru, cinza pedra',
      'Forro de gesso rebaixado com sanca de luz indireta',
      'Marcenaria em carvalho natural',
      'Etapa: interiores, detalhamento e compras',
    ],
    stack: ['Carvalho natural', 'Linho cru', 'Luz indireta', 'Curadoria de mobiliario'],
    ano: '2024',
    groups: ['Interiores'],
    fit: 'cover',
    cliente: null,
  },
  {
    arquivo: 'p5-cafe-comercial.jpg',
    name: 'Cafe Mercado',
    category: 'Comercial',
    tagline: 'Cafe de 62 m2 dentro de um galpao tombado, com tudo desmontavel porque nada podia furar a estrutura original.',
    problem: 'Ponto dentro de galpao tombado pelo patrimonio, onde nenhuma intervencao pode ser fixada na estrutura original nem alterar a leitura do volume.',
    solution: 'Partido: uma caixa de madeira autoportante apoiada no piso, que encosta mas nunca fixa. O balcao, o mezanino de apoio e a iluminacao vem todos pendurados nessa caixa, e a obra inteira pode ser desmontada em tres dias.',
    features: [
      'Area: 62 m2',
      'Programa: balcao, salao com 24 lugares, copa de apoio, deposito em mezanino',
      'Localizacao: Centro, Curitiba, PR',
      'Estrutura autoportante em madeira laminada colada',
      'Zero fixacao na estrutura tombada',
      'Aprovacao no orgao de patrimonio antes do executivo',
      'Etapa: projeto, aprovacao e acompanhamento',
    ],
    stack: ['Madeira laminada colada', 'Estrutura desmontavel', 'Aprovacao de patrimonio', 'Iluminacao cenica'],
    ano: '2021',
    groups: ['Comercial'],
    fit: 'cover',
    cliente: 'Cafe Mercado',
  },
  {
    // O CASO REAL DELA: prancha tecnica com fundo BRANCO sobre a placa escura do card.
    arquivo: 'p6-planta-baixa.jpg',
    name: 'Sobrado Juveve, estudo',
    category: 'Reforma',
    tagline: 'Estudo de reforma de um sobrado de 1952. A prancha da planta baixa e o que se mostra, porque a obra ainda nao comecou.',
    problem: 'Sobrado geminado de 1952 com planta original de tres quartos minusculos, escada em caracol no meio da casa e nenhum levantamento existente.',
    solution: 'Partido: o levantamento cadastral virou o proprio produto. A planta baixa redesenhada mostra o que fica, o que cai e o que vira, e e ela que a familia leva para o orcamento com o construtor.',
    features: [
      'Area: 148 m2 em dois pavimentos',
      'Programa proposto: 2 suites, estar integrado, cozinha ampliada, lavabo',
      'Localizacao: Juveve, Curitiba, PR',
      'Levantamento cadastral completo do existente',
      'Planta baixa, cortes e planta de demolir e construir',
      'Etapa: estudo preliminar entregue, obra nao iniciada',
    ],
    stack: ['Levantamento cadastral', 'Planta de demolir e construir', 'Corte e elevacao'],
    ano: '2025',
    groups: ['Reforma'],
    fit: 'contain',
    cliente: null,
  },
];

const cadastrarProjeto = async (p, i) => {
  log(`\n-- projeto ${i + 1}/6: ${p.name}`);
  await abrir('projetos');
  await pagina.click('[data-adicionar]');
  await pagina.waitForSelector('#ed-name', { timeout: 15000 });
  await esperar(700);
  await abrirTudo();
  await esperar(300);

  await subirImagem('image', `${MIDIA}/${p.arquivo}`);
  await abrirTudo();
  await escrever('name', p.name);
  await escrever('category', p.category);
  await escrever('tagline', p.tagline);
  await escrever('problem', p.problem);
  await escrever('solution', p.solution);
  await escrever('features', p.features.join('\n'));
  if (p.cliente) {
    await ligarSwitch('tem_cliente', true);
    await escrever('client', p.cliente);
  }
  await selecionar('year', p.ano);
  await chips('stack', p.stack);
  await chips('groups', p.groups);
  await selecionar('image_fit', p.fit);
  if (i === 0) await foto('04-projeto-1-preenchido', true);
  if (i === 5) await foto('05-projeto-6-planta-baixa', true);
  const ok = await salvar(`projeto ${p.name}`);
  if (!ok) await fecharGaveta();
  await fecharGaveta();
};

// Quantos ja existem, para o script poder ser rodado de novo sem duplicar.
let jaTem = 0;
try {
  await abrir('projetos');
  jaTem = await pagina.locator('#ed-gaveta .ed-lista-item').count();
  log(`   projetos ja cadastrados: ${jaTem}`);
  await fecharGaveta();
} catch { await fecharGaveta(); }

for (let i = jaTem; i < PROJETOS.length; i += 1) {
  try { await cadastrarProjeto(PROJETOS[i], i); }
  catch (e) { log(`   !! projeto ${i + 1} falhou: ${String(e).slice(0, 300)}`); await fecharGaveta(); await fecharGaveta(); }
}

// ============================================================ 4. EXPERIENCIAS
log(`\n\n${cron()} ===== 4. QUATRO EXPERIENCIAS =====`);
const EXPERIENCIAS = [
  {
    kind: 'work', org: 'Estudio Kuroda Arquitetura', role: 'Arquiteta titular',
    inicio: '03/2018', atual: true, local: 'Curitiba, PR',
    highlights: [
      '34 projetos entregues entre residencias, reformas e comerciais',
      'Do estudo de partido ao as built, com acompanhamento de obra proprio',
      'Aprovacao em prefeitura, corpo de bombeiros e orgao de patrimonio',
      'Equipe de tres arquitetas e um estagiario',
    ],
    note: 'Abri o estudio em 2018 depois de seis anos de escritorio grande. A escolha foi trabalhar com poucos projetos por ano e acompanhar obra de verdade, que e onde o projeto vira ou nao vira.',
  },
  {
    kind: 'work', org: 'Oficina Patio Arquitetura', role: 'Arquiteta plena',
    inicio: '2015', fim: '02/2018', local: 'Curitiba, PR',
    highlights: [
      'Coordenacao de projeto executivo de tres edificios residenciais',
      'Compatibilizacao com estrutural, hidraulica e eletrica',
      'Detalhamento de fachada em painel de concreto pre moldado',
    ],
    note: 'Foi onde aprendi executivo de verdade, que e o que separa desenho bonito de obra que sai do papel.',
  },
  {
    kind: 'work', org: 'Bordo Arquitetura e Interiores', role: 'Arquiteta junior',
    inicio: '2012', fim: '2015', local: 'Sao Paulo, SP',
    highlights: [
      'Projeto de interiores residencial e corporativo',
      'Detalhamento de marcenaria sob medida',
      'Maquete fisica e maquete eletronica de apresentacao',
    ],
    note: 'Tres anos de interiores em Sao Paulo, com muita marcenaria e muito cliente presente na obra.',
  },
  {
    kind: 'education', org: 'FAU USP', role: 'Bacharelado em Arquitetura e Urbanismo',
    inicio: '2007', fim: '2012', local: 'Sao Paulo, SP',
    highlights: [
      'Trabalho final de graduacao em habitacao social de interesse coletivo',
      'Monitoria de Projeto 3, atelie de habitacao',
      'Intercambio de um semestre na ETSAB, Barcelona',
    ],
    note: 'A FAU e onde aprendi que partido nao e estilo, e a resposta a uma pergunta que o terreno faz.',
  },
];

const cadastrarExperiencia = async (x, i) => {
  log(`\n-- experiencia ${i + 1}/4: ${x.org}`);
  await abrir('experiencias');
  await pagina.click('[data-adicionar]');
  await pagina.waitForSelector('#ed-org', { timeout: 15000 });
  await esperar(700);
  if (x.kind === 'education') {
    await pagina.click('[data-escolha="kind"][data-valor="education"]');
    await esperar(800);
  }
  await abrirTudo();
  await esperar(300);
  await escrever('org', x.org);
  await escrever('role', x.role);
  await escrever('period_start', x.inicio);
  if (x.atual) { await ligarSwitch('atual', true); }
  else { await escrever('period_end', x.fim); }
  await abrirTudo();
  await escrever('location', x.local);
  await escrever('highlights', x.highlights.join('\n'));
  await escrever('note', x.note);
  if (i === 3) await foto('06-experiencia-fau', true);
  const ok = await salvar(`experiencia ${x.org}`);
  if (!ok) await fecharGaveta();
  await fecharGaveta();
};

let jaExp = 0;
try {
  await abrir('experiencias');
  jaExp = await pagina.locator('#ed-gaveta .ed-lista-item').count();
  log(`   experiencias ja cadastradas: ${jaExp}`);
  await fecharGaveta();
} catch { await fecharGaveta(); }

for (let i = jaExp; i < EXPERIENCIAS.length; i += 1) {
  try { await cadastrarExperiencia(EXPERIENCIAS[i], i); }
  catch (e) { log(`   !! experiencia ${i + 1} falhou: ${String(e).slice(0, 300)}`); await fecharGaveta(); await fecharGaveta(); }
}

// ============================================================ 5. O TESTE DO TEMA CLARO
log(`\n\n${cron()} ===== 5. TENTATIVA DE DEIXAR A PAGINA CLARA =====`);
try {
  await abrir('perfil');
  const estado = await pagina.evaluate(() => {
    const ler = (k) => {
      const f = document.querySelector(`[data-campo="${k}"]`);
      if (!f) return { existe: false };
      const inp = f.querySelector('input');
      return { existe: true, tipo: inp?.type, valor: inp?.value, desabilitado: Boolean(inp?.disabled), cadeado: Boolean(f.querySelector('.ed-lock')) };
    };
    return { theme_accent: ler('theme_accent'), theme_plate_bg: ler('theme_plate_bg'), cta_label: ler('cta_label') };
  });
  log('   estado dos campos de cor:', JSON.stringify(estado, null, 2));

  // Tentativa 1: mexer no seletor como a Helena mexeria (clique e digitacao).
  const tentativa = await pagina.evaluate(() => {
    const inp = document.querySelector('[data-campo="theme_accent"] input[type=color]');
    if (!inp) return 'campo nao existe';
    if (inp.disabled) return 'input DESABILITADO: o clique nao abre o seletor de cor do sistema';
    inp.value = '#E8DFD3';
    inp.dispatchEvent(new Event('input', { bubbles: true }));
    return `aceitou, valor agora ${inp.value}`;
  });
  log('   tentativa de por um bege claro na cor de destaque:', tentativa);

  const tentativa2 = await pagina.evaluate(() => {
    const inp = document.querySelector('[data-campo="theme_plate_bg"] input[type=color]');
    if (!inp) return 'campo nao existe';
    if (inp.disabled) return 'input DESABILITADO';
    inp.value = '#F4F1EC';
    inp.dispatchEvent(new Event('input', { bubbles: true }));
    return `aceitou, valor agora ${inp.value}`;
  });
  log('   tentativa de por um off white no fundo das placas:', tentativa2);

  // O que o produto pinta de fato: o fundo real do documento.
  const fundo = await pagina.evaluate(() => {
    const cs = getComputedStyle(document.body);
    const html = getComputedStyle(document.documentElement);
    return { bodyBg: cs.backgroundColor, bodyColor: cs.color, htmlBg: html.backgroundColor };
  });
  log('   fundo computado do documento do editor:', JSON.stringify(fundo));
  await foto('07-ajustes-finos-cadeados', true);
  await fecharGaveta();
} catch (e) { log('   !! teste de tema falhou:', String(e).slice(0, 300)); await fecharGaveta(); }

// A cor de placa de UM projeto tambem e paga. Registrar o estado dela.
try {
  await abrir('projetos');
  await pagina.click('.ed-lista-item .ed-lista-editar');
  await esperar(1200);
  await abrirTudo();
  await esperar(300);
  const est = await pagina.evaluate(() => {
    const f = document.querySelector('[data-campo="plate_bg"]');
    const inp = f?.querySelector('input');
    return f ? { valor: inp?.value, desabilitado: Boolean(inp?.disabled), cadeado: Boolean(f.querySelector('.ed-lock')) } : null;
  });
  log('   plate_bg do primeiro projeto:', JSON.stringify(est));
  await fecharGaveta(); await fecharGaveta();
} catch (e) { log('   !! plate_bg falhou:', String(e).slice(0, 200)); await fecharGaveta(); await fecharGaveta(); }

// ============================================================ 6. O CANVAS COMO VISITANTE
log(`\n\n${cron()} ===== 6. A PAGINA COMO O VISITANTE VE =====`);
try {
  await pagina.click('[data-ver-visitante]');
  await esperar(1500);
  await foto('08-como-visitante-topo');
  await foto('09-como-visitante-inteiro', true);
  const texto = await pagina.evaluate(() => document.body.innerText);
  log('   texto da pagina (primeiros 2500):');
  log(texto.slice(0, 2500).split('\n').map((l) => '   | ' + l).join('\n'));
  await pagina.keyboard.press('v').catch(() => {});
  await esperar(800);
} catch (e) { log('   !! ver como visitante falhou:', String(e).slice(0, 200)); }

// ============================================================ 7. PUBLICAR
log(`\n\n${cron()} ===== 7. PUBLICAR =====`);
let urlPrevia = '';
try {
  await abrir('publicar');
  const check = await pagina.evaluate(() => document.querySelector('#ed-gaveta')?.innerText || '');
  log('   checklist antes de publicar:');
  log(check.split('\n').map((l) => '   | ' + l).join('\n'));
  await foto('10-publicar-checklist', true);

  await pagina.click('[data-girar-previa]').catch(() => {});
  await esperar(2500);
  urlPrevia = await pagina.inputValue('[data-previa-url]').catch(() => '');
  log('   link de previa:', urlPrevia || '(nao gerou)');

  const btn = pagina.locator('[data-publicar]');
  const travado = await btn.isDisabled();
  log('   botao Publicar desabilitado?', travado);
  if (!travado) {
    await btn.click();
    await esperar(6000);
    const depois = await pagina.evaluate(() => document.querySelector('#ed-gaveta')?.innerText || '');
    log('   resposta da publicacao:');
    log(depois.split('\n').map((l) => '   | ' + l).join('\n'));
    await foto('11-publicado', true);
  }
  await fecharGaveta();
} catch (e) { log('   !! publicar falhou:', String(e).slice(0, 300)); await fecharGaveta(); }

// ============================================================ 8. A PAGINA PUBLICADA
log(`\n\n${cron()} ===== 8. A PAGINA NO AR =====`);
const URL_PUBLICA = `https://${demo.slug}.myportifolio.com.br/`;
const olhar = async (url, nome) => {
  if (!url) return;
  const p2 = await pagina.context().newPage();
  try {
    const r = await p2.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
    log(`   ${url} respondeu ${r?.status()}`);
    await esperar(2500);
    await p2.screenshot({ path: `out/arq-${nome}.png`, fullPage: false });
    await p2.screenshot({ path: `out/arq-${nome}-inteiro.png`, fullPage: true });
    const fundo = await p2.evaluate(() => {
      const b = getComputedStyle(document.body);
      const cards = [...document.querySelectorAll('.project-card')].slice(0, 6).map((c) => {
        const placa = c.querySelector('[style*="background-color"]');
        return placa ? placa.getAttribute('style') : '(sem placa)';
      });
      return { bodyBg: b.backgroundColor, bodyColor: b.color, htmlBg: getComputedStyle(document.documentElement).backgroundColor, placas: cards };
    });
    log(`   cores da pagina publicada: ${JSON.stringify(fundo)}`);
    const txt = await p2.evaluate(() => document.body.innerText);
    log(`   texto (${txt.length} chars), primeiros 1800:`);
    log(txt.slice(0, 1800).split('\n').map((l) => '   | ' + l).join('\n'));
  } catch (e) { log(`   !! ${url} falhou: ${String(e).slice(0, 250)}`); }
  await p2.close();
};

await olhar(urlPrevia, '12-previa');
await olhar(URL_PUBLICA, '13-publica');

// ============================================================ ERROS
log(`\n\n${cron()} ===== ERROS DE CONSOLE E REDE =====`);
log(erros.length ? [...new Set(erros)].join('\n') : '   (nenhum)');
log(`\nTEMPO TOTAL: ${Math.round((Date.now() - t0) / 1000)}s`);

salvarLog();
console.log('\n>>> log em out/arq-log.txt');
await navegador.close();
