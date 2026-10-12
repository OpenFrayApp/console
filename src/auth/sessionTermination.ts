// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import {
  createClient,
  type AuthChangeEvent,
  type Session,
  type SupabaseClient,
  type SupportedStorage,
  type User,
} from '@supabase/supabase-js'

type TerminationGuard = {
  session: Session
  isCurrent: () => boolean
  cleanup: boolean
  logoutStarted: boolean
  removed: boolean
  terminalCompleted: boolean
}
type SdkNotification = (
  event: AuthChangeEvent,
  session: Session | null,
  broadcast?: boolean,
) => Promise<void>
type SdkTerminationMembers = {
  storage: SupportedStorage
  storageKey: string
  _notifyAllSubscribers: SdkNotification
}
export type ObservedConsoleSession =
  | { status: 'present'; session: Session }
  | { status: 'absent' | 'unavailable' | 'invalid' | 'expired' }

type TerminationBoundary = {
  run: (session: Session, isCurrent: () => boolean, scope: 'global' | 'local') => Promise<void>
  fetch: typeof fetch
  observe: () => Promise<ObservedConsoleSession>
}

const boundaries = new WeakMap<SupabaseClient, TerminationBoundary>()
const services = new WeakMap<SupabaseClient, { url: string; anonKey: string }>()
const CHANGED = 'Your session changed. Check your account before trying again.'
const UNAVAILABLE = 'Account sign-out is unavailable. Reload the console and try again.'

/** Distinguish asynchronous SDK storage delegates without changing synchronous delegates. */
function isPromise<T>(value: T | Promise<T>): value is Promise<T> {
  return !!value && typeof (value as Promise<T>).then === 'function'
}

