// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  fetchShare,
  listMyShares,
  mayUseReservedByline,
  publishShare,
  resolveReport,
  unpublish,
} from '../../src/state/shares.ts'
import { makeSupabaseStub } from './supabaseMock.ts'

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
  supa.client = null
})

const template = {
  v: 1,
  name: 'Goblin ambush',
  entries: [{ ref: 'srd-5.2:goblin', count: 4, side: 'foe' }],
}

describe('publishShare', () => {
  it('inserts the payload under a drawn code and hands the code back', async () => {
    const { client, queries } = makeSupabaseStub()
    supa.client = client
    const result = await publishShare('encounter', template)
    expect(result.status).toBe('ok')
    expect(queries[0].table).toBe('shares')
    const [method, row] = queries[0].steps[0] as [string, Record<string, unknown>]
    expect(method).toBe('insert')
    expect(row.kind).toBe('encounter')
    expect(row.data).toEqual(template)
    expect(result.status === 'ok' && row.code).toBe(result.status === 'ok' ? result.code : null)
  })

  // The column defaults to auth.uid(): anonymous publishers get null, signed-in ones get
  // themselves, and a client that never sends the field can't claim to be anyone else.
  it('never sends an owner of its own', async () => {
    const { client, queries } = makeSupabaseStub()
    supa.client = client
    await publishShare('encounter', template)
    const row = (queries[0].steps[0] as [string, Record<string, unknown>])[1]
    expect(Object.keys(row).sort()).toEqual(['code', 'data', 'kind'])
  })

  it('refuses a payload too big for the column, with something the GM can act on', async () => {
    const { client, queries } = makeSupabaseStub()
    supa.client = client
    const huge = { ...template, note: 'x'.repeat(40_000) }
    expect(await publishShare('encounter', huge)).toEqual({ status: 'tooBig' })
    // Refused here, so Postgres never sees it and the GM never sees a constraint violation.
    expect(queries).toHaveLength(0)
  })

  it('draws again when two publishers collide on one code', async () => {
    const { client, queries } = makeSupabaseStub(
      { error: { code: '23505', message: 'duplicate key' } },
      { error: null },
    )
    supa.client = client
    expect((await publishShare('encounter', template)).status).toBe('ok')
    expect(queries).toHaveLength(2)
    const first = (queries[0].steps[0] as [string, Record<string, unknown>])[1].code
    const second = (queries[1].steps[0] as [string, Record<string, unknown>])[1].code
    expect(first).not.toBe(second)
  })

  it('keeps a pending deploy step apart from a real failure', async () => {
    // PGRST205 is the one that actually happens: PostgREST answers from its schema cache
    // before Postgres ever sees the statement.
    for (const code of ['42P01', '42883', 'PGRST205', 'PGRST204']) {
      const missing = makeSupabaseStub({ error: { code, message: 'missing' } })
      supa.client = missing.client
      expect(await publishShare('encounter', template)).toEqual({ status: 'unavailable' })
    }
    const broken = makeSupabaseStub({ error: { code: '40001', message: 'boom' } })
    supa.client = broken.client
    expect(await publishShare('encounter', template)).toEqual({ status: 'failed' })

    supa.client = null
    expect(await publishShare('encounter', template)).toEqual({ status: 'unavailable' })
  })
})

describe('resolveReport', () => {
  const TOKEN = '3f7a1c92-5b4e-4d81-9a63-0e2c8d5f71ab'

  it('sends the code, the token and the decision, and nothing else', async () => {
    const { client, rpcs } = makeSupabaseStub({ data: true, error: null })
    supa.client = client
    expect(await resolveReport('k7mqx3rt9p', TOKEN, 'taken_down')).toBe('ok')
    expect(rpcs[0]).toEqual({
      fn: 'resolve_report',
      args: { want: 'k7mqx3rt9p', secret: TOKEN, decision: 'taken_down' },
    })
  })

  it('carries a dismissal the same way, since both are decisions', async () => {
    // Only one of them deletes anything, but both are answers, and both are what the
    // reply to the reporter is sent from.
    const { client, rpcs } = makeSupabaseStub({ data: true, error: null })
    supa.client = client
    expect(await resolveReport('k7mqx3rt9p', TOKEN, 'dismissed')).toBe('ok')
    expect((rpcs[0].args as { decision: string }).decision).toBe('dismissed')
  })

  it('reads a token that matched nothing as wrong, not as a failure', async () => {
    // Stale, already answered, or simply not ours. One fact to the reader either way.
    const { client } = makeSupabaseStub({ data: false, error: null })
    supa.client = client
    expect(await resolveReport('k7mqx3rt9p', 'not-a-real-token', 'taken_down')).toBe('wrong')
  })

  it('reports a project without the function as unavailable', async () => {
    const { client } = makeSupabaseStub({ data: null, error: { code: 'PGRST202' } })
    supa.client = client
    expect(await resolveReport('k7mqx3rt9p', TOKEN, 'taken_down')).toBe('unavailable')
  })
})

