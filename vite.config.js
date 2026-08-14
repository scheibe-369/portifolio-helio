import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import tailwindcss from '@tailwindcss/vite';

// Inlines the built CSS into each HTML entry (removes the render-blocking stylesheet
// request). O bundle e pequeno, entao embutir ganha do round-trip extra no celular.
//
// Isso importa mais ainda a partir da fase 1: o Worker serve o shell publico por tenant, e
// um <link> de CSS seria uma segunda viagem antes da primeira pintura, na borda, para toda
// visita de todo comprador.
function inlineCss() {
  return {
    name: 'inline-css',
    enforce: 'post',
    apply: 'build',
    transformIndexHtml(html, ctx) {
      if (!ctx || !ctx.bundle) return html;
      for (const [fileName, asset] of Object.entries(ctx.bundle)) {
        if (fileName.endsWith('.css') && asset.type === 'asset') {
          const css = typeof asset.source === 'string' ? asset.source : asset.source.toString();
          const esc = fileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const linkRe = new RegExp('<link[^>]*?href="[^"]*' + esc + '"[^>]*?>');
          if (linkRe.test(html)) {
            html = html.replace(linkRe, '<style>' + css + '</style>');
            delete ctx.bundle[fileName];
          }
        }
      }
      return html;
    },
  };
}

export default defineConfig({
  plugins: [tailwindcss(), inlineCss()],
  build: {
    rollupOptions: {
      // Duas entradas: a pagina publica (que o Worker vai servir por tenant) e o editor
      // (que so existe no apex, atras de login). Separadas de proposito: o bundle publico
      // nao pode carregar o cliente do Supabase, e ter duas entradas e o que torna essa
      // regra verificavel pelo scripts/import-graph.mjs.
      input: {
        index: resolve(import.meta.dirname, 'index.html'),
        app: resolve(import.meta.dirname, 'app.html'),
      },
    },
  },
  server: {
    port: 5173,
    open: true,
  },
});
