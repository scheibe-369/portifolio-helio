// Teste de nicho: monta o portfolio da persona Renata Vasconcelos (advogada trabalhista)
// usando SO o editor, como uma cliente faria.
//
// A hipotese que esta persona existe para quebrar: o trabalho dela NAO TEM IMAGEM. Um caso
// trabalhista nao tem print, nao tem link no ar, nao tem tela. Por isso aqui nenhum trabalho
// recebe imagem inventada: se a grade exigir imagem, o card quebrado E o resultado do teste.
//
//   node scripts/_demos/demo-advogada.mjs            monta tudo e publica
//   node scripts/_demos/demo-advogada.mjs --so-ver   so abre e fotografa o estado atual
//   node scripts/_demos/demo-advogada.mjs --sem-publicar
import { abrirEditor, esperar } from './base.mjs';
import { prepararMidia } from './demo-advogada-midia.mjs';
import { gerarPdf } from './demo-advogada-pdf.mjs';

const DIR = 'out/midia/demo-advogada';
const SO_VER = process.argv.includes('--so-ver');
const SEM_PUBLICAR = process.argv.includes('--sem-publicar');
const achados = [];
const anota = (sev, txt) => { achados.push(`[${sev}] ${txt}`); console.log(`  >> [${sev}] ${txt}`); };

// ---------------------------------------------------------------- conteudo da persona
const PERFIL = {
  bio: [
    'Advogada trabalhista há 12 anos, atuo dos dois lados da mesa: defendo empresas em contencioso de massa e represento profissionais em rescisões, reconhecimento de vínculo e assédio.',
    'A maior parte do que resolvo não vira processo. Resolve em auditoria de rotina, revisão de contrato e mesa de negociação, porque acordo bem construído custa menos que sentença e chega mais rápido.',
    'Quando o processo é inevitável, faço a sustentação oral e levo até a instância que for necessária, com relatório de risco por escrito em cada etapa.',
    'Atendo em Belo Horizonte e por videoconferência para todo o país.',
  ].join('\n\n'),
  selo: 'Advogada trabalhista',
  seloIcone: 'scale',
  email: 'heliomonteiro164+demoadv@gmail.com',
  ctaUrl: 'https://wa.me/5531988887777',
  ctaLabel: 'Agendar consulta',
  redes: [
    'LinkedIn | renata-vasconcelos-adv | https://www.linkedin.com/in/renata-vasconcelos-adv',
    'Instagram | @renata.trabalhista | https://www.instagram.com/renata.trabalhista',
  ].join('\n'),
  numeros: [
    'Anos de atuação | 12',
    'Casos conduzidos | 340',
    'OAB/MG | 128.447',
    'Acordos homologados | 190',
  ].join('\n'),
  areas: [
    'Rescisão contratual', 'Reconhecimento de vínculo', 'Assédio moral', 'Jornada e horas extras',
    'Negociação coletiva', 'Compliance trabalhista', 'Insalubridade e periculosidade', 'Audiência e sustentação oral',
  ],
  accent: '#C9A227',
  plate: '#0B1220',
  seoTitulo: 'Renata Vasconcelos · Advogada trabalhista em BH',
  seoDesc: 'Direito do Trabalho, contencioso e consultivo. Defesa de empresas e de profissionais, em Belo Horizonte e por videoconferência.',
};

