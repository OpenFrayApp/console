// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { describe, expect, it } from 'vitest'
import type { Spell } from '../../src/schema/spell.ts'
import {
  damageFormula,
  damageTypes,
  damageVariants,
} from '../../src/combat/casting.ts'

const base = {
  source: 'srd-5.2',
  school: 'Evocation',
  castingTime: 'action',
  range: '150 feet',
  components: { verbal: true, somatic: true, material: false },
  duration: 'instantaneous',
  concentration: false,
  ritual: false,
  text: '',
} as const

const FIREBALL: Spell = {
  ...base,
  id: 'srd-5.2:fireball',
  name: 'Fireball',
  level: 3,
  mechanics: {
    damage: [{ formula: '8d6', type: 'fire' }],
    save: { ability: 'dex', onSave: 'half' },
    scaling: [
      { level: 4, by: 'slot', damage: [{ formula: '9d6', type: 'fire' }] },
      { level: 5, by: 'slot', damage: [{ formula: '10d6', type: 'fire' }] },
    ],
  },
}

const FIRE_BOLT: Spell = {
  ...base,
  id: 'srd-5.2:fire-bolt',
  name: 'Fire Bolt',
  level: 0,
  mechanics: {
    damage: [{ formula: '1d10', type: 'fire' }],
    attackRoll: true,
    scaling: [{ level: 5, by: 'character', damage: [{ formula: '2d10', type: 'fire' }] }],
  },
}

const HOLD_PERSON: Spell = {
  ...base,
  id: 'srd-5.2:hold-person',
  name: 'Hold Person',
  level: 2,
  mechanics: { save: { ability: 'wis', onSave: 'negates' } },
}

describe('damageVariants', () => {
  it('lists the base level then each slot upcast', () => {
    expect(damageVariants(FIREBALL)).toEqual([
      { key: 'base', label: 'Level 3', damage: [{ formula: '8d6', type: 'fire' }] },
      { key: 'slot-4', label: 'Slot 4', damage: [{ formula: '9d6', type: 'fire' }] },
      { key: 'slot-5', label: 'Slot 5', damage: [{ formula: '10d6', type: 'fire' }] },
    ])
  })

  it('labels a cantrip and its caster-level scaling', () => {
    const variants = damageVariants(FIRE_BOLT)
    expect(variants[0]).toEqual({
      key: 'base',
      label: 'Cantrip',
      damage: [{ formula: '1d10', type: 'fire' }],
    })
    expect(variants[1].label).toBe('Caster level 5')
  })

  it('is empty for a spell with no typed damage', () => {
    expect(damageVariants(HOLD_PERSON)).toEqual([])
  })
})

describe('damageFormula', () => {
  it('combines components into one rollable formula', () => {
    expect(damageFormula([{ formula: '8d6', type: 'fire' }])).toBe('8d6')
    expect(
      damageFormula([
        { formula: '2d6', type: 'slashing' },
        { formula: '1d8', type: 'acid' },
      ]),
    ).toBe('2d6+1d8')
  })
})

describe('damageTypes', () => {
  it('returns the distinct types', () => {
    expect(
      damageTypes([
        { formula: '2d6', type: 'fire' },
        { formula: '1d8', type: 'fire' },
      ]),
    ).toEqual(['fire'])
  })
})
