// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone
// @vitest-environment jsdom

import { afterEach, expect, it, vi } from 'vitest'
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  createConsoleClient,
  observeConsoleSession,
  signOutConsoleSession,
} from '../../src/auth/sessionTermination.ts'
import { AuthProvider } from '../../src/auth/AuthProvider.tsx'
import { useAuth, type AuthState } from '../../src/auth/useAuth.ts'

const singleton = vi.hoisted(() => ({ client: null as SupabaseClient | null }))
vi.mock('../../src/lib/supabase.ts', () => ({
  get supabase() {
    return singleton.client
  },
}))

const clients: SupabaseClient[] = []
afterEach(() => {
  cleanup()
  clients.forEach((client) => client.auth.stopAutoRefresh())
  clients.length = 0
  singleton.client = null
  localStorage.clear()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

/** Create a synthetic, unverified-by-production fixture token solely for mocked SDK transport. */
const fixtureExpiry = Math.floor(Date.now() / 1000) + 3600

function token(ownerId: string, generation: string): string {
  return [
    btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' })),
    btoa(
      JSON.stringify({
        sub: ownerId,
        session_id: generation,
        exp: fixtureExpiry,
      }),
    ).replace(/=+$/, ''),
    'fixture',
  ].join('.')
}

let latest: AuthState
/** Observe the provider identity while using the installed SDK instead of an auth stub. */
function Probe() {
  latest = useAuth()
  return (
    <>
      <output>{latest.loading ? 'loading' : (latest.user?.id ?? 'anonymous')}</output>
      <output aria-label="Publishing name">{latest.displayName ?? 'unavailable'}</output>
      <output aria-label="Publishing license">{latest.shareLicense ?? 'unavailable'}</output>
    </>
  )
}

/** Mock only HTTP and install a fixture identity through the real SDK public API. */
async function startIdentity() {
  const serverMetadata: Record<string, Record<string, unknown>> = {
    'owner-a': { display_name: 'Old name', share_license: 'cc-by-4.0' },
  }
  const fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const path = String(input)
    if (path.includes('/auth/v1/user')) {
      const jwt = new Headers(init?.headers).get('Authorization')!.slice(7)
      const { sub: ownerId, session_id: generation } = JSON.parse(atob(jwt.split('.')[1]))
      if (init?.method === 'PUT') {
        serverMetadata[ownerId] ??= {}
        for (const [key, value] of Object.entries(JSON.parse(String(init.body)).data)) {
          if (value === null) delete serverMetadata[ownerId][key]
          else serverMetadata[ownerId][key] = value
        }
      }
      return Response.json({
        id: ownerId,
        aud: 'authenticated',
        email: `${ownerId}@example.test`,
        app_metadata: {},
        user_metadata: { ...serverMetadata[ownerId], session_generation: generation },
        created_at: '2026-01-01T00:00:00Z',
      })
    }
    if (path.includes('/rpc/stop_all_live_views')) return Response.json(null)
    if (path.includes('/functions/v1/account-delete')) return Response.json({ deleted: true })
    if (path.includes('/auth/v1/logout')) return Response.json({})
    throw new Error(`Unexpected mocked request: ${path}`)
  })
  vi.stubGlobal('fetch', fetch)
  const client = createConsoleClient(
    'https://termination-fixture.supabase.test',
    'fixture-public-key',
  )!
  clients.push(client)
  client.auth.stopAutoRefresh()
  expect(
    (
      await client.auth.setSession({
        access_token: token('owner-a', 'original'),
        refresh_token: 'fixture-original',
      })
    ).error,
  ).toBeNull()
  singleton.client = client
  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  )
  await screen.findByText('owner-a')
  await waitFor(() => expect(latest.displayName).toBe('Old name'))
  const events: string[] = []
  client.auth.onAuthStateChange((event) => {
    events.push(event)
  })
  return { client, fetch, events, serverMetadata }
}