// Nenhum tem imagem e nenhum tem link: e exatamente o que se quer medir.
const TRABALHOS = [
  {
    nome: 'Reversão de justa causa em rede varejista',
    categoria: 'Contencioso trabalhista',
    frase: 'Justa causa aplicada sem apuração prévia, revertida em segunda instância com pagamento integral das verbas rescisórias.',
    antes: 'Um gerente de loja com nove anos de casa foi desligado por justa causa a partir de uma denúncia anônima, sem sindicância, sem oitiva e sem prova documental. A empresa comunicou o motivo no grupo de mensagens da equipe, o que somou dano moral ao caso. O cliente chegou até mim já com a rescisão assinada e sem cópia de nada.',
    depois: 'Reconstruí a linha do tempo pelos registros de ponto e pelas mensagens do próprio grupo. Sustentei a ausência de proporcionalidade e a quebra de sigilo na comunicação do desligamento. Em primeira instância a justa causa caiu parcialmente; recorri, e no acórdão a reversão foi integral, com verbas rescisórias, multa de 40% do FGTS e indenização por dano moral.',
    resultados: [
      'Justa causa revertida por unanimidade em segunda instância',
      'Verbas rescisórias integrais e multa de 40% do FGTS',
      'Indenização por dano moral pela exposição do desligamento',
      'Retificação da baixa na carteira de trabalho',
    ],
    ano: '2024',
    areas: ['Rescisão contratual', 'Dano moral'],
    filtros: ['Contencioso', 'Empregado'],
  },
  {
    nome: 'Acordo coletivo em indústria com 300 funcionários',
    categoria: 'Negociação coletiva',
    frase: 'Banco de horas e escala 6x1 negociados com o sindicato sem paralisação, em quatro rodadas.',
    antes: 'A fábrica precisava mudar a escala para atender um contrato novo e havia assembleia marcada para deliberar paralisação. A proposta anterior da empresa tinha sido rejeitada porque tratava banco de horas e redução de intervalo no mesmo pacote, sem contrapartida clara.',
    depois: 'Separei os temas, calculei o custo real de cada cenário e levei à mesa uma proposta com contrapartida explícita: adicional de turno, transporte fretado e limite de compensação em seis meses. Conduzi quatro rodadas com o sindicato e a comissão de fábrica. O acordo foi aprovado em assembleia e registrado no sistema do Ministério do Trabalho.',
    resultados: [
      'Acordo aprovado em assembleia, sem paralisação',
      'Banco de horas com teto de compensação em seis meses',
      'Cláusula de revisão semestral pactuada',
      'Registro do instrumento coletivo concluído no prazo',
    ],
    ano: '2023',
    areas: ['Negociação coletiva', 'Jornada'],
    filtros: ['Coletivo', 'Empresa'],
  },
  {
    nome: 'Reconhecimento de vínculo de motorista de aplicativo',
    categoria: 'Contencioso trabalhista',
    frase: 'Subordinação algorítmica demonstrada por prova digital: vínculo reconhecido em primeira instância.',
    antes: 'O motorista trabalhava em jornada fixa havia três anos, com metas, bloqueio por recusa de corrida e desconto unilateral. A plataforma sustentava autonomia. A prova testemunhal era frágil porque os colegas temiam bloqueio da conta.',
    depois: 'Montei a prova pelo próprio aplicativo: histórico de bloqueios, mensagens automáticas de advertência, registro de meta e extrato de repasses. Pedi perícia sobre os critérios de distribuição de corrida. A sentença reconheceu o vínculo com anotação em carteira e verbas do período. O caso está em grau de recurso.',
    resultados: [
      'Vínculo reconhecido em primeira instância',
      'Anotação em carteira determinada para todo o período',
      'Perícia sobre critérios de distribuição deferida',
      'Recolhimento previdenciário do período incluído na condenação',
    ],
    ano: '2025',
    areas: ['Reconhecimento de vínculo', 'Prova digital'],
    filtros: ['Contencioso', 'Empregado'],
  },
  {
    nome: 'Auditoria de jornada em rede de restaurantes',
    categoria: 'Consultivo preventivo',
    frase: 'Doze unidades auditadas antes da fiscalização. Passivo estimado caiu 62% em oito meses.',
    antes: 'A rede tinha 14 ações trabalhistas ativas, quase todas sobre intervalo intrajornada e hora extra não registrada. O controle de ponto era feito em papel, pelo gerente, e sem assinatura do funcionário. A empresa não sabia dimensionar o próprio risco.',
    depois: 'Auditei doze unidades e cruzei escala publicada, ponto e faturamento por hora para achar as divergências reais. Reescrevi o procedimento de ponto, treinei os gerentes e implantei conferência mensal com relatório assinado. Fiz acordo extrajudicial homologado em seis das ações ativas.',
    resultados: [
      'Passivo estimado reduzido em 62% em oito meses',
      'Seis acordos extrajudiciais homologados em juízo',
      'Procedimento de ponto reescrito e implantado nas 12 unidades',
      'Nenhuma autuação na fiscalização seguinte',
    ],
    ano: '2024',
    areas: ['Compliance trabalhista', 'Jornada'],
    filtros: ['Consultivo', 'Empresa'],
  },
  {
    nome: 'Defesa em ação por assédio moral',
    categoria: 'Contencioso empresarial',
    frase: 'Defesa de empresa em ação de dano moral, com apuração interna concluída antes da contestação.',
    antes: 'A empresa recebeu uma ação por assédio moral envolvendo uma liderança de área e não tinha canal de denúncia nem registro de apuração. O risco não era só o valor pedido: havia outras seis pessoas na mesma equipe e a repercussão interna podia gerar novas ações.',
    depois: 'Conduzi a apuração interna com entrevistas registradas e parecer por escrito antes de contestar, para que a defesa refletisse o que a empresa de fato tinha. Onde a conduta se confirmou, orientei desligamento e proposta de acordo. Onde não se confirmou, sustentei a defesa com a apuração como prova. Implantei canal de denúncia e política de conduta depois do caso.',
    resultados: [
      'Acordo em valor 70% abaixo do pedido inicial',
      'Apuração interna documentada e aceita como prova',
      'Canal de denúncia e política de conduta implantados',
      'Nenhuma ação nova na mesma equipe nos 18 meses seguintes',
    ],
    ano: '2023',
    areas: ['Assédio moral', 'Compliance trabalhista'],
    filtros: ['Contencioso', 'Empresa'],
  },
  {
    nome: 'A reforma trabalhista oito anos depois',
    categoria: 'Palestra e produção acadêmica',
    frase: 'Palestra na OAB/MG e artigo publicado sobre o que a jurisprudência consolidou desde 2017.',
    antes: 'Advogados e departamentos de RH ainda decidem com base no texto de 2017, sem acompanhar o que os tribunais efetivamente firmaram sobre jornada, terceirização e acordo individual. A distância entre a lei escrita e a lei aplicada vira risco em contrato novo.',
    depois: 'Levantei as teses consolidadas em cinco anos de julgados e organizei em três eixos: o que a reforma manteve, o que a jurisprudência corrigiu e o que segue em disputa. Apresentei na Subseção da OAB/MG para cerca de 120 inscritos e publiquei o artigo em revista especializada.',
    resultados: [
      'Palestra na Subseção da OAB/MG, cerca de 120 inscritos',
      'Artigo publicado em revista especializada',
      'Material adotado em treinamento interno de dois clientes',
    ],
    ano: '2025',
    areas: ['Docência', 'Produção acadêmica'],
    filtros: ['Produção', 'Docência'],
  },
];

