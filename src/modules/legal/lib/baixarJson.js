// Salva um objeto como arquivo .json no computador de quem clicou.
//
// O download nasce de um Blob local e nao de uma URL do servidor porque o conteudo e dado
// pessoal do titular: mandar ele passear por um endereco publico, mesmo temporario, seria
// criar um vazamento novo dentro da funcao escrita para atender a LGPD.
//
// revokeObjectURL nao e detalhe: sem ele, cada exportacao segura o JSON inteiro na memoria
// da aba ate ela fechar, e exportacao de portfolio cheio nao e um objeto pequeno.
export function baixarJson(nomeArquivo, objeto) {
  const blob = new Blob([JSON.stringify(objeto, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nomeArquivo;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