it.each([
  ['signout', 'owner-b'],
  ['signout', 'owner-a'],
  ['deletion', 'owner-b'],
] as const)(
  'preserves %s replacement %s through real SDK delayed logout completion',
  async (operation, replacement) => {
    const { client, fetch, events } = await startIdentity()
    let finish!: (response: Response) => void
    fetch.mockImplementationOnce(() =>
      Promise.resolve(Response.json(operation === 'deletion' ? { deleted: true } : null)),
    )
    fetch.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve
        }),
    )
    const pending = operation === 'deletion' ? latest.deleteAccount() : latest.signOut()
    await waitFor(() => expect(finish).toBeDefined())
    await act(async () => {
      expect(
        (
          await client.auth.setSession({
            access_token: token(replacement, 'replacement'),
            refresh_token: 'fixture-replacement',
          })
        ).error,
      ).toBeNull()
    })
    expect(latest.user?.id).toBe(replacement)
    await act(async () => {
      finish(Response.json({}))
      await pending
    })
    expect((await client.auth.getSession()).data.session?.user.id).toBe(replacement)
    expect(JSON.parse(localStorage.getItem('sb-termination-fixture-auth-token')!).user.id).toBe(
      replacement,
    )
    expect(latest.user?.id).toBe(replacement)
    expect(events).not.toContain('SIGNED_OUT')
    expect(latest.user?.user_metadata.session_generation).toBe('replacement')
  },
)

it.each(['signout', 'deletion'] as const)(
  'completes ordinary %s through native SDK cleanup and confirmed null identity',
  async (operation) => {
    const { client, fetch, events } = await startIdentity()
    const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const remove = vi.spyOn(Storage.prototype, 'removeItem')
    localStorage.setItem('sb-termination-fixture-auth-token-code-verifier', 'fixture-old-flow')
    await act(async () => {
      if (operation === 'deletion') expect(await latest.deleteAccount()).toEqual({ error: null })
      else await latest.signOut()
    })
    await screen.findByText('anonymous')
    expect(latest.identityExpired).toBe(false)
    expect((await client.auth.getSession()).data.session).toBeNull()
    expect(localStorage.getItem('sb-termination-fixture-auth-token')).toBeNull()
    expect(events.filter((event) => event === 'SIGNED_OUT')).toHaveLength(1)
    expect(
      errors.mock.calls.some(([message]) => String(message).includes('account sign-out failed')),
    ).toBe(false)
    expect(
      remove.mock.calls.filter(
        ([key]) => key === 'sb-termination-fixture-auth-token-code-verifier',
      ),
    ).toHaveLength(1)
    const logout = fetch.mock.calls.find(([input]) => String(input).includes('/logout'))!
    expect(new Headers(logout[1]?.headers).get('Authorization')).toBe(
      `Bearer ${token('owner-a', 'original')}`,
    )
    expect(String(logout[0])).toContain(operation === 'deletion' ? 'scope=local' : 'scope=global')
  },
)

it('does not dispatch SDK logout when live-view revocation fails', async () => {
  const { client, fetch } = await startIdentity()
  fetch.mockImplementationOnce(() =>
    Promise.resolve(Response.json({ message: 'unavailable' }, { status: 503 })),
  )
  await act(async () => {
    await latest.signOut()
  })
  expect(latest.user?.id).toBe('owner-a')
  expect((await client.auth.getSession()).data.session?.user.id).toBe('owner-a')
  expect(fetch.mock.calls.some(([input]) => String(input).includes('/logout'))).toBe(false)
})

it.each(['signout', 'deletion', 'native event'] as const)(
  'preserves raw replacement after the final auxiliary cleanup during %s',
  async (operation) => {
    const { client, events } = await startIdentity()
    const original = (await client.auth.getSession()).data.session!
    const replacement = {
      ...original,
      access_token: token('owner-b', 'raw-replacement'),
      refresh_token: 'fixture-raw',
      user: { ...original.user, id: 'owner-b' },
    }
    const remove = Storage.prototype.removeItem
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(function (this: Storage, name) {
      remove.call(this, name)
      if (name === 'sb-termination-fixture-auth-token-user')
        this.setItem('sb-termination-fixture-auth-token', JSON.stringify(replacement))
    })
    await act(async () => {
      if (operation === 'deletion') await latest.deleteAccount()
      else if (operation === 'signout') await latest.signOut()
      else await client.auth.signOut()
    })
    await screen.findByText('owner-b')
    expect((await client.auth.getSession()).data.session?.access_token).toBe(
      replacement.access_token,
    )
    expect(JSON.parse(localStorage.getItem('sb-termination-fixture-auth-token')!).user.id).toBe(
      'owner-b',
    )
    expect(latest.identityExpired).toBe(false)
    expect(events.filter((event) => event === 'SIGNED_OUT')).toHaveLength(
      operation === 'native event' ? 1 : 0,
    )
    expect(events.filter((event) => event === 'SIGNED_IN')).toHaveLength(0)
  },
)

