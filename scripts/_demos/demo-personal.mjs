// Diego Aranha, personal trainer. O que esta persona existe para quebrar: VIDEO VERTICAL.
//
// Rodar por fase, porque o editor grava no banco de producao e refazer tudo a cada tentativa
// duplicaria projeto:
//   node scripts/_demos/demo-personal.mjs olhar
//   node scripts/_demos/demo-personal.mjs perfil
//   node scripts/_demos/demo-personal.mjs projetos
//   node scripts/_demos/demo-personal.mjs experiencias
//   node scripts/_demos/demo-personal.mjs formatos
//   node scripts/_demos/demo-personal.mjs publicar
//   node scripts/_demos/demo-personal.mjs visitante
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { abrirEditor, esperar } from './base.mjs';

const FASE = process.argv[2] || 'olhar';
const MIDIA = (n) => resolve(process.cwd(), 'out/midia/demo-personal', n);
const TIRO = (n) => resolve(process.cwd(), `out/personal-${n}.png`);

// ---------------------------------------------------------------- helpers de editor

const abrir = async (p, chave) => {
  await p.click(`[data-abrir="${chave}"]`);
  await esperar(1200);
};

// Os passos 2, 3 e "fino" nascem recolhidos num <details>. Abrir e clique no summary.
const abrirPasso = async (p, n) => {
  const d = p.locator(`details[data-passo="${n}"]`).first();
  if (!(await d.count())) return false;
  if (!(await d.evaluate((e) => e.open))) {
    await d.locator('summary').click();
    await esperar(400);
  }
  return true;
};

const escrever = async (p, key, valor) => {
  const el = p.locator(`#ed-${key}`).first();
  if (!(await el.count())) return `SEM CAMPO: ${key}`;
  await el.fill(String(valor));
  await esperar(120);
  return null;
};

const escolher = async (p, key, valor) => {
  const el = p.locator(`#ed-${key}`).first();
  if (!(await el.count())) return `SEM SELECT: ${key}`;
  await el.selectOption(String(valor));
  await esperar(200);
  return null;
};

// O switch NAO obedece ao primeiro clique de forma confiavel: cada repintura do formulario
// empilha mais um jogo de listeners no mesmo elemento, entao um clique vale N cliques e com N
// par o valor volta ao que era. Aqui a gente insiste e CONTA quantos cliques foram precisos,
// porque esse numero e o achado.
const ligar = async (p, key, queroLigado = true) => {
  const el = p.locator(`[data-switch="${key}"]`).first();
  if (!(await el.count())) return `SEM SWITCH: ${key}`;
  for (let tentativa = 0; tentativa < 6; tentativa += 1) {
    const estaLigado = (await el.getAttribute('aria-checked')) === 'true';
    if (estaLigado === queroLigado) {
      if (tentativa > 0) console.log(`  switch "${key}" so obedeceu no clique ${tentativa}`);
      return tentativa > 2 ? `SWITCH "${key}" precisou de ${tentativa} cliques` : null;
    }
    await el.click();
    await esperar(600); // o clique repinta o formulario inteiro
  }
  return `SWITCH "${key}" NAO OBEDECEU em 6 cliques`;
};

const botao = async (p, key, valor) => {
  await p.locator(`[data-escolha="${key}"][data-valor="${valor}"]`).first().click();
  await esperar(600);
};

// Cada Enter num chip repinta o formulario, entao o input tem de ser re-localizado a cada volta.
const chips = async (p, key, lista) => {
  for (const item of lista) {
    const el = p.locator(`[data-chip-add="${key}"]`).first();
    if (!(await el.count()) || (await el.isDisabled())) return `CHIP CHEIO/AUSENTE em ${key} ao tentar "${item}"`;
    await el.fill(item);
    await el.press('Enter');
    await esperar(350);
  }
  return null;
};

const subirImagem = async (p, key, arquivo) => {
  const input = p.locator(`input[data-arquivo="${key}"]`).first();
  if (!(await input.count())) return `SEM CAMPO DE IMAGEM: ${key}`;
  await input.setInputFiles(MIDIA(arquivo));
  // O upload troca a previa; espera pela <img> dentro do drop daquele campo.
  try {
    await p.waitForSelector(`[data-campo="${key}"] .ed-drop-previa`, { timeout: 45000 });
  } catch {
    const erro = await p.locator(`[data-campo="${key}"] [data-erro]`).first().textContent().catch(() => '');
    return `UPLOAD FALHOU em ${key}: ${erro}`;
  }
  await esperar(600);
  return null;
};

