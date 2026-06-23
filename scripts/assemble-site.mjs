// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

// Assembles dist/ for Cloudflare Pages. Vite builds the app into dist/console
// (base = /console/) and Astro builds the marketing site into website/dist. This
// step copies the built site to the dist root and writes the Pages routing rules.
// Output dir for Pages is dist/.
import { cpSync, writeFileSync } from 'node:fs'

// Site root (/) → the Astro-built marketing site (home, privacy, terms, 404). The
// app under /console is built separately by Vite and is unaffected.
cpSync('website/dist', 'dist', { recursive: true })

// Pages routing: normalise /console to its index, and give the app an SPA-style
// fallback so any /console/* path resolves to the app shell (real static assets
// under /console/ are served first, so this only catches unknown paths). The site
// root is left to dist/index.html.
const redirects = [
  '/console            /console/             301',
  '/console/*          /console/index.html   200',
  '',
].join('\n')
writeFileSync('dist/_redirects', redirects)

console.log('Assembled dist/: landing at /, app at /console/, _redirects written.')
