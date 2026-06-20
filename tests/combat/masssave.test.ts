// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { describe, expect, it } from 'vitest'
import type { Creature } from '../../src/schema/creature.ts'
import type {
  MonsterCombatant,
  PlayerCharacter,
} from '../../src/schema/combatant.ts'
import type { Effect } from '../../src/schema/effect.ts'
import type { RandomSource } from '../../src/dice/rng.ts'
import { flatBonus } from '../../src/combat/effects.ts'
import {
  abilityModifier,
  applySaveDamage,
  damageForResult,
  rollSave,
  saveBonus,
} from '../../src/combat/masssave.ts'

function faceSeq(...faces: number[]): RandomSource {
  let i = 0
  return () => {
    if (i >= faces.length) throw new Error('faceSeq exhausted')
    return faces[i++] - 1
  }
}

function creature(over: Partial<Creature> = {}): Creature {
  return {
    id: 'srd:goblin',
    source: 'srd-5.2',
    name: 'Goblin',
    size: 'Small',
    type: 'humanoid',
    ac: 15,
    maxHp: 30,
    speed: { walk: 30 },
    abilities: { str: 8, dex: 14, con: 10, int: 10, wis: 8, cha: 8 },
    senses: { passivePerception: 9 },
    ...over,
  }
}

function monster(over: Partial<MonsterCombatant> = {}, cr?: Creature): MonsterCombatant {
  return {
    isPC: false,
    combatantId: 'm',
    creatureId: 'srd:goblin',
    creature: cr ?? creature(),
    label: 'Goblin',
    initiative: 12,
    status: 'active',
    hp: { current: 30, max: 30, temp: 0 },
    slotsUsed: {},
    limitedUseState: {},
    legendaryRemaining: 0,
    concentration: null,
    effects: [],
    visibility: { name: 'shown', hp: 'bloodied', conditions: 'shown', ac: 'hidden' },
    ...over,
  }
}

function pc(): PlayerCharacter {
  return {
    isPC: true,
    combatantId: 'p',
    name: 'Thalia',
    initiative: 18,
    ac: 16,
    passivePerception: 14,
    status: 'active',
    hp: { current: 30, max: 30, temp: 0 },
    concentration: null,
    effects: [],
  }
}

describe('abilityModifier', () => {
  it('floors (score - 10) / 2', () => {
    expect(abilityModifier(16)).toBe(3)
    expect(abilityModifier(14)).toBe(2)
    expect(abilityModifier(10)).toBe(0)
    expect(abilityModifier(7)).toBe(-2)
  })
})

describe('saveBonus', () => {
  it('uses a monster’s proficient save when present', () => {
    expect(saveBonus(monster({}, creature({ saves: { dex: 5 } })), 'dex')).toBe(5)
  })

  it('falls back to the ability modifier', () => {
    expect(saveBonus(monster(), 'dex')).toBe(2) // dex 14
  })

  it('returns null for a PC (rolls their own)', () => {
    expect(saveBonus(pc(), 'dex')).toBeNull()
  })
})

describe('rollSave', () => {
  const request = { ability: 'dex', dc: 15, onSave: 'half' } as const

  it('passes on a total at or above the DC', () => {
    const r = rollSave(monster(), request, { rand: faceSeq(16) }) // 16 + 2 = 18
    expect(r.total).toBe(18)
    expect(r.result).toBe('save')
  })

  it('fails below the DC', () => {
    expect(rollSave(monster(), request, { rand: faceSeq(10) }).result).toBe('fail')
  })

  it('folds in a savingThrows effect (Bless)', () => {
    const blessed = monster({ effects: [flatBonus('Bless', '1d4')] as Effect[] })
    const r = rollSave(blessed, request, { rand: faceSeq(10, 3) }) // 10 + 2 + 3 = 15
    expect(r.total).toBe(15)
    expect(r.result).toBe('save')
    expect(r.applied).toContainEqual({ source: 'Bless', effect: '1d4' })
  })

  it('throws for a PC', () => {
    expect(() => rollSave(pc(), request, { rand: faceSeq(10) })).toThrow()
  })
})

describe('damageForResult', () => {
  it('failures take full damage', () => {
    expect(damageForResult(24, 'fail', 'half')).toBe(24)
  })

  it('saves take half when onSave is half', () => {
    expect(damageForResult(24, 'save', 'half')).toBe(12)
    expect(damageForResult(25, 'save', 'half')).toBe(12) // floored
  })

  it('saves take none when onSave is none or negates', () => {
    expect(damageForResult(24, 'save', 'none')).toBe(0)
    expect(damageForResult(24, 'save', 'negates')).toBe(0)
  })
})

describe('applySaveDamage', () => {
  it('applies full to a failure and half to a save', () => {
    expect(applySaveDamage(monster(), 24, 'fail', 'half').hp.current).toBe(6)
    expect(applySaveDamage(monster(), 24, 'save', 'half').hp.current).toBe(18)
  })
})
