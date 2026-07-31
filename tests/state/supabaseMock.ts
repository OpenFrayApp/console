// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

/** The `{ data, error }` envelope a stubbed Supabase query resolves to. */
export interface QueryResult {
  data?: unknown
  error?: unknown
}

/** One `from()` call the stub captured: the table plus every chained step, in order. */
export interface RecordedQuery {
  table: string
  steps: [method: string, ...args: unknown[]][]
}

const CHAIN_METHODS = [
  'select',
  'insert',
  'update',
  'delete',
  'upsert',
  'eq',
  'order',
  'limit',
  'maybeSingle',
  'single',
] as const

/**
 * A chainable, awaitable stand-in for the Supabase query builder. Each `from()`
 * opens a fresh recorded query and consumes the next queued result (defaulting to
 * an empty success), so tests can pin the table, the chained filters, and the
 * exact payload written — the shapes the RLS boundary depends on.
 */
export function makeSupabaseStub(...results: QueryResult[]) {
  const queries: RecordedQuery[] = []
  const from = (table: string) => {
    const query: RecordedQuery = { table, steps: [] }
    queries.push(query)
    const result = results.shift() ?? { data: null, error: null }
    const chain: Record<string, unknown> = {
      then: (
        onFulfilled?: (value: QueryResult) => unknown,
        onRejected?: (reason: unknown) => unknown,
      ) => Promise.resolve(result).then(onFulfilled, onRejected),
    }
    for (const method of CHAIN_METHODS) {
      chain[method] = (...args: unknown[]) => {
        query.steps.push([method, ...args])
        return chain
      }
    }
    return chain
  }
  return { client: { from }, queries }
}

/** One `send()` the channel stub captured. */
export interface RecordedSend {
  event: string
  payload: unknown
}

/** A stand-in for a realtime channel that records what was sent and can replay events in. */
export interface StubChannel {
  name: string
  sends: RecordedSend[]
  tracked: unknown[]
  removed: boolean
  /** Presence keys the stub reports; tests set this to add or drop the GM. */
  presence: Record<string, unknown[]>
  /** Drive the subscribe callback, as the server would once the socket is up. */
  ready: () => void
  /** Deliver a broadcast to this channel's handler, as another client would. */
  emit: (event: string, payload?: unknown) => void
  /** Fire a presence event after setting `presence`. */
  emitPresence: (event: 'sync' | 'join' | 'leave') => void
}

/**
 * A chainable stand-in for `supabase.channel()`. Realtime is where the shared player
 * view lives, so tests need to pin what actually goes over the wire — the channel
 * name, every payload sent, and how the hooks answer events coming back.
 */
export function makeRealtimeStub() {
  const channels: StubChannel[] = []
  const channel = (name: string) => {
    const broadcast = new Map<string, (msg: { payload: unknown }) => void>()
    const presenceHandlers = new Map<string, () => void>()
    const stub: StubChannel = {
      name,
      sends: [],
      tracked: [],
      removed: false,
      presence: {},
      ready: () => {},
      emit: (event, payload = {}) => broadcast.get(event)?.({ payload }),
      emitPresence: (event) => presenceHandlers.get(event)?.(),
    }
    channels.push(stub)
    const api = {
      on: (kind: string, opts: { event: string }, handler: (msg: { payload: unknown }) => void) => {
        if (kind === 'broadcast') broadcast.set(opts.event, handler)
        else presenceHandlers.set(opts.event, handler as unknown as () => void)
        return api
      },
      subscribe: (cb?: (status: string) => void) => {
        stub.ready = () => cb?.('SUBSCRIBED')
        return api
      },
      send: ({ event, payload }: { event: string; payload: unknown }) => {
        stub.sends.push({ event, payload })
        return Promise.resolve('ok')
      },
      track: (state: unknown) => {
        stub.tracked.push(state)
        return Promise.resolve('ok')
      },
      presenceState: () => stub.presence,
    }
    return api
  }
  const removeChannel = (ch: { presenceState: () => Record<string, unknown[]> }) => {
    const found = channels.find((c) => c.presence === ch.presenceState())
    if (found) found.removed = true
    return Promise.resolve('ok')
  }
  return { client: { channel, removeChannel }, channels }
}