const EXPERIENCIAS = [
  {
    tipo: 'work', org: 'Vasconcelos Advocacia Trabalhista', cargo: 'Sócia fundadora',
    inicio: '2018', atual: true, onde: 'Belo Horizonte, MG e atendimento online',
    feitos: [
      'Carteira própria de contencioso e consultivo em Direito do Trabalho',
      'Auditoria preventiva de jornada e de contrato para empresas',
      'Condução de negociação coletiva e de acordo extrajudicial',
    ],
    nota: 'Escritório próprio, com atuação dividida entre defesa de empresas em contencioso de massa e representação de profissionais. A rotina inclui audiência, sustentação oral e parecer de risco por escrito antes de cada decisão do cliente.',
  },
  {
    tipo: 'work', org: 'Meireles & Barbosa Advogados', cargo: 'Advogada associada, área trabalhista',
    inicio: '03/2014', fim: '12/2017', onde: 'Belo Horizonte, MG',
    feitos: [
      'Contencioso trabalhista para clientes de varejo e indústria',
      'Elaboração de defesa, recurso ordinário e recurso de revista',
      'Acompanhamento de audiência em varas do trabalho de MG',
    ],
    nota: 'Quatro anos em banca de médio porte, com volume alto de audiência. Foi onde aprendi a montar linha do tempo de prova documental, que hoje é o centro do meu método.',
  },
  {
    tipo: 'education', org: 'PUC Minas', cargo: 'Pós-graduação em Direito e Processo do Trabalho',
    inicio: '2018', fim: '2019', onde: 'Belo Horizonte, MG',
    feitos: [
      'Monografia sobre ônus da prova em jornada de trabalho',
      'Carga horária de 432 horas',
    ],
    nota: 'Especialização concluída logo depois da reforma de 2017, com foco em prova de jornada e em negociado sobre legislado.',
    certificado: `${DIR}/certificado-pos-trabalho.pdf`,
  },
  {
    tipo: 'education', org: 'Universidade Federal de Minas Gerais', cargo: 'Bacharelado em Direito',
    inicio: '2009', fim: '2013', onde: 'Belo Horizonte, MG',
    feitos: [
      'Monitoria em Direito do Trabalho',
      'Estágio no Ministério Público do Trabalho',
    ],
    nota: 'Graduação com estágio no MPT, onde tive o primeiro contato com investigação de irregularidade trabalhista em cadeia produtiva.',
  },
];

