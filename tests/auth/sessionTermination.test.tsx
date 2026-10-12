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
})

/** Create a synthetic, unverified-by-production fixture token solely for mocked SDK transport. */
function token(ownerId: string, generation: string): string {
  return [
    btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' })),
    btoa(
      JSON.stringify({
        sub: ownerId,
        session_id: generation,
        exp: Math.floor(Date.now() / 1000) + 3600,
      }),
    ).replace(/=+$/, ''),
    'fixture',
  ].join('.')
}

let latest: AuthState
/** Observe the provider identity while using the installed SDK instead of an auth stub. */
function Probe() {
  latest = useAuth()
  return <output>{latest.loading ? 'loading' : (latest.user?.id ?? 'anonymous')}</output>
}

/** Mock only HTTP and install a fixture identity through the real SDK public API. */
async function startIdentity() {
  const fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const path = String(input)
    if (path.includes('/auth/v1/user')) {
      const jwt = new Headers(init?.headers).get('Authorization')!.slice(7)
      const { sub: ownerId, session_id: generation } = JSON.parse(atob(jwt.split('.')[1]))
      return Response.json({
        id: ownerId,
        aud: 'authenticated',
        email: `${ownerId}@example.test`,
        app_metadata: {},
        user_metadata: { session_generation: generation },
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
  const events: string[] = []
  client.auth.onAuthStateChange((event) => {
    events.push(event)
  })
  return { client, fetch, events }
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
    await act(async () => {
      if (operation === 'deletion') expect(await latest.deleteAccount()).toEqual({ error: null })
      else await latest.signOut()
    })
    await screen.findByText('anonymous')
    expect(latest.identityExpired).toBe(false)
    expect((await client.auth.getSession()).data.session).toBeNull()
    expect(localStorage.getItem('sb-termination-fixture-auth-token')).toBeNull()
    expect(events.filter((event) => event === 'SIGNED_OUT')).toHaveLength(1)
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
