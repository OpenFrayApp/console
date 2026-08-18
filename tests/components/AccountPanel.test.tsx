// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone
// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { User } from '@supabase/supabase-js'
import { AuthContext, type AuthState } from '../../src/auth/useAuth.ts'
import { AccountPanel } from '../../src/components/AccountPanel.tsx'

afterEach(cleanup)

function renderPanel(overrides: Partial<AuthState> & { allowReserved?: boolean } = {}) {
  const { allowReserved = false, ...auth } = overrides
  const value: AuthState = {
    user: { email: 'dm@openfray.app', app_metadata: { provider: 'google' } } as unknown as User,
    displayName: 'Nico Mustone',
    loading: false,
    configured: true,
    signInWithProvider: vi.fn(async () => ({ error: null })),
    signOut: vi.fn(async () => {}),
    deleteAccount: vi.fn(async () => ({ error: null })),
    setDisplayName: vi.fn(async () => ({ error: null })),
    ...auth,
  }
  const onClose = vi.fn()
  render(
    <AuthContext.Provider value={value}>
      <AccountPanel onClose={onClose} allowReserved={allowReserved} />
    </AuthContext.Provider>,
  )
  return { value, onClose }
}

describe('AccountPanel — display name', () => {
  it('shows the name shared encounters publish under, and saves a new one', async () => {
    const setDisplayName = vi.fn(async () => ({ error: null }))
    renderPanel({ setDisplayName })
    const field = screen.getByLabelText('Name') as HTMLInputElement
    expect(field.value).toBe('Nico Mustone')

    fireEvent.change(field, { target: { value: 'Nico Verdi' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(setDisplayName).toHaveBeenCalledWith('Nico Verdi'))
    await screen.findByText('Saved.')
  })

  it('refuses a name a byline could never carry, before it reaches the account', async () => {
    const setDisplayName = vi.fn(async () => ({ error: null }))
    renderPanel({ setDisplayName })
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'casino.com' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await screen.findByText(/letters, numbers, spaces/)
    expect(setDisplayName).not.toHaveBeenCalled()
  })

  it('lets a granted account keep a reserved name', async () => {
    const setDisplayName = vi.fn(async () => ({ error: null }))
    renderPanel({ setDisplayName, allowReserved: true })
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'OpenFray' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(setDisplayName).toHaveBeenCalledWith('OpenFray'))
  })

  it('clears back to unsigned', async () => {
    const setDisplayName = vi.fn(async () => ({ error: null }))
    renderPanel({ setDisplayName })
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: '  ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(setDisplayName).toHaveBeenCalledWith('  '))
    await screen.findByText(/Cleared/)
  })
})

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
