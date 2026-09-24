// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone
// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { AuthContext, type AuthState } from '../../../src/auth/useAuth.ts'
import { SignUpPage } from '../../../src/components/account/SignUpPage.tsx'

afterEach(() => {
  cleanup()
  delete window.fathom
})

/** Render the sign-in screen with isolated authentication actions. */
function renderPage(overrides: Partial<AuthState> = {}) {
  const value: AuthState = {
    user: null,
    displayName: null,
    shareLicense: null,
    loading: false,
    identityExpired: false,
    configured: true,
    signInWithProvider: vi.fn(async () => ({ error: null })),
    signOut: vi.fn(async () => {}),
    deleteAccount: vi.fn(async () => ({ error: null })),
    setDisplayName: vi.fn(async () => ({ error: null })),
    setShareLicense: vi.fn(async () => ({ error: null })),
    ...overrides,
  }
  const onClose = vi.fn()
  render(
    <AuthContext.Provider value={value}>
      <SignUpPage onClose={onClose} />
    </AuthContext.Provider>,
  )
  return { ...value, onClose }
}

describe('SignUpPage', () => {
  it.each(['Google', 'Discord'] as const)(
    'starts %s immediately without a checkbox',
    async (provider) => {
      const trackEvent = vi.fn()
      window.fathom = { trackEvent }
      const value = renderPage()
      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: `Continue with ${provider}` }))
      await waitFor(() =>
        expect(value.signInWithProvider).toHaveBeenCalledWith(provider.toLowerCase()),
      )
      expect(trackEvent).toHaveBeenCalledExactlyOnceWith(`Sign-in started: ${provider}`)
      expect(screen.getByRole('button', { name: 'Redirecting…' })).toBeDisabled()
      expect(screen.getByRole('button', { name: /Continue with/ })).toBeDisabled()
      fireEvent.click(screen.getByRole('button', { name: /Continue with/ }))
      expect(value.signInWithProvider).toHaveBeenCalledTimes(1)
    },
  )

  it('shows the agreement notice for both provider buttons and links both documents', () => {
    renderPage()
    for (const provider of ['Google', 'Discord']) {
      expect(
        screen.getByRole('button', { name: `Continue with ${provider}` }),
      ).toHaveAccessibleDescription(
        /^By continuing with Google or Discord, you agree to the Terms of Service\s*\. Our Privacy Policy explains how we handle your personal data\.$/,
      )
    }
    for (const [name, href] of [
      ['Terms of Service', '/terms/'],
      ['Privacy Policy', '/privacy/'],
    ]) {
      const link = screen.getByRole('link', { name })
      expect(link).toHaveAttribute('href', href)
      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveAttribute('rel', 'noreferrer')
    }
    expect(screen.getByText(/13 or older/)).toBeInTheDocument()
    const firstTime = screen.getByText(/Continuing creates a free account/)
    expect(firstTime).toBeInTheDocument()
    for (const provider of ['Google', 'Discord']) {
      const button = screen.getByRole('button', { name: `Continue with ${provider}` })
      expect(
        button.compareDocumentPosition(firstTime) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy()
    }
  })

  it('announces a failed handoff and allows retrying with the other provider', async () => {
    const signInWithProvider = vi
      .fn()
      .mockResolvedValueOnce({ error: 'Provider is not enabled' })
      .mockResolvedValueOnce({ error: null })
    renderPage({ signInWithProvider })
    fireEvent.click(screen.getByRole('button', { name: 'Continue with Google' }))
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Provider is not enabled'),
    )
    expect(screen.getByRole('button', { name: 'Continue with Google' })).toBeEnabled()
    fireEvent.click(screen.getByRole('button', { name: 'Continue with Discord' }))
    await waitFor(() => expect(signInWithProvider).toHaveBeenLastCalledWith('discord'))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('returns to the console without starting authentication', () => {
    const value = renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Back to the console' }))
    expect(value.onClose).toHaveBeenCalledOnce()
    expect(value.signInWithProvider).not.toHaveBeenCalled()
  })
})
