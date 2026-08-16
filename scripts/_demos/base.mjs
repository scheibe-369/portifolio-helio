// Kit dos agentes de nicho: abre o editor JA LOGADO, com termos aceitos e portfolio criado.
//
// Existe para os dez agentes nao repetirem a mesma descoberta dez vezes. O que esta aqui e o
// caminho ja mapeado (login por sessao injetada, aceite dos termos, wizard de tres campos).
// O que NAO esta aqui e de proposito: preencher perfil, projeto e experiencia. E ali que o
// atrito do editor mora, e automatizar isso no kit apagaria justamente o que se quer medir.
//
// Uso:
//   import { abrirEditor, esperar } from './base.mjs';
//   const { pagina, navegador, demo, erros } = await abrirEditor('demo-chef');
//   ...preencha, publique, observe...
//   await navegador.close();
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { porSlug } from '../demos.config.mjs';

const CHAVE_SESSAO = 'sb-fxchcqlbjszichhbllzm-auth-token';
const APEX = 'https://myportifolio.com.br';

export const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

export async function abrirEditor(slug, { headless = true, lento = 0 } = {}) {
  const demo = porSlug(slug);
  if (!demo) throw new Error(`slug desconhecido: ${slug}`);

  // A sessao sai do mesmo script que o resto do projeto usa, para nao existirem dois
  // caminhos de login com comportamentos diferentes.
  const bruto = execFileSync(process.execPath, ['scripts/sessao-demo.mjs', '--slug', slug, '--json'], { encoding: 'utf8' });
  const [s] = JSON.parse(bruto);
  if (!s || s.erro) throw new Error(`sessao falhou: ${s?.erro || 'sem retorno'}`);

  const navegador = await chromium.launch({ headless, slowMo: lento });
  const contexto = await navegador.newContext({ viewport: { width: 1440, height: 900 } });

  // Tem que entrar ANTES do primeiro script da pagina: se entrar depois, o boot do editor ja
  // decidiu que nao ha ninguem logado e pintou o portao de login.
  await contexto.addInitScript(([k, v]) => { try { window.localStorage.setItem(k, v); } catch {} },
    [CHAVE_SESSAO, JSON.stringify({
      access_token: s.accessToken, refresh_token: s.refreshToken, expires_at: s.expiresAt,
      token_type: 'bearer', user: { id: s.userId, email: s.email },
    })]);

  const pagina = await contexto.newPage();

  // Todo erro de console e de rede fica guardado: erro que ninguem coleta e achado perdido.
  const erros = [];
  pagina.on('pageerror', (e) => erros.push(`pageerror: ${String(e).slice(0, 300)}`));
  pagina.on('console', (m) => { if (m.type() === 'error') erros.push(`console: ${m.text().slice(0, 300)}`); });
  pagina.on('response', async (r) => {
    if (r.url().includes('supabase') && r.status() >= 400) {
      let corpo = '';
      try { corpo = (await r.text()).slice(0, 300); } catch {}
      erros.push(`HTTP ${r.status()} ${r.url().split('?')[0].split('/').slice(-2).join('/')} :: ${corpo}`);
    }
  });

  await pagina.goto(`${APEX}/app?cb=${Date.now()}`, { waitUntil: 'networkidle' });

  // 1. Aceite dos termos. Ele leva alguns segundos e nao mostra progresso: o botao so troca
  //    para "Registrando...". Isso ja e um atrito para anotar, e o motivo do timeout largo.
  if (await pagina.locator('#termos-aceite').count()) {
    await pagina.check('#termos-aceite');
    await pagina.click('#termos-continuar');
    await pagina.waitForSelector('#wz-nome, #ed-canvas', { timeout: 60000 });
  }

  // 2. Wizard de tres campos. O slug e checado contra o banco com debounce, por isso a pausa.
  if (await pagina.locator('#wz-nome').count()) {
    await pagina.fill('#wz-nome', demo.nome);
    await pagina.fill('#wz-slug', demo.slug);
    await pagina.fill('#wz-role', demo.role);
    await esperar(2500);
    await pagina.locator('button', { hasText: /Criar meu portf/i }).first().click();
    await pagina.waitForSelector('#ed-canvas', { timeout: 60000 });
  }

  await esperar(1500);
  return { navegador, contexto, pagina, demo, erros, APEX };
}

// Abre um dos paineis da barra do topo: 'Perfil', 'Projetos', 'Experiência', 'Conta'.
export async function abrirPainel(pagina, nome) {
  await pagina.locator('button', { hasText: new RegExp(`^${nome}$`, 'i') }).first().click();
  await esperar(1200);
}

// O texto visivel da tela inteira, que e como se confere o que o comprador esta vendo.
export const textoDaTela = (pagina) => pagina.evaluate(() => document.body.innerText);
