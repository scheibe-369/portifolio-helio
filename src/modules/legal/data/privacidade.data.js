import { TERMS_VERSION, PRAZOS, CONTATO, SUBPROCESSADORES } from './legal.config.js';

// Politica de privacidade do MyPortifolio.
//
// Duas coisas aqui NAO sao enfeite, e sao as duas que uma politica generica erra:
//
// 1. A divisao de papeis. Nos dados da conta nos somos controlador. No conteudo publicado,
//    quem decide e o comprador, e ele publica nome de cliente dele: ali nos somos operador.
//    Politica que nao separa isso descreve um servico que nao e este.
// 2. A lista do que NAO e apagado na exclusao. Se a politica prometesse apagar tudo, ela
//    mentiria, porque registro fiscal e prova de aceite precisam sobreviver. Dizer o que
//    fica, e por que fica, e o que torna a promessa verificavel.
export const privacidade = {
  titulo: 'Política de privacidade',
  versao: TERMS_VERSION,
  resumo:
    'O que coletamos, por que, com quem compartilhamos, quanto tempo guardamos e como você exerce seus direitos.',
  secoes: [
    {
      id: 'papeis',
      titulo: '1. Quem responde por qual dado',
      blocos: [
        {
          tipo: 'p',
          texto:
            'Nos dados da sua conta (e-mail, registro da compra, registro de acesso), somos o controlador: decidimos como tratá-los e respondemos por eles.',
        },
        {
          tipo: 'p',
          texto:
            'No conteúdo que você publica, o papel se inverte. Cada projeto do seu portfólio pode trazer o nome de um cliente seu, que é dado pessoal de um terceiro. Quem decide publicar aquilo é você, então você é o controlador desse dado e nós somos o operador: hospedamos e exibimos por sua conta e ordem, e não usamos aquele conteúdo para nada além disso.',
        },
      ],
    },
    {
      id: 'dados',
      titulo: '2. Que dados tratamos',
      blocos: [
        { tipo: 'p', texto: 'Dados que você fornece:' },
        {
          tipo: 'lista',
          itens: [
            'E-mail da compra e, se você vincular um segundo endereço, o e-mail de login.',
            'O conteúdo do portfólio: nome, foto, textos, imagens, links, vídeos incorporados, experiências e certificados que você enviar.',
            'Se você contratar a facilitação, o material que enviar para a montagem e, opcionalmente, seu WhatsApp para contato.',
          ],
        },
        { tipo: 'p', texto: 'Dados gerados pelo uso:' },
        {
          tipo: 'lista',
          itens: [
            'Registro do aceite dos termos, com data, endereço IP e navegador. É a prova de que o aceite existiu.',
            'Registro de pedidos de código de acesso, por endereço IP e por e-mail, guardado por poucas horas, apenas para conter abuso do envio de e-mails.',
            'O evento de pagamento recebido da Hubla, que sustenta a nota fiscal e a conferência de vendas.',
          ],
        },
        {
          tipo: 'p',
          texto:
            'Não usamos cookies de publicidade e não temos rastreadores de terceiros nas páginas publicadas. O editor guarda a sua sessão no armazenamento local do navegador, que é o que mantém você logado.',
        },
      ],
    },
    {
      id: 'bases',
      titulo: '3. Por que podemos tratar cada dado',
      blocos: [
        {
          tipo: 'lista',
          itens: [
            'Execução do contrato: conta, login, hospedagem e publicação do portfólio.',
            'Obrigação legal: registro fiscal do pagamento e guarda de registros de acesso.',
            'Legítimo interesse: prevenção a fraude, abuso e uso do serviço para se passar por outra pessoa.',
            'Consentimento: apenas para o certificado de formação, que só fica público se você marcar a opção. Desmarcar retira o certificado do ar na republicação.',
          ],
        },
      ],
    },
    {
      id: 'compartilhamento',
      titulo: '4. Com quem compartilhamos',
      blocos: [
        {
          tipo: 'p',
          texto:
            'Não vendemos dado pessoal e não cedemos sua base para ninguém. Usamos os fornecedores abaixo, cada um para uma finalidade específica:',
        },
        { tipo: 'lista', itens: SUBPROCESSADORES.map((s) => `${s.nome}: ${s.papel}.`) },
        {
          tipo: 'p',
          texto:
            'Parte desses fornecedores processa dados fora do Brasil. O envio segue as salvaguardas contratuais deles e se limita ao necessário para o serviço funcionar. O vídeo que você incorpora é carregado do YouTube no navegador de quem visita, e a partir daí valem as regras do Google para aquele visitante.',
        },
      ],
    },
    {
      id: 'direitos',
      titulo: '5. Seus direitos, e como exercer em um clique',
      blocos: [
        {
          tipo: 'p',
          texto:
            'O artigo 18 da LGPD garante a você confirmar o tratamento, acessar, corrigir, portar e eliminar seus dados, além de revogar consentimento. Dois deles são botões dentro do editor, em Conta, e não dependem de pedir nada a ninguém:',
        },
        {
          tipo: 'lista',
          itens: [
            'Baixar meus dados: devolve um arquivo com tudo que temos ligado a você, mais links temporários para os seus arquivos e certificados.',
            `Apagar minha conta: tira o portfólio do ar na hora e agenda a exclusão para ${PRAZOS.carenciaExclusaoDias} dias depois. Dentro desse prazo você pode cancelar pelo link do e-mail de confirmação.`,
          ],
        },
        {
          tipo: 'p',
          texto:
            'Correção e revisão de decisão automatizada (artigo 20) também estão disponíveis: o serviço não toma decisão automatizada sobre você, com uma exceção declarada, a conferência da primeira publicação, que é feita por uma pessoa e pode ser contestada por e-mail.',
        },
      ],
    },
    {
      id: 'excecoes',
      titulo: '6. O que não é apagado, e por quê',
      blocos: [
        {
          tipo: 'p',
          texto:
            'A exclusão apaga o portfólio, os projetos, as experiências, os arquivos enviados, a publicação e o seu usuário. Quatro registros sobrevivem, e é honesto dizer quais:',
        },
        {
          tipo: 'lista',
          itens: [
            'O evento de pagamento, que sustenta a nota fiscal. Ele é reescrito para guardar apenas o número do pedido, produto, valor, moeda e data, e o seu e-mail é substituído por um código irreversível. Nome, telefone, documento e endereço são descartados.',
            'O registro de aceite dos termos, com a versão e a data. Sem ele, a afirmação de que houve aceite não teria prova.',
            'O pedido de reembolso, se houver, sem o texto livre que você escreveu, que é apagado.',
            'O registro de decisões de moderação, quando houver, para conter reincidência.',
          ],
        },
        {
          tipo: 'p',
          texto:
            'Nenhum desses registros permite reconstruir o seu portfólio nem identificá-lo a partir do conteúdo publicado.',
        },
      ],
    },
    {
      id: 'retencao',
      titulo: '7. Por quanto tempo guardamos',
      blocos: [
        {
          tipo: 'lista',
          itens: [
            'Enquanto sua conta existir: conteúdo do portfólio e dados da conta.',
            `Após cancelamento, chargeback ou banimento: ${PRAZOS.retencaoAposRevogacaoDias} dias com o portfólio fora do ar, para o caso de reversão, e exportação disponível durante todo o período.`,
            `Após pedido de exclusão: ${PRAZOS.carenciaExclusaoDias} dias de carência, e depois a exclusão definitiva.`,
            'Registro de pedidos de código de acesso: poucas horas.',
            'Registro fiscal: pelo prazo exigido pela legislação tributária.',
          ],
        },
      ],
    },
    {
      id: 'seguranca',
      titulo: '8. Segurança',
      blocos: [
        {
          tipo: 'p',
          texto:
            'O acesso é feito por código enviado ao seu e-mail, ou por senha, se você definir uma. Cada conta só enxerga os próprios dados, e essa separação é imposta pelo banco de dados, não apenas pela tela. As páginas são servidas por conexão criptografada.',
        },
        {
          tipo: 'p',
          texto:
            'Se acontecer um incidente de segurança que possa gerar risco relevante a você, avisamos você e a Autoridade Nacional de Proteção de Dados, como manda a LGPD.',
        },
      ],
    },
    {
      id: 'contato-privacidade',
      titulo: '9. Contato',
      blocos: [
        {
          tipo: 'p',
          texto: `Para qualquer pedido sobre seus dados, escreva para ${CONTATO.privacidade}. Respondemos em até 15 dias.`,
        },
        {
          tipo: 'p',
          texto: `Versão vigente desta política: ${TERMS_VERSION}. Mudanças relevantes são comunicadas por e-mail e pedem aceite no próximo acesso ao editor.`,
        },
      ],
    },
  ],
};
