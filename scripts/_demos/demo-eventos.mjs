// Agente de nicho: Clarice Bonfim, cerimonialista de casamentos em BH (slug demo-eventos).
//
// A hipotese que esta persona existe para quebrar: O QUE VENDE E PROVA SOCIAL. Cerimonialista
// nao e contratada por portfolio bonito, e contratada porque a amiga da noiva disse "a Clarice
// salvou o meu casamento". Os dois dados que fecham contrato sao o DEPOIMENTO da noiva e a
// DATA do evento, e o template nao tem nem secao de depoimento nem campo de data por trabalho:
// tem um seletor de ANO.
//
// Uso:
//   node scripts/_demos/demo-eventos.mjs               (tudo)
//   node scripts/_demos/demo-eventos.mjs perfil        (limpar-kit|perfil|pagina|censo|
//                                                       depoimento|projetos|experiencias|
//                                                       secoes|publicar|ler|previa)
import { abrirEditor, esperar } from './base.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ETAPA = process.argv[2] || 'tudo';
const fazer = (n) => ETAPA === 'tudo' || ETAPA === n;
const MIDIA = path.resolve('out/midia/demo-eventos');
const m = (f) => path.join(MIDIA, f);
const G = '#ed-gaveta';

const atrito = [];
const nota = (nivel, texto) => { atrito.push(`[${nivel}] ${texto}`); console.log(`  ! ${nivel}: ${texto}`); };
const cortes = [];

await mkdir('out', { recursive: true });
const t0 = Date.now();
const { pagina, navegador, demo, erros, APEX } = await abrirEditor('demo-eventos', { headless: true });
console.log(`editor aberto para ${demo.nome} (${demo.slug})`);

// ---------------------------------------------------------------- utilitarios
const tiro = async (nome, inteiro = false) => {
  try { await pagina.screenshot({ path: `out/eventos-${nome}.png`, fullPage: inteiro }); } catch {}
};
const textoGaveta = () => pagina.evaluate(() => document.querySelector('#ed-gaveta')?.innerText || '(sem gaveta)');

// A barra do topo fica VISIVEL com a gaveta aberta, e nao clicavel: a gaveta cobre o clique.
// Sem o Escape antes, todo salto de painel vira timeout de 30s. Isso e atrito, nao helper.
let bloqueiosDeBarra = 0;
async function abrirPainelPor(chave) {
  const aberta = await pagina.evaluate(() => document.querySelector('#ed-gaveta')?.classList.contains('is-open'));
  if (aberta) { bloqueiosDeBarra++; await pagina.keyboard.press('Escape'); await esperar(900); }
  await pagina.click(`[data-abrir="${chave}"]`);
  // A lista chega por rede. 1,4s nao basta em conexao lenta, e o painel abre vazio.
  for (let i = 0; i < 20; i++) {
    await esperar(500);
    const pronto = await pagina.evaluate(() => {
      const g = document.querySelector('#ed-gaveta');
      if (!g || !g.classList.contains('is-open')) return false;
      return Boolean(g.querySelector('.ed-lista, .ed-field, [data-publicar], [data-secao]'));
    });
    if (pronto) { await esperar(500); return; }
  }
  nota('ATRITO', `painel "${chave}" não terminou de carregar em 10s`);
}
async function abrirTodosOsPassos() {
  await pagina.evaluate(() => { document.querySelectorAll('#ed-gaveta details').forEach((d) => { d.open = true; }); });
  await esperar(300);
}
async function preencher(key, valor) {
  const sel = `${G} [data-campo="${key}"] input:not([type=file]), ${G} [data-campo="${key}"] textarea`;
  const el = pagina.locator(sel).first();
  if (!(await el.count())) { nota('AUSENTE', `campo "${key}" nao existe no formulario`); return false; }
  if (await el.isDisabled()) { nota('BLOQUEADO', `campo "${key}" veio desabilitado (cadeado)`); return false; }
  const max = Number(await el.getAttribute('maxlength')) || 0;
  if (max && String(valor).length > max) {
    nota('TRUNCADO', `"${key}" aceita ${max} e eu quis escrever ${String(valor).length}: "${String(valor).slice(0, 60)}..."`);
  }
  await el.fill(String(valor));
  await esperar(120);
  return true;
}
async function selecionar(key, valor) {
  const el = pagina.locator(`${G} [data-campo="${key}"] select`).first();
  if (!(await el.count())) { nota('AUSENTE', `select "${key}" nao existe`); return false; }
  await el.selectOption(String(valor));
  await esperar(250);
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
    await esperar(300);
  }
}
async function limparChips(key) {
  for (let i = 0; i < 30; i++) {
    const x = pagina.locator(`${G} [data-chips="${key}"] [data-chip-remover]`).first();
    if (!(await x.count())) break;
    await x.click();
    await esperar(400);
    await abrirTodosOsPassos();
  }
}
async function escolherBotao(key, valor) {
  const el = pagina.locator(`${G} [data-escolha="${key}"][data-valor="${valor}"]`).first();
  if (!(await el.count())) { nota('AUSENTE', `botao "${key}=${valor}" nao existe`); return false; }
  await el.click();
  await esperar(500);
  return true;
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
      console.log(`    imagem ${key}: ${origem} -> ${r.w}x${r.h}`);
      if (rotuloCorte) cortes.push({ peca: rotuloCorte, arquivo, entrada: origem, saida: `${r.w}x${r.h}`, url: r.url });
      return r;
    }
    if (r.erro && !/convertendo|enviando/i.test(r.erro)) { nota('ERRO-UPLOAD', `"${key}" com ${arquivo}: ${r.erro}`); return null; }
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
const listaAtual = () => pagina.evaluate(() =>
  [...document.querySelectorAll('#ed-gaveta .ed-lista-titulo')].map((e) => e.textContent.trim()));

