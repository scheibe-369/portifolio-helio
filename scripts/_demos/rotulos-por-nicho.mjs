// Escreve os titulos de secao de cada persona e republica.
//
// Isto NAO e teste de editor, e sim preparo de demonstracao: o caminho pelo formulario ja foi
// exercitado pelos agentes. O que se prova aqui e outra coisa, e e a que o dono pediu para
// ver: com o mesmo template e o mesmo layout, dez profissoes lendo cada uma a sua lingua.
//
// A tabela abaixo e, na pratica, o rascunho dos starter kits por nicho: e exatamente este
// conteudo que o wizard deveria oferecer pronto quando a pessoa disser o que faz.
import { readFile } from 'node:fs/promises';

const env = Object.fromEntries((await readFile('.env.local', 'utf8')).split('\n')
  .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
  .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]));

const q = async (query) => {
  const r = await fetch(`https://api.supabase.com/v1/projects/${env.SUPABASE_PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}`, 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' },
    body: JSON.stringify({ query }),
  });
  const d = await r.json();
  if (!Array.isArray(d)) throw new Error(d.message || JSON.stringify(d).slice(0, 300));
  return d;
};

const ROTULOS = {
  'demo-chef': {
    stacks: 'Técnicas da casa', projects: 'Meus pratos', cases: 'pratos',
    experience: 'Onde eu cozinhei', challenge: 'A ideia', solution: 'Como eu faço',
    features: 'O que vai no prato', stackLabel: 'Ingredientes', visit: 'Ver o menu',
  },
  'demo-advogada': {
    stacks: 'Áreas de atuação', projects: 'Casos e atuações', cases: 'casos',
    experience: 'Trajetória', challenge: 'A situação', solution: 'A tese e a estratégia',
    features: 'O que foi feito', stackLabel: 'Matérias envolvidas', visit: 'Ler mais',
  },
  'demo-fotografo': {
    stacks: 'Equipamento e processo', projects: 'Ensaios', cases: 'ensaios',
    experience: 'Trajetória', challenge: 'O contexto', solution: 'O olhar',
    features: 'O que está incluso', stackLabel: 'Equipamento', visit: 'Ver a galeria',
  },
  'demo-personal': {
    stacks: 'Especialidades', projects: 'Programas e resultados', cases: 'programas',
    experience: 'Formação e certificações', challenge: 'O ponto de partida', solution: 'O plano',
    features: 'O que está incluso', stackLabel: 'Métodos', visit: 'Quero treinar',
  },
  'demo-arquiteta': {
    stacks: 'Serviços', projects: 'Projetos', cases: 'projetos',
    experience: 'Trajetória', challenge: 'O programa', solution: 'O partido',
    features: 'Escopo entregue', stackLabel: 'Ferramentas', visit: 'Ver o projeto',
  },
  'demo-psicologa': {
    stacks: 'Abordagens e público', projects: 'Trabalhos', cases: 'trabalhos',
    experience: 'Formação', challenge: 'O contexto', solution: 'Como trabalho',
    features: 'O que está incluso', stackLabel: 'Abordagens', visit: 'Saiba mais',
  },
  'demo-musica': {
    stacks: 'O que eu faço', projects: 'Discografia', cases: 'faixas',
    experience: 'Trajetória', challenge: 'O briefing', solution: 'A produção',
    features: 'O que entreguei', stackLabel: 'Estúdio e equipamento', visit: 'Ouvir',
  },
  'demo-confeitaria': {
    stacks: 'Minhas especialidades', projects: 'Meus doces', cases: 'encomendas',
    experience: 'Cursos e formação', challenge: 'A festa', solution: 'O que eu fiz',
    features: 'O que vai junto', stackLabel: 'Sabores', visit: 'Encomendar',
  },
  'demo-professor': {
    stacks: 'Disciplinas', projects: 'Cursos e materiais', cases: 'cursos',
    experience: 'Titulação e aprovações', challenge: 'A dificuldade', solution: 'Como eu ensino',
    features: 'O que o aluno recebe', stackLabel: 'Conteúdo', visit: 'Ver o curso',
  },
  'demo-tattoo': {
    stacks: 'Estilos', projects: 'Trabalhos', cases: 'tattoos',
    experience: 'Trajetória', challenge: 'A ideia do cliente', solution: 'Como ficou',
    features: 'O que está incluso', stackLabel: 'Técnica', visit: 'Ver no Instagram',
  },
};

const lit = (s) => `'${String(s).replace(/'/g, "''")}'`;

for (const [slug, mapa] of Object.entries(ROTULOS)) {
  const jsonb = JSON.stringify(Object.fromEntries(Object.entries(mapa).map(([k, v]) => [k, { pt: v }])));
  try {
    await q(`
      do $$
      declare v_id uuid;
      begin
        select id into v_id from myportifolio.portfolios where slug = ${lit(slug)};
        if v_id is null then return; end if;
        update myportifolio.portfolios set ui_labels = ${lit(jsonb)}::jsonb where id = v_id;
        perform myportifolio.publicar_interno(v_id);
      end $$;`);
    console.log(`ok   ${slug}`);
  } catch (e) {
    console.log(`erro ${slug}: ${e.message.slice(0, 160)}`);
  }
}
