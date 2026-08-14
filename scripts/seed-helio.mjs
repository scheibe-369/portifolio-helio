// Leva o portfolio do Helio dos arquivos .js para o banco.
//
// POR QUE ISSO E UM SCRIPT E NAO UM .sql: os textos tem aspas curvas, ponto medio e
// acentuacao. SQL concatenado a mao com esse conteudo quebra ou, pior, injeta. Aqui tudo
// vai por parametro, sempre.
//
// POR QUE O HELIO E O PRIMEIRO TENANT: o portfolio dele e ao mesmo tempo a vitrine do
// produto e o unico dado real que existe para testar o caminho inteiro. Se o render por
// tenant funciona para ele, funciona para um comprador.
//
//   node scripts/seed-helio.mjs --dry-run    mostra o que faria, nao escreve
//   node scripts/seed-helio.mjs --apply      escreve
//   node scripts/seed-helio.mjs --verify     confere o que esta la contra os arquivos
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const args = process.argv.slice(2);
const MODO = args.includes('--apply') ? 'apply' : args.includes('--verify') ? 'verify' : 'dry-run';

const env = Object.fromEntries(
  (await readFile(resolve(process.cwd(), '.env.local'), 'utf8'))
    .split('\n').filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
);
const REF = env.SUPABASE_PROJECT_REF;
const TOKEN = env.SUPABASE_ACCESS_TOKEN;
const URL_SUPA = env.VITE_SUPABASE_URL;
const SVC = env.SUPABASE_SERVICE_ROLE_KEY;

const DONO = 'heliomonteiroprofissional@gmail.com';
const SLUG = 'helio';

// Consulta pela API de gerenciamento. Ela ignora RLS, que e o que um seed precisa.
// User-Agent de navegador: a API fica atras da Cloudflare, que devolve 403 para script.
async function sql(query) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' },
    body: JSON.stringify({ query }),
  });
  const t = await r.text();
  let d;
  try { d = JSON.parse(t); } catch { throw new Error('resposta nao-json: ' + t.slice(0, 200)); }
  if (!Array.isArray(d)) throw new Error(d.message || JSON.stringify(d).slice(0, 300));
  return d;
}

// Literal SQL seguro. E o unico lugar do script que monta string, e por isso ele e curto e
// obvio: qualquer valor passa por aqui ou nao entra.
// O tipo e DECLARADO, nunca adivinhado. Array de string vira text[] e array de objeto vira
// jsonb, e os dois existem no mesmo insert (stacks e text[], socials e jsonb). Deixar a
// funcao inferir pelo conteudo funciona ate o dia em que uma lista chega vazia e ela chuta
// errado, e o erro aparece como "column is of type jsonb but expression is text[]" no meio
// de um insert de 40 colunas.
const J = (v) => ({ __jsonb: v });

const lit = (v) => {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (v && typeof v === 'object' && '__jsonb' in v) return `${lit(JSON.stringify(v.__jsonb))}::jsonb`;
  if (Array.isArray(v)) return `array[${v.map(lit).join(',')}]::text[]`;
  if (typeof v === 'object') return `${lit(JSON.stringify(v))}::jsonb`;
  return `'${String(v).replace(/'/g, "''")}'`;
};

// Junta PT e EN num jsonb { pt, en }. EN so entra quando existe e nao e vazio: string vazia
// nao e traducao, e deixar ela entrar faria a pagina em EN ficar com buraco no lugar do
// texto em PT, que e pior que nao traduzir.
const i18n = (pt, en) => J(en != null && en !== '' ? { pt, en } : { pt });

const { profile } = await import('../src/modules/profile/data/profile.data.js');
const { projects, projectGroups } = await import('../src/modules/projects/data/projects.data.js');
const { projectsEn } = await import('../src/modules/projects/data/projects.en.js');
const { stacks } = await import('../src/modules/stacks/data/stacks.data.js');
const { experience } = await import('../src/modules/experience/data/experience.data.js');
const { experienceEn } = await import('../src/modules/experience/data/experience.en.js');

// ---------------------------------------------------------------- portfolio
const linhaPortfolio = {
  owner_email: DONO,
  slug: SLUG,
  display_name: profile.name,
  role_i18n: i18n(profile.role.pt, profile.role.en),
  bio_i18n: i18n(profile.bio.pt, profile.bio.en),
  contact_email: profile.email,
  show_contact_email: false,
  hero_object_position: profile.heroObjectPosition,
  cta_url: profile.ctaUrl,
  socials: J(profile.socials),
  stats: J(profile.stats),
  stacks,
  english_enabled: true,
  projects_video_first: true,
  projects_per_page: 6,
};

