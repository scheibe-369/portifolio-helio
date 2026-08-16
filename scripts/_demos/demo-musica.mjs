// Agente de nicho: Vitória Alencar, produtora musical (slug demo-musica).
//
// O QUE ESTE SCRIPT EXISTE PARA DESCOBRIR: o trabalho dela e AUDIO. O editor so tem um campo
// de mídia embedada, e ele se chama "Vídeo no YouTube". Spotify, SoundCloud e Bandcamp, que
// sao onde musica de fato mora, nunca foram testados contra este produto. A etapa `audio`
// abaixo e o experimento central: ela cola cada um desses links no campo e guarda a mensagem
// EXATA que o editor devolve, incluindo o que acontece ao tentar salvar assim mesmo.
//
// Uso:
//   node scripts/_demos/demo-musica.mjs           (tudo)
//   node scripts/_demos/demo-musica.mjs audio     (so o teste de audio)
//   etapas: perfil | audio | projetos | experiencias | publicar | ler
import { abrirEditor, esperar } from './base.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ETAPA = process.argv[2] || 'tudo';
const fazer = (n) => ETAPA === 'tudo' || ETAPA === n;
const MIDIA = path.resolve('out/midia/demo-musica');
const m = (f) => path.join(MIDIA, f);

const atrito = [];
const nota = (nivel, texto) => { atrito.push(`[${nivel}] ${texto}`); console.log(`  ! ${nivel}: ${texto}`); };

await mkdir('out', { recursive: true });
const { pagina, navegador, demo, erros } = await abrirEditor('demo-musica', { headless: true });
console.log(`editor aberto para ${demo.nome} (${demo.slug})`);

// ---------------------------------------------------------------- utilitarios
const G = '#ed-gaveta';
const tiro = async (nome) => { try { await pagina.screenshot({ path: `out/musica-${nome}.png`, fullPage: false }); } catch {} };
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

async function subirImagem(key, arquivo, origem) {
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
  'Produzo, mixo e masterizo em Recife desde 2014, num estúdio que montei em cima de uma oficina no Poço da Panela e que hoje atende artista de maracatu, de rap e de indie na mesma semana.',
  'Meu trabalho começa antes do primeiro take: eu sento com o artista, escuto as referências dele, e a gente decide junto que disco é esse antes de gravar uma nota.',
  'Assino álbuns autorais, trilha para cinema e publicidade, e mixagem para quem gravou em casa e precisa que soe como estúdio.',
  'Já entreguei 74 faixas, e as três últimas que produzi entraram em playlist editorial do Spotify no mês de lançamento.',
].join(' ');

// Uma produtora musical entra aqui pensando em Spotify primeiro. O campo aceita qualquer
// link, entao a rede vai, mas o SOM continua sem tocar: e um link de saida, nao um player.
const SOCIAIS = [
  'Spotify | Vitória Alencar | https://open.spotify.com/artist/4gzpq5DPGxSnKTe4SA8HAU',
  'Instagram | @vitoriaalencar.som | https://instagram.com/vitoriaalencar.som',
  'YouTube | Estúdio Panela | https://youtube.com/@vitoriaalencar',
  'SoundCloud | vitoriaalencar | https://soundcloud.com/vitoriaalencar',
  'WhatsApp | (81) 99612-4477 | https://wa.me/5581996124477',
].join('\n');

const NUMEROS = [
  'Faixas produzidas | 74',
  'Artistas atendidos | 31',
  'Streams somados | 12,4 mi',
  'Anos de estúdio | 11',
].join('\n');

const ESPECIALIDADES = [
  'Produção musical', 'Mixagem', 'Masterização', 'Pro Tools', 'Ableton Live',
  'Trilha sonora', 'Direção de gravação', 'Maracatu e caboclinho', 'Arranjo de sopros',
  'Sound design',
];

// O video da vitrine: escolhido e validado por oembed antes de entrar aqui.
const YT_TRILHA = 'https://www.youtube.com/watch?v=K4DyBUG242c';
const YT_CLIPE = 'https://www.youtube.com/watch?v=fJ9rUzIMcZQ';