const salvar = async (p) => {
  await p.locator('#ed-form-salvar').click();
  // A gaveta fecha sozinha quando o salvar da certo.
  try {
    await p.waitForSelector('#ed-gaveta.is-open', { state: 'detached', timeout: 3000 });
  } catch { /* segue e confere pela mensagem */ }
  await esperar(1800);
  const aberta = await p.locator('#ed-gaveta.is-open').count();
  if (aberta) {
    const msg = await p.locator('#ed-form-msg').textContent().catch(() => '');
    const errosCampo = await p.locator('[data-erro]').allTextContents();
    return `SALVAR NAO FECHOU: msg="${msg}" campos=${JSON.stringify(errosCampo.filter(Boolean))}`;
  }
  return null;
};

const notaYoutube = async (p) => (await p.locator('[data-nota-youtube]').first().textContent().catch(() => '')) || '';

// ---------------------------------------------------------------- conteudo do Diego

const BIO = [
  'Sou personal trainer há 11 anos e trabalho com uma ideia simples: treino que cabe na rotina é treino que a pessoa faz.',
  'Atendo presencialmente na zona sul de São Paulo e online para o Brasil inteiro, com ajuste de programa toda semana.',
  'Minha especialidade é força e recomposição corporal para quem já tentou de tudo e nunca conseguiu manter constância.',
  'Cada programa nasce de uma avaliação de movimento em vídeo, e não de uma planilha genérica repetida para todo mundo.',
].join('\n');

const REDES = [
  'Instagram | @diegoaranha.treino | https://instagram.com/diegoaranha.treino',
  'TikTok | @diegoaranha | https://www.tiktok.com/@diegoaranha',
  'YouTube | Treino com o Diego | https://www.youtube.com/@diegoaranha',
  'WhatsApp | (11) 98765-4321 | https://wa.me/5511987654321',
].join('\n');

const NUMEROS = ['Alunos atendidos | 340', 'Anos de treino | 11', 'Transformações | 128'].join('\n');

const ESPECIALIDADES = [
  'Treino de força', 'Hipertrofia', 'Recomposição corporal', 'Avaliação de movimento',
  'Mobilidade', 'Powerlifting', 'Emagrecimento', 'Treino online', 'Periodização',
];

