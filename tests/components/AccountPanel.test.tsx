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
    user: { email: 'dm@openfray.app' } as unknown as User,
    loading: false,
    configured: true,
    signUp: vi.fn(async () => ({ error: null })),
    signIn: vi.fn(async () => ({ error: null })),
    signOut: vi.fn(async () => {}),
    updateEmail: vi.fn(async () => ({ error: null })),
    updatePassword: vi.fn(async () => ({ error: null })),
    deleteAccount: vi.fn(async () => ({ error: null })),
    ...overrides,
  }
  const onClose = vi.fn()
  render(
    <AuthContext.Provider value={value}>
      <AccountPanel onClose={onClose} />
    </AuthContext.Provider>,
  )
  return { value, onClose }
}

describe('AccountPanel', () => {
  it('changes the email and tells the user to confirm', async () => {
    const { value } = renderPanel()
    fireEvent.change(screen.getByLabelText('New email'), { target: { value: 'new@openfray.app' } })
    fireEvent.click(screen.getByRole('button', { name: 'Update email' }))
    await waitFor(() => expect(value.updateEmail).toHaveBeenCalledWith('new@openfray.app'))
    expect(screen.getByText(/Check your inbox to confirm/)).toBeInTheDocument()
  })

  it('changes the password', async () => {
    const { value } = renderPanel()
    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'Str0ng-Pass!' } })
    fireEvent.click(screen.getByRole('button', { name: 'Update password' }))
    await waitFor(() => expect(value.updatePassword).toHaveBeenCalledWith('Str0ng-Pass!'))
    expect(screen.getByText('Password updated.')).toBeInTheDocument()
  })

  it('surfaces a password-policy rejection from Supabase', async () => {
    const { value } = renderPanel({
      updatePassword: vi.fn(async () => ({ error: 'Password is known to be weak.' })),
    })
    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'password' } })
    fireEvent.click(screen.getByRole('button', { name: 'Update password' }))
    await waitFor(() => expect(value.updatePassword).toHaveBeenCalled())
    expect(screen.getByText('Password is known to be weak.')).toBeInTheDocument()
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