// ------------------------------------------------------------------- conteudo
const BIO = [
  'Sou cerimonialista há doze anos e já conduzi mais de duzentos casamentos em Belo Horizonte, na Serra do Cipó e no interior de Minas.',
  'Meu trabalho começa muito antes do dia: escolho fornecedor junto com você, monto o cronograma minuto a minuto e visito o espaço quantas vezes for preciso.',
  'No dia, eu fico onde ninguém me vê. Se der problema, e sempre dá algum, o problema é meu, e você só fica sabendo depois, rindo.',
  'Não pego mais de um casamento por fim de semana. A noiva que me contrata merece a minha atenção inteira, e não um terço dela.',
  'Se você chegou até aqui pelo casamento de uma amiga, me chama no WhatsApp e me conta a data. A gente conversa sem compromisso.',
].join(' ');

const SOCIAIS = [
  'Instagram | @clarice.cerimonial | https://instagram.com/clarice.cerimonial',
  'WhatsApp | (31) 98844-2170 | https://wa.me/5531988442170',
].join('\n');

const NUMEROS = [
  'Casamentos assinados | 214',
  'Anos de estrada | 12',
  'Casamento por fim de semana | 1',
  'Noivas que indicaram | 9 em 10',
].join('\n');

const ESPECIALIDADES = [
  'Assessoria completa', 'Cerimonial do dia', 'Casamento no campo', 'Mini wedding',
  'Curadoria de fornecedores', 'Cronograma minuto a minuto', 'Protocolo de cerimônia',
  'Casamento religioso', 'Bodas e renovação de votos',
];

