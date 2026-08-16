// Agente de nicho: Adriano Peçanha, professor de Direito Constitucional para concursos
// (slug demo-professor).
//
// O que esta persona existe para quebrar: MUITAS EXPERIENCIAS E POUCOS TRABALHOS, e o
// CERTIFICADO como centro da credibilidade, nao como anexo do fim do formulario. Por isso o
// roteiro aqui e o contrario do da chef: tres trabalhos, seis experiencias, tres certificados,
// e um teste explicito de arquivo grande demais e de logo fora do formato pedido.
//
// Uso:
//   node scripts/_demos/demo-professor.mjs              (tudo)
//   node scripts/_demos/demo-professor.mjs perfil       (perfil|projetos|experiencias|ordem|publicar|publico|ler)
import { abrirEditor, esperar } from './base.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ETAPA = process.argv[2] || 'tudo';
const fazer = (n) => ETAPA === 'tudo' || ETAPA === n;
const MIDIA = path.resolve('out/midia/demo-professor');
const m = (f) => path.join(MIDIA, f);

const atrito = [];
const nota = (nivel, texto) => { atrito.push(`[${nivel}] ${texto}`); console.log(`  ! ${nivel}: ${texto}`); };

await mkdir('out', { recursive: true });
const { pagina, navegador, demo, erros } = await abrirEditor('demo-professor', { headless: true });
console.log(`editor aberto para ${demo.nome} (${demo.slug})`);

const G = '#ed-gaveta';
const tiro = async (nome, inteiro = false) => {
  try { await pagina.screenshot({ path: `out/prof-${nome}.png`, fullPage: inteiro }); } catch {}
};
const textoGaveta = () => pagina.evaluate(() => document.querySelector('#ed-gaveta')?.innerText || '(sem gaveta)');

async function abrirPainelPor(chave) {
  await pagina.click(`[data-abrir="${chave}"]`);
  await esperar(1200);
}

async function abrirTodosOsPassos() {
  await pagina.evaluate(() => {
    document.querySelectorAll('#ed-gaveta details[data-passo]').forEach((d) => { d.open = true; });
  });
  await esperar(250);
}

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
    if (await inp.isDisabled()) { nota('LIMITE', `chips "${key}" travou em "${texto}"`); return; }
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

