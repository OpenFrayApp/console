// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { describe, expect, it } from 'vitest'
import type { Combatant } from '../../src/schema/combatant.ts'
import type { Encounter } from '../../src/schema/encounter.ts'
import {
  activeMillis,
  addDealt,
  addTaken,
  allFoesDefeated,
  allPlayersDown,
  buildRecap,
  pauseStats,
  resumeStats,
  startStats,
} from '../../src/combat/recap.ts'

const pc = (over: Partial<Extract<Combatant, { isPC: true }>> = {}): Combatant =>
  ({
    isPC: true,
    kind: 'pc',
    combatantId: 'pc1',
    name: 'Hero',
    ac: 16,
    initiative: 0,
    status: 'active',
    hp: { current: 20, max: 20, temp: 0 },
    concentration: null,
    effects: [],
    ...over,
  }) as Combatant

const monster = (over: Record<string, unknown> = {}): Combatant =>
  ({
    isPC: false,
    combatantId: 'm1',
    creatureId: 'srd:goblin',
    creature: { id: 'srd:goblin', xp: 50 },
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

const encounter = (combatants: Combatant[], over: Partial<Encounter> = {}): Encounter => ({
  encounterId: 'e',
  ownerId: null,
  round: 3,
  activeIndex: 0,
  combatants,
  log: [],
  ...over,
})

describe('combat stats timer', () => {
  it('accumulates active time and excludes paused spans', () => {
    let s = startStats(1000)
    expect(activeMillis(s, 1500)).toBe(500) // running 500ms
    s = pauseStats(s, 1500) // banked 500ms, clock stopped
    expect(activeMillis(s, 9999)).toBe(500) // time while paused doesn't count
    s = resumeStats(s, 2000)
    expect(activeMillis(s, 2300)).toBe(800) // 500 banked + 300 running
  })

  it('addDealt / addTaken accumulate, track the biggest hit, and ignore non-positive', () => {
    let s = startStats(0)
    s = addDealt(s, 'a', 10)
    s = addDealt(s, 'a', 5)
    s = addDealt(s, 'b', 22)
    s = addTaken(s, 'b', 7)
    s = addDealt(s, 'a', 0) // ignored
    expect(s.damageDealt).toEqual({ a: 15, b: 22 })
    expect(s.damageTaken).toEqual({ b: 7 })
    expect(s.biggestHit).toEqual({ sourceId: 'b', amount: 22 })
  })
})

describe('outcome detection', () => {
  it('allFoesDefeated only when every foe is down and foes exist', () => {
    expect(allFoesDefeated([])).toBe(false)
    expect(allFoesDefeated([monster({ status: 'active' })])).toBe(false)
    expect(allFoesDefeated([monster({ status: 'dead' }), monster({ combatantId: 'm2', status: 'active' })])).toBe(false)
    expect(allFoesDefeated([monster({ status: 'dead' })])).toBe(true)
  })

  it('allPlayersDown only when every PC is dead or stabilized (not still saving)', () => {
    expect(allPlayersDown([])).toBe(false)
    expect(allPlayersDown([pc({ status: 'active' })])).toBe(false)
    // Unconscious but still rolling death saves → not down (could recover).
    expect(allPlayersDown([pc({ status: 'unconscious', deathSaves: { successes: 1, failures: 0 } })])).toBe(false)
    // Stabilized (3 successes) counts as down.
    expect(allPlayersDown([pc({ status: 'unconscious', deathSaves: { successes: 3, failures: 0 } })])).toBe(true)
    expect(allPlayersDown([pc({ status: 'dead' })])).toBe(true)
    expect(allPlayersDown([pc({ status: 'dead' }), pc({ combatantId: 'pc2', status: 'active' })])).toBe(false)
  })
})

describe('buildRecap', () => {
  it('victory: sums defeated foes XP, splits per player, totals rounds/time', () => {
    const stats = startStats(0)
    const enc = encounter(
      [
        pc({ status: 'active' }),
        pc({ combatantId: 'pc2', name: 'Mage', status: 'active' }),
        monster({ combatantId: 'm1', status: 'dead', creature: { id: 'g', xp: 50 } as never }),
        monster({ combatantId: 'm2', status: 'dead', creature: { id: 'o', xp: 450 } as never }),
      ],
      { round: 4, combatStats: { ...stats, activeMs: 90_000, runningSince: null } },
    )
    const recap = buildRecap(enc, 0)
    expect(recap.outcome).toBe('victory')
    expect(recap.totalXp).toBe(500)
    expect(recap.partySize).toBe(2)
    expect(recap.xpPerPlayer).toBe(250)
    expect(recap.rounds).toBe(4)
    expect(recap.inGameSeconds).toBe(24)
    expect(recap.activeMs).toBe(90_000)
  })

  it('defeat when all PCs are down; XP still counts slain foes', () => {
    const enc = encounter([
      pc({ status: 'dead' }),
      monster({ status: 'dead' }),
    ])
    expect(buildRecap(enc, 0).outcome).toBe('defeat')
  })

  it('inconclusive when both sides still stand', () => {
    const enc = encounter([pc({ status: 'active' }), monster({ status: 'active' })])
    const recap = buildRecap(enc, 0)
    expect(recap.outcome).toBe('inconclusive')
    expect(recap.totalXp).toBe(0)
  })

  it('awards: heavy hitter, most damage taken, and biggest single hit', () => {
    const stats = {
      ...startStats(0),
      damageDealt: { pc1: 40, m1: 12 },
      damageTaken: { m1: 30, pc1: 8 },
      biggestHit: { sourceId: 'pc1', amount: 28 },
    }
    const enc = encounter(
      [pc({ combatantId: 'pc1', name: 'Hero', status: 'active' }), monster({ combatantId: 'm1', label: 'Goblin', status: 'dead' })],
      { combatStats: stats },
    )
    const recap = buildRecap(enc, 0)
    expect(recap.damageDealtTotal).toBe(52)
    expect(recap.damageTakenTotal).toBe(38)
    expect(recap.awards).toEqual([
      { title: 'Most damage dealt', label: 'Hero', amount: 40 },
      { title: 'Most damage taken', label: 'Goblin', amount: 30 },
      { title: 'Biggest hit', label: 'Hero', amount: 28 },
    ])
  })

  it('derives highlight tallies from the game log (applies only, not removals)', () => {
    const enc = encounter([pc({ status: 'active' }), monster({ status: 'dead' })], {
      log: [
        { id: '1-0', round: 1, category: 'cast', message: 'Mage casts Fireball' },
        { id: '1-1', round: 1, category: 'cast', message: 'Mage casts Bless' },
        { id: '1-2', round: 1, category: 'condition', message: 'Goblin is Prone' },
        { id: '1-3', round: 1, category: 'condition', message: 'Hero gains Bless' },
        { id: '2-4', round: 2, category: 'condition', message: 'Goblin is no longer Prone' },
        { id: '2-5', round: 2, category: 'condition', message: 'Hero: Bless ends' },
        { id: '2-6', round: 2, category: 'death', message: 'Goblin is down' },
        { id: '3-7', round: 3, category: 'death', message: 'Goblin dies' },
        { id: '3-8', round: 3, category: 'death', message: 'Goblin is back up' },
      ],
    })
    const recap = buildRecap(enc, 0)
    expect(recap.spellsCast).toBe(2)
    expect(recap.effectsApplied).toBe(2) // the two applies; removals excluded
    expect(recap.knockouts).toBe(2) // down + dies; "back up" excluded
  })
})
