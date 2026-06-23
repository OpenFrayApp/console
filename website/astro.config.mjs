// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// The marketing/docs site for openfray.app. Builds to website/dist, which the
// root build (scripts/assemble-site.mjs) merges into the site root of dist/,
// alongside the app at dist/console. Directory build format gives clean URLs
// (/privacy, /terms) plus a root 404.html that Cloudflare Pages serves.
export default defineConfig({
  site: 'https://openfray.app',
  integrations: [sitemap()],
});
