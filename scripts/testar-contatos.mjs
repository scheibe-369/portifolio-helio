// O VAI E VOLTA DO CAMPO DE CONTATOS.
//
// POR QUE ISTO EXISTE: o campo e um textarea de linhas `nome | icone | link`, e o icone e
// opcional. Quando o icone entrou no lugar do texto de apoio, a juncao continuou descartando
// todo segmento vazio, entao um contato sem icone virava `WhatsApp | https://wa.me/...`, com
// duas partes. Na leitura de volta, posicional, o link caia no campo do MEIO e o link ficava
// vazio, e o filtro do salvamento (`s.label && s.extra`) jogava a linha fora.
//
// O efeito: abrir o formulario e clicar em Salvar sem digitar nada APAGARIA todos os contatos
// da pessoa. Silenciosamente, sem erro, e sem que ela tivesse tocado no campo. Nao chegou a
// producao porque apareceu num print do editor, e nao porque algum teste pegou. Este arquivo e
// esse teste.
//
// A propriedade que ele fixa e uma so, e vale para qualquer conteudo: LER O QUE FOI ESCRITO
// DEVOLVE O QUE ENTROU.
//
//   node scripts/testar-contatos.mjs
import { renderCampo, lerMudanca } from '../src/modules/editor/fields/primitivos.js';

let falhas = 0;
const checar = (nome, condicao, detalhe) => {
  if (!condicao) {
    falhas += 1;
    console.error(`FALHOU  ${nome}${detalhe ? `\n        ${detalhe}` : ''}`);
  }
};

const CONTATOS = { key: 'socials', tipo: 'pares', label: 'Contatos', maxLength: 8, segmentos: 3 };
const NUMEROS = { key: 'stats', tipo: 'pares', label: 'Números', maxLength: 6 };

// O textarea nao existe fora do navegador, entao o texto e extraido do HTML e o elemento e
// simulado com o minimo que `lerMudanca` le: `value` e `dataset`.
const textoDoCampo = (campo, lista) => {
  const html = renderCampo(campo, { [campo.key]: lista });
  const m = /<textarea[^>]*>([\s\S]*?)<\/textarea>/.exec(html);
  if (!m) throw new Error('sem textarea no render');
  return m[1]
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
};

const voltar = (campo, texto) =>
  lerMudanca({ value: texto, dataset: { pares: campo.key, ...(campo.segmentos === 3 ? { tres: '' } : {}) } }, {}).valor;

const ida_e_volta = (campo, lista) => voltar(campo, textoDoCampo(campo, lista));

// ---------------------------------------------------------------- contatos, com e sem icone
{
  const casos = [
    ['sem icone', [{ label: 'WhatsApp', valor: '', extra: 'https://wa.me/5531988447120' }]],
    ['com icone', [{ label: 'Onde fica', valor: 'mapa', extra: 'https://maps.google.com/?q=x' }]],
    ['misturados', [
      { label: 'WhatsApp', valor: '', extra: 'https://wa.me/1' },
      { label: 'Horário', valor: 'relogio', extra: 'https://exemplo.com/h' },
      { label: 'Facebook', valor: '', extra: 'https://facebook.com/x' },
    ]],
    ['oito, o limite', Array.from({ length: 8 }, (_, i) => ({ label: `Rede ${i}`, valor: '', extra: `https://ex.com/${i}` }))],
  ];

  for (const [nome, lista] of casos) {
    const volta = ida_e_volta(CONTATOS, lista);
    checar(`${nome}: mesma quantidade de linhas`, volta.length === lista.length, `${lista.length} -> ${volta.length}`);
    for (let i = 0; i < lista.length; i++) {
      const a = lista[i];
      const b = volta[i] || {};
      checar(`${nome}: linha ${i} mantem o nome`, b.label === a.label, `${JSON.stringify(a.label)} -> ${JSON.stringify(b.label)}`);
      checar(`${nome}: linha ${i} MANTEM O LINK`, b.extra === a.extra,
        `${JSON.stringify(a.extra)} -> ${JSON.stringify(b.extra)}  (este e o defeito que apagava contato)`);
      checar(`${nome}: linha ${i} mantem o icone`, (b.valor || '') === (a.valor || ''), `${JSON.stringify(a.valor)} -> ${JSON.stringify(b.valor)}`);
    }
  }

  // A forma que a pessoa escreve na mao, que nao e necessariamente a que o render escreve.
  const naMao = voltar(CONTATOS, 'WhatsApp | https://wa.me/1\nInsta | instagram | https://instagram.com/x\nSó o nome');
  checar('duas partes: a segunda e o link', naMao[0].extra === 'https://wa.me/1' && naMao[0].valor === '');
  checar('tres partes: cada uma no seu lugar', naMao[1].valor === 'instagram' && naMao[1].extra === 'https://instagram.com/x');
  checar('uma parte so nao inventa link', naMao[2].label === 'Só o nome' && !naMao[2].extra);
}

// ---------------------------------------------------------------- numeros da capa (2 partes)
{
  const lista = [
    { label: 'Anos de CRECI', valor: '19', extra: '' },
    { label: 'Ticket médio', valor: 'R$ 1,9 mi', extra: '' },
  ];
  const volta = ida_e_volta(NUMEROS, lista);
  checar('numeros: duas partes continuam duas', volta.length === 2);
  for (let i = 0; i < lista.length; i++) {
    checar(`numeros: linha ${i} inteira`, volta[i].label === lista[i].label && volta[i].valor === lista[i].valor,
      JSON.stringify(volta[i]));
  }
  // A regra de tres segmentos NAO pode vazar para este campo: aqui duas partes sao nome e
  // valor, e nao nome e link.
  const texto = textoDoCampo(NUMEROS, lista);
  checar('numeros nao viram campo de link', !texto.includes('| |'), texto);
}

if (falhas) {
  console.error(`\n${falhas} falha(s) no campo de contatos`);
  process.exit(1);
}
console.log('OK: campo de contatos e de numeros, ida e volta, com e sem o segmento do meio');