const TRABALHOS = [
  {
    name: 'Maré de Dentro', category: 'Álbum produzido',
    tagline: 'Onze faixas gravadas em quatro meses, com alfaia de verdade e sem uma camada de sample.',
    problem: 'A Bruna Caetano tinha dez músicas prontas no violão e três produtores que já tinham tentado transformar aquilo em disco. Nas três tentativas o resultado saiu com cara de sertanejo de rádio, e ela não reconhecia mais as próprias músicas.',
    solution: 'Voltei ao ponto zero: gravei ela e o violão em uma tomada só, e construí o disco por cima disso. Chamei alfaia, caixa e sopro do Recife, e nenhuma percussão do disco é sample. Levou quatro meses e ela ganhou o disco que estava tentando fazer desde 2019.',
    features: ['Onze faixas produzidas do arranjo à masterização', 'Percussão gravada ao vivo com três músicos de maracatu', 'Base de voz e violão em tomada única', 'Mixagem em stems, com versão instrumental de cada faixa'],
    stack: ['Pro Tools', 'Neve 1073', 'Alfaia', 'Fita analógica'],
    year: '2025', groups: ['Álbum', 'Produção'], imagem: 'trab-2.jpg', origem: '1400x1400 (capa quadrada)',
    link: 'https://open.spotify.com/album/1DFixLWuPkv3KT3TnV35m3', video: YT_CLIPE,
    audioReal: 'https://open.spotify.com/album/1DFixLWuPkv3KT3TnV35m3',
  },
  {
    name: 'Trilha de Beira-Mar', category: 'Trilha para cinema',
    tagline: 'Setenta e dois minutos de trilha original para um longa pernambucano, gravados com quarteto de cordas e sintetizador modular.',
    problem: 'O diretor tinha o corte final e uma trilha temporária feita de música licenciada que ele não podia pagar. Faltavam sete semanas para a estreia em festival e nenhuma nota tinha sido composta.',
    solution: 'Compus e gravei setenta e dois minutos em sete semanas, dividindo o filme em três blocos sonoros. Cordas gravadas na Sala Cecília Meireles, sintetizador modular por cima, e nenhum tema se repete entre blocos.',
    features: ['Setenta e dois minutos de trilha original', 'Quarteto de cordas gravado ao vivo', 'Três blocos sonoros sem tema repetido', 'Entrega em stems separados para a mixagem de sala'],
    stack: ['Ableton Live', 'Sintetizador modular', 'Quarteto de cordas', 'Mixagem 5.1'],
    year: '2025', groups: ['Trilha', 'Cinema'], imagem: 'trab-4-retrato.jpg', origem: '1400x2100 (retrato alto)',
    link: '', video: YT_TRILHA,
    audioReal: 'https://soundcloud.com/vitoriaalencar/trilha-beira-mar',
  },
  {
    name: 'Câmbio Preto', category: 'Mixagem e masterização',
    tagline: 'Um disco de rap inteiro gravado em quarto, mixado até soar como estúdio.',
    problem: 'O MC Dão gravou catorze faixas no quarto dele, com microfone USB e sem tratamento nenhum. Duas gravadoras recusaram o material dizendo que era inaproveitável, e ele não tinha orçamento para regravar.',
    solution: 'Trabalhei faixa a faixa: limpeza de ruído de fundo, correção de fase entre tomadas duplicadas, e uma cadeia de compressão que devolveu peso à voz sem estourar. Regravamos só três refrões. O disco saiu, e a faixa de abertura passou de dois milhões de streams.',
    features: ['Catorze faixas mixadas a partir de gravação caseira', 'Limpeza de ruído e correção de fase por tomada', 'Masterização em duas versões: streaming e vinil', 'Só três refrões precisaram de regravação'],
    stack: ['iZotope RX', 'Pro Tools', 'Masterização para vinil'],
    year: '2024', groups: ['Mixagem'], imagem: 'trab-3-quadrada.jpg', origem: '1400x1400 (capa quadrada)',
    link: '', video: '',
    audioReal: 'https://open.spotify.com/track/0VjIjW4GlUZAMYd2vXMi3b',
  },
  {
    name: 'Rasga o Céu', category: 'Single',
    tagline: 'Um single de estreia feito em três dias de estúdio, que virou playlist editorial na semana de lançamento.',
    problem: 'A artista tinha três dias de estúdio pagos por um edital e uma música que ainda estava em fase de maquete. Errar a produção significava queimar o edital inteiro.',
    solution: 'Fechei o arranjo antes de entrar no estúdio, em duas reuniões por chamada. Os três dias foram só de gravar e mixar. Entreguei masterizado no quarto dia, e a faixa entrou em playlist editorial na semana de lançamento.',
    features: ['Arranjo fechado antes da primeira diária', 'Três dias de gravação e um de mixagem', 'Entrega masterizada pronta para distribuidora'],
    stack: ['Ableton Live', 'Vocal chain', 'Masterização para streaming'],
    year: '2024', groups: ['Single', 'Produção'], imagem: 'trab-1.jpg', origem: '1400x875 (paisagem)',
    link: '', video: '',
    audioReal: 'https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC',
  },
  {
    name: 'Vinheta Naturais do Recife', category: 'Áudio para publicidade',
    tagline: 'Seis vinhetas de trinta segundos para uma campanha de rádio, com sotaque que ninguém licencia de banco.',
    problem: 'A agência queria som pernambucano e só encontrava biblioteca genérica de banco de trilha. O que vinha pronto soava a Caribe, não a Recife, e o cliente recusou duas rodadas.',
    solution: 'Gravei seis vinhetas com músicos daqui, cada uma em uma levada diferente, e entreguei também as versões de quinze e de cinco segundos. A campanha rodou seis meses em rádio e a agência voltou para a segunda temporada.',
    features: ['Seis vinhetas em levadas diferentes', 'Versões de trinta, quinze e cinco segundos', 'Músicos locais, com cachê e crédito', 'Entrega com contrato de cessão por prazo'],
    stack: ['Pro Tools', 'Percussão pernambucana', 'Locução dirigida'],
    year: '2023', groups: ['Publicidade'], imagem: 'trab-5-panoramica.jpg', origem: '2400x640 (panorâmica)',
    link: '', video: '',
    audioReal: 'https://soundcloud.com/vitoriaalencar/sets/naturais-do-recife',
  },
  {
    name: 'Sessões Panela', category: 'Ao vivo em estúdio',
    tagline: 'Uma série de gravações ao vivo no meu estúdio, com áudio de disco e uma câmera só.',
    problem: 'Artista independente de Recife não tinha registro decente para mandar a curador de festival. O que existia era vídeo de celular com áudio de plateia.',
    solution: 'Abri o estúdio uma sexta por mês para gravar uma banda ao vivo, com o mesmo cuidado de disco na captação e uma câmera fixa. Já são dezenove sessões, e quatro das bandas fecharam festival a partir do material.',
    features: ['Dezenove sessões gravadas até agora', 'Captação multipista, mixada como disco', 'Áudio entregue também em WAV para o artista', 'Quatro bandas fecharam festival com o registro'],
    stack: ['Captação multipista', 'Mixagem ao vivo', 'Bandcamp'],
    year: '2023', groups: ['Ao vivo'], imagem: 'trab-6.jpg', origem: '1400x933 (paisagem 3:2)',
    link: '', video: '',
    audioReal: 'https://vitoriaalencar.bandcamp.com/album/sessoes-panela',
  },
];

