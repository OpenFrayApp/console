// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors
// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { User } from '@supabase/supabase-js'
import { AuthContext, type AuthState } from '../../src/auth/useAuth.ts'
import { AccountControl } from '../../src/components/AccountControl.tsx'

afterEach(cleanup)

function renderControl(overrides: Partial<AuthState> = {}) {
  const value: AuthState = {
    user: null,
    loading: false,
    configured: true,
    signInWithProvider: vi.fn(async () => ({ error: null })),
    signOut: vi.fn(async () => {}),
    deleteAccount: vi.fn(async () => ({ error: null })),
    ...overrides,
  }
  const onSignIn = vi.fn()
  render(
    <AuthContext.Provider value={value}>
      <AccountControl onSignIn={onSignIn} />
    </AuthContext.Provider>,
  )
  return { value, onSignIn }
}

describe('AccountControl (anonymous)', () => {
  it('shows a "Sign in" button that opens the full sign-in page', () => {
    const { onSignIn } = renderControl()
    const button = screen.getByRole('button', { name: 'Sign in' })
    expect(button).toBeInTheDocument()
    fireEvent.click(button)
    expect(onSignIn).toHaveBeenCalledTimes(1)
  })

  it('shows a user-icon menu (Settings + Sign out) when signed in', () => {
    const { value } = renderControl({ user: { email: 'dm@openfray.app' } as unknown as User })
    expect(screen.queryByRole('button', { name: 'Sign in' })).toBeNull()
    // The menu is closed until the icon is clicked.
    expect(screen.queryByRole('menuitem', { name: 'Sign out' })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Account menu' }))
    expect(screen.getByRole('menuitem', { name: 'Profile' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('menuitem', { name: 'Sign out' }))
    expect(value.signOut).toHaveBeenCalledTimes(1)
  })

  it('opens the account settings panel from the menu', () => {
    renderControl({ user: { email: 'dm@openfray.app' } as unknown as User })
    fireEvent.click(screen.getByRole('button', { name: 'Account menu' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Profile' }))
    expect(screen.getByRole('heading', { name: 'Account' })).toBeInTheDocument()
    expect(screen.getByText('Delete account')).toBeInTheDocument()
  })
})
