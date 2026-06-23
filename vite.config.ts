// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/ · https://vitest.dev/config/
export default defineConfig({
  // The app is served under /console (openfray.app/console); the site root is a
  // separate landing page. `base` makes Vite emit asset URLs under /console/, and
  // `import.meta.env.BASE_URL` (= '/console/') is the prefix for runtime fetches.
  base: '/console/',
  plugins: [react(), tailwindcss()],
  // Build into dist/console so the app lives at the /console path; the landing page
  // and Pages routing rules are added to dist/ root by scripts/assemble-site.mjs.
  build: { outDir: 'dist/console' },
  test: {
    // Default to node (fast). Component tests opt into jsdom with a file
    // docblock: `// @vitest-environment jsdom`.
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
  },
})
