// A rota interna do editor. Funcao PURA, sem import nenhum, e por isso testavel em node.
//
// POR QUE ELA MORA SOZINHA num arquivo: ela e pequena e parece obvia demais para ter arquivo
// proprio, e foi exatamente assim que ela nasceu errada. A versao anterior comparava o
// `pathname` cru contra '/conta', o que nunca casa: o bundle do editor so e servido em /app e
// /app/* (worker/rotas/apex.js), entao o endereco real e '/app/conta'. O defeito passou em
// build, em fronteira de execucao e em dom-diff, porque nenhuma dessas ferramentas olha
// roteamento. Aqui dentro, sem import de CSS nem de cliente de banco, ela e alcancavel por um
// teste de node e o mesmo erro nao volta em silencio.
//
// As duas paginas juridicas ficam de fora do prefixo de proposito: elas moram no apex
// (/termos e /privacidade), servidas ja pintadas pelo Worker. O ramo delas dentro do editor
// existe so para o desenvolvimento local e para a navegacao interna mostrarem o MESMO texto,
// saido do mesmo modulo.
export const BASE = '/app';

export function rotaInterna(pathname) {
  const bruto = String(pathname ?? '').replace(/\/+$/, '') || '/';
  if (bruto === BASE) return '/';
  if (bruto.startsWith(`${BASE}/`)) return bruto.slice(BASE.length) || '/';
  return bruto;
}