const EXPERIENCIAS = [
  {
    kind: 'work', org: 'Estúdio Panela', role: 'Produtora musical e sócia', period_start: '01/2018', atual: true,
    location: 'Recife, PE', logo: 'logo-exp.jpg',
    highlights: ['Estúdio próprio montado do zero, com tratamento acústico feito sob medida', 'Trinta e um artistas atendidos, de maracatu a rap', 'Setenta e quatro faixas produzidas e mixadas', 'Série Sessões Panela, dezenove gravações ao vivo'],
    note: 'Montei o estúdio em cima de uma oficina no Poço da Panela porque era o aluguel que cabia. O tratamento acústico foi feito com material de construção e cálculo de amigo engenheiro, e até hoje é o melhor lugar em que já gravei.',
  },
  {
    kind: 'work', org: 'Rec Beat Estúdios', role: 'Assistente de estúdio e técnica de gravação', period_start: '2014', period_end: '12/2017', atual: false,
    location: 'Recife, PE',
    highlights: ['Operação de sala em mais de duzentas sessões', 'Captação de percussão para quatro discos de carnaval', 'Passagem de som de palco no Rec-Beat Festival'],
    note: 'Entrei carregando cabo e saí passando som de palco principal. Foi ali que aprendi a ouvir sala.',
  },
  {
    kind: 'education', org: 'UFPE, Departamento de Música', role: 'Bacharelado em Música, habilitação em composição', period_start: '2010', period_end: '2014', atual: false,
    location: 'Recife, PE',
    highlights: ['Trabalho de conclusão sobre notação de levadas de maracatu de baque virado', 'Quatro semestres de contraponto e orquestração', 'Monitoria de percepção musical por dois anos'],
    note: 'Fui atrás da teoria porque queria escrever para gente que lê partitura sem depender de tocar tudo eu mesma.',
    certificado: 'cert.jpg',
  },
];