// ---------------------------------------------------------------- utilitarios de tela
const tela = (p) => p.evaluate(() => document.body.innerText);
const foto = (p, nome) => p.screenshot({ path: `out/adv-${nome}.png`, fullPage: true });

const abrirPassos = (p) => p.evaluate(() => {
  document.querySelectorAll('#ed-gaveta details[data-passo]').forEach((d) => { d.open = true; });
});

async function fecharGaveta(pagina) {
  for (let i = 0; i < 4; i += 1) {
    const b = pagina.locator('#ed-gaveta [data-gaveta-fechar]');
    if (!(await b.count()) || !(await b.first().isVisible().catch(() => false))) break;
    await b.first().click().catch(() => {});
    await esperar(500);
  }
}

async function painel(pagina, chave) {
  await fecharGaveta(pagina);
  await pagina.locator(`#ed-barra [data-abrir="${chave}"]`).click();
  await esperar(1500);
  await abrirPassos(pagina);
  await esperar(300);
}

// Depois de salvar, a gaveta as vezes volta para a lista e as vezes fica no formulario.
// Este helper garante que a lista do painel esta aberta antes de tentar adicionar o proximo.
async function garantirLista(pagina, chave) {
  for (let tentativa = 0; tentativa < 3; tentativa += 1) {
    if (await pagina.locator('#ed-gaveta [data-adicionar]').count()) return true;
    const voltar = pagina.locator('#ed-gaveta [data-gaveta-voltar]');
    if (await voltar.count()) { await voltar.click().catch(() => {}); await esperar(1200); continue; }
    await painel(pagina, chave);
  }
  return !!(await pagina.locator('#ed-gaveta [data-adicionar]').count());
}

// Preenche um campo por id. Reporta quando o campo nao existe ou esta bloqueado (paywall).
async function preencher(pagina, key, valor) {
  const alvo = pagina.locator(`#ed-${key}`);
  if (!(await alvo.count())) { console.log(`    (campo #ed-${key} nao existe)`); return 'ausente'; }
  if (await alvo.isDisabled().catch(() => false)) {
    const trava = await pagina.locator(`[data-campo="${key}"] .ed-lock`).innerText().catch(() => '?');
    anota('ATRITO', `#ed-${key} veio DESABILITADO, travado atrás de "${trava}"`);
    return 'travado';
  }
  await alvo.fill(String(valor));
  await alvo.dispatchEvent('input').catch(() => {});
  await esperar(120);
  return 'ok';
}

