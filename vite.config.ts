// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/ · https://vitest.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    // Default to node (fast). Component tests opt into jsdom with a file
    // docblock: `// @vitest-environment jsdom`.
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
  },
})