// ---------------------------------------------------------------- projetos
// position = indice do array. Isso preserva a invariante do repo: case COM video vem antes
// de case sem video. A ordem nao e estetica, e a primeira coisa que um visitante ve.
const linhasProjetos = projects.map((p, i) => {
  const en = projectsEn[p.slug] || {};
  return {
    slug: p.slug,
    name_i18n: i18n(p.name, en.name),
    client: p.client,
    category_i18n: i18n(p.category, en.category),
    year: p.year,
    accent: p.accent,
    plate_bg: p.plateBg || '#0b0b12',
    image_fit: p.fit === 'cover' ? 'cover' : 'contain',
    image_local: p.image ? `public${p.image}` : null,
    youtube_id: p.videoId || null,
    tagline_i18n: i18n(p.tagline, en.tagline),
    summary_i18n: i18n(p.summary, en.summary),
    problem_i18n: i18n(p.problem, en.problem),
    solution_i18n: i18n(p.solution, en.solution),
    features_i18n: i18n(p.features, en.features),
    stack_i18n: i18n(p.stack, en.stack),
    link_url: p.link || null,
    link_note_i18n: p.linkNote ? i18n(p.linkNote, en.linkNote) : null,
    groups: projectGroups[p.slug] || [],
    position: i,
    en_status: projectsEn[p.slug] ? 'human' : null,
  };
});

// ---------------------------------------------------------------- experiencias
const linhasExperiencias = experience.map((e, i) => {
  const en = experienceEn[e.slug] || {};
  return {
    slug: e.slug,
    org: e.org,
    kind: e.kind,
    role_i18n: i18n(e.role, en.role),
    period_start: e.start,
    period_end: e.end,
    location_i18n: e.location ? i18n(e.location, en.location) : null,
    logo_local: e.logo ? `public${e.logo}` : null,
    plate_bg: e.plateBg || '#0b0b12',
    highlights_i18n: i18n(e.highlights, en.highlights),
    note_i18n: e.note ? i18n(e.note, en.note) : null,
    position: i,
    en_status: experienceEn[e.slug] ? 'human' : null,
  };
});

// ---------------------------------------------------------------- relatorio
const comVideo = linhasProjetos.filter((p) => p.youtube_id).length;
const primeiroSemVideo = linhasProjetos.findIndex((p) => !p.youtube_id);
const ultimoComVideo = linhasProjetos.map((p) => !!p.youtube_id).lastIndexOf(true);
const invarianteOk = ultimoComVideo < primeiroSemVideo;

console.log(`modo: ${MODO}`);
console.log(`portfolio: ${linhaPortfolio.display_name} (${SLUG}), dono ${DONO}`);
console.log(`  stacks: ${stacks.length} | socials: ${profile.socials.length} | stats: ${profile.stats.length}`);
console.log(`projetos: ${linhasProjetos.length} (${comVideo} com video)`);
console.log(`  invariante video-primeiro: ${invarianteOk ? 'ok' : 'QUEBRADA'} (ultimo com video em ${ultimoComVideo}, primeiro sem em ${primeiroSemVideo})`);
console.log(`experiencias: ${linhasExperiencias.length}`);
console.log(`  com logo: ${linhasExperiencias.filter((e) => e.logo_local).length} | com certificado: ${linhasExperiencias.filter((e) => e.certificate_path).length}`);

if (!invarianteOk) {
  console.error('\nABORTADO: a ordem dos projetos quebraria a invariante de video primeiro.');
  process.exit(1);
}

if (MODO === 'dry-run') {
  console.log('\n(dry-run: nada foi escrito)');
  console.log('exemplo de projeto:', JSON.stringify(linhasProjetos[0], null, 1).slice(0, 400));
  process.exit(0);
}

if (MODO === 'verify') {
  const [pf] = await sql(`select id, slug, display_name, jsonb_array_length(socials) as ns, array_length(stacks,1) as nstacks from myportifolio.portfolios where slug = ${lit(SLUG)}`);
  if (!pf) { console.error('\nREPROVOU: nao existe portfolio com esse slug'); process.exit(1); }
  const [{ n: np }] = await sql(`select count(*)::int as n from myportifolio.portfolio_projects where portfolio_id = ${lit(pf.id)}`);
  const [{ n: ne }] = await sql(`select count(*)::int as n from myportifolio.portfolio_experiences where portfolio_id = ${lit(pf.id)}`);
  const ok = np === linhasProjetos.length && ne === linhasExperiencias.length && pf.nstacks === stacks.length;
  console.log(`\nno banco: ${np} projetos, ${ne} experiencias, ${pf.nstacks} stacks`);
  console.log(`nos arquivos: ${linhasProjetos.length} projetos, ${linhasExperiencias.length} experiencias, ${stacks.length} stacks`);
  console.log(ok ? 'OK: bate' : 'REPROVOU: divergiu');
  process.exit(ok ? 0 : 1);
}

// ---------------------------------------------------------------- apply
// O acesso vem primeiro: sem has_main, o portfolio nasce sem direito de existir e as
// policies e triggers de cota se comportam como se ele fosse de alguem sem compra.
console.log('\naplicando...');

// quota_code 'interno' e nao 'padrao': o Helio tem 20 projetos hoje e o teto padrao e 24,
// entao ele passaria raspando e qualquer case novo dele derrubaria o proprio seed.
await sql(`
  insert into myportifolio.member_access (email, has_main, quota_code, source, main_granted_at)
  values (${lit(DONO)}, true, 'interno', 'manual', now())
  on conflict (email) do update set has_main = true, quota_code = 'interno', source = 'manual';
`);
console.log('  member_access: dono com has_main e cota interna');

