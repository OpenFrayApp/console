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
  const onSignOut = vi.fn()
  render(
    <AuthContext.Provider value={value}>
      <AccountControl
        onSignIn={onSignIn}
        onOpenAccount={onOpenAccount}
        onOpenShares={onOpenShares}
        onSignOut={onSignOut}
      />
    </AuthContext.Provider>,
  )
  return { value, onSignIn, onOpenAccount, onOpenShares, onSignOut }
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
    expect(screen.getByRole('menuitem', { name: 'Sign out' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('menuitem', { name: 'Profile' }))
    expect(onOpenAccount).toHaveBeenCalledOnce()
    expect(screen.queryByRole('heading', { name: 'Account' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Account menu' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Shared links' }))
    expect(onOpenShares).toHaveBeenCalledOnce()
    expect(value.signOut).not.toHaveBeenCalled()
  })

  it('closes the menu and requests checkpointed sign-out without calling auth directly', () => {
    const { value, onSignOut } = renderControl({
      user: { id: 'owner', email: 'gm@example.test' } as User,
    })
    fireEvent.click(screen.getByRole('button', { name: 'Account menu' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Sign out' }))
    expect(onSignOut).toHaveBeenCalledOnce()
    expect(value.signOut).not.toHaveBeenCalled()
    expect(screen.queryByRole('menu')).toBeNull()
  })

  it.each([{ loading: true }, { configured: false }])(
    'hides account entry when unavailable (%j)',
    (overrides) => {
      const { onOpenAccount } = renderControl(overrides)
      expect(screen.queryByRole('button')).toBeNull()
      expect(onOpenAccount).not.toHaveBeenCalled()
    },
  )
})

it.each([
  { profileLoading: true, profileError: null, role: 'status', message: 'Checking profile' },
  {
    profileLoading: false,
    profileError: 'Your account profile could not be verified.',
    role: 'alert',
    message: 'could not be verified',
  },
])(
  'keeps profile navigation available while reporting account metadata state ($role)',
  ({ role, message, ...state }) => {
    const { onOpenAccount } = renderControl({
      user: { email: 'fixture@example.test' } as User,
      ...state,
    })
    fireEvent.click(screen.getByRole('button', { name: 'Account menu' }))
    expect(screen.getByRole(role)).toHaveTextContent(message)
    fireEvent.click(screen.getByRole('menuitem', { name: 'Profile' }))
    expect(onOpenAccount).toHaveBeenCalledOnce()
  },
)