async function ligar(pagina, key, queroLigado = true) {
  const alvo = pagina.locator(`[data-switch="${key}"]`);
  if (!(await alvo.count())) { console.log(`    (switch ${key} nao existe)`); return; }
  const agora = (await alvo.getAttribute('aria-checked')) === 'true';
  if (agora !== queroLigado) { await alvo.click(); await esperar(900); }
}

async function chips(pagina, key, itens) {
  for (const it of itens) {
    const ent = pagina.locator(`[data-chip-add="${key}"]`);
    if (!(await ent.count())) { anota('DEFEITO', `campo de chips "${key}" sumiu`); return; }
    if ((await ent.getAttribute('placeholder')) === 'limite atingido') {
      anota('ATRITO', `"${key}" bateu o limite antes de caber "${it}"`);
      return;
    }
    await ent.fill(it);
    await ent.press('Enter');
    await esperar(500);
  }
}

async function salvar(pagina, rotulo) {
  const b = pagina.locator('#ed-form-salvar');
  await b.scrollIntoViewIfNeeded().catch(() => {});
  await b.click();
  await esperar(700);
  const msgCedo = await pagina.locator('#ed-form-msg').innerText().catch(() => '');
  await esperar(2600);
  const msgTarde = await pagina.locator('#ed-form-msg').innerText().catch(() => '');
  const msg = msgTarde || msgCedo;
  if (msgCedo && msgCedo !== msgTarde) console.log(`    msg (durante): "${msgCedo}"`);
  const abertaAinda = await pagina.locator('#ed-gaveta #ed-form-salvar').count();
  const errosCampo = await pagina.evaluate(() => [...document.querySelectorAll('#ed-gaveta [data-erro]')]
    .map((e) => e.innerText.trim()).filter(Boolean).join(' / '));
  if (msg) console.log(`    msg: "${msg}"`);
  if (errosCampo) console.log(`    erros de campo: ${errosCampo}`);
  return { msg, errosCampo, abertaAinda: !!abertaAinda };
}

// ---------------------------------------------------------------- execucao
const t0 = Date.now();
gerarPdf(`${DIR}/certificado-pos-trabalho.pdf`);
const midia = await prepararMidia(DIR);

const { pagina, navegador, erros, APEX } = await abrirEditor('demo-advogada');
console.log('editor aberto.');
await foto(pagina, '00-editor-vazio');

