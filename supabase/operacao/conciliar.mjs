// CONCILIACAO DE VENDAS DO MYPORTIFOLIO (secao 5.11 do plano, item 12 da fase 1).
//
// Duas rotinas num arquivo so, porque sao a mesma pergunta em duas frequencias:
//
//   node supabase/operacao/conciliar.mjs --importar extrato.csv
//       Segunda de manha. Carrega o extrato da Hubla em myportifolio.vendas_conferidas.
//
//   node supabase/operacao/conciliar.mjs
//       Roda as tres telas e imprime. Sai com codigo 1 se achou divergencia, para servir de
//       alvo de agendador sem precisar de ninguem lendo a saida.
//
//   node supabase/operacao/conciliar.mjs --email
//       O mesmo, e manda o resumo pelo Resend. E este o alarme de volume diario.
//
// O QUE ESTE ARQUIVO NAO FAZ, de proposito: corrigir nada sozinho. Concessao sem venda pode
// ser fraude, mas pode ser uma cortesia que alguem esqueceu de declarar como 'cortesia'.
// Revogar acesso vitalicio por decisao de script e pior que o problema que ele detecta.
//
// FORMATO DO CSV: cabecalho com email, produto, pedido_id, valor, vendido_em. O extrato da
// Hubla nao sai assim (o formato dele e suposicao S16, nao verificada), entao a normalizacao
// para essas cinco colunas e passo manual do operador. Assumir um layout que ninguem
// confirmou seria trocar um trabalho de dois minutos por um bug silencioso na conciliacao.
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { lerEnv, consultar, txt, num } from './lib/db.mjs';

const args = process.argv.slice(2);
const arquivoCsv = args[args.indexOf('--importar') + 1];
const IMPORTAR = args.includes('--importar');
const EMAIL = args.includes('--email');

const env = await lerEnv();

// --------------------------------------------------------------------------
// CSV
// --------------------------------------------------------------------------
// Parser proprio de 20 linhas em vez de dependencia: o arquivo e um extrato normalizado a
// mao, com cinco colunas, e trazer biblioteca para isso e superficie a toa num script que
// roda com credencial de dono do projeto.
function lerCsv(texto) {
  const linhas = texto.replace(/\r\n/g, '\n').trim().split('\n');
  const separador = linhas[0].includes(';') ? ';' : ',';
  const campos = (linha) => {
    const saida = [];
    let atual = '';
    let aspas = false;
    for (let i = 0; i < linha.length; i++) {
      const c = linha[i];
      if (c === '"') {
        if (aspas && linha[i + 1] === '"') {
          atual += '"';
          i++;
        } else aspas = !aspas;
      } else if (c === separador && !aspas) {
        saida.push(atual);
        atual = '';
      } else atual += c;
    }
    saida.push(atual);
    return saida.map((s) => s.trim());
  };
  const cabecalho = campos(linhas[0]).map((h) => h.toLowerCase());
  return linhas.slice(1).filter(Boolean).map((l) => {
    const v = campos(l);
    return Object.fromEntries(cabecalho.map((h, i) => [h, v[i] ?? '']));
  });
}

async function importar(caminho) {
  const linhas = lerCsv(await readFile(resolve(process.cwd(), caminho), 'utf8'));
  if (linhas.length === 0) {
    console.error('CSV vazio');
    process.exit(2);
  }

  const obrigatorias = ['email', 'produto', 'pedido_id'];
  const faltando = obrigatorias.filter((c) => !(c in linhas[0]));
  if (faltando.length > 0) {
    console.error(`faltam colunas no CSV: ${faltando.join(', ')}`);
    process.exit(2);
  }

  const validos = new Set(['main', 'custom', 'setup']);
  const invalidas = linhas.filter((l) => !validos.has(l.produto.toLowerCase()));
  if (invalidas.length > 0) {
    // Abortar inteiro em vez de pular a linha ruim: extrato importado pela metade produz
    // "concessao sem venda" falsa, e falso positivo e o que faz o dono parar de olhar o
    // relatorio.
    console.error(
      `produto invalido em ${invalidas.length} linha(s). Use main, custom ou setup. Ex.: ${invalidas[0].pedido_id} -> "${invalidas[0].produto}"`,
    );
    process.exit(2);
  }

  const valores = linhas
    .map((l) =>
      `(${txt(l.pedido_id)}, ${txt(l.produto.toLowerCase())}, ${txt(l.email.trim().toLowerCase())}, ` +
      `${num(l.valor)}, ${txt(l.vendido_em)}::timestamptz, 'extrato-hubla')`,
    )
    .join(',\n  ');

  // on conflict do update, e nao delete + insert: extrato corrigido pela Hubla corrige aqui,
  // e reimportar a mesma semana duas vezes nao duplica nem apaga nada.
  await consultar(
    env,
    `insert into myportifolio.vendas_conferidas
       (pedido_id, produto, email, valor, vendido_em, fonte)
     values\n  ${valores}
     on conflict (pedido_id, produto) do update set
       email = excluded.email,
       valor = excluded.valor,
       vendido_em = excluded.vendido_em,
       fonte = excluded.fonte,
       importado_em = now();`,
  );
  console.log(`${linhas.length} linha(s) de extrato importadas.`);
}