// Os seis casamentos. `data` e a informacao que a profissao inteira usa para se organizar e
// que o produto NAO tem campo: aqui ela e enfiada no `highlight`, que e um campo de preco.
// `depoimento` e a fala da noiva, que tambem nao tem campo: cada trabalho testa um esconderijo
// diferente, e o relatorio compara os quatro.
const CASAMENTOS = [
  {
    slug: 'ev1', name: 'Marina e Tiago, na Serra do Cipó', category: 'Casamento no campo',
    data: '12 de outubro de 2025', convidados: '180 convidados', year: '2025',
    cliente: 'Marina e Tiago',
    tagline: 'Casamento de fim de tarde na serra, com cerimônia ao ar livre e festa debaixo de tenda até as quatro da manhã.',
    problema: 'A Marina mora em São Paulo e escolheu casar a trezentos quilômetros de casa, num espaço sem estrutura de cozinha e com acesso por estrada de terra. Faltavam sete meses e ela não tinha nenhum fornecedor fechado. A maior dor dela era logística: como colocar cento e oitenta pessoas na serra, alimentadas, sem chuva estragar tudo.',
    solucao: 'Fechei doze fornecedores em quatro meses, subi à serra seis vezes e montei um plano B inteiro debaixo de tenda, com gerador próprio. Choveu das dezesseis às dezessete e ninguém percebeu, porque o coquetel já estava previsto para acontecer coberto.',
    depoimento: '"A Clarice salvou o meu casamento. Choveu na hora exata da cerimônia e eu só descobri que tinha chovido quando vi as fotos. Ela tinha um plano B que eu nem sabia que existia." Marina Rezende, noiva',
    ondeODepoimento: 'features (última linha da lista)',
    incluso: [
      'Assessoria desde a escolha do espaço, sete meses antes',
      'Curadoria e negociação de doze fornecedores',
      'Seis visitas técnicas ao espaço, incluindo uma em dia de chuva',
      'Cronograma minuto a minuto entregue aos noivos e a cada fornecedor',
      'Equipe de quatro pessoas no dia, das oito da manhã às quatro da manhã',
    ],
    fornecedores: ['Buffet Terra Mineira', 'Flores da Serra', 'Banda Casa Cheia', 'Fotografia Duo Vera', 'Tenda Norte'],
    grupos: ['Campo', 'Destination'],
    capa: 'ev1-capa.jpg', galeria: ['ev1-g1.jpg', 'ev1-g2.jpg', 'ev1-g3.jpg', 'ev1-g4.jpg', 'ev1-g5.jpg'],
  },
  {
    slug: 'ev2', name: 'Júlia e Rafael, Igreja São José', category: 'Casamento religioso',
    data: '22 de março de 2025', convidados: '240 convidados', year: '2025',
    cliente: 'Júlia e Rafael',
    tagline: 'Cerimônia religiosa no centro de Belo Horizonte e recepção a oito minutos dali, com duzentos e quarenta convidados.',
    problema: 'Casamento na igreja com missa completa, coral, e uma família grande dos dois lados que não se falava desde 2019. Havia protocolo de cerimônia a respeitar e uma mesa de pais que precisava ser desenhada com cuidado cirúrgico.',
    solucao: 'Cuidei do protocolo com a paróquia, ensaiei a entrada duas vezes com os padrinhos e montei a planta do salão de forma que as duas famílias se cumprimentassem no coquetel e sentassem longe no jantar. Elas voltaram a se falar na pista.',
    depoimento: '"Eu contratei a Clarice pela organização e ganhei uma amiga. Ela apaziguou a minha família inteira sem que ninguém percebesse que estava sendo apaziguado." Júlia Andrade, noiva',
    ondeODepoimento: 'solution (parágrafo final de "Como foi o dia")',
    incluso: [
      'Alinhamento de protocolo com a paróquia e o coral',
      'Dois ensaios de entrada com padrinhos e daminhas',
      'Planta do salão e mapa de mesas com 240 lugares',
      'Coordenação do traslado igreja e recepção',
    ],
    fornecedores: ['Espaço Casa Charlô', 'Coral Santa Cecília', 'Doces da Sônia', 'Fotografia Duo Vera'],
    grupos: ['Religioso', 'Cidade'],
    capa: 'ev2-capa.jpg', galeria: ['ev2-g1.jpg', 'ev2-g2.jpg', 'ev2-g3.jpg', 'ev2-g4.jpg', 'ev2-g5.jpg'],
  },
  {
    slug: 'ev3', name: 'Bruna e Otávio, mini wedding', category: 'Mini wedding',
    data: '8 de junho de 2024', convidados: '40 convidados', year: '2024',
    cliente: 'Bruna e Otávio',
    tagline: 'Quarenta convidados, jantar posto, uma mesa só. O casamento mais silencioso e mais emocionante que já assinei.',
    problema: 'Os dois queriam casar em três meses, com orçamento fechado e sem festa. A dificuldade não foi montar: foi convencer as duas mães de que quarenta pessoas era o número certo.',
    solucao: 'Desenhei um jantar de mesa única para quarenta lugares, com a cerimônia acontecendo na cabeceira. Cortei tudo que era decoração e coloquei o dinheiro em comida e vinho, que era o que eles queriam de verdade.',
    depoimento: '"Eu tinha medo de que casamento pequeno parecesse casamento pobre. A Clarice provou o contrário e eu recomendo ela para toda amiga minha que está noiva." Bruna Nogueira, noiva',
    ondeODepoimento: 'tagline (a frase do card)',
    incluso: [
      'Projeto de mesa única para 40 lugares',
      'Curadoria de carta de vinhos com o sommelier da casa',
      'Cerimônia civil com juiz de paz no próprio salão',
    ],
    fornecedores: ['Restaurante Sagarana', 'Flores da Serra', 'Fotografia Duo Vera'],
    grupos: ['Mini wedding', 'Cidade'],
    capa: 'ev3-capa.jpg', galeria: ['ev3-g1.jpg', 'ev3-g2.jpg', 'ev3-g3.jpg', 'ev3-g4.jpg', 'ev3-g5.jpg'],
  },
  {
    slug: 'ev4', name: 'Larissa e Diego, em Tiradentes', category: 'Destination wedding',
    data: '15 de novembro de 2024', convidados: '120 convidados', year: '2024',
    cliente: 'Larissa e Diego',
    tagline: 'Três dias de programação em Tiradentes, com welcome dinner na sexta, casamento no sábado e café da roça no domingo.',
    problema: 'Casamento de três dias fora da cidade, com cento e vinte convidados vindos de quatro estados. O desafio era hospedagem, transporte e manter todo mundo entretido nos intervalos.',
    solucao: 'Bloqueei quatro pousadas, montei uma van a cada duas horas entre o centro e o espaço, e escrevi um guia de fim de semana que foi entregue no check-in de cada convidado. Ninguém se perdeu e ninguém ficou sem o que fazer.',
    depoimento: '"Meus padrinhos ainda falam do fim de semana em Tiradentes. A Clarice organizou três dias inteiros como se fosse um casamento só." Larissa Coelho, noiva',
    ondeODepoimento: 'solution (parágrafo final)',
    incluso: [
      'Bloqueio de 4 pousadas e gestão das reservas dos convidados',
      'Transporte com van a cada duas horas nos três dias',
      'Welcome dinner na sexta e café da roça no domingo',
      'Guia de fim de semana impresso, entregue no check-in',
    ],
    fornecedores: ['Pousada Villa Alferes', 'Buffet Terra Mineira', 'Banda Casa Cheia'],
    grupos: ['Destination', 'Campo'],
    capa: 'ev4-capa.jpg', galeria: ['ev4-g1.jpg', 'ev4-g2.jpg', 'ev4-g3.jpg', 'ev4-g4.jpg', 'ev4-g5.jpg'],
  },
  {
    slug: 'ev5', name: 'Camila e Pedro, em Nova Lima', category: 'Casamento em casa',
    data: '3 de maio de 2025', convidados: '90 convidados', year: '2025',
    cliente: 'Camila e Pedro',
    tagline: 'Casamento no quintal da casa dos pais da noiva, com noventa convidados e uma piscina que virou o centro da festa.',
    problema: 'Casar em casa parece barato e simples, e é o contrário das duas coisas. Não havia banheiro suficiente, nem energia para a cozinha, nem estacionamento para noventa carros.',
    solucao: 'Trouxe estrutura para tudo: banheiro modular, gerador, e um acordo com o clube da esquina para o estacionamento. A casa dos pais dela continuou sendo a casa dos pais dela no domingo de manhã.',
    depoimento: '"Minha mãe chorou quando viu a casa no dia seguinte, intacta. A Clarice devolveu tudo no lugar." Camila Prado, noiva',
    ondeODepoimento: 'note do link (link_note)',
    incluso: [
      'Levantamento de estrutura: energia, água e banheiros',
      'Locação de gerador, banheiro modular e cobertura da piscina',
      'Acordo de estacionamento com o clube vizinho',
      'Desmontagem completa no domingo de manhã',
    ],
    fornecedores: ['Estruturas BH', 'Buffet Terra Mineira', 'DJ Rangel'],
    grupos: ['Cidade', 'Casamento em casa'],
    capa: 'ev5-capa.jpg', galeria: ['ev5-g1.jpg', 'ev5-g2.jpg', 'ev5-g3.jpg', 'ev5-g4.jpg', 'ev5-g5.jpg'],
  },
  {
    slug: 'ev6', name: 'Isabela e Gustavo, festa à noite', category: 'Casamento à noite',
    data: '7 de dezembro de 2024', convidados: '300 convidados', year: '2024',
    cliente: 'Isabela e Gustavo',
    tagline: 'Trezentos convidados, cerimônia às nove da noite e pista aberta até o amanhecer, com troca de roupa da noiva na virada.',
    problema: 'O maior casamento que assinei, e o de agenda mais apertada: cerimônia, jantar servido e pista tinham que caber entre nove da noite e cinco da manhã, sem a festa esfriar em nenhum momento.',
    solucao: 'Cortei o jantar em duas ondas, coloquei a valsa antes da sobremesa e combinei com a banda uma virada de vinte minutos para a troca de roupa. A pista não esvaziou uma vez.',
    depoimento: '"Trezentas pessoas e nenhuma fila. Até hoje meus amigos perguntam quem foi a cerimonialista." Isabela Martins, noiva',
    ondeODepoimento: 'solution (parágrafo final)',
    incluso: [
      'Cronograma de cerimônia, jantar e pista em oito horas',
      'Jantar servido em duas ondas para 300 lugares',
      'Coordenação de banda, DJ e troca de roupa da noiva',
      'Equipe de seis pessoas no dia',
    ],
    fornecedores: ['Espaço Casa Charlô', 'Banda Casa Cheia', 'DJ Rangel', 'Doces da Sônia'],
    grupos: ['Cidade', 'Grande porte'],
    capa: 'ev6-capa.jpg', galeria: ['ev6-g1.jpg', 'ev6-g2.jpg', 'ev6-g3.jpg', 'ev6-g4.jpg', 'ev6-g5.jpg'],
  },
];

