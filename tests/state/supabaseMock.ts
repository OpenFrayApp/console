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
