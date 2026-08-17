// Confere o contraste de cada paleta oferecida ao comprador.
//
// POR QUE ISTO EXISTE, e por que ele reprova o build: as paletas moram no CODIGO justamente
// para poderem ser testadas. Se a cor viesse do banco, "essa paleta ficou ilegivel" so seria
// descoberto por alguem olhando uma pagina publicada, uma de cada vez, depois de ela estar no
// ar no nome de outra pessoa.
//
// Achado que este teste ja pagou: a cor de destaque que o produto usa desde sempre, #7C5CFC
// sobre #0b0b12, da 4.36 e REPROVA o AA por pouco. Ela continua sendo o padrao de propriedade,
// porque troca-la mudaria a pagina de quem nao pediu nada, mas por isso mesmo o padrao e
// medido a parte e a paleta "grafite" (o mesmo roxo um passo mais claro) e a que se oferece.
//
//   node scripts/testar-presets.mjs
import { PRESETS, PADRAO, resolverTema } from '../src/modules/portfolio/theme/presets.js';

// Luminancia relativa e razao de contraste, WCAG 2.x.
const canal = (c) => { const v = c / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const lum = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => canal(parseInt(hex.slice(i, i + 2), 16)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const razao = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
};

// O destaque e usado em texto pequeno e em icone: 4.5 e o piso de AA.
const MIN_ACCENT = 4.5;
// O corpo da pagina e texto branco sobre a placa. 7 e AAA, e aqui e barato de cumprir.
const MIN_BRANCO = 7;

let falhas = 0;
const linhas = [];

for (const [chave, p] of Object.entries(PRESETS)) {
  if (!/^#[0-9A-Fa-f]{6}$/.test(p.accent) || !/^#[0-9A-Fa-f]{6}$/.test(p.plate)) {
    falhas += 1;
    console.error(`FORMATO  ${chave}: cor precisa ser hex de 6 digitos`);
    continue;
  }
  const a = razao(p.accent, p.plate);
  const b = razao('#FFFFFF', p.plate);
  const ok = a >= MIN_ACCENT && b >= MIN_BRANCO;
  if (!ok) {
    falhas += 1;
    console.error(`CONTRASTE ${chave}: destaque ${a.toFixed(2)} (min ${MIN_ACCENT}), branco ${b.toFixed(2)} (min ${MIN_BRANCO})`);
  }
  linhas.push(`  ${chave.padEnd(10)} ${p.accent}  sobre ${p.plate}   destaque ${a.toFixed(2).padStart(5)}   branco ${b.toFixed(2).padStart(5)}`);
}

// O padrao historico e medido, e nao cobrado: ele reprova por pouco e continua sendo o padrao
// de proposito. Trocar a cor de fabrica mudaria a pagina de quem nunca escolheu nada.
const padraoA = razao(PADRAO.accent, PADRAO.plate);

// Preset desconhecido nunca pode derrubar a pagina de um cliente pagante.
const inventado = resolverTema({ preset: 'nao-existe-essa-cor' });
if (inventado.accent !== PADRAO.accent) {
  falhas += 1;
  console.error('FALLBACK preset desconhecido devia cair no padrao, e caiu em ' + inventado.accent);
}
// A cor livre do bump vence o preset. E a fronteira que separa base de personalizacao.
const comBump = resolverTema({ preset: 'brasa', accent: '#123456' });
if (comBump.accent !== '#123456') {
  falhas += 1;
  console.error('PRECEDENCIA a cor livre do bump devia vencer o preset');
}
// E sem cor livre, o preset vence o padrao.
if (resolverTema({ preset: 'brasa' }).accent !== PRESETS.brasa.accent) {
  falhas += 1;
  console.error('PRECEDENCIA o preset devia vencer o padrao');
}

if (falhas) {
  console.error(`\n${falhas} problema(s) nas paletas`);
  process.exit(1);
}
console.log(linhas.join('\n'));
console.log(`OK: ${Object.keys(PRESETS).length} paletas, destaque >= ${MIN_ACCENT}:1 e branco >= ${MIN_BRANCO}:1`);
console.log(`nota: o padrao historico (${PADRAO.accent} sobre ${PADRAO.plate}) da ${padraoA.toFixed(2)} e reprova AA por pouco.`);
console.log('      ele fica como esta de proposito; a paleta "grafite" e a versao dele que passa.');
