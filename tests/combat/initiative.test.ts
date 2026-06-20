// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { describe, expect, it } from 'vitest'
import type { Creature } from '../../src/schema/creature.ts'
import type {
  Combatant,
  CombatantStatus,
  MonsterCombatant,
  PlayerCharacter,
} from '../../src/schema/combatant.ts'
import type { Effect } from '../../src/schema/effect.ts'
import type { Encounter } from '../../src/schema/encounter.ts'
import {
  activeCombatant,
  beginEncounter,
  compareInitiative,
  nextTurn,
  sortByInitiative,
} from '../../src/combat/initiative.ts'

// --- fixtures ---------------------------------------------------------------

function creature(dex: number, perRound = 0): Creature {
  return {
    id: 'srd:goblin',
    source: 'srd-5.2',
    name: 'Goblin',
    size: 'Small',
    type: 'humanoid',
    ac: 15,
    maxHp: 7,
    speed: { walk: 30 },
    abilities: { str: 8, dex, con: 10, int: 10, wis: 8, cha: 8 },
    senses: { passivePerception: 9 },
    legendaryActions: perRound ? { perRound, actions: [] } : undefined,
  }
}

interface MonsterOpts {
  dex?: number
  status?: CombatantStatus
  effects?: Effect[]
  perRound?: number
  legendaryRemaining?: number
}

function monster(
  id: string,
  initiative: number,
  opts: MonsterOpts = {},
): MonsterCombatant {
  const perRound = opts.perRound ?? 0
  return {
    isPC: false,
    combatantId: id,
    creatureId: 'srd:goblin',
    creature: creature(opts.dex ?? 10, perRound),
    label: id,
    initiative,
    status: opts.status ?? 'active',
    hp: { current: 7, max: 7, temp: 0 },
    slotsUsed: {},
    limitedUseState: {},
    legendaryRemaining: opts.legendaryRemaining ?? perRound,
    concentration: null,
    effects: opts.effects ?? [],
    visibility: { name: 'shown', hp: 'bloodied', conditions: 'shown', ac: 'hidden' },
  }
}

function pc(id: string, initiative: number): PlayerCharacter {
  return {
    isPC: true,
    combatantId: id,
    name: id,
    initiative,
    ac: 15,
    passivePerception: 12,
    status: 'active',
    hp: { current: 20, max: 20, temp: 0 },
    concentration: null,
    effects: [],
  }
}

function encounter(combatants: Combatant[], round = 1, activeIndex = 0): Encounter {
  return { encounterId: 'e1', ownerId: null, round, activeIndex, combatants, log: [] }
}

const roundsEffect = (id: string, rounds: number): Effect => ({
  id,
  name: 'Bless',
  modifier: null,
  duration: { type: 'rounds', rounds },
})

const untilSourceEffect = (id: string, source: string): Effect => ({
  id,
  name: 'Reckless',
  source,
  modifier: null,
  duration: { type: 'untilSourceTurn' },
})

const ids = (e: Encounter) => e.combatants.map((c) => c.combatantId)
const byId = (e: Encounter, id: string) =>
  e.combatants.find((c) => c.combatantId === id)!

// --- ordering ---------------------------------------------------------------

describe('compareInitiative / sortByInitiative', () => {
  it('orders by initiative descending', () => {
    const sorted = sortByInitiative([monster('a', 10), monster('b', 20)])
    expect(sorted.map((c) => c.combatantId)).toEqual(['b', 'a'])
  })

  it('breaks ties by Dex score (higher first)', () => {
    const lowDex = monster('low', 15, { dex: 8 })
    const highDex = monster('high', 15, { dex: 18 })
    expect(sortByInitiative([lowDex, highDex]).map((c) => c.combatantId)).toEqual([
      'high',
      'low',
    ])
  })

  it('puts a PC before a monster on a tie', () => {
    const sorted = sortByInitiative([monster('m', 15, { dex: 20 }), pc('p', 15)])
    expect(sorted.map((c) => c.combatantId)).toEqual(['p', 'm'])
  })

  it('is stable for fully-equal entries', () => {
    const a = pc('a', 15)
    const b = pc('b', 15)
    expect([compareInitiative(a, b), compareInitiative(b, a)]).toEqual([0, 0])
    expect(sortByInitiative([a, b]).map((c) => c.combatantId)).toEqual(['a', 'b'])
  })
})