describe('fetchShare', () => {
  // Through a function, not a select: a policy that lets a stranger read one row by code
  // would let them list every row, and these are Game-Master-authored.
  it('asks the database function for exactly one share', async () => {
    const { client, rpcs } = makeSupabaseStub({
      data: { kind: 'encounter', data: template, official: true },
    })
    supa.client = client
    expect(await fetchShare('k7mqx3rt9p')).toEqual({
      status: 'ok',
      kind: 'encounter',
      data: template,
      official: true,
    })
    expect(rpcs).toEqual([{ fn: 'share', args: { want: 'k7mqx3rt9p' } }])
  })

  // Whose encounter it is comes from the database, which knows whose account the row came
  // from. A byline is a claim anyone can type, so anything short of a true means a stranger's.
  it('treats an unknown publisher as a stranger', async () => {
    for (const official of [undefined, false, null, 'true', 1]) {
      const { client } = makeSupabaseStub({ data: { kind: 'encounter', data: template, official } })
      supa.client = client
      const found = await fetchShare('k7mqx3rt9p')
      expect(found.status === 'ok' && found.official, JSON.stringify(official)).toBe(false)
    }
  })

  it('reads a code that resolves to nothing as missing, not as a failure', async () => {
    for (const data of [null, undefined, 'nonsense', { data: template }, { kind: 'encounter' }]) {
      const { client } = makeSupabaseStub({ data })
      supa.client = client
      expect((await fetchShare('k7mqx3rt9p')).status, JSON.stringify(data)).toBe('missing')
    }
  })

  it('keeps a missing function apart from a broken request', async () => {
    const missing = makeSupabaseStub({ error: { code: 'PGRST202', message: 'no function' } })
    supa.client = missing.client
    expect(await fetchShare('k7mqx3rt9p')).toEqual({ status: 'unavailable' })

    const broken = makeSupabaseStub({ error: { code: '40001', message: 'boom' } })
    supa.client = broken.client
    expect(await fetchShare('k7mqx3rt9p')).toEqual({ status: 'failed' })
  })
})

describe('mayUseReservedByline', () => {
  // The capability lives in the database so that nothing in this repository has to name the
  // person it belongs to.
  it('asks the database, and takes only a true for an answer', async () => {
    const yes = makeSupabaseStub({ data: true })
    supa.client = yes.client
    expect(await mayUseReservedByline()).toBe(true)
    expect(yes.rpcs).toEqual([{ fn: 'may_use_reserved_byline', args: undefined }])

    for (const data of [false, null, undefined, 'yes', 1]) {
      const stub = makeSupabaseStub({ data })
      supa.client = stub.client
      expect(await mayUseReservedByline(), JSON.stringify(data)).toBe(false)
    }
  })

  it('holds the reserved list wherever the grant can’t be read', async () => {
    // A project without the function, a failed request, no client at all: all of them mean
    // the names stay reserved. The capability is only ever lifted deliberately.
    const missing = makeSupabaseStub({ error: { code: 'PGRST202', message: 'no function' } })
    supa.client = missing.client
    expect(await mayUseReservedByline()).toBe(false)

    const broken = makeSupabaseStub({ error: { code: '40001', message: 'boom' } })
    supa.client = broken.client
    expect(await mayUseReservedByline()).toBe(false)

    supa.client = null
    expect(await mayUseReservedByline()).toBe(false)
  })
})

describe('listMyShares and unpublish', () => {
  it('lists the publisher’s own links without dragging every cast back', async () => {
    const { client, queries } = makeSupabaseStub({
      data: [
        {
          code: 'k7mqx3rt9p',
          kind: 'encounter',
          created_at: '2026-08-11T20:00:00.000Z',
          name: 'Goblin ambush',
        },
      ],
    })
    supa.client = client
    expect(await listMyShares()).toEqual({
      status: 'ok',
      shares: [
        {
          code: 'k7mqx3rt9p',
          kind: 'encounter',
          name: 'Goblin ambush',
          createdAt: '2026-08-11T20:00:00.000Z',
        },
      ],
    })
    expect(queries[0].steps[0]).toEqual(['select', 'code, kind, created_at, name:data->>name'])
  })

  it('names a shared creature by its kind, since its template has no name field', async () => {
    // `data->>name` comes back null for a creature template. The row still has to say what
    // it is, or a list of links reads as a column of Untitled.
    const { client } = makeSupabaseStub({
      data: [{ code: 'abcdefghjk', kind: 'creature', created_at: '2026-08-11T20:00:00.000Z' }],
    })
    supa.client = client
    const result = await listMyShares()
    expect(result.status === 'ok' && result.shares[0].kind).toBe('creature')
  })

  it('takes a link down by its code', async () => {
    const { client, queries } = makeSupabaseStub()
    supa.client = client
    expect(await unpublish('k7mqx3rt9p')).toBe('ok')
    expect(queries[0].steps).toEqual([['delete'], ['eq', 'code', 'k7mqx3rt9p']])
  })
})