const colunas = (o) => Object.keys(o).join(', ');
const valores = (o) => Object.values(o).map(lit).join(', ');

await sql(`
  insert into myportifolio.portfolios (${colunas(linhaPortfolio)})
  values (${valores(linhaPortfolio)})
  on conflict (owner_email) do update set
    ${Object.keys(linhaPortfolio).filter((k) => k !== 'owner_email').map((k) => `${k} = excluded.${k}`).join(', ')};
`);
const [pf] = await sql(`select id from myportifolio.portfolios where slug = ${lit(SLUG)}`);
console.log(`  portfolio: ${pf.id}`);

// ---------------------------------------------------------------- midia
// O nome no bucket leva HASH DE CONTEUDO, e isso e exigido por CHECK no banco
// (media_path_com_hash). Nao e capricho: e a licao registrada em tasks/lessons.md. Caminho
// sem hash com cache longo significa que uma resposta errada cacheada fica presa por um ano
// numa URL que a conta nao tem permissao de purgar. Com hash, arquivo novo e caminho novo,
// e o problema deixa de existir por construcao.
//
// A pasta do meio tambem nao e livre: o trigger so aceita avatar, hero, project e
// experience. Isso impede o certificado (documento pessoal) de entrar no bucket publico so
// por escolher um nome de pasta bonito.
import { createHash } from 'node:crypto';
const { readdir, readFile: lerArquivo } = await import('node:fs/promises');

const mimeDe = (f) => (f.endsWith('.webp') ? 'image/webp' : f.endsWith('.png') ? 'image/png' : 'application/octet-stream');

async function subirComHash(local, tipo) {
  const bytes = await lerArquivo(local);
  const hash = createHash('sha256').update(bytes).digest('hex').slice(0, 10);
  const nome = local.split('/').pop();
  const ponto = nome.lastIndexOf('.');
  const destino = `${pf.id}/${tipo}/${nome.slice(0, ponto)}-${hash}${nome.slice(ponto)}`;
  const r = await fetch(`${URL_SUPA}/storage/v1/object/portfolio-media/${destino}`, {
    method: 'POST',
    headers: {
      apikey: SVC, Authorization: `Bearer ${SVC}`, 'Content-Type': mimeDe(nome),
      'x-upsert': 'true', 'User-Agent': 'myportifolio-seed/1.0',
    },
    body: bytes,
  });
  if (!r.ok) throw new Error(`${destino}: HTTP ${r.status} ${(await r.text()).slice(0, 200)}`);
  return { destino, bytes: bytes.length };
}

const mapaMidia = new Map();
let bytesTotal = 0;
for (const [pasta, tipo] of [['projects', 'project'], ['experience', 'experience']]) {
  for (const f of await readdir(`public/${pasta}`)) {
    const local = `public/${pasta}/${f}`;
    const { destino, bytes } = await subirComHash(local, tipo);
    mapaMidia.set(local, destino);
    bytesTotal += bytes;
  }
}
for (const [f, tipo] of [['avatar.webp', 'avatar'], ['hero.webp', 'hero']]) {
  const local = `public/${f}`;
  const { destino, bytes } = await subirComHash(local, tipo);
  mapaMidia.set(local, destino);
  bytesTotal += bytes;
}
console.log(`  midia: ${mapaMidia.size} arquivos, ${(bytesTotal / 1024).toFixed(0)} KB, com hash no nome`);

await sql(`update myportifolio.portfolios set
  avatar_path = ${lit(mapaMidia.get('public/avatar.webp'))},
  hero_path   = ${lit(mapaMidia.get('public/hero.webp'))}
  where id = ${lit(pf.id)}`);
console.log('  avatar e hero apontados');

// ---------------------------------------------------------------- filhos
// Recria do zero. Seed idempotente de proposito: rodar duas vezes tem que dar o mesmo
// resultado, e conciliar diff de 20 projetos nao vale a complexidade.
await sql(`delete from myportifolio.portfolio_projects where portfolio_id = ${lit(pf.id)}`);
await sql(`delete from myportifolio.portfolio_experiences where portfolio_id = ${lit(pf.id)}`);

for (const p of linhasProjetos) {
  const { image_local, ...resto } = p;
  const linha = { portfolio_id: pf.id, ...resto, image_path: image_local ? mapaMidia.get(image_local) ?? null : null };
  await sql(`insert into myportifolio.portfolio_projects (${colunas(linha)}) values (${valores(linha)})`);
}
console.log(`  projetos: ${linhasProjetos.length} inseridos`);

for (const e of linhasExperiencias) {
  const { logo_local, ...resto } = e;
  const linha = { portfolio_id: pf.id, ...resto, logo_path: logo_local ? mapaMidia.get(logo_local) ?? null : null };
  await sql(`insert into myportifolio.portfolio_experiences (${colunas(linha)}) values (${valores(linha)})`);
}
console.log(`  experiencias: ${linhasExperiencias.length} inseridas`);

console.log('\nfeito. Rode --verify para conferir.');
