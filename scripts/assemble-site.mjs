// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

// Assembles dist/ for Cloudflare Pages. Vite builds the app into dist/console
// (base = /console/), Astro builds the marketing site into site/dist, and Starlight
// builds the handbook into docs/dist (base = /docs/). This step copies each into
// the dist root and writes the Pages routing rules. Output dir for Pages is dist/.
import { cpSync, writeFileSync } from 'node:fs'

// Site root (/) → the Astro-built marketing site (home, privacy, terms, 404). The
// app under /console is built separately by Vite and is unaffected.
cpSync('site/dist', 'dist', { recursive: true })

// /docs → the Starlight handbook, built with base = /docs/ so its links and assets
// already point under /docs. Copy it in wholesale.
cpSync('docs/dist', 'dist/docs', { recursive: true })

// Pages routing: normalise the bare /console and /docs to their trailing-slash index,
// and give the app an SPA-style fallback so any /console/* path resolves to the app
// shell (real static assets under /console/ are served first, so this only catches
// unknown paths). The docs are fully static, so they need no fallback. The site root
// is left to dist/index.html.
const redirects = [
  '/console            /console/             301',
  '/console/*          /console/index.html   200',
  '/docs               /docs/                301',
  '',
].join('\n')
writeFileSync('dist/_redirects', redirects)

console.log('Assembled dist/: landing at /, app at /console/, docs at /docs/, _redirects written.')
