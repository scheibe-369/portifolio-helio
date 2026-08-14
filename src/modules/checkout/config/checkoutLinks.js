// Fonte UNICA dos links de checkout da Hubla. Zona [iso]: o Worker monta a pagina de oferta
// na borda, entao este arquivo nao pode depender de nada de navegador.
//
// POR QUE CENTRALIZAR uma coisa que sao duas urls: porque link de checkout errado nao quebra
// nada de forma visivel. A pagina abre, o botao funciona, e o dinheiro vai para o produto
// errado (ou para lugar nenhum) ate alguem conferir a mao. Com um arquivo so, trocar de
// oferta e uma linha, e a conferencia e ler cinco linhas em vez de caçar 'pay.hub.la' pelo
// repositorio inteiro.
//
// A RELACAO COM O WEBHOOK, que e o que faz o dinheiro virar acesso: o id que a Hubla manda
// no evento tem que estar em supabase/functions/hubla-webhook/productFlags.ts. Os dois
// arquivos falam do MESMO produto por caminhos diferentes (aqui a url que o comprador clica,
// la o id que o servidor recebe), entao mexer num sem olhar o outro e como vende e nao
// libera. O productFlags.ts aceita os dois formatos de id justamente por isso.

export const CHECKOUT = {
  // O principal. E o UNICO link que a pagina /comprar mostra.
  //
  // O order bump de personalizacao (R$ 37,00) mora DENTRO deste checkout e nao tem link
  // proprio: quem quiser marca a caixinha na hora de pagar. Por isso a pagina de oferta tem
  // um botao e nao dois.
  principal: {
    url: 'https://pay.hub.la/U9cuWxeCOsTvt4urY5vS',
    preco: 'R$ 47,90',
    precoNumero: 47.9,
  },

  // Facilitacao: nos montamos o portfolio pela pessoa.
  //
  // ELE NAO PODE APARECER EM /comprar. Nao e pudor, e leitura de preco: um SKU de R$ 490 ao
  // lado de um de R$ 47,90 faz o visitante ancorar no numero grande e o funil principal
  // perde conversao. O lugar dele e dentro do editor, oferecido a quem ja comprou e ja
  // sentiu o trabalho que da preencher tudo (secao 9.2 e 9.3 do plano).
  facilitacao: {
    url: 'https://pay.hub.la/q7IxDLHWM6OI8EBmrreo',
    preco: 'R$ 490,00',
    precoNumero: 490,
  },
};

// O bump nao tem url porque nao tem checkout proprio. O preco fica aqui so para a copia da
// pagina de oferta nao ter numero solto no meio do texto.
export const BUMP_PERSONALIZACAO = { preco: 'R$ 37,00', precoNumero: 37 };