/** Guard the inspected auth-js 2.108.2 cleanup seams while retaining its selected storage engine. */
function installTerminationBoundary(
  client: SupabaseClient,
  logoutUrl: string,
): TerminationBoundary | null {
  // These private seams are source-review gated and exercised against the installed SDK.
  const auth = client.auth as unknown as SdkTerminationMembers
  if (!auth) return null
  const storage = auth.storage
  const key = auth.storageKey
  const notify = auth._notifyAllSubscribers
  if (
    !storage ||
    typeof key !== 'string' ||
    typeof storage.getItem !== 'function' ||
    typeof storage.setItem !== 'function' ||
    typeof storage.removeItem !== 'function' ||
    typeof notify !== 'function'
  )
    return null
  let active: TerminationGuard | null = null

  /** Compare captured authority with observed storage without using editable metadata. */
  const checkStored = (guard: TerminationGuard, raw: string | null) => {
    if (!guard.isCurrent()) throw new Error(CHANGED)
    const stored = raw ? (JSON.parse(raw) as Partial<Session>) : null
    if (
      stored
        ? stored.access_token !== guard.session.access_token ||
          stored.refresh_token !== guard.session.refresh_token ||
          stored.user?.id !== guard.session.user.id
        : !guard.removed
    )
      throw new Error(CHANGED)
  }

  /** Keep storage checks synchronous when the SDK chose a synchronous native delegate. */
  const check = (guard: TerminationGuard): void | Promise<void> => {
    const raw = storage.getItem(key)
    if (isPromise(raw)) return raw.then((value) => checkStored(guard, value))
    checkStored(guard, raw)
  }

  /** Preserve the original storage removal receiver and mark only successful token removal. */
  const remove = (name: string, guard: TerminationGuard) => {
    const result = storage.removeItem(name)
    if (isPromise(result))
      return result.then(() => {
        if (name === key) guard.removed = true
      })
    if (name === key) guard.removed = true
    return result
  }

  /** A completed own event permits only an already-absent verifier no-op, never another erase. */
  const redundantVerifierRemoval = (): void | Promise<void> => {
    const session = storage.getItem(key)
    const checkAbsent = (raw: string | null): void | Promise<void> => {
      if (raw !== null) throw new Error(CHANGED)
      const verifier = storage.getItem(`${key}-code-verifier`)
      const checkVerifier = (value: string | null) => {
        if (value !== null) throw new Error(CHANGED)
      }
      return isPromise(verifier) ? verifier.then(checkVerifier) : checkVerifier(verifier)
    }
    return isPromise(session) ? session.then(checkAbsent) : checkAbsent(session)
  }

  const guardedStorage: SupportedStorage = {
    ...(storage.isServer === undefined ? {} : { isServer: storage.isServer }),
    getItem: storage.getItem.bind(storage),
    setItem: storage.setItem.bind(storage),
    /** Refuse stale logout cleanup while permitting ordinary SDK reads, writes and refreshes. */
    removeItem(name) {
      const guard = active
      if (!guard?.cleanup || ![key, `${key}-code-verifier`, `${key}-user`].includes(name))
        return storage.removeItem(name)
      if (guard.terminalCompleted && name === `${key}-code-verifier`)
        return redundantVerifierRemoval()
      const checked = check(guard)
      return isPromise(checked) ? checked.then(() => remove(name, guard)) : remove(name, guard)
    },
  }

  /** Prevent a stale cleanup from broadcasting SIGNED_OUT after a replacement arrives. */
  const guardedNotify: SdkNotification = function (...args) {
    const guard = active
    if (args[0] !== 'SIGNED_OUT' || !guard?.cleanup) return notify.apply(client.auth, args)
    const checked = check(guard)
    const notified = isPromise(checked)
      ? checked.then(() => notify.apply(client.auth, args))
      : notify.apply(client.auth, args)
    return notified.then(() => {
      guard.terminalCompleted = true
    })
  }
  auth.storage = guardedStorage
  auth._notifyAllSubscribers = guardedNotify

  return {
    /** Read the original SDK-selected storage only as observed identity, never authorization. */
    observe: async () => {
      if (auth.storage !== guardedStorage) return { status: 'unavailable' }
      try {
        const raw = await storage.getItem(key)
        if (raw === null) return { status: 'absent' }
        let value: unknown
        try {
          value = JSON.parse(raw)
        } catch {
          return { status: 'invalid' }
        }
        if (!value || typeof value !== 'object') return { status: 'invalid' }
        const session = value as Partial<Session>
        if (
          typeof session.access_token !== 'string' ||
          !session.access_token ||
          typeof session.refresh_token !== 'string' ||
          !session.refresh_token ||
          typeof session.user?.id !== 'string' ||
          !session.user.id ||
          typeof session.expires_at !== 'number' ||
          !Number.isFinite(session.expires_at)
        )
          return { status: 'invalid' }
        if (session.expires_at * 1000 <= Date.now()) return { status: 'expired' }
        return { status: 'present', session: session as Session }
      } catch {
        return { status: 'unavailable' }
      }
    },
    /** Check the captured logout token before dispatch and before allowing SDK cleanup. */
    fetch: async (input, init) => {
      const requestUrl = input instanceof Request ? input.url : String(input)
      const guard = active
      if (!guard || requestUrl.split('?')[0] !== logoutUrl) {
        if (!guard || guard.logoutStarted) return fetch(input, init)
        guard.cleanup = false
        try {
          return await fetch(input, init)
        } finally {
          if (!guard.logoutStarted) guard.cleanup = true
        }
      }
      await check(guard)
      const headers = new Headers(
        init?.headers ?? (input instanceof Request ? input.headers : undefined),
      )
      if (headers.get('Authorization') !== `Bearer ${guard.session.access_token}`)
        throw new Error(CHANGED)
      guard.logoutStarted = true
      guard.cleanup = false
      const response = await fetch(input, init)
      await check(guard)
      guard.cleanup = true
      return response
    },
    /** Bound an explicit SDK termination to one captured session and release its guard on every outcome. */
    run: async (session, isCurrent, scope) => {
      if (auth.storage !== guardedStorage || auth._notifyAllSubscribers !== guardedNotify)
        throw new Error(UNAVAILABLE)
      if (active)
        throw new Error('Account sign-out is already in progress. Wait before trying again.')
      const guard: TerminationGuard = {
        session,
        isCurrent,
        cleanup: true,
        logoutStarted: false,
        removed: false,
        terminalCompleted: false,
      }
      active = guard
      try {
        await check(guard)
        const result = await client.auth.signOut({ scope })
        if (result.error) throw new Error('Sign-out failed. Check your account and try again.')
      } finally {
        if (active === guard) active = null
      }
    },
  }
}

