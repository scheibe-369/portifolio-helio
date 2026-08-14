// A copia da pagina de oferta, separada do render pelo mesmo motivo que a copia juridica:
// texto que decide compra e revisado por quem escreve, nao por quem mexe em classe de CSS.
//
// REGRA DE ESTILO DA CASA, e ela vale como revisao deste arquivo: nada de travessao. Onde
// pediria travessao, entra virgula, ponto, dois pontos ou parenteses.
//
// O QUE ESTA COPIA NAO PODE PROMETER, porque a fase 1 nao entrega: dominio proprio da
// pessoa, tema com cor livre, varios portfolios na mesma conta. Prometer aqui e gerar
// reembolso la, e o prazo de arrependimento de 7 dias esta escrito nos termos.

export const oferta = {
  titulo: 'Seu portfólio no ar hoje',
  chamada:
    'O mesmo portfólio que você acabou de ver, no seu nome, no seu endereço, editável por você quando quiser.',

  // Cada linha responde a uma objecao real, na ordem em que ela aparece na cabeca de quem
  // esta decidindo: o que eu recebo, quanto trabalho da, e quanto tempo dura.
  entregas: [
    {
      titulo: 'Endereço só seu',
      texto:
        'Você escolhe o endereço na hora de montar, e ele fica reservado enquanto for seu. Nada de número no fim do nome.',
    },
    {
      titulo: 'Você edita, sem depender de ninguém',
      texto:
        'Foto, bio, projetos, imagens, vídeo do YouTube e experiências. Você mexe, vê mudar na hora e publica quando estiver bom.',
    },
    {
      titulo: 'Experiências com certificado',
      texto:
        'Cada passagem por empresa, faculdade ou curso entra com a logo da instituição e o certificado anexado, se você quiser mostrar.',
    },
    {
      titulo: 'Pagamento único',
      texto:
        'Você paga uma vez e o acesso é seu. Não existe mensalidade, e o portfólio não sai do ar porque um mês virou.',
    },
  ],

  // Dizer o preco do bump ANTES do checkout e escolha deliberada. O plano manda mostrar um
  // botao so, e mostra: a caixinha continua sendo marcada la dentro. Mas descobrir um valor
  // a mais so na tela de pagamento e o tipo de surpresa que vira chargeback, e chargeback
  // reincidente bloqueia a conta (5.x). Uma linha honesta aqui sai mais barato.
  observacaoBump:
    'Dentro do checkout você pode marcar, se quiser, a personalização de cores e detalhes por mais R$ 37,00. É opcional, e o portfólio funciona inteiro sem ela.',

  // Perguntas que hoje chegariam por mensagem. Cada uma que a pagina responde e um ticket
  // que nao nasce, e uma duvida a menos entre o visitante e o botao.
  duvidas: [
    {
      p: 'Preciso saber programar?',
      r: 'Não. Você preenche campos e vê o resultado do lado, do mesmo jeito que preencheria um perfil de rede social.',
    },
    {
      p: 'Posso mudar o endereço depois?',
      r: 'Pode, e o endereço antigo passa a ficar livre para outra pessoa. Vale trocar antes de sair divulgando o link.',
    },
    {
      p: 'E se eu me arrepender?',
      r: 'Você tem 7 dias para desistir e receber o valor de volta, como manda o Código de Defesa do Consumidor. O pedido sai por um botão dentro da sua conta.',
    },
    {
      p: 'Não tenho tempo de montar.',
      r: 'Depois de comprar, dentro do editor, existe a opção de a gente montar por você. Ela não faz parte deste valor.',
    },
  ],

  chamadaBotao: 'Quero o meu',
};
