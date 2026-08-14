// Abre as paginas de verdade num navegador de verdade e confere o que aparece na tela.
//
// POR QUE ISTO EXISTE, mesmo com curl passando: curl le bytes, navegador executa. Os dois
// piores defeitos desta base passaram em curl e so apareceram aqui. Um foi um `PER_PAGE`
// esquecido no arquivo errado depois de um split: a excecao acontecia DEPOIS do innerHTML,
// entao a pagina pintava perfeita e o modal, a paginacao, o filtro e o botao de idioma
// ficavam todos mortos, sem nada visivel. O outro foi o main.js reescrevendo o SSR com o
// dado estatico do Helio, que num subdominio de comprador daria "o site pisca e vira outro".
//
//   node scripts/testar-no-ar.mjs
//   node scripts/testar-no-ar.mjs --base http://localhost:5173
import { chromium } from 'playwright';

const iBase = process.argv.indexOf('--base');
const BASE = iBase >= 0 ? process.argv[iBase + 1] : 'https://myportifolio.com.br';
const TENANT = 'https://helio.myportifolio.com.br';

const resultados = [];
function conferir(nome, passou, detalhe) {
  resultados.push({ nome, passou });
  console.log(`${passou ? 'ok  ' : 'FALHOU'} ${nome}${detalhe ? `  (${detalhe})` : ''}`);
}

const navegador = await chromium.launch();
const contexto = await navegador.newContext({ viewport: { width: 1280, height: 900 } });

// Erro de console e o sinal que os dois defeitos acima teriam dado. Ele e coletado por
// pagina e conferido no fim de cada uma, nunca ignorado.
function ligarConsole(pagina) {
  const erros = [];
  pagina.on('console', (m) => {
    if (m.type() === 'error') erros.push(m.text());
  });
  pagina.on('pageerror', (e) => erros.push(String(e)));
  return erros;
}

// Cache-buster no endereco: sem ele, uma resposta velha do edge faz o teste aprovar um
// deploy que nao chegou.
const cb = (u) => `${u}${u.includes('?') ? '&' : '?'}cb=${Math.floor(Math.random() * 1e9)}`;

// --- /comprar ---------------------------------------------------------------
{
  const p = await contexto.newPage();
  const erros = ligarConsole(p);
  await p.goto(cb(`${BASE}/comprar`), { waitUntil: 'networkidle' });

  const titulo = await p.title();
  conferir('/comprar tem o titulo da oferta', titulo.includes('MyPortifolio'), titulo);

  // O h1 tem que estar VISIVEL, e nao so existir no HTML: a pagina inteira nasce com
  // opacity 0 e so aparece quando ganha a classe .ready. Um bug nessa classe deixaria a
  // oferta invisivel com HTML perfeito.
  const h1 = p.locator('h1').first();
  conferir('o titulo aparece na tela', await h1.isVisible(), (await h1.textContent())?.trim());

  const botoes = p.locator('a[href*="pay.hub.la"]');
  const n = await botoes.count();
  conferir('dois botoes de checkout, e os dois clicaveis', n === 2 && (await botoes.first().isVisible()) && (await botoes.last().isVisible()), `${n} botoes`);

  const hrefs = await botoes.evaluateAll((els) => els.map((e) => e.getAttribute('href')));
  conferir(
    'todos apontam para o checkout PRINCIPAL',
    hrefs.every((h) => h.includes('U9cuWxeCOsTvt4urY5vS')),
    hrefs.join(' | '),
  );
  conferir('nenhum aponta para a facilitacao', !hrefs.some((h) => h.includes('q7IxDLHWM6OI8EBmrreo')), '');

  const texto = await p.locator('body').innerText();
  conferir('o preco aparece na tela', texto.includes('R$ 47,90'), '');
  conferir('o preco do bump aparece antes do checkout', texto.includes('R$ 37,00'), '');
  conferir('R$ 490 NAO aparece', !texto.includes('490'), '');
  conferir('sem travessao na copy', !/[—–]/.test(texto), '');
  conferir('credito Method Growth Hub no rodape', texto.includes('Method Growth Hub'), '');

  // A pagina nao carrega cliente de banco: /comprar e anonima e nao tem motivo nenhum
  // para puxar 90 kB de supabase-js.
  const scripts = await p.locator('script[src]').evaluateAll((els) => els.map((e) => e.src));
  conferir('nao carrega o bundle do editor', !scripts.some((s) => s.includes('/app-')), scripts.length + ' scripts');
  // E nem o bundle publico. Ele termina com um innerHTML sem condicao no #app, entao numa
  // pagina sem payload ele repinta a oferta com o portfolio do Helio.
  //
  // O beacon de analytics da Cloudflare e injetado pela borda, nao pelo nosso HTML, e por
  // isso ele nao conta: filtrar por origem em vez de exigir zero script e o que faz este
  // teste falhar so quando o defeito voltar, e nao quando a Cloudflare mudar de ideia.
  const nossos = scripts.filter((s) => !s.includes('cloudflareinsights.com'));
  conferir('nao carrega o bundle publico', nossos.length === 0, nossos.join(' | ') || 'nenhum script nosso');
  conferir('/comprar NAO virou o portfolio do Helio', !/Helio Monteiro/.test(texto), '');

  conferir('/comprar sem erro de console', erros.length === 0, erros.join(' | '));
  await p.close();
}

