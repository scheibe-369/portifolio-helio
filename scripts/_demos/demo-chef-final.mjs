// Ultima conferencia: o que o editor diz DEPOIS de publicar, e se o botao do certificado
// abre alguma coisa na pagina que a chef vai mandar para o cliente.
import { abrirEditor, esperar } from './base.mjs';
import { readFile, writeFile } from 'node:fs/promises';

const { pagina, navegador, erros } = await abrirEditor('demo-chef', { headless: true });

console.log('=== BARRA DO EDITOR DEPOIS DE PUBLICAR ===');
console.log(await pagina.evaluate(() => {
  const b = document.querySelector('#ed-barra');
  return b ? b.innerText.replace(/\n+/g, ' | ') : '(sem barra)';
}));

await pagina.click('[data-abrir="publicar"]');
await esperar(2000);
console.log('rotulo do botao:', await pagina.evaluate(() => document.querySelector('#ed-gaveta [data-publicar]')?.textContent?.trim()));
console.log('desabilitado:', await pagina.evaluate(() => document.querySelector('#ed-gaveta [data-publicar]')?.disabled));
console.log('existe "tirar do ar":', await pagina.evaluate(() => Boolean(document.querySelector('#ed-gaveta [data-tirar-do-ar]'))));
console.log('a tela fala em revisao?', await pagina.evaluate(() => /revis/i.test(document.querySelector('#ed-gaveta').innerText)));

// O certificado, na previa.
const url = (await readFile('out/chef-previa-url.txt', 'utf8')).trim();
const p2 = await pagina.context().newPage();
await p2.goto(url, { waitUntil: 'networkidle' });
await esperar(2000);
const cert = await p2.evaluate(() => {
  const a = [...document.querySelectorAll('a')].find((x) => /cuisine|certificad/i.test(x.textContent));
  return a ? { texto: a.textContent.trim(), href: a.href, alvo: a.target } : null;
});
console.log('\nbotao do certificado:', JSON.stringify(cert));
if (cert?.href) {
  const r = await p2.request.get(cert.href, { maxRedirects: 0 }).catch((e) => null);
  console.log('certificado HTTP:', r?.status(), r?.headers()['content-type'] || '', (r?.headers()['location'] || '').slice(0, 90));
}

// O que o rodape diz e o credito de producao.
console.log('\nrodape:', await p2.evaluate(() => document.querySelector('footer')?.innerText.replace(/\n+/g, ' | ') || '(sem footer)'));
// A pagina publicada carrega a classe do template antigo?
const marcas = await p2.evaluate(() => ({
  vibecoderBtn: document.querySelectorAll('.vibecoder-btn').length,
  html: document.documentElement.outerHTML.length,
  noindex: Boolean(document.querySelector('meta[name="robots"]')?.content),
  robots: document.querySelector('meta[name="robots"]')?.content || '',
  title: document.title,
  desc: document.querySelector('meta[name="description"]')?.content || '',
}));
console.log('marcas:', JSON.stringify(marcas));
await writeFile('out/chef-marcas.json', JSON.stringify(marcas, null, 1), 'utf8');
await p2.close();

console.log('\nERROS:', [...new Set(erros)].join('\n') || '(nenhum)');
await navegador.close();
