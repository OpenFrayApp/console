// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors
// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { AuthContext, type AuthState } from '../../src/auth/useAuth.ts'
import { SignUpPage } from '../../src/components/SignUpPage.tsx'

afterEach(cleanup)

function renderPage(overrides: Partial<AuthState> = {}) {
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
  render(
    <AuthContext.Provider value={value}>
      <SignUpPage initialMode="up" onClose={vi.fn()} />
    </AuthContext.Provider>,
  )
  return value
}

const signUp = () => {
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'new@openfray.app' } })
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'hunter2hunter2' } })
  fireEvent.click(screen.getByRole('button', { name: 'Create account' }))
}

describe('SignUpPage', () => {
  it('shows a check-your-inbox panel when sign-up needs email confirmation', async () => {
    renderPage({ signUp: vi.fn(async () => ({ error: null, needsConfirmation: true })) })
    signUp()
    await waitFor(() => expect(screen.getByText('Check your inbox')).toBeInTheDocument())
    expect(screen.getByText(/new@openfray\.app/)).toBeInTheDocument()
    // Back to sign in returns to the form.
    fireEvent.click(screen.getByRole('button', { name: 'Back to sign in' }))
    expect(screen.queryByText('Check your inbox')).toBeNull()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
  })

  it('stays silent on an immediate-session sign-up (parent closes the page)', async () => {
    const value = renderPage({ signUp: vi.fn(async () => ({ error: null })) })
    signUp()
    await waitFor(() => expect(value.signUp).toHaveBeenCalled())
    expect(screen.queryByText('Check your inbox')).toBeNull()
  })

  it('surfaces a sign-up error', async () => {
    renderPage({ signUp: vi.fn(async () => ({ error: 'Password too weak' })) })
    signUp()
    await waitFor(() => expect(screen.getByText('Password too weak')).toBeInTheDocument())
    expect(screen.queryByText('Check your inbox')).toBeNull()
  })
})
