// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors
// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { User } from '@supabase/supabase-js'
import { AuthContext, type AuthState } from '../../src/auth/useAuth.ts'
import { AccountPanel } from '../../src/components/AccountPanel.tsx'

afterEach(cleanup)

function renderPanel(overrides: Partial<AuthState> = {}) {
  const value: AuthState = {
    user: { email: 'dm@openfray.app', app_metadata: { provider: 'google' } } as unknown as User,
    loading: false,
    configured: true,
    signInWithProvider: vi.fn(async () => ({ error: null })),
    signOut: vi.fn(async () => {}),
    deleteAccount: vi.fn(async () => ({ error: null })),
    ...overrides,
  }
  const onClose = vi.fn()
  render(
    <AuthContext.Provider value={value}>
      <AccountPanel onClose={onClose} enabledLibraries={['srd-5.2']} onSetEnabledLibraries={() => {}} />
    </AuthContext.Provider>,
  )
  return { value, onClose }
}

describe('AccountPanel', () => {
  it('shows the signed-in identity, the provider, and no email/password editing', () => {
    renderPanel()
    expect(screen.getByText('Signed in')).toBeInTheDocument()
    expect(screen.getAllByText(/dm@openfray\.app/).length).toBeGreaterThan(0)
    // Names the specific provider the user signed in with.
    expect(screen.getByText('Google')).toBeInTheDocument()
    // Email/password are owned by the provider now — no editing controls.
    expect(screen.queryByLabelText('New email')).toBeNull()
    expect(screen.queryByLabelText('New password')).toBeNull()
  })

  it('signs out from the panel', () => {
    const { value } = renderPanel()
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }))
    expect(value.signOut).toHaveBeenCalledTimes(1)
  })

  it('gates delete behind typing the account email, then deletes', async () => {
    const { value, onClose } = renderPanel()
    const del = screen.getByRole('button', { name: 'Delete my account' })
    expect(del).toBeDisabled()

    // Wrong text keeps it disabled; the exact email (case-insensitive) enables it.
    fireEvent.change(screen.getByLabelText('Confirm account email to delete'), {
      target: { value: 'nope' },
    })
    expect(del).toBeDisabled()
    fireEvent.change(screen.getByLabelText('Confirm account email to delete'), {
      target: { value: 'DM@openfray.app' },
    })
    expect(del).toBeEnabled()

    fireEvent.click(del)
    await waitFor(() => expect(value.deleteAccount).toHaveBeenCalledTimes(1))
    expect(onClose).toHaveBeenCalled()
  })
})
