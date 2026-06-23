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
    signInWithProvider: vi.fn(async () => ({ error: null })),
    signOut: vi.fn(async () => {}),
    deleteAccount: vi.fn(async () => ({ error: null })),
    ...overrides,
  }
  render(
    <AuthContext.Provider value={value}>
      <SignUpPage onClose={vi.fn()} />
    </AuthContext.Provider>,
  )
  return value
}

describe('SignUpPage', () => {
  // Each provider in its own render: the first click disables both buttons (a
  // real handoff redirects away), so they can't be exercised in one mount.
  it('starts a Discord OAuth sign-in', async () => {
    const value = renderPage()
    fireEvent.click(screen.getByRole('button', { name: /Continue with Discord/ }))
    await waitFor(() => expect(value.signInWithProvider).toHaveBeenCalledWith('discord'))
  })

  it('starts a Google OAuth sign-in', async () => {
    const value = renderPage()
    fireEvent.click(screen.getByRole('button', { name: /Continue with Google/ }))
    await waitFor(() => expect(value.signInWithProvider).toHaveBeenCalledWith('google'))
  })

  it('surfaces a provider handoff error', async () => {
    renderPage({ signInWithProvider: vi.fn(async () => ({ error: 'Provider is not enabled' })) })
    fireEvent.click(screen.getByRole('button', { name: /Continue with Google/ }))
    await waitFor(() => expect(screen.getByText('Provider is not enabled')).toBeInTheDocument())
  })
})
