// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone
// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { User } from '@supabase/supabase-js'
import { AuthContext, type AuthState } from '../../../src/auth/useAuth.ts'
import { AccountControl } from '../../../src/components/account/AccountControl.tsx'
import { authState } from '../../fixtures.ts'

afterEach(cleanup)

function renderControl(overrides: Partial<AuthState> = {}) {
  const value = authState(overrides)
  const onSignIn = vi.fn()
  const onOpenAccount = vi.fn()
  const onOpenShares = vi.fn()
  render(
    <AuthContext.Provider value={value}>
      <AccountControl
        onSignIn={onSignIn}
        onOpenAccount={onOpenAccount}
        onOpenShares={onOpenShares}
      />
    </AuthContext.Provider>,
  )
  return { value, onSignIn, onOpenAccount, onOpenShares }
}

describe('AccountControl (anonymous)', () => {
  it('shows a "Sign in" button that opens the full sign-in page', () => {
    const { onSignIn } = renderControl()
    const button = screen.getByRole('button', { name: 'Sign in' })
    expect(button).toBeInTheDocument()
    fireEvent.click(button)
    expect(onSignIn).toHaveBeenCalledTimes(1)
  })

  it('opens site account through the checkpoint action and keeps Shared links in the console', () => {
    const { value, onOpenAccount, onOpenShares } = renderControl({
      user: { email: 'gm@example.test' } as User,
    })
    fireEvent.click(screen.getByRole('button', { name: 'Account menu' }))
    expect(screen.queryByRole('menuitem', { name: 'Sign out' })).toBeNull()
    fireEvent.click(screen.getByRole('menuitem', { name: 'Profile' }))
    expect(onOpenAccount).toHaveBeenCalledOnce()
    expect(screen.queryByRole('heading', { name: 'Account' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Account menu' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Shared links' }))
    expect(onOpenShares).toHaveBeenCalledOnce()
    expect(value.signOut).not.toHaveBeenCalled()
  })

  it('requests site account from quick navigation only while signed in', () => {
    const onOpenAccount = vi.fn()
    const control = (user: User | null, openRequest: number) => (
      <AuthContext.Provider value={authState({ user })}>
        <AccountControl
          onSignIn={() => {}}
          onOpenAccount={onOpenAccount}
          openRequest={openRequest}
        />
      </AuthContext.Provider>
    )
    const user = { email: 'gm@example.test' } as User
    const { rerender } = render(control(user, 0))
    rerender(control(user, 1))
    expect(onOpenAccount).toHaveBeenCalledOnce()
    rerender(control(null, 2))
    expect(onOpenAccount).toHaveBeenCalledOnce()
  })
})
