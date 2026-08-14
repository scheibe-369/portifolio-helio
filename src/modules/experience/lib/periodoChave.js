// Copia DECLARADA de myportifolio.periodo_chave() e myportifolio.periodo_valido(), do
// 0007_experiencias.sql. Zona [iso], mas hoje so o editor a alcanca.
//
// POR QUE UMA COPIA, e por que ela esta escrita aqui e nao inventada em cada tela: ordenar
// experiencia por periodo exige comparar '2024' com '03/2024' dezenas de vezes num clique, e
// uma RPC por comparacao seria uma viagem de rede por par. O preco de copiar e divergir com
// o tempo, e divergir aqui tem um sintoma exato: o editor aceita "03/2024 a 2024", o insert
// e recusado pelo CHECK, e o comprador perde o que digitou. Por isso o criterio 11 de 6.11
// compara as duas implementacoes caso a caso, e por isso qualquer mudanca aqui obriga a
// mudar o SQL no mesmo commit.
//
// O ramo final NAO valida antes de fatiar, de proposito: o SQL tambem nao valida, e imitar
// o comportamento dele para entrada invalida e o que faz as duas saidas baterem string a
// string. Quem valida e periodoValido(), chamada pelo formulario antes de gravar.

const FORMATO = /^([0-9]{4}|(0[1-9]|1[0-2])\/[0-9]{4})$/;

export const periodoValido = (valor) => valor == null || valor === '' || FORMATO.test(String(valor));

// p_fim existe porque ano solto significa coisas diferentes nas duas pontas: '2024' como
// inicio e o comeco de 2024, como fim e o fim de 2024. Sem isso, "03/2024 a 2024" seria
// recusado como fim antes do inicio, que e uma linha de curriculo perfeitamente normal.
export function periodoChave(valor, fim = false) {
  if (valor == null || valor === '') return null;
  const s = String(valor);
  if (/^[0-9]{4}$/.test(s)) return s + (fim ? '12' : '01');
  return s.slice(3, 7) + s.slice(0, 2);
}

// "o fim veio antes do inicio?", com a mesma pergunta do constraint experiences_ordem_ok.
export function periodoCoerente(inicio, fim) {
  if (!fim) return true;
  return periodoChave(fim, true) >= periodoChave(inicio);
}

// Ordena da mais recente para a mais antiga. Entrada atual (sem fim) vem primeiro, porque e
// o que a pessoa esta vivendo agora; o desempate e pelo inicio, pela mesma razao.
export function ordenarPorPeriodo(itens) {
  const chave = (x) => (x.period_end ? periodoChave(x.period_end, true) : '999912');
  return [...itens].sort((a, b) => {
    const d = String(chave(b)).localeCompare(String(chave(a)));
    return d !== 0 ? d : String(periodoChave(b.period_start)).localeCompare(String(periodoChave(a.period_start)));
  });
}
