// Sonia Prazeres, confeiteira em Niteroi, monta o portfolio dela pelo editor.
//
// O que este script mede nao e "o editor grava?": e o que a Sonia entende, o que ela procura e
// nao acha, e o que ela paga para consertar. Cada bloco marcado com ACHADO abaixo virou linha
// do relatorio em tasks/_nichos/demo-confeitaria.md.
import { abrirEditor, abrirPainel, textoDaTela, esperar } from './base.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const MIDIA = resolve('out/midia/demo-confeitaria');
mkdirSync('out', { recursive: true });

const linhas = [];
const log = (...a) => { const s = a.map(String).join(' '); linhas.push(s); console.log(s); };
const achado = (sev, titulo, texto) => log(`\n### ACHADO [${sev}] ${titulo}\n${texto}`);
const t0 = Date.now();
const gravarLog = () => writeFileSync('out/conf-execucao.txt', linhas.join('\n'), 'utf8');

const { pagina, navegador, demo, erros, APEX } = await abrirEditor('demo-confeitaria');
log('# EXECUCAO demo-confeitaria', new Date().toISOString());

// ---------------------------------------------------------------- helpers
const gaveta = () => pagina.locator('#ed-gaveta');

const abrirSecao = async (titulo) => {
  await pagina.evaluate((tt) => {
    [...document.querySelectorAll('#ed-gaveta details')].forEach((d) => {
      if (d.querySelector('.ed-passo-titulo')?.innerText.trim().toLowerCase() === tt.toLowerCase()) d.open = true;
    });
  }, titulo);
  await esperar(300);
};

const abrirTodasSecoes = async () => {
  await pagina.evaluate(() => { document.querySelectorAll('#ed-gaveta details').forEach((d) => { d.open = true; }); });
  await esperar(300);
};

async function preencher(key, valor) {
  const sel = `#ed-${key}`;
  const n = await pagina.locator(sel).count();
  if (!n) { log(`  !! campo ${key} nao existe na tela`); return false; }
  const desabilitado = await pagina.locator(sel).isDisabled().catch(() => false);
  if (desabilitado) { log(`  !! campo ${key} esta DESABILITADO (cadeado)`); return false; }
  await pagina.fill(sel, String(valor));
  await esperar(120);
  return true;
}

async function chips(key, lista) {
  for (const item of lista) {
    const sel = `[data-chip-add="${key}"]`;
    if (!(await pagina.locator(sel).count())) { log(`  !! chips ${key} sumiu`); return; }
    await pagina.fill(sel, item);
    await pagina.press(sel, 'Enter');
    await esperar(350);
  }
}

async function subirImagem(key, arquivo) {
  const sel = `[data-arquivo="${key}"]`;
  if (!(await pagina.locator(sel).count())) { log(`  !! campo de imagem ${key} nao existe`); return false; }
  await pagina.setInputFiles(sel, `${MIDIA}/${arquivo}`);
  // A previa aparece quando o upload resolve. 45 s porque converte no canvas e sobe.
  try {
    await pagina.waitForSelector(`[data-remover-imagem="${key}"]`, { timeout: 45000 });
    log(`  foto ${arquivo} -> ${key}: ok`);
    return true;
  } catch {
    const erroTxt = await pagina.locator(`[data-campo="${key}"] [data-erro]`).innerText().catch(() => '');
    log(`  !! upload de ${arquivo} em ${key} nao concluiu. erro na tela: "${erroTxt}"`);
    return false;
  }
}

async function salvarFormulario(rotulo) {
  const btn = pagina.locator('#ed-form-salvar');
  if (!(await btn.count())) { log(`  !! sem botao Salvar (${rotulo})`); return false; }
  await btn.click();
  try {
    await pagina.waitForFunction(() => !document.querySelector('#ed-gaveta')?.classList.contains('is-open'), { timeout: 30000 });
    log(`  salvou: ${rotulo}`);
    await esperar(900);
    return true;
  } catch {
    const msg = await pagina.locator('#ed-form-msg').innerText().catch(() => '');
    log(`  !! nao salvou (${rotulo}). mensagem: "${msg}"`);
    await pagina.screenshot({ path: `out/conf-erro-salvar-${rotulo.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.png` });
    return false;
  }
}

