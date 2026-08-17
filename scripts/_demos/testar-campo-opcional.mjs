// Prova que um campo OPCIONAL mal preenchido nao segura o formulario inteiro.
// O caso real: uma produtora musical colou um link do Spotify no campo de video e o trabalho
// inteiro deixou de gravar, com nome, descricao e foto ja preenchidos.
import { abrirEditor, esperar, textoDaTela } from './base.mjs';

const { pagina, navegador } = await abrirEditor('demo-kit');
await pagina.locator('button', { hasText: /^Projetos$/ }).first().click();
await esperar(1500);

// abre o primeiro trabalho da lista
const editar = pagina.locator('[data-editar]').first();
if (!(await editar.count())) { console.log('sem trabalho para editar'); await navegador.close(); process.exit(1); }
await editar.click();
await esperar(1500);

// abre os passos fechados, onde mora o campo de video
for (const d of await pagina.$$('details')) await d.evaluate((e) => { e.open = true; });
await esperar(500);

const campoVideo = pagina.locator('[data-campo="video"] input').first();
if (!(await campoVideo.count())) { console.log('campo de video nao encontrado'); await navegador.close(); process.exit(1); }

const nomeAntes = await pagina.locator('[data-campo="name"] input').first().inputValue();
const marca = `Alterado ${Date.now() % 100000}`;
await pagina.locator('[data-campo="name"] input').first().fill(marca);
await campoVideo.fill('https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC');
await esperar(600);

await pagina.locator('#ed-form-salvar').click();
await esperar(4000);

const texto = await textoDaTela(pagina);
const travou = texto.includes('Confira os campos marcados');
const salvou = texto.includes(marca);
console.log(`nome antes:      ${nomeAntes}`);
console.log(`travou o salvar: ${travou ? 'SIM (defeito)' : 'nao'}`);
console.log(`gravou o resto:  ${salvou ? 'sim' : 'NAO (defeito)'}`);
await pagina.screenshot({ path: 'out/campo-opcional.png', clip: { x: 0, y: 0, width: 1440, height: 900 } });
await navegador.close();
process.exit(!travou && salvou ? 0 : 1);
