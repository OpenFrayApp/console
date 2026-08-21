// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { describe, expect, it } from 'vitest'
import type { Creature } from '../../src/schema/creature.ts'
import type { MonsterCombatant, PlayerCharacter } from '../../src/schema/combatant.ts'
import type { Action } from '../../src/schema/action.ts'
import type { RollResult } from '../../src/dice/roll.ts'
import {
  adjustForDefense,
  attackHits,
  damageAfterDefense,
  damageAgainst,
  damageRelation,
  rollDamageComponents,
  type RolledDamage,
} from '../../src/combat/damage.ts'

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

describe('damageAfterDefense', () => {
  const blue = monster(creature())

  it('applies the relation the target has to that type', () => {
    expect(damageAfterDefense(blue, 17, 'lightning')).toBe(0)
    expect(damageAfterDefense(blue, 17, 'fire')).toBe(8)
    expect(damageAfterDefense(blue, 17, 'cold')).toBe(34)
  })

  it('passes untyped damage through — nothing for a defense to match', () => {
    expect(damageAfterDefense(blue, 17)).toBe(17)
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

/** A RollResult stub carrying only the fields the helpers read. */
function rolled(total: number, over: Partial<RollResult> = {}): RollResult {
  return { total, crit: false, fumble: false, ...over } as RollResult
}

describe('rollDamageComponents', () => {
  const action = (damage: Action['damage']): Action =>
    ({ id: 'a', name: 'Test', kind: 'melee', toHit: 4, damage, text: '' }) as Action

  it('clamps a negative damage total to zero', () => {
    const [component] = rollDamageComponents(
      action([{ formula: '1d4-10', type: 'bludgeoning' }]),
      false,
    )
    expect(component.type).toBe('bludgeoning')
    expect(component.amount).toBe(0)
  })

  it('leaves out a formula the dice engine refuses instead of throwing', () => {
    const parts = rollDamageComponents(
      action([
        { formula: 'not dice', type: 'fire' },
        { formula: '2d6+3', type: 'cold' },
      ]),
      false,
    )
    expect(parts.map((p) => p.type)).toEqual(['cold'])
    expect(parts[0].amount).toBeGreaterThanOrEqual(5)
  })
})

describe('damageAgainst', () => {
  it('applies the target defenses per component and labels each relation', () => {
    const dragon = monster(creature())
    const components: RolledDamage[] = [
      { type: 'lightning', amount: 10, result: rolled(10) },
      { type: 'fire', amount: 9, result: rolled(9) },
      { type: 'cold', amount: 5, result: rolled(5) },
      { type: 'slashing', amount: 7, result: rolled(7) },
    ]
    expect(damageAgainst(dragon, components).map((c) => [c.type, c.amount, c.label])).toEqual([
      ['lightning', 0, 'immune'],
      ['fire', 4, 'resist'],
      ['cold', 10, 'vuln'],
      ['slashing', 7, null],
    ])
  })
})

describe('attackHits', () => {
  const dragon = monster(creature()) // AC 19

  it('hits when the total meets the AC and misses below it', () => {
    expect(attackHits(rolled(19), dragon)).toBe(true)
    expect(attackHits(rolled(18), dragon)).toBe(false)
  })

  it('always hits on a crit and never on a fumble', () => {
    expect(attackHits(rolled(2, { crit: true }), dragon)).toBe(true)
    expect(attackHits(rolled(25, { fumble: true }), dragon)).toBe(false)
  })
})
