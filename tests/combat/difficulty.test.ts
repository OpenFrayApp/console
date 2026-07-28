// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { describe, expect, it } from 'vitest'
import type { Combatant } from '../../src/schema/combatant.ts'
import { assessEncounter, estimateLevel, estimateXp } from '../../src/combat/difficulty.ts'

const pc = (over: Record<string, unknown> = {}): Combatant =>
  ({
    isPC: true,
    kind: 'pc',
    combatantId: crypto.randomUUID(),
    name: 'Hero',
    ac: 16,
    initiative: 0,
    status: 'active',
    hp: { current: 40, max: 40, temp: 0 },
    concentration: null,
    effects: [],
    ...over,
  }) as unknown as Combatant

const quick = (over: Record<string, unknown> = {}): Combatant =>
  pc({ kind: 'quick', name: 'Guard', ac: 14, hp: { current: 20, max: 20, temp: 0 }, ...over })

const monster = (xp: number, over: Record<string, unknown> = {}): Combatant =>
  ({
    isPC: false,
    combatantId: crypto.randomUUID(),
    creatureId: 'srd:goblin',
    creature: { id: 'srd:goblin', ac: 15, maxHp: 7, xp },
    label: 'Goblin',
    initiative: 0,
    status: 'active',
    hp: { current: 7, max: 7, temp: 0 },
    slotsUsed: {},
    spellUsesSpent: {},
    limitedUseState: {},
    legendaryRemaining: 0,
    concentration: null,
    effects: [],
    visibility: { name: 'shown', hp: 'bloodied', conditions: 'shown', ac: 'hidden' },
    ...over,
  }) as unknown as Combatant

/** Four players whose hit points read as a level-5 party. */
const party = () => [
  pc({
    hp: { current: 49, max: 49, temp: 0 },
    abilities: { str: 16, dex: 12, con: 16, int: 10, wis: 12, cha: 8 },
  }),
  pc({
    hp: { current: 38, max: 38, temp: 0 },
    abilities: { str: 12, dex: 14, con: 14, int: 10, wis: 16, cha: 10 },
  }),
  pc({
    hp: { current: 33, max: 33, temp: 0 },
    abilities: { str: 10, dex: 18, con: 12, int: 12, wis: 12, cha: 14 },
  }),
  pc({
    hp: { current: 27, max: 27, temp: 0 },
    abilities: { str: 8, dex: 14, con: 12, int: 18, wis: 12, cha: 10 },
  }),
]

describe('estimateLevel', () => {
  it('reads a character back to the level their hit points imply', () => {
    // Fighter, d10 + CON 16: 13 at 1st, +9 a level.
    expect(estimateLevel(49, 16)).toBe(6)
    // Cleric, d8 + CON 14: 10 at 1st, +7 a level.
    expect(estimateLevel(38, 14)).toBe(5)
    // Wizard, d6 + CON 12: 7 at 1st, +5 a level.
    expect(estimateLevel(27, 12)).toBe(4)
  })

  it('falls back to an average Constitution when the GM recorded none', () => {
    expect(estimateLevel(38)).toBe(5)
  })

  it('stays inside 1–20 for very low and very high hit points', () => {
    expect(estimateLevel(4, 10)).toBe(1)
    expect(estimateLevel(400, 20)).toBe(20)
  })
})

describe('estimateXp', () => {
  it('sizes an invented combatant up from its hit points', () => {
    expect(estimateXp(7, 14)).toBe(25)
    expect(estimateXp(45, 14)).toBe(200)
    expect(estimateXp(90, 14)).toBe(1100)
  })

  it('counts a well-armored one for more and a soft one for less', () => {
    expect(estimateXp(45, 18)).toBeGreaterThan(estimateXp(45, 14))
    expect(estimateXp(45, 10)).toBeLessThan(estimateXp(45, 14))
  })
})

describe('assessEncounter', () => {
  it('has nothing to say with only one side on the board', () => {
    expect(assessEncounter(party())).toBeNull()
    expect(assessEncounter([monster(50)])).toBeNull()
    expect(assessEncounter([])).toBeNull()
  })

  it('estimates the party level from the players on the board', () => {
    const a = assessEncounter([...party(), monster(50)])
    expect(a?.partyLevel).toBe(5)
    expect(a?.partySize).toBe(4)
  })

  it('rates one goblin against a level-5 party as trivial', () => {
    expect(assessEncounter([...party(), monster(50)])?.tier).toBe('trivial')
  })

  it('climbs the tiers as foes are added', () => {
    const tiers = [2, 3, 4, 6].map(
      (n) => assessEncounter([...party(), ...Array.from({ length: n }, () => monster(450))])?.tier,
    )
    expect(tiers).toEqual(['easy', 'medium', 'hard', 'deadly'])
  })

  it('multiplies for a crowd — the same XP split up is harder', () => {
    const one = assessEncounter([...party(), monster(1800)])
    const many = assessEncounter([...party(), ...Array.from({ length: 4 }, () => monster(450))])
    expect(one?.rawXp).toBe(many?.rawXp)
    expect(many!.adjustedXp).toBeGreaterThan(one!.adjustedXp)
  })

  it('sizes up a foe that carries no XP of its own', () => {
    const a = assessEncounter([...party(), quick({ side: 'foe' })])
    expect(a?.rawXp).toBe(estimateXp(20, 14))
  })

  it('counts a friendly quick add as half a party member', () => {
    const withHelper = assessEncounter([...party(), quick(), monster(450)])
    expect(withHelper?.partySize).toBe(4.5)
    expect(withHelper!.budget.hard).toBeGreaterThan(
      assessEncounter([...party(), monster(450)])!.budget.hard,
    )
  })

  it('ignores the dead left over from the last fight', () => {
    const withCorpses = assessEncounter([
      ...party(),
      monster(450),
      monster(450, { status: 'dead' }),
    ])
    expect(withCorpses?.foeCount).toBe(1)
    expect(withCorpses?.rawXp).toBe(450)
  })

  it('takes a lair XP award when the fight is in the creature’s lair', () => {
    const lair = monster(5900, {
      creature: { id: 'x', ac: 19, maxHp: 200, xp: 5900, xpLair: 7200 },
      inLair: true,
    })
    expect(assessEncounter([...party(), lair])?.rawXp).toBe(7200)
  })

  it('rates the same fight harder for a small party', () => {
    const four = assessEncounter([...party(), monster(450), monster(450), monster(450)])
    const two = assessEncounter([...party().slice(0, 2), monster(450), monster(450), monster(450)])
    expect(two!.multiplier).toBeGreaterThan(four!.multiplier)
  })
})