const fechar = async () => { await pagina.keyboard.press('Escape'); await esperar(600); };

// ================================================================ 1. PERFIL
log('\n\n========== 1. PERFIL ==========');
await pagina.click('[data-abrir="perfil"]');
await esperar(1000);

await subirImagem('hero', 'perfil.jpg');
await subirImagem('avatar', 'perfil.jpg');

await preencher('display_name', 'Sônia Prazeres');
await preencher('role', 'Bolos artesanais e doces de festa · Encomendas · Niterói, RJ');
await preencher('bio', [
  'Eu faço bolo desde os catorze anos, na cozinha da minha avó, em Icaraí.',
  'Hoje são bolos de casamento, mesas de doces e aquele bolo de aniversário que a criança escolhe pelo nome.',
  'Trabalho por encomenda, um de cada vez, com massa feita no dia e recheio de panela, nada de pote pronto.',
  'Atendo Niterói e São Gonçalo, e a entrega a gente combina junto quando você fecha a data.',
  'Me chame no WhatsApp com o dia da festa e quantas pessoas, que eu já monto o orçamento pra você.',
].join('\n'));

await preencher('badge_label', 'Confeiteira');
await pagina.selectOption('#ed-badge_icon', 'cake').catch(() => log('  !! nao consegui escolher o icone do selo'));
await esperar(300);

await pagina.screenshot({ path: 'out/conf-02-perfil-passo1.png' });

// --- passo 2: contato, botao principal e redes
await abrirSecao('Contato e redes');
await preencher('contact_email', 'sonia.prazeres.bolos@gmail.com');
await preencher('cta_url', 'https://wa.me/5521998877665?text=Oi%20S%C3%B4nia%2C%20quero%20um%20or%C3%A7amento%20de%20bolo');
await pagina.click('[data-switch="show_contact_email"]').catch(() => {});
await esperar(300);

// TESTE CENTRAL 1: o rotulo do botao principal.
log('\n--- TESTE: trocar "Agendar Call" por "Chamar no WhatsApp" ---');
const estadoCta = await pagina.evaluate(() => {
  const f = document.querySelector('[data-campo="cta_label"]');
  if (!f) return { existe: false };
  const inp = f.querySelector('input');
  return {
    existe: true,
    label: f.querySelector('.ed-label')?.innerText.replace(/\n/g, ' ').trim(),
    cadeado: Boolean(f.querySelector('.ed-lock')),
    textoDoCadeado: f.querySelector('.ed-lock')?.innerText.trim() || '',
    tituloDoCadeado: f.querySelector('.ed-lock')?.title || '',
    desabilitado: Boolean(inp?.disabled),
    valor: inp?.value ?? null,
    secao: f.closest('details')?.querySelector('.ed-passo-titulo')?.innerText.trim() || '(passo 1)',
  };
});
log('  estado do campo "Texto do botão": ' + JSON.stringify(estadoCta, null, 2));
const trocou = await preencher('cta_label', 'Chamar no WhatsApp');
log('  consegui digitar "Chamar no WhatsApp"? ' + (trocou ? 'SIM' : 'NAO'));

achado('alta', 'O rótulo do botão principal está atrás do cadeado pago',
  `Campo "Texto do botão" (cta_label) vive em Perfil > Contato e redes com a pílula PERSONALIZAÇÃO e o input disabled.\n` +
  `Sem comprar, a página da Sônia publica um botão escrito "Agendar Call" apontando para o WhatsApp dela.\n` +
  `Estado lido na tela: ${JSON.stringify(estadoCta)}`);

await preencher('socials', [
  'Instagram | @soniaprazeres.bolos | https://instagram.com/soniaprazeres.bolos',
  'WhatsApp | (21) 99887-7665 | https://wa.me/5521998877665',
].join('\n'));
await preencher('stats', [
  'Bolos entregues | 1.200',
  'Anos de cozinha | 18',
  'Festas por mês | 12',
].join('\n'));