const EXPERIENCIAS = [
  {
    kind: 'work', org: 'Clarice Bonfim Cerimonial', role: 'Cerimonialista e assessora',
    period_start: '2018', atual: true, location: 'Belo Horizonte, MG',
    highlights: [
      'Assessoria completa e cerimonial do dia, com equipe própria de até seis pessoas',
      'Um casamento por fim de semana, sem exceção, desde o primeiro ano',
      'Mais de cento e quarenta casamentos assinados com o meu nome na porta',
    ],
    note: 'Abri sozinha, com uma agenda de papel e o telefone da minha primeira noiva. Hoje nove em cada dez clientes chegam por indicação de outra noiva, e é disso que eu tenho mais orgulho.',
  },
  {
    kind: 'work', org: 'Espaço Villa Bella', role: 'Coordenadora de eventos',
    period_start: '2014', period_end: '2018', atual: false, location: 'Nova Lima, MG',
    highlights: [
      'Coordenação de agenda de um espaço com setenta eventos por ano',
      'Aprendi a ler contrato de fornecedor e a negociar prazo de montagem',
      'Foi ali que entendi que o problema de casamento nunca é o que a noiva imagina',
    ],
    note: 'Quatro anos vendo casamento do lado de dentro da casa. Se eu não tivesse passado por aqui, não saberia a diferença entre um espaço que promete e um espaço que entrega.',
  },
  {
    kind: 'education', org: 'Instituto Brasileiro de Cerimonial', role: 'Cerimonial e protocolo',
    period_start: '2013', period_end: '2013', atual: false, location: 'Belo Horizonte, MG',
    highlights: [
      'Protocolo de cerimônia religiosa católica, evangélica e civil',
      'Ordem de entrada, mesa de pais e precedência de padrinhos',
    ],
    note: 'Curso curto, mas é de onde vem tudo que eu sei sobre ordem de entrada. Protocolo errado é o tipo de erro que a família inteira percebe e ninguém esquece.',
  },
];

// ------------------------------------------------------- DESFAZER O KIT ERRADO
if (fazer('limpar-kit')) {
  console.log('\n== DESFAZER O KIT DE CONFEITARIA ==');
  const tLimpar = Date.now();

  // 1. O projeto de exemplo ("Bolo de casamento de três andares").
  await abrirPainelPor('projetos');
  const projetos = await listaAtual();
  console.log(`  projetos herdados do kit: ${projetos.join(' / ') || '(nenhum)'}`);
  for (const nome of projetos) {
    if (!/bolo|exemplo/i.test(nome)) continue;
    await pagina.locator(`${G} .ed-lista-item`, { hasText: nome }).locator('[data-editar]').first().click();
    await esperar(1200);
    const apagar = pagina.locator('#ed-form-apagar');
    if (!(await apagar.count())) { nota('AUSENTE', `sem botão Apagar no projeto "${nome}"`); await pagina.keyboard.press('Escape'); continue; }
    await apagar.click(); await esperar(500);
    await apagar.click(); await esperar(3000);
    console.log(`  apagado: ${nome}`);
    await abrirPainelPor('projetos');
  }

  // 2. A experiencia de exemplo ("Curso de confeitaria / Escola Exemplo").
  await abrirPainelPor('experiencias');
  const exps = await pagina.evaluate(() =>
    [...document.querySelectorAll('#ed-gaveta .ed-lista-item')].map((e) => e.innerText.replace(/\n/g, ' ').trim()));
  console.log(`  experiências herdadas: ${exps.join(' / ') || '(nenhuma)'}`);
  for (const linha of exps) {
    if (!/exemplo|confeitaria/i.test(linha)) continue;
    await pagina.locator(`${G} .ed-lista-item`, { hasText: /Exemplo/i }).locator('[data-editar]').first().click();
    await esperar(1200);
    const apagar = pagina.locator('#ed-form-apagar');
    if (await apagar.count()) { await apagar.click(); await esperar(500); await apagar.click(); await esperar(3000); console.log('  apagada a experiência de exemplo'); }
    await abrirPainelPor('experiencias');
  }

  // 3. As quatro especialidades de confeitaria.
  await abrirPainelPor('perfil');
  await abrirTodosOsPassos();
  const antes = await pagina.evaluate(() =>
    [...document.querySelectorAll('#ed-gaveta [data-chips="stacks"] .ed-chip')].map((c) => c.innerText.replace('×', '').trim()));
  console.log(`  especialidades herdadas: ${antes.join(', ') || '(nenhuma)'}`);
  await limparChips('stacks');
  await salvar('limpeza das especialidades do kit');
  console.log(`  tempo para desfazer o kit: ${Math.round((Date.now() - tLimpar) / 1000)}s`);
}

