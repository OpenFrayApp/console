// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { playwright } from '@vitest/browser-playwright'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vitest/config'
import type { BrowserCommandContext } from 'vitest/node'

interface PlaywrightCommandPage {
  emulateMedia(options: {
    forcedColors?: 'active' | 'none'
    reducedMotion?: 'reduce' | 'no-preference'
  }): Promise<void>
}

interface PlaywrightCommandProvider {
  getCommandsContext(sessionId: string): { page: PlaywrightCommandPage }
  getCDPSession(sessionId: string): Promise<{
    send(method: string, parameters: Record<string, unknown>): Promise<void>
  }>
}

/** Access the Playwright page attached to a Vitest browser session. */
function playwrightProvider(context: BrowserCommandContext): PlaywrightCommandProvider {
  return context.provider as unknown as PlaywrightCommandProvider
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  optimizeDeps: {
    include: [
      '@supabase/supabase-js',
      '@testing-library/react',
      'opendice',
      'react-markdown',
      'remark-gfm',
      'react',
      'react-dom',
      'react/jsx-dev-runtime',
      'valibot',
    ],
  },
  test: {
    include: ['tests/**/*.browser.test.ts', 'tests/publication/browser.test.ts'],
    browser: {
      enabled: true,
      headless: true,
      provider: playwright(),
      instances: [{ browser: 'chromium' }],
      commands: {
        /** Emulate the display preferences covered by the accessibility journey. */
        emulateAccessibilityMedia: async (
          context,
          options: { forcedColors?: 'active' | 'none'; reducedMotion?: 'reduce' | 'no-preference' },
        ) => {
          const provider = playwrightProvider(context)
          await provider.getCommandsContext(context.sessionId).page.emulateMedia(options)
        },
        /** Switch Chromium's primary pointer between mouse and touch. */
        emulateTouch: async (context, enabled: boolean) => {
          const provider = playwrightProvider(context)
          const session = await provider.getCDPSession(context.sessionId)
          await session.send('Emulation.setTouchEmulationEnabled', {
            enabled,
            maxTouchPoints: enabled ? 5 : 1,
          })
        },
      },
    },
  },
})