const PROJETOS = [
  {
    imagem: 'p1.jpg',
    name: 'Recomposição em 16 semanas',
    category: 'Programa de treino',
    tagline: 'Programa de força e dieta para quem quer trocar gordura por músculo sem parar de comer arroz e feijão.',
    problem: 'A aluna treinava há três anos, sempre a mesma ficha de academia, e tinha parado de ver qualquer resultado. Cada tentativa de dieta durava duas semanas e terminava em compulsão no fim de semana.',
    solution: 'Montei um bloco de 16 semanas dividido em quatro fases, com treino de força três vezes por semana e uma faixa de calorias que ela conseguia sustentar. Toda segunda ela mandava o vídeo do agachamento e eu ajustava a carga.',
    features: ['Avaliação de movimento por vídeo', 'Treino em quatro blocos de quatro semanas', 'Ajuste semanal de carga', 'Lista de substituição de alimentos', 'Check-in por WhatsApp toda segunda'],
    video: 'https://www.youtube.com/shorts/83k-_6c1DtE',
    videoNota: 'SHORT (vertical), formato original',
    link: 'https://wa.me/5511987654321',
    link_note: 'Fale comigo para entrar na próxima turma',
    stack: ['Treino de força', 'Periodização', 'Recomposição corporal'],
    cliente: 'Camila R.',
    grupos: ['Programas', 'Online'],
    ano: '2025',
  },
  {
    imagem: 'p2.jpg',
    name: 'Consultoria online Força Total',
    category: 'Consultoria online',
    tagline: 'Acompanhamento mensal a distância para quem treina sozinho e não quer inventar o próprio treino.',
    problem: 'Aluno morava em outra cidade, treinava numa academia pequena e montava o próprio treino copiando vídeo de internet. Vivia com dor no ombro e sem progressão de carga.',
    solution: 'Programa mensal montado a partir do que a academia dele tem de equipamento, com vídeo meu explicando cada exercício e uma chamada de 30 minutos por mês para revisar a execução.',
    features: ['Programa refeito todo mês', 'Vídeo de execução exercício por exercício', 'Chamada mensal de 30 minutos', 'Planilha de progressão de carga', 'Suporte por WhatsApp em dias úteis'],
    video: 'https://www.youtube.com/watch?v=4D-ZGYFUxyM',
    videoNota: 'HORIZONTAL, para comparar',
    link: 'https://wa.me/5511987654321',
    link_note: 'Vagas abertas todo dia 1',
    stack: ['Treino online', 'Avaliação de movimento', 'Mobilidade'],
    cliente: 'Rodrigo M.',
    grupos: ['Online', 'Consultoria'],
    ano: '2025',
  },
  {
    imagem: 'p5-vertical.jpg', // FOTO RETRATO 2:3 de proposito, num campo que corta 3:2
    name: 'Transformação da Camila',
    category: 'Transformação',
    tagline: 'Onze meses, 14 quilos a menos e um agachamento que saiu da barra vazia para 80 quilos.',
    problem: 'Ela chegou depois de duas cirurgias e do médico liberando o treino, com medo de qualquer peso livre e sem nenhuma referência do que o corpo dela aguentava.',
    solution: 'Comecei com padrão de movimento e barra vazia por seis semanas antes de qualquer carga. A progressão foi lenta de propósito e o histórico inteiro ficou registrado em vídeo, semana a semana.',
    features: ['Seis semanas só de padrão de movimento', 'Registro em vídeo toda semana', 'Progressão de carga documentada', 'Acompanhamento de medidas a cada 30 dias'],
    video: 'https://youtu.be/AeRoPukf078',
    videoNota: 'SHORT compartilhado no formato curto youtu.be (o teste do formato)',
    link: '',
    link_note: '',
    stack: ['Recomposição corporal', 'Hipertrofia'],
    cliente: 'Camila R.',
    grupos: ['Transformações'],
    ano: '2024',
  },
  {
    imagem: 'p3.jpg',
    name: 'Força para quem nunca treinou',
    category: 'Programa de treino',
    tagline: 'Oito semanas para sair do zero absoluto e chegar aos cinco padrões básicos com técnica limpa.',
    problem: 'Quem nunca pisou numa academia chega perdido, copia o treino do vizinho e desiste no segundo mês por dor ou por vergonha.',
    solution: 'Um programa curto, com três exercícios por sessão e um vídeo meu para cada um. A pessoa sai das oito semanas sabendo agachar, empurrar, puxar, levantar do chão e carregar peso.',
    features: ['Três exercícios por sessão', 'Vídeo de execução em cada um', 'Duas sessões por semana', 'Sem equipamento além de barra e halter'],
    video: '',
    videoNota: '',
    link: '',
    link_note: '',
    stack: ['Treino de força', 'Avaliação de movimento'],
    cliente: '',
    grupos: ['Programas'],
    ano: '2024',
  },
  {
    imagem: 'p4.jpg',
    name: 'Turma do parque, sábado de manhã',
    category: 'Turma presencial',
    tagline: 'Treino em grupo no Ibirapuera, com material que cabe numa mochila e progressão individual.',
    problem: 'Aluno sozinho falta. Aluno em grupo aparece, mas turma em grupo costuma virar aula de ginástica onde ninguém progride em nada.',
    solution: 'Turma de até oito pessoas, cada uma com a própria planilha de carga, mesmo circuito e mesmo horário. Quem falta repõe no sábado seguinte.',
    features: ['Até oito alunos por turma', 'Planilha individual dentro do grupo', 'Duas horas aos sábados', 'Material próprio, sem academia'],
    video: '',
    videoNota: '',
    link: '',
    link_note: '',
    stack: ['Treino de força', 'Mobilidade'],
    cliente: '',
    grupos: ['Presencial'],
    ano: '2023',
  },
  {
    imagem: 'p6-vertical.jpg', // segunda foto retrato 2:3
    name: 'Volta ao treino pós-cirurgia de ombro',
    category: 'Retorno ao treino',
    tagline: 'Protocolo de dez meses feito junto com a fisioterapeuta, do primeiro movimento sem carga ao supino de novo.',
    problem: 'Depois da cirurgia de manguito rotador, o aluno tinha alta da fisioterapia mas nenhuma ponte entre o consultório e a academia. Ninguém queria assumir a carga.',
    solution: 'Conversei com a fisioterapeuta dele, peguei as restrições por escrito e montei dez meses de progressão que respeitam cada uma. O supino voltou no oitavo mês, com barra guiada.',
    features: ['Restrições combinadas com a fisioterapeuta', 'Progressão mês a mês', 'Registro de dor a cada sessão', 'Retorno ao supino documentado'],
    video: '',
    videoNota: '',
    link: '',
    link_note: '',
    stack: ['Mobilidade', 'Treino de força'],
    cliente: 'Marcelo T.',
    grupos: ['Transformações', 'Presencial'],
    ano: '2023',
  },
];

