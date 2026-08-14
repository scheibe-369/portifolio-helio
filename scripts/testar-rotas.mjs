// Testa o roteamento interno do editor.
//
// POR QUE ISTO EXISTE, e por que ele entra no `npm run verificar`: nenhuma das outras
// ferramentas da suite olha roteamento. O build compila, a fronteira de execucao confere
// import, o dom-diff compara o HTML da pagina publica, e o medir-render mede tempo. Um
// roteador que manda /app/conta para a tela errada passa nos quatro.
//
// E foi o que aconteceu: a primeira versao comparava o `pathname` cru contra '/conta', que
// nunca casa, porque o bundle do editor so e servido em /app e /app/* (worker/rotas/apex.js).
// O sintoma era duplo e nenhum dos dois da erro no console: a tela de Conta so existia pelo
// botao, e o "voltar" apontava a barra de enderecos para '/', que num F5 serve o portfolio do
// Helio em vez do editor.
//
//   node scripts/testar-rotas.mjs
import { rotaInterna, BASE } from '../src/app/rotaInterna.js';

const casos = [
  ['/app', '/'],
  ['/app/', '/'],
  ['/app/conta', '/conta'],
  ['/app/conta/', '/conta'],
  ['/app/admin/fila', '/admin/fila'],
  ['/app/admin/fila/', '/admin/fila'],
  ['/app/admin/acessos', '/admin/acessos'],
  ['/app/admin/mfa', '/admin/mfa'],
  // As duas juridicas moram no apex, fora do prefixo, e tem que atravessar intactas.
  ['/termos', '/termos'],
  ['/privacidade', '/privacidade'],
  ['/', '/'],
  ['', '/'],
  // Prefixo PARECIDO nao e o prefixo. Sem a barra no `startsWith`, '/apparat' viraria
  // '/arat' e o editor abriria numa rota que nao existe, sem erro nenhum.
  ['/apparat', '/apparat'],
  ['/app-loja', '/app-loja'],
];

let falhas = 0;
for (const [entrada, esperado] of casos) {
  const saida = rotaInterna(entrada);
  const ok = saida === esperado;
  if (!ok) {
    falhas++;
    console.error(`FALHOU  ${JSON.stringify(entrada)} -> ${JSON.stringify(saida)}, esperava ${JSON.stringify(esperado)}`);
  }
}

if (falhas) {
  console.error(`\n${falhas} de ${casos.length} rotas erradas`);
  process.exit(1);
}
console.log(`OK: ${casos.length} rotas internas do editor, prefixo ${BASE}`);
