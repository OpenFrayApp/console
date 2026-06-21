// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { describe, expect, it } from 'vitest'
import type { Creature } from '../../src/schema/creature.ts'
import type { MonsterCombatant, PlayerCharacter } from '../../src/schema/combatant.ts'
import { adjustForDefense, damageRelation } from '../../src/combat/damage.ts'

function creature(overrides: Partial<Creature> = {}): Creature {
  return {
    id: 'srd:blue-dragon',
    source: 'srd-5.2',
    name: 'Adult Blue Dragon',
    size: 'Huge',
    type: 'dragon',
    ac: 19,
    maxHp: 225,
    speed: { walk: 40, fly: 80 },
    abilities: { str: 25, dex: 10, con: 23, int: 16, wis: 15, cha: 20 },
    senses: { passivePerception: 22 },
    immunities: ['Lightning'],
    resistances: ['Fire'],
    vulnerabilities: ['Cold'],
    ...overrides,
  }
}

function monster(c: Creature): MonsterCombatant {
  return {
    isPC: false,
    combatantId: 'm',
    creatureId: c.id,
    creature: c,
    label: c.name,
    initiative: 10,
    status: 'active',
    hp: { current: c.maxHp, max: c.maxHp, temp: 0 },
    slotsUsed: {},
    spellUsesSpent: {},
    limitedUseState: {},
    legendaryRemaining: 3,
    concentration: null,
    effects: [],
    visibility: { name: 'shown', hp: 'bloodied', conditions: 'shown', ac: 'hidden' },
  }
}

const pc: PlayerCharacter = {
  isPC: true,
  combatantId: 'p',
  name: 'Thalia',
  initiative: 14,
  ac: 16,
  passivePerception: 14,
  status: 'active',
  hp: { current: 40, max: 40, temp: 0 },
  concentration: null,
  effects: [],
}

describe('damageRelation', () => {
  it('reads monster immunity, resistance, vulnerability (case-insensitive)', () => {
    const blue = monster(creature())
    expect(damageRelation(blue, 'lightning')).toBe('immune')
    expect(damageRelation(blue, 'fire')).toBe('resistant')
    expect(damageRelation(blue, 'cold')).toBe('vulnerable')
    expect(damageRelation(blue, 'slashing')).toBe('normal')
  })

  it('never auto-adjusts a PC — their defenses depend on a build we do not track', () => {
    expect(damageRelation(pc, 'fire')).toBe('normal')
    expect(damageRelation(pc, 'lightning')).toBe('normal')
  })

  it('prioritises immunity over vulnerability when both are listed', () => {
    const both = monster(creature({ immunities: ['Fire'], vulnerabilities: ['Fire'] }))
    expect(damageRelation(both, 'fire')).toBe('immune')
  })
})

describe('adjustForDefense', () => {
  it('zeroes immune, halves (rounding down) resistant, doubles vulnerable', () => {
    expect(adjustForDefense(17, 'immune')).toBe(0)
    expect(adjustForDefense(17, 'resistant')).toBe(8)
    expect(adjustForDefense(17, 'vulnerable')).toBe(34)
    expect(adjustForDefense(17, 'normal')).toBe(17)
  })

  it('clamps negatives to zero', () => {
    expect(adjustForDefense(-5, 'normal')).toBe(0)
  })
})