it.each(['signout', 'deletion'] as const)(
  'reconciles raw replacement before its event arrives after failed %s cleanup',
  async (operation) => {
    const { client, fetch } = await startIdentity()
    const original = (await client.auth.getSession()).data.session!
    const replacement = {
      ...original,
      access_token: token('owner-b', 'raw-replacement'),
      refresh_token: 'fixture-raw',
      user: { ...original.user, id: 'owner-b' },
    }
    fetch.mockImplementationOnce(() =>
      Promise.resolve(Response.json(operation === 'deletion' ? { deleted: true } : null)),
    )
    fetch.mockImplementationOnce(async () => {
      localStorage.setItem('sb-termination-fixture-auth-token', JSON.stringify(replacement))
      return Response.json({ message: 'unavailable' }, { status: 503 })
    })
    await act(async () => {
      if (operation === 'deletion') await latest.deleteAccount()
      else await latest.signOut()
    })
    await screen.findByText('owner-b')
    expect((await client.auth.getSession()).data.session?.user.id).toBe('owner-b')
    expect(latest.identityExpired).toBe(false)
  },
)

it('allows refresh/replacement during pending HTTP and releases refusal before legitimate current signout', async () => {
  const { client } = await startIdentity()
  const original = (await client.auth.getSession()).data.session!
  let finish!: (response: Response) => void
  const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
  fetch.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve
      }),
  )
  const pending = signOutConsoleSession(client, original, () => true)
  const refused = expect(pending).rejects.toThrow()
  await waitFor(() => expect(finish).toBeDefined())
  await expect(signOutConsoleSession(client, original, () => true)).rejects.toThrow(
    'already in progress',
  )
  await act(async () => {
    await client.auth.setSession({
      access_token: token('owner-b', 'fresh'),
      refresh_token: 'fixture-fresh',
    })
  })
  finish(Response.json({}))
  await refused
  const current = (await client.auth.getSession()).data.session!
  await act(async () => {
    await signOutConsoleSession(client, current, () => true)
  })
  await screen.findByText('anonymous')
  expect((await client.auth.getSession()).data.session).toBeNull()
})

it('fails closed for incompatible private seams without disabling ordinary session reads', async () => {
  const { client, fetch } = await startIdentity()
  const current = (await client.auth.getSession()).data.session!
  const auth = client.auth as unknown as { _notifyAllSubscribers: unknown }
  auth._notifyAllSubscribers = undefined
  fetch.mockClear()
  await expect(signOutConsoleSession(client, current, () => true)).rejects.toThrow('Reload')
  expect(fetch).not.toHaveBeenCalled()
  expect((await client.auth.getSession()).data.session?.user.id).toBe('owner-a')
})

it('distinguishes absent, malformed and expired observed native sessions without SDK installation', async () => {
  const { client, events } = await startIdentity()
  const current = (await client.auth.getSession()).data.session!
  localStorage.setItem('sb-termination-fixture-auth-token', '{ invalid')
  expect(await observeConsoleSession(client)).toEqual({ status: 'invalid' })
  localStorage.setItem(
    'sb-termination-fixture-auth-token',
    JSON.stringify({ ...current, expires_at: 1 }),
  )
  expect(await observeConsoleSession(client)).toEqual({ status: 'expired' })
  localStorage.removeItem('sb-termination-fixture-auth-token')
  expect(await observeConsoleSession(client)).toEqual({ status: 'absent' })
  expect(events).not.toContain('SIGNED_OUT')
  expect(latest.user?.id).toBe('owner-a')
})

it('allows real SDK refresh during signout preparation and refuses logout of its renewed tokens', async () => {
  const { client, fetch, events } = await startIdentity()
  const original = (await client.auth.getSession()).data.session!
  localStorage.setItem(
    'sb-termination-fixture-auth-token',
    JSON.stringify({ ...original, expires_at: Math.floor(Date.now() / 1000) + 1 }),
  )
  const implementation = fetch.getMockImplementation()!
  fetch.mockImplementation(async (input, init) => {
    if (String(input).includes('/token'))
      return Response.json({
        access_token: token('owner-a', 'refreshed'),
        refresh_token: 'fixture-refreshed',
        token_type: 'bearer',
        expires_in: 3600,
        user: original.user,
      })
    return implementation(input, init)
  })
  await expect(signOutConsoleSession(client, original, () => true)).rejects.toThrow()
  expect((await client.auth.getSession()).data.session?.refresh_token).toBe('fixture-refreshed')
  expect(events).toContain('TOKEN_REFRESHED')
  expect(events).not.toContain('SIGNED_OUT')
  expect(fetch.mock.calls.some(([input]) => String(input).includes('/logout'))).toBe(false)
})

