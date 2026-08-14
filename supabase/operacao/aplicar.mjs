// Aplica um .sql de supabase/operacao/ no banco, dentro de transacao.
//
// POR QUE EXISTE, tendo scripts/validar-migrations.mjs: aquele roda a pasta migrations
// INTEIRA, encadeada, porque 0002 depende de 0001. Os arquivos daqui sao aditivos e
// independentes, e reaplicar as sete migrations so para conceder um privilegio seria
// arriscar o banco compartilhado sem motivo.
//
// POR QUE ROLLBACK POR PADRAO: DDL no Postgres e transacional, e este banco tem os clientes
// pagantes do AI Block dentro. Da para executar tudo, ver se passa, e desfazer sem deixar
// rastro. Nao existe motivo para descobrir erro de sintaxe aplicando de verdade.
//
//   node supabase/operacao/aplicar.mjs <arquivo.sql>            valida e desfaz
//   node supabase/operacao/aplicar.mjs <arquivo.sql> --aplicar  aplica DE VERDADE (commit)
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { lerEnv, consultar } from './lib/db.mjs';

const args = process.argv.slice(2);
const APLICAR = args.includes('--aplicar');
const alvo = args.find((a) => a.endsWith('.sql'));

if (!alvo) {
  console.error('uso: node supabase/operacao/aplicar.mjs <arquivo.sql> [--aplicar]');
  process.exit(2);
}

const corpo = await readFile(resolve(process.cwd(), alvo), 'utf8');
const sql = APLICAR ? corpo : `begin;\n${corpo}\nrollback;`;

const env = await lerEnv();
try {
  await consultar(env, sql);
  console.log(
    APLICAR
      ? `APLICADO (commit dado): ${alvo}`
      : `OK: ${alvo} roda limpo. Rollback dado, nada gravado.`,
  );
} catch (e) {
  console.error('REPROVOU:', String(e.message).slice(0, 500));
  const m = String(e.message).match(/LINE (\d+)/);
  if (m) {
    const n = Number(m[1]);
    const linhas = sql.split('\n');
    for (let i = Math.max(0, n - 4); i < Math.min(linhas.length, n + 3); i++) {
      console.error(`${i + 1 === n ? '>>' : '  '} ${i + 1}: ${linhas[i]}`);
    }
  }
  process.exit(1);
}
