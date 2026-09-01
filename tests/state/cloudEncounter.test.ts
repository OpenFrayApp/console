// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Encounter } from '../../src/schema/encounter.ts'
import {
  acquireCloudWriter,
  claimPlayerCode,
  deleteSavedFight,
  listSavedFights,
  loadCloudEncounter,
  loadSavedFight,
  renameSavedFight,
  saveCloudEncounter,
  saveFight,
  takeOverCloudWriter,
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
  it('reports a failure without a configured client, never an empty account', async () => {
    expect(await loadCloudEncounter()).toEqual({ status: 'failed' })
  })

  it('reads the single newest live row from the encounters table', async () => {
    const enc = encounter()
    const { client, queries } = makeSupabaseStub({
      data: { id: 'row-1', state: enc, revision: 4, updated_at: NOW },
    })
    supa.client = client
    expect(await loadCloudEncounter()).toEqual({
      status: 'loaded',
      id: 'row-1',
      encounter: enc,
      playerCode: null,
      revision: 4,
      updatedAt: NOW,
    })
    // The `kind` filter is what keeps a saved fight from being mistaken for the session in
    // progress now that both live in this table.
    expect(queries).toEqual([
      {
        table: 'encounters',
        steps: [
          ['select', 'id, state, player_code, revision, updated_at'],
          ['order', 'updated_at', { ascending: false }],
          ['limit', 1],
          ['eq', 'kind', 'live'],
          ['maybeSingle'],
        ],
      },
    ])
  })

  it('keeps the live-row filter when only the revision column is pending', async () => {
    const enc = encounter()
    const { client, queries } = makeSupabaseStub(
      { data: null, error: { code: 'PGRST204', message: "Could not find the 'revision' column" } },
      { data: { id: 'row-1', state: enc } },
    )
    supa.client = client

    expect(await loadCloudEncounter()).toMatchObject({ status: 'loaded', id: 'row-1' })
    expect(queries).toHaveLength(2)
    expect(queries[1].steps).toContainEqual(['eq', 'kind', 'live'])
  })

  // Going dark on the GM's fight while an older schema is still deployed would be the
  // worst failure, so the loader drops `kind` only after proving that column is absent too.
  it('reads again without the filter when the kind column isn’t there yet', async () => {
    const enc = encounter()
    const missing = { code: 'PGRST204', message: 'missing column' }
    const { client, queries } = makeSupabaseStub(
      { data: null, error: missing },
      { data: null, error: missing },
      { data: { id: 'row-1', state: enc } },
    )
    supa.client = client
    expect(await loadCloudEncounter()).toMatchObject({ status: 'loaded', id: 'row-1' })
    expect(queries).toHaveLength(3)
    expect(queries[2].steps).not.toContainEqual(['eq', 'kind', 'live'])
  })

  it('still reports a real failure as failed rather than retrying forever', async () => {
    const { client, queries } = makeSupabaseStub({
      data: null,
      error: { code: '40001', message: 'serialization' },
    })
    supa.client = client
    expect(await loadCloudEncounter()).toEqual({ status: 'failed' })
    expect(queries).toHaveLength(1)
  })

  it('carries the chosen share code back, so the link is the same on every device', async () => {
    const { client } = makeSupabaseStub({
      data: { id: 'row-1', state: encounter(), player_code: 'tuesday-game' },
    })
    supa.client = client
    const res = await loadCloudEncounter()
    expect(res.status === 'loaded' && res.playerCode).toBe('tuesday-game')
  })

  // These two used to be the same answer, and conflating them is what turned one
  // failed read into an orphaned encounter plus a duplicate row.
  it('reports a failed read as failed, never as an empty account', async () => {
    const { client } = makeSupabaseStub({ data: null, error: { message: 'boom' } })
    supa.client = client
    expect(await loadCloudEncounter()).toEqual({ status: 'failed' })
  })

  it('reports a genuinely empty account as empty', async () => {
    const { client } = makeSupabaseStub({ data: null, error: null })
    supa.client = client
    expect(await loadCloudEncounter()).toEqual({ status: 'empty' })
  })
})

