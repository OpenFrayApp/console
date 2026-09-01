// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone
// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render, screen } from '@testing-library/react'
import type { Session, User } from '@supabase/supabase-js'
import { AuthProvider } from '../../src/auth/AuthProvider.tsx'
import { useAuth, type AuthState } from '../../src/auth/useAuth.ts'

const supa = vi.hoisted(() => ({ client: null as unknown }))

vi.mock('../../src/lib/supabase.ts', () => ({
  get supabase() {
    return supa.client
  },
  get isSupabaseConfigured() {
    return supa.client !== null
  },
}))

afterEach(() => {
  cleanup()
  supa.client = null
})

type AuthListener = (event: string, session: Session | null) => void
type AuthResponse = { error: { message: string } | null }

/** A fake session wrapping just the user fields the provider reads. */
function session(email: string, metadata: Record<string, unknown> = {}): Session {
  return { user: { email, user_metadata: metadata } as unknown as User } as Session
}

/** Build a Supabase stub covering the auth calls and the delete-account RPC. */
function makeAuthClient(initial: Session | null) {
  const listeners: AuthListener[] = []
  const unsubscribe = vi.fn()
  const auth = {
    getSession: vi.fn(async () => ({ data: { session: initial } })),
    onAuthStateChange: vi.fn((listener: AuthListener) => {
      listeners.push(listener)
      return { data: { subscription: { unsubscribe } } }
    }),
    signOut: vi.fn(async (): Promise<AuthResponse> => ({ error: null })),
    signInWithOAuth: vi.fn(async (): Promise<AuthResponse> => ({ error: null })),
    updateUser: vi.fn(async (patch: { data: Record<string, unknown> }) => ({
      data: { user: { email: 'gm@openfray.app', user_metadata: patch.data } as unknown as User },
      error: null,
    })),
  }
  const rpc = vi.fn(async (): Promise<AuthResponse> => ({ error: null }))
  /** Fire every registered auth listener with the next session, inside act. */
  const emit = (next: Session | null, event = 'TOKEN_REFRESHED') =>
    act(() => listeners.forEach((listener) => listener(event, next)))
  return { client: { auth, rpc }, auth, rpc, unsubscribe, emit }
}

let latest!: AuthState

/** Exposes the context value to the test and renders who is signed in. */
function Probe() {
  latest = useAuth()
  return <output>{latest.loading ? 'loading' : (latest.user?.email ?? 'anonymous')}</output>
}

/** Render the provider around the probe and return RTL's handle. */
function renderProvider() {
  return render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  )
}

describe('AuthProvider — the name encounters publish under', () => {
  // Three providers disagree about where they put it, and reading only one key left the
  // byline field empty for accounts whose name sits under another.
  it('reads the name from whichever key the provider wrote', async () => {
    for (const [metadata, expected] of [
      [{ display_name: 'Chosen' }, 'Chosen'],
      [{ full_name: 'From Google' }, 'From Google'],
      [{ name: 'From Discord' }, 'From Discord'],
      [{ display_name: 'Chosen', full_name: 'From Google' }, 'Chosen'],
      [{}, null],
      [{ display_name: '' }, null],
    ] as const) {
      supa.client = makeAuthClient(session('gm@openfray.app', metadata)).client
      renderProvider()
      await screen.findByText('gm@openfray.app')
      expect(latest.displayName, JSON.stringify(metadata)).toBe(expected)
      cleanup()
    }
  })

  it('writes a chosen name onto the user row, and clears it back to null', async () => {
    const stub = makeAuthClient(session('gm@openfray.app', { full_name: 'From Google' }))
    supa.client = stub.client
    renderProvider()
    await screen.findByText('gm@openfray.app')

    await act(async () => {
      await latest.setDisplayName('  Nico Verdi  ')
    })
    expect(stub.auth.updateUser).toHaveBeenCalledWith({ data: { display_name: 'Nico Verdi' } })
    expect(latest.displayName).toBe('Nico Verdi')

    await act(async () => {
      await latest.setDisplayName('   ')
    })
    expect(stub.auth.updateUser).toHaveBeenLastCalledWith({ data: { display_name: null } })
    expect(latest.displayName).toBeNull()
  })
})

describe('AuthProvider without Supabase configured', () => {
  it('resolves immediately to the anonymous state', async () => {
    renderProvider()
    expect(screen.getByText('anonymous')).toBeInTheDocument()
    expect(latest.loading).toBe(false)
    expect(latest.configured).toBe(false)
    await expect(latest.signInWithProvider('google')).resolves.toEqual({
      error: 'Signing in isn’t available on this copy of OpenFray.',
    })
    await expect(latest.deleteAccount()).resolves.toEqual({
      error: 'Accounts aren’t available on this copy of OpenFray.',
    })
    await expect(latest.signOut()).resolves.toBeUndefined()
  })
})