// -------------------------------------------------------------------- PERFIL
if (fazer('perfil')) {
  console.log('\n== PERFIL ==');
  await abrirPainelPor('perfil');
  await abrirTodosOsPassos();
  await tiro('perfil-aberto', true);

  // Censo do formulario de perfil: e aqui que se procura onde caberia um depoimento.
  const censoPerfil = await pagina.evaluate(() => {
    const g = document.querySelector('#ed-gaveta');
    return [...g.querySelectorAll('.ed-field')].map((f) => ({
      key: f.dataset.campo || '',
      passo: f.closest('details')?.querySelector('.ed-passo-titulo')?.innerText.trim() || 'O básico (sempre aberto)',
      label: (f.querySelector('.ed-label')?.innerText || '').trim().replace(/\n/g, ' '),
      help: (f.querySelector('.ed-help')?.innerText || '').trim(),
      lock: Boolean(f.querySelector('.ed-lock')),
    }));
  });
  await writeFile('out/eventos-censo-perfil.txt',
    censoPerfil.map((c, i) => `${String(i + 1).padStart(2)}. <${c.passo}> ${c.lock ? '[CADEADO] ' : ''}${c.key} :: "${c.label}"${c.help ? ` :: ajuda="${c.help}"` : ''}`).join('\n'), 'utf8');
  console.log(`  ${censoPerfil.length} campos no perfil`);
  const cheiraDepoimento = censoPerfil.filter((c) => /depoim|testemun|cliente|avalia|indicac|recomend/i.test(`${c.key} ${c.label} ${c.help}`));
  console.log(`  campos que encostam em prova social: ${cheiraDepoimento.length ? cheiraDepoimento.map((c) => c.key).join(', ') : 'NENHUM'}`);

  await preencher('display_name', demo.nome);
  await preencher('role', demo.role);
  await preencher('bio', BIO);
  await preencher('badge_label', 'Cerimonialista');

  const icones = await pagina.evaluate(() =>
    [...document.querySelectorAll('#ed-gaveta [data-campo="badge_icon"] option')].map((o) => `${o.value}=${o.textContent.trim()}`));
  await writeFile('out/eventos-icones-selo.txt', icones.join('\n'), 'utf8');
  if (!icones.some((i) => /alianc|anel|ring|taca|champ|buque|casament|calendar|agenda/i.test(i))) {
    nota('BURACO', `nenhum dos ${icones.length - 1} ícones do selo diz casamento ou evento; o mais próximo é "Coração"`);
  }
  await selecionar('badge_icon', 'heart');

  await subirImagem('hero', 'hero.jpg', '1200x1800', 'perfil (hero 4:5)');
  await abrirTodosOsPassos();
  await subirImagem('avatar', 'avatar.jpg', '900x900');
  await abrirTodosOsPassos();

  const enq = pagina.locator(`${G} [data-enquadramento="hero_object_position"]`).first();
  if (await enq.count()) { await enq.fill('25'); await esperar(200); }

  await preencher('contact_email', 'contato@claricebonfim.com.br');
  await ligarSwitch('show_contact_email', true);
  await abrirTodosOsPassos();
  await preencher('cta_url', 'https://wa.me/5531988442170');
  const ctaLabel = pagina.locator(`${G} [data-campo="cta_label"] input`).first();
  if (await ctaLabel.count() && !(await ctaLabel.isDisabled())) await ctaLabel.fill('Me conta a sua data');
  else nota('PAGO', 'campo "Texto do botão" (cta_label) veio com cadeado');

  await preencher('socials', SOCIAIS);
  await preencher('stats', NUMEROS);

  await abrirTodosOsPassos();
  await chips('stacks', ESPECIALIDADES);
  await abrirTodosOsPassos();
  await ligarSwitch('show_online_dot', true);
  await abrirTodosOsPassos();
  await selecionar('projects_per_page', '6');
  await preencher('seo_title', 'Clarice Bonfim | Cerimonialista de casamentos em BH');
  await preencher('seo_description', 'Assessoria completa e cerimonial do dia para casamentos em Belo Horizonte, na Serra do Cipó e no interior de Minas. Um casamento por fim de semana.');

  await tiro('perfil-preenchido', true);
  await writeFile('out/eventos-perfil-gaveta.txt', await textoGaveta(), 'utf8');
  await salvar('perfil');
  await esperar(1500);
}

