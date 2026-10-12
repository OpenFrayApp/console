// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone
// @vitest-environment jsdom

import { afterEach, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { User } from '@supabase/supabase-js'
import App from '../src/App.tsx'
import { saveSettings } from '../src/state/settings.ts'
import { AuthContext, type AuthState } from '../src/auth/useAuth.ts'
import { authState } from './fixtures.ts'
import { IndexedDbRecovery } from '../src/state/indexedDbRecovery.ts'
import type { SessionSnapshot } from '../src/state/persistence.ts'

const navigation = vi.hoisted(() => ({ account: vi.fn() }))
vi.mock('../src/auth/signInNavigation.ts', () => ({
  navigateToSiteAccount: navigation.account,
  navigateToSiteSignIn: vi.fn(),
}))

const user = { id: 'search-owner', email: 'gm@example.com' } as User

afterEach(() => {
  cleanup()
  navigation.account.mockReset()
  vi.restoreAllMocks()
  sessionStorage.clear()
  localStorage.clear()
})

/** Open real app search with a supplied authentication state and no network credentials. */
async function openSearch(overrides: Partial<AuthState>) {
  saveSettings({ tutorialSuppression: 'dismissed' })
  render(
    <AuthContext.Provider value={authState(overrides)}>
      <App />
    </AuthContext.Provider>,
  )
  await act(() => Promise.resolve())
  fireEvent.click(screen.getByRole('button', { name: 'Search references' }))
}

it('does not contact Supabase when a component test supplies a signed-in user', async () => {
  // Intercept before rendering so this regression cannot send real requests when it fails.
  const fetch = vi
    .spyOn(globalThis, 'fetch')
    .mockImplementation(async () =>
      Response.json({ code: '42501', message: 'Unconfigured test backend' }, { status: 401 }),
    )
  await openSearch({ user })
  fireEvent.click(screen.getByRole('option', { name: 'Shared links' }))
  await screen.findByRole('dialog', { name: 'Shared links' })
  // Local compendium fetches are allowed; hosted Supabase requests are the regression.
  const contactedSupabase = fetch.mock.calls.some(([input]) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    return new URL(url, 'http://localhost').hostname.endsWith('.supabase.co')
  })
  expect(contactedSupabase).toBe(false)
})

it.each([
  { state: 'loading', auth: { loading: true, user }, expected: [] },
  { state: 'unconfigured', auth: { configured: false }, expected: [] },
  { state: 'signed out', auth: {}, expected: ['Sign in'] },
  { state: 'signed in', auth: { user }, expected: ['Profile', 'Shared links'] },
])('offers only available account destinations while $state', async ({ auth, expected }) => {
  await openSearch(auth)
  const accountDestinations = screen
    .getAllByRole('option')
    .map((option) => option.textContent)
    .filter((name) => ['Profile', 'Shared links', 'Sign in'].includes(name ?? ''))
  expect(accountDestinations).toEqual(expected)
})

it.each([{ destination: 'Shared links', dialog: 'Shared links', auth: { user } }])(
  'opens $destination through its existing account surface',
  async ({ destination, dialog, auth }) => {
    await openSearch(auth)
    fireEvent.click(screen.getByRole('option', { name: destination }))
    expect(screen.queryByRole('combobox', { name: 'Search references' })).toBeNull()
    const panel = await screen.findByRole('dialog', { name: dialog })
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    await waitFor(() => expect(panel.contains(document.activeElement)).toBe(true))
  },
)

it('checkpoints Profile quick navigation instead of opening duplicate account management', async () => {
  let stored: SessionSnapshot | null = null
  vi.spyOn(IndexedDbRecovery.prototype, 'loadLatest').mockResolvedValue(null)
  vi.spyOn(IndexedDbRecovery.prototype, 'loadConflict').mockResolvedValue(null)
  vi.spyOn(IndexedDbRecovery.prototype, 'load').mockImplementation(async (ownerId) =>
    stored ? { ownerId, snapshot: stored, savedAt: '2026-09-02T10:11:12Z' } : null,
  )
  vi.spyOn(IndexedDbRecovery.prototype, 'save').mockImplementation(async (_ownerId, snapshot) => {
    stored = snapshot
    return { status: 'saved' }
  })
  await openSearch({ user })
  fireEvent.click(screen.getByRole('option', { name: 'Profile' }))
  expect(screen.queryByRole('combobox', { name: 'Search references' })).toBeNull()
  expect(await screen.findByRole('dialog', { name: 'Account checkpoint' })).toHaveTextContent(
    'cloud copy could not be confirmed',
  )
  expect(screen.queryByRole('heading', { name: 'Account' })).toBeNull()
  expect(navigation.account).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Continue with device copy' }))
  await waitFor(() => expect(navigation.account).toHaveBeenCalledOnce())
  expect(stored).not.toBeNull()
})