it('reads actual site PUT changes on console return even when SDK stored profile metadata is unchanged', async () => {
  const { client, fetch } = await startIdentity()
  const original = (await client.auth.getSession()).data.session!
  const before = localStorage.getItem('sb-termination-fixture-auth-token')
  const headers = {
    apikey: 'fixture-public-key',
    Authorization: `Bearer ${original.access_token}`,
    'Content-Type': 'application/json',
  }
  await fetch('https://termination-fixture.supabase.test/auth/v1/user', {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      data: { display_name: 'Site-return name', share_license: 'cc-by-sa-4.0' },
    }),
  })
  expect(
    (
      await (
        await fetch('https://termination-fixture.supabase.test/auth/v1/user', { headers })
      ).json()
    ).user_metadata.display_name,
  ).toBe('Site-return name')
  expect(localStorage.getItem('sb-termination-fixture-auth-token')).toBe(before)
  expect((await client.auth.getSession()).data.session?.user.user_metadata.display_name).toBe(
    'Old name',
  )
  cleanup()
  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  )
  await waitFor(() =>
    expect(screen.getByLabelText('Publishing name')).toHaveTextContent('Site-return name'),
  )
  expect(screen.getByLabelText('Publishing license')).toHaveTextContent('cc-by-sa-4.0')
  expect(localStorage.getItem('sb-termination-fixture-auth-token')).toBe(before)
})

it.each(['owner-b', 'owner-a'])(
  'preserves actual native replacement %s after an older publishing profile write completes',
  async (replacement) => {
    const { client, fetch } = await startIdentity()
    const original = (await client.auth.getSession()).data.session!
    let finish!: (response: Response) => void
    fetch.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve
        }),
    )
    const pending = latest.setDisplayName('Older publishing name')
    await waitFor(() => expect(finish).toBeDefined())
    await act(async () => {
      await client.auth.setSession({
        access_token: token(replacement, 'replacement'),
        refresh_token: 'fixture-replacement',
      })
    })
    await act(async () => {
      finish(
        Response.json({
          ...original.user,
          user_metadata: { ...original.user.user_metadata, display_name: 'Older publishing name' },
        }),
      )
      await pending
    })
    expect((await client.auth.getSession()).data.session?.refresh_token).toBe('fixture-replacement')
    expect(latest.user?.id).toBe(replacement)
    expect((await client.auth.getSession()).data.session?.user.id).toBe(replacement)
    expect(JSON.parse(localStorage.getItem('sb-termination-fixture-auth-token')!).user.id).toBe(
      replacement,
    )
  },
)

it('revalidates site profile changes on preserved-page focus without SDK writes or events', async () => {
  const { client, serverMetadata, events } = await startIdentity()
  const before = localStorage.getItem('sb-termination-fixture-auth-token')
  serverMetadata['owner-a'] = { display_name: 'Focused return', share_license: 'cc0-1.0' }
  await act(async () => {
    window.dispatchEvent(new Event('focus'))
  })
  await waitFor(() => expect(latest.displayName).toBe('Focused return'))
  expect(latest.shareLicense).toBe('cc0-1.0')
  expect(localStorage.getItem('sb-termination-fixture-auth-token')).toBe(before)
  expect((await client.auth.getSession()).data.session?.user.user_metadata.display_name).toBe(
    'Old name',
  )
  expect(events).not.toContain('USER_UPDATED')
})