// --------------------------------------------------- A PÁGINA (rótulos, paleta, fundo)
if (fazer('pagina')) {
  console.log('\n== A PÁGINA: rótulos, paleta e fundo ==');
  await abrirPainelPor('perfil');
  await abrirTodosOsPassos();

  const ROTULOS = {
    rotulo_stacks: 'O que eu cuido',
    rotulo_projects: 'Casamentos que assinei',
    rotulo_cases: 'casamentos',
    rotulo_experience: 'Minha trajetória',
    rotulo_about: 'Prazer, sou a Clarice',
  };
  for (const [k, v] of Object.entries(ROTULOS)) { await preencher(k, v); await abrirTodosOsPassos(); }

  await selecionar('theme_preset', 'lavanda');
  await abrirTodosOsPassos();
  await selecionar('background_kind', 'brilho');
  await abrirTodosOsPassos();

  const FINOS = {
    rotulo_challenge: 'O sonho dos noivos',
    rotulo_solution: 'Como foi o dia',
    rotulo_features: 'O que estava incluso',
    rotulo_stackLabel: 'Fornecedores',
    rotulo_visit: 'Ver o álbum',
  };
  for (const [k, v] of Object.entries(FINOS)) { await preencher(k, v); await abrirTodosOsPassos(); }

  await tiro('pagina-rotulos', true);
  await salvar('rótulos, paleta e fundo');
  await esperar(1500);
  await pagina.keyboard.press('Escape');
  await esperar(1200);
  await tiro('canvas-com-rotulos', true);
}

// ---------------------------- CENSO DO FORMULÁRIO DE TRABALHO (a caça ao depoimento)
if (fazer('censo')) {
  console.log('\n== CENSO DE CAMPOS DE UM CASAMENTO ==');
  await abrirPainelPor('projetos');
  await pagina.locator(`${G} [data-adicionar]`).first().click();
  await esperar(1200);
  await abrirTodosOsPassos();
  const censo = await pagina.evaluate(() => {
    const g = document.querySelector('#ed-gaveta');
    return [...g.querySelectorAll('.ed-field')].map((f) => ({
      key: f.dataset.campo || '',
      passo: f.closest('details')?.querySelector('.ed-passo-titulo')?.innerText.trim() || 'O básico (sempre aberto)',
      label: (f.querySelector('.ed-label')?.innerText || '').trim().replace(/\n/g, ' '),
      help: (f.querySelector('.ed-help')?.innerText || '').trim(),
      max: f.querySelector('input,textarea')?.getAttribute('maxlength') || '',
      lock: Boolean(f.querySelector('.ed-lock')),
    }));
  });
  const linhas = censo.map((c, i) => `${String(i + 1).padStart(2)}. <${c.passo}> ${c.lock ? '[CADEADO] ' : ''}${c.key}${c.max ? `(${c.max})` : ''} :: "${c.label}"${c.help ? ` :: ajuda="${c.help}"` : ''}`);
  console.log(linhas.join('\n'));
  await writeFile('out/eventos-censo-projeto.txt', `${linhas.join('\n')}\n\nTOTAL VISIVEL: ${censo.length}\n`, 'utf8');

  const social = censo.filter((c) => /depoim|testemun|avalia|recomend|noiva|opini/i.test(`${c.key} ${c.label} ${c.help}`));
  console.log(`  campos de prova social no formulário de trabalho: ${social.length ? social.map((c) => c.key).join(', ') : 'NENHUM'}`);
  if (!social.length) nota('BURACO', 'nenhum dos campos do formulário de trabalho é de depoimento de cliente');

  const dataCampo = censo.filter((c) => /data|dia |quando|calend/i.test(`${c.key} ${c.label}`));
  console.log(`  campos de data: ${dataCampo.length ? dataCampo.map((c) => `${c.key} ("${c.label}")`).join(', ') : 'NENHUM (só o select de ano)'}`);
  const anos = await pagina.evaluate(() => [...document.querySelectorAll('#ed-gaveta [data-campo="year"] option')].map((o) => o.value));
  console.log(`  o seletor de ano oferece: ${anos.join(', ')}`);
  if (!dataCampo.some((c) => /^date|data_/.test(c.key))) nota('BURACO', `não existe campo de data do evento: só "Ano", um select com ${anos.length} opções`);

  await tiro('form-casamento', true);
  await pagina.keyboard.press('Escape');
  await esperar(900);
}

