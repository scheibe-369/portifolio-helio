// Quais secoes a pagina tem, em que ordem, e quais estao ligadas. Zona [iso].
//
// O QUE E FIXO E POR QUE: o par foto grande + card de perfil nao entra nesta lista. Ele e a
// identidade da pessoa e a ancora do LCP (a foto do topo leva `fetchpriority="high"`), e
// alem disso o editor pendura os alvos "Trocar foto" e "Editar perfil" no primeiro e no
// segundo filho da grade do topo: se aquela grade deixasse de ser o primeiro elemento, os dois
// botoes sumiriam do canvas sem erro nenhum. Reordenar o topo daria pouco e custaria isso.
export const ORDEM_PADRAO = ['stacks', 'projects', 'experience'];

// Resolve a lista que o render vai percorrer, a partir do que veio do banco.
//
// AS QUATRO PROPRIEDADES QUE ELA GARANTE, e cada uma existe por um motivo concreto:
//
//   1. lista vazia, nula ou malformada devolve a ordem canonica. E o estado de todo tenant
//      publicado antes desta feature, e do portfolio do Helio: eles continuam identicos sem
//      precisar gravar nada.
//   2. chave desconhecida e IGNORADA, e nunca lanca. Um deploy revertido, ou um dado
//      adulterado, deixaria o banco citando uma secao que o codigo nao tem mais; lancar ali
//      seria derrubar a pagina de alguem que pagou por causa de um nome de secao.
//   3. secao que existe no codigo e nao esta na lista entra no fim, LIGADA. Assim uma secao
//      nova nasce visivel para quem ja publicou, sem precisar reescrever o jsonb de todo
//      mundo nem subir o payload_v.
//   4. duplicata e descartada. A lista vira ordem de render, e a mesma secao duas vezes
//      renderizaria o mesmo conteudo duas vezes.
export function resolverSecoes(bruto, registro = ORDEM_PADRAO) {
  const vistos = new Set();
  const saida = [];

  if (Array.isArray(bruto)) {
    for (const item of bruto) {
      const key = item && item.key;
      if (!registro.includes(key) || vistos.has(key)) continue;
      vistos.add(key);
      // `on` ausente conta como ligada: o unico jeito de desligar e dizer `false`.
      saida.push({ key, on: item.on !== false });
    }
  }

  for (const key of registro) {
    if (!vistos.has(key)) saida.push({ key, on: true });
  }

  return saida;
}