describe('beginEncounter', () => {
  it('sorts, starts at round 1 with the top of the order active', () => {
    const e = beginEncounter(encounter([monster('a', 5), monster('b', 25)], 0, 0))
    expect(e.round).toBe(1)
    expect(e.activeIndex).toBe(0)
    expect(activeCombatant(e)?.combatantId).toBe('b')
  })
})

// --- the loop ---------------------------------------------------------------

describe('nextTurn', () => {
  it('advances to the next active combatant', () => {
    const e = nextTurn(encounter([monster('a', 20), monster('b', 10)], 1, 0))
    expect(e.activeIndex).toBe(1)
    expect(e.round).toBe(1)
    expect(activeCombatant(e)?.combatantId).toBe('b')
  })

  it('increments the round when the pointer wraps', () => {
    const e = nextTurn(encounter([monster('a', 20), monster('b', 10)], 1, 1))
    expect(e.activeIndex).toBe(0)
    expect(e.round).toBe(2)
  })

  it('skips dead/down combatants', () => {
    const combatants = [
      monster('a', 30),
      monster('b', 20, { status: 'dead' }),
      monster('c', 10),
    ]
    const e = nextTurn(encounter(combatants, 1, 0))
    expect(activeCombatant(e)?.combatantId).toBe('c')
  })

  it('does nothing when no combatant can act', () => {
    const e0 = encounter([monster('a', 20, { status: 'dead' })], 3, 0)
    const e = nextTurn(e0)
    expect(e.round).toBe(3)
    expect(e.activeIndex).toBe(0)
  })

  it("resets the ending creature's legendary actions", () => {
    const a = monster('a', 20, { perRound: 3, legendaryRemaining: 1 })
    const e = nextTurn(encounter([a, monster('b', 10)], 1, 0))
    expect((byId(e, 'a') as MonsterCombatant).legendaryRemaining).toBe(3)
  })

  it("ticks down the ending creature's rounds-effects and clears expired ones", () => {
    const a = monster('a', 20, {
      effects: [roundsEffect('keep', 2), roundsEffect('expire', 1)],
    })
    const e = nextTurn(encounter([a, monster('b', 10)], 1, 0))
    const effects = byId(e, 'a').effects
    expect(effects.map((x) => x.id)).toEqual(['keep'])
    expect(effects[0].duration.rounds).toBe(1)
  })

  it('clears untilSourceTurn effects sourced by the newly-active creature', () => {
    // b carries Reckless (advantage against it) sourced by b; it ends as b's turn begins.
    const a = monster('a', 20)
    const b = monster('b', 10, { effects: [untilSourceEffect('reck', 'b')] })
    const e = nextTurn(encounter([a, b], 1, 0))
    expect(activeCombatant(e)?.combatantId).toBe('b')
    expect(byId(e, 'b').effects).toHaveLength(0)
  })

  it('leaves untilSourceTurn effects sourced by someone else intact', () => {
    const a = monster('a', 20, { effects: [untilSourceEffect('other', 'x')] })
    const b = monster('b', 10)
    const e = nextTurn(encounter([a, b], 1, 0))
    expect(byId(e, 'a').effects.map((x) => x.id)).toEqual(['other'])
  })

  it('does not mutate the input encounter', () => {
    const input = encounter([monster('a', 20), monster('b', 10)], 1, 0)
    const before = ids(input)
    nextTurn(input)
    expect(input.activeIndex).toBe(0)
    expect(input.round).toBe(1)
    expect(ids(input)).toEqual(before)
  })
})
