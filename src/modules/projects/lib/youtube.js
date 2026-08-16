// Extrai o id de 11 caracteres de uma URL do YouTube, e a orientacao do video.
//
// POR QUE O DADO GUARDA O ID E NAO A URL: analisar URL em tempo de render significa fazer
// isso a cada pintura, e significa que o dado publicado carrega uma URL montada. O plano ja
// decidiu (achado 12) que o payload guarda o dado cru e quem monta URL e o render, no
// instante do request. Guardando `videoId`, trocar o host de embed ou anexar parametro de
// privacidade vira uma linha no render, e nao uma migracao de dado.
//
// O CONTRATO E OBJETO, E ISSO JA CUSTOU CARO. Ate 16/08/2026 esta funcao devolvia string ou
// null, enquanto os tres chamadores (primitivos.js:221, formulario.js:89 e
// projectsApi.js:58) liam `.id` e `.orientation`, porque foram escritos contra a secao 6.6
// do plano. O efeito era duplo e silencioso: link VALIDO caia em `!r.id` e o editor
// respondia "nao reconheci este link do YouTube", bloqueando o salvar; e link invalido
// devolvia null, entao `r.id` lancava TypeError e derrubava o formulario. Resultado: nenhum
// comprador conseguia salvar projeto com video, `youtube_id` nunca era gravado, a coluna
// gerada `has_video` ficava sempre falsa e a invariante editorial "video primeiro"
// (projects_video_first) nunca disparava. Quem mexer aqui: mudar a FORMA do retorno quebra
// tres arquivos de uma vez, e nenhum deles avisa em build.
//
// Allowlist de host, nunca `includes('youtube')`: sem ela, `evil.com/watch?v=<id>` casaria a
// regex e um dominio de terceiro entraria no iframe servido do nosso subdominio.
const HOSTS = new Set([
  'youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com',
  'youtu.be', 'www.youtu.be',
  'youtube-nocookie.com', 'www.youtube-nocookie.com',
]);

// Os segmentos de caminho que sao seguidos pelo id.
const SEGMENTOS = new Set(['embed', 'shorts', 'live', 'v']);

// O formato do id, e ele e conferido SEMPRE, inclusive no que veio de searchParams. Sem
// isso, `?v=<script>` entra no banco. E gemeo do CHECK de youtube_id.
const RE_ID = /^[A-Za-z0-9_-]{11}$/;

const naoReconhecido = (reason) => ({ id: null, orientation: null, canonical: null, reason });

export function parseYoutubeId(entrada) {
  if (!entrada) return naoReconhecido('vazio');
  const s = String(entrada).trim();
  if (!s) return naoReconhecido('vazio');

  // Id colado sozinho. Vem antes do parse de URL porque um id nao e URL.
  if (RE_ID.test(s)) return achado(s, 'horizontal');

  // Colar `youtu.be/abc` sem esquema e o caso mais comum, e sem isto `new URL` lanca.
  const comEsquema = /^[a-z][a-z0-9+.-]*:\/\//i.test(s) ? s : `https://${s}`;

  let u;
  try {
    u = new URL(comEsquema);
  } catch {
    return naoReconhecido('url');
  }

  if (!HOSTS.has(u.hostname.toLowerCase())) return naoReconhecido('host');

  const partes = u.pathname.split('/').filter(Boolean);

  // 1) ?v=ID, que cobre `watch?v=ID` e `watch?app=desktop&v=ID` (parametro antes do v).
  const doQuery = u.searchParams.get('v');
  if (doQuery && RE_ID.test(doQuery)) return achado(doQuery, 'horizontal');

  // 2) O segmento seguinte a embed, shorts, live ou v. Shorts e o unico vertical.
  for (let i = 0; i < partes.length - 1; i += 1) {
    if (SEGMENTOS.has(partes[i].toLowerCase())) {
      const cand = partes[i + 1];
      if (RE_ID.test(cand)) {
        return achado(cand, partes[i].toLowerCase() === 'shorts' ? 'portrait' : 'horizontal');
      }
      return naoReconhecido('id');
    }
  }

  // 3) youtu.be/ID, onde o id e o primeiro segmento do caminho.
  if (u.hostname.toLowerCase().endsWith('youtu.be') && partes.length) {
    if (RE_ID.test(partes[0])) return achado(partes[0], 'horizontal');
    return naoReconhecido('id');
  }

  return naoReconhecido('id');
}

function achado(id, orientation) {
  return { id, orientation, canonical: `https://www.youtube.com/watch?v=${id}`, reason: null };
}