// ------------------------------------------------------------------ CASAMENTOS
if (fazer('projetos')) {
  console.log('\n== CASAMENTOS ==');
  await abrirPainelPor('projetos');
  const jaTem = await listaAtual();
  console.log(`  já cadastrados: ${jaTem.length ? jaTem.join(' / ') : '(nenhum)'}`);

  for (const c of CASAMENTOS) {
    if (jaTem.includes(c.name)) { console.log(`  pulando "${c.name}" (já existe)`); continue; }
    console.log(`  -> ${c.name} (${c.data})`);
    await pagina.locator(`${G} [data-adicionar]`).first().click();
    await esperar(1200);
    await abrirTodosOsPassos();

    await preencher('name', c.name);
    await preencher('category', c.category);

    // A DATA vai para "Preço, prazo ou condição", que e o unico campo curto que a grade mostra.
    await preencher('highlight', `${c.data} · ${c.convidados}`);

    // O DEPOIMENTO: cada casamento testa um esconderijo diferente.
    const tagline = c.ondeODepoimento.startsWith('tagline') ? `${c.tagline} ${c.depoimento}` : c.tagline;
    await preencher('tagline', tagline);

    await abrirTodosOsPassos();
    await preencher('problem', c.problema);
    const solucao = c.ondeODepoimento.startsWith('solution') ? `${c.solucao}\n\n${c.depoimento}` : c.solucao;
    await preencher('solution', solucao);
    const incluso = c.ondeODepoimento.startsWith('features') ? [...c.incluso, c.depoimento] : c.incluso;
    await preencher('features', incluso.join('\n'));

    await abrirTodosOsPassos();
    await selecionar('year', c.year);
    await abrirTodosOsPassos();
    await ligarSwitch('tem_cliente', true);
    await abrirTodosOsPassos();
    await preencher('client', c.cliente);
    await abrirTodosOsPassos();
    await chips('stack', c.fornecedores);
    await abrirTodosOsPassos();
    await chips('groups', c.grupos);
    await abrirTodosOsPassos();

    // O esconderijo do link_note: ele so nasce quando existe link, e casamento nao tem URL.
    if (c.ondeODepoimento.startsWith('note do link')) {
      await preencher('link', 'https://instagram.com/clarice.cerimonial');
      await abrirTodosOsPassos();
      const ok = await preencher('link_note', c.depoimento);
      if (!ok) nota('BURACO', `"${c.name}": link_note não aceitou o depoimento`);
    }

    // Projeto novo nasce com "Caber inteira, com respiro". Para foto de casamento isso e
    // moldura preta em volta de tudo, entao a escolha e "Preencher o card".
    await abrirTodosOsPassos();
    await selecionar('image_fit', 'cover');
    await abrirTodosOsPassos();
    await subirImagem('image', c.capa, '1400x?', c.name);
    await abrirTodosOsPassos();

    // GALERIA: os slots nascem um de cada vez, entao cada foto pede uma repintura.
    for (let i = 0; i < c.galeria.length; i++) {
      await abrirTodosOsPassos();
      const r = await subirImagem(`gallery_${i + 1}`, c.galeria[i], '1400x?');
      if (!r) { nota('ATRITO', `galeria de "${c.name}" parou na foto ${i + 1}`); break; }
    }
    await abrirTodosOsPassos();
    await salvar(c.name);
    await esperar(1500);
    if (!(await pagina.locator(`${G} [data-adicionar]`).count())) await abrirPainelPor('projetos');
    await esperar(700);
  }
  await pagina.keyboard.press('Escape');
  await esperar(1500);
  await pagina.screenshot({ path: 'out/eventos-grade.png', fullPage: true });
  await writeFile('out/eventos-cortes.json', JSON.stringify(cortes, null, 2), 'utf8');
}

// ------------------------------------------------------------- EXPERIÊNCIAS
if (fazer('experiencias')) {
  console.log('\n== EXPERIÊNCIA ==');
  await abrirPainelPor('experiencias');
  const jaTem = await pagina.evaluate(() =>
    [...document.querySelectorAll('#ed-gaveta .ed-lista-item')].map((e) => e.innerText.replace(/\n/g, ' ').trim()));

  for (const x of EXPERIENCIAS) {
    if (jaTem.some((s) => s.includes(x.org))) { console.log(`  pulando "${x.org}" (já existe)`); continue; }
    console.log(`  -> ${x.org}`);
    await pagina.locator(`${G} [data-adicionar]`).first().click();
    await esperar(1200);
    if (x.kind === 'education') await escolherBotao('kind', 'education');
    await abrirTodosOsPassos();
    await preencher('org', x.org);
    await preencher('role', x.role);
    await preencher('period_start', x.period_start);
    if (!x.atual) {
      await ligarSwitch('atual', false);
      await abrirTodosOsPassos();
      await preencher('period_end', x.period_end);
    } else await ligarSwitch('atual', true);
    await abrirTodosOsPassos();
    await preencher('location', x.location);
    await preencher('highlights', x.highlights.join('\n'));
    await abrirTodosOsPassos();
    await preencher('note', x.note);
    await abrirTodosOsPassos();
    await salvar(x.org);
    await esperar(1500);
    if (!(await pagina.locator(`${G} [data-adicionar]`).count())) await abrirPainelPor('experiencias');
    await esperar(700);
  }
  await pagina.keyboard.press('Escape');
  await esperar(1200);
}

// ------------------------------------------- A CAÇA AO DEPOIMENTO: painel de seções
if (fazer('secoes')) {
  console.log('\n== SEÇÕES: dá para criar uma seção de depoimentos? ==');
  await abrirPainelPor('secoes');
  const txt = await textoGaveta();
  console.log(txt);
  await writeFile('out/eventos-secoes.txt', txt, 'utf8');
  await tiro('secoes', true);
  const itens = await pagina.evaluate(() =>
    [...document.querySelectorAll('#ed-gaveta [data-secao]')].map((e) => e.dataset.secao));
  console.log(`  seções disponíveis: ${itens.join(', ')}`);
  const criar = await pagina.evaluate(() =>
    Boolean(document.querySelector('#ed-gaveta [data-adicionar], #ed-gaveta button[data-nova-secao]')));
  console.log(`  existe botão de criar seção nova: ${criar}`);
  if (!criar) nota('BURACO', `o painel Seções só reordena e esconde as três que existem (${itens.join(', ')}). Não há como criar uma seção de depoimentos.`);
  await pagina.keyboard.press('Escape');
  await esperar(900);
}

