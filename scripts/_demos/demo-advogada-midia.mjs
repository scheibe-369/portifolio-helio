// Prepara as imagens da persona advogada nos cortes e pesos que o editor exige.
//
// POR QUE EXISTE: o editor pede "Corte 4:5, ate 120 KB" na foto grande e "Quadrada, ate
// 25 KB" na pequena. A foto que veio do Unsplash tem 378 KB e proporcao 2:3. Uma advogada
// de verdade nao tem como fazer isso sozinha, e esse e um dos achados; aqui o corte e feito
// por fora so para o teste conseguir seguir em frente e medir o resto do editor.
import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'node:fs';

const b64 = (p) => readFileSync(p).toString('base64');

// Corta no centro para a proporcao pedida e desce a qualidade ate caber no peso maximo.
async function ajustar(pagina, origem, destino, { proporcao, kbMax, larguraMax = 1200 }) {
  const dados = await pagina.evaluate(async ([src, prop, kb, lmax]) => {
    const img = new Image();
    img.src = src;
    await img.decode();
    let lc = Math.min(img.width, lmax);
    let ac = Math.round(lc / prop);
    // recorte central da origem, respeitando a proporcao alvo
    const propOrig = img.width / img.height;
    let sw = img.width; let sh = img.height; let sx = 0; let sy = 0;
    if (propOrig > prop) { sw = Math.round(img.height * prop); sx = Math.round((img.width - sw) / 2); }
    else { sh = Math.round(img.width / prop); sy = Math.round((img.height - sh) / 2); }
    for (const escala of [1, 0.85, 0.7, 0.55, 0.45, 0.35]) {
      const c = document.createElement('canvas');
      c.width = Math.round(lc * escala); c.height = Math.round(ac * escala);
      c.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, c.width, c.height);
      for (const q of [0.9, 0.82, 0.74, 0.66, 0.58, 0.5, 0.42, 0.34]) {
        const url = c.toDataURL('image/jpeg', q);
        const bytes = Math.round((url.length - url.indexOf(',') - 1) * 0.75);
        if (bytes <= kb * 1024) return { url, bytes, w: c.width, h: c.height, q, escala };
      }
    }
    return null;
  }, [`data:image/jpeg;base64,${b64(origem)}`, proporcao, kbMax, larguraMax]);

  if (!dados) throw new Error(`nao coube em ${kbMax} KB: ${origem}`);
  writeFileSync(destino, Buffer.from(dados.url.split(',')[1], 'base64'));
  console.log(`  ${destino}  ${dados.w}x${dados.h}  ${(dados.bytes / 1024).toFixed(0)} KB  q=${dados.q}`);
  return dados;
}

export async function prepararMidia(dir = 'out/midia/demo-advogada') {
  const nav = await chromium.launch({ headless: true });
  const pagina = await (await nav.newContext()).newPage();
  await pagina.goto('about:blank');
  console.log('preparando midia:');
  await ajustar(pagina, `${dir}/perfil.jpg`, `${dir}/perfil-4x5.jpg`, { proporcao: 4 / 5, kbMax: 118, larguraMax: 900 });
  await ajustar(pagina, `${dir}/perfil.jpg`, `${dir}/perfil-quadrada.jpg`, { proporcao: 1, kbMax: 24, larguraMax: 320 });
  await nav.close();
  return { grande: `${dir}/perfil-4x5.jpg`, pequena: `${dir}/perfil-quadrada.jpg` };
}

if ((process.argv[1] || '').includes('demo-advogada-midia')) await prepararMidia();
