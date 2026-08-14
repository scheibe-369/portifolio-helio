// Guarda o <head> que o site serve HOJE e compara depois, campo a campo.
//
// POR QUE ISSO EXISTE: quando o Worker passar a montar o <head> por tenant (fase 1), o
// preview de link do Helio no WhatsApp e no LinkedIn precisa continuar identico. Um plano
// anterior tentava provar isso com `curl ... | grep -c "og:image"`, que devolve CONTAGEM DE
// LINHA, nao igualdade: passava com qualquer og:image, inclusive a errada.
//
//   node scripts/head-snapshot.mjs --capture https://host/            grava snapshot/head-helio.json
//   node scripts/head-snapshot.mjs --compare https://host/            compara contra o gravado
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { parseHTML } from 'linkedom';
import { resolve, dirname } from 'node:path';

const args = process.argv.slice(2);
const modo = args.includes('--compare') ? 'compare' : 'capture';
const url = args[args.indexOf(modo === 'compare' ? '--compare' : '--capture') + 1];
const iArq = args.indexOf('--arquivo');
const arquivo = resolve(process.cwd(), iArq >= 0 ? args[iArq + 1] : 'snapshot/head-helio.json');

if (!url) {
  console.error('uso: node scripts/head-snapshot.mjs --capture|--compare <url> [--arquivo caminho.json]');
  process.exit(2);
}

// Os campos que decidem como o link aparece quando alguem cola no WhatsApp, no LinkedIn ou
// no Google. Lista fechada de proposito: crescer ela sem pensar transforma o teste em ruido.
const CAMPOS = [
  { nome: 'title', ler: (d) => d.querySelector('title')?.textContent },
  { nome: 'description', ler: (d) => d.querySelector('meta[name="description"]')?.getAttribute('content') },
  { nome: 'canonical', ler: (d) => d.querySelector('link[rel="canonical"]')?.getAttribute('href') },
  { nome: 'og:title', ler: (d) => d.querySelector('meta[property="og:title"]')?.getAttribute('content') },
  { nome: 'og:description', ler: (d) => d.querySelector('meta[property="og:description"]')?.getAttribute('content') },
  { nome: 'og:image', ler: (d) => d.querySelector('meta[property="og:image"]')?.getAttribute('content') },
  { nome: 'og:url', ler: (d) => d.querySelector('meta[property="og:url"]')?.getAttribute('content') },
  { nome: 'twitter:card', ler: (d) => d.querySelector('meta[name="twitter:card"]')?.getAttribute('content') },
  { nome: 'lang', ler: (d) => d.documentElement?.getAttribute('lang') },
];

// A protecao de bot da Cloudflare devolve 403 para user-agent de script (o urllib do Python
// levou 403 dez vezes seguidas nesta mesma zona). Um UA de navegador passa, e como o alvo e
// sempre um site nosso, isso e conveniencia e nao contorno de protecao de terceiro.
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) head-snapshot/1.0';

async function lerHead(alvo) {
  // Cache buster: sem ele o script le a versao anterior logo depois de um deploy e grava um
  // baseline do passado, que e pior do que nao ter baseline.
  const comBuster = new URL(alvo);
  comBuster.searchParams.set('_hs', Date.now().toString(36));
  const r = await fetch(comBuster, { redirect: 'follow', headers: { 'user-agent': UA } });
  if (!r.ok) throw new Error(`${alvo} respondeu ${r.status}`);
  const { document } = parseHTML(await r.text());
  const out = { url: alvo };
  for (const c of CAMPOS) out[c.nome] = c.ler(document) ?? null;

  // og:image so vale se ela EXISTE e e imagem de verdade. Meta apontando para 404 da
  // preview quebrada, e "o campo esta la" nao prova nada.
  if (out['og:image']) {
    try {
      const abs = new URL(out['og:image'], alvo).toString();
      const img = await fetch(abs, { method: 'GET', headers: { range: 'bytes=0-0', 'user-agent': UA } });
      out['og:image__status'] = img.status;
      out['og:image__tipo'] = img.headers.get('content-type');
    } catch (e) {
      out['og:image__status'] = 'erro';
      out['og:image__tipo'] = String(e.message).slice(0, 60);
    }
  }
  return out;
}

const atual = await lerHead(url);

if (modo === 'capture') {
  await mkdir(dirname(arquivo), { recursive: true });
  await writeFile(arquivo, JSON.stringify(atual, null, 2), 'utf8');
  console.log(`gravado ${arquivo}`);
  for (const [k, v] of Object.entries(atual)) console.log(`  ${k}: ${v}`);
  process.exit(0);
}

const base = JSON.parse(await readFile(arquivo, 'utf8'));
const problemas = [];
for (const c of CAMPOS) {
  const a = base[c.nome];
  const b = atual[c.nome];
  if (a !== b) problemas.push(`${c.nome}\n    antes : ${a}\n    depois: ${b}`);
}
if (atual['og:image__status'] && atual['og:image__status'] !== 200 && atual['og:image__status'] !== 206) {
  problemas.push(`og:image nao carrega: status ${atual['og:image__status']}`);
}
if (atual['og:image__tipo'] && !String(atual['og:image__tipo']).startsWith('image/')) {
  problemas.push(`og:image nao e imagem: content-type ${atual['og:image__tipo']}`);
}

console.log(`comparando ${url} contra ${arquivo}`);
for (const p of problemas) console.log(`  DIFERENTE: ${p}`);
console.log(problemas.length ? '\nREPROVOU' : '\nOK: o <head> continua identico campo a campo, e a og:image carrega');
process.exit(problemas.length ? 1 : 0);
