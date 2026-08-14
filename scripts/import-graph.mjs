// Guarda de fronteira: percorre o grafo de imports a partir de entradas declaradas e
// reprova quem importar o que nao pode.
//
// POR QUE ISSO EXISTE, e por que nao e um grep: o codigo do portfolio vai rodar em TRES
// lugares diferentes, com capacidades diferentes.
//   [iso]     roda nos dois: no browser e dentro do Worker. Nao pode tocar em document,
//             em CSS, em lucide nem em import.meta.env, porque nada disso existe no Worker.
//   [browser] so no navegador. Pode tudo.
//   [worker]  so na borda.
// Um import errado em [iso] nao quebra o build nem o site: quebra o SSR, em producao, no
// subdominio de um cliente pagante. Grep nao pega porque o import proibido costuma estar a
// tres saltos de distancia, num arquivo que ninguem olhou.
//
// Um criterio anterior tentava medir isso pelo tamanho do bundle (`dist/assets/*.js` abaixo
// de 35 KB gzip). Nao funciona: o Vite joga os chunks do editor no mesmo diretorio, e o
// editor carrega o supabase-js de proposito. O glob somava tudo e estourava sempre, entao
// nunca distinguia vazamento de funcionamento normal. Fecho transitivo distingue.
//
//   node scripts/import-graph.mjs --config scripts/boundary.config.json
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, dirname, extname } from 'node:path';

const args = process.argv.slice(2);
const iCfg = args.indexOf('--config');
const cfgArq = resolve(process.cwd(), iCfg >= 0 ? args[iCfg + 1] : 'scripts/boundary.config.json');
const cfg = JSON.parse(await readFile(cfgArq, 'utf8'));

// Resolve um especificador relativo para um arquivo real, tentando as extensoes que o
// projeto usa. Especificador que nao resolve para arquivo local e dependencia externa.
function resolverLocal(de, spec) {
  if (!spec.startsWith('.')) return null;
  const base = resolve(dirname(de), spec);
  const tentativas = [base, `${base}.js`, `${base}.mjs`, `${base}/index.js`];
  for (const t of tentativas) if (existsSync(t) && extname(t)) return t;
  return null;
}

const RE_IMPORT = /(?:^|\n)\s*import\s+(?:[^'"]*?from\s+)?['"]([^'"]+)['"]/g;
const RE_IMPORT_DIN = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

async function importsDe(arquivo) {
  const src = await readFile(arquivo, 'utf8');
  const achados = [];
  for (const re of [RE_IMPORT, RE_IMPORT_DIN]) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(src)) !== null) achados.push(m[1]);
  }
  return { imports: achados, src };
}

let reprovou = false;

for (const zona of cfg.zonas) {
  const visitados = new Map(); // arquivo -> quem importou
  const fila = zona.entradas.map((e) => ({ arq: resolve(process.cwd(), e), via: '(entrada)' }));
  const violacoes = [];

  while (fila.length) {
    const { arq, via } = fila.shift();
    if (visitados.has(arq)) continue;
    visitados.set(arq, via);
    if (!existsSync(arq)) continue;

    const { imports, src } = await importsDe(arq);
    const rel = arq.replace(process.cwd() + '\\', '').replace(process.cwd() + '/', '').replace(/\\/g, '/');

    for (const padrao of zona.proibirTexto || []) {
      if (src.includes(padrao)) violacoes.push(`${rel} usa "${padrao}" (via ${via})`);
    }

    for (const spec of imports) {
      for (const padrao of zona.proibirImports || []) {
        const casa = padrao.startsWith('*.') ? spec.endsWith(padrao.slice(1)) : spec === padrao || spec.includes(padrao);
        if (casa) violacoes.push(`${rel} importa "${spec}" (via ${via})`);
      }
      const alvo = resolverLocal(arq, spec);
      if (alvo) fila.push({ arq: alvo, via: rel });
    }
  }

  console.log(`\n[${zona.nome}] ${visitados.size} arquivos no fecho transitivo`);
  if (violacoes.length) {
    reprovou = true;
    for (const v of violacoes) console.log(`  PROIBIDO: ${v}`);
  } else {
    console.log('  ok, nenhuma fronteira violada');
  }
}

console.log(reprovou ? '\nREPROVOU' : '\nOK: todas as zonas respeitam a fronteira');
process.exit(reprovou ? 1 : 0);