async function subirImagem(key, arquivo, origem) {
  const inp = pagina.locator(`${G} [data-arquivo="${key}"]`).first();
  if (!(await inp.count())) { nota('AUSENTE', `campo de imagem "${key}" nao existe`); return null; }
  await inp.setInputFiles(m(arquivo));
  for (let i = 0; i < 40; i += 1) {
    await esperar(500);
    const r = await pagina.evaluate((k) => {
      const campo = document.querySelector(`#ed-gaveta [data-campo="${k}"]`);
      const img = campo?.querySelector('.ed-drop-previa');
      const erro = campo?.querySelector('[data-erro]')?.textContent?.trim() || '';
      return { url: img?.src || '', w: img?.naturalWidth || 0, h: img?.naturalHeight || 0, erro };
    }, key);
    if (r.url && r.w) {
      console.log(`  imagem ${key}: ${origem} -> ${r.w}x${r.h}`);
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

// Sobe um certificado e devolve o que a tela mostrou. Nunca engole erro: a mensagem de recusa
// e metade do que esta persona veio medir.
async function subirCertificado(arquivo, { esperaErro = false } = {}) {
  const inp = pagina.locator(`${G} [data-cert-input]`).first();
  if (!(await inp.count())) { nota('AUSENTE', 'campo de certificado nao existe neste formulario'); return null; }
  await inp.setInputFiles(m(arquivo));
  for (let i = 0; i < 40; i += 1) {
    await esperar(500);
    const r = await pagina.evaluate(() => {
      const campo = document.querySelector('#ed-gaveta [data-campo="certificate"]');
      const anexo = campo?.querySelector('.ed-anexo');
      return {
        anexo: Boolean(anexo),
        nome: anexo?.querySelector('.ed-anexo-nome')?.textContent?.trim() || '',
        tam: anexo?.querySelector('.ed-anexo-tam')?.textContent?.trim() || '',
        erro: campo?.querySelector('[data-erro]')?.textContent?.trim() || '',
      };
    });
    if (r.anexo) { console.log(`  certificado anexado: ${r.nome} ${r.tam}`); return r; }
    if (r.erro && !/enviando/i.test(r.erro)) {
      if (esperaErro) console.log(`  RECUSA (esperada): "${r.erro}"`);
      else nota('ERRO-UPLOAD', `certificado ${arquivo}: ${r.erro}`);
      return r;
    }
  }
  nota('TIMEOUT', `certificado ${arquivo} nao resolveu em 20s`);
  return null;
}

async function salvar(rotulo) {
  const btn = pagina.locator('#ed-form-salvar');
  if (!(await btn.count())) { nota('AUSENTE', `botao Salvar sumiu em ${rotulo}`); return false; }
  await btn.click();
  for (let i = 0; i < 40; i += 1) {
    await esperar(500);
    const aberta = await pagina.evaluate(() => document.querySelector('#ed-gaveta')?.classList.contains('is-open'));
    if (!aberta) { console.log(`  salvo: ${rotulo}`); return true; }
    const msg = await pagina.evaluate(() => document.getElementById('ed-form-msg')?.textContent?.trim() || '');
    if (msg && !/salvando/i.test(msg)) { nota('ERRO-SALVAR', `${rotulo}: ${msg}`); return false; }
  }
  nota('TIMEOUT', `salvar ${rotulo} nao respondeu em 20s`);
  return false;
}

// ------------------------------------------------------------------ conteudo
const BIO = [
  'Dou aula de Direito Constitucional para concurso público há treze anos, e por seis deles trabalhei do outro lado do balcão, como Advogado da União.',
  'Minha aula não é leitura de lei seca: eu parto da questão que a banca já cobrou, mostro o raciocínio que ela quer ver e só depois volto ao artigo.',
  'Já preparei turmas para AGU, TRF, TRT, Câmara, Senado, PGE e para o Banco do Brasil, presencialmente em Brasília e online para o país inteiro.',
  'Sou mestre em Direito Constitucional pela UnB, com dissertação sobre mutação constitucional no controle difuso, tema que ainda cai em prova discursiva.',
  'Escrevo o material que uso em sala, corrijo discursiva com devolutiva escrita e mantenho um canal gratuito com a jurisprudência da semana.',
  'Turmas fechadas de no máximo quarenta alunos, porque correção individual não escala e é ela que muda a nota.',
].join(' ');

const SOCIAIS = [
  'Instagram | @profadrianopecanha | https://instagram.com/profadrianopecanha',
  'YouTube | Constitucional Sem Susto | https://youtube.com/@constitucionalsemsusto',
  'WhatsApp | Turmas e matrícula | https://wa.me/5561992440188',
  'Telegram | Jurisprudência da semana | https://t.me/constitucionalsemsusto',
].join('\n');

const NUMEROS = [
  'Alunos aprovados | 412',
  'Anos de magistério | 13',
  'Turmas concluídas | 68',
  'Horas de aula gravadas | 900',
].join('\n');

const DISCIPLINAS = [
  'Controle de constitucionalidade', 'Direitos fundamentais', 'Organização do Estado',
  'Processo legislativo', 'Remédios constitucionais', 'Poder Judiciário',
  'Jurisprudência do STF', 'Correção de discursiva',
];

const TRABALHOS = [
  {
    name: 'Constitucional do Zero ao Edital',
    category: 'Curso online',
    tagline: 'Doze semanas de Constitucional inteiro, da teoria da constituição ao controle concentrado, com discursiva corrigida por mim.',
    problem: 'Aluno de concurso compra curso de 180 horas, assiste 20 e trava no controle de constitucionalidade. O material é longo demais para quem tem edital marcado e emprego durante o dia.',
    solution: 'Reescrevi o programa inteiro em doze semanas amarradas ao que a banca cobra de verdade, com aula de 40 minutos, questão comentada no mesmo dia e uma discursiva por semana com devolutiva escrita.',
    features: ['Doze semanas, uma frente por semana', 'Aula de 40 minutos, sem enrolação de abertura', 'Questão da banca comentada no mesmo dia', 'Discursiva semanal com devolutiva escrita', 'Grupo fechado para dúvida durante a semana'],
    stack: ['Aula gravada', 'Discursiva corrigida', 'Questão comentada', 'Simulado por frente'],
    year: '2025', groups: ['Curso', 'Vídeo'], imagem: 'trab-1.jpg', origem: '1400x871 (paisagem)',
    link: 'https://wa.me/5561992440188', video: 'https://www.youtube.com/watch?v=aEUpj9F0TfM',
  },
  {
    name: 'Controle de Constitucionalidade em 90 páginas',
    category: 'Apostila',
    tagline: 'O tema que mais reprova, resumido no que a banca realmente pergunta, com 240 questões mapeadas por assunto.',
    problem: 'Controle de constitucionalidade é o assunto que mais derruba nota, e o material disponível ou tem 400 páginas de doutrina ou tem um resumo de dez páginas que não segura questão de banca.',
    solution: 'Mapeei dez anos de prova de AGU, TRF e PGE, cortei o que nunca caiu e escrevi 90 páginas com o que cai, cada capítulo terminando na questão que originou o capítulo.',
    features: ['Noventa páginas, sem doutrina decorativa', '240 questões mapeadas por assunto', 'Quadro comparativo difuso e concentrado', 'Atualizada a cada nova tese do STF'],
    stack: ['Mapeamento de banca', 'Questão comentada', 'Quadro comparativo'],
    year: '2024', groups: ['Material'], imagem: 'trab-2.jpg', origem: '1400x933 (paisagem)',
    link: '', video: '',
  },
  {
    name: 'Constitucional Sem Susto',
    category: 'Canal no YouTube',
    tagline: 'Jurisprudência da semana em dez minutos, de graça, toda terça, desde 2019.',
    problem: 'O aluno que estuda sozinho perde tese nova do STF e só descobre na prova. Informativo do STF é escrito para quem já é da área, não para quem está começando.',
    solution: 'Toda terça eu leio o informativo e traduzo em dez minutos o que muda para concurso, com o número do julgado na tela para quem quiser conferir a fonte.',
    features: ['Vídeo novo toda terça desde 2019', 'Dez minutos por informativo', 'Número do julgado sempre na tela', 'Playlist separada por frente do edital'],
    stack: ['Informativo do STF', 'Jurisprudência aplicada', 'Aula gratuita'],
    year: '2019', groups: ['Canal'], imagem: 'trab-3.jpg', origem: '1400x933 (paisagem)',
    link: 'https://youtube.com/@constitucionalsemsusto', video: '',
  },
];

// Cadastradas FORA de ordem cronológica de proposito: o botao "Colocar em ordem" so vale
// alguma coisa se houver desordem para arrumar.
const EXPERIENCIAS = [
  {
    kind: 'work', org: 'Gran Cursos Online', role: 'Professor de Direito Constitucional',
    period_start: '02/2016', atual: true, location: 'Brasília, DF e online',
    highlights: [
      'Titular de Constitucional nas turmas de carreiras jurídicas federais',
      'Programa de 180 horas reescrito em 2023 para caber em doze semanas',
      '412 alunos aprovados em concurso com nota registrada na disciplina',
      'Correção de discursiva com devolutiva escrita, turma de até 40 alunos',
    ],
    note: 'Entrei para gravar um módulo avulso e acabei ficando com a disciplina inteira.',
    logo: 'logo-larga.jpg', logoOrigem: '1400x1050 (foto retangular e opaca, o campo pede quadrada transparente)',
  },
  {
    kind: 'education', org: 'Universidade de Brasília', role: 'Mestrado em Direito Constitucional',
    period_start: '03/2012', period_end: '12/2014', atual: false, location: 'Brasília, DF',
    highlights: [
      'Dissertação sobre mutação constitucional no controle difuso',
      'Bolsista CAPES nos dois últimos anos',
      'Monitoria de Teoria da Constituição na graduação',
    ],
    note: 'Escolhi o tema porque ele caía em discursiva e ninguém explicava direito.',
    certificado: 'cert-mestrado-unb.pdf', certLabel: 'Diploma de mestrado',
    logo: 'logo-unb-quadrada.png', logoOrigem: '512x512 (PNG quadrado com fundo transparente)',
    publico: true,
  },
  {
    kind: 'work', org: 'Advocacia-Geral da União', role: 'Advogado da União',
    period_start: '05/2012', period_end: '01/2018', atual: false, location: 'Brasília, DF',
    highlights: [
      'Aprovado em 7º lugar no concurso de 2011',
      'Atuação em contencioso constitucional junto ao STF',
      'Pareceres em ações diretas de inconstitucionalidade',
    ],
    note: 'Seis anos vendo de dentro como a tese chega ao Supremo. É disso que a aula vive.',
    certificado: 'cert-posse-agu.pdf', certLabel: 'Termo de posse',
    testeGrande: true, publico: true,
  },
  {
    kind: 'education', org: 'Universidade do Estado do Rio de Janeiro', role: 'Bacharelado em Direito',
    period_start: '03/2005', period_end: '12/2009', atual: false, location: 'Rio de Janeiro, RJ',
    highlights: ['Monitor de Direito Constitucional por dois anos', 'Trabalho de conclusão sobre remédios constitucionais'],
    note: '',
    certificado: 'cert-graduacao-uerj.pdf', certLabel: 'Diploma de graduação',
    publico: true,
  },
  {
    kind: 'work', org: 'CERS Cursos Online', role: 'Professor de Direito Constitucional',
    period_start: '08/2014', period_end: '01/2016', atual: false, location: 'Online',
    highlights: ['Módulo de controle de constitucionalidade para carreiras federais', 'Primeira turma gravada de discursiva comentada'],
    note: '',
  },
  {
    kind: 'education', org: 'Escola da Advocacia-Geral da União', role: 'Curso de formação para Advogado da União',
    period_start: '02/2012', period_end: '04/2012', atual: false, location: 'Brasília, DF',
    highlights: ['Etapa final e eliminatória do concurso de 2011', 'Aprovado com média 9,2'],
    note: '',
  },
];

// -------------------------------------------------------------------- PERFIL
if (fazer('perfil')) {
  console.log('\n== PERFIL ==');
  await abrirPainelPor('perfil');
  await abrirTodosOsPassos();
  await writeFile('out/prof-perfil-tela.txt', await textoGaveta(), 'utf8');
  await tiro('01-perfil-aberto');

  await preencher('display_name', demo.nome);
  await preencher('role', demo.role);
  await preencher('bio', BIO);

  // O selo e o campo novo do passo 1. Vale medir se as opcoes de icone servem a esta profissao.
  const opcoesSelo = await pagina.evaluate(() =>
    [...document.querySelectorAll('#ed-gaveta [data-campo="badge_icon"] option')].map((o) => o.textContent.trim()));
  console.log(`  icones de selo oferecidos (${opcoesSelo.length}): ${opcoesSelo.join(', ')}`);
  await preencher('badge_label', 'Professor de Direito');
  await selecionar('badge_icon', 'graduation-cap');
  const seloDepois = await pagina.evaluate(() =>
    document.querySelector('#ed-gaveta [data-campo="badge_label"] input')?.value || '');
  if (seloDepois !== 'Professor de Direito') nota('DEFEITO', `selo truncado: pedi "Professor de Direito", ficou "${seloDepois}"`);

  await subirImagem('hero', 'hero.jpg', '1400x2096 (retrato)');
  await abrirTodosOsPassos();
  await subirImagem('avatar', 'avatar.jpg', '800x800 (quadrada)');
  await abrirTodosOsPassos();

  await preencher('contact_email', 'contato@profadrianopecanha.com.br');
  await ligarSwitch('show_contact_email', true);
  await abrirTodosOsPassos();
  await preencher('cta_url', 'https://wa.me/5561992440188');

  const ctaLabel = pagina.locator(`${G} [data-campo="cta_label"] input`).first();
  if (await ctaLabel.count()) {
    if (await ctaLabel.isDisabled()) nota('PAGO', 'campo "Texto do botão" (cta_label) desabilitado: o botão publica "Agendar Call" para um professor que vende matrícula');
    else await ctaLabel.fill('Falar sobre a turma');
  } else nota('AUSENTE', 'campo cta_label');

  await preencher('socials', SOCIAIS);
  await preencher('stats', NUMEROS);

  await abrirTodosOsPassos();
  await chips('stacks', DISCIPLINAS);
  await abrirTodosOsPassos();
  await ligarSwitch('show_online_dot', true);
  await abrirTodosOsPassos();
  await ligarSwitch('projects_video_first', true);
  await abrirTodosOsPassos();
  await selecionar('projects_per_page', '3');
  await preencher('seo_title', 'Adriano Peçanha | Direito Constitucional para concursos');
  await preencher('seo_description', 'Professor de Direito Constitucional para concursos em Brasília. Turmas fechadas, discursiva corrigida e 412 alunos aprovados.');

  await tiro('02-perfil-preenchido');
  await writeFile('out/prof-perfil-preenchido.txt', await textoGaveta(), 'utf8');
  await salvar('perfil');
  await esperar(1500);
  await tiro('03-canvas-com-perfil');
}

// ------------------------------------------------------------------ PROJETOS
if (fazer('projetos')) {
  console.log('\n== TRABALHOS (só três) ==');
  await abrirPainelPor('projetos');
  const jaTem = await pagina.evaluate(() =>
    [...document.querySelectorAll('#ed-gaveta .ed-lista-titulo')].map((e) => e.textContent.trim()));
  console.log(`  ja cadastrados: ${jaTem.length ? jaTem.join(', ') : '(nenhum)'}`);

  for (const t of TRABALHOS) {
    if (jaTem.includes(t.name)) { console.log(`  pulando "${t.name}" (ja existe)`); continue; }
    console.log(`  -> ${t.name}`);
    await pagina.locator(`${G} [data-adicionar]`).first().click();
    await esperar(1000);
    await abrirTodosOsPassos();

    await preencher('name', t.name);
    await preencher('category', t.category);
    await preencher('tagline', t.tagline);
    await preencher('problem', t.problem);
    await preencher('solution', t.solution);
    await preencher('features', t.features.join('\n'));
    if (t.video) {
      await preencher('video', t.video);
      await esperar(700);
      const nt = await pagina.evaluate(() =>
        document.querySelector('#ed-gaveta [data-campo="video"] [data-nota-youtube]')?.textContent?.trim() || '');
      console.log(`     youtube: ${nt || '(sem retorno)'}`);
      if (!/reconhecido/i.test(nt)) nota('DEFEITO', `link do YouTube nao reconhecido: ${t.video}`);
    }
    if (t.link) await preencher('link', t.link);
    await abrirTodosOsPassos();
    await chips('stack', t.stack);
    await abrirTodosOsPassos();
    await selecionar('year', t.year);
    await abrirTodosOsPassos();
    await chips('groups', t.groups);
    await abrirTodosOsPassos();
    await subirImagem('image', t.imagem, t.origem);
    await abrirTodosOsPassos();

    await salvar(t.name);
    await esperar(1200);
    if (!(await pagina.locator(`${G} [data-adicionar]`).count())) await abrirPainelPor('projetos');
    await esperar(600);
  }
  await tiro('04-canvas-com-projetos');
}

// -------------------------------------------------------------- EXPERIENCIAS
if (fazer('experiencias')) {
  console.log('\n== EXPERIÊNCIA (seis, o coração desta persona) ==');
  await abrirPainelPor('experiencias');
  const jaTem = await pagina.evaluate(() =>
    [...document.querySelectorAll('#ed-gaveta .ed-lista-sub')].map((e) => e.textContent.trim()));
  await writeFile('out/prof-lista-experiencias-antes.txt', await textoGaveta(), 'utf8');

  // Vocabulario dos DOIS tipos, lado a lado, antes de preencher qualquer coisa.
  if (!jaTem.length) {
    await pagina.locator(`${G} [data-adicionar]`).first().click();
    await esperar(1000);
    const rotulos = {};
    for (const tipo of ['work', 'education']) {
      await escolherBotao('kind', tipo);
      await abrirTodosOsPassos();
      rotulos[tipo] = await pagina.evaluate(() =>
        [...document.querySelectorAll('#ed-gaveta .ed-field')].map((f) => {
          const passo = f.closest('details')?.querySelector('.ed-passo-titulo')?.innerText.trim() || '(1 - sempre aberto)';
          return `<${passo}> ${f.dataset.campo} :: "${(f.querySelector('.ed-label')?.innerText || '').trim()}"` +
            ((f.querySelector('.ed-help')?.innerText || '').trim() ? ` :: ajuda="${f.querySelector('.ed-help').innerText.trim()}"` : '');
        }).join('\n'));
      await tiro(`05-form-${tipo}`);
    }
    await writeFile('out/prof-rotulos-trabalho-vs-estudo.txt',
      `=== kind=work ===\n${rotulos.work}\n\n=== kind=education ===\n${rotulos.education}\n`, 'utf8');
    console.log('  rótulos dos dois tipos em out/prof-rotulos-trabalho-vs-estudo.txt');
    await pagina.keyboard.press('Escape');
    await esperar(800);
    await abrirPainelPor('experiencias');
  }

  for (const x of EXPERIENCIAS) {
    if (jaTem.some((s) => s.startsWith(x.org))) { console.log(`  pulando "${x.org}" (ja existe)`); continue; }
    console.log(`  -> ${x.org} (${x.kind})`);
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
    if (x.logo) {
      await subirImagem('logo', x.logo, x.logoOrigem);
      await abrirTodosOsPassos();
    }

    // Onde o certificado NASCE no formulario muda com o tipo. Registrar isso e o ponto.
    if (x.certificado) {
      const ondeMora = await pagina.evaluate(() => {
        const f = document.querySelector('#ed-gaveta [data-campo="certificate"]');
        if (!f) return '(campo ausente)';
        return f.closest('details')?.querySelector('.ed-passo-titulo')?.innerText.trim() || '(1 - sempre aberto)';
      });
      console.log(`     certificado mora em: ${ondeMora}`);

      if (x.testeGrande) {
        console.log('     testando arquivo grande demais (3,6 MB)...');
        const r = await subirCertificado('cert-grande-3800kb.pdf', { esperaErro: true });
        await writeFile('out/prof-erro-arquivo-grande.txt',
          `arquivo: cert-grande-3800kb.pdf (3.801.010 bytes)\nmensagem na tela: ${JSON.stringify(r?.erro || '(nenhuma)')}\nanexou mesmo assim: ${r?.anexo}\n`, 'utf8');
        await tiro('06-erro-arquivo-grande');
        if (r?.anexo) nota('DEFEITO', 'PDF de 3,6 MB foi aceito pelo editor');
        else if (!r?.erro) nota('DEFEITO', 'PDF grande recusado em silêncio, sem mensagem nenhuma');
        else if (!/3\s*MB/i.test(r.erro)) nota('ATRITO', `mensagem de arquivo grande nao diz o limite: "${r.erro}"`);
        await abrirTodosOsPassos();
      }

      const r = await subirCertificado(x.certificado);
      if (r?.anexo) {
        await abrirTodosOsPassos();
        await preencher('certificate_label', x.certLabel);
        const avisoCpf = await pagina.evaluate(() =>
          document.querySelector('#ed-gaveta .ed-consentimento .ed-help')?.textContent?.trim() || '');
        if (!avisoCpf) nota('DEFEITO', 'caixa de "deixar visível" sem texto de aviso');
        else if (x === EXPERIENCIAS[1]) {
          await writeFile('out/prof-aviso-consentimento.txt', avisoCpf, 'utf8');
          console.log(`     aviso do consentimento: "${avisoCpf}"`);
        }
        if (x.publico) {
          const chk = pagina.locator(`${G} [data-cert-publico]`).first();
          if (!(await chk.count())) nota('AUSENTE', 'caixa de consentimento do certificado');
          else if (await chk.isDisabled()) nota('BLOQUEADO', 'consentimento do certificado veio desabilitado');
          else {
            await chk.click();
            await esperar(600);
            const ligado = await pagina.evaluate(() =>
              document.querySelector('#ed-gaveta [data-cert-publico]')?.getAttribute('aria-checked'));
            if (ligado !== 'true') nota('DEFEITO', 'cliquei em "deixar visível" e a caixa nao ligou');
          }
        }
        await tiro(`07-certificado-${x.kind}`);
        await abrirTodosOsPassos();
      }
    }

    await salvar(x.org);
    await esperar(1200);
    if (!(await pagina.locator(`${G} [data-adicionar]`).count())) await abrirPainelPor('experiencias');
    await esperar(600);
  }

  await writeFile('out/prof-lista-experiencias-depois.txt', await textoGaveta(), 'utf8');
  await tiro('08-lista-6-experiencias');
  await tiro('09-canvas-com-experiencia', true);
}

// ------------------------------------------------------------------ CONSERTO
// Existe por causa do defeito 1: os ouvintes empilham a cada repintura, entao SO O PRIMEIRO
// clique de alternancia de cada abertura de formulario funciona. Aqui cada abertura gasta o
// unico clique que ela tem, e o resto e digitacao (que nao repinta).
async function abrirExperienciaPor(org) {
  await abrirPainelPor('experiencias');
  await esperar(900);
  const id = await pagina.evaluate((o) => {
    const li = [...document.querySelectorAll('#ed-gaveta .ed-lista-item')]
      .find((x) => (x.querySelector('.ed-lista-sub')?.textContent || '').startsWith(o));
    return li?.querySelector('[data-editar]')?.dataset.editar || '';
  }, org);
  if (!id) { nota('AUSENTE', `nao achei "${org}" na lista para editar`); return false; }
  await pagina.click(`${G} [data-editar="${id}"]`);
  await esperar(1200);
  await abrirTodosOsPassos();
  return true;
}

if (fazer('consertar')) {
  console.log('\n== CONSERTO (contornando o empilhamento de ouvintes) ==');

  // 1) As tres entradas de estudo ficaram "Desde <ano>" porque o switch morreu no 2o clique.
  for (const [org, fim] of [
    ['Universidade de Brasília', '12/2014'],
    ['Universidade do Estado do Rio de Janeiro', '12/2009'],
    ['Escola da Advocacia-Geral da União', '04/2012'],
  ]) {
    if (!(await abrirExperienciaPor(org))) continue;
    const antes = await pagina.evaluate(() =>
      document.querySelector('#ed-gaveta [data-switch="atual"]')?.getAttribute('aria-checked'));
    await pagina.locator(`${G} [data-switch="atual"]`).first().click(); // o unico clique da abertura
    await esperar(700);
    await abrirTodosOsPassos();
    const nasceu = await pagina.locator(`${G} [data-campo="period_end"]`).count();
    console.log(`  ${org}: atual ${antes} -> ${await pagina.evaluate(() => document.querySelector('#ed-gaveta [data-switch="atual"]')?.getAttribute('aria-checked'))}, campo "Até" ${nasceu ? 'apareceu' : 'NAO apareceu'}`);
    if (nasceu) await preencher('period_end', fim);
    await salvar(`${org} (fim ${fim})`);
    await esperar(1200);
  }

  // 2) Rotulo do botao do certificado. E input de texto, nao repinta, entao cabe junto.
  for (const [org, rotulo] of [
    ['Universidade de Brasília', 'Diploma de mestrado'],
    ['Advocacia-Geral da União', 'Termo de posse'],
    ['Universidade do Estado do Rio de Janeiro', 'Diploma de graduação'],
  ]) {
    if (!(await abrirExperienciaPor(org))) continue;
    const campo = pagina.locator(`${G} #ed-cert-label`).first();
    if (!(await campo.count())) { nota('AUSENTE', `campo de rotulo do certificado em ${org}`); continue; }
    await campo.fill(rotulo);
    await esperar(300);
    // O consentimento da UnB nao ligou na primeira passada: gasta o clique unico aqui.
    if (org === 'Universidade de Brasília') {
      const chk = pagina.locator(`${G} [data-cert-publico]`).first();
      await chk.click();
      await esperar(700);
      const st = await pagina.evaluate(() =>
        document.querySelector('#ed-gaveta [data-cert-publico]')?.getAttribute('aria-checked'));
      console.log(`  consentimento da UnB agora: ${st}`);
      if (st !== 'true') nota('DEFEITO', 'consentimento da UnB continua desligado mesmo com formulario recem-aberto');
    }
    await salvar(`${org} (rótulo "${rotulo}")`);
    await esperar(1200);
  }

  await abrirPainelPor('experiencias');
  await esperar(900);
  await writeFile('out/prof-lista-experiencias-consertada.txt', await textoGaveta(), 'utf8');
  await tiro('08b-lista-consertada');
  await pagina.keyboard.press('Escape');
  await esperar(600);
}

// ------------------------------------------------------------------- ORDEM
if (fazer('ordem')) {
  console.log('\n== ORDENAÇÃO POR PERÍODO ==');
  await abrirPainelPor('experiencias');
  await esperar(800);
  const antes = await pagina.evaluate(() =>
    [...document.querySelectorAll('#ed-gaveta .ed-lista-sub')].map((e) => e.textContent.trim()));
  console.log('  ordem antes:');
  antes.forEach((l, i) => console.log(`    ${i + 1}. ${l}`));

  const btn = pagina.locator(`${G} [data-sugerir-ordem]`).first();
  if (!(await btn.count())) nota('AUSENTE', 'botao de ordenar por periodo');
  else {
    await btn.click();
    await esperar(900);
    const previa = await pagina.evaluate(() =>
      [...document.querySelectorAll('#ed-gaveta .ed-lista-sub')].map((e) => e.textContent.trim()));
    console.log('  prévia sugerida:');
    previa.forEach((l, i) => console.log(`    ${i + 1}. ${l}`));
    await tiro('10-ordem-previa');
    await pagina.locator(`${G} [data-aplicar-ordem]`).first().click();
    await esperar(2500);
    const depois = await pagina.evaluate(() =>
      [...document.querySelectorAll('#ed-gaveta .ed-lista-sub')].map((e) => e.textContent.trim()));
    console.log('  ordem depois de aplicar:');
    depois.forEach((l, i) => console.log(`    ${i + 1}. ${l}`));
    await writeFile('out/prof-ordem.txt',
      `ANTES\n${antes.join('\n')}\n\nPREVIA\n${previa.join('\n')}\n\nDEPOIS\n${depois.join('\n')}\n`, 'utf8');
    if (JSON.stringify(previa) !== JSON.stringify(depois)) nota('DEFEITO', 'a ordem aplicada nao bate com a previa mostrada');
  }
  await pagina.keyboard.press('Escape');
  await esperar(600);
}

// ------------------------------------------------------------------ PUBLICAR
if (fazer('publicar')) {
  console.log('\n== PUBLICAR ==');
  await abrirPainelPor('publicar');
  await esperar(900);
  const antes = await textoGaveta();
  await writeFile('out/prof-publicar-antes.txt', antes, 'utf8');
  console.log(antes.slice(0, 1200));
  await tiro('11-publicar-antes');

  // Link de previa ANTES de publicar: e por ele que se confere a pagina enquanto a primeira
  // publicacao esta na fila de revisao humana.
  const gerar = pagina.locator(`${G} [data-girar-previa]`).first();
  if (await gerar.count()) {
    await gerar.click();
    await esperar(2500);
    const url = await pagina.evaluate(() => document.querySelector('#ed-gaveta [data-previa-url]')?.value || '');
    if (url) { await writeFile('out/prof-previa-url.txt', url, 'utf8'); console.log(`  prévia: ${url}`); }
    else nota('DEFEITO', 'botao de gerar previa nao devolveu link');
  } else nota('AUSENTE', 'botao de gerar previa');

  const btn = pagina.locator(`${G} [data-publicar]`).first();
  if (!(await btn.count())) nota('AUSENTE', 'botao Publicar');
  else if (await btn.isDisabled()) nota('BLOQUEIO', 'botao Publicar veio desabilitado');
  else {
    await btn.click();
    await esperar(8000);
    const depois = await textoGaveta();
    await writeFile('out/prof-publicar-depois.txt', depois, 'utf8');
    console.log('--- depois ---');
    console.log(depois.slice(0, 1200));
    await tiro('12-publicar-depois');
  }
}

// ------------------------------------------------- CERTIFICADO DENTRO DO EDITOR
// Isola a falha: se o "Abrir" do editor entrega o arquivo, o documento esta inteiro no
// Storage e quem esta quebrado e so a rota publica.
if (fazer('certeditor')) {
  console.log('\n== "ABRIR" DO CERTIFICADO, DENTRO DO EDITOR ==');
  const relatorio = [];
  for (const org of ['Universidade de Brasília', 'Advocacia-Geral da União', 'Universidade do Estado do Rio de Janeiro']) {
    if (!(await abrirExperienciaPor(org))) continue;
    // O caminho honesto e o botao mesmo: ele abre aba nova.
    const [nova] = await Promise.all([
      pagina.context().waitForEvent('page', { timeout: 15000 }).catch(() => null),
      pagina.locator(`${G} [data-cert-abrir]`).first().click(),
    ]);
    if (!nova) { nota('DEFEITO', `"Abrir" do certificado de ${org} nao abriu aba nenhuma`); continue; }
    for (let i = 0; i < 20 && (!nova.url() || nova.url() === 'about:blank'); i += 1) await esperar(400);
    const endereco = nova.url();
    if (!endereco || endereco === 'about:blank') {
      nota('DEFEITO', `"Abrir" do certificado de ${org} abriu uma aba em branco`);
      await nova.close();
      await pagina.keyboard.press('Escape');
      await esperar(700);
      continue;
    }
    const r = await pagina.evaluate(async (u) => {
      try {
        const resp = await fetch(u);
        return { status: resp.status, tipo: resp.headers.get('content-type') || '', tam: (await resp.blob()).size };
      } catch (e) { return { erro: String(e).slice(0, 160) }; }
    }, endereco).catch((e) => ({ erro: String(e).slice(0, 160) }));
    console.log(`  ${org}: ${endereco.slice(0, 70)}... -> ${JSON.stringify(r)}`);
    relatorio.push({ org, endereco: endereco.slice(0, 120), ...r });
    if (r.status !== 200) nota('DEFEITO', `"Abrir" do certificado de ${org} respondeu ${r.status || r.erro}`);
    await nova.close();
    await pagina.keyboard.press('Escape');
    await esperar(700);
  }
  await writeFile('out/prof-certificado-abrir-editor.txt', JSON.stringify(relatorio, null, 2), 'utf8');
}

// -------------------------------------------------------------- PAGINA PUBLICA
if (fazer('publico')) {
  console.log('\n== PÁGINA PÚBLICA (pela prévia) ==');
  let url = '';
  try { url = (await (await import('node:fs/promises')).readFile('out/prof-previa-url.txt', 'utf8')).trim(); } catch {}
  if (!url) {
    await abrirPainelPor('publicar');
    await esperar(700);
    await pagina.locator(`${G} [data-girar-previa]`).first().click();
    await esperar(2500);
    url = await pagina.evaluate(() => document.querySelector('#ed-gaveta [data-previa-url]')?.value || '');
    if (url) await writeFile('out/prof-previa-url.txt', url, 'utf8');
  }
  if (!url) nota('BLOQUEIO', 'sem link de previa, nao da para conferir a pagina publica');
  else {
    const ctx = pagina.context();
    const p = await ctx.newPage();
    const errosPub = [];
    p.on('pageerror', (e) => errosPub.push(`pageerror: ${String(e).slice(0, 200)}`));
    p.on('console', (msg) => { if (msg.type() === 'error') errosPub.push(`console: ${msg.text().slice(0, 200)}`); });
    await p.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
    await esperar(2500);
    await p.screenshot({ path: 'out/prof-13-publica-inteira.png', fullPage: true });
    const texto = await p.evaluate(() => document.body.innerText);
    await writeFile('out/prof-publica-texto.txt', texto, 'utf8');

    const botoes = await p.evaluate(() =>
      [...document.querySelectorAll('#experiencia a[href*="/certificado/"]')].map((a) => ({ href: a.href, texto: a.innerText.trim() })));
    console.log(`  botões de certificado na página: ${botoes.length}`);
    botoes.forEach((b) => console.log(`    "${b.texto}" -> ${b.href}`));
    await writeFile('out/prof-botoes-certificado.txt', JSON.stringify(botoes, null, 2), 'utf8');
    if (!botoes.length) nota('DEFEITO', 'nenhum botao de certificado saiu na pagina, mesmo com tres consentimentos ligados');

    // Fotografa a secao de experiencia inteira: e a que esta persona veio medir.
    const sec = await p.locator('#experiencia').first();
    if (await sec.count()) await sec.screenshot({ path: 'out/prof-14-secao-experiencia.png' });
    else nota('DEFEITO', 'secao #experiencia nao existe na pagina publica');

    // O teste que so vale se for feito de verdade: clicar e ver se o arquivo abre.
    const relatorioCert = [];
    for (const b of botoes) {
      const r = await p.evaluate(async (href) => {
        try {
          const resp = await fetch(href, { redirect: 'follow' });
          return { status: resp.status, tipo: resp.headers.get('content-type') || '', url: resp.url.slice(0, 120), tam: (await resp.blob()).size };
        } catch (e) { return { erro: String(e).slice(0, 200) }; }
      }, b.href);
      console.log(`    ${b.texto}: ${JSON.stringify(r)}`);
      relatorioCert.push({ botao: b.texto, href: b.href, ...r });
      if (r.erro || r.status !== 200) nota('DEFEITO', `"Ver certificado" (${b.texto}) nao abriu: ${JSON.stringify(r)}`);
      else if (!/pdf|image/i.test(r.tipo)) nota('DEFEITO', `certificado "${b.texto}" respondeu content-type ${r.tipo}`);
    }
    await writeFile('out/prof-certificado-abriu.txt', JSON.stringify(relatorioCert, null, 2), 'utf8');

    // Certificado NAO consentido nao pode vazar: confere que a rota recusa.
    const semConsentimento = await p.evaluate(async (base) => {
      const r = await fetch(`${new URL(base).origin}/certificado/nao-existe-esse-slug`, { redirect: 'follow' });
      return { status: r.status };
    }, url);
    console.log(`  rota de certificado com slug inexistente: ${JSON.stringify(semConsentimento)}`);

    if (errosPub.length) {
      console.log('  erros na pagina publica:');
      console.log([...new Set(errosPub)].join('\n'));
      await writeFile('out/prof-erros-publica.txt', [...new Set(errosPub)].join('\n'), 'utf8');
    }
    await p.close();
  }
}

// -------------------------------------------------------------------- LEITURA
if (fazer('ler') || ETAPA === 'tudo') {
  console.log('\n== CANVAS ==');
  const canvas = await pagina.evaluate(() => document.getElementById('ed-canvas')?.innerText || '');
  await writeFile('out/prof-canvas.txt', canvas, 'utf8');
  console.log(canvas.slice(0, 1800));
  await tiro('15-canvas-inteiro', true);
}

console.log('\n== ERROS DE CONSOLE E REDE ==');
console.log(erros.length ? [...new Set(erros)].join('\n') : '(nenhum)');
await writeFile('out/prof-erros.txt', [...new Set(erros)].join('\n'), 'utf8');
console.log('\n== ATRITO COLETADO ==');
console.log(atrito.length ? atrito.join('\n') : '(nenhum)');
await writeFile('out/prof-atrito.txt', atrito.join('\n'), 'utf8');

await navegador.close();