if (!SO_VER) {
  // ======================================================= 1. PERFIL
  console.log('\n--- 1. PERFIL ---');
  await painel(pagina, 'perfil');

  // 1a. A foto crua, do jeito que a cliente tem: 370 KB, proporcao 2:3.
  console.log('  subindo a foto CRUA (370 KB, 2:3), como uma cliente faria:');
  await pagina.locator('[data-campo="hero"] input[data-arquivo="hero"]').setInputFiles(`${DIR}/perfil.jpg`);
  await esperar(6000);
  const notaHero = await pagina.locator('[data-campo="hero"] [data-erro]').innerText().catch(() => '');
  const temPreview = await pagina.locator('[data-campo="hero"] img').count();
  console.log(`    nota do campo: "${notaHero}" | preview? ${temPreview > 0}`);
  await foto(pagina, '01-foto-crua');

  // 1b. A foto pequena, tambem crua.
  await pagina.locator('[data-campo="avatar"] input[data-arquivo="avatar"]').setInputFiles(`${DIR}/perfil.jpg`);
  await esperar(6000);
  const notaAv = await pagina.locator('[data-campo="avatar"] [data-erro]').innerText().catch(() => '');
  const temAv = await pagina.locator('[data-campo="avatar"] img').count();
  console.log(`    avatar cru: "${notaAv}" | preview? ${temAv > 0}`);
  if (!temAv) {
    console.log('    -> caiu para a versao cortada por fora');
    await pagina.locator('[data-campo="avatar"] input[data-arquivo="avatar"]').setInputFiles(midia.pequena);
    await esperar(5000);
  }

  await preencher(pagina, 'bio', PERFIL.bio);
  await preencher(pagina, 'badge_label', PERFIL.selo);
  await pagina.selectOption('#ed-badge_icon', PERFIL.seloIcone).catch(() => anota('DEFEITO', 'nao consegui escolher o ícone do selo'));
  await esperar(400);
  await abrirPassos(pagina);

  await preencher(pagina, 'contact_email', PERFIL.email);
  await ligar(pagina, 'show_contact_email', true);
  await abrirPassos(pagina);
  await preencher(pagina, 'cta_url', PERFIL.ctaUrl);
  const ctaOk = await preencher(pagina, 'cta_label', PERFIL.ctaLabel);
  if (ctaOk === 'travado') {
    anota('DEFEITO', 'o texto do botão principal é pago. Sem pagar, o botão de uma advogada sai escrito "Agendar Call".');
  }
  await preencher(pagina, 'socials', PERFIL.redes);
  await preencher(pagina, 'stats', PERFIL.numeros);
  await preencher(pagina, 'seo_title', PERFIL.seoTitulo);
  await preencher(pagina, 'seo_description', PERFIL.seoDesc);

  const cor = async (key, v) => {
    const el = pagina.locator(`#ed-${key}`);
    if (!(await el.count())) return;
    if (await el.isDisabled().catch(() => false)) { anota('ATRITO', `cor #ed-${key} travada atrás da Personalização`); return; }
    await el.evaluate((e, val) => {
      e.value = val;
      e.dispatchEvent(new Event('input', { bubbles: true }));
      e.dispatchEvent(new Event('change', { bubbles: true }));
    }, v);
  };
  await cor('theme_accent', PERFIL.accent);
  await cor('theme_plate_bg', PERFIL.plate);

  // areas de atuacao, no campo que o editor chama de "Stacks que voce domina"
  await abrirPassos(pagina);
  await chips(pagina, 'stacks', PERFIL.areas);

  await foto(pagina, '02-perfil-preenchido');
  const rp = await salvar(pagina, 'perfil');
  if (rp.errosCampo) anota('DEFEITO', `perfil não salvou limpo: ${rp.errosCampo}`);
  await foto(pagina, '03-perfil-salvo');
  await fecharGaveta(pagina);

  // ======================================================= 2. TRABALHOS
  console.log('\n--- 2. TRABALHOS (nenhum com imagem) ---');
  await painel(pagina, 'projetos');
  const jaTem = await tela(pagina);

  for (const [i, t] of TRABALHOS.entries()) {
    if (jaTem.includes(t.nome)) { console.log(`  (${t.nome}) já existe, pulando`); continue; }
    console.log(`  [${i + 1}/${TRABALHOS.length}] ${t.nome}`);
    if (!(await garantirLista(pagina, 'projetos'))) {
      anota('BLOQUEIO', `não consegui voltar para a lista para adicionar "${t.nome}"`);
      break;
    }
    await pagina.locator('#ed-gaveta [data-adicionar]').first().click();
    await esperar(1600);
    await abrirPassos(pagina);

    await preencher(pagina, 'name', t.nome);
    await preencher(pagina, 'category', t.categoria);
    await preencher(pagina, 'tagline', t.frase);
    await preencher(pagina, 'problem', t.antes);
    await preencher(pagina, 'solution', t.depois);
    await preencher(pagina, 'features', t.resultados.join('\n'));
    await pagina.selectOption('#ed-year', t.ano).catch(() => {});
    await ligar(pagina, 'tem_cliente', true);
    await esperar(600);
    await abrirPassos(pagina);
    // "Nome do cliente" existe, mas sigilo profissional impede nomear. Fica em branco de proposito.
    await chips(pagina, 'stack', t.areas);
    await abrirPassos(pagina);
    await chips(pagina, 'groups', t.filtros);

    if (i === 0) {
      await foto(pagina, '04-trabalho-sem-imagem-modal');
      const semImg = await pagina.locator('[data-campo="image"] img').count();
      console.log(`    (confirmando que o card vai sem imagem: previews=${semImg})`);
    }
    const r = await salvar(pagina, t.nome);
    if (r.abertaAinda && r.errosCampo) {
      anota('BLOQUEIO', `o trabalho "${t.nome}" não salvou sem imagem: ${r.errosCampo}`);
      await foto(pagina, `04-bloqueio-${i}`);
      await fecharGaveta(pagina);
      break;
    }
    await esperar(900);
  }
  await esperar(1200);
  await foto(pagina, '05-lista-trabalhos');
  const listaTxt = await pagina.locator('#ed-gaveta').innerText().catch(() => '');
  console.log(`  LISTA DE TRABALHOS NO EDITOR:\n${listaTxt.slice(0, 1400)}`);
  await fecharGaveta(pagina);

  // ======================================================= 3. EXPERIENCIA
  console.log('\n--- 3. EXPERIÊNCIA ---');
  await painel(pagina, 'experiencias');
  const jaExp = await tela(pagina);

  for (const [i, e] of EXPERIENCIAS.entries()) {
    if (jaExp.includes(e.org)) { console.log(`  (${e.org}) já existe, pulando`); continue; }
    console.log(`  [${i + 1}/${EXPERIENCIAS.length}] ${e.org} :: ${e.cargo}`);
    if (!(await garantirLista(pagina, 'experiencias'))) {
      anota('BLOQUEIO', `não consegui voltar para a lista para adicionar "${e.org}"`);
      break;
    }
    await pagina.locator('#ed-gaveta [data-adicionar]').first().click();
    await esperar(1600);

    if (e.tipo === 'education') {
      await pagina.locator('[data-escolha="kind"][data-valor="education"]').click();
      await esperar(1200);
    }
    await abrirPassos(pagina);

    await preencher(pagina, 'org', e.org);
    await preencher(pagina, 'role', e.cargo);
    await preencher(pagina, 'period_start', e.inicio);
    if (e.atual) await ligar(pagina, 'atual', true);
    else {
      await ligar(pagina, 'atual', false);
      await esperar(900);
      await abrirPassos(pagina);
      const ok = await preencher(pagina, 'period_end', e.fim);
      if (ok !== 'ok') anota('DEFEITO', `não consegui informar a data final de "${e.org}" (retorno: ${ok})`);
    }
    await abrirPassos(pagina);
    await preencher(pagina, 'location', e.onde);
    await preencher(pagina, 'highlights', e.feitos.join('\n'));
    await abrirPassos(pagina);
    await preencher(pagina, 'note', e.nota);

    if (e.certificado) {
      await abrirPassos(pagina);
      const fcert = pagina.locator('[data-campo="certificate"] input[data-cert-input]');
      if (await fcert.count()) {
        await fcert.setInputFiles(e.certificado);
        await esperar(7000);
        await abrirPassos(pagina);
        const bloco = await pagina.locator('[data-campo="certificate"]').innerText().catch(() => '');
        console.log(`    BLOCO DO CERTIFICADO:\n      ${bloco.replace(/\n/g, '\n      ')}`);
        if (!/CPF/i.test(bloco)) anota('DEFEITO', 'anexei o certificado e não apareceu aviso mencionando CPF');
        await foto(pagina, '06-certificado-anexado');
        // Marca o consentimento para publicar o documento, que e o que uma advogada faria.
        const cb = pagina.locator('[data-cert-publico]');
        if (await cb.count()) {
          const antes = await cb.getAttribute('aria-checked');
          await cb.click();
          await esperar(1500);
          await abrirPassos(pagina);
          const dep = await pagina.locator('[data-cert-publico]').getAttribute('aria-checked').catch(() => '?');
          console.log(`    consentimento: ${antes} -> ${dep}`);
        } else anota('DEFEITO', 'não achei a caixa de consentimento do certificado');
      } else anota('BLOQUEIO', 'não achei o campo de anexar certificado');
    }

    await foto(pagina, `06-exp-${i}`);
    const r = await salvar(pagina, e.org);
    if (r.abertaAinda && r.errosCampo) {
      anota('BLOQUEIO', `a experiência "${e.org}" não salvou: ${r.errosCampo}`);
      await foto(pagina, `06-bloqueio-exp-${i}`);
      await fecharGaveta(pagina);
      break;
    }
    await esperar(900);
  }
  await esperar(1200);
  await foto(pagina, '07-lista-experiencias');
  console.log(`  LISTA DE EXPERIÊNCIAS:\n${(await pagina.locator('#ed-gaveta').innerText().catch(() => '')).slice(0, 1400)}`);
  await fecharGaveta(pagina);
}

