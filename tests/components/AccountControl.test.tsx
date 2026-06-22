// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors
// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { User } from '@supabase/supabase-js'
import { AuthContext, type AuthState } from '../../src/auth/useAuth.ts'
import { AccountControl } from '../../src/components/AccountControl.tsx'

afterEach(cleanup)

function renderControl(overrides: Partial<AuthState> = {}) {
  const value: AuthState = {
    user: null,
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
  const onSignUp = vi.fn()
  render(
    <AuthContext.Provider value={value}>
      <AccountControl onSignUp={onSignUp} />
    </AuthContext.Provider>,
  )
  return { value, onSignUp }
}

describe('AccountControl (anonymous)', () => {
  it('shows "Sign in" (not "Sign up") and opens a login popover', () => {
    renderControl()
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Password')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
  })

  it('logs in with the entered credentials', async () => {
    const { value } = renderControl()
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'dm@openfray.app' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret-pass' } })
    fireEvent.click(screen.getByRole('button', { name: 'Log in' }))
    await waitFor(() => expect(value.signIn).toHaveBeenCalledWith('dm@openfray.app', 'secret-pass'))
  })

  it('surfaces a login error and stays open', async () => {
    const { value } = renderControl({ signIn: vi.fn(async () => ({ error: 'Invalid login credentials' })) })
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'dm@openfray.app' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'wrong' } })
    fireEvent.click(screen.getByRole('button', { name: 'Log in' }))
    await waitFor(() => expect(value.signIn).toHaveBeenCalled())
    expect(screen.getByText('Invalid login credentials')).toBeInTheDocument()
  })

  it('routes the "Sign up" link to the full sign-up flow', () => {
    const { onSignUp } = renderControl()
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    fireEvent.click(screen.getByRole('button', { name: 'Sign up' }))
    expect(onSignUp).toHaveBeenCalledTimes(1)
  })

  it('shows the account email + Sign out when signed in', () => {
    renderControl({ user: { email: 'dm@openfray.app' } as unknown as User })
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Sign in' })).toBeNull()
  })
})
