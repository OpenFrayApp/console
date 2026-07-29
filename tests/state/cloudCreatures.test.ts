// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Creature } from '../../src/schema/creature.ts'
import {
  deleteCustomCreature,
  loadCustomCreatures,
  saveCustomCreature,
  updateCustomCreature,
} from '../../src/state/cloudCreatures.ts'
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

/** A minimal custom creature for exercising the persistence calls. */
function creature(overrides: Partial<Creature> = {}): Creature {
  return {
    id: 'custom:goblin-chief',
    source: 'custom',
    name: 'Goblin Chief',
    size: 'Small',
    type: 'humanoid',
    ac: 15,
    maxHp: 21,
    speed: { walk: 30 },
    abilities: { str: 10, dex: 14, con: 12, int: 10, wis: 9, cha: 13 },
    senses: { passivePerception: 9 },
    ...overrides,
  }
}

describe('loadCustomCreatures', () => {
  it('returns [] without a configured client (anonymous mode)', async () => {
    expect(await loadCustomCreatures()).toEqual([])
  })

  it('reads `data` from the creatures table newest-first and unwraps the rows', async () => {
    const first = creature({ id: 'custom:a', name: 'Newest' })
    const second = creature({ id: 'custom:b', name: 'Older' })
    const { client, queries } = makeSupabaseStub({ data: [{ data: first }, { data: second }] })
    supa.client = client
    expect(await loadCustomCreatures()).toEqual([first, second])
    expect(queries).toEqual([
      {
        table: 'creatures',
        steps: [
          ['select', 'data'],
          ['order', 'updated_at', { ascending: false }],
        ],
      },
    ])
  })

  it('falls back to [] on a query error', async () => {
    const { client } = makeSupabaseStub({ data: null, error: { message: 'boom' } })
    supa.client = client
    expect(await loadCustomCreatures()).toEqual([])
  })

  it('falls back to [] when the query resolves without rows', async () => {
    const { client } = makeSupabaseStub({ data: null, error: null })
    supa.client = client
    expect(await loadCustomCreatures()).toEqual([])
  })
})

describe('saveCustomCreature', () => {
  it('silently no-ops without a configured client', async () => {
    await expect(saveCustomCreature(creature())).resolves.toBeUndefined()
  })

  it('inserts one row carrying the name and the whole creature as `data`', async () => {
    const gob = creature()
    const { client, queries } = makeSupabaseStub()
    supa.client = client
    await saveCustomCreature(gob)
    expect(queries).toEqual([
      { table: 'creatures', steps: [['insert', { name: gob.name, data: gob }]] },
    ])
  })
})

describe('updateCustomCreature', () => {
  it('silently no-ops without a configured client', async () => {
    await expect(updateCustomCreature(creature())).resolves.toBeUndefined()
  })

  it('updates only the row matched by data->>id with the new payload', async () => {
    const gob = creature({ name: 'Goblin Warchief' })
    const { client, queries } = makeSupabaseStub()
    supa.client = client
    await updateCustomCreature(gob)
    expect(queries).toEqual([
      {
        table: 'creatures',
        steps: [
          ['update', { name: gob.name, data: gob }],
          ['eq', 'data->>id', gob.id],
        ],
      },
    ])
  })
})

describe('deleteCustomCreature', () => {
  it('silently no-ops without a configured client', async () => {
    await expect(deleteCustomCreature('custom:goblin-chief')).resolves.toBeUndefined()
  })

  it('deletes only the row matched by data->>id', async () => {
    const { client, queries } = makeSupabaseStub()
    supa.client = client
    await deleteCustomCreature('custom:goblin-chief')
    expect(queries).toEqual([
      {
        table: 'creatures',
        steps: [['delete'], ['eq', 'data->>id', 'custom:goblin-chief']],
      },
    ])
  })
})
