// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { describe, expect, it } from 'vitest'
import type { Creature } from '../../src/schema/creature.ts'
import type { MonsterCombatant } from '../../src/schema/combatant.ts'
import { applyDamage } from '../../src/combat/resources.ts'
import { emptyEncounter, encounterReducer } from '../../src/state/encounter.ts'

function creature(): Creature {
  return {
    id: 'srd:goblin',
    source: 'srd-5.2',
    name: 'Goblin',
    size: 'Small',
    type: 'humanoid',
    ac: 15,
    maxHp: 7,
    speed: { walk: 30 },
    abilities: { str: 8, dex: 14, con: 10, int: 10, wis: 8, cha: 8 },
    senses: { passivePerception: 9 },
  }
}

function monster(id: string, initiative: number): MonsterCombatant {
  return {
    isPC: false,
    combatantId: id,
    creatureId: 'srd:goblin',
    creature: creature(),
    label: id,
    initiative,
    status: 'active',
    hp: { current: 7, max: 7, temp: 0 },
    slotsUsed: {},
    limitedUseState: {},
    legendaryRemaining: 0,
    concentration: null,
    effects: [],
    visibility: { name: 'shown', hp: 'bloodied', conditions: 'shown', ac: 'hidden' },
  }
}

const withCombatants = (...ms: MonsterCombatant[]) =>
  ms.reduce((e, m) => encounterReducer(e, { type: 'add', combatant: m }), emptyEncounter())

describe('encounterReducer', () => {
  it('adds combatants sorted by initiative', () => {
    const e = withCombatants(monster('a', 5), monster('b', 20))
    expect(e.combatants.map((c) => c.combatantId)).toEqual(['b', 'a'])
  })

  it('begins at round 1 with the top of the order active', () => {
    const e = encounterReducer(withCombatants(monster('a', 5), monster('b', 20)), {
      type: 'begin',
    })
    expect(e.round).toBe(1)
    expect(e.combatants[e.activeIndex].combatantId).toBe('b')
  })

  it('advances turns and keeps the active creature when one is added', () => {
    let e = encounterReducer(withCombatants(monster('a', 20), monster('b', 10)), {
      type: 'begin',
    })
    e = encounterReducer(e, { type: 'nextTurn' }) // now b is active
    expect(e.combatants[e.activeIndex].combatantId).toBe('b')
    e = encounterReducer(e, { type: 'add', combatant: monster('c', 30) }) // c sorts first
    expect(e.combatants[e.activeIndex].combatantId).toBe('b') // still b's turn
  })

  it('removes a combatant and re-derives the active index', () => {
    let e = encounterReducer(withCombatants(monster('a', 20), monster('b', 10)), {
      type: 'begin',
    })
    e = encounterReducer(e, { type: 'remove', id: 'a' })
    expect(e.combatants.map((c) => c.combatantId)).toEqual(['b'])
  })

  it('updates one combatant via a transform', () => {
    let e = withCombatants(monster('a', 20))
    e = encounterReducer(e, { type: 'update', id: 'a', update: (c) => applyDamage(c, 3) })
    expect(e.combatants[0].hp.current).toBe(4)
  })

  it('appends log entries', () => {
    let e = encounterReducer(emptyEncounter(), { type: 'log', message: 'Goblin hits' })
    e = encounterReducer(e, { type: 'log', message: 'Goblin misses' })
    expect(e.log.map((l) => l.message)).toEqual(['Goblin hits', 'Goblin misses'])
    expect(new Set(e.log.map((l) => l.id)).size).toBe(2)
  })
})
