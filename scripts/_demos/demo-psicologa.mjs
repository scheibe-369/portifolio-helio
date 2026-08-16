// Persona: Bianca Fontes, psicologa clinica (slug demo-psicologa).
//
// O QUE ESTA PERSONA EXISTE PARA QUEBRAR: um portfolio LEGITIMO com ZERO trabalhos. Psicologo
// nao expoe caso clinico, por sigilo profissional (Codigo de Etica do CFP, arts. 9 a 13, e a
// Resolucao CFP 01/2009 sobre registro documental). Ela tem formacao, abordagem, publico
// atendido e um jeito de agendar. Mais nada. Se o produto obriga a ter projeto, ou fica com
// buraco sem eles, e isso que precisa aparecer.
//
// A grade de trabalhos fica VAZIA DE PROPOSITO. Inventar "casos de sucesso" para preencher
// seria antietico na profissao dela e esconderia justamente o achado.
//
// Uso:
//   node scripts/_demos/demo-psicologa.mjs                      roda tudo
//   node scripts/_demos/demo-psicologa.mjs listeners            roda so uma etapa
//   node scripts/_demos/demo-psicologa.mjs perfil experiencias  roda as duas
import { writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { abrirEditor, esperar } from './base.mjs';

const SLUG = 'demo-psicologa';
const MIDIA = (n) => resolve(process.cwd(), 'out/midia/demo-psicologa', n);
const SHOT = (n) => resolve(process.cwd(), 'out', `psi-${n}.png`);

const pedidas = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const rodar = (nome) => pedidas.length === 0 || pedidas.includes(nome);

const t0 = Date.now();
const diario = [];
const nota = (etapa, texto) => {
  const linha = `[${String(Math.round((Date.now() - t0) / 1000)).padStart(4)}s] ${etapa} :: ${texto}`;
  console.log(linha);
  diario.push(linha);
};

const { pagina: p, navegador, demo, erros, APEX } = await abrirEditor(SLUG, { headless: true });
nota('boot', `editor aberto para ${demo.nome} (${demo.profissao}) | etapas: ${pedidas.length ? pedidas.join(',') : 'todas'}`);

// ----------------------------------------------------------------- utilitarios do editor
const texto = () => p.evaluate(() => document.body.innerText);
const gaveta = () => p.evaluate(() => document.querySelector('[data-gaveta-corpo]')?.innerText || '(sem gaveta)');
const foto = (n) => p.screenshot({ path: SHOT(n), fullPage: false });
const fotoInteira = (n) => p.screenshot({ path: SHOT(n), fullPage: true });

const abrirPainel = async (chave) => {
  await p.click(`[data-abrir="${chave}"]`);
  await esperar(1400);
};

const abrirPasso = async (n) => {
  const d = p.locator(`details[data-passo="${n}"]`).first();
  if (!(await d.count())) return false;
  if (!(await d.evaluate((e) => e.open))) {
    await d.locator('summary').first().click();
    await esperar(400);
  }
  return true;
};

const existe = (sel) => p.evaluate((s) => Boolean(document.querySelector(s)), sel);

const preencher = async (key, valor) => {
  const el = p.locator(`#ed-${key}`).first();
  if (!(await el.count())) { nota('campo', `AUSENTE: #ed-${key}`); return false; }
  await el.fill(String(valor));
  await esperar(220);
  return true;
};

const estadoSwitch = (key) =>
  p.evaluate((k) => document.querySelector(`[data-switch="${k}"]`)?.classList.contains('is-on') ?? null, key);

// Clica UMA vez e devolve o antes e o depois. Nao insiste: a insistencia esconderia o defeito
// que este script existe para medir.
const clicarSwitch = async (key) => {
  const antes = await estadoSwitch(key);
  if (antes === null) return { antes: null, depois: null };
  await p.locator(`[data-switch="${key}"]`).first().click();
  await esperar(700);
  return { antes, depois: await estadoSwitch(key) };
};

const escolher = async (key, valor) => {
  const b = p.locator(`[data-escolha="${key}"][data-valor="${valor}"]`).first();
  if (!(await b.count())) { nota('campo', `BOTAO AUSENTE: ${key}=${valor}`); return; }
  await b.click();
  await esperar(700);
};

const chips = async (key, lista) => {
  for (const txt of lista) {
    const inp = p.locator(`[data-chip-add="${key}"]`).first();
    if (!(await inp.count()) || (await inp.isDisabled())) { nota('campo', `CHIP bloqueado em ${key} (${txt})`); return; }
    await inp.fill(txt);
    await inp.press('Enter');
    await esperar(400);
  }
};

const erroDoCampo = (key) =>
  p.evaluate((k) => document.querySelector(`[data-campo="${k}"] [data-erro]`)?.textContent?.trim() || '', key);

const previaDoCampo = (key) =>
  p.evaluate((k) => {
    const img = document.querySelector(`[data-campo="${k}"] .ed-drop-previa`);
    if (!img) return null;
    const r = img.getBoundingClientRect();
    return { src: img.src, decodificou: img.naturalWidth > 0, natural: `${img.naturalWidth}x${img.naturalHeight}`, exibida: `${Math.round(r.width)}x${Math.round(r.height)}` };
  }, key);

// Sobe um arquivo e espera de VERDADE: a previa antiga so vale como "pronto" se o src mudou e
// a imagem nova ja decodificou. Sem isso o proprio script se engana com a previa anterior.
const subirImagem = async (key, arquivo, esperaMs = 25000) => {
  const antes = (await previaDoCampo(key))?.src || '';
  const inp = p.locator(`input[data-arquivo="${key}"]`).first();
  if (!(await inp.count())) { nota('upload', `INPUT AUSENTE: ${key}`); return { erro: 'input ausente' }; }
  await inp.setInputFiles(arquivo);
  const limite = Date.now() + esperaMs;
  let msg = '';
  while (Date.now() < limite) {
    await esperar(600);
    msg = await erroDoCampo(key);
    const previa = await previaDoCampo(key);
    if (previa && previa.src !== antes && previa.decodificou) return { erro: msg, previa };
    if (msg && msg !== 'convertendo e enviando...' && msg !== 'enviando...') return { erro: msg, previa };
  }
  return { erro: msg || '(silencio)', previa: await previaDoCampo(key), timeout: true };
};

const salvar = async (rotulo) => {
  const btn = p.locator('#ed-form-salvar').first();
  if (!(await btn.count())) { nota('salvar', `BOTAO AUSENTE em ${rotulo}`); return false; }
  await btn.click();
  const limite = Date.now() + 40000;
  while (Date.now() < limite) {
    await esperar(600);
    if (!(await existe('#ed-gaveta.is-open'))) { nota('salvar', `${rotulo}: salvo`); return true; }
    const msg = await p.evaluate(() => document.querySelector('#ed-form-msg')?.textContent?.trim() || '');
    if (msg && msg !== 'salvando...') nota('salvar', `${rotulo}: MENSAGEM "${msg}"`);
  }
  nota('salvar', `${rotulo}: TIMEOUT, a gaveta nao fechou`);
  return false;
};

const fechar = async () => {
  await p.evaluate(() => document.querySelector('[data-gaveta-fechar]')?.click());
  await esperar(900);
};

const passo = async (nome, fn) => {
  if (!rodar(nome)) return;
  try { await fn(); } catch (e) { nota('ERRO', `${nome} :: ${String(e).slice(0, 300)}`); }
};

// ================================================================= canvas: o editor vazio
await passo('canvas', async () => {
  await foto('01-editor-vazio');
  nota('canvas', `texto da tela:\n${await texto()}`);
  const blocos = await p.evaluate(() =>
    [...document.querySelectorAll('.ed-bloco-vazio')].map((b) => b.innerText.replace(/\n+/g, ' | ')));
  nota('canvas', `blocos de estado vazio:\n${blocos.join('\n')}`);
});

// ================================================================= listeners: o probe
//
// HIPOTESE, levantada na primeira passada: repintarCorpo() troca o innerHTML do MESMO
// elemento e chama ligar() de novo, entao ligarFormulario() pendura mais um jogo de
// listeners no mesmo no a cada repintura. Switch e alternancia, nao atribuicao: com N
// listeners um clique alterna N vezes. Com N par, o switch parece morto.
//
// O teste e o mais simples possivel: abrir o perfil recem aberto (1 jogo), clicar UMA vez no
// mesmo switch tres vezes seguidas e ver se ele alterna nas tres.
await passo('listeners', async () => {
  await abrirPainel('perfil');
  await abrirPasso(3);
  const seq = [];
  for (let i = 0; i < 4; i += 1) {
    const r = await clicarSwitch('show_online_dot');
    seq.push(`clique ${i + 1}: ${r.antes} -> ${r.depois}${r.antes === r.depois ? '  (NAO MUDOU)' : ''}`);
  }
  nota('listeners', `switch "Mostrar a bolinha de disponivel", quatro cliques seguidos:\n${seq.join('\n')}`);

  // O mesmo em campo de texto, para separar "o switch esta quebrado" de "o formulario inteiro
  // esta quebrado": texto e atribuicao, entao ele sobrevive a listener repetido.
  const antesTexto = await p.evaluate(() => document.querySelector('#ed-seo_title')?.value || '(sem campo)');
  nota('listeners', `campo de texto continua funcionando? valor atual: "${antesTexto}"`);
  await foto('19-probe-listeners');
  await fechar();
});

// Conta os PUT/POST que chegam ao Storage. Serve para medir a segunda consequencia do
// listener repetido: o handler de `change` do input de arquivo tambem se duplica, entao um
// unico "escolher imagem" pode virar varios uploads da mesma imagem, e a cota do produto e
// paga uma vez e vale para sempre.
let uploads = [];
p.on('request', (r) => {
  if (/\/storage\/v1\/object\//.test(r.url()) && ['POST', 'PUT'].includes(r.method())) {
    uploads.push(`${r.method()} ${r.url().split('/object/')[1]?.split('?')[0] || ''}`);
  }
});
const contarUploads = () => { const n = uploads.slice(); uploads = []; return n; };

// ================================================================= imagem: o teste do arquivo minusculo
await passo('imagem', async () => {
  await abrirPainel('perfil');
  contarUploads();
  const r1 = await subirImagem('hero', MIDIA('avatar-minusculo.jpg'));
  nota('imagem-minuscula', `128x128 no campo "Sua foto grande" (destino hero, lado 1000) -> erro="${r1.erro}" previa=${JSON.stringify(r1.previa)}`);
  nota('rede', `1o upload da gaveta, requisicoes ao Storage: ${JSON.stringify(contarUploads())}`);
  const noCanvas = await p.evaluate(() => {
    const img = document.querySelector('#ed-canvas img[alt*="Bianca"], #ed-canvas .rounded-3xl img');
    if (!img) return null;
    const r = img.getBoundingClientRect();
    return { natural: `${img.naturalWidth}x${img.naturalHeight}`, exibida: `${Math.round(r.width)}x${Math.round(r.height)}` };
  });
  nota('imagem-minuscula', `como ficou no canvas atras da gaveta: ${JSON.stringify(noCanvas)}`);
  await foto('20-hero-minusculo');

  const r2 = await subirImagem('avatar', MIDIA('avatar-minusculo.jpg'));
  nota('imagem-minuscula', `128x128 no campo "Foto pequena" (destino avatar, lado 512) -> erro="${r2.erro}" previa=${JSON.stringify(r2.previa)}`);
  nota('rede', `2o upload da gaveta, requisicoes ao Storage: ${JSON.stringify(contarUploads())}`);

  // devolve as fotos boas, porque a pagina entregue tem que ser digna
  const r3 = await subirImagem('hero', MIDIA('hero-bianca.jpg'));
  nota('upload', `hero 1400x2100 -> erro="${r3.erro}" previa=${JSON.stringify(r3.previa)}`);
  nota('rede', `3o upload da gaveta, requisicoes ao Storage: ${JSON.stringify(contarUploads())}`);
  const r4 = await subirImagem('avatar', MIDIA('retrato-2.jpg'));
  nota('upload', `avatar 1400x2100 -> erro="${r4.erro}" previa=${JSON.stringify(r4.previa)}`);
  nota('rede', `4o upload da gaveta, requisicoes ao Storage: ${JSON.stringify(contarUploads())}`);
  await salvar('perfil (fotos)');
});

// ================================================================= arrumar1: consertar a 1a entrada
// A primeira passada cadastrou o bacharelado com "ainda estou cursando" LIGADO, porque o
// clique no switch veio depois de uma repintura e alternou duas vezes. A pagina publicou
// "Bacharelado em Psicologia, desde 2012", que e uma afirmacao falsa sobre formacao.
await passo('arrumar1', async () => {
  await abrirPainel('experiencias');
  const alvo = await p.evaluate(() => {
    const li = [...document.querySelectorAll('.ed-lista-item')].find((x) => x.innerText.includes('Bacharelado'));
    return li ? li.dataset.item : null;
  });
  if (!alvo) { nota('arrumar1', 'nao achei a entrada do bacharelado'); return; }
  await p.locator(`[data-editar="${alvo}"]`).first().click();
  await esperar(1200);
  const r = await clicarSwitch('atual');
  nota('arrumar1', `switch "ainda estou cursando": ${r.antes} -> ${r.depois}`);
  if (await existe('#ed-period_end')) await preencher('period_end', '2016');
  await salvar('bacharelado corrigido');
});

// ================================================================= perfil
await passo('perfil', async () => {
  await abrirPainel('perfil');
  await foto('02-perfil-passo1');
  nota('perfil', `formulario do perfil, tela inteira:\n${await gaveta()}`);

  if (!(await previaDoCampo('hero'))) {
    const r = await subirImagem('hero', MIDIA('hero-bianca.jpg'));
    nota('upload', `hero -> erro="${r.erro}"`);
  }
  if (!(await previaDoCampo('avatar'))) {
    const r = await subirImagem('avatar', MIDIA('retrato-2.jpg'));
    nota('upload', `avatar -> erro="${r.erro}"`);
  }

  await preencher('display_name', 'Bianca Fontes');
  await preencher('role', 'Psicóloga clínica · Terapia cognitivo-comportamental · Atendimento online');
  await preencher(
    'bio',
    [
      'Sou psicóloga clínica (CRP 06/148372) e atendo adultos em terapia cognitivo-comportamental, online, de qualquer lugar do Brasil.',
      'Trabalho com ansiedade, crises de pânico, esgotamento no trabalho e as fases em que a vida muda de lugar: uma mudança de carreira, um luto, o fim de uma relação.',
      'Meu jeito de conduzir é direto e sem jargão. A gente combina o foco do processo nas primeiras sessões, e você acompanha o que está mudando sessão a sessão.',
      'A primeira conversa é de 20 minutos, sem custo, e serve para você sentir se faz sentido continuar comigo. Se não fizer, eu indico alguém.',
    ].join('\n\n'),
  );
  await preencher('badge_label', 'Psicóloga clínica');
  await p.locator('#ed-badge_icon').first().selectOption('brain').catch(() => nota('selo', 'nao consegui escolher "brain"'));
  await esperar(300);
  await foto('04-perfil-preenchido');

  await abrirPasso(2);
  await preencher('contact_email', 'contato@biancafontes.psi.br');
  const ctaBloqueado = await p.evaluate(() => document.querySelector('#ed-cta_label')?.disabled ?? null);
  nota('perfil', `campo "Texto do botão" (bump de personalização) desabilitado? ${ctaBloqueado}`);
  await preencher('cta_url', 'https://calendly.com/biancafontes-psi/primeira-conversa');
  await preencher('cta_label', 'Agendar sessão');
  await preencher(
    'socials',
    [
      'Instagram | @bianca.psi | https://instagram.com/bianca.psi',
      'WhatsApp | (11) 98812-4470 | https://wa.me/5511988124470',
      'Site | biancafontes.psi.br | https://biancafontes.psi.br',
    ].join('\n'),
  );
  await preencher('stats', ['CRP | 06/148372', 'Clínica | 8 anos', 'Atendimento | Online'].join('\n'));
  await foto('05-perfil-passo2');

  await abrirPasso(3);
  const jaTemChips = await p.evaluate(() => document.querySelectorAll('[data-chips="stacks"] .ed-chip').length);
  if (!jaTemChips) {
    await chips('stacks', [
      'Terapia cognitivo-comportamental', 'Terapia do esquema', 'ACT', 'Mindfulness',
      'Ansiedade', 'Síndrome do pânico', 'Burnout', 'Luto', 'Adultos', 'Atendimento online',
    ]);
  }
  await foto('06-perfil-passo3');

  await abrirPasso('fino');
  await preencher('seo_title', 'Bianca Fontes · Psicóloga clínica online (CRP 06/148372)');
  await preencher(
    'seo_description',
    'Terapia cognitivo-comportamental para adultos, online. Ansiedade, pânico, burnout e luto. Primeira conversa de 20 minutos sem custo.',
  );
  await foto('07-perfil-fino');
  await salvar('perfil');
  await esperar(1500);
  await foto('08-canvas-com-perfil');
});

// ================================================================= trabalhos: aberto e fechado vazio
await passo('trabalhos', async () => {
  await abrirPainel('projetos');
  nota('trabalhos', `painel "Meus projetos" com a lista vazia:\n${await gaveta()}`);
  await foto('09-projetos-vazio');
  await fechar();
});

// ================================================================= experiencias
const EXPERIENCIAS = [
  {
    kind: 'education', org: 'Universidade Federal de São Paulo',
    role: 'Bacharelado em Psicologia', inicio: '2012', fim: '2016', atual: false,
    local: 'São Paulo, SP',
    highlights: [
      'Estágio em clínica-escola com atendimento a adultos de baixa renda',
      'Iniciação científica em transtornos de ansiedade',
    ],
    nota: 'Formação de base, com dois anos de estágio supervisionado em clínica-escola.',
  },
  {
    kind: 'education', org: 'Instituto de Terapia Cognitivo-Comportamental de São Paulo',
    role: 'Formação em Terapia Cognitivo-Comportamental', inicio: '2017', fim: '2019', atual: false,
    local: 'São Paulo, SP',
    highlights: [
      '480 horas entre teoria, prática supervisionada e estudo de protocolo',
      'Protocolos para transtorno de ansiedade generalizada e para pânico',
    ],
    nota: 'É a formação que define como eu conduzo o processo até hoje.',
    certificado: 'certificado-tcc.pdf', certificadoRotulo: 'Ver certificado',
  },
  {
    kind: 'education', org: 'PUC-SP',
    role: 'Especialização em Saúde Mental', inicio: '2020', fim: '2021', atual: false,
    local: 'São Paulo, SP',
    highlights: ['Trabalho de conclusão sobre esgotamento profissional em equipes de saúde'],
    nota: '',
  },
  {
    kind: 'work', org: 'Clínica Espaço Sereno',
    role: 'Psicóloga clínica', inicio: '2017', fim: '2022', atual: false,
    local: 'São Paulo, SP',
    highlights: [
      'Atendimento a adultos em consultório, com agenda cheia a partir do segundo ano',
      'Grupo terapêutico quinzenal para manejo de ansiedade',
    ],
    nota: 'Cinco anos de consultório presencial antes de migrar para o atendimento online.',
  },
  {
    kind: 'work', org: 'Consultório próprio, atendimento online',
    role: 'Psicóloga clínica e supervisora', inicio: '2022', atual: true,
    local: 'Online, todo o Brasil',
    highlights: [
      'Terapia cognitivo-comportamental para adultos, em sessões semanais',
      'Supervisão clínica para psicólogas em início de carreira',
    ],
    nota: 'Atendo por videochamada, com prontuário e sigilo nos mesmos termos do presencial.',
  },
];

await passo('experiencias', async () => {
  await abrirPainel('experiencias');
  const jaTem = await p.evaluate(() => document.querySelectorAll('.ed-lista-item').length);
  nota('experiencia', `painel aberto, ${jaTem} entradas ja cadastradas:\n${await gaveta()}`);
  if (!jaTem) await foto('10-experiencias-vazio');
  await fechar();

  for (let i = jaTem; i < EXPERIENCIAS.length; i += 1) {
    const x = EXPERIENCIAS[i];
    // Reabrir o painel a cada volta NAO e capricho do script: salvar fecha a gaveta inteira e
    // devolve o comprador ao canvas, entao cadastrar cinco formacoes e cinco idas ao topo.
    await abrirPainel('experiencias');
    await p.locator('[data-adicionar]').first().click();
    await esperar(1100);

    // O switch VEM PRIMEIRO, com a gaveta recem pintada: e o unico instante em que existe um
    // jogo so de listeners e em que um clique alterna uma vez so.
    if (!x.atual) {
      const r = await clicarSwitch('atual');
      nota('experiencia', `${x.org}: switch "ate hoje" ${r.antes} -> ${r.depois}`);
    }
    const temFim = await existe('#ed-period_end');
    nota('experiencia', `${x.org}: campo "Até" apareceu? ${temFim}`);

    if (x.kind === 'education') await escolher('kind', 'education');
    await preencher('org', x.org);
    await preencher('role', x.role);
    await preencher('period_start', x.inicio);
    if (!x.atual && (await existe('#ed-period_end'))) await preencher('period_end', x.fim);

    await abrirPasso(2);
    await preencher('location', x.local);
    await preencher('highlights', x.highlights.join('\n'));

    if (x.certificado) {
      const inp = p.locator('input[data-cert-input]').first();
      if (await inp.count()) {
        await inp.setInputFiles(MIDIA(x.certificado));
        await esperar(8000);
        nota('certificado', `${x.org}: mensagem do campo "${await erroDoCampo('certificate')}"`);
        nota('certificado', `bloco do certificado:\n${await p.evaluate(() => document.querySelector('[data-campo="certificate"]')?.innerText || '(nao achei)')}`);
        if (x.certificadoRotulo) await p.locator('#ed-cert-label').first().fill(x.certificadoRotulo).catch(() => {});
        await foto('11-certificado');
      } else {
        nota('certificado', `${x.org}: NAO ACHEI o input de certificado`);
      }
    }

    await abrirPasso(3);
    if (x.nota) await preencher('note', x.nota);
    await salvar(`experiencia ${i + 1} (${x.org})`);
    await esperar(1200);
  }

  await abrirPainel('experiencias');
  nota('experiencia', `lista final:\n${await gaveta()}`);
  await foto('12-experiencias-cheias');
  await fechar();
  await esperar(800);
  await fotoInteira('13-canvas-completo');
});

// ================================================================= consentimento do certificado
// Separado de proposito: a caixa e ALTERNANCIA, e depois do upload do PDF a gaveta ja foi
// repintada. Reabrir a entrada e a unica forma de clicar nela com um jogo so de listeners.
await passo('consent', async () => {
  await abrirPainel('experiencias');
  const alvo = await p.evaluate(() => {
    const li = [...document.querySelectorAll('.ed-lista-item')]
      .find((x) => x.innerText.includes('Cognitivo-Comportamental') || x.innerText.includes('certificado'));
    return li ? li.dataset.item : null;
  });
  if (!alvo) { nota('certificado', 'nao achei a entrada com certificado na lista'); return; }
  await p.locator(`[data-editar="${alvo}"]`).first().click();
  await esperar(1200);
  await abrirPasso(2);
  const cx = p.locator('[data-cert-publico]').first();
  if (!(await cx.count())) { nota('certificado', 'caixa de consentimento nao existe nesta entrada'); return; }
  const desabilitada = await cx.isDisabled();
  const antes = await p.evaluate(() => document.querySelector('[data-cert-publico]')?.classList.contains('is-on'));
  nota('certificado', `caixa de consentimento: desabilitada=${desabilitada} ligada=${antes}`);
  nota('certificado', `texto ao lado da caixa:\n${await p.evaluate(() => document.querySelector('.ed-consentimento')?.innerText || '(nao achei)')}`);
  if (!desabilitada && !antes) {
    await cx.click();
    await esperar(900);
    const depois = await p.evaluate(() => document.querySelector('[data-cert-publico]')?.classList.contains('is-on'));
    nota('certificado', `depois de um clique: ligada=${depois}`);
  }
  await foto('21-consentimento');
  await salvar('consentimento do certificado');
});

// ================================================================= publicar
await passo('publicar', async () => {
  await abrirPainel('publicar');
  const check = await p.evaluate(() =>
    [...document.querySelectorAll('.ed-check-lista li')].map((li) => `${li.className.padEnd(8)} ${li.innerText.replace(/\n/g, ' ').trim()}`));
  nota('publicar', `checklist:\n${check.join('\n')}`);
  const botao = await p.evaluate(() => {
    const b = document.querySelector('[data-publicar]');
    return b ? { texto: b.innerText.trim(), desabilitado: b.disabled } : null;
  });
  nota('publicar', `botao: ${JSON.stringify(botao)}`);
  nota('publicar', `tela de publicar:\n${await gaveta()}`);
  await foto('14-publicar-checklist');

  if (!(await existe('[data-previa-url]'))) {
    await p.locator('[data-girar-previa]').first().click();
    await esperar(5000);
  }
  const urlPrevia = await p.evaluate(() => document.querySelector('[data-previa-url]')?.value || '');
  nota('publicar', `link de previa: ${urlPrevia || '(nao gerou)'}`);
  await foto('15-previa-gerada');

  if (botao && !botao.desabilitado) {
    await p.locator('[data-publicar]').first().click();
    await esperar(10000);
    nota('publicar', `tela depois de publicar:\n${await gaveta()}`);
    await foto('16-publicado');
    nota('publicar', `selo da barra de cima: "${await p.evaluate(() => document.querySelector('.ed-barra-status')?.innerText?.trim() || '')}"`);
  } else {
    nota('publicar', 'BLOQUEIO: o botao de publicar veio desabilitado');
  }

  if (urlPrevia) {
    const aba = await p.context().newPage();
    await aba.goto(urlPrevia, { waitUntil: 'networkidle' }).catch((e) => nota('previa', `falhou: ${e.message}`));
    await esperar(3000);
    await aba.screenshot({ path: SHOT('17-pagina-previa'), fullPage: true });
    nota('previa', `texto da pagina:\n${await aba.evaluate(() => document.body.innerText)}`);
    const raio = await aba.evaluate(() => {
      const transbordou = [...document.querySelectorAll('.glass-card *')]
        .filter((e) => e.scrollWidth > e.clientWidth + 2 && e.clientWidth > 0)
        .slice(0, 8).map((e) => `${e.tagName}.${String(e.className).slice(0, 40)} ${e.scrollWidth}>${e.clientWidth}`);
      return {
        temSecaoProjetos: Boolean(document.querySelector('#project-count')),
        temStacks: Boolean(document.querySelector('.stacks-marquee')),
        tituloStacks: document.querySelector('.stacks-marquee')?.closest('div')?.querySelector('span')?.innerText || '(sem)',
        temExperiencia: Boolean(document.querySelector('#experiencia')),
        temCertificado: Boolean(document.querySelector('a[href*="/certificado/"]')),
        title: document.title,
        robots: document.querySelector('meta[name="robots"]')?.content || '(sem)',
        imgSemSrc: [...document.querySelectorAll('img')].filter((i) => !i.getAttribute('src')).length,
        imgQuebradas: [...document.querySelectorAll('img')].filter((i) => i.complete && i.naturalWidth === 0).length,
        paragrafosDaBio: document.querySelectorAll('.glass-card p').length,
        transbordou,
        larguraDoDocumento: document.documentElement.scrollWidth,
        larguraDaJanela: window.innerWidth,
      };
    });
    nota('previa', `radiografia da pagina: ${JSON.stringify(raio, null, 1)}`);

    const hrefCert = await aba.evaluate(() => document.querySelector('a[href*="/certificado/"]')?.getAttribute('href') || '(sem)');
    nota('previa', `href do botao de certificado na pagina publica: ${hrefCert}`);
    if (hrefCert !== '(sem)') {
      const r2 = await aba.goto(new URL(hrefCert, aba.url()).toString(), { waitUntil: 'domcontentloaded' }).catch(() => null);
      nota('previa', `abrindo o certificado -> ${r2 ? r2.status() : 'sem resposta'} ${r2 ? r2.url().split('?')[0].slice(0, 90) : ''}`);
      await aba.goto(urlPrevia, { waitUntil: 'networkidle' });
      await esperar(2000);
    }

    await aba.setViewportSize({ width: 375, height: 812 });
    await esperar(1500);
    await aba.screenshot({ path: SHOT('22-previa-celular'), fullPage: true });
    const mob = await aba.evaluate(() => ({ doc: document.documentElement.scrollWidth, win: window.innerWidth }));
    nota('previa', `em 375 px: documento ${mob.doc} px, janela ${mob.win} px ${mob.doc > mob.win ? '(ROLAGEM HORIZONTAL)' : '(ok)'}`);
    await aba.close();
  }
});

// ================================================================= ancoras: onde caiu cada lapis
// A tela cheia de experiencia mostrou lapis "Editar" empilhados nas duas primeiras entradas e
// nenhum nas tres ultimas. Esta etapa diz em QUE elemento cada um foi pendurado e para QUAL
// entrada ele aponta.
await passo('ancoras', async () => {
  const mapa = await p.evaluate(() => {
    const sec = document.querySelector('#experiencia');
    if (!sec) return null;
    return {
      entradasNaTela: sec.querySelectorAll('ul.flex, ul > li > div, li h3').length,
      todosOsLi: [...sec.querySelectorAll('ul > li')].map((li, i) => ({
        i,
        primeiraLinha: (li.innerText || '').split('\n')[0].slice(0, 52),
        ehMarcador: li.className.includes('pl-3.5'),
        lapis: li.querySelector(':scope > [data-edit]')?.dataset.edit || null,
      })),
    };
  });
  nota('ancoras', `cada <li> da secao de experiencia e o lapis que caiu nele:\n${
    (mapa?.todosOsLi || []).map((x) => `  ${String(x.i).padStart(2)} ${x.ehMarcador ? 'MARCADOR' : 'ENTRADA  '} "${x.primeiraLinha}"  -> lapis: ${x.lapis || '-'}`).join('\n')}`);
  await foto('26-ancoras');
});

// ================================================================= estado: o que sobra depois de publicar
// A mensagem de "em revisao" e o unico lugar do produto que fala da espera, e ela mora dentro
// da gaveta. Esta etapa mede o que a psicologa encontra quando volta no dia seguinte.
await passo('estado', async () => {
  await abrirPainel('publicar');
  const b = await p.evaluate(() => {
    const x = document.querySelector('[data-publicar]');
    return x ? { texto: x.innerText.trim(), desabilitado: x.disabled } : null;
  });
  nota('estado', `voltando depois, o botao diz: ${JSON.stringify(b)}`);
  const corpo = await gaveta();
  nota('estado', `a palavra "revis" aparece na tela de publicar? ${/revis/i.test(corpo)}`);
  nota('estado', `tem "Tirar minha página do ar"? ${/Tirar minha/i.test(corpo)}`);
  nota('estado', `selo da barra: "${await p.evaluate(() => document.querySelector('.ed-barra-status')?.innerText?.trim() || '')}"`);
  await foto('23-voltando-depois');
  await fechar();

  // "Conta" NAO e gaveta: ela troca a tela inteira do editor.
  await abrirPainel('conta');
  nota('estado', `tela "Conta" (ela substitui o editor inteiro):\n${(await texto()).slice(0, 1500)}`);
  await foto('24-conta');
  await p.locator('#conta-voltar').first().click().catch(() => nota('estado', 'nao achei o "Voltar para o editor"'));
  await esperar(2500);

  // O 404 do endereco convida um estranho a COMPRAR um slug que ja esta reservado e na fila.
  const aba = await p.context().newPage();
  await aba.goto(`https://myportifolio.com.br/comprar?slug=${SLUG}`, { waitUntil: 'networkidle' }).catch((e) => nota('estado', `comprar: ${e.message}`));
  await esperar(2500);
  nota('estado', `/comprar?slug=${SLUG} diz:\n${(await aba.evaluate(() => document.body.innerText)).slice(0, 900)}`);
  await aba.screenshot({ path: SHOT('25-comprar-slug-ocupado'), fullPage: false });
  await aba.close();
});

// ================================================================= mailto: link de e-mail e telefone nas redes
await passo('mailto', async () => {
  await abrirPainel('perfil');
  await abrirPasso(2);
  nota('mailto', `ajuda do campo "Suas redes": "${await p.evaluate(() => [...document.querySelectorAll('[data-campo="socials"] .ed-help')].map((e) => e.innerText).join(' / '))}"`);
  await preencher(
    'socials',
    [
      'Instagram | @bianca.psi | https://instagram.com/bianca.psi',
      'WhatsApp | (11) 98812-4470 | https://wa.me/5511988124470',
      'E-mail | contato@biancafontes.psi.br | mailto:contato@biancafontes.psi.br',
    ].join('\n'),
  );
  await salvar('perfil (redes com mailto)');
  await esperar(1500);
  const hrefs = await p.evaluate(() =>
    [...document.querySelectorAll('#ed-canvas a')].map((a) => `${a.innerText.replace(/\n/g, ' ').trim()} -> ${a.getAttribute('href')}`).slice(0, 12));
  nota('mailto', `links renderizados no canvas:\n${hrefs.join('\n')}`);
});

// ================================================================= a pagina publica
await passo('publica', async () => {
  const aba = await p.context().newPage();
  const url = `https://${SLUG}.myportifolio.com.br/?cb=${Date.now()}`;
  const r = await aba.goto(url, { waitUntil: 'networkidle' }).catch((e) => { nota('publica', `falhou: ${e.message}`); return null; });
  nota('publica', `GET ${url} -> ${r ? r.status() : 'sem resposta'}`);
  await esperar(2000);
  await aba.screenshot({ path: SHOT('18-pagina-publica'), fullPage: true });
  nota('publica', `texto:\n${(await aba.evaluate(() => document.body.innerText)).slice(0, 2000)}`);
  await aba.close();
});

// ================================================================= fim
nota('fim', `erros de console e de rede coletados: ${erros.length}`);
erros.forEach((e) => diario.push(`   ERRO :: ${e}`));
await mkdir(resolve(process.cwd(), 'out'), { recursive: true });
await writeFile(resolve(process.cwd(), `out/psi-diario${pedidas.length ? `-${pedidas.join('_')}` : ''}.txt`), diario.join('\n'), 'utf8');
nota('fim', `tempo total: ${Math.round((Date.now() - t0) / 1000)}s (APEX ${APEX})`);
await navegador.close();
