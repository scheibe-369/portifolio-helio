// Baixa o corpo REAL de uma Edge Function ja deployada.
//
// POR QUE: antes de deployar por cima de uma function que serve produto pago, a pergunta que
// importa nao e "o meu arquivo bate com o repo do outro projeto", e sim "o meu arquivo bate
// com o que esta rodando AGORA". Repo pode estar defasado dos dois lados; o que responde ao
// cliente e o que esta no ar.
//
//   node scripts/baixar-function.mjs <slug> <pasta-destino>
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';

const env = Object.fromEntries(
  (await readFile(resolve(process.cwd(), '.env.local'), 'utf8'))
    .split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
);
const REF = env.SUPABASE_PROJECT_REF;
const TOKEN = env.SUPABASE_ACCESS_TOKEN;

const slug = process.argv[2];
const destino = process.argv[3];
if (!slug || !destino) {
  console.error('uso: node scripts/baixar-function.mjs <slug> <pasta-destino>');
  process.exit(2);
}

const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/functions/${slug}/body`, {
  headers: {
    Authorization: `Bearer ${TOKEN}`,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
  },
});
if (!r.ok) {
  console.error(`falhou: ${r.status} ${(await r.text()).slice(0, 200)}`);
  process.exit(1);
}

const tipo = r.headers.get('content-type') ?? '';
const bytes = Buffer.from(await r.arrayBuffer());

// A API devolve eszip quando a function foi empacotada, e texto puro quando nao. O eszip
// guarda os arquivos como texto, entao extrair "o que parece codigo" entre os marcadores
// serve para o que interessa aqui, que e comparar linha a linha.
if (tipo.includes('json') || bytes.slice(0, 4).toString() === 'ESZIP') {
  const texto = bytes.toString('utf8');
  // Cada arquivo do pacote aparece precedido do caminho dele (file:///...).
  const partes = [...texto.matchAll(/file:\/\/\/[^\s"]*?\/([\w.-]+\.ts)/g)];
  const vistos = new Set();
  for (const p of partes) {
    if (vistos.has(p[1])) continue;
    vistos.add(p[1]);
  }
  const alvo = resolve(destino, `${slug}.eszip.txt`);
  await mkdir(dirname(alvo), { recursive: true });
  await writeFile(alvo, texto);
  console.log(`pacote salvo em ${alvo} (${bytes.length} bytes)`);
  console.log(`arquivos citados: ${[...vistos].join(', ') || '(nenhum)'}`);
} else {
  const alvo = resolve(destino, `${slug}.ts`);
  await mkdir(dirname(alvo), { recursive: true });
  await writeFile(alvo, bytes);
  console.log(`corpo salvo em ${alvo} (${bytes.length} bytes)`);
}