// --- passo 3: as "stacks" (para ela: especialidades)
await abrirSecao('A página');
const rotuloStacks = await pagina.locator('[data-campo="stacks"] .ed-label').innerText().catch(() => '(nao achei)');
log(`\n  rótulo do campo de especialidades no editor: "${rotuloStacks}"`);
log(`  (o mesmo bloco no canvas se chama "O QUE VOCÊ USA NO TRABALHO")`);
await chips('stacks', [
  'Bolo de casamento', 'Naked cake', 'Pasta americana', 'Brigadeiro gourmet',
  'Bem-casado', 'Mesa de doces', 'Doces finos', 'Bolo sem lactose',
]);

await abrirSecao('Ajustes finos');
await preencher('seo_title', 'Sônia Prazeres · Bolos e doces de festa em Niterói');
await preencher('seo_description', 'Bolos de casamento, mesas de doces e festa infantil por encomenda em Niterói e São Gonçalo. Orçamento pelo WhatsApp.');

await pagina.screenshot({ path: 'out/conf-04-perfil-completo.png' });
await salvarFormulario('perfil');
await pagina.screenshot({ path: 'out/conf-05-canvas-com-perfil.png', fullPage: true });
gravarLog();

// ---- o que o canvas mostra do botao principal depois de salvo
const textoBotao = await pagina.evaluate(() => {
  const a = document.querySelector('#ed-canvas .bookmarkBtn .btn-text');
  return a ? a.innerText.trim() : '(sem botao)';
});
log(`\n  TEXTO DO BOTAO PRINCIPAL NA PAGINA: "${textoBotao}"`);

// TESTE: o que acontece ao clicar no cadeado no meio da edicao.
log('\n--- TESTE: clicar no cadeado "PERSONALIZAÇÃO" no meio de uma edição ---');
await pagina.click('[data-abrir="perfil"]');
await esperar(1200);
await pagina.fill('#ed-bio', 'RASCUNHO NAO SALVO: teste do cadeado');
await esperar(300);
await abrirSecao('Contato e redes');
await pagina.click('[data-campo="cta_label"] .ed-lock').catch((e) => log('  !! cadeado nao clicavel: ' + String(e).slice(0, 120)));
await esperar(1200);
const telaBump = await pagina.evaluate(() => ({
  titulo: document.querySelector('#ed-gaveta .ed-gaveta-titulo')?.innerText || '',
  texto: document.querySelector('#ed-gaveta')?.innerText || '',
  temVoltar: Boolean(document.querySelector('#ed-gaveta [data-gaveta-voltar]')),
  aindaTemFormulario: Boolean(document.querySelector('#ed-gaveta #ed-bio')),
}));
log('  tela que o cadeado abriu: ' + JSON.stringify({ titulo: telaBump.titulo, temVoltar: telaBump.temVoltar, aindaTemFormulario: telaBump.aindaTemFormulario }));
log('  --- texto ---\n' + telaBump.texto.split('\n').map((l) => '  | ' + l).join('\n'));
await pagina.screenshot({ path: 'out/conf-03-cadeado-botao.png' });
await fechar();
await pagina.click('[data-abrir="perfil"]');
await esperar(1200);
const bioDepois = await pagina.inputValue('#ed-bio').catch(() => '(nao li)');
log(`  a bio digitada sobreviveu? ${bioDepois.startsWith('RASCUNHO NAO SALVO') ? 'SIM' : 'NAO (voltou o valor salvo)'}`);
if (!telaBump.temVoltar) {
  achado('média', 'Clicar no cadeado troca a gaveta inteira e joga fora o que estava digitado',
    `O cadeado "PERSONALIZAÇÃO" substitui o formulário pelo painel de venda, sem botão de voltar e sem salvar o rascunho.\n` +
    `Depois de fechar e reabrir, a bio digitada ${bioDepois.startsWith('RASCUNHO NAO SALVO') ? 'sobreviveu' : 'sumiu'}.\n` +
    `Arquivo: src/modules/editor/panels/formPanel.js (dispara editor:abrir-bump) + src/modules/editor/panels/bumpPanel.js (abrirGaveta sem aoVoltar).`);
}
await fechar();