// -------------------------------------------------------------------- PERFIL
if (fazer('perfil')) {
  console.log('\n== PERFIL ==');
  await abrirPainelPor('perfil');
  await abrirTodosOsPassos();
  await writeFile('out/musica-perfil-tela.txt', await textoGaveta(), 'utf8');
  await tiro('perfil-aberto');

  await preencher('display_name', demo.nome);
  await preencher('role', demo.role);
  await preencher('bio', BIO);
  await preencher('badge_label', 'Produtora musical');
  await selecionar('badge_icon', 'music');

  await subirImagem('hero', 'hero.jpg', '1200x1800 (retrato)');
  await abrirTodosOsPassos();
  await subirImagem('avatar', 'avatar.jpg', '800x800 (quadrada)');
  await abrirTodosOsPassos();

  const enq = pagina.locator(`${G} [data-enquadramento="hero_object_position"]`).first();
  if (await enq.count()) { await enq.fill('30'); await esperar(200); } else nota('AUSENTE', 'slider de enquadramento');

  await preencher('contact_email', 'contato@vitoriaalencar.com.br');
  await ligarSwitch('show_contact_email', true);
  await abrirTodosOsPassos();
  await preencher('cta_url', 'https://wa.me/5581996124477');

  const ctaLabel = pagina.locator(`${G} [data-campo="cta_label"] input`).first();
  if (await ctaLabel.count()) {
    if (await ctaLabel.isDisabled()) nota('PAGO', 'campo "Texto do botão" (cta_label) veio desabilitado: sem ele a produtora publica "Agendar Call"');
    else await ctaLabel.fill('Falar sobre seu disco');
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
  await preencher('seo_title', 'Vitória Alencar | Produtora musical em Recife');
  await preencher('seo_description', 'Produção musical, mixagem e trilha em Recife. Álbuns autorais, trilha para cinema e mixagem de gravação caseira.');

  await tiro('perfil-preenchido');
  await writeFile('out/musica-perfil-preenchido.txt', await textoGaveta(), 'utf8');
  await salvar('perfil');
  await esperar(1500);
  await tiro('canvas-com-perfil');
}

// ----------------------------------------------------------------- SWITCHES
// Etapa de CONFERENCIA, nascida de um defeito: os ouvintes do formulario empilham a cada
// repintura (editorDrawer.js:61 troca o innerHTML do mesmo no e liga tudo de novo, sem
// remover o anterior). Como o handler de switch faz `valores[k] = !valores[k]`, dois
// ouvintes = duas inversoes = clique que nao faz nada. Na pratica: o SEGUNDO switch que se
// mexe numa mesma abertura da gaveta nao muda, e nada avisa.
//
// Aqui cada switch e mexido numa abertura PROPRIA da gaveta (salvar fecha a gaveta, e
// fecharGaveta zera o innerHTML da raiz, o que descarta os ouvintes), e o estado e LIDO de
// volta depois. E o unico jeito de deixar o perfil com o valor que a produtora pediu.
if (fazer('switches')) {
  console.log('\n== SWITCHES (um por abertura, com conferencia) ==');
  const querido = { show_contact_email: true, show_online_dot: true, projects_video_first: true };
  for (const [key, alvo] of Object.entries(querido)) {
    await abrirPainelPor('perfil');
    await abrirTodosOsPassos();
    const antes = await pagina.locator(`${G} [data-switch="${key}"]`).first().getAttribute('aria-checked');
    if (antes === String(alvo)) { console.log(`  ${key}: ja estava ${antes}`); await pagina.keyboard.press('Escape'); await esperar(900); continue; }
    await ligarSwitch(key, alvo);
    await abrirTodosOsPassos();
    const depois = await pagina.locator(`${G} [data-switch="${key}"]`).first().getAttribute('aria-checked');
    console.log(`  ${key}: ${antes} -> ${depois} (queria ${alvo})`);
    if (depois !== String(alvo)) nota('DEFEITO', `switch "${key}" nao mudou de estado ao clicar (ficou ${depois})`);
    await salvar(`switch ${key}`);
    await esperar(1200);
  }
  // Conferencia final, com a gaveta reaberta do zero.
  await abrirPainelPor('perfil');
  await abrirTodosOsPassos();
  const final = await pagina.evaluate(() => Object.fromEntries(
    [...document.querySelectorAll('#ed-gaveta [data-switch]')].map((b) => [b.dataset.switch, b.getAttribute('aria-checked')])));
  console.log('  estado final dos switches:', JSON.stringify(final));
  await writeFile('out/musica-switches.json', JSON.stringify(final, null, 2), 'utf8');
  await pagina.keyboard.press('Escape');
  await esperar(900);
}

// ------------------------------------------------- O TESTE CENTRAL: O AUDIO
// Abre um projeto novo, cola cada link de audio no unico campo de midia embedada que existe,
// e guarda tudo que a tela devolveu: o rotulo do campo, a ajuda, a nota ao lado do input, a
// mensagem de erro do campo e o que o botao Salvar respondeu. Depois desfaz, sem salvar.
if (fazer('audio')) {
  console.log('\n== TESTE DE ÁUDIO ==');
  await abrirPainelPor('projetos');
  await pagina.locator(`${G} [data-adicionar]`).first().click();
  await esperar(1200);
  await abrirTodosOsPassos();

  // O que o campo se chama, palavra por palavra, e o que ele diz que aceita.
  const rotulos = await pagina.evaluate(() => {
    const c = document.querySelector('#ed-gaveta [data-campo="video"]');
    if (!c) return null;
    return {
      label: c.querySelector('label, .ed-label')?.textContent?.trim() || '',
      help: c.querySelector('.ed-help')?.textContent?.trim() || '',
      placeholder: c.querySelector('input')?.getAttribute('placeholder') || '',
      html: c.outerHTML.slice(0, 900),
    };
  });
  console.log('campo de mídia:', JSON.stringify(rotulos, null, 2));
  await writeFile('out/musica-campo-video.json', JSON.stringify(rotulos, null, 2), 'utf8');

  const LINKS = [
    ['Spotify faixa', 'https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC'],
    ['Spotify álbum', 'https://open.spotify.com/album/1DFixLWuPkv3KT3TnV35m3'],
    ['Spotify embed oficial', 'https://open.spotify.com/embed/track/4uLU6hMCjMI75M1A2tKUQC'],
    ['Spotify URI', 'spotify:track:4uLU6hMCjMI75M1A2tKUQC'],
    ['SoundCloud', 'https://soundcloud.com/vitoriaalencar/trilha-beira-mar'],
    ['Bandcamp', 'https://vitoriaalencar.bandcamp.com/album/sessoes-panela'],
    ['Apple Music', 'https://music.apple.com/br/album/mare-de-dentro/1234567890'],
    ['Deezer', 'https://www.deezer.com/br/album/123456'],
    ['Vimeo', 'https://vimeo.com/76979871'],
    ['YouTube Music', 'https://music.youtube.com/watch?v=K4DyBUG242c'],
    ['YouTube normal', YT_TRILHA],
  ];

  const resultados = [];
  for (const [nomeServico, url] of LINKS) {
    await preencher('video', url);
    await esperar(700);
    const r = await pagina.evaluate(() => {
      const c = document.querySelector('#ed-gaveta [data-campo="video"]');
      return {
        notaYoutube: c?.querySelector('[data-nota-youtube]')?.textContent?.trim() || '',
        erroCampo: c?.querySelector('[data-erro]')?.textContent?.trim() || '',
      };
    });
    resultados.push({ servico: nomeServico, url, ...r });
    console.log(`  ${nomeServico.padEnd(22)} nota="${r.notaYoutube}" erro="${r.erroCampo}"`);
  }
  await writeFile('out/musica-audio-links.json', JSON.stringify(resultados, null, 2), 'utf8');

  // Agora o cenario real: preencher o projeto inteiro com um link do Spotify no campo, e
  // apertar Salvar. Isso mede se o produto DEIXA publicar o link (mesmo sem player) ou se
  // ele barra a producao inteira por causa de um campo opcional.
  console.log('\n  -- tentando salvar um projeto com link do Spotify no campo de vídeo --');
  await preencher('name', 'TESTE AUDIO SPOTIFY');
  await preencher('category', 'Single');
  await abrirTodosOsPassos();
  await preencher('video', 'https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC');
  await esperar(500);
  await tiro('audio-spotify-no-campo');
  await pagina.locator('#ed-form-salvar').click();
  await esperar(2500);
  const depoisDoSalvar = await pagina.evaluate(() => ({
    gavetaAberta: Boolean(document.querySelector('#ed-gaveta')?.classList.contains('is-open')),
    msgRodape: document.getElementById('ed-form-msg')?.textContent?.trim() || '',
    erroVideo: document.querySelector('#ed-gaveta [data-campo="video"] [data-erro]')?.textContent?.trim() || '',
    notaVideo: document.querySelector('#ed-gaveta [data-campo="video"] [data-nota-youtube]')?.textContent?.trim() || '',
  }));
  console.log('  salvar com Spotify =>', JSON.stringify(depoisDoSalvar, null, 2));
  await writeFile('out/musica-audio-salvar.json', JSON.stringify(depoisDoSalvar, null, 2), 'utf8');
  await tiro('audio-spotify-erro-salvar');

  // Limpa o campo e sai sem salvar: este projeto de teste nao pode ir para a pagina.
  await preencher('video', '');
  await esperar(400);
  const btnFechar = pagina.locator(`${G} [data-fechar-gaveta], ${G} .ed-gaveta-fechar`).first();
  if (await btnFechar.count()) await btnFechar.click();
  else await pagina.keyboard.press('Escape');
  await esperar(1000);
}

// ------------------------------------------------------------------ PROJETOS
if (fazer('projetos')) {
  console.log('\n== TRABALHOS ==');
  await abrirPainelPor('projetos');
  const jaTem = await pagina.evaluate(() =>
    [...document.querySelectorAll('#ed-gaveta .ed-lista-titulo')].map((e) => e.textContent.trim()));
  console.log(`  ja cadastrados: ${jaTem.length ? jaTem.join(', ') : '(nenhum)'}`);
  await writeFile('out/musica-lista-projetos.txt', await textoGaveta(), 'utf8');

  for (const t of TRABALHOS) {
    if (jaTem.includes(t.name)) { console.log(`  pulando "${t.name}" (ja existe)`); continue; }
    console.log(`  -> ${t.name}`);
    await pagina.locator(`${G} [data-adicionar]`).first().click();
    await esperar(1000);
    await abrirTodosOsPassos();
    if (t === TRABALHOS[0]) { await writeFile('out/musica-form-projeto.txt', await textoGaveta(), 'utf8'); await tiro('form-projeto'); }

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
    // O link do Spotify so cabe no campo generico de "link do projeto no ar". Se o projeto
    // ja usa esse campo para outra coisa, o audio nao tem onde entrar.
    if (t.link && /spotify|soundcloud|bandcamp/.test(t.link)) {
      await preencher('link_note', 'Ouça o disco completo');
    }
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
  await writeFile('out/musica-lista-experiencias.txt', await textoGaveta(), 'utf8');

  for (const x of EXPERIENCIAS) {
    if (jaTem.some((s) => s.startsWith(x.org))) { console.log(`  pulando "${x.org}" (ja existe)`); continue; }
    console.log(`  -> ${x.org}`);
    await pagina.locator(`${G} [data-adicionar]`).first().click();
    await esperar(1000);
    if (x.kind === 'education') await escolherBotao('kind', 'education');
    await abrirTodosOsPassos();
    if (x.kind === 'education') { await writeFile('out/musica-form-estudo.txt', await textoGaveta(), 'utf8'); await tiro('form-estudo'); }

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
          await preencher('certificate_label', 'Diploma de Bacharelado em Música');
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
  await writeFile('out/musica-publicar-antes.txt', antes, 'utf8');
  console.log(antes.slice(0, 1200));
  await tiro('publicar-antes');

  const btn = pagina.locator(`${G} [data-publicar]`).first();
  if (!(await btn.count())) nota('AUSENTE', 'botao Publicar');
  else if (await btn.isDisabled()) nota('BLOQUEIO', 'botao Publicar veio desabilitado');
  else {
    await btn.click();
    await esperar(7000);
    const depois = await textoGaveta();
    await writeFile('out/musica-publicar-depois.txt', depois, 'utf8');
    console.log('--- depois ---');
    console.log(depois.slice(0, 1200));
    await tiro('publicar-depois');
  }
}

// ------------------------------------------------------------- VISTA DO VISITANTE
// A pergunta que fecha o teste de audio: abrindo um case, o visitante consegue OUVIR alguma
// coisa? Abre o modal de um case com video (o paliativo) e de um sem video (o caso normal
// de mixagem, que nao tem clipe nenhum no YouTube).
if (fazer('visitante')) {
  console.log('\n== VISTA DO VISITANTE ==');
  await pagina.locator('button, a', { hasText: /Ver como visitante/i }).first().click();
  await esperar(3500);
  await pagina.screenshot({ path: 'out/musica-visitante.png', fullPage: true });

  const abrirCase = async (titulo, arquivo) => {
    const achou = await pagina.evaluate((t) => {
      const cards = [...document.querySelectorAll('button, a, article, div')]
        .filter((e) => (e.innerText || '').toUpperCase().includes(t.toUpperCase()));
      const card = cards[cards.length - 1];
      if (!card) return false;
      card.click();
      return true;
    }, titulo);
    await esperar(3000);
    const r = await pagina.evaluate(() => {
      const ifr = document.querySelector('iframe[src*="youtube"]');
      const corpo = document.body.innerText;
      return {
        iframe: ifr ? { src: ifr.src, molduraClasse: ifr.parentElement?.className || '' } : null,
        temPlayer: Boolean(ifr),
        temAudio: Boolean(document.querySelector('audio')),
        temSpotifyEmbed: Boolean(document.querySelector('iframe[src*="spotify"]')),
        botaoAcessar: /Acessar/i.test(corpo),
      };
    });
    console.log(`  case "${titulo}" (clicou=${achou}):`, JSON.stringify(r));
    await pagina.screenshot({ path: `out/musica-${arquivo}.png` });
    await pagina.keyboard.press('Escape');
    await esperar(1500);
    return r;
  };
  const casos = {
    comVideo: await abrirCase('Maré de Dentro', 'case-com-video'),
    semVideo: await abrirCase('Câmbio Preto', 'case-sem-video'),
  };
  await writeFile('out/musica-cases.json', JSON.stringify(casos, null, 2), 'utf8');
}

// ------------------------------------------------------------------ LEITURA
if (fazer('ler') || ETAPA === 'tudo') {
  console.log('\n== CANVAS ==');
  const canvas = await pagina.evaluate(() => document.getElementById('ed-canvas')?.innerText || '');
  await writeFile('out/musica-canvas.txt', canvas, 'utf8');
  console.log(canvas.slice(0, 2000));
  await pagina.screenshot({ path: 'out/musica-canvas-inteiro.png', fullPage: true });
}

console.log('\n== ERROS DE CONSOLE E REDE ==');
console.log(erros.length ? [...new Set(erros)].join('\n') : '(nenhum)');
await writeFile('out/musica-erros.txt', [...new Set(erros)].join('\n'), 'utf8');
console.log('\n== ATRITO COLETADO ==');
console.log(atrito.length ? atrito.join('\n') : '(nenhum)');
await writeFile('out/musica-atrito.txt', atrito.join('\n'), 'utf8');

await navegador.close();
