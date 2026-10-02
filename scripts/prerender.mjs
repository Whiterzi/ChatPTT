import { readFile, writeFile } from 'node:fs/promises';
import { build } from 'vite';
import { seoHead, SITE } from '../lib/site.mjs';

export async function prerender() {
  await build({ build: { ssr: 'src/prerender.tsx', outDir: 'tmp/prerender', emptyOutDir: true, rollupOptions: { output: { entryFileNames: 'home.mjs' } } } });
  const { renderHome } = await import(new URL('../tmp/prerender/home.mjs',import.meta.url));
  const index = new URL('../dist/client/index.html',import.meta.url);
  const html = await readFile(index,'utf8');
  await writeFile(index,html.replace('<div id="root"></div>',`<div id="root">${renderHome()}</div>`));
  await writeFile(new URL('../dist/client/robots.txt',import.meta.url),`User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /healthz\nSitemap: ${SITE.origin}/sitemap.xml\n`);
  await writeFile(new URL('../dist/client/sitemap.xml',import.meta.url),`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${SITE.origin}/</loc></url><url><loc>${SITE.origin}/about</loc></url></urlset>`);
  const about = await readFile(new URL('../assets/about.html',import.meta.url),'utf8');
  await writeFile(new URL('../dist/client/about.html',import.meta.url),about.replace('<!-- site metadata -->',seoHead('/about')));
}
