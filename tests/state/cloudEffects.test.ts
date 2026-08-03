// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { afterEach, describe, expect, it, vi } from 'vitest'
import type { EffectPreset } from '../../src/schema/preset.ts'
import {
  deleteEffectPreset,
  loadEffectPresets,
  saveEffectPreset,
  updateEffectPreset,
} from '../../src/state/cloudEffects.ts'
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

/** A minimal preset for exercising the persistence calls. */
function preset(overrides: Partial<EffectPreset> = {}): EffectPreset {
  return {
    id: 'custom:drunk',
    name: 'Drunk',
    duration: { type: 'rounds', rounds: 600 },
    parts: [
      { kind: 'condition', condition: 'Poisoned' },
      { kind: 'reminder', note: 'Hungover in the morning' },
    ],
    ...overrides,
  }
}

describe('loadEffectPresets', () => {
  it('returns [] without a configured client (anonymous mode)', async () => {
    expect(await loadEffectPresets()).toEqual([])
  })

  it('reads `data` from the effects table newest-first and unwraps the rows', async () => {
    const first = preset({ id: 'preset:a', name: 'Newest' })
    const second = preset({ id: 'preset:b', name: 'Older' })
    const { client, queries } = makeSupabaseStub({ data: [{ data: first }, { data: second }] })
    supa.client = client
    expect(await loadEffectPresets()).toEqual([first, second])
    expect(queries).toEqual([
      {
        table: 'effects',
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
    expect(await loadEffectPresets()).toEqual([])
  })

  it('upgrades a row saved before parts — the flat fields become parts on read', async () => {
    const legacy = {
      id: 'custom:old',
      name: 'Old Drunk',
      conditions: ['Poisoned'],
      modifier: null,
      note: 'Hungover in the morning',
      duration: { type: 'rounds', rounds: 600 },
    }
    const { client } = makeSupabaseStub({ data: [{ data: legacy }] })
    supa.client = client
    expect(await loadEffectPresets()).toEqual([
      {
        id: 'custom:old',
        name: 'Old Drunk',
        duration: { type: 'rounds', rounds: 600 },
        parts: [
          { kind: 'condition', condition: 'Poisoned' },
          { kind: 'reminder', note: 'Hungover in the morning' },
        ],
      },
    ])
  })

  it('turns a legacy counter preset into a counter part with a manual duration', async () => {
    const legacy = {
      id: 'custom:depth',
      name: 'Depth',
      conditions: [],
      modifier: null,
      note: 'Depth',
      duration: { type: 'counter' },
      counter: true,
    }
    const { client } = makeSupabaseStub({ data: [{ data: legacy }] })
    supa.client = client
    expect(await loadEffectPresets()).toEqual([
      {
        id: 'custom:depth',
        name: 'Depth',
        duration: { type: 'manual' },
        parts: [{ kind: 'counter', name: 'Depth' }],
      },
    ])
  })
})

describe('saveEffectPreset', () => {
  it('silently no-ops without a configured client', async () => {
    await expect(saveEffectPreset(preset())).resolves.toBeUndefined()
  })

  it('inserts one row carrying the name and the whole preset as `data`', async () => {
    const drunk = preset()
    const { client, queries } = makeSupabaseStub()
    supa.client = client
    await saveEffectPreset(drunk)
    expect(queries).toEqual([
      { table: 'effects', steps: [['insert', { name: drunk.name, data: drunk }]] },
    ])
  })
})

describe('updateEffectPreset', () => {
  it('updates only the row matched by data->>id with the new payload', async () => {
    const drunk = preset({ name: 'Very drunk' })
    const { client, queries } = makeSupabaseStub()
    supa.client = client
    await updateEffectPreset(drunk)
    expect(queries).toEqual([
      {
        table: 'effects',
        steps: [
          ['update', { name: drunk.name, data: drunk }],
          ['eq', 'data->>id', drunk.id],
        ],
      },
    ])
  })
})

describe('deleteEffectPreset', () => {
  it('silently no-ops without a configured client', async () => {
    await expect(deleteEffectPreset('custom:drunk')).resolves.toBeUndefined()
  })

  it('deletes only the row matched by data->>id', async () => {
    const { client, queries } = makeSupabaseStub()
    supa.client = client
    await deleteEffectPreset('custom:drunk')
    expect(queries).toEqual([
      { table: 'effects', steps: [['delete'], ['eq', 'data->>id', 'custom:drunk']] },
    ])
  })
})
