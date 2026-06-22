// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { describe, expect, it } from 'vitest'
import type { Creature } from '../../src/schema/creature.ts'
import type { MonsterCombatant, PlayerCharacter } from '../../src/schema/combatant.ts'
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
    spellUsesSpent: {},
    limitedUseState: {},
    legendaryRemaining: 0,
    concentration: null,
    effects: [],
    visibility: { name: 'shown', hp: 'bloodied', conditions: 'shown', ac: 'hidden' },
  }
}

function pc(id: string, current: number, max: number): PlayerCharacter {
  return {
    isPC: true,
    kind: 'pc',
    combatantId: id,
    name: id,
    initiative: 0,
    ac: 15,
    status: current > 0 ? 'active' : 'unconscious',
    hp: { current, max, temp: 0 },
    concentration: null,
    effects: [],
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

  it('pauses and resumes without losing the round or order', () => {
    let e = encounterReducer(withCombatants(monster('a', 20), monster('b', 10)), {
      type: 'begin',
    })
    e = encounterReducer(e, { type: 'nextTurn' }) // b active, round 1
    e = encounterReducer(e, { type: 'pause' })
    expect(e.paused).toBe(true)
    expect(e.round).toBe(1)
    e = encounterReducer(e, { type: 'resume' })
    expect(e.paused).toBe(false)
    expect(e.combatants[e.activeIndex].combatantId).toBe('b')
  })

  it('stops back to setup, keeping the combatants', () => {
    let e = encounterReducer(withCombatants(monster('a', 20), monster('b', 10)), {
      type: 'begin',
    })
    e = encounterReducer(e, { type: 'nextTurn' })
    e = encounterReducer(e, { type: 'stop' })
    expect(e.round).toBe(0)
    expect(e.activeIndex).toBe(0)
    expect(e.paused).toBe(false)
    expect(e.combatants.map((c) => c.combatantId)).toEqual(['a', 'b'])
  })

  it('long rest restores friendly combatants to full HP, leaves foes, resets the count', () => {
    let e = withCombatants(monster('foe', 10))
    e = encounterReducer(e, { type: 'add', combatant: pc('hero', 4, 20) })
    e = encounterReducer(e, { type: 'shortRest', hp: {} }) // count = 1
    e = encounterReducer(e, { type: 'update', id: 'foe', update: (c) => applyDamage(c, 3) }) // foe 4/7
    e = encounterReducer(e, { type: 'longRest' })

    expect(e.combatants.find((c) => c.combatantId === 'hero')!.hp.current).toBe(20)
    expect(e.combatants.find((c) => c.combatantId === 'foe')!.hp.current).toBe(4) // untouched
    expect(e.shortRests).toBe(0)
  })

  it('short rest sets the given HP (clamped) and counts the rest', () => {
    let e = encounterReducer(emptyEncounter(), { type: 'add', combatant: pc('hero', 4, 20) })
    e = encounterReducer(e, { type: 'shortRest', hp: { hero: 15 } })
    expect(e.combatants[0].hp.current).toBe(15)
    expect(e.shortRests).toBe(1)
    e = encounterReducer(e, { type: 'shortRest', hp: {} })
    expect(e.shortRests).toBe(2)
  })

  it('clears all foes but keeps the party', () => {
    let e = withCombatants(monster('foe1', 12), monster('foe2', 8))
    e = encounterReducer(e, { type: 'add', combatant: pc('hero', 20, 20) })
    e = encounterReducer(e, { type: 'clearFoes' })
    expect(e.combatants.map((c) => c.combatantId)).toEqual(['hero'])
    expect(e.activeIndex).toBe(0)
  })

  it('reorders down: initiative drops below the new lower neighbour', () => {
    let e = withCombatants(monster('a', 20), monster('b', 15), monster('c', 10))
    e = encounterReducer(e, { type: 'reorder', id: 'a', toId: 'c' })
    expect(e.combatants.map((c) => c.combatantId)).toEqual(['b', 'c', 'a'])
    expect(e.combatants.find((c) => c.combatantId === 'a')!.initiative).toBe(9)
  })

  it('reorders up to the top: initiative rises above the new top', () => {
    let e = withCombatants(monster('a', 20), monster('b', 15), monster('c', 10))
    e = encounterReducer(e, { type: 'reorder', id: 'c', toId: 'a' })
    expect(e.combatants.map((c) => c.combatantId)).toEqual(['c', 'a', 'b'])
    expect(e.combatants[0].initiative).toBe(21)
  })

  it('reorders into the middle, sitting between the new neighbours', () => {
    let e = withCombatants(monster('a', 20), monster('b', 15), monster('c', 10))
    e = encounterReducer(e, { type: 'reorder', id: 'a', toId: 'b' })
    expect(e.combatants.map((c) => c.combatantId)).toEqual(['b', 'a', 'c'])
    expect(e.combatants.find((c) => c.combatantId === 'a')!.initiative).toBe(12.5)
  })

  it('keeps turn ownership by id across a reorder', () => {
    let e = encounterReducer(
      withCombatants(monster('a', 20), monster('b', 15), monster('c', 10)),
      { type: 'begin' },
    )
    expect(e.combatants[e.activeIndex].combatantId).toBe('a')
    e = encounterReducer(e, { type: 'reorder', id: 'a', toId: 'c' })
    expect(e.combatants[e.activeIndex].combatantId).toBe('a') // still a's turn
  })

  it('appends log entries', () => {
    let e = encounterReducer(emptyEncounter(), { type: 'log', message: 'Goblin hits' })
    e = encounterReducer(e, { type: 'log', message: 'Goblin misses' })
    expect(e.log.map((l) => l.message)).toEqual(['Goblin hits', 'Goblin misses'])
    expect(new Set(e.log.map((l) => l.id)).size).toBe(2)
  })
})