describe('AuthProvider with Supabase configured', () => {
  it('exposes the initial session once the lookup resolves', async () => {
    const stub = makeAuthClient(session('gm@openfray.app'))
    supa.client = stub.client
    renderProvider()
    expect(screen.getByText('loading')).toBeInTheDocument()
    expect(await screen.findByText('gm@openfray.app')).toBeInTheDocument()
    expect(latest.loading).toBe(false)
    expect(latest.configured).toBe(true)
    expect(stub.auth.getSession).toHaveBeenCalledTimes(1)
  })

  it('settles to anonymous when there is no stored session', async () => {
    supa.client = makeAuthClient(null).client
    renderProvider()
    expect(await screen.findByText('anonymous')).toBeInTheDocument()
    expect(latest.user).toBeNull()
    expect(latest.loading).toBe(false)
  })

  it('marks an unexpected session loss as expired so the board can stay recovered', async () => {
    const stub = makeAuthClient(session('gm@openfray.app'))
    supa.client = stub.client
    renderProvider()
    await screen.findByText('gm@openfray.app')

    stub.emit(null, 'SIGNED_OUT')

    expect(latest.user).toBeNull()
    expect(latest.identityExpired).toBe(true)
  })

  it('follows auth state changes, in and out', async () => {
    const stub = makeAuthClient(null)
    supa.client = stub.client
    renderProvider()
    await screen.findByText('anonymous')
    stub.emit(session('gm@openfray.app'))
    expect(screen.getByText('gm@openfray.app')).toBeInTheDocument()
    stub.emit(null)
    expect(screen.getByText('anonymous')).toBeInTheDocument()
  })

  it('unsubscribes from auth changes on unmount', async () => {
    const stub = makeAuthClient(null)
    supa.client = stub.client
    const view = renderProvider()
    await screen.findByText('anonymous')
    expect(stub.unsubscribe).not.toHaveBeenCalled()
    view.unmount()
    expect(stub.unsubscribe).toHaveBeenCalledTimes(1)
  })

  it('revokes live views before handing sign-out through to Supabase', async () => {
    const stub = makeAuthClient(session('gm@openfray.app'))
    supa.client = stub.client
    renderProvider()
    await screen.findByText('gm@openfray.app')
    await latest.signOut()
    expect(stub.rpc).toHaveBeenCalledWith('stop_all_live_views')
    expect(stub.rpc.mock.invocationCallOrder[0]).toBeLessThan(
      stub.auth.signOut.mock.invocationCallOrder[0],
    )
  })

  it('keeps the authenticated session when live-view revocation fails', async () => {
    const stub = makeAuthClient(session('gm@openfray.app'))
    stub.rpc.mockResolvedValueOnce({ error: { message: 'unavailable' } })
    supa.client = stub.client
    renderProvider()
    await screen.findByText('gm@openfray.app')

    await latest.signOut()

    expect(stub.auth.signOut).not.toHaveBeenCalled()
  })

  it('starts the OAuth redirect back to the app’s own path', async () => {
    const stub = makeAuthClient(null)
    supa.client = stub.client
    renderProvider()
    await screen.findByText('anonymous')
    await expect(latest.signInWithProvider('discord')).resolves.toEqual({ error: null })
    expect(stub.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'discord',
      options: { redirectTo: window.location.origin + import.meta.env.BASE_URL },
    })
  })

  it('surfaces the provider handoff error message', async () => {
    const stub = makeAuthClient(null)
    stub.auth.signInWithOAuth.mockResolvedValueOnce({ error: { message: 'Provider disabled' } })
    supa.client = stub.client
    renderProvider()
    await screen.findByText('anonymous')
    await expect(latest.signInWithProvider('google')).resolves.toEqual({
      error: 'Provider disabled',
    })
  })

  it('deletes the account via the erasure RPC, then signs out', async () => {
    const stub = makeAuthClient(session('gm@openfray.app'))
    supa.client = stub.client
    renderProvider()
    await screen.findByText('gm@openfray.app')
    await expect(latest.deleteAccount()).resolves.toEqual({ error: null })
    expect(stub.rpc).toHaveBeenCalledWith('delete_account')
    expect(stub.auth.signOut).toHaveBeenCalledTimes(1)
  })

  it('keeps the session when the erasure RPC fails', async () => {
    const stub = makeAuthClient(session('gm@openfray.app'))
    stub.rpc.mockResolvedValueOnce({ error: { message: 'denied' } })
    supa.client = stub.client
    renderProvider()
    await screen.findByText('gm@openfray.app')
    await expect(latest.deleteAccount()).resolves.toEqual({ error: 'denied' })
    expect(stub.auth.signOut).not.toHaveBeenCalled()
  })
})
