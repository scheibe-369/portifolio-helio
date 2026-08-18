// Prova que escolher e TROCAR paleta nao mata a paleta.
//
// POR QUE ISTO EXISTE: o campo "Cor de destaque" e um <input type="color">, que nunca fica
// vazio, entao o formulario sempre devolve UMA cor mesmo quando ninguem tocou nele. Distinguir
// "nao mexi" de "escolhi exatamente esta cor" e a regra inteira, e ela ja errou de duas
// maneiras diferentes em producao:
//
//   1. comparando com a cor de FABRICA: abrir o perfil e salvar gravava o roxo por cima da
//      paleta, e quem pagou o bump era o unico que nao conseguia usar as 12 paletas;
//   2. comparando com o preset NOVO: trocar de paleta gravava a cor da paleta ANTIGA como se
//      fosse escolha livre, e a nova nunca valia.
//
//   node scripts/testar-paleta-editor.mjs
import { coresDoBump } from '../src/modules/editor/lib/corDoTema.js';
import { PRESETS, PADRAO } from '../src/modules/portfolio/theme/presets.js';

let falhas = 0;
const checar = (nome, ok, detalhe) => {
  if (!ok) { falhas += 1; console.error(`FALHOU  ${nome}${detalhe ? `\n        ${detalhe}` : ''}`); }
};

// 1. Sem preset, campo com a cor de fabrica: abrir e salvar nao pode gravar nada.
{
  const r = coresDoBump({ theme_accent: PADRAO.accent, theme_plate_bg: PADRAO.plate }, { theme_preset: null });
  checar('salvar sem tocar na cor nao grava a cor de fabrica', r.theme_accent === null,
    'era o defeito que matava as 12 paletas de quem pagou o bump');
}

// 2. Com preset, campo mostrando a cor DELE: salvar mantem a paleta.
{
  const r = coresDoBump({ theme_accent: PRESETS.brasa.accent, theme_plate_bg: PRESETS.brasa.plate }, { theme_preset: 'brasa' });
  checar('salvar com paleta escolhida mantem a paleta', r.theme_accent === null);
}

// 3. TROCANDO de paleta sem tocar na cor: o campo ainda mostra a cor da ANTIGA, porque foi
//    preenchido quando a gaveta abriu.
{
  const r = coresDoBump({ theme_accent: PRESETS.brasa.accent, theme_plate_bg: PRESETS.brasa.plate }, { theme_preset: 'brasa' });
  checar('trocar de paleta nao grava a cor da paleta antiga', r.theme_accent === null,
    'um funileiro trocou para Sangue e publicou roxo, e salvar de novo nao consertava');
}

// 4. Escolha de verdade continua valendo: e para isso que o bump existe.
{
  const r = coresDoBump({ theme_accent: '#123456' }, { theme_preset: 'brasa' });
  checar('cor escolhida de verdade e gravada', r.theme_accent === '#123456');
}

// 5. Caixa nao importa: o input devolve minusculo e as paletas sao escritas em maiuscula.
{
  const r = coresDoBump({ theme_accent: PRESETS.brasa.accent.toLowerCase() }, { theme_preset: 'brasa' });
  checar('comparacao ignora maiuscula e minuscula', r.theme_accent === null);
}

if (falhas) { console.error(`\n${falhas} falha(s) na regra de cor do editor`); process.exit(1); }
console.log('OK: escolher, trocar e manter paleta, com e sem cor livre');