describe('revisioned cloud persistence', () => {
  it('claims and explicitly takes over writer authority through owner-scoped functions', async () => {
    const { client, rpcs } = makeSupabaseStub(
      { data: { status: 'acquired', revision: 4, leaseToken: 'lease-a' } },
      { data: { status: 'acquired', revision: 4, leaseToken: 'lease-b' } },
    )
    supa.client = client

    await expect(acquireCloudWriter('row-1', 'writer-a')).resolves.toEqual({
      status: 'acquired',
      revision: 4,
      leaseToken: 'lease-a',
    })
    await expect(takeOverCloudWriter('row-1', 'writer-b')).resolves.toEqual({
      status: 'acquired',
      revision: 4,
      leaseToken: 'lease-b',
    })
    expect(rpcs).toEqual([
      {
        fn: 'claim_encounter_writer',
        args: { want_encounter: 'row-1', want_writer: 'writer-a' },
      },
      {
        fn: 'takeover_encounter_writer',
        args: { want_encounter: 'row-1', want_writer: 'writer-b' },
      },
    ])
  })

  it.each([
    ['saved', { status: 'saved', id: 'row-1', revision: 5, leaseToken: 'lease-a' }],
    ['stale', { status: 'stale', revision: 6 }],
    ['lease-lost', { status: 'lease-lost', revision: 4 }],
  ] as const)('preserves the database %s write outcome', async (_name, result) => {
    const enc = encounter()
    const { client, rpcs } = makeSupabaseStub({ data: result })
    supa.client = client

    await expect(saveCloudEncounter('owner-a', 'row-1', 4, 'writer-a', enc, NOW)).resolves.toEqual(
      result,
    )
    expect(rpcs).toEqual([
      {
        fn: 'save_encounter_revision',
        args: {
          want_owner: 'owner-a',
          want_encounter: 'row-1',
          expected_revision: 4,
          want_writer: 'writer-a',
          want_state: enc,
          want_updated_at: NOW,
        },
      },
    ])
  })

  it('distinguishes expired identity from provider failure', async () => {
    const expired = makeSupabaseStub({ error: { code: '28000', message: 'expired' } })
    supa.client = expired.client
    await expect(
      saveCloudEncounter('owner-a', 'row-1', 4, 'writer-a', encounter(), NOW),
    ).resolves.toEqual({
      status: 'identity-expired',
    })

    const failed = makeSupabaseStub({ error: { code: '40001', message: 'provider failed' } })
    supa.client = failed.client
    await expect(
      saveCloudEncounter('owner-a', 'row-1', 4, 'writer-a', encounter(), NOW),
    ).resolves.toEqual({
      status: 'failed',
    })
  })

  it('reports provider failure without a configured client or a valid function result', async () => {
    await expect(
      saveCloudEncounter('owner-a', 'row-9', 1, 'writer-a', encounter(), NOW),
    ).resolves.toEqual({ status: 'failed' })

    const { client } = makeSupabaseStub({ data: null })
    supa.client = client
    await expect(
      saveCloudEncounter('owner-a', 'row-9', 1, 'writer-a', encounter(), NOW),
    ).resolves.toEqual({ status: 'failed' })
  })
})

