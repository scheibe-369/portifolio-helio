import { createClient } from '@supabase/supabase-js';

// UNICO ponto do repositorio que instancia o cliente do Supabase.
//
// Ele mora em shared/ e nao dentro de um modulo porque dois modulos precisam dele (access,
// para entrar; legal, para exportar e apagar dado), e duplicar createClient duplicaria
// tambem a sessao guardada em storage, o que produz dois estados de auth divergentes na
// mesma aba. Cliente de banco e infraestrutura compartilhada, nao logica de feature.
//
// Este arquivo so pode ser alcancado a partir de src/app/editorBoot.js. O bundle publico
// (src/main.js) nao pode chegar aqui, e scripts/import-graph.mjs reprova se chegar: a
// pagina publica de um comprador nao tem motivo nenhum para carregar cliente de banco.
//
// db.schema nasce em 'myportifolio' porque o projeto Supabase e COMPARTILHADO com o AI
// Block, e public ja tem funcoes de assinatura IDENTICA (is_admin,
// grant_or_revoke_member_access). Sem esta linha, um rpc('is_admin') deste produto
// executaria a funcao do outro produto, em silencio.
export const SCHEMA = 'myportifolio';

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
export const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  db: { schema: SCHEMA },
});
