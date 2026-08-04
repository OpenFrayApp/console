// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { describe, expect, it } from 'vitest'
import type { Creature } from '../../src/schema/creature.ts'
import type { MonsterCombatant, PlayerCharacter } from '../../src/schema/combatant.ts'
import type { Encounter } from '../../src/schema/encounter.ts'
import { applyDamage, effectiveMaxHp } from '../../src/combat/resources.ts'
import { condition, counter, modifierEffect, reminder, setCount } from '../../src/combat/effects.ts'
import { exhaustionLevel } from '../../src/combat/exhaustion.ts'
import { emptyEncounter, encounterReducer } from '../../src/state/encounter.ts'
import { onSharedBoard } from '../../src/combat/playerView.ts'

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

  it('long rest restores friendly HP and clears concentration + sub-8h effects', () => {
    const hero: PlayerCharacter = {
      ...pc('hero', 5, 30),
      concentration: { spell: 'Bless', saveDc: 13, round: 1 },
      effects: [
        condition('Frightened', { duration: { type: 'rounds', rounds: 10 } }),
        condition('Restrained', { duration: { type: 'rounds', rounds: 4800 } }),
      ],
    }
    const after = encounterReducer(
      { ...emptyEncounter(), combatants: [hero] },
      { type: 'longRest' },
    )
    const c = after.combatants[0]
    expect(c.hp.current).toBe(30)
    expect(c.concentration).toBeNull()
    expect(c.effects.map((e) => e.name)).toEqual(['Restrained'])
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

  // A reveal belongs to the fight it was made in: after Stop nothing the table saw
  // during it stays on their screen, and the next Begin reveals everyone afresh.
  it('takes every foe off the shared screen when the fight ends', () => {
    let e = withCombatants(monster('seen', 20), monster('ambush', 10))
    e = encounterReducer(e, {
      type: 'update',
      id: 'seen',
      update: (c) => ({ ...c, shared: 'shown' }),
    })
    e = encounterReducer(e, {
      type: 'update',
      id: 'ambush',
      update: (c) => ({ ...c, shared: 'hidden' }),
    })
    e = encounterReducer(e, { type: 'begin' })
    expect(
      onSharedBoard(
        e.combatants.find((c) => c.combatantId === 'seen')!,
        true,
      ),
    ).toBe(true)

    e = encounterReducer(e, { type: 'stop' })
    for (const c of e.combatants) {
      expect(c.shared).toBe('auto')
      expect(onSharedBoard(c, e.round > 0)).toBe(false)
    }
    // The next fight puts them back, without the GM revealing each one by hand.
    const next = encounterReducer(e, { type: 'begin' })
    for (const c of next.combatants) expect(onSharedBoard(c, next.round > 0)).toBe(true)
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

  it('clears all combatants and resets the round', () => {
    let e = withCombatants(monster('foe1', 12), monster('foe2', 8))
    e = encounterReducer(e, { type: 'add', combatant: pc('hero', 20, 20) })
    e = encounterReducer(e, { type: 'clearAll' })
    expect(e.combatants).toEqual([])
    expect(e.round).toBe(0)
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
    let e = encounterReducer(withCombatants(monster('a', 20), monster('b', 15), monster('c', 10)), {
      type: 'begin',
    })
    expect(e.combatants[e.activeIndex].combatantId).toBe('a')
    e = encounterReducer(e, { type: 'reorder', id: 'a', toId: 'c' })
    expect(e.combatants[e.activeIndex].combatantId).toBe('a') // still a's turn
  })

  it('appends log entries', () => {
    let e = encounterReducer(emptyEncounter(), {
      type: 'log',
      entry: { category: 'note', message: 'Goblin hits' },
    })
    e = encounterReducer(e, { type: 'log', entry: { category: 'note', message: 'Goblin misses' } })
    expect(e.log.map((l) => l.message)).toEqual(['Goblin hits', 'Goblin misses'])
    expect(new Set(e.log.map((l) => l.id)).size).toBe(2)
  })

  it('clears the log', () => {
    let e = encounterReducer(emptyEncounter(), {
      type: 'log',
      entry: { category: 'note', message: 'x' },
    })
    e = encounterReducer(e, { type: 'clearLog' })
    expect(e.log).toEqual([])
  })

  it('rewrites a renamed combatant across existing log entries', () => {
    let e = encounterReducer(emptyEncounter(), {
      type: 'log',
      entry: { category: 'roll', message: 'Goblin: Bite' },
    })
    e = encounterReducer(e, { type: 'renameLog', from: 'Goblin', to: 'Snik' })
    expect(e.log[0].message).toBe('Snik: Bite')
  })

  describe('endConcentration', () => {
    // A concentration spell's effects live on its targets, so ending it has to sweep
    // the whole board — otherwise a broken Bless leaves badges on three PCs.
    const sustained = (source: string) => ({
      ...condition('Blinded', { source }),
      concentration: true,
    })

    const board = () => {
      const caster = {
        ...monster('caster', 10),
        concentration: { spell: 'Bless', saveDc: 13, round: 1 },
      }
      const t1 = { ...monster('t1', 5), effects: [sustained('caster')] }
      const t2 = {
        ...monster('t2', 4),
        effects: [sustained('caster'), condition('Prone', { source: 'other' })],
      }
      return withCombatants(caster, t1, t2)
    }

    it('clears the caster’s sustained effects from every target', () => {
      const e = encounterReducer(board(), { type: 'endConcentration', id: 'caster' })
      const at = (id: string) => e.combatants.find((c) => c.combatantId === id)!
      expect(at('caster').concentration).toBeNull()
      expect(at('t1').effects).toEqual([])
      // An unrelated condition on the same row survives.
      expect(at('t2').effects.map((x) => x.name)).toEqual(['Prone'])
    })

    it('leaves effects from another caster, and non-concentration effects, alone', () => {
      let e = board()
      e = encounterReducer(e, {
        type: 'update',
        id: 't1',
        update: (c) => ({
          ...c,
          effects: [...c.effects, condition('Poisoned', { source: 'other' })],
        }),
      })
      e = encounterReducer(e, { type: 'endConcentration', id: 'other' })
      const t1 = e.combatants.find((c) => c.combatantId === 't1')!
      // 'other' concentrates on nothing here, so only its *flagged* effects would go.
      expect(t1.effects.map((x) => x.name)).toEqual(['Blinded', 'Poisoned'])
    })

    it('logs the end of concentration', () => {
      const e = encounterReducer(board(), { type: 'endConcentration', id: 'caster' })
      expect(e.log.some((l) => l.message.includes('concentration ends'))).toBe(true)
    })
  })
})

describe('encounter game-log events', () => {
  const withCombatants = (...cs: ReturnType<typeof monster>[]) => ({
    ...emptyEncounter(),
    combatants: cs,
  })

  it('logs combat start and the first turn', () => {
    const e = encounterReducer(withCombatants(monster('a', 0)), { type: 'begin' })
    const messages = e.log.map((l) => l.message)
    expect(messages).toContain('Combat begins — Round 1')
    expect(messages).toContain("a's turn")
  })

  it('logs damage taken from an HP drop', () => {
    const e = encounterReducer(withCombatants(monster('a', 0)), {
      type: 'update',
      id: 'a',
      update: (c) => applyDamage(c, 4),
    })
    expect(e.log.some((l) => l.category === 'hp' && l.message === 'a takes 4 damage')).toBe(true)
  })

  it('logs healing under the heal category when HP rises', () => {
    let e = encounterReducer(withCombatants(monster('a', 0)), {
      type: 'update',
      id: 'a',
      update: (c) => applyDamage(c, 4),
    })
    e = encounterReducer(e, {
      type: 'update',
      id: 'a',
      update: (c) => ({ ...c, hp: { ...c.hp, current: c.hp.current + 3 } }),
    })
    expect(e.log.some((l) => l.category === 'heal' && l.message === 'a regains 3 HP')).toBe(true)
  })

  it('logs a revive as a heal, not a death event', () => {
    let e = encounterReducer(emptyEncounter(), { type: 'add', combatant: pc('hero', 0, 20) })
    e = encounterReducer(e, {
      type: 'update',
      id: 'hero',
      update: (c) => ({ ...c, status: 'active', hp: { ...c.hp, current: 5 } }),
    })
    expect(e.log.some((l) => l.category === 'heal' && l.message === 'hero is back up')).toBe(true)
    expect(e.log.some((l) => l.category === 'death')).toBe(false)
  })

  it('logs a condition applied and removed', () => {
    const cond = condition('Prone')
    let e = encounterReducer(withCombatants(monster('a', 0)), {
      type: 'update',
      id: 'a',
      update: (c) => ({ ...c, effects: [cond] }),
    })
    expect(e.log.some((l) => l.category === 'condition' && l.message === 'a is Prone')).toBe(true)
    e = encounterReducer(e, { type: 'update', id: 'a', update: (c) => ({ ...c, effects: [] }) })
    expect(e.log.some((l) => l.message === 'a is no longer Prone')).toBe(true)
  })

  it('logs a bundle applied and cleared as one line naming the bundle', () => {
    const bundle = { id: 'b1', name: 'Drunk' }
    const parts = [
      condition('Poisoned', { bundle }),
      reminder('Rough morning', 'Rough morning', { bundle }),
    ]
    let e = encounterReducer(withCombatants(monster('a', 0)), {
      type: 'update',
      id: 'a',
      update: (c) => ({ ...c, effects: parts }),
    })
    expect(e.log.filter((l) => l.category === 'condition')).toHaveLength(1)
    expect(e.log.some((l) => l.message === 'a gains Drunk')).toBe(true)
    e = encounterReducer(e, { type: 'update', id: 'a', update: (c) => ({ ...c, effects: [] }) })
    expect(e.log.some((l) => l.message === 'a: Drunk ends')).toBe(true)
    expect(e.log.some((l) => l.message === 'a is no longer Poisoned')).toBe(false)
  })

  it('losing one part of a bundle names the part, not the bundle', () => {
    const bundle = { id: 'b1', name: 'Drunk' }
    const poisoned = condition('Poisoned', { bundle })
    const note = reminder('Rough morning', 'Rough morning', { bundle })
    let e = encounterReducer(withCombatants(monster('a', 0)), {
      type: 'update',
      id: 'a',
      update: (c) => ({ ...c, effects: [poisoned, note] }),
    })
    e = encounterReducer(e, {
      type: 'update',
      id: 'a',
      update: (c) => ({ ...c, effects: [note] }),
    })
    expect(e.log.some((l) => l.message === 'a is no longer Poisoned')).toBe(true)
    expect(e.log.some((l) => l.message === 'a: Drunk ends')).toBe(false)
  })

  it('stamps gmOnly on the lines of a gmOnly effect, counter steps included', () => {
    const depth = counter('Depth', { gmOnly: true })
    let e = encounterReducer(withCombatants(monster('a', 0)), {
      type: 'update',
      id: 'a',
      update: (c) => ({ ...c, effects: [depth] }),
    })
    e = encounterReducer(e, {
      type: 'update',
      id: 'a',
      update: (c) => ({ ...c, effects: [setCount(depth, 1)] }),
    })
    e = encounterReducer(e, { type: 'update', id: 'a', update: (c) => ({ ...c, effects: [] }) })
    const depthLines = e.log.filter((l) => l.message.includes('Depth'))
    expect(depthLines.length).toBeGreaterThanOrEqual(3)
    expect(depthLines.every((l) => l.gmOnly)).toBe(true)
  })

  it('clamps current HP down when a maxHp reduction lands, and it stays down after', () => {
    const rot = modifierEffect({
      name: 'Sallow Rot',
      mode: 'flatBonus',
      direction: 'outgoing',
      applies: 'maxHp',
      value: -3,
    })
    let e = encounterReducer(withCombatants(monster('a', 0)), {
      type: 'update',
      id: 'a',
      update: (c) => ({ ...c, effects: [rot] }),
    })
    let a = e.combatants[0]
    expect(a.hp.current).toBe(4) // the helper's monsters hold 7/7
    expect(a.hp.max).toBe(7)
    // Curing the disease restores the ceiling, not the lost hit points.
    e = encounterReducer(e, { type: 'update', id: 'a', update: (c) => ({ ...c, effects: [] }) })
    a = e.combatants[0]
    expect(a.hp.current).toBe(4)
  })

  it('logs every step of a counter, which keeps its id as its tally moves', () => {
    const depth = setCount(counter('Depth'), 2)
    let e = encounterReducer(withCombatants(monster('a', 0)), {
      type: 'update',
      id: 'a',
      update: (c) => ({ ...c, effects: [depth] }),
    })
    expect(e.log.some((l) => l.message === 'a gains Depth')).toBe(true)
    e = encounterReducer(e, {
      type: 'update',
      id: 'a',
      update: (c) => ({ ...c, effects: [setCount(depth, 3)] }),
    })
    expect(e.log.some((l) => l.category === 'condition' && l.message === 'a: Depth 2 → 3')).toBe(
      true,
    )
    // Re-applying the same tally is not news.
    const before = e.log.length
    e = encounterReducer(e, {
      type: 'update',
      id: 'a',
      update: (c) => ({ ...c, effects: [setCount(depth, 3)] }),
    })
    expect(e.log.length).toBe(before)
  })

  it('logs concentration starting', () => {
    const e = encounterReducer(withCombatants(monster('a', 0)), {
      type: 'update',
      id: 'a',
      update: (c) => ({ ...c, concentration: { spell: 'Hold Person', saveDc: 13, round: 1 } }),
    })
    expect(
      e.log.some(
        (l) => l.category === 'concentration' && l.message === 'a concentrates on Hold Person',
      ),
    ).toBe(true)
  })

  // Rolled before the fight exists, recorded inside it: the log reads "Combat begins",
  // then the rolls that set the order, then whose turn it is.
  it('records the initiative rolls under the line that opens the fight', () => {
    const e = encounterReducer(withCombatants(monster('a', 20), monster('b', 10)), {
      type: 'begin',
      rolls: [
        { category: 'roll', message: 'a: initiative', sourceId: 'a' },
        { category: 'roll', message: 'b: initiative', sourceId: 'b' },
      ],
    })
    expect(e.log.map((l) => l.message)).toEqual([
      'Combat begins — Round 1',
      'a: initiative',
      'b: initiative',
      "a's turn",
    ])
    // And they belong to round 1, so a fight-scoped player log carries them.
    expect(e.log.every((l) => l.round === 1)).toBe(true)
    expect(e.fightLogStart).toBe(0)
  })

  // The Game Master keeps the whole record; the shared player view reads this to start
  // the table's log fresh at each Begin.
  it('marks where each fight`s record starts, and forgets it when the log goes', () => {
    let e = encounterReducer(withCombatants(monster('a', 5)), { type: 'begin' })
    expect(e.fightLogStart).toBe(0)
    const first = e.log.length
    e = encounterReducer(e, { type: 'stop' })
    e = encounterReducer(e, { type: 'begin' })
    // The second fight starts after everything the first one left behind.
    expect(e.fightLogStart).toBe(first + 1) // + the "Combat ends" line
    expect(e.log.slice(e.fightLogStart!)[0].message).toBe('Combat begins — Round 1')
    expect(encounterReducer(e, { type: 'clearLog' }).fightLogStart).toBe(0)
    expect(encounterReducer(e, { type: 'clearAll' }).fightLogStart).toBe(0)
  })

  it('wipes the log on a full board sweep (clearAll) but not on stop', () => {
    let e = encounterReducer(withCombatants(monster('a', 5)), { type: 'begin' })
    expect(e.log.length).toBeGreaterThan(0)
    const stopped = encounterReducer(e, { type: 'stop' })
    expect(stopped.log.length).toBeGreaterThan(0) // recap reads it
    e = encounterReducer(e, { type: 'clearAll' })
    expect(e.log).toEqual([])
  })

  it('does not log a no-op update', () => {
    const e = encounterReducer(withCombatants(monster('a', 0)), {
      type: 'update',
      id: 'a',
      update: (c) => ({ ...c, reactionUsed: true }),
    })
    expect(e.log).toEqual([])
  })
})

describe('setExhaustion', () => {
  /** The messages one board change wrote, so a level move can be counted as well as read. */
  const messages = (before: Encounter, after: Encounter) =>
    after.log.slice(before.log.length).map((l) => l.message)

  const level = (e: Encounter, id: string) =>
    exhaustionLevel(e.combatants.find((c) => c.combatantId === id)!.effects)

  it('applies a level and says so once, whatever it landed underneath', () => {
    const before = withCombatants(monster('a', 5))
    const after = encounterReducer(before, {
      type: 'setExhaustion',
      id: 'a',
      level: 3,
      edition: '5.5',
    })
    expect(level(after, 'a')).toBe(3)
    expect(messages(before, after)).toEqual(['a gains Exhaustion 3'])
  })

  it('logs a move between levels as the move, not as a bundle swapped out', () => {
    const at3 = encounterReducer(withCombatants(monster('a', 5)), {
      type: 'setExhaustion',
      id: 'a',
      level: 3,
      edition: '5.0',
    })
    const at4 = encounterReducer(at3, { type: 'setExhaustion', id: 'a', level: 4, edition: '5.0' })
    expect(messages(at3, at4)).toEqual(['a: Exhaustion 3 → 4'])
  })

  it('ends the condition at 0, clearing every part with it', () => {
    const at2 = encounterReducer(withCombatants(monster('a', 5)), {
      type: 'setExhaustion',
      id: 'a',
      level: 2,
      edition: '5.0',
    })
    const gone = encounterReducer(at2, { type: 'setExhaustion', id: 'a', level: 0, edition: '5.0' })
    expect(gone.combatants[0].effects).toEqual([])
    expect(messages(at2, gone)).toEqual(['a: Exhaustion ends'])
  })

  it('reads the edition it is given: 2014 level 4 halves the hit point maximum', () => {
    const e = encounterReducer(withCombatants(monster('a', 5)), {
      type: 'setExhaustion',
      id: 'a',
      level: 4,
      edition: '5.0',
    })
    // The goblin's 7 HP maximum halves to 3, and current HP follows the ceiling down.
    expect(effectiveMaxHp(e.combatants[0])).toBe(3)
    expect(e.combatants[0].hp.current).toBe(3)
    expect(e.combatants[0].hp.max).toBe(7)
  })

  it('leaves current HP where it fell when the level drops again', () => {
    let e = encounterReducer(withCombatants(monster('a', 5)), {
      type: 'setExhaustion',
      id: 'a',
      level: 4,
      edition: '5.0',
    })
    e = encounterReducer(e, { type: 'setExhaustion', id: 'a', level: 1, edition: '5.0' })
    expect(effectiveMaxHp(e.combatants[0])).toBe(7)
    expect(e.combatants[0].hp.current).toBe(3)
  })

  it('does nothing, and logs nothing, when the level is already there', () => {
    const at2 = encounterReducer(withCombatants(monster('a', 5)), {
      type: 'setExhaustion',
      id: 'a',
      level: 2,
      edition: '5.5',
    })
    const again = encounterReducer(at2, {
      type: 'setExhaustion',
      id: 'a',
      level: 2,
      edition: '5.5',
    })
    expect(again).toBe(at2)
  })

  it('leaves the creature’s other effects alone', () => {
    let e = encounterReducer(withCombatants(monster('a', 5)), {
      type: 'update',
      id: 'a',
      update: (c) => ({ ...c, effects: [condition('Prone')] }),
    })
    e = encounterReducer(e, { type: 'setExhaustion', id: 'a', level: 2, edition: '5.5' })
    expect(e.combatants[0].effects.some((x) => x.name === 'Prone')).toBe(true)
    e = encounterReducer(e, { type: 'setExhaustion', id: 'a', level: 0, edition: '5.5' })
    expect(e.combatants[0].effects.map((x) => x.name)).toEqual(['Prone'])
  })

  it('ignores a combatant that isn’t on the board', () => {
    const e = withCombatants(monster('a', 5))
    expect(encounterReducer(e, { type: 'setExhaustion', id: 'z', level: 1, edition: '5.5' })).toBe(
      e,
    )
  })
})