// ============================================================ 2. TRABALHOS
log('\n\n========== 2. TRABALHOS (os bolos) ==========');

// Cada bolo: nome, categoria, uma frase, foto. O preco entra onde couber, e a busca por onde
// ele cabe e o segundo teste central desta persona.
const BOLOS = [
  {
    nome: 'Bolo de casamento Marina e Rafa',
    categoria: 'Bolo de casamento',
    frase: 'Três andares, massa de baunilha com recheio de doce de leite e nozes. A partir de R$ 680. Encomenda com 30 dias de antecedência.',
    foto: 'bolo-casamento.jpg',
    ano: '2025',
    grupos: ['Casamento'],
    detalhes: {
      itens: ['A partir de R$ 680', 'Serve 80 pessoas', 'Encomenda com 30 dias', 'Entrega e montagem no salão'],
    },
  },
  {
    nome: 'Mesa de doces para 100 convidados',
    categoria: 'Mesa de doces',
    frase: 'Oito sabores de docinho, bem-casado e mini naked cake. A partir de R$ 4,50 o docinho. Encomenda com 20 dias.',
    foto: 'mesa-doces.jpg',
    ano: '2025',
    grupos: ['Festa'],
    detalhes: { itens: ['A partir de R$ 4,50 o docinho', '8 sabores', 'Mínimo de 100 unidades', 'Encomenda com 20 dias'] },
  },
  {
    nome: 'Bolo vulcão de brigadeiro',
    categoria: 'Bolo de aniversário',
    frase: 'O que mais sai aqui em casa. Escorrendo por cima, ainda morno. A partir de R$ 180. Encomenda com 5 dias.',
    foto: 'bolo-vulcao.jpg',
    ano: '2026',
    grupos: ['Aniversário'],
    detalhes: { itens: ['A partir de R$ 180', 'Serve 20 pessoas', 'Encomenda com 5 dias'] },
  },
  {
    nome: 'Kit festa infantil Dinossauros',
    categoria: 'Festa infantil',
    frase: 'Bolo decorado, 50 docinhos e 20 cupcakes no tema. A partir de R$ 420. Encomenda com 15 dias.',
    foto: 'kit-festa.jpg',
    ano: '2025',
    grupos: ['Festa infantil'],
    detalhes: { itens: ['A partir de R$ 420', 'Bolo + 50 docinhos + 20 cupcakes', 'Encomenda com 15 dias'] },
  },
  {
    nome: 'Naked cake de frutas vermelhas',
    categoria: 'Bolo de aniversário',
    frase: 'Massa branca, chantilly de verdade e frutas da feira da manhã. A partir de R$ 240. Encomenda com 7 dias.',
    foto: 'naked-cake.jpg',
    ano: '2026',
    grupos: ['Aniversário'],
    detalhes: { itens: ['A partir de R$ 240', 'Serve 25 pessoas', 'Encomenda com 7 dias'] },
  },
  {
    // ESTE aqui e a foto quadrada de Instagram, de proposito, num campo que corta 3:2.
    nome: 'Bolo de 15 anos da Lorena',
    categoria: 'Debutante',
    frase: 'Dois andares em pasta americana, com flor de açúcar feita à mão. A partir de R$ 520. Encomenda com 20 dias.',
    foto: 'bolo-quadrado-instagram.jpg',
    quadrada: true,
    ano: '2025',
    grupos: ['Festa'],
    detalhes: { itens: ['A partir de R$ 520', 'Serve 60 pessoas', 'Encomenda com 20 dias'] },
  },
];

