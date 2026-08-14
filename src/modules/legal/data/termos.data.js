import { TERMS_VERSION, PRAZOS, CONTATO } from './legal.config.js';

// Termos de uso do MyPortifolio.
//
// Texto especifico deste produto, e nao modelo generico, porque cada clausula aqui responde
// a uma decisao que ja esta travada no plano: pagamento unico, o que "vitalicio" significa,
// os tres prazos (24 horas de conferencia, 90 dias de retencao, 7 dias de arrependimento) e
// o fato de que quem compra publica dado de terceiro (o nome do cliente dele em cada
// projeto). Termo generico que nao diz nada disso e pior que nenhum: ele afirma coisas que o
// sistema nao faz.
export const termos = {
  titulo: 'Termos de uso',
  versao: TERMS_VERSION,
  resumo:
    'Este documento explica o que você compra, o que acontece com o seu portfólio e com os seus dados, e quais são as três únicas saídas possíveis.',
  secoes: [
    {
      id: 'objeto',
      titulo: '1. O que este documento rege',
      blocos: [
        {
          tipo: 'p',
          texto: `O MyPortifolio é um serviço que hospeda um portfólio profissional em um endereço próprio dentro de ${CONTATO.apex}. Ao concluir a compra, criar a conta ou publicar um portfólio, você aceita estes termos na versão vigente.`,
        },
        {
          tipo: 'p',
          texto: `A versão vigente é a ${TERMS_VERSION}. O aceite fica registrado com data, endereço IP e navegador, e uma versão nova nunca apaga o registro da versão anterior: cada versão aceita gera um registro próprio.`,
        },
      ],
    },
    {
      id: 'compra',
      titulo: '2. O que você compra',
      blocos: [
        {
          tipo: 'p',
          texto:
            'A compra é um pagamento único, feito pela Hubla, com o valor informado no checkout. Não existe mensalidade, não existe renovação, não existe cobrança recorrente e não existe inadimplência: nada é cobrado de você depois do pagamento.',
        },
        {
          tipo: 'p',
          texto:
            'Os dois itens adicionais oferecidos (personalização visual e facilitação de montagem) também são pagamento único e são independentes: comprar um deles depois não altera nada do que já foi comprado antes.',
        },
        { tipo: 'p', texto: 'O que a compra do plano principal inclui:' },
        {
          tipo: 'lista',
          itens: [
            'Um endereço no formato seunome.myportifolio.com.br, com certificado de segurança.',
            'O editor do portfólio, com perfil, projetos e experiências.',
            'Hospedagem do portfólio publicado, dentro dos limites de uso justo da seção 7.',
            'Exportação dos seus dados a qualquer momento, em um clique.',
          ],
        },
      ],
    },
    {
      id: 'vitalicio',
      titulo: '3. O que "vitalício" significa aqui',
      blocos: [
        {
          tipo: 'p',
          texto:
            'Usamos a palavra vitalício no sentido de acesso sem prazo de validade e sem nova cobrança, enquanto o serviço existir. Ela não é promessa de hospedagem eterna, e preferimos escrever o compromisso do que deixá-lo subentendido:',
        },
        {
          tipo: 'lista',
          itens: [
            `Garantia mínima de ${PRAZOS.garantiaMinimaMeses} meses de disponibilidade do serviço, contados da sua compra.`,
            `Se o serviço for descontinuado, o aviso chega com ${PRAZOS.avisoDescontinuacaoDias} dias de antecedência, por e-mail.`,
            `A exportação dos seus dados fica disponível durante todo o período e por mais ${PRAZOS.exportacaoAposEncerramentoDias} dias depois do encerramento.`,
            'Em caso de descontinuação, redirecionamos o seu endereço para um destino que você informar, pelo período do aviso.',
          ],
        },
      ],
    },
    {
      id: 'arrependimento',
      titulo: '4. Arrependimento em 7 dias',
      blocos: [
        {
          tipo: 'p',
          texto: `Por ser uma compra feita fora de estabelecimento comercial, vale o artigo 49 do Código de Defesa do Consumidor: você pode desistir em até ${PRAZOS.arrependimentoDias} dias corridos, contados da compra, e receber o valor de volta integralmente, sem precisar justificar.`,
        },
        {
          tipo: 'p',
          texto:
            'O pedido é um botão dentro do editor, visível enquanto o prazo estiver aberto, com os dias restantes escritos ao lado. O prazo é contado a partir da liberação do plano principal, e comprar um item adicional depois não reabre um prazo que já venceu.',
        },
        {
          tipo: 'p',
          texto:
            'Ao solicitar, o portfólio sai do ar no ato. O estorno é processado pela Hubla, pelo mesmo meio de pagamento.',
        },
      ],
    },
    {
      id: 'conteudo',
      titulo: '5. O conteúdo é seu, e a responsabilidade por ele também',
      blocos: [
        {
          tipo: 'p',
          texto:
            'Tudo que você publica continua sendo seu. Você nos autoriza apenas a armazenar e exibir esse conteúdo no endereço do seu portfólio, que é o serviço que você contratou.',
        },
        {
          tipo: 'p',
          texto:
            'Cada projeto do portfólio tem um campo para o nome do cliente daquele trabalho. Isso significa que você publica, em um endereço nosso, dado de uma pessoa ou empresa que não é você. Nessa relação, você é quem decide o que publicar (você é o controlador desse dado) e nós apenas hospedamos por sua conta e ordem (somos operador). É sua a responsabilidade de ter autorização para citar aquele cliente, e de retirar a citação quando ele pedir. Retirar é imediato: basta editar o projeto e publicar de novo.',
        },
        { tipo: 'p', texto: 'Não é permitido publicar no serviço:' },
        {
          tipo: 'lista',
          itens: [
            'Página que se passe por outra pessoa, marca ou instituição, ou que peça senha, cartão ou documento de quem visita.',
            'Conteúdo ilegal, que incite violência ou discriminação, ou material sexual envolvendo menores.',
            'Trabalho de terceiro apresentado como seu, ou material protegido por direito autoral sem autorização.',
            'Dado pessoal sensível de terceiro (saúde, biometria, orientação sexual, convicção religiosa ou política).',
          ],
        },
      ],
    },
    {
      id: 'endereco',
      titulo: '6. O seu endereço',
      blocos: [
        {
          tipo: 'p',
          texto:
            'O endereço é escolhido por você entre os que estiverem livres, por ordem de chegada. Alguns nomes são reservados para o funcionamento do serviço e não ficam disponíveis.',
        },
        {
          tipo: 'p',
          texto: `Você pode trocar de endereço até ${PRAZOS.trocasDeEnderecoPorJanela} vezes a cada ${PRAZOS.janelaDeTrocaDias} dias. O limite existe para o endereço não virar moeda de troca e para links já compartilhados não quebrarem toda semana. Ao trocar, o endereço antigo redireciona para o novo por até 12 meses.`,
        },
        {
          tipo: 'p',
          texto: `Se a sua compra for cancelada, o endereço fica retido por ${PRAZOS.retencaoSubdominioDias} dias antes de voltar a ficar disponível, para que ninguém ocupe o endereço de quem acabou de sair. Quem nunca chegou a publicar libera o endereço na hora.`,
        },
      ],
    },
    {
      id: 'conferencia',
      titulo: '7. Conferência da primeira publicação, e limites de uso justo',
      blocos: [
        {
          tipo: 'p',
          texto: `A primeira publicação de cada conta passa por uma conferência humana, de até ${PRAZOS.conferenciaPrimeiraPublicacaoHoras} horas, uma única vez. Durante a espera, o link de prévia funciona normalmente e você pode mostrar o portfólio a quem quiser. Da segunda publicação em diante, publicar é instantâneo.`,
        },
        {
          tipo: 'p',
          texto:
            'A conferência serve para uma coisa só: impedir que o serviço seja usado para fraude ou para se passar por outra pessoa. Ela não avalia gosto, qualidade ou conteúdo do seu trabalho.',
        },
        {
          tipo: 'p',
          texto:
            'O serviço tem limites de uso justo, de número de projetos e de espaço em arquivos. Eles aparecem no editor, são iguais para todos os compradores do mesmo plano e podem ser ajustados para cima sem custo. Não são cobrança extra: são o que mantém o custo de hospedagem previsível num produto de pagamento único.',
        },
      ],
    },
    {
      id: 'saidas',
      titulo: '8. As três, e apenas três, saídas',
      blocos: [
        {
          tipo: 'p',
          texto:
            'Seu acesso só termina em três situações, e nenhuma delas é falta de pagamento, porque não existe pagamento a fazer depois da compra:',
        },
        {
          tipo: 'lista',
          itens: [
            `Arrependimento em ${PRAZOS.arrependimentoDias} dias, pedido por você (seção 4).`,
            'Contestação da cobrança junto ao meio de pagamento (chargeback).',
            'Banimento por uso proibido, nos casos da seção 5.',
          ],
        },
        {
          tipo: 'p',
          texto: `Em qualquer dos três casos o portfólio sai do ar e o endereço passa a responder que a página não existe mais. Os seus dados ficam guardados por ${PRAZOS.retencaoAposRevogacaoDias} dias, para o caso de reversão, e você pode exportá-los durante todo esse período. Passado o prazo, os dados são apagados e o endereço volta ao estoque.`,
        },
      ],
    },
    {
      id: 'facilitacao',
      titulo: '9. Facilitação de montagem, quando contratada',
      blocos: [
        {
          tipo: 'p',
          texto:
            'Se você contratar a facilitação, nossa equipe monta o portfólio para você. Isso exige acesso de edição à sua conta, e esse acesso não é presumido: ele começa numa autorização sua, com data e registro, e vale só até a entrega.',
        },
        {
          tipo: 'p',
          texto:
            'Você pode retirar a autorização quando quiser, e ela cai sozinha quando o trabalho é entregue ou cancelado. Enquanto ela estiver ativa, nossa equipe pode editar e publicar em seu nome, e nada além disso.',
        },
      ],
    },
    {
      id: 'saida-dados',
      titulo: '10. Levar seus dados embora, e apagar a conta',
      blocos: [
        {
          tipo: 'p',
          texto:
            'Dentro do editor, em Conta, existem dois botões: baixar meus dados e apagar minha conta. Nenhum dos dois depende de falar com o suporte.',
        },
        {
          tipo: 'p',
          texto:
            'Baixar seus dados devolve um arquivo com o portfólio inteiro, projetos, experiências e a lista dos seus arquivos com links temporários para download.',
        },
        {
          tipo: 'p',
          texto: `Apagar a conta tira o portfólio do ar imediatamente e abre uma carência de ${PRAZOS.carenciaExclusaoDias} dias antes da exclusão definitiva. Nesse período você pode voltar atrás pelo link enviado no e-mail de confirmação. Depois do prazo, a exclusão é irreversível. O que não é apagado, e por quê, está escrito na política de privacidade.`,
        },
      ],
    },
    {
      id: 'responsabilidade',
      titulo: '11. Disponibilidade e responsabilidade',
      blocos: [
        {
          tipo: 'p',
          texto:
            'Fazemos o possível para manter o serviço no ar, mas ele depende de fornecedores de infraestrutura e pode ter interrupções. Não prometemos disponibilidade ininterrupta e não respondemos por lucros cessantes, oportunidades perdidas ou danos indiretos.',
        },
        {
          tipo: 'p',
          texto:
            'Nossa responsabilidade, em qualquer hipótese, está limitada ao valor que você pagou pelo serviço.',
        },
      ],
    },
    {
      id: 'mudancas',
      titulo: '12. Mudanças nestes termos',
      blocos: [
        {
          tipo: 'p',
          texto:
            'Se estes termos mudarem, a versão nova aparece para aceite no seu próximo acesso ao editor, e o registro do aceite anterior é preservado. Mudança que reduza o que você já comprou não vale para quem comprou antes dela.',
        },
      ],
    },
    {
      id: 'contato',
      titulo: '13. Contato e foro',
      blocos: [
        {
          tipo: 'p',
          texto: `Suporte: ${CONTATO.suporte}. Assuntos de dados pessoais: ${CONTATO.privacidade}.`,
        },
        {
          tipo: 'p',
          texto:
            'Estes termos são regidos pela lei brasileira. Fica eleito o foro do domicílio do consumidor para qualquer questão.',
        },
      ],
    },
  ],
};
