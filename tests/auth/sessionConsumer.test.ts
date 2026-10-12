// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { afterEach, expect, it, vi } from 'vitest'

const sdk = vi.hoisted(() => ({ createClient: vi.fn(() => ({})) }))
vi.mock('@supabase/supabase-js', () => ({ createClient: sdk.createClient }))
afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
  sdk.createClient.mockClear()
})

it('consumes stored shared sessions without detecting callback material on console URLs', async () => {
  vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co')
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'public-test-key')
  await import('../../src/lib/supabase.ts')
  expect(sdk.createClient).toHaveBeenCalledExactlyOnceWith(
    'https://example.supabase.co',
    'public-test-key',
    {
      auth: { detectSessionInUrl: false },
      global: { fetch: expect.any(Function) },
    },
  )
})
