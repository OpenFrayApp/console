// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { configDefaults, defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/ · https://vitest.dev/config/
export default defineConfig({
  // The app is served under /console (openfray.app/console); the site root is a
  // separate landing page. `base` makes Vite emit asset URLs under /console/, and
  // `import.meta.env.BASE_URL` (= '/console/') is the prefix for runtime fetches.
  base: '/console/',
  plugins: [react(), tailwindcss()],
  // Fixed so the site's dev server can proxy /console here (see site/astro.config.mjs),
  // and so the Supabase OAuth redirect allow-list has one dev URL to trust.
  server: { port: 5199, strictPort: true },
  // Build into dist/console so the app lives at the /console path; the landing page
  // and Pages routing rules are added to dist/ root by scripts/assemble-site.mjs.
  build: { outDir: 'dist/console' },
  test: {
    // Default to node (fast). Component tests opt into jsdom with a file
    // docblock: `// @vitest-environment jsdom`.
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    // The site workspace runs its own suite (astro-aware config): `npm run test -w site`.
    // `.claude/worktrees/**` is where a spawned agent checks out its own copy of this
    // repo; without it the suite runs twice — once against this tree and once against
    // whatever that branch happens to hold — and reports the other branch's failures
    // as this one's.
    exclude: [
      ...configDefaults.exclude,
      'site/**',
      'docs/**',
      '.claude/worktrees/**',
      'tests/**/*.browser.test.ts',
      'tests/publication/browser.test.ts',
    ],
  },
})