let primeiro = true;
for (const bolo of BOLOS) {
  log(`\n--- bolo: ${bolo.nome} ---`);
  await pagina.click('[data-abrir="projetos"]');
  await esperar(900);
  await pagina.click('[data-adicionar]');
  await esperar(900);

  if (primeiro) {
    const cabec = await pagina.evaluate(() => {
      const g = document.querySelector('#ed-gaveta');
      return [g.querySelector('.ed-gaveta-titulo')?.innerText, g.querySelector('.ed-gaveta-sub')?.innerText];
    });
    log(`  cabeçalho da tela de cadastro: ${JSON.stringify(cabec)}`);
    // TESTE CENTRAL 2: existe campo de preco?
    const camposTodos = await pagina.evaluate(() => {
      document.querySelectorAll('#ed-gaveta details').forEach((d) => { d.open = true; });
      return [...document.querySelectorAll('#ed-gaveta .ed-field')].map((f) => ({
        key: f.dataset.campo,
        label: (f.querySelector('.ed-label')?.innerText || '').replace(/\n/g, ' ').trim(),
      }));
    });
    const temPreco = camposTodos.filter((c) => /pre[çc]o|valor|r\$|encomenda|prazo|por[çc]/i.test(c.label + c.key));
    log('  campos com cara de preço/prazo: ' + (temPreco.length ? JSON.stringify(temPreco) : 'NENHUM'));
    achado('alta', 'Não existe campo de preço nem de prazo de encomenda',
      `Os 19 campos de um trabalho são: ${camposTodos.map((c) => c.key).join(', ')}.\n` +
      `Nenhum deles é preço, "a partir de", prazo de encomenda ou quantidade de porções, que é o que o cliente da Sônia pergunta primeiro.\n` +
      `Saída usada aqui: enfiar "A partir de R$ 180" dentro de "Uma frase sobre ele" (tagline) e repetir em "O que o sistema faz?" (features).`);
    await pagina.screenshot({ path: 'out/conf-06-projeto-vazio.png' });
    primeiro = false;
  }

  await subirImagem('image', bolo.foto);
  await preencher('name', bolo.nome);
  await preencher('category', bolo.categoria);
  await preencher('tagline', bolo.frase);

  // O preco tambem entra na lista do passo 2, que se chama "O que o sistema faz?".
  await abrirSecao('O case');
  await preencher('features', bolo.detalhes.itens.join('\n'));

  await abrirSecao('Provas');
  await preencher('year', bolo.ano).catch(() => {});
  await pagina.selectOption('#ed-year', bolo.ano).catch(() => log('  !! ano nao aceitou ' + bolo.ano));
  await chips('groups', bolo.grupos);

  if (bolo.quadrada) {
    // Antes de salvar, guarda o tamanho da previa gerada pelo corte 3:2.
    const dim = await pagina.evaluate(() => {
      const img = document.querySelector('[data-campo="image"] .ed-drop-previa');
      return img ? { w: img.naturalWidth, h: img.naturalHeight, src: img.src.slice(0, 90) } : null;
    });
    log('  previa da foto quadrada depois do corte: ' + JSON.stringify(dim));
    await pagina.screenshot({ path: 'out/conf-07-foto-quadrada-cortada.png' });
  }

  await salvarFormulario(`bolo ${bolo.nome}`);
  gravarLog();
}

await pagina.screenshot({ path: 'out/conf-08-canvas-com-bolos-padrao.png', fullPage: true });

// TESTE: o "Tipo da imagem" nasce em "Logo (com respiro)", que enquadra foto de bolo com
// tarja. Descobrir isso e trocar exige achar "Ajustes finos" dentro de cada bolo.
log('\n--- TESTE: "Tipo da imagem" (image_fit) e o corte com tarja ---');
const fitAntes = await pagina.evaluate(() => [...document.querySelectorAll('#ed-canvas .project-card img')]
  .map((i) => ({ classe: i.className.split(' ').filter((c) => /object-|p-\d/.test(c)).join(' ') })));
log('  como as fotos entram na grade por padrão: ' + JSON.stringify(fitAntes));
achado('alta', 'Toda foto de bolo entra na grade com tarja: o padrão do "Tipo da imagem" é "Logo (com respiro)"',
  `Em src/modules/editor/panels/projetosPanel.js o vazioNovo() nasce com image_fit: 'contain', e projectsSection.js aplica object-contain p-5.\n` +
  `Foto de bolo vira uma miniatura no meio de um retângulo com sobra dos dois lados. A troca para "Print (preenche a placa)" mora em "Ajustes finos", um por um.`);