// ======================================================= 4. COMO O VISITANTE VE
console.log('\n--- 4. VER COMO VISITANTE ---');
await fecharGaveta(pagina);
await pagina.locator('#ed-barra [data-ver-visitante]').click().catch(() => {});
await esperar(4000);
await foto(pagina, '08-visitante');
console.log((await tela(pagina)).slice(0, 3000));

// abre um card de caso sem imagem, para ver o modal publico
const card = pagina.locator('[data-projeto], .proj-card, article').first();
if (await card.count()) {
  await card.click().catch(() => {});
  await esperar(2500);
  await foto(pagina, '09-modal-caso-sem-imagem');
  const imgsVazias = await pagina.evaluate(() => [...document.querySelectorAll('img')]
    .filter((i) => !i.getAttribute('src') || i.getAttribute('src') === '').length);
  console.log(`  imagens com src vazio na tela do caso: ${imgsVazias}`);
  if (imgsVazias > 0) anota('DEFEITO', `${imgsVazias} <img src=""> na tela do caso sem imagem: o navegador desenha o ícone de figura quebrada`);
  console.log((await tela(pagina)).slice(0, 2000));
}

// ======================================================= 5. PUBLICAR
if (!SO_VER && !SEM_PUBLICAR) {
  console.log('\n--- 5. PUBLICAR ---');
  await pagina.goto(`${APEX}/app?cb=${Date.now()}`, { waitUntil: 'networkidle' }).catch(() => {});
  await esperar(3500);
  await painel(pagina, 'publicar');
  const checklist = await pagina.evaluate(() => [...document.querySelectorAll('.ed-check-lista li')]
    .map((li) => `${li.className.includes('e-ok') ? 'OK ' : '.. '}${li.innerText.trim()}`).join('\n'));
  console.log(`  CHECKLIST:\n${checklist}`);
  await foto(pagina, '10-painel-publicar');

  const btn = pagina.locator('[data-publicar]');
  const rotulo = await btn.innerText().catch(() => '?');
  const desabilitado = await btn.isDisabled().catch(() => false);
  console.log(`  botão: "${rotulo}" | desabilitado? ${desabilitado}`);
  if (!desabilitado) {
    await btn.click();
    await esperar(9000);
    const msg = await pagina.locator('#ed-pub-msg').innerText().catch(() => '');
    const pill = await pagina.locator('.ed-barra-status').innerText().catch(() => '');
    console.log(`  MENSAGEM DE PUBLICAÇÃO: "${msg}"`);
    console.log(`  selo da barra do topo depois de publicar: "${pill}"`);
    if (/revis|confer/i.test(msg) && /rascunho/i.test(pill)) {
      anota('ATRITO', `a gaveta diz "${msg.slice(0, 70)}..." e a barra do topo continua dizendo "${pill}"`);
    }
    await foto(pagina, '11-publicado');
  } else anota('BLOQUEIO', `o botão de publicar veio desabilitado: ${await pagina.locator('.ed-check-lista').innerText().catch(() => '')}`);
}

console.log('\n=== ERROS DE CONSOLE / REDE ===');
console.log(erros.length ? [...new Set(erros)].join('\n') : '(nenhum)');
console.log('\n=== ACHADOS DO SCRIPT ===');
console.log(achados.length ? achados.join('\n') : '(nenhum)');
console.log(`\ntempo: ${((Date.now() - t0) / 60000).toFixed(1)} min`);
await navegador.close();
