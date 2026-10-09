// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { expect, it, vi } from 'vitest'
import { supabase } from '../../src/lib/supabase.ts'

it('leaves the real Supabase client unconfigured in ordinary tests', () => {
  // A failing assertion must not dump a configured client's credentials into the log.
  expect(supabase === null).toBe(true)
  expect(import.meta.env.VITE_SUPABASE_URL).toBe('')
  expect(import.meta.env.VITE_SUPABASE_ANON_KEY).toBe('')
})

it('restores the guarded fetch after an explicit network mock', () => {
  const guardedFetch = globalThis.fetch
  vi.stubGlobal('fetch', vi.fn<typeof fetch>())
  vi.unstubAllGlobals()
  expect(globalThis.fetch).toBe(guardedFetch)
})

it('restores an unconfigured backend after test-specific environment overrides', () => {
  vi.stubEnv('VITE_SUPABASE_URL', 'https://fixture.supabase.co')
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'fixture-key')
  vi.unstubAllEnvs()
  expect(import.meta.env.VITE_SUPABASE_URL).toBe('')
  expect(import.meta.env.VITE_SUPABASE_ANON_KEY).toBe('')
})