// --------------------------------------------------------------------------
// As tres telas
// --------------------------------------------------------------------------
async function conferir() {
  const [resumo] = await consultar(env, 'select * from myportifolio.alarme_volume_24h;');
  const semVenda = await consultar(
    env,
    'select email, main_granted_at, source, blocked from myportifolio.concessoes_sem_venda order by main_granted_at desc limit 50;',
  );
  const semConcessao = await consultar(
    env,
    'select email, produto, pedido_id, valor, vendido_em, tem_linha_de_acesso, blocked, main_revoked_at from myportifolio.vendas_sem_concessao order by vendido_em desc limit 50;',
  );
  const travados = await consultar(
    env,
    `select id, type, email, product_ids, attempts, processing_error, received_at
       from myportifolio.hubla_events
      where processed_at is null and not is_sandbox
        and received_at < now() - interval '15 minutes'
      order by received_at desc limit 50;`,
  );
  return { resumo, semVenda, semConcessao, travados };
}

function montarRelatorio({ resumo, semVenda, semConcessao, travados }) {
  const l = [];
  l.push('MyPortifolio, conciliacao de vendas');
  l.push('');
  l.push('Ultimas 24 horas');
  l.push(`  main concedidos:   ${resumo.main_24h}`);
  l.push(`  custom concedidos: ${resumo.custom_24h}`);
  l.push(`  setup concedidos:  ${resumo.setup_24h}`);
  l.push('');
  l.push('Divergencias abertas');
  l.push(`  concessoes sem venda: ${resumo.concessoes_sem_venda}   (o unico numero aceitavel e 0)`);
  l.push(`  vendas sem concessao: ${semConcessao.length}`);
  l.push(`  eventos travados:     ${resumo.eventos_travados}`);
  l.push(`  compras incompletas:  ${resumo.compras_incompletas}`);

  if (semVenda.length > 0) {
    l.push('');
    l.push('CONCESSAO SEM VENDA (acesso vitalicio que ninguem pagou, ou cortesia nao declarada)');
    for (const r of semVenda) {
      l.push(`  ${r.email}  concedido em ${r.main_granted_at}  source=${r.source}  blocked=${r.blocked}`);
    }
  }
  if (semConcessao.length > 0) {
    l.push('');
    l.push('VENDA SEM CONCESSAO (pagou e nao entrou, ou reembolso ja processado)');
    for (const r of semConcessao) {
      const nota = r.main_revoked_at ? ` revogado em ${r.main_revoked_at}` : r.tem_linha_de_acesso ? '' : ' SEM LINHA DE ACESSO';
      l.push(`  ${r.email}  ${r.produto}  pedido ${r.pedido_id}  ${r.vendido_em}${nota}`);
    }
  }
  if (travados.length > 0) {
    l.push('');
    l.push('EVENTOS TRAVADOS (entraram no webhook e nunca concluiram)');
    for (const r of travados) {
      l.push(`  ${r.id}  ${r.type}  ${r.email}  ids=${JSON.stringify(r.product_ids)}  tentativas=${r.attempts}  ${r.processing_error ?? ''}`);
    }
  }
  return l.join('\n');
}

async function enviarEmail(texto, alarmado) {
  const chave = env.RESEND_API_KEY;
  const de = env.ALERTA_EMAIL_FROM || (env.RESEND_FROM_DOMAIN ? `alertas@${env.RESEND_FROM_DOMAIN}` : '');
  const para = env.ALERTA_EMAIL_TO;
  if (!chave || !de || !para) {
    console.error('sem RESEND_API_KEY, remetente ou ALERTA_EMAIL_TO em .env.local: e-mail nao enviado');
    return;
  }
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${chave}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: de,
      to: [para],
      subject: alarmado
        ? 'MyPortifolio: divergencia na conciliacao de vendas'
        : 'MyPortifolio: conciliacao do dia, tudo certo',
      text: texto,
    }),
  });
  if (!r.ok) console.error('Resend recusou:', (await r.text()).slice(0, 300));
  else console.log('e-mail enviado.');
}

if (IMPORTAR) {
  if (!arquivoCsv || arquivoCsv.startsWith('--')) {
    console.error('uso: node supabase/operacao/conciliar.mjs --importar <arquivo.csv>');
    process.exit(2);
  }
  await importar(arquivoCsv);
}

const dados = await conferir();
const texto = montarRelatorio(dados);
console.log(texto);

// Codigo de saida 1 quando ha divergencia, para o agendador enxergar sem ler o texto.
// Venda sem concessao NAO entra aqui de proposito: reembolso legitimo cai nessa lista e
// deixaria o script vermelho para sempre, que e como alarme para de ser lido.
const alarmado = Number(dados.resumo.concessoes_sem_venda) > 0 || Number(dados.resumo.eventos_travados) > 0;
if (EMAIL) await enviarEmail(texto, alarmado);
process.exit(alarmado ? 1 : 0);