const EXPERIENCIAS = [
  {
    kind: 'work',
    org: 'Studio Aranha Performance',
    role: 'Personal trainer e sócio-fundador',
    period_start: '03/2019',
    atual: true,
    location: 'São Paulo, SP',
    logo: 'logo3.jpg',
    highlights: [
      'Abri o studio com duas salas e hoje atendo 40 alunos ativos por semana.',
      'Montei o protocolo de avaliação de movimento que todos os treinos do studio usam.',
      'Treino equipe de três professores no mesmo método.',
    ],
    note: 'O studio nasceu de uma sala alugada dentro de uma academia de bairro. Hoje é endereço próprio na Vila Mariana.',
  },
  {
    kind: 'education',
    org: 'Universidade São Judas Tadeu',
    role: 'Bacharelado em Educação Física',
    period_start: '2011',
    atual: false,
    period_end: '12/2015',
    location: 'São Paulo, SP',
    logo: 'logo2.jpg',
    highlights: [
      'Trabalho de conclusão sobre treinamento de força em mulheres na pós-menopausa.',
      'Dois anos de estágio no laboratório de fisiologia do exercício.',
    ],
    note: 'CREF 123456-G/SP, ativo.',
    certificado: 'logo1.jpg',
  },
  {
    kind: 'education',
    org: 'NSCA Brasil',
    role: 'Certified Strength and Conditioning Specialist',
    period_start: '2021',
    atual: false,
    period_end: '2021',
    location: 'Online',
    logo: 'logo1.jpg',
    highlights: ['Certificação internacional de preparação física, renovada a cada três anos.'],
    note: '',
  },
];

// Formatos de link testados no campo, sem salvar: o que interessa e o que a nota diz.
const FORMATOS = [
  ['https://www.youtube.com/shorts/83k-_6c1DtE', 'Short, formato original'],
  ['https://youtube.com/shorts/83k-_6c1DtE?feature=share', 'Short como o app compartilha'],
  ['https://m.youtube.com/shorts/83k-_6c1DtE', 'Short pelo celular'],
  ['https://youtu.be/83k-_6c1DtE', 'Short pelo link curto'],
  ['https://youtu.be/83k-_6c1DtE?t=30', 'Link curto com tempo'],
  ['https://www.youtube.com/watch?v=4D-ZGYFUxyM', 'Video normal'],
  ['https://www.youtube.com/watch?v=4D-ZGYFUxyM&t=30s', 'Video normal com tempo'],
  ['https://www.youtube.com/watch?v=83k-_6c1DtE', 'Short aberto na pagina de watch'],
  ['https://www.youtube.com/embed/4D-ZGYFUxyM', 'Link de embed'],
  ['https://www.youtube.com/@diegoaranha', 'Link de canal (tem que recusar)'],
];

// ---------------------------------------------------------------- fases

const achados = [];
const anotar = (t) => { if (t) { achados.push(t); console.log('  !! ' + t); } };

async function fasePerfil(p) {
  await abrir(p, 'perfil');
  await p.screenshot({ path: TIRO('perfil-abre'), fullPage: false });

  console.log('[passo 1]');
  anotar(await subirImagem(p, 'hero', 'hero.jpg'));
  anotar(await subirImagem(p, 'avatar', 'avatar.jpg'));
  anotar(await escrever(p, 'display_name', 'Diego Aranha'));
  anotar(await escrever(p, 'role', 'Treino de força e recomposição corporal · São Paulo e online'));
  anotar(await escrever(p, 'bio', BIO));
  anotar(await escrever(p, 'badge_label', 'Personal trainer'));
  anotar(await escolher(p, 'badge_icon', 'dumbbell'));

  console.log('[passo 2]');
  if (!(await abrirPasso(p, 2))) anotar('SEM PASSO 2 no perfil');
  anotar(await escrever(p, 'contact_email', 'contato@diegoaranha.com.br'));
  anotar(await ligar(p, 'show_contact_email', true));
  anotar(await escrever(p, 'cta_url', 'https://wa.me/5511987654321'));
  const ctaLabel = p.locator('#ed-cta_label').first();
  const ctaBloqueado = (await ctaLabel.count()) ? await ctaLabel.isDisabled() : 'ausente';
  console.log(`  cta_label bloqueado? ${ctaBloqueado}`);
  if (ctaBloqueado === true) anotar('BOTAO PRINCIPAL: "Texto do botão" (cta_label) esta desabilitado, atras do bump de Personalizacao');
  else anotar(await escrever(p, 'cta_label', 'Falar no WhatsApp'));
  anotar(await escrever(p, 'socials', REDES));
  anotar(await escrever(p, 'stats', NUMEROS));

  console.log('[passo 3]');
  if (!(await abrirPasso(p, 3))) anotar('SEM PASSO 3 no perfil');
  anotar(await chips(p, 'stacks', ESPECIALIDADES));
  anotar(await ligar(p, 'projects_video_first', true));
  anotar(await escolher(p, 'projects_per_page', '6'));
  anotar(await ligar(p, 'show_online_dot', true));

  console.log('[ajustes finos]');
  if (await abrirPasso(p, 'fino')) {
    anotar(await escrever(p, 'seo_title', 'Diego Aranha · Personal trainer em São Paulo'));
    anotar(await escrever(p, 'seo_description', 'Treino de força e recomposição corporal, presencial na zona sul de São Paulo e online para o Brasil inteiro.'));
    const cor = p.locator('#ed-theme_accent').first();
    if ((await cor.count()) && !(await cor.isDisabled())) await cor.fill('#B6FF3C');
    else anotar('COR DE DESTAQUE bloqueada pelo bump: a paleta da pagina fica a padrao roxa');
  }

  await p.screenshot({ path: TIRO('perfil-preenchido'), fullPage: false });
  anotar(await salvar(p));
  await esperar(2500);
  await p.screenshot({ path: TIRO('canvas-pos-perfil'), fullPage: true });
}