let trocados = 0;
const qtdBolos = await pagina.evaluate(() => document.querySelectorAll('#ed-canvas .project-card').length);
for (let i = 0; i < qtdBolos; i += 1) {
  await pagina.click('[data-abrir="projetos"]');
  await esperar(800);
  const editar = pagina.locator('[data-editar]').nth(i);
  if (!(await editar.count())) break;
  await editar.click();
  await esperar(800);
  await abrirSecao('Ajustes finos');
  const ok = await pagina.selectOption('#ed-image_fit', 'cover').then(() => true).catch(() => false);
  if (ok) { await esperar(300); if (await salvarFormulario(`fit do bolo ${i + 1}`)) trocados += 1; }
  else { await fechar(); }
}
log(`  troquei o "Tipo da imagem" de ${trocados} de ${qtdBolos} bolos, um por um.`);
await pagina.screenshot({ path: 'out/conf-08b-canvas-com-bolos-cover.png', fullPage: true });

// TESTE: o campo "Observação sobre o link" (link_note) so nasce se houver link. A Sonia nao tem
// site: sera que o preco cabe ali?
log('\n--- TESTE: o campo "Observação sobre o link" existe sem link? ---');
await pagina.click('[data-abrir="projetos"]');
await esperar(900);
await pagina.click('[data-editar]');
await esperar(900);
await abrirTodasSecoes();
const semLink = await pagina.locator('[data-campo="link_note"]').count();
await preencher('link', 'https://instagram.com/soniaprazeres.bolos');
await esperar(600);
const comLink = await pagina.locator('[data-campo="link_note"]').count();
log(`  link_note antes de por link: ${semLink} campo(s). Depois de por link: ${comLink} campo(s).`);
if (comLink) await preencher('link_note', 'Fotos e preços atualizados no meu Instagram');
await salvarFormulario('bolo com link');

// ========================================================= 3. EXPERIENCIAS
log('\n\n========== 3. EXPERIÊNCIA (trabalho e cursos) ==========');

const EXPERIENCIAS = [
  {
    kind: 'work',
    org: 'Doces da Sônia',
    role: 'Confeiteira e dona',
    inicio: '2012',
    atual: true,
    onde: 'Niterói, RJ',
    highlights: [
      'Faço todos os bolos e doces sozinha, do orçamento à entrega.',
      'Já entreguei mais de 1.200 bolos, entre casamento, aniversário e festa infantil.',
      'Atendo pelo WhatsApp e pelo Instagram, com agenda de duas a quatro festas por semana.',
    ],
    nota: 'Comecei vendendo bolo de pote na porta do prédio para pagar o curso. Hoje a cozinha é toda montada, com forno industrial e geladeira só para recheio.',
  },
  {
    kind: 'education',
    org: 'Senac Rio de Janeiro',
    role: 'Confeitaria Profissional',
    inicio: '03/2010',
    fim: '11/2011',
    atual: false,
    onde: 'Niterói, RJ',
    highlights: [
      'Massas base, cremes de panela e temperagem de chocolate.',
      'Cálculo de custo e precificação de encomenda.',
    ],
    certificado: 'certificado-senac.pdf',
    rotuloCert: 'Diploma do Senac',
    publicar: true,
  },
  {
    kind: 'education',
    org: 'Ateliê Doce Arte',
    role: 'Pasta americana e modelagem',
    inicio: '2018',
    fim: '2018',
    atual: false,
    onde: 'Rio de Janeiro, RJ',
    highlights: ['Flores de açúcar feitas à mão.', 'Cobertura lisa em bolo de andar.'],
  },
];

