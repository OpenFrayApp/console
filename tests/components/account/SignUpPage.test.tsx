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

/** Capture the Fathom events a click emits; track() no-ops without this. */
function stubFathom() {
  const trackEvent = vi.fn()
  window.fathom = { trackEvent }
  return trackEvent
}

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
  render(
    <AuthContext.Provider value={value}>
      <SignUpPage onClose={vi.fn()} />
    </AuthContext.Provider>,
  )
  return value
}

/** Tick the box, which every sign-in now has to pass through. */
function acceptTerms() {
  fireEvent.click(screen.getByLabelText(/I agree to the/))
}

describe('SignUpPage', () => {
  // Each provider in its own render: the first click disables both buttons (a
  // real handoff redirects away), so they can't be exercised in one mount.
  it('starts a Discord OAuth sign-in and records it as Discord', async () => {
    const trackEvent = stubFathom()
    const value = renderPage()
    acceptTerms()
    fireEvent.click(screen.getByRole('button', { name: /Continue with Discord/ }))
    await waitFor(() => expect(value.signInWithProvider).toHaveBeenCalledWith('discord'))
    expect(trackEvent).toHaveBeenCalledWith('Sign-in started: Discord')
  })

  it('starts a Google OAuth sign-in and records it as Google', async () => {
    const trackEvent = stubFathom()
    const value = renderPage()
    acceptTerms()
    fireEvent.click(screen.getByRole('button', { name: /Continue with Google/ }))
    await waitFor(() => expect(value.signInWithProvider).toHaveBeenCalledWith('google'))
    expect(trackEvent).toHaveBeenCalledWith('Sign-in started: Google')
  })

  it('records one event per sign-in, so the two names add up to the total', async () => {
    const trackEvent = stubFathom()
    renderPage()
    acceptTerms()
    fireEvent.click(screen.getByRole('button', { name: /Continue with Google/ }))
    await waitFor(() => expect(trackEvent).toHaveBeenCalledTimes(1))
  })

  it('surfaces a provider handoff error', async () => {
    renderPage({ signInWithProvider: vi.fn(async () => ({ error: 'Provider is not enabled' })) })
    acceptTerms()
    fireEvent.click(screen.getByRole('button', { name: /Continue with Google/ }))
    await waitFor(() => expect(screen.getByText('Provider is not enabled')).toBeInTheDocument())
  })

  describe('accepting the terms', () => {
    // Creating an account is what accepts them, and this page is the last moment to ask:
    // the next screen belongs to the provider.
    it('does not hand anyone to a provider until the box is ticked', async () => {
      const trackEvent = stubFathom()
      const value = renderPage()
      fireEvent.click(screen.getByRole('button', { name: /Continue with Google/ }))
      await waitFor(() => expect(screen.getByText(/Accept the terms first/)).toBeInTheDocument())
      expect(value.signInWithProvider).not.toHaveBeenCalled()
      // Not counted either: a refused click is not a sign-in that was started.
      expect(trackEvent).not.toHaveBeenCalled()
    })

    it('puts the cursor on the box it is asking about', () => {
      renderPage()
      fireEvent.click(screen.getByRole('button', { name: /Continue with Discord/ }))
      expect(document.activeElement).toBe(screen.getByLabelText(/I agree to the/))
    })

    it('goes through once it is ticked, and drops the refusal', async () => {
      const value = renderPage()
      fireEvent.click(screen.getByRole('button', { name: /Continue with Google/ }))
      await waitFor(() => expect(screen.getByText(/Accept the terms first/)).toBeInTheDocument())

      acceptTerms()
      expect(screen.queryByText(/Accept the terms first/)).toBeNull()
      fireEvent.click(screen.getByRole('button', { name: /Continue with Google/ }))
      await waitFor(() => expect(value.signInWithProvider).toHaveBeenCalledWith('google'))
    })

    it('starts unticked on every visit, so nothing is accepted on somebody`s behalf', () => {
      renderPage()
      expect(screen.getByLabelText(/I agree to the/)).not.toBeChecked()
    })

    it('links both documents, and says the age', () => {
      renderPage()
      const terms = screen.getByRole('link', { name: 'Terms of Service' })
      expect(terms).toHaveAttribute('href', '/terms')
      expect(terms).toHaveAttribute('target', '_blank')
      expect(screen.getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute(
        'href',
        '/privacy',
      )
      expect(screen.getByText(/13 or older/)).toBeInTheDocument()
    })
  })
})
