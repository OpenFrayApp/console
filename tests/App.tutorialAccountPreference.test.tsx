// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone
// @vitest-environment jsdom

import { afterEach, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { Session, User, SupabaseClient } from '@supabase/supabase-js'
import App from '../src/App.tsx'
import { createConsoleClient } from '../src/auth/sessionTermination.ts'
import { AuthProvider } from '../src/auth/AuthProvider.tsx'
import { loadSettings, saveSettings, type TutorialSuppression } from '../src/state/settings.ts'

const supa = vi.hoisted(() => ({ client: null as unknown }))
const clients: SupabaseClient[] = []
const fixtureExpiry = Math.floor(Date.now() / 1000) + 3600
vi.mock('../src/lib/supabase.ts', () => ({
  get supabase() {
    return supa.client
  },
}))
vi.mock('../src/compendium/srd.ts', async (original) => ({
  ...(await original<object>()),
  loadSrdCreatures: async () => [],
  loadSrdSpells: async () => [],
  loadLibraries: async () => ({ creatures: [], spells: [] }),
}))

afterEach(() => {
  cleanup()
  for (const client of clients) client.auth.stopAutoRefresh()
  clients.length = 0
  supa.client = null
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  sessionStorage.clear()
  localStorage.clear()
})

/** Supply the identity fields read by the real provider and account adapter. */
function session(reason: TutorialSuppression | null = null): Session {
  return {
    access_token: [
      btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' })),
      btoa(JSON.stringify({ sub: 'tutorial-account-owner', exp: fixtureExpiry })).replace(
        /=+$/,
        '',
      ),
      'fixture',
    ].join('.'),
    refresh_token: 'fixture-tutorial-refresh',
    expires_at: fixtureExpiry,
    user: {
      id: 'tutorial-account-owner',
      email: 'gm@example.test',
      user_metadata: reason ? { tutorial_suppression: reason } : {},
    } as User,
  } as Session
}

/** Mock external Supabase responses while retaining real auth and encounter transitions. */
async function accountClient(initial: Session | null) {
  let serverUser = initial?.user ?? session().user
  const putTransport = globalThis.fetch
  vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
    if (String(input).includes('/auth/v1/user') && init?.method !== 'PUT')
      return Response.json(serverUser)
    const response = await putTransport(input, init)
    if (response.ok) serverUser = await response.clone().json()
    return response
  })
  const client = createConsoleClient('https://project.supabase.co', 'public-key')!
  clients.push(client)
  if (initial) expect((await client.auth.setSession(initial)).error).toBeNull()
  client.auth.stopAutoRefresh()
  const empty = Promise.resolve({ data: [], error: null })
  const query = {
    select: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(() => query),
    eq: vi.fn(() => query),
    maybeSingle: vi.fn(async () => ({ data: null, error: null })),
    then: empty.then.bind(empty),
  }
  vi.spyOn(client, 'from').mockImplementation(() => query as never)
  vi.spyOn(client, 'rpc').mockImplementation(
    () => Promise.resolve({ data: false, error: null }) as never,
  )
  supa.client = client
  return {
    /** Install the fixture identity through the native SDK public API. */
    signIn: (next: Session) =>
      act(async () => {
        serverUser = next.user
        expect((await client.auth.setSession(next)).error).toBeNull()
      }),
  }
}

/** Render App through its production identity provider without a replacement tutorial coordinator. */
function renderConsole() {
  return render(
    <AuthProvider>
      <App />
    </AuthProvider>,
  )
}

/** Launch the guide through the normal searchable destination. */
function launchManually() {
  fireEvent.click(screen.getByRole('button', { name: 'Search references' }))
  fireEvent.change(screen.getByRole('combobox', { name: 'Search references' }), {
    target: { value: 'tutorial' },
  })
  fireEvent.click(screen.getByRole('option', { name: 'Start tutorial' }))
}

