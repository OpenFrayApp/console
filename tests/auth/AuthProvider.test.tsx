// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone
// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { loadSettings, saveSettings, type TutorialSuppression } from '../../src/state/settings.ts'
import { TutorialEntry } from '../../src/tutorial/TutorialEntry.tsx'
import { useTutorialEntry } from '../../src/tutorial/useTutorialEntry.ts'
import { useTutorialAccountPreference } from '../../src/auth/useTutorialAccountPreference.ts'
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
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  localStorage.clear()
  sessionStorage.clear()
})

type AuthListener = (event: string, session: Session | null) => void
type AuthResponse = { error: { message: string } | null }

/** A fake session wrapping just the user fields the provider reads. */
function session(email: string, metadata: Record<string, unknown> = {}): Session {
  return {
    access_token: `token:${email}`,
    user: { id: email, email, user_metadata: metadata } as unknown as User,
  } as Session
}

/** Build a Supabase stub covering the auth calls and the delete-account RPC. */
function makeAuthClient(initial: Session | null, initialError: AuthResponse['error'] = null) {
  const listeners: AuthListener[] = []
  const unsubscribe = vi.fn()
  const auth = {
    getSession: vi.fn(async () => ({ data: { session: initial }, error: initialError })),
    onAuthStateChange: vi.fn((listener: AuthListener) => {
      listeners.push(listener)
      return { data: { subscription: { unsubscribe } } }
    }),
    signOut: vi.fn(async (): Promise<AuthResponse> => ({ error: null })),
    signInWithOAuth: vi.fn(async (): Promise<AuthResponse> => ({ error: null })),
    updateUser: vi.fn(async (patch: { data: Record<string, unknown> }) => ({
      data: {
        user: {
          id: 'gm@openfray.app',
          email: 'gm@openfray.app',
          user_metadata: patch.data,
        } as unknown as User,
      },
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

/** Compose the real entry controls with device settings and account synchronization. */
function TutorialPreferenceConsole() {
  const auth = useAuth()
  const [deviceSuppression, setDeviceSuppression] = useState(
    () => loadSettings().tutorialSuppression,
  )
  const preference = useTutorialAccountPreference(deviceSuppression)
  /** Apply the same local-first device setter the App composition supplies. */
  const suppress = (reason: TutorialSuppression) => {
    setDeviceSuppression(reason)
    saveSettings({ tutorialSuppression: reason })
  }
  const tutorial = useTutorialEntry({
    ready: !auth.loading && !auth.identityExpired,
    invitationAvailable: true,
    boardEmpty: true,
    inCombat: false,
    enabledLibraries: ['srd-5.2'],
    effectiveSuppression: preference.effectiveSuppression,
    onSuppress: suppress,
  })
  return (
    <>
      <Probe />
      <output aria-label="Invitation preference">
        {preference.effectiveSuppression ?? 'none'}
      </output>
      {preference.accountSyncError && <p role="alert">{preference.accountSyncError}</p>}
      <button onClick={tutorial.launch}>Restart tutorial</button>
      <TutorialEntry controller={tutorial} />
    </>
  )
}

/** Render the account preference through the real introductory guide controls. */
function renderTutorialPreference() {
  return render(
    <AuthProvider>
      <TutorialPreferenceConsole />
    </AuthProvider>,
  )
}

describe('Tutorial account preference through rendered entry', () => {
  it('applies permanent dismissal immediately even when browser storage and account writes fail', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://project.supabase.co')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'public-key')
    let finish!: (response: Response) => void
    const fetch = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          finish = resolve
        }),
    )
    vi.stubGlobal('fetch', fetch)
    supa.client = makeAuthClient(session('gm@openfray.app')).client
    renderTutorialPreference()
    await screen.findByRole('dialog', { name: 'Learn the console' })
    const storage = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked storage')
    })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Never show this again' }))
    fireEvent.click(screen.getByRole('button', { name: 'Not now' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Invitation preference')).toHaveTextContent('dismissed')
    expect(latest.tutorialSuppression).toBeNull()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Restart tutorial' }))
    expect(screen.getByRole('dialog', { name: 'Tutorial introduction' })).toBeInTheDocument()
    await act(async () => {
      finish(new Response('{}', { status: 503 }))
    })
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'couldn’t be saved to your account. It still applies on this device.',
    )
    expect(latest.tutorialSuppression).toBeNull()
    expect(screen.getByLabelText('Invitation preference')).toHaveTextContent('dismissed')
    expect(fetch).toHaveBeenCalledTimes(1)
    storage.mockRestore()
  })

  it('never transfers a temporary Not now dismissal after sign-in', async () => {
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)
    const stub = makeAuthClient(null)
    supa.client = stub.client
    renderTutorialPreference()
    await screen.findByRole('dialog', { name: 'Learn the console' })
    fireEvent.click(screen.getByRole('button', { name: 'Not now' }))
    stub.emit(session('gm@openfray.app'), 'SIGNED_IN')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(loadSettings().tutorialSuppression).toBeNull()
    expect(latest.tutorialSuppression).toBeNull()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('does not overwrite existing account completion with device dismissal', async () => {
    saveSettings({ tutorialSuppression: 'dismissed' })
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)
    supa.client = makeAuthClient(
      session('gm@openfray.app', { tutorial_suppression: 'completed' }),
    ).client
    renderTutorialPreference()
    await screen.findByText('gm@openfray.app')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(latest.tutorialSuppression).toBe('completed')
    expect(loadSettings().tutorialSuppression).toBe('dismissed')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('waits for delayed auth before transferring and showing any automatic invitation', async () => {
    saveSettings({ tutorialSuppression: 'completed' })
    vi.stubEnv('VITE_SUPABASE_URL', 'https://project.supabase.co')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'public-key')
    const fetch = vi.fn(async () => {
      throw new Error('offline')
    })
    vi.stubGlobal('fetch', fetch)
    const stub = makeAuthClient(null)
    let finish!: (value: Awaited<ReturnType<typeof stub.auth.getSession>>) => void
    stub.auth.getSession.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve
        }),
    )
    supa.client = stub.client
    renderTutorialPreference()
    expect(screen.getByText('loading')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(fetch).not.toHaveBeenCalled()
    await act(async () => {
      finish({ data: { session: session('gm@openfray.app') }, error: null })
    })
    expect(await screen.findByRole('alert')).toHaveTextContent('couldn’t be saved')
    expect(screen.getByLabelText('Invitation preference')).toHaveTextContent('completed')
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('keeps anonymous controls usable without configured auth', async () => {
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)
    renderTutorialPreference()
    fireEvent.click(screen.getByRole('checkbox', { name: 'Never show this again' }))
    fireEvent.click(screen.getByRole('button', { name: 'Not now' }))
    expect(screen.getByLabelText('Invitation preference')).toHaveTextContent('dismissed')
    expect(loadSettings().tutorialSuppression).toBe('dismissed')
    fireEvent.click(screen.getByRole('button', { name: 'Restart tutorial' }))
    expect(screen.getByRole('dialog', { name: 'Tutorial introduction' })).toBeInTheDocument()
    expect(fetch).not.toHaveBeenCalled()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('does not install a prior account preference or report its failed write on the new account', async () => {
    saveSettings({ tutorialSuppression: 'dismissed' })
    vi.stubEnv('VITE_SUPABASE_URL', 'https://project.supabase.co')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'public-key')
    let finish!: (response: Response) => void
    vi.stubGlobal(
      'fetch',
      vi.fn(
        () =>
          new Promise<Response>((resolve) => {
            finish = resolve
          }),
      ),
    )
    const stub = makeAuthClient(session('a@openfray.app'))
    supa.client = stub.client
    renderTutorialPreference()
    await screen.findByText('a@openfray.app')
    stub.emit(session('b@openfray.app', { tutorial_suppression: 'completed' }), 'SIGNED_IN')
    await act(async () => {
      finish(new Response('{}', { status: 500 }))
    })
    expect(screen.getByText('b@openfray.app')).toBeInTheDocument()
    expect(latest.tutorialSuppression).toBe('completed')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it.each(['dismissed', 'completed'] as const)(
    'transfers anonymous device suppression after sign-in without waiting (%s)',
    async (reason) => {
      saveSettings({ tutorialSuppression: reason })
      vi.stubEnv('VITE_SUPABASE_URL', 'https://project.supabase.co')
      vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'public-key')
      let finish!: (response: Response) => void
      const fetch = vi.fn(
        () =>
          new Promise<Response>((resolve) => {
            finish = resolve
          }),
      )
      vi.stubGlobal('fetch', fetch)
      const stub = makeAuthClient(null)
      supa.client = stub.client
      renderTutorialPreference()
      await screen.findByText('anonymous')
      expect(fetch).not.toHaveBeenCalled()
      stub.emit(session('gm@openfray.app'), 'SIGNED_IN')
      expect(screen.queryByRole('dialog', { name: 'Learn the console' })).not.toBeInTheDocument()
      expect(screen.getByLabelText('Invitation preference')).toHaveTextContent(reason)
      await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))
      expect(latest.tutorialSuppression).toBeNull()
      fireEvent.click(screen.getByRole('button', { name: 'Restart tutorial' }))
      expect(screen.getByRole('dialog', { name: 'Tutorial introduction' })).toBeInTheDocument()
      await act(async () => {
        finish(
          new Response(
            JSON.stringify({
              id: 'gm@openfray.app',
              user_metadata: { tutorial_suppression: reason },
            }),
          ),
        )
      })
      await waitFor(() => expect(latest.tutorialSuppression).toBe(reason))
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      expect(fetch).toHaveBeenCalledTimes(1)
    },
  )

  it.each(['dismissed', 'completed'] as const)(
    'suppresses invitations from the account on a fresh device (%s)',
    async (reason) => {
      const fetch = vi.fn()
      vi.stubGlobal('fetch', fetch)
      supa.client = makeAuthClient(
        session('gm@openfray.app', { tutorial_suppression: reason }),
      ).client
      renderTutorialPreference()
      await screen.findByText('gm@openfray.app')
      expect(screen.queryByRole('dialog', { name: 'Learn the console' })).not.toBeInTheDocument()
      expect(screen.getByLabelText('Invitation preference')).toHaveTextContent(reason)
      expect(fetch).not.toHaveBeenCalled()
      fireEvent.click(screen.getByRole('button', { name: 'Restart tutorial' }))
      expect(screen.getByRole('dialog', { name: 'Tutorial introduction' })).toBeInTheDocument()
      expect(latest.tutorialSuppression).toBe(reason)
      expect(loadSettings().tutorialSuppression).toBeNull()
    },
  )
})

describe('AuthProvider — tutorial account preference', () => {
  it('writes only suppression with the captured account token and preserves other metadata', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://project.supabase.co')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'public-key')
    const fetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            id: 'gm@openfray.app',
            user_metadata: { tutorial_suppression: 'completed', display_name: 'Old response' },
          }),
        ),
    )
    vi.stubGlobal('fetch', fetch)
    supa.client = makeAuthClient(
      session('gm@openfray.app', { display_name: 'Current name', share_license: 'cc-by-4.0' }),
    ).client
    renderProvider()
    await screen.findByText('gm@openfray.app')

    await act(async () => {
      expect(await latest.setTutorialSuppression('completed')).toEqual({ error: null })
    })

    expect(fetch).toHaveBeenCalledWith(
      'https://project.supabase.co/auth/v1/user',
      expect.objectContaining({
        method: 'PUT',
        headers: {
          apikey: 'public-key',
          Authorization: 'Bearer token:gm@openfray.app',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: { tutorial_suppression: 'completed' } }),
        signal: expect.any(AbortSignal),
      }),
    )
    expect(latest.tutorialSuppression).toBe('completed')
    expect(latest.displayName).toBe('Current name')
    expect(latest.shareLicense).toBe('cc-by-4.0')
  })

  it('preserves a profile change made while suppression is being saved', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://project.supabase.co')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'public-key')
    let finish!: (response: Response) => void
    vi.stubGlobal(
      'fetch',
      vi.fn(
        () =>
          new Promise<Response>((resolve) => {
            finish = resolve
          }),
      ),
    )
    supa.client = makeAuthClient(session('gm@openfray.app', { display_name: 'Before' })).client
    renderProvider()
    await screen.findByText('gm@openfray.app')
    const write = latest.setTutorialSuppression('dismissed')
    await act(async () => {
      await latest.setDisplayName('Changed during write')
    })
    await act(async () => {
      finish(
        new Response(
          JSON.stringify({
            id: 'gm@openfray.app',
            user_metadata: { tutorial_suppression: 'dismissed' },
          }),
        ),
      )
      await write
    })
    expect(latest.displayName).toBe('Changed during write')
    expect(latest.tutorialSuppression).toBe('dismissed')
  })

  it.each(['different account', 'signed out', 'same account signed in again'] as const)(
    'fences both pending responses and old setters after %s',
    async (change) => {
      vi.stubEnv('VITE_SUPABASE_URL', 'https://project.supabase.co')
      vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'public-key')
      let finish!: (response: Response) => void
      const fetch = vi.fn<typeof globalThis.fetch>(
        () =>
          new Promise<Response>((resolve) => {
            finish = resolve
          }),
      )
      vi.stubGlobal('fetch', fetch)
      const stub = makeAuthClient(session('a@openfray.app'))
      supa.client = stub.client
      renderProvider()
      await screen.findByText('a@openfray.app')
      const oldSetter = latest.setTutorialSuppression
      const write = oldSetter('completed')
      const signal = fetch.mock.calls[0]?.[1]?.signal as AbortSignal
      if (change === 'different account') stub.emit(session('b@openfray.app'), 'SIGNED_IN')
      else {
        stub.emit(null, 'SIGNED_OUT')
        if (change === 'same account signed in again')
          stub.emit(session('a@openfray.app'), 'SIGNED_IN')
      }
      expect(signal.aborted).toBe(true)
      await act(async () => {
        finish(
          new Response(
            JSON.stringify({
              id: 'a@openfray.app',
              user_metadata: { tutorial_suppression: 'completed' },
            }),
          ),
        )
        expect((await write).error).not.toBeNull()
        expect((await oldSetter('dismissed')).error).not.toBeNull()
      })
      expect(fetch).toHaveBeenCalledTimes(1)
      expect(latest.user?.email ?? 'anonymous').toBe(
        change === 'different account'
          ? 'b@openfray.app'
          : change === 'signed out'
            ? 'anonymous'
            : 'a@openfray.app',
      )
      expect(latest.tutorialSuppression).toBeNull()
    },
  )

  it.each(['sign-out request', 'unmount'] as const)(
    'aborts pending persistence on %s without accepting a late success',
    async (end) => {
      vi.stubEnv('VITE_SUPABASE_URL', 'https://project.supabase.co')
      vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'public-key')
      let finish!: (response: Response) => void
      const fetch = vi.fn<typeof globalThis.fetch>(
        () =>
          new Promise<Response>((resolve) => {
            finish = resolve
          }),
      )
      vi.stubGlobal('fetch', fetch)
      supa.client = makeAuthClient(session('gm@openfray.app')).client
      const view = renderProvider()
      await screen.findByText('gm@openfray.app')
      const write = latest.setTutorialSuppression('completed')
      if (end === 'unmount') view.unmount()
      else await latest.signOut()
      expect(fetch.mock.calls[0]?.[1]?.signal?.aborted).toBe(true)
      await act(async () => {
        finish(
          new Response(
            JSON.stringify({
              id: 'gm@openfray.app',
              user_metadata: { tutorial_suppression: 'completed' },
            }),
          ),
        )
        expect((await write).error).not.toBeNull()
      })
      expect(latest.tutorialSuppression).toBeNull()
    },
  )

  it.each([
    [401, {}],
    [500, {}],
    [200, null],
    [200, { id: 'someone-else', user_metadata: { tutorial_suppression: 'dismissed' } }],
    [200, { id: 'gm@openfray.app', user_metadata: { tutorial_suppression: true } }],
  ])(
    'does not report persistence for rejected or malformed responses (%s, %j)',
    async (status, body) => {
      vi.stubEnv('VITE_SUPABASE_URL', 'https://project.supabase.co')
      vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'public-key')
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => new Response(JSON.stringify(body), { status })),
      )
      supa.client = makeAuthClient(session('gm@openfray.app')).client
      renderProvider()
      await screen.findByText('gm@openfray.app')
      await act(async () => {
        expect((await latest.setTutorialSuppression('dismissed')).error).not.toBeNull()
      })
      expect(latest.tutorialSuppression).toBeNull()
    },
  )

  it('retains confirmed suppression through a natural refresh with stale metadata', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://project.supabase.co')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'public-key')
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              id: 'gm@openfray.app',
              user_metadata: { tutorial_suppression: 'completed' },
            }),
          ),
      ),
    )
    const stub = makeAuthClient(session('gm@openfray.app'))
    supa.client = stub.client
    renderProvider()
    await screen.findByText('gm@openfray.app')
    await act(async () => {
      await latest.setTutorialSuppression('completed')
    })
    stub.emit(session('gm@openfray.app', { display_name: 'Fresh profile' }))
    expect(latest.tutorialSuppression).toBe('completed')
    expect(latest.displayName).toBe('Fresh profile')
    stub.emit(session('b@openfray.app'), 'SIGNED_IN')
    expect(latest.tutorialSuppression).toBeNull()
    expect(latest.displayName).toBeNull()
  })

  it('keeps an existing account preference without writing a replacement', async () => {
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)
    supa.client = makeAuthClient(
      session('gm@openfray.app', { tutorial_suppression: 'completed' }),
    ).client
    renderProvider()
    await screen.findByText('gm@openfray.app')
    await expect(latest.setTutorialSuppression('dismissed')).resolves.toEqual({ error: null })
    expect(latest.tutorialSuppression).toBe('completed')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('waits for the initial lookup error even when the SDK emits INITIAL_SESSION first', async () => {
    const stub = makeAuthClient(null)
    let finish!: (value: Awaited<ReturnType<typeof stub.auth.getSession>>) => void
    stub.auth.getSession.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve
        }),
    )
    supa.client = stub.client
    renderProvider()
    stub.emit(null, 'INITIAL_SESSION')
    expect(latest.loading).toBe(true)
    await act(async () => {
      finish({ data: { session: null }, error: { message: 'session unavailable' } })
    })
    expect(latest.identityExpired).toBe(true)
    expect(latest.loading).toBe(false)
  })

  it('does not replace a newer identity with a delayed initial session lookup', async () => {
    const stub = makeAuthClient(null)
    let finish!: (value: Awaited<ReturnType<typeof stub.auth.getSession>>) => void
    stub.auth.getSession.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve
        }),
    )
    supa.client = stub.client
    renderProvider()
    stub.emit(session('b@openfray.app'), 'SIGNED_IN')
    expect(screen.getByText('b@openfray.app')).toBeInTheDocument()
    expect(latest.loading).toBe(false)
    await act(async () => {
      finish({ data: { session: session('a@openfray.app') }, error: null })
    })
    expect(latest.user?.email).toBe('b@openfray.app')
  })

  it('accepts completion and permanent dismissal but ignores malformed metadata', async () => {
    for (const [value, expected] of [
      ['dismissed', 'dismissed'],
      ['completed', 'completed'],
      [null, null],
      ['temporary', null],
      [true, null],
      [{ reason: 'completed' }, null],
    ]) {
      supa.client = makeAuthClient(
        session('gm@openfray.app', { tutorial_suppression: value }),
      ).client
      renderProvider()
      await screen.findByText('gm@openfray.app')
      expect(latest.tutorialSuppression).toBe(expected)
      cleanup()
    }
  })
})

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

  it('distinguishes an unavailable session from an explicit anonymous startup', async () => {
    supa.client = makeAuthClient(null, { message: 'Network unavailable' }).client
    renderProvider()
    await screen.findByText('anonymous')
    expect(latest.identityExpired).toBe(true)
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