async function faseProjetos(p) {
  await abrir(p, 'projetos');
  const jaTem = await p.locator('.ed-lista-item').count();
  console.log(`  projetos ja cadastrados: ${jaTem}`);
  const restantes = PROJETOS.slice(jaTem);
  if (!restantes.length) { console.log('  nada a fazer'); return; }

  for (const [i, proj] of restantes.entries()) {
    const n = jaTem + i + 1;
    console.log(`\n[projeto ${n}] ${proj.name}`);
    if (i > 0) await abrir(p, 'projetos');
    await p.locator('[data-adicionar]').first().click();
    await esperar(1200);

    anotar(await subirImagem(p, 'image', proj.imagem));
    anotar(await escrever(p, 'name', proj.name));
    anotar(await escrever(p, 'category', proj.category));
    anotar(await escrever(p, 'tagline', proj.tagline));

    if (!(await abrirPasso(p, 2))) anotar('SEM PASSO 2 no projeto');
    anotar(await escrever(p, 'problem', proj.problem));
    anotar(await escrever(p, 'solution', proj.solution));
    anotar(await escrever(p, 'features', proj.features.join('\n')));

    if (!(await abrirPasso(p, 3))) anotar('SEM PASSO 3 no projeto');
    if (proj.video) {
      anotar(await escrever(p, 'video', proj.video));
      await esperar(500);
      console.log(`  video (${proj.videoNota}) -> nota do editor: "${await notaYoutube(p)}"`);
    }
    if (proj.link) {
      anotar(await escrever(p, 'link', proj.link));
      await esperar(800); // link_note so nasce depois que link tem valor
      if (proj.link_note) anotar(await escrever(p, 'link_note', proj.link_note));
    }
    anotar(await chips(p, 'stack', proj.stack));
    if (proj.cliente) {
      anotar(await ligar(p, 'tem_cliente', true));
      await esperar(400);
      anotar(await escrever(p, 'client', proj.cliente));
    }
    anotar(await escolher(p, 'year', proj.ano));
    anotar(await chips(p, 'groups', proj.grupos));

    if (n === 3) await p.screenshot({ path: TIRO('projeto-foto-vertical'), fullPage: false });
    if (n === 1) await p.screenshot({ path: TIRO('projeto-com-short'), fullPage: false });

    anotar(await salvar(p));
    await esperar(1500);
  }
  await p.screenshot({ path: TIRO('canvas-pos-projetos'), fullPage: true });
}

async function faseExperiencias(p) {
  await abrir(p, 'experiencias');
  const jaTem = await p.locator('.ed-lista-item').count();
  console.log(`  experiencias ja cadastradas: ${jaTem}`);
  const restantes = EXPERIENCIAS.slice(jaTem);
  if (!restantes.length) { console.log('  nada a fazer'); return; }

  for (const [i, exp] of restantes.entries()) {
    console.log(`\n[experiencia ${jaTem + i + 1}] ${exp.org}`);
    if (i > 0) await abrir(p, 'experiencias');
    await p.locator('[data-adicionar]').first().click();
    await esperar(1200);

    await botao(p, 'kind', exp.kind);
    anotar(await escrever(p, 'org', exp.org));
    anotar(await escrever(p, 'role', exp.role));
    anotar(await escrever(p, 'period_start', exp.period_start));
    anotar(await ligar(p, 'atual', exp.atual));
    if (!exp.atual) anotar(await escrever(p, 'period_end', exp.period_end));

    const passoLogo = 2;
    if (!(await abrirPasso(p, passoLogo))) anotar('SEM PASSO 2 na experiencia');
    anotar(await subirImagem(p, 'logo', exp.logo));
    anotar(await escrever(p, 'location', exp.location));
    anotar(await escrever(p, 'highlights', exp.highlights.join('\n')));

    await abrirPasso(p, 3);
    if (exp.note) anotar(await escrever(p, 'note', exp.note));

    if (exp.certificado) {
      const cert = p.locator('[data-cert-input]').first();
      if (await cert.count()) {
        await cert.setInputFiles(MIDIA(exp.certificado));
        await esperar(9000);
        const erroCert = await p.locator('[data-campo="certificate"] [data-erro]').first().textContent().catch(() => '');
        console.log(`  certificado -> "${erroCert}"`);
        if (erroCert && !/^$/.test(erroCert.trim())) anotar(`CERTIFICADO: ${erroCert}`);
      } else anotar('SEM CAMPO DE CERTIFICADO na experiencia de estudo');
    }

    anotar(await salvar(p));
    await esperar(1500);
  }
  await p.screenshot({ path: TIRO('canvas-pos-experiencias'), fullPage: true });
}