it.each(['dismissed', 'completed'] as const)(
  'suppresses welcome from account-only %s while permitting manual App launch',
  async (reason) => {
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)
    await accountClient(session(reason))
    renderConsole()
    await screen.findByRole('button', { name: 'Save failed' })
    expect(screen.queryByRole('dialog', { name: 'Learn the console' })).toBeNull()
    expect(loadSettings().tutorialSuppression).toBeNull()
    launchManually()
    expect(screen.getByRole('dialog', { name: 'Tutorial introduction' })).toBeInTheDocument()
    expect(screen.getByText(/Choose Add PC, then Create a character…/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Exit tutorial' }))
    fireEvent.click(screen.getByRole('button', { name: 'Yes, another time' }))
    expect(screen.getByText(/Nobody is on the board yet/)).toBeInTheDocument()
    expect(fetch).not.toHaveBeenCalled()
  },
)

it.each(['dismissed', 'completed'] as const)(
  'transfers anonymous device %s through App after sign-in without delaying manual launch',
  async (reason) => {
    saveSettings({ tutorialSuppression: reason })
    vi.stubEnv('VITE_SUPABASE_URL', 'https://project.supabase.co')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'public-key')
    let finish!: (response: Response) => void
    const fetch = vi.fn(() => new Promise<Response>((resolve) => (finish = resolve)))
    vi.stubGlobal('fetch', fetch)
    const client = await accountClient(null)
    renderConsole()
    await screen.findByRole('button', { name: 'Sign in to resume saving' })
    expect(fetch).not.toHaveBeenCalled()
    await client.signIn(session())
    await screen.findByRole('button', { name: 'Save failed' })
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))
    expect(fetch).toHaveBeenCalledWith(
      'https://project.supabase.co/auth/v1/user',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: `Bearer ${session().access_token}` }),
        body: JSON.stringify({ data: { tutorial_suppression: reason } }),
      }),
    )
    expect(screen.queryByRole('dialog', { name: 'Learn the console' })).toBeNull()
    launchManually()
    expect(screen.getByRole('dialog', { name: 'Tutorial introduction' })).toBeInTheDocument()
    await act(async () => {
      finish(new Response(JSON.stringify(session(reason).user), { status: 200 }))
    })
    expect(screen.queryByRole('alert')).toBeNull()
    expect(loadSettings().tutorialSuppression).toBe(reason)
    expect(fetch).toHaveBeenCalledTimes(1)
  },
)

it('keeps failed App preference sync locally suppressed and its alert accessible during guide and exit', async () => {
  vi.stubEnv('VITE_SUPABASE_URL', 'https://project.supabase.co')
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'public-key')
  let finish!: (response: Response) => void
  const fetch = vi.fn(() => new Promise<Response>((resolve) => (finish = resolve)))
  vi.stubGlobal('fetch', fetch)
  await accountClient(session())
  renderConsole()
  await screen.findByRole('dialog', { name: 'Learn the console' })
  fireEvent.click(screen.getByRole('checkbox', { name: 'Never show this again' }))
  fireEvent.click(screen.getByRole('button', { name: 'Start tutorial' }))
  expect(loadSettings().tutorialSuppression).toBe('dismissed')
  expect(screen.getByRole('dialog', { name: 'Tutorial introduction' })).toBeInTheDocument()
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))
  await act(async () => finish(new Response('{}', { status: 503 })))
  const alert = await screen.findByRole('alert')
  expect(alert).toHaveTextContent(
    'The tutorial preference couldn’t be saved to your account. It still applies on this device.',
  )
  await waitFor(() => {
    for (let ancestor: HTMLElement | null = alert; ancestor; ancestor = ancestor.parentElement) {
      expect(ancestor.inert).not.toBe(true)
      expect(ancestor).not.toHaveAttribute('inert')
    }
  })
  fireEvent.click(screen.getByRole('button', { name: 'Exit tutorial' }))
  expect(screen.getByRole('alert')).toBe(alert)
  fireEvent.click(screen.getByRole('button', { name: 'Yes, another time' }))
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(loadSettings().tutorialSuppression).toBe('dismissed')
  launchManually()
  expect(screen.getByRole('dialog', { name: 'Tutorial introduction' })).toBeInTheDocument()
  expect(screen.getByRole('alert')).toBe(alert)
  expect(fetch).toHaveBeenCalledTimes(1)
})