/** Create the consume-only client with unchanged SDK session defaults and storage fallback. */
export function createConsoleClient(
  url: string | undefined,
  anonKey: string | undefined,
): SupabaseClient | null {
  if (!url || !anonKey) return null
  let boundary: TerminationBoundary | null = null
  const client = createClient(url, anonKey, {
    auth: { detectSessionInUrl: false },
    global: {
      fetch: (input, init) => (boundary ? boundary.fetch(input, init) : fetch(input, init)),
    },
  })
  boundary = installTerminationBoundary(client, `${url.replace(/\/$/, '')}/auth/v1/logout`)
  if (boundary) boundaries.set(client, boundary)
  services.set(client, { url, anonKey })
  return client
}

/** Terminate only the captured console identity without manually removing or restoring SDK sessions. */
export async function signOutConsoleSession(
  client: SupabaseClient,
  session: Session,
  isCurrent: () => boolean,
  scope: 'global' | 'local' = 'global',
): Promise<void> {
  const boundary = boundaries.get(client)
  if (!boundary) throw new Error(UNAVAILABLE)
  await boundary.run(session, isCurrent, scope)
}

/** Observe native identity without installing or broadcasting a session through the SDK. */
export async function observeConsoleSession(
  client: SupabaseClient,
): Promise<ObservedConsoleSession> {
  return boundaries.get(client)?.observe() ?? { status: 'unavailable' }
}

/** Read a trusted current user with the captured bearer without mutating SDK stored metadata. */
export async function readConsoleProfile(
  client: SupabaseClient,
  session: Session,
  signal?: AbortSignal,
): Promise<User | null> {
  const service = services.get(client)
  if (!service) return null
  try {
    const response = await fetch(`${service.url.replace(/\/$/, '')}/auth/v1/user`, {
      signal,
      headers: { apikey: service.anonKey, Authorization: `Bearer ${session.access_token}` },
    })
    if (!response.ok) return null
    const data: unknown = await response.json()
    if (
      !data ||
      typeof data !== 'object' ||
      !('id' in data) ||
      data.id !== session.user.id ||
      !('user_metadata' in data) ||
      !data.user_metadata ||
      typeof data.user_metadata !== 'object' ||
      Array.isArray(data.user_metadata)
    )
      return null
    return data as User
  } catch {
    return null
  }
}

/** Compare observed native identity with captured authority without refreshing or installing sessions. */
export async function isCurrentConsoleSession(
  client: SupabaseClient,
  session: Session,
): Promise<boolean> {
  const current = await observeConsoleSession(client)
  return (
    current.status === 'present' &&
    current.session.access_token === session.access_token &&
    current.session.refresh_token === session.refresh_token &&
    current.session.user.id === session.user.id
  )
}

/** Write only captured-owner metadata and verify it through GET without SDK storage side effects. */
export async function writeConsoleProfile(
  client: SupabaseClient,
  session: Session,
  data: Record<string, unknown>,
  isCurrent: () => boolean,
  signal: AbortSignal,
): Promise<{ user: User | null; error: string | null; current: boolean }> {
  const service = services.get(client)
  const failure = 'Your account profile could not be updated. Try again.'
  /** Fence both successful and failed profile requests against native replacement and abort. */
  const current = async () =>
    !signal.aborted &&
    isCurrent() &&
    (await isCurrentConsoleSession(client, session)) &&
    isCurrent()
  if (!service || !(await current())) return { user: null, error: CHANGED, current: false }
  try {
    const response = await fetch(`${service.url.replace(/\/$/, '')}/auth/v1/user`, {
      method: 'PUT',
      signal,
      headers: {
        apikey: service.anonKey,
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ data }),
    })
    if (!(await current())) return { user: null, error: CHANGED, current: false }
    if (!response.ok) return { user: null, error: failure, current: true }
    const updated: unknown = await response.json()
    if (
      !updated ||
      typeof updated !== 'object' ||
      !('id' in updated) ||
      updated.id !== session.user.id ||
      !('user_metadata' in updated) ||
      !updated.user_metadata ||
      typeof updated.user_metadata !== 'object' ||
      Array.isArray(updated.user_metadata)
    )
      return { user: null, error: failure, current: await current() }
    const user = await readConsoleProfile(client, session, signal)
    if (!(await current())) return { user: null, error: CHANGED, current: false }
    if (
      !user ||
      Object.entries(data).some(
        ([key, value]) =>
          user.user_metadata[key] !== value && !(value === null && user.user_metadata[key] == null),
      )
    )
      return { user: null, error: failure, current: true }
    return { user, error: null, current: true }
  } catch {
    return { user: null, error: failure, current: await current() }
  }
}
