// Acesso ao banco pela Management API da Supabase, para as rotinas de operacao.
//
// POR QUE A MANAGEMENT API, e nao o PostgREST com a service role: estas rotinas leem extrato
// de venda e conferem concessao, e nenhuma delas deveria depender de o schema myportifolio
// estar exposto no PostgREST nem de GRANT nenhum. A Management API executa como `postgres`,
// que enxerga tudo, e a credencial dela (SUPABASE_ACCESS_TOKEN) e de dono, nao de aplicacao,
// que e exatamente o perfil de quem roda conciliacao.
//
// POR QUE NAO ENTRA NO BUNDLE: nada aqui e importado por src/ nem por worker/. E ferramenta
// de linha de comando, roda na maquina do dono ou num agendador.
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export async function lerEnv() {
  const texto = await readFile(resolve(process.cwd(), '.env.local'), 'utf8');
  const env = Object.fromEntries(
    texto
      .split('\n')
      .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
      .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
  );
  if (!env.SUPABASE_ACCESS_TOKEN || !env.SUPABASE_PROJECT_REF) {
    throw new Error('faltam SUPABASE_ACCESS_TOKEN ou SUPABASE_PROJECT_REF em .env.local');
  }
  return env;
}

export async function consultar(env, sql) {
  // A API da Supabase fica atras da Cloudflare, que devolve 403 (codigo 1010) para
  // user-agent de script. Um UA de navegador passa. Mesmo detalhe que ja mordeu o
  // validar-migrations.mjs.
  const r = await fetch(
    `https://api.supabase.com/v1/projects/${env.SUPABASE_PROJECT_REF}/database/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
      body: JSON.stringify({ query: sql }),
    },
  );
  const texto = await r.text();
  let d;
  try {
    d = JSON.parse(texto);
  } catch {
    throw new Error(`resposta nao-json da Management API: ${texto.slice(0, 300)}`);
  }
  if (!Array.isArray(d)) throw new Error(d.message || JSON.stringify(d));
  return d;
}

// Literal de texto para SQL. Existe porque a Management API recebe uma string de SQL e nao
// tem bind de parametro: sem escapar aspas, um e-mail com apostrofo (existe) vira erro de
// sintaxe, e um campo vindo de CSV de terceiro vira injecao.
export function txt(v) {
  if (v === null || v === undefined || v === '') return 'null';
  return `'${String(v).replace(/'/g, "''")}'`;
}

// Valor monetario vindo de planilha. So trata o ponto como separador de milhar quando existe
// virgula na string: "47,90" e pt-BR e vira 47.90, mas "47.90" ja e o numero e nao pode virar
// 4790, que seria um erro de conciliacao de duas ordens de grandeza.
export function num(v) {
  if (v === null || v === undefined || v === '') return 'null';
  const limpo = String(v).replace(/[R$\s]/g, '');
  const n = Number(limpo.includes(',') ? limpo.replace(/\./g, '').replace(',', '.') : limpo);
  return Number.isFinite(n) ? String(n) : 'null';
}