it('withholds unverified publishing metadata on profile GET failure without changing board identity', async () => {
  const { client, fetch } = await startIdentity()
  const before = localStorage.getItem('sb-termination-fixture-auth-token')
  fetch.mockImplementationOnce(() =>
    Promise.resolve(Response.json({ message: 'unavailable' }, { status: 503 })),
  )
  await act(async () => {
    window.dispatchEvent(new Event('focus'))
  })
  await waitFor(() => expect(latest.profileError).toBeTruthy())
  expect(latest.displayName).toBeNull()
  expect(latest.shareLicense).toBeNull()
  expect(latest.user?.id).toBe('owner-a')
  expect(latest.loading).toBe(false)
  expect(latest.identityExpired).toBe(false)
  expect((await client.auth.getSession()).data.session?.user.id).toBe('owner-a')
  expect(localStorage.getItem('sb-termination-fixture-auth-token')).toBe(before)
})

it.each([200, 503])(
  'ignores a delayed profile GET response (%s) after real SDK identity replacement',
  async (status) => {
    const { client, fetch, serverMetadata } = await startIdentity()
    const original = (await client.auth.getSession()).data.session!
    let finish!: (response: Response) => void
    fetch.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve
        }),
    )
    await act(async () => {
      window.dispatchEvent(new Event('focus'))
    })
    await waitFor(() => expect(finish).toBeDefined())
    serverMetadata['owner-b'] = { display_name: 'Replacement name', share_license: 'cc0-1.0' }
    await act(async () => {
      await client.auth.setSession({
        access_token: token('owner-b', 'fresh'),
        refresh_token: 'fixture-fresh',
      })
    })
    await waitFor(() => expect(latest.displayName).toBe('Replacement name'))
    const before = localStorage.getItem('sb-termination-fixture-auth-token')
    await act(async () => {
      finish(
        Response.json(
          {
            ...original.user,
            user_metadata: { display_name: 'Late name', share_license: 'cc-by-4.0' },
          },
          { status },
        ),
      )
    })
    expect(latest.displayName).toBe('Replacement name')
    expect(latest.shareLicense).toBe('cc0-1.0')
    expect(latest.profileError).toBeNull()
    expect(localStorage.getItem('sb-termination-fixture-auth-token')).toBe(before)
  },
)

it.each(['before dispatch', 'failed PUT', 'readback'])(
  'fences unseen native replacement during profile write %s',
  async (phase) => {
    const { client, fetch, serverMetadata } = await startIdentity()
    const original = (await client.auth.getSession()).data.session!
    const replacement = {
      ...original,
      access_token: token('owner-b', 'raw'),
      refresh_token: 'fixture-raw',
      user: { ...original.user, id: 'owner-b' },
    }
    serverMetadata['owner-b'] = { display_name: 'Raw replacement', share_license: 'cc0-1.0' }
    const replace = () =>
      localStorage.setItem('sb-termination-fixture-auth-token', JSON.stringify(replacement))
    if (phase === 'before dispatch') replace()
    else if (phase === 'failed PUT')
      fetch.mockImplementationOnce(async () => {
        replace()
        return Response.json({ message: 'old failure' }, { status: 503 })
      })
    else {
      fetch.mockImplementationOnce(() => Promise.resolve(Response.json(original.user)))
      fetch.mockImplementationOnce(async () => {
        replace()
        return Response.json({ ...original.user, user_metadata: { display_name: 'Unconfirmed' } })
      })
    }
    const before = JSON.stringify(replacement)
    await act(async () => {
      expect((await latest.setDisplayName('Unconfirmed')).error).not.toBeNull()
    })
    await waitFor(() => expect(latest.displayName).toBe('Raw replacement'))
    expect(latest.user?.id).toBe('owner-b')
    expect(latest.profileError).toBeNull()
    expect((await client.auth.getSession()).data.session?.access_token).toBe(
      replacement.access_token,
    )
    expect(localStorage.getItem('sb-termination-fixture-auth-token')).toBe(before)
    if (phase === 'before dispatch')
      expect(fetch.mock.calls.some(([, init]) => init?.method === 'PUT')).toBe(false)
  },
)