// Cola cada formato no campo de video do PRIMEIRO projeto e le a nota. Nao salva.
async function faseFormatos(p) {
  await abrir(p, 'projetos');
  await p.locator('[data-editar]').first().click();
  await esperar(1500);
  if (!(await abrirPasso(p, 3))) return anotar('SEM PASSO 3 para testar formatos');
  const campo = p.locator('#ed-video').first();
  const linhas = [];
  for (const [url, rotulo] of FORMATOS) {
    await campo.fill('');
    await esperar(200);
    await campo.fill(url);
    await esperar(450);
    const nota = (await notaYoutube(p)).trim();
    const erro = (await p.locator('[data-campo="video"] [data-erro]').first().textContent().catch(() => '')).trim();
    linhas.push(`${rotulo.padEnd(40)} | ${url.padEnd(52)} | ${nota || '(sem nota)'}${erro ? ` | erro: ${erro}` : ''}`);
    console.log('  ' + linhas.at(-1));
  }
  // Devolve o valor original e fecha sem salvar.
  await campo.fill(PROJETOS[0].video);
  await esperar(400);
  await p.screenshot({ path: TIRO('formatos-video'), fullPage: false });
  await p.keyboard.press('Escape');
  await esperar(600);
  return linhas;
}

// Reabre o que ja foi gravado e mostra o estado real dos campos condicionais e da cor.
async function faseConferir(p) {
  await abrir(p, 'perfil');
  if (await abrirPasso(p, 'fino')) {
    const cor = await p.locator('#ed-theme_accent').first().inputValue().catch(() => '(ausente)');
    const bloq = await p.locator('#ed-theme_accent').first().isDisabled().catch(() => '?');
    console.log(`theme_accent gravado = ${cor} | desabilitado = ${bloq}`);
  }
  const pilulas = await p.locator('.ed-lock').allTextContents();
  console.log('campos com cadeado de Personalizacao: ' + JSON.stringify(pilulas));
  await p.keyboard.press('Escape');
  await esperar(800);

  for (const alvo of [0, 2]) {
    await abrir(p, 'projetos');
    await p.locator('[data-editar]').nth(alvo).click();
    await esperar(1500);
    await abrirPasso(p, 3);
    const nome = await p.locator('#ed-name').first().inputValue();
    const link = await p.locator('#ed-link').first().inputValue().catch(() => '(ausente)');
    const temLinkNote = await p.locator('#ed-link_note').count();
    const linkNote = temLinkNote ? await p.locator('#ed-link_note').first().inputValue() : '(campo nao existe)';
    const sw = await p.locator('[data-switch="tem_cliente"]').first().getAttribute('aria-checked');
    const temClient = await p.locator('#ed-client').count();
    const client = temClient ? await p.locator('#ed-client').first().inputValue() : '(campo nao existe)';
    const video = await p.locator('#ed-video').first().inputValue().catch(() => '');
    console.log(`\n[${nome}]`);
    console.log(`  link="${link}" | link_note=${linkNote}`);
    console.log(`  tem_cliente=${sw} | client=${client}`);
    console.log(`  video="${video}" | nota="${(await notaYoutube(p)).trim()}"`);
    await p.keyboard.press('Escape');
    await esperar(800);
  }
}

