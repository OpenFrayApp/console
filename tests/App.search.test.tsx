// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone
// @vitest-environment jsdom

import { afterEach, expect, it } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { User } from '@supabase/supabase-js'
import App from '../src/App.tsx'
import { AuthContext, type AuthState } from '../src/auth/useAuth.ts'
import { authState } from './fixtures.ts'

const user = { id: 'search-owner', email: 'gm@example.com' } as User

afterEach(() => {
  cleanup()
  sessionStorage.clear()
  localStorage.clear()
})

/** Open real app search with a supplied authentication state and no network credentials. */
async function openSearch(overrides: Partial<AuthState>) {
  render(
    <AuthContext.Provider value={authState(overrides)}>
      <App />
    </AuthContext.Provider>,
  )
  await act(() => Promise.resolve())
  fireEvent.click(screen.getByRole('button', { name: 'Search references' }))
}

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

it.each([
  { destination: 'Profile', dialog: 'Account', auth: { user } },
  { destination: 'Shared links', dialog: 'Shared links', auth: { user } },
  { destination: 'Sign in', dialog: 'Sign in', auth: {} },
])(
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
