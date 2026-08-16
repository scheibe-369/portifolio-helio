// Sonda focada: a data final ("Até") aparece quando desligo o switch numa entrada de ESTUDO?
// As duas formações da advogada saíram publicadas como "Desde 2018" e "Desde 2009", ou seja,
// como se ela ainda estivesse cursando. Aqui se separa defeito do produto de corrida do script.
import { abrirEditor, esperar } from './base.mjs';

const { pagina, navegador } = await abrirEditor('demo-advogada');
const abrirPassos = () => pagina.evaluate(() => document.querySelectorAll('#ed-gaveta details[data-passo]').forEach((d) => { d.open = true; }));

const estado = async (marca) => {
  const s = await pagina.evaluate(() => {
    const sw = document.querySelector('[data-switch="atual"]');
    const fim = document.querySelector('#ed-period_end');
    return {
      rotulo: sw && sw.closest('.ed-field') ? sw.closest('.ed-field').innerText.split('\n')[0] : '(sem switch)',
      aria: sw ? sw.getAttribute('aria-checked') : '-',
      temAte: !!fim,
      valorAte: fim ? fim.value : '-',
      kind: [...document.querySelectorAll('[data-escolha="kind"]')].filter((b) => b.className.includes('is-on')).map((b) => b.dataset.valor).join(','),
    };
  });
  console.log(`  ${marca}: ${JSON.stringify(s)}`);
  return s;
};

const novo = async () => {
  await pagina.locator('#ed-barra [data-abrir="experiencias"]').click();
  await esperar(1600);
  await pagina.locator('#ed-gaveta [data-adicionar]').first().click();
  await esperar(1600);
  await abrirPassos();
};
const fechar = async () => {
  await pagina.locator('#ed-gaveta [data-gaveta-fechar]').first().click().catch(() => {});
  await esperar(800);
  await pagina.keyboard.press('Escape').catch(() => {});
  await esperar(800);
};

// A) Estudo: clicar no switch varias vezes
console.log('\n===== A) ESTUDO, clicando no switch tres vezes =====');
await novo();
await pagina.locator('[data-escolha="kind"][data-valor="education"]').click();
await esperar(2000); await abrirPassos();
await estado('depois de virar Estudo');
for (let i = 1; i <= 3; i += 1) {
  await pagina.locator('[data-switch="atual"]').click();
  await esperar(2000); await abrirPassos();
  await estado(`clique ${i}`);
}
await pagina.screenshot({ path: 'out/adv-datafim-estudo.png', fullPage: true });
await fechar();

// B) Trabalho primeiro (onde funciona), depois virar Estudo: o "Até" sobrevive?
console.log('\n===== B) TRABALHO -> desligo o switch -> viro Estudo =====');
await novo();
await estado('nova entrada (Trabalho)');
await pagina.locator('[data-switch="atual"]').click();
await esperar(2000); await abrirPassos();
await estado('switch desligado');
await pagina.locator('#ed-period_end').fill('2019').catch(() => {});
await esperar(500);
await estado('com 2019 digitado');
await pagina.locator('[data-escolha="kind"][data-valor="education"]').click();
await esperar(2200); await abrirPassos();
await estado('agora virei Estudo');
await pagina.screenshot({ path: 'out/adv-datafim-contorno.png', fullPage: true });
await fechar();

await navegador.close();