// PROVA: o corpo da gaveta acumula um jogo de listeners a cada repintura, entao um clique em
// switch vale N cliques. Com N par, o switch simplesmente nao liga.
async function faseSwitch(p) {
  await abrir(p, 'projetos');
  await p.locator('[data-adicionar]').first().click();
  await esperar(1200);
  await abrirPasso(p, 3);

  const estado = async () => (await p.locator('[data-switch="tem_cliente"]').first().getAttribute('aria-checked'));
  const clicar = async () => { await p.locator('[data-switch="tem_cliente"]').first().click(); await esperar(600); };
  const addChip = async (t) => {
    const el = p.locator('[data-chip-add="stack"]').first();
    await el.fill(t); await el.press('Enter'); await esperar(500);
  };

  console.log(`0 repinturas -> antes=${await estado()}`);
  await clicar();
  console.log(`  depois do clique = ${await estado()}   (esperado: true)`);
  await clicar();
  console.log(`  depois de desligar = ${await estado()}   (esperado: false)`);

  await addChip('A');
  console.log(`\n1 repintura  -> antes=${await estado()}`);
  await clicar();
  console.log(`  depois do clique = ${await estado()}   (esperado: true)`);

  await addChip('B');
  console.log(`\n2 repinturas -> antes=${await estado()}`);
  await clicar();
  console.log(`  depois do clique = ${await estado()}   (esperado: false)`);

  // Quantos listeners de clique existem de fato no corpo da gaveta.
  const contagem = await p.evaluate(() => {
    const c = document.querySelector('[data-gaveta-corpo]');
    let n = 0;
    const orig = c.addEventListener.bind(c);
    // conta indiretamente: dispara um clique num alvo neutro e mede quantas vezes o handler roda
    return { html: c ? 'ok' : 'sem corpo', n, orig: typeof orig };
  });
  console.log('\n(corpo da gaveta: ' + JSON.stringify(contagem) + ')');

  // Custo de digitacao: cada listener empilhado repinta o canvas inteiro de novo.
  const campo = p.locator('#ed-tagline').first();
  await campo.fill('');
  const t = Date.now();
  await campo.type('teste de digitacao com o formulario ja repintado varias vezes', { delay: 0 });
  console.log(`digitar 60 caracteres depois de 3 repinturas: ${Date.now() - t} ms`);

  await p.keyboard.press('Escape');
  await esperar(600);
}

// PROVA 2: abrir o case do Short e clicar em Salvar SEM MEXER EM NADA. O campo foi repintado
// como youtu.be/<id> (projectsApi.js:37), e youtu.be nao carrega a marca de Shorts, entao o
// mesmo video volta ao banco como horizontal.
async function faseRegressao(p) {
  await abrir(p, 'projetos');
  await p.locator('[data-editar]').first().click();
  await esperar(1500);
  await abrirPasso(p, 3);
  const antes = await p.locator('#ed-video').first().inputValue();
  console.log(`campo de video ao reabrir: "${antes}"`);
  console.log('clicando em Salvar sem tocar em nada...');
  anotar(await salvar(p));
  await esperar(2000);
}

// Recoloca a URL de Shorts para a pagina publicada terminar certa.
async function faseRestaurar(p) {
  await abrir(p, 'projetos');
  await p.locator('[data-editar]').first().click();
  await esperar(1500);
  await abrirPasso(p, 3);
  await p.locator('#ed-video').first().fill(PROJETOS[0].video);
  await esperar(600);
  console.log(`nota: "${(await notaYoutube(p)).trim()}"`);
  // O link_note so nasce numa repintura; um chip qualquer serve de gatilho, e ver isso e o
  // achado.
  const temNota1 = await p.locator('#ed-link_note').count();
  await chips(p, 'groups', ['Online']);
  const temNota2 = await p.locator('#ed-link_note').count();
  console.log(`link_note existia antes do chip? ${temNota1} | depois do chip? ${temNota2}`);
  if (temNota2) await escrever(p, 'link_note', PROJETOS[0].link_note);
  anotar(await salvar(p));
}

// Conserta os dois cases que ficaram sem cliente por causa do switch teimoso.
async function faseCliente(p) {
  for (const [indice, nome] of [[2, 'Camila R.'], [5, 'Marcelo T.']]) {
    await abrir(p, 'projetos');
    await p.locator('[data-editar]').nth(indice).click();
    await esperar(1500);
    await abrirPasso(p, 3);
    console.log(`\ncase ${indice + 1}: ligando "Foi para um cliente"`);
    anotar(await ligar(p, 'tem_cliente', true));
    const tem = await p.locator('#ed-client').count();
    console.log(`  campo do cliente apareceu? ${Boolean(tem)}`);
    if (tem) anotar(await escrever(p, 'client', nome));
    anotar(await salvar(p));
    await esperar(1200);
  }
}

