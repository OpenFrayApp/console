// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { RosterPc } from '../../src/schema/roster.ts'
import {
  deleteRosterPc,
  loadRosterPcs,
  saveRosterPc,
  updateRosterPc,
} from '../../src/state/cloudPlayers.ts'
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

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  supa.client = null
  vi.restoreAllMocks()
})

/** A minimal roster PC for exercising the persistence calls. */
function pc(overrides: Partial<RosterPc> = {}): RosterPc {
  return { id: 'pc-1', name: 'Yara', ac: 16, maxHp: 27, ...overrides }
}

describe('loadRosterPcs', () => {
  it('returns [] without a configured client (anonymous mode)', async () => {
    expect(await loadRosterPcs()).toEqual([])
  })

  it('reads `data` from the players table newest-first and unwraps the rows', async () => {
    const first = pc({ id: 'pc-a', name: 'Newest' })
    const second = pc({ id: 'pc-b', name: 'Older' })
    const { client, queries } = makeSupabaseStub({ data: [{ data: first }, { data: second }] })
    supa.client = client
    expect(await loadRosterPcs()).toEqual([first, second])
    expect(queries).toEqual([
      {
        table: 'players',
        steps: [
          ['select', 'data'],
          ['order', 'updated_at', { ascending: false }],
        ],
      },
    ])
    expect(console.error).not.toHaveBeenCalled()
  })

  it('falls back to [] on a query error, logging the failure', async () => {
    const error = { message: 'boom' }
    const { client } = makeSupabaseStub({ data: null, error })
    supa.client = client
    expect(await loadRosterPcs()).toEqual([])
    expect(console.error).toHaveBeenCalledWith('[openfray] loading roster PC failed', error)
  })

  it('falls back to [] when the query resolves without rows', async () => {
    const { client } = makeSupabaseStub({ data: null, error: null })
    supa.client = client
    expect(await loadRosterPcs()).toEqual([])
    expect(console.error).not.toHaveBeenCalled()
  })
})

describe('saveRosterPc', () => {
  it('silently no-ops without a configured client', async () => {
    await expect(saveRosterPc(pc())).resolves.toBeUndefined()
  })

  it('inserts one row carrying the name and the whole PC as `data`', async () => {
    const yara = pc()
    const { client, queries } = makeSupabaseStub()
    supa.client = client
    await saveRosterPc(yara)
    expect(queries).toEqual([
      { table: 'players', steps: [['insert', { name: yara.name, data: yara }]] },
    ])
    expect(console.error).not.toHaveBeenCalled()
  })

  it('logs a write failure without throwing', async () => {
    const error = { message: 'RLS says no' }
    const { client } = makeSupabaseStub({ data: null, error })
    supa.client = client
    await expect(saveRosterPc(pc())).resolves.toBeUndefined()
    expect(console.error).toHaveBeenCalledWith('[openfray] saving roster PC failed', error)
  })
})

describe('updateRosterPc', () => {
  it('silently no-ops without a configured client', async () => {
    await expect(updateRosterPc(pc())).resolves.toBeUndefined()
  })

  it('updates only the row matched by data->>id with the new payload', async () => {
    const yara = pc({ name: 'Yara the Bold', maxHp: 34 })
    const { client, queries } = makeSupabaseStub()
    supa.client = client
    await updateRosterPc(yara)
    expect(queries).toEqual([
      {
        table: 'players',
        steps: [
          ['update', { name: yara.name, data: yara }],
          ['eq', 'data->>id', yara.id],
        ],
      },
    ])
  })

  it('logs a write failure without throwing', async () => {
    const error = { message: 'boom' }
    const { client } = makeSupabaseStub({ data: null, error })
    supa.client = client
    await expect(updateRosterPc(pc())).resolves.toBeUndefined()
    expect(console.error).toHaveBeenCalledWith('[openfray] updating roster PC failed', error)
  })
})

describe('deleteRosterPc', () => {
  it('silently no-ops without a configured client', async () => {
    await expect(deleteRosterPc('pc-1')).resolves.toBeUndefined()
  })

  it('deletes only the row matched by data->>id', async () => {
    const { client, queries } = makeSupabaseStub()
    supa.client = client
    await deleteRosterPc('pc-1')
    expect(queries).toEqual([
      {
        table: 'players',
        steps: [['delete'], ['eq', 'data->>id', 'pc-1']],
      },
    ])
  })

  it('logs a delete failure without throwing', async () => {
    const error = { message: 'boom' }
    const { client } = makeSupabaseStub({ data: null, error })
    supa.client = client
    await expect(deleteRosterPc('pc-1')).resolves.toBeUndefined()
    expect(console.error).toHaveBeenCalledWith('[openfray] deleting roster PC failed', error)
  })
})
