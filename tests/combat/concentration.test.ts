// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { describe, expect, it } from 'vitest'
import type { Creature } from '../../src/schema/creature.ts'
import type {
  Concentration,
  MonsterCombatant,
  PlayerCharacter,
} from '../../src/schema/combatant.ts'
import type { RandomSource } from '../../src/dice/rng.ts'
import { applyDamage } from '../../src/combat/resources.ts'
import {
  applyConcentrationResult,
  breakConcentration,
  concentrationDC,
  isConcentrating,
  rollConcentrationCheck,
  startConcentration,
} from '../../src/combat/concentration.ts'

function faceSeq(...faces: number[]): RandomSource {
  let i = 0
  return () => {
    if (i >= faces.length) throw new Error('faceSeq exhausted')
    return faces[i++] - 1
  }
}

const HOLD: Concentration = { spell: 'Hold Person', saveDc: 13, round: 1 }

function creature(): Creature {
  return {
    id: 'srd:mage',
    source: 'srd-5.2',
    name: 'Mage',
    size: 'Medium',
    type: 'humanoid',
    ac: 12,
    maxHp: 30,
    speed: { walk: 30 },
    abilities: { str: 9, dex: 14, con: 14, int: 17, wis: 12, cha: 11 },
    senses: { passivePerception: 11 },
  }
}

function monster(over: Partial<MonsterCombatant> = {}): MonsterCombatant {
  return {
    isPC: false,
    combatantId: 'm',
    creatureId: 'srd:mage',
    creature: creature(),
    label: 'Mage',
    initiative: 12,
    status: 'active',
    hp: { current: 30, max: 30, temp: 0 },
    slotsUsed: {},
    limitedUseState: {},
    legendaryRemaining: 0,
    concentration: HOLD,
    effects: [],
    visibility: { name: 'shown', hp: 'bloodied', conditions: 'shown', ac: 'hidden' },
    ...over,
  }
}

function pc(over: Partial<PlayerCharacter> = {}): PlayerCharacter {
  return {
    isPC: true,
    combatantId: 'p',
    name: 'Thalia',
    initiative: 18,
    ac: 16,
    passivePerception: 14,
    status: 'active',
    hp: { current: 30, max: 30, temp: 0 },
    concentration: HOLD,
    effects: [],
    ...over,
  }
}

describe('concentrationDC', () => {
  it('is 10 or half the damage, whichever is higher', () => {
    expect(concentrationDC(0)).toBe(10)
    expect(concentrationDC(18)).toBe(10) // half is 9
    expect(concentrationDC(22)).toBe(11)
    expect(concentrationDC(30)).toBe(15)
  })
})

describe('start/break/apply', () => {
  it('starts and replaces concentration, one at a time', () => {
    const c = startConcentration(monster({ concentration: null }), HOLD)
    expect(c.concentration).toEqual(HOLD)
    expect(isConcentrating(c)).toBe(true)
  })

  it('breaks concentration', () => {
    expect(breakConcentration(monster()).concentration).toBeNull()
  })

  it('records a manual result (Maintained keeps, Broken clears)', () => {
    expect(applyConcentrationResult(monster(), true).concentration).toEqual(HOLD)
    expect(applyConcentrationResult(monster(), false).concentration).toBeNull()
    expect(applyConcentrationResult(pc(), false).concentration).toBeNull()
  })
})

describe('rollConcentrationCheck (optional, monsters)', () => {
  it('maintains on a save at/above the DC', () => {
    // 30 damage -> DC 15; CON +2; d20 16 -> 18 maintains.
    const out = rollConcentrationCheck(monster(), 30, { rand: faceSeq(16) })
    expect(out.dc).toBe(15)
    expect(out.maintained).toBe(true)
    expect(out.combatant.concentration).toEqual(HOLD)
  })

  it('breaks on a failed save', () => {
    const out = rollConcentrationCheck(monster(), 30, { rand: faceSeq(10) }) // 12 < 15
    expect(out.maintained).toBe(false)
    expect(out.combatant.concentration).toBeNull()
  })

  it('throws for a PC (record manually)', () => {
    expect(() => rollConcentrationCheck(pc(), 10, { rand: faceSeq(10) })).toThrow()
  })
})

describe('applyDamage ends concentration on incapacitation', () => {
  it('clears it when a monster is killed', () => {
    expect(applyDamage(monster(), 30).concentration).toBeNull()
  })

  it('clears it when a PC is knocked unconscious', () => {
    const downed = applyDamage(pc({ hp: { current: 8, max: 30, temp: 0 } }), 8)
    expect(downed.status).toBe('unconscious')
    expect(downed.concentration).toBeNull()
  })

  it('keeps it when the creature survives', () => {
    expect(applyDamage(monster(), 5).concentration).toEqual(HOLD)
  })
})
