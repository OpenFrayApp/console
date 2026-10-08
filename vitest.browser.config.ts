// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { playwright } from '@vitest/browser-playwright'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vitest/config'
import type { BrowserCommandContext } from 'vitest/node'
import type { Page, FrameLocator } from 'playwright'

type PlaywrightCommandPage = Pick<Page, 'emulateMedia' | 'once'>

interface PlaywrightCommandProvider {
  getCommandsContext(sessionId: string): { page: PlaywrightCommandPage; iframe: FrameLocator }
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
        /** Click the real cleanup control and answer Chromium's native confirmation. */
        confirmBoardClear: async (context, accept: boolean) => {
          const { page, iframe } = playwrightProvider(context).getCommandsContext(context.sessionId)
          const confirmation = new Promise<{ type: string; message: string }>((resolve) => {
            page.once('dialog', async (dialog) => {
              const observed = { type: dialog.type(), message: dialog.message() }
              if (accept) await dialog.accept()
              else await dialog.dismiss()
              resolve(observed)
            })
          })
          await iframe.getByRole('button', { name: 'Remove everyone and clear the log' }).click()
          return confirmation
        },
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
