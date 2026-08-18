// Confere (e, se preciso, refaz) a paleta e o fundo escolhidos no passo "A página".
//
// Motivo: a página publicada saiu com o roxo padrão do produto, e não com o vermelho "Sangue"
// que foi escolhido no editor. Este script lê o que está gravado, mostra, tenta de novo com
// um salvamento isolado (só a paleta e o fundo, sem tocar em mais nada) e lê de novo.
import { abrirEditor, esperar } from './base.mjs';
import { writeFile } from 'node:fs/promises';

const { pagina, navegador } = await abrirEditor('demo-funilaria', { headless: true });
const G = '#ed-gaveta';

const abrirTudo = async () => {
  await pagina.evaluate(() => document.querySelectorAll('#ed-gaveta details').forEach((d) => { d.open = true; }));
  await esperar(400);
};

async function ler() {
  await pagina.click('[data-abrir="perfil"]');
  await esperar(1500);
  await abrirTudo();
  return pagina.evaluate(() => {
    const g = document.querySelector('#ed-gaveta');
    const get = (k) => {
      const e = g.querySelector(`[data-campo="${k}"] select, [data-campo="${k}"] input, [data-campo="${k}"] textarea`);
      return e ? e.value : '(sem campo)';
    };
    return {
      theme_preset: get('theme_preset'), background_kind: get('background_kind'),
      cta_label: get('cta_label'), rotulo_projects: get('rotulo_projects'),
      rotulo_cases: get('rotulo_cases'), badge_label: get('badge_label'),
      badge_icon: get('badge_icon'), projects_per_page: get('projects_per_page'),
    };
  });
}

const antes = await ler();
console.log('ANTES:', JSON.stringify(antes, null, 2));

if (antes.theme_preset !== 'sangue' || antes.background_kind !== 'vinheta') {
  console.log('\nrefazendo paleta e fundo, sozinhos...');
  await pagina.locator(`${G} [data-campo="theme_preset"] select`).first().selectOption('sangue');
  await esperar(900);
  await abrirTudo();
  await pagina.locator(`${G} [data-campo="background_kind"] select`).first().selectOption('vinheta');
  await esperar(900);
  await abrirTudo();
  await pagina.click('#ed-form-salvar');
  for (let i = 0; i < 40; i++) {
    await esperar(500);
    if (!(await pagina.evaluate(() => document.querySelector('#ed-gaveta')?.classList.contains('is-open')))) break;
  }
  await esperar(1500);
  const depois = await ler();
  console.log('DEPOIS:', JSON.stringify(depois, null, 2));
  await writeFile('out/funil-tema.json', JSON.stringify({ antes, depois }, null, 2), 'utf8');
} else {
  console.log('\npaleta e fundo já estão gravados como escolhidos.');
  await writeFile('out/funil-tema.json', JSON.stringify({ antes }, null, 2), 'utf8');
}



// ---------------------------------------------------------------------------
// DIAGNÓSTICO: a paleta está gravada como "sangue", mas o payload publicado leva
// accent #7C5CFC, o roxo de fábrica. resolverTema() faz `accent || base.accent`, ou seja
// a cor livre vence a paleta, e o salvar do perfil gravou a cor livre sem ninguém pedir:
// patchDoPerfil compara o valor do campo "Cor de destaque" (que ainda mostrava o roxo, porque
// o formulário tinha sido carregado ANTES da troca de paleta) com a cor da paleta NOVA. Como
// diferem, ele conclui "a pessoa escolheu uma cor própria" e grava o roxo para sempre.
//
// Aqui a prova: escrever à mão a cor da paleta no campo trancado e ver se a página vira.
import { PRESETS } from '../../src/modules/portfolio/theme/presets.js';
const alvo = PRESETS.sangue;
console.log(`\nprova: escrevendo à mão accent=${alvo.accent} e placa=${alvo.plate}`);
await abrirTudo();
for (const [k, v] of [['theme_accent', alvo.accent], ['theme_plate_bg', alvo.plate]]) {
  const ok = await pagina.evaluate(([key, val]) => {
    const e = document.querySelector(`#ed-gaveta [data-cor="${key}"]`);
    if (!e) return 'sem campo';
    if (e.disabled) return 'desabilitado';
    e.value = val;
    e.dispatchEvent(new Event('input', { bubbles: true }));
    e.dispatchEvent(new Event('change', { bubbles: true }));
    return e.value;
  }, [k, v]);
  console.log(`  ${k} -> ${ok}`);
  await esperar(600);
  await abrirTudo();
}
await pagina.click('#ed-form-salvar');
for (let i = 0; i < 40; i++) {
  await esperar(500);
  if (!(await pagina.evaluate(() => document.querySelector('#ed-gaveta')?.classList.contains('is-open')))) break;
}
console.log('salvo. confira a prévia de novo.');
await navegador.close();