it('preserves metadata clear/provider fallback and license semantics with SDK bytes unchanged', async () => {
  const { client, serverMetadata, fetch, events } = await startIdentity()
  const before = localStorage.getItem('sb-termination-fixture-auth-token')
  serverMetadata['owner-a'].full_name = 'Provider fallback'
  await act(async () => {
    expect(await latest.setDisplayName(' ')).toEqual({ error: null })
  })
  expect(latest.displayName).toBe('Provider fallback')
  await act(async () => {
    expect(await latest.setShareLicense('unstated')).toEqual({ error: null })
  })
  expect(latest.shareLicense).toBeNull()
  await act(async () => {
    expect(await latest.setShareLicense('cc-by-sa-4.0')).toEqual({ error: null })
  })
  expect(latest.shareLicense).toBe('cc-by-sa-4.0')
  expect(localStorage.getItem('sb-termination-fixture-auth-token')).toBe(before)
  expect((await client.auth.getSession()).data.session?.user.user_metadata.share_license).toBe(
    'cc-by-4.0',
  )
  expect(
    fetch.mock.calls
      .filter(([, init]) => init?.method === 'PUT')
      .map(([, init]) => JSON.parse(String(init?.body)).data),
  ).toEqual([{ display_name: null }, { share_license: null }, { share_license: 'cc-by-sa-4.0' }])
  expect(events).not.toContain('USER_UPDATED')
})

it('denies malformed profile readback and offers fresh retry without claiming cached metadata', async () => {
  const { client, fetch, serverMetadata } = await startIdentity()
  const before = localStorage.getItem('sb-termination-fixture-auth-token')
  fetch.mockImplementationOnce(() => Promise.resolve(Response.json(JSON.parse(before!).user)))
  fetch.mockImplementationOnce(() =>
    Promise.resolve(
      Response.json({ id: 'wrong-owner', user_metadata: { display_name: 'Unconfirmed' } }),
    ),
  )
  await act(async () => {
    expect((await latest.setDisplayName('Unconfirmed')).error).not.toBeNull()
  })
  expect(latest.displayName).toBeNull()
  expect(latest.profileError).toBeTruthy()
  expect(localStorage.getItem('sb-termination-fixture-auth-token')).toBe(before)
  expect((await client.auth.getSession()).data.session?.user.id).toBe('owner-a')
  serverMetadata['owner-a'].display_name = 'Verified retry'
  await act(async () => {
    window.dispatchEvent(new Event('focus'))
  })
  await waitFor(() => expect(latest.displayName).toBe('Verified retry'))
  expect(latest.profileError).toBeNull()
})

it('verifies tutorial PUT with captured GET while preserving publishing fields and SDK bytes', async () => {
  vi.stubEnv('VITE_SUPABASE_URL', 'https://termination-fixture.supabase.test')
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'fixture-public-key')
  const { client, fetch } = await startIdentity()
  const before = localStorage.getItem('sb-termination-fixture-auth-token')
  await act(async () => {
    expect(await latest.setTutorialSuppression('completed')).toEqual({ error: null })
  })
  expect(latest.tutorialSuppression).toBe('completed')
  expect(latest.displayName).toBe('Old name')
  expect(latest.shareLicense).toBe('cc-by-4.0')
  expect(localStorage.getItem('sb-termination-fixture-auth-token')).toBe(before)
  expect(
    (await client.auth.getSession()).data.session?.user.user_metadata.tutorial_suppression,
  ).toBeUndefined()
  const writes = fetch.mock.calls.filter(([, init]) => init?.method === 'PUT')
  expect(writes).toHaveLength(1)
  expect(JSON.parse(String(writes[0][1]?.body))).toEqual({
    data: { tutorial_suppression: 'completed' },
  })
})
it.each([
  ['signout', 'owner-b'],
  ['signout', 'owner-a'],
  ['deletion', 'owner-b'],
  ['deletion', 'owner-a'],
] as const)(
  'does not send destructive %s requests for unseen native replacement %s',
  async (operation, replacementId) => {
    const { client, fetch, serverMetadata } = await startIdentity()
    const original = (await client.auth.getSession()).data.session!
    const replacement = {
      ...original,
      access_token: token(replacementId, 'raw'),
      refresh_token: 'fixture-raw',
      user: { ...original.user, id: replacementId },
    }
    serverMetadata[replacementId] = { display_name: 'Raw replacement' }
    localStorage.setItem('sb-termination-fixture-auth-token', JSON.stringify(replacement))
    fetch.mockClear()
    await act(async () => {
      if (operation === 'deletion') await latest.deleteAccount()
      else await latest.signOut()
    })
    const destructive = fetch.mock.calls.filter(
      ([input]) =>
        String(input).includes('/rpc/stop_all_live_views') ||
        String(input).includes('/functions/v1/account-delete'),
    )
    expect(destructive).toHaveLength(0)
    expect((await client.auth.getSession()).data.session?.user.id).toBe(replacementId)
  },
)

