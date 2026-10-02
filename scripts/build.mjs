import { build } from 'vite';
import { SITE } from '../lib/site.mjs';
import { prerender } from './prerender.mjs';

await build();
await prerender();
await build({
  configFile: false,
  define: { __CHATPTT_SITE_ORIGIN__: JSON.stringify(SITE.origin) },
  ssr: { noExternal: true },
  build: {
    ssr: 'server/index.ts',
    outDir: 'dist/server',
    emptyOutDir: true,
    rollupOptions: { output: { entryFileNames: 'index.mjs' } },
  },
});
