// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Spell } from '../../src/schema/spell.ts'
import {
  deleteCustomSpell,
  loadCustomSpells,
  saveCustomSpell,
  updateCustomSpell,
} from '../../src/state/cloudSpells.ts'
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

/** A minimal custom spell for exercising the persistence calls. */
function spell(overrides: Partial<Spell> = {}): Spell {
  return {
    id: 'custom:arcane-spark',
    source: 'custom',
    name: 'Arcane Spark',
    level: 1,
    school: 'evocation',
    castingTime: '1 action',
    range: '60 feet',
    components: { verbal: true, somatic: true, material: false },
    duration: 'Instantaneous',
    concentration: false,
    ritual: false,
    text: 'A spark of raw magic arcs to the target.',
    ...overrides,
  }
}

describe('loadCustomSpells', () => {
  it('returns [] without a configured client (anonymous mode)', async () => {
    expect(await loadCustomSpells()).toEqual([])
  })

  it('reads `data` from the spells table newest-first and unwraps the rows', async () => {
    const first = spell({ id: 'custom:a', name: 'Newest' })
    const second = spell({ id: 'custom:b', name: 'Older' })
    const { client, queries } = makeSupabaseStub({ data: [{ data: first }, { data: second }] })
    supa.client = client
    expect(await loadCustomSpells()).toEqual([first, second])
    expect(queries).toEqual([
      {
        table: 'spells',
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
    expect(await loadCustomSpells()).toEqual([])
  })

  it('falls back to [] when the query resolves without rows', async () => {
    const { client } = makeSupabaseStub({ data: null, error: null })
    supa.client = client
    expect(await loadCustomSpells()).toEqual([])
  })
})

describe('saveCustomSpell', () => {
  it('silently no-ops without a configured client', async () => {
    await expect(saveCustomSpell(spell())).resolves.toBeUndefined()
  })

  it('inserts one row carrying the name and the whole spell as `data`', async () => {
    const spark = spell()
    const { client, queries } = makeSupabaseStub()
    supa.client = client
    await saveCustomSpell(spark)
    expect(queries).toEqual([
      { table: 'spells', steps: [['insert', { name: spark.name, data: spark }]] },
    ])
  })
})

describe('updateCustomSpell', () => {
  it('silently no-ops without a configured client', async () => {
    await expect(updateCustomSpell(spell())).resolves.toBeUndefined()
  })

  it('updates only the row matched by data->>id with the new payload', async () => {
    const spark = spell({ name: 'Greater Arcane Spark' })
    const { client, queries } = makeSupabaseStub()
    supa.client = client
    await updateCustomSpell(spark)
    expect(queries).toEqual([
      {
        table: 'spells',
        steps: [
          ['update', { name: spark.name, data: spark }],
          ['eq', 'data->>id', spark.id],
        ],
      },
    ])
  })
})

describe('deleteCustomSpell', () => {
  it('silently no-ops without a configured client', async () => {
    await expect(deleteCustomSpell('custom:arcane-spark')).resolves.toBeUndefined()
  })

  it('deletes only the row matched by data->>id', async () => {
    const { client, queries } = makeSupabaseStub()
    supa.client = client
    await deleteCustomSpell('custom:arcane-spark')
    expect(queries).toEqual([
      {
        table: 'spells',
        steps: [['delete'], ['eq', 'data->>id', 'custom:arcane-spark']],
      },
    ])
  })
})