it.each([
  ['signout', 'owner-b'],
  ['signout', 'owner-a'],
  ['deletion', 'owner-b'],
  ['deletion', 'owner-a'],
] as const)(
  'keeps %s transport bearer captured while native SDK acquisition installs %s',
  async (operation, replacementId) => {
    const { client, fetch, serverMetadata } = await startIdentity()
    const original = (await client.auth.getSession()).data.session!
    const replacement = {
      ...original,
      access_token: token(replacementId, 'acquired'),
      refresh_token: 'fixture-acquired',
      user: { ...original.user, id: replacementId },
    }
    let acquired!: (value: Awaited<ReturnType<typeof client.auth.getSession>>) => void
    vi.spyOn(client.auth, 'getSession').mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          acquired = resolve
        }),
    )
    const pending = operation === 'deletion' ? latest.deleteAccount() : latest.signOut()
    await waitFor(() => expect(acquired).toBeDefined())
    serverMetadata[replacementId] = { display_name: 'Acquired replacement' }
    localStorage.setItem('sb-termination-fixture-auth-token', JSON.stringify(replacement))
    await act(async () => {
      acquired({ data: { session: replacement }, error: null })
      await pending
    })
    await waitFor(() => expect(latest.displayName).toBe('Acquired replacement'))
    const destructive = fetch.mock.calls.filter(
      ([input]) =>
        String(input).includes('/rpc/stop_all_live_views') ||
        String(input).includes('/functions/v1/account-delete'),
    )
    expect(destructive).toHaveLength(1)
    expect(new Headers(destructive[0][1]?.headers).get('Authorization')).toBe(
      `Bearer ${original.access_token}`,
    )
    expect((await client.auth.getSession()).data.session?.access_token).toBe(
      replacement.access_token,
    )
    expect(fetch.mock.calls.some(([input]) => String(input).includes('/logout'))).toBe(false)
  },
)

it('does not mask legitimate current-session expiry while an older logout HTTP request is pending', async () => {
  const { client, fetch, events } = await startIdentity()
  let finish!: (response: Response) => void
  const implementation = fetch.getMockImplementation()!
  fetch.mockImplementationOnce(() => Promise.resolve(Response.json(null)))
  fetch.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve
      }),
  )
  const pending = latest.signOut()
  await waitFor(() => expect(finish).toBeDefined())
  await act(async () => {
    await client.auth.setSession({
      access_token: token('owner-b', 'expiring'),
      refresh_token: 'fixture-expiring',
    })
  })
  const expiring = JSON.parse(localStorage.getItem('sb-termination-fixture-auth-token')!)
  localStorage.setItem(
    'sb-termination-fixture-auth-token',
    JSON.stringify({ ...expiring, expires_at: 1 }),
  )
  fetch.mockImplementation(async (input, init) =>
    String(input).includes('/token')
      ? Response.json(
          { msg: 'Invalid fixture refresh token', code: 'refresh_token_not_found' },
          { status: 400 },
        )
      : implementation(input, init),
  )
  await act(async () => {
    expect(
      (await client.auth.refreshSession({ refresh_token: 'fixture-expiring' })).error,
    ).not.toBeNull()
  })
  await screen.findByText('anonymous')
  expect(latest.identityExpired).toBe(true)
  expect(events.filter((event) => event === 'SIGNED_OUT')).toHaveLength(1)
  await act(async () => {
    finish(Response.json({}))
    await pending
  })
  expect((await client.auth.getSession()).data.session).toBeNull()
  expect(latest.identityExpired).toBe(true)
})

it('does not erase a new flow verifier created by the own terminal event', async () => {
  const { client } = await startIdentity()
  const original = (await client.auth.getSession()).data.session!
  let current = true
  client.auth.onAuthStateChange((event) => {
    if (event !== 'SIGNED_OUT') return
    current = false
    localStorage.setItem('sb-termination-fixture-auth-token-code-verifier', 'fixture-new-flow')
  })
  await act(async () => {
    await expect(signOutConsoleSession(client, original, () => current)).rejects.toThrow()
  })
  expect(localStorage.getItem('sb-termination-fixture-auth-token')).toBeNull()
  expect(localStorage.getItem('sb-termination-fixture-auth-token-code-verifier')).toBe(
    'fixture-new-flow',
  )
})