// ------------------------------------------------------------------ PUBLICAR
if (fazer('publicar')) {
  console.log('\n== PUBLICAR ==');
  await abrirPainelPor('publicar');
  await esperar(1000);
  const antes = await textoGaveta();
  await writeFile('out/eventos-publicar-antes.txt', antes, 'utf8');
  console.log(antes.slice(0, 1500));
  await tiro('publicar-antes', true);

  const btn = pagina.locator(`${G} [data-publicar]`).first();
  if (!(await btn.count())) nota('AUSENTE', 'botão Publicar');
  else if (await btn.isDisabled()) nota('BLOQUEIO', 'botão Publicar veio desabilitado');
  else {
    await btn.click();
    await esperar(10000);
    const depois = await textoGaveta();
    await writeFile('out/eventos-publicar-depois.txt', depois, 'utf8');
    console.log('--- depois ---');
    console.log(depois.slice(0, 1500));
    await tiro('publicar-depois', true);
  }
}

// ------------------------------------------------------------------- LEITURA
if (fazer('ler')) {
  console.log('\n== A PÁGINA COMO A NOIVA VÊ ==');
  await pagina.goto(`${APEX}/app?cb=${Date.now()}`, { waitUntil: 'networkidle' });
  await esperar(3000);
  const ver = pagina.locator('[data-abrir="ver-visitante"], button:has-text("Ver como visitante")').first();
  if (await ver.count()) { await ver.click(); await esperar(4500); }
  else nota('AUSENTE', 'botão "Ver como visitante"');
  await pagina.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 400) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 110)); }
    window.scrollTo(0, 0);
  });
  await esperar(2500);
  await pagina.screenshot({ path: 'out/eventos-visitante.png', fullPage: true });
  const visita = await pagina.evaluate(() => document.body.innerText);
  await writeFile('out/eventos-visitante.txt', visita, 'utf8');
  console.log(visita.slice(0, 3000));

  // O card de um casamento: onde a data e o depoimento foram parar.
  const card = pagina.locator('.project-card').first();
  if (await card.count()) {
    await card.click({ force: true });
    await esperar(3000);
    await pagina.screenshot({ path: 'out/eventos-janela-casamento.png', fullPage: true });
    const txt = await pagina.evaluate(() => {
      const m = [...document.querySelectorAll('div,section,dialog')]
        .find((e) => /fixed|modal/i.test(String(e.className)) && e.offsetHeight > 300);
      return m ? m.innerText : `(sem modal)\n${document.body.innerText.slice(0, 900)}`;
    });
    await writeFile('out/eventos-janela-casamento.txt', txt, 'utf8');
    console.log('\n--- a janela de um casamento ---');
    console.log(txt.slice(0, 2500));
    await pagina.keyboard.press('Escape');
    await esperar(1200);
  } else nota('AUSENTE', 'nenhum card de casamento na página pública');

  // Celular, que e de onde a noiva chega (link no Instagram).
  await pagina.setViewportSize({ width: 390, height: 844 });
  await esperar(2500);
  await pagina.screenshot({ path: 'out/eventos-visitante-celular.png', fullPage: true });
  await pagina.setViewportSize({ width: 1440, height: 900 });

  const r = await pagina.request.get(`https://${demo.slug}.myportifolio.com.br/`);
  console.log(`\nURL pública: HTTP ${r.status()}`);
  await writeFile('out/eventos-url-publica.txt', `HTTP ${r.status()}\n\n${(await r.text()).slice(0, 3000)}`, 'utf8');
}

if (fazer('previa')) {
  console.log('\n== PRÉVIA ==');
  await pagina.goto(`${APEX}/app?cb=${Date.now()}`, { waitUntil: 'networkidle' });
  await esperar(2500);
  await abrirPainelPor('publicar');
  await esperar(1000);
  const gerar = pagina.locator(`${G} button`, { hasText: /pr[ée]via/i }).first();
  if (await gerar.count()) { await gerar.click(); await esperar(6000); }
  const link = await pagina.evaluate(() => {
    const g = document.querySelector('#ed-gaveta');
    const a = [...g.querySelectorAll('a,input')].map((e) => e.value || e.href || '').find((v) => /previa|preview|token|\?p=/i.test(v));
    return a || g.innerText.match(/https?:\/\/\S+/)?.[0] || '';
  });
  console.log(`  link de prévia: ${link || '(não achei)'}`);
  if (link) {
    const p2 = await pagina.context().newPage();
    await p2.setViewportSize({ width: 1440, height: 900 });
    await p2.goto(link, { waitUntil: 'networkidle' });
    await esperar(3000);
    await p2.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 400) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 100)); }
      window.scrollTo(0, 0);
    });
    await esperar(2500);
    await p2.screenshot({ path: 'out/eventos-previa.png', fullPage: true });
    await writeFile('out/eventos-previa.txt', await p2.evaluate(() => document.body.innerText), 'utf8');
    const card = p2.locator('.project-card').first();
    if (await card.count()) {
      await card.click({ force: true });
      await esperar(2500);
      await p2.screenshot({ path: 'out/eventos-previa-janela.png', fullPage: true });
      await writeFile('out/eventos-previa-janela.txt', await p2.evaluate(() => document.body.innerText), 'utf8');
    }
    await p2.close();
  } else nota('ATRITO', 'não consegui capturar o link de prévia');
}

console.log('\n== ERROS DE CONSOLE E REDE ==');
console.log(erros.length ? [...new Set(erros)].join('\n') : '(nenhum)');
await writeFile('out/eventos-erros.txt', [...new Set(erros)].join('\n'), 'utf8');
console.log('\n== ATRITO COLETADO ==');
console.log(atrito.length ? atrito.join('\n') : '(nenhum)');
await writeFile('out/eventos-atrito.txt', atrito.join('\n'), 'utf8');
console.log(`\ntempo desta execução: ${Math.round((Date.now() - t0) / 1000)}s`);
console.log(`página: https://${demo.slug}.myportifolio.com.br`);

await navegador.close();
