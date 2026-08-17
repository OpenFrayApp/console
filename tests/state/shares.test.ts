// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchShare, listMyShares, publishShare, unpublish } from '../../src/state/shares.ts'
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

describe('fetchShare', () => {
  // Through a function, not a select: a policy that lets a stranger read one row by code
  // would let them list every row, and these are Game-Master-authored.
  it('asks the database function for exactly one share', async () => {
    const { client, rpcs } = makeSupabaseStub({ data: { kind: 'encounter', data: template } })
    supa.client = client
    expect(await fetchShare('k7mqx3rt9p')).toEqual({
      status: 'ok',
      kind: 'encounter',
      data: template,
    })
    expect(rpcs).toEqual([{ fn: 'share', args: { want: 'k7mqx3rt9p' } }])
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

describe('listMyShares and unpublish', () => {
  it('lists the publisher’s own links without dragging every cast back', async () => {
    const { client, queries } = makeSupabaseStub({
      data: [{ code: 'k7mqx3rt9p', created_at: '2026-08-11T20:00:00.000Z', name: 'Goblin ambush' }],
    })
    supa.client = client
    expect(await listMyShares()).toEqual({
      status: 'ok',
      shares: [
        { code: 'k7mqx3rt9p', name: 'Goblin ambush', createdAt: '2026-08-11T20:00:00.000Z' },
      ],
    })
    expect(queries[0].steps[0]).toEqual(['select', 'code, created_at, name:data->>name'])
  })

  it('takes a link down by its code', async () => {
    const { client, queries } = makeSupabaseStub()
    supa.client = client
    expect(await unpublish('k7mqx3rt9p')).toBe('ok')
    expect(queries[0].steps).toEqual([['delete'], ['eq', 'code', 'k7mqx3rt9p']])
  })
})