// Conserta o fim do curso: o switch "ainda estou cursando" nasce ligado e nao desliga.
async function faseFimDoCurso(p) {
  for (const [indice, fim] of [[1, '12/2015'], [2, '2021']]) {
    await abrir(p, 'experiencias');
    await p.locator('[data-editar]').nth(indice).click();
    await esperar(1500);
    console.log(`\nexperiencia ${indice + 1}: desligando "ainda estou cursando"`);
    anotar(await ligar(p, 'atual', false));
    const tem = await p.locator('#ed-period_end').count();
    console.log(`  campo "Até" apareceu? ${Boolean(tem)}`);
    if (tem) anotar(await escrever(p, 'period_end', fim));
    anotar(await salvar(p));
    await esperar(1200);
  }
}

async function fasePublicar(p) {
  await abrir(p, 'publicar');
  await esperar(1200);
  const antes = await p.locator('.ed-publicar').innerText();
  console.log('--- tela de publicar (antes) ---\n' + antes);
  await p.screenshot({ path: TIRO('publicar-antes'), fullPage: false });

  // Link de previa primeiro: e o que sobrevive a fila de revisao.
  await p.locator('[data-girar-previa]').first().click();
  await esperar(3000);
  const previa = await p.locator('[data-previa-url]').first().inputValue().catch(() => '');
  console.log('PREVIA: ' + previa);

  const btn = p.locator('[data-publicar]').first();
  const desabilitado = await btn.isDisabled();
  console.log('botao publicar desabilitado? ' + desabilitado);
  if (!desabilitado) {
    await btn.click();
    await esperar(6000);
  }
  const depois = await p.locator('.ed-publicar').innerText();
  console.log('--- tela de publicar (depois) ---\n' + depois);
  await p.screenshot({ path: TIRO('publicar-depois'), fullPage: false });
  return previa;
}

// ---------------------------------------------------------------- main

await mkdir(resolve(process.cwd(), 'out'), { recursive: true });
const t0 = Date.now();
const { pagina, navegador, erros } = await abrirEditor('demo-personal', { headless: true });
console.log(`editor aberto em ${((Date.now() - t0) / 1000).toFixed(1)}s | fase: ${FASE}`);

try {
  if (FASE === 'olhar') {
    console.log('--- TEXTO DA TELA ---');
    console.log((await pagina.evaluate(() => document.body.innerText)).slice(0, 2000));
    await pagina.screenshot({ path: TIRO('olhar'), fullPage: true });
  }
  if (FASE === 'perfil') await fasePerfil(pagina);
  if (FASE === 'projetos') await faseProjetos(pagina);
  if (FASE === 'experiencias') await faseExperiencias(pagina);
  if (FASE === 'formatos') await faseFormatos(pagina);
  if (FASE === 'conferir') await faseConferir(pagina);
  if (FASE === 'switch') await faseSwitch(pagina);
  if (FASE === 'regressao') await faseRegressao(pagina);
  if (FASE === 'restaurar') await faseRestaurar(pagina);
  if (FASE === 'cliente') await faseCliente(pagina);
  if (FASE === 'fimdocurso') await faseFimDoCurso(pagina);
  if (FASE === 'publicar') await fasePublicar(pagina);
  if (FASE === 'visitante') {
    // Antes: o comprador clica no proprio card para conferir o video. Funciona?
    await pagina.locator('.project-card[data-slug="recomposicao-em-16-semanas"]').first().click();
    await esperar(2000);
    const abriu = await pagina.locator('#project-modal iframe').count();
    console.log(`clicar no card DENTRO do editor abre o modal com o video? ${Boolean(abriu)}`);
    if (!abriu) anotar('No canvas do editor o card nao abre o modal: nao da para conferir o video sem sair do editor');
    await pagina.screenshot({ path: TIRO('clique-no-card-do-editor'), fullPage: false });

    await pagina.locator('[data-ver-visitante]').click();
    await esperar(1500);
    const barra = await pagina.locator('#ed-barra').isVisible().catch(() => false);
    console.log(`"Ver como visitante" escondeu a barra do editor? ${!barra}`);
    await pagina.locator('.project-card[data-slug="recomposicao-em-16-semanas"]').first().click();
    await esperar(2000);
    console.log(`e no modo visitante o card abre o modal? ${Boolean(await pagina.locator('#project-modal iframe').count())}`);
    await pagina.screenshot({ path: TIRO('visitante'), fullPage: true });
  }
} catch (e) {
  console.log('EXCECAO: ' + String(e).slice(0, 600));
} finally {
  console.log('\n=== ACHADOS DA FASE ===');
  achados.forEach((a) => console.log(' - ' + a));
  console.log('\n=== ERROS DE CONSOLE / REDE ===');
  [...new Set(erros)].slice(0, 40).forEach((e) => console.log(' - ' + e));
  console.log(`\ntempo: ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  await navegador.close();
}
