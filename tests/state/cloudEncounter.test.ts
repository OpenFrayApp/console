// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Encounter } from '../../src/schema/encounter.ts'
import {
  claimPlayerCode,
  loadCloudEncounter,
  saveCloudEncounter,
} from '../../src/state/cloudEncounter.ts'
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

// Pin the clock so the autosave's `updated_at` timestamp is deterministic.
const NOW = '2026-07-29T12:00:00.000Z'

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(NOW))
})

afterEach(() => {
  vi.useRealTimers()
  supa.client = null
})

/** A minimal encounter blob for exercising the autosave calls. */
function encounter(overrides: Partial<Encounter> = {}): Encounter {
  return {
    encounterId: 'enc-1',
    ownerId: 'user-1',
    round: 2,
    activeIndex: 0,
    combatants: [],
    log: [],
    ...overrides,
  }
}

describe('loadCloudEncounter', () => {
  it('returns null without a configured client (anonymous mode)', async () => {
    expect(await loadCloudEncounter()).toBeNull()
  })

  it('reads the single newest row from the encounters table', async () => {
    const enc = encounter()
    const { client, queries } = makeSupabaseStub({ data: { id: 'row-1', state: enc } })
    supa.client = client
    expect(await loadCloudEncounter()).toEqual({
      id: 'row-1',
      encounter: enc,
      playerCode: null,
    })
    expect(queries).toEqual([
      {
        table: 'encounters',
        steps: [
          ['select', 'id, state, player_code'],
          ['order', 'updated_at', { ascending: false }],
          ['limit', 1],
          ['maybeSingle'],
        ],
      },
    ])
  })

  it('carries the chosen share code back, so the link is the same on every device', async () => {
    const { client } = makeSupabaseStub({
      data: { id: 'row-1', state: encounter(), player_code: 'tuesday-game' },
    })
    supa.client = client
    expect((await loadCloudEncounter())?.playerCode).toBe('tuesday-game')
  })

  it('falls back to null on a query error', async () => {
    const { client } = makeSupabaseStub({ data: null, error: { message: 'boom' } })
    supa.client = client
    expect(await loadCloudEncounter()).toBeNull()
  })

  it('falls back to null when the user has no saved encounter', async () => {
    const { client } = makeSupabaseStub({ data: null, error: null })
    supa.client = client
    expect(await loadCloudEncounter()).toBeNull()
  })
})

describe('saveCloudEncounter', () => {
  it('echoes the passed id without a configured client, touching nothing', async () => {
    expect(await saveCloudEncounter('row-9', encounter())).toBe('row-9')
    expect(await saveCloudEncounter(null, encounter())).toBeNull()
  })

  it('with an id, updates that row with the state and a fresh updated_at', async () => {
    const enc = encounter()
    const { client, queries } = makeSupabaseStub()
    supa.client = client
    expect(await saveCloudEncounter('row-1', enc)).toBe('row-1')
    expect(queries).toEqual([
      {
        table: 'encounters',
        steps: [
          ['update', { state: enc, updated_at: NOW }],
          ['eq', 'id', 'row-1'],
        ],
      },
    ])
  })

  it('with an id, still returns that id when the update fails', async () => {
    const { client } = makeSupabaseStub({ data: null, error: { message: 'boom' } })
    supa.client = client
    expect(await saveCloudEncounter('row-1', encounter())).toBe('row-1')
  })

  it('without an id, inserts a new row and returns its generated id', async () => {
    const enc = encounter()
    const { client, queries } = makeSupabaseStub({ data: { id: 'row-2' } })
    supa.client = client
    expect(await saveCloudEncounter(null, enc)).toBe('row-2')
    expect(queries).toEqual([
      {
        table: 'encounters',
        steps: [['insert', { state: enc, updated_at: NOW }], ['select', 'id'], ['single']],
      },
    ])
  })

  it('without an id, returns null when the insert fails', async () => {
    const { client } = makeSupabaseStub({ data: null, error: { message: 'boom' } })
    supa.client = client
    expect(await saveCloudEncounter(null, encounter())).toBeNull()
  })

  it('without an id, returns null when the insert reports no row back', async () => {
    const { client } = makeSupabaseStub({ data: null, error: null })
    supa.client = client
    expect(await saveCloudEncounter(null, encounter())).toBeNull()
  })
})

describe('claimPlayerCode', () => {
  it('writes the code onto the GM`s own row', async () => {
    const { client, queries } = makeSupabaseStub()
    supa.client = client
    expect(await claimPlayerCode('row-1', 'tuesday-game')).toBe('ok')
    expect(queries).toEqual([
      {
        table: 'encounters',
        steps: [
          ['update', { player_code: 'tuesday-game' }],
          ['eq', 'id', 'row-1'],
        ],
      },
    ])
  })

  // Row-Level Security hides every other GM's row, so a lookup would call every name
  // free. The unique index is the only honest answer, and this is how it arrives.
  it('reads a unique violation as the name already being taken', async () => {
    const { client } = makeSupabaseStub({ error: { code: '23505', message: 'duplicate key' } })
    supa.client = client
    expect(await claimPlayerCode('row-1', 'dragons')).toBe('taken')
  })

  it('never reports a name free just because the write failed for another reason', async () => {
    const { client } = makeSupabaseStub({ error: { code: '42P01', message: 'no such table' } })
    supa.client = client
    expect(await claimPlayerCode('row-1', 'dragons')).toBe('failed')
  })

  it('fails rather than pretending, with no configured client', async () => {
    expect(await claimPlayerCode('row-1', 'dragons')).toBe('failed')
  })
})
