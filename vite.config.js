import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

// Inlines the built CSS into index.html (removes the render-blocking stylesheet
// request). The bundle is tiny, so inlining beats a separate round-trip on mobile.
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
  server: {
    port: 5173,
    open: true,
  },
});