for (const exp of EXPERIENCIAS) {
  log(`\n--- experiência: ${exp.org} / ${exp.role} ---`);
  await pagina.click('[data-abrir="experiencias"]');
  await esperar(900);
  await pagina.click('[data-adicionar]');
  await esperar(900);

  await pagina.click(`[data-escolha="kind"][data-valor="${exp.kind}"]`);
  await esperar(500);
  await preencher('org', exp.org);
  await preencher('role', exp.role);
  await preencher('period_start', exp.inicio);
  if (!exp.atual) {
    await pagina.click('[data-switch="atual"]');
    await esperar(500);
    await preencher('period_end', exp.fim);
  }

  await abrirSecao('A organização');
  await preencher('location', exp.onde);
  await preencher('highlights', exp.highlights.join('\n'));

  if (exp.certificado) {
    log('  anexando certificado...');
    await pagina.setInputFiles('[data-cert-input]', `${MIDIA}/${exp.certificado}`);
    try {
      await pagina.waitForSelector('[data-cert-remover]', { timeout: 40000 });
      log('  certificado anexado');
      if (exp.rotuloCert) await preencher('cert-label', exp.rotuloCert).catch(() => {});
      await pagina.fill('#ed-cert-label', exp.rotuloCert || 'Certificado').catch(() => {});
      const textoConsent = await pagina.locator('.ed-consentimento').innerText().catch(() => '');
      log('  texto do consentimento:\n' + textoConsent.split('\n').map((l) => '    | ' + l).join('\n'));
      if (exp.publicar) { await pagina.click('[data-cert-publico]'); await esperar(400); }
      await pagina.screenshot({ path: 'out/conf-09-certificado.png' });
    } catch {
      const e = await pagina.locator('[data-campo="certificate"] [data-erro]').innerText().catch(() => '');
      log(`  !! certificado nao subiu. erro: "${e}"`);
    }
  }

  await abrirSecao('Observação');
  if (exp.nota) await preencher('note', exp.nota);

  await salvarFormulario(`experiência ${exp.org}`);
  gravarLog();
}

await pagina.screenshot({ path: 'out/conf-10-canvas-completo.png', fullPage: true });

// ============================================================== 4. PUBLICAR
log('\n\n========== 4. PUBLICAR ==========');
await pagina.click('[data-abrir="publicar"]');
await esperar(1200);
const antes = await pagina.locator('#ed-gaveta').innerText();
log('  --- checklist antes de publicar ---\n' + antes.split('\n').map((l) => '  | ' + l).join('\n'));
await pagina.screenshot({ path: 'out/conf-11-publicar-antes.png' });

const podePublicar = await pagina.locator('[data-publicar]').isEnabled().catch(() => false);
log(`  botão de publicar habilitado? ${podePublicar}`);
if (podePublicar) {
  await pagina.click('[data-publicar]');
  await esperar(9000);
  const depois = await pagina.locator('#ed-gaveta').innerText();
  log('  --- tela depois de publicar ---\n' + depois.split('\n').map((l) => '  | ' + l).join('\n'));
  await pagina.screenshot({ path: 'out/conf-12-publicar-depois.png' });
} else {
  log('  !! nao publiquei: o botao esta travado');
}
gravarLog();

// ================================================ 5. A PAGINA COMO O CLIENTE VE
log('\n\n========== 5. A PÁGINA PÚBLICA ==========');
const pag2 = await pagina.context().newPage();
const url = `https://demo-confeitaria.myportifolio.com.br/?cb=${Date.now()}`;
const resp = await pag2.goto(url, { waitUntil: 'networkidle' }).catch((e) => ({ erroNav: String(e) }));
log(`  ${url} -> HTTP ${resp?.status?.() ?? resp?.erroNav ?? '?'}`);
await esperar(1500);
await pag2.screenshot({ path: 'out/conf-13-publica.png', fullPage: true });
log('  --- texto da página pública ---\n' + (await pag2.evaluate(() => document.body.innerText)).split('\n').map((l) => '  | ' + l).join('\n').slice(0, 6000));
await pag2.close();

log('\n\n========== ERROS DE CONSOLE / REDE ==========');
log(erros.length ? erros.join('\n') : '  (nenhum)');
log(`\n\nTEMPO TOTAL: ${Math.round((Date.now() - t0) / 1000)} s`);
gravarLog();
await navegador.close();
console.log('\n>>> log em out/conf-execucao.txt');