describe('saved fights', () => {
  it('lists the saved rows, newest first, without dragging their blobs along', async () => {
    const { client, queries } = makeSupabaseStub({
      data: [
        { id: 'row-2', name: 'After the boss', campaign_id: 'camp-1', updated_at: NOW },
        { id: 'row-3', name: null, campaign_id: null, updated_at: NOW },
      ],
    })
    supa.client = client
    expect(await listSavedFights()).toEqual({
      status: 'ok',
      fights: [
        { id: 'row-2', name: 'After the boss', campaignId: 'camp-1', savedAt: NOW },
        { id: 'row-3', name: 'Untitled', campaignId: null, savedAt: NOW },
      ],
    })
    // The list reads four columns, not `state`: a session's log can be hundreds of
    // kilobytes, and none of it is needed to draw a row.
    expect(queries).toEqual([
      {
        table: 'encounters',
        steps: [
          ['select', 'id, name, campaign_id, updated_at'],
          ['eq', 'kind', 'saved'],
          ['order', 'updated_at', { ascending: false }],
        ],
      },
    ])
  })

  // "Nothing saved yet" and "the SQL hasn't been run" are different sentences to a GM, and
  // an empty list would tell the second one a comfortable lie.
  it('keeps an empty account apart from a project without the columns', async () => {
    const { client } = makeSupabaseStub({ data: [] })
    supa.client = client
    expect(await listSavedFights()).toEqual({ status: 'ok', fights: [] })

    for (const code of ['42703', '42P01']) {
      const missing = makeSupabaseStub({ data: null, error: { code, message: 'missing' } })
      supa.client = missing.client
      expect(await listSavedFights()).toEqual({ status: 'unavailable' })
    }

    const broken = makeSupabaseStub({ data: null, error: { code: '40001', message: 'boom' } })
    supa.client = broken.client
    expect(await listSavedFights()).toEqual({ status: 'failed' })
  })

  it('saves the whole blob as a new row, so two saves are two things to come back to', async () => {
    const enc = encounter()
    const { client, queries } = makeSupabaseStub()
    supa.client = client
    expect(await saveFight('Before the boss', enc, 'camp-1')).toBe('ok')
    expect(queries).toEqual([
      {
        table: 'encounters',
        steps: [
          [
            'insert',
            {
              kind: 'saved',
              name: 'Before the boss',
              campaign_id: 'camp-1',
              state: enc,
              updated_at: NOW,
            },
          ],
        ],
      },
    ])
  })

  // The table was built one-row-per-account. A saved fight is by definition a second row,
  // so a unique violation here is that old index still standing — a deploy step, not a
  // passing failure, and no amount of retrying fixes it.
  it('reads a unique violation as the one-row-per-account index still being in place', async () => {
    const { client } = makeSupabaseStub({ error: { code: '23505', message: 'duplicate key' } })
    supa.client = client
    expect(await saveFight('Before the boss', encounter(), null)).toBe('unavailable')
  })

  it('tells the GM a save couldn’t land, and whether trying again would help', async () => {
    const missing = makeSupabaseStub({ error: { code: '42703', message: 'missing' } })
    supa.client = missing.client
    expect(await saveFight('x', encounter(), null)).toBe('unavailable')

    const broken = makeSupabaseStub({ error: { code: '40001', message: 'boom' } })
    supa.client = broken.client
    expect(await saveFight('x', encounter(), null)).toBe('failed')

    supa.client = null
    expect(await saveFight('x', encounter(), null)).toBe('unavailable')
  })

  it('reads one saved blob back by id', async () => {
    const enc = encounter({ round: 5 })
    const { client, queries } = makeSupabaseStub({ data: { state: enc } })
    supa.client = client
    expect(await loadSavedFight('row-2')).toEqual(enc)
    expect(queries[0].steps).toEqual([
      ['select', 'state'],
      ['eq', 'id', 'row-2'],
      ['eq', 'kind', 'saved'],
      ['maybeSingle'],
    ])
  })

  it('returns nothing for a saved fight that’s gone, rather than a half-read board', async () => {
    const { client } = makeSupabaseStub({ data: null, error: { message: 'boom' } })
    supa.client = client
    expect(await loadSavedFight('row-2')).toBeNull()
  })

  // Row-Level Security scopes these to the owner, but the owner's own session is exactly
  // who could delete or rename the wrong row — so both are pinned to `kind = 'saved'` and
  // can never reach the live fight.
  it('renames and deletes only saved rows, never the live one', async () => {
    const rename = makeSupabaseStub()
    supa.client = rename.client
    expect(await renameSavedFight('row-2', 'Ambush, take two')).toBe('ok')
    expect(rename.queries[0].steps).toEqual([
      ['update', { name: 'Ambush, take two' }],
      ['eq', 'id', 'row-2'],
      ['eq', 'kind', 'saved'],
    ])

    const remove = makeSupabaseStub()
    supa.client = remove.client
    expect(await deleteSavedFight('row-2')).toBe('ok')
    expect(remove.queries[0].steps).toEqual([
      ['delete'],
      ['eq', 'id', 'row-2'],
      ['eq', 'kind', 'saved'],
    ])
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

  it('never reports a name free just because the write failed', async () => {
    const { client } = makeSupabaseStub({ error: { code: '40001', message: 'serialization' } })
    supa.client = client
    expect(await claimPlayerCode('row-1', 'dragons')).toBe('failed')
  })

  // The column is added by hand at deploy time, so a project that hasn't had the SQL
  // run reports the whole feature missing rather than telling the GM to try again.
  it('reads a missing column or table as the feature not being set up', async () => {
    // Both dialects: Postgres raises 42703/42P01, PostgREST answers PGRST204/PGRST205 from
    // its schema cache — and in practice the cache answers first.
    for (const code of ['42703', '42P01', 'PGRST204', 'PGRST205']) {
      const { client } = makeSupabaseStub({ error: { code, message: 'missing' } })
      supa.client = client
      expect(await claimPlayerCode('row-1', 'dragons')).toBe('unavailable')
    }
  })

  it('reports unavailable, not a failure, with no configured client', async () => {
    expect(await claimPlayerCode('row-1', 'dragons')).toBe('unavailable')
  })
})