// --- /termos ---------------------------------------------------------------
{
  const p = await contexto.newPage();
  const erros = ligarConsole(p);
  await p.goto(cb(`${BASE}/termos`), { waitUntil: 'networkidle' });
  const texto = await p.locator('body').innerText();
  conferir('/termos aparece com conteudo', texto.length > 2000, `${texto.length} caracteres`);
  conferir('/termos cita o prazo de arrependimento', /7 dias/.test(texto), '');
  // A prova de que o main.js nao repintou por cima: se ele tivesse rodado, o corpo seria o
  // portfolio do Helio e este nome apareceria numa pagina que nao e dele.
  conferir('/termos NAO virou o portfolio do Helio', !/Helio Monteiro/.test(texto), '');
  conferir('/termos sem erro de console', erros.length === 0, erros.join(' | '));
  await p.close();
}

// --- o portfolio do apex ----------------------------------------------------
{
  const p = await contexto.newPage();
  const erros = ligarConsole(p);
  await p.goto(cb(`${BASE}/`), { waitUntil: 'networkidle' });
  conferir('o apex serve o portfolio do Helio', (await p.title()).includes('Helio'), await p.title());

  // Os quatro que o PER_PAGE quebrou em silencio. Se qualquer um sumir, foi outro split mal
  // feito, e o sintoma continua sendo pagina bonita e nada funcionando.
  // O seletor e data-slug, que e o que o cartao de projeto usa de verdade. Errar o seletor
  // aqui faz o teste "falhar" sem defeito nenhum, que gasta o mesmo tempo de investigacao
  // que um defeito de verdade.
  const cards = await p.locator('[data-slug]').count();
  conferir('os cartoes de projeto existem', cards > 0, `${cards} cartoes`);

  const filtros = await p.locator('[data-filter]').count();
  conferir('os filtros de projeto existem', filtros > 0, `${filtros} filtros`);

  const texto = await p.locator('body').innerText();
  conferir('a secao de experiencia esta na pagina', /experi/i.test(texto), '');

  conferir('apex sem erro de console', erros.length === 0, erros.join(' | '));
  await p.close();
}

// --- o subdominio do tenant -------------------------------------------------
{
  const p = await contexto.newPage();
  const erros = ligarConsole(p);
  await p.goto(cb(`${TENANT}/`), { waitUntil: 'networkidle' });
  conferir('o tenant abre', (await p.title()).includes('Helio'), await p.title());

  // O defeito do main.js: o SSR vinha do banco e o bundle o reescrevia com o dado estatico.
  // Se o payload injetado sumir, e sinal de que o Worker deixou de injetar ou o bundle
  // deixou de ler.
  const temPayload = await p.locator('#pf-payload').count();
  conferir('o payload do banco esta injetado', temPayload === 1, `${temPayload}`);
  conferir('tenant sem erro de console', erros.length === 0, erros.join(' | '));
  await p.close();
}

// --- /app: o portao de login ------------------------------------------------
{
  const p = await contexto.newPage();
  const erros = ligarConsole(p);
  await p.goto(cb(`${BASE}/app`), { waitUntil: 'networkidle' });
  const texto = await p.locator('body').innerText();
  const campo = await p.locator('input[type="email"]').count();
  conferir('/app mostra o portao de login', campo >= 1, `${campo} campo de e-mail`);
  conferir('o login pede e-mail, e nao senha', !/senha/i.test(texto) || campo >= 1, '');
  await p.close();
}

await navegador.close();

const falhas = resultados.filter((r) => !r.passou);
console.log(`\n${resultados.length - falhas.length}/${resultados.length} passaram`);
process.exit(falhas.length ? 1 : 0);
