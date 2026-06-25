// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import type { Combatant } from '../schema/combatant.ts'
import type { CombatStats, Encounter } from '../schema/encounter.ts'
import { isFoe } from './combatant.ts'
import { isStable } from './deathsaves.ts'

export const startStats = (now: number): CombatStats => ({
  startedAt: now,
  activeMs: 0,
  runningSince: now,
  damageDealt: {},
  damageTaken: {},
  biggestHit: null,
})

export function pauseStats(s: CombatStats, now: number): CombatStats {
  if (s.runningSince == null) return s
  return { ...s, activeMs: s.activeMs + (now - s.runningSince), runningSince: null }
}

export const resumeStats = (s: CombatStats, now: number): CombatStats =>
  s.runningSince != null ? s : { ...s, runningSince: now }

/** Total active (non-paused) milliseconds up to `now`. */
export const activeMillis = (s: CombatStats, now: number): number =>
  s.activeMs + (s.runningSince != null ? now - s.runningSince : 0)

export function addDealt(s: CombatStats, sourceId: string, amount: number): CombatStats {
  if (amount <= 0) return s
  const biggestHit = !s.biggestHit || amount > s.biggestHit.amount ? { sourceId, amount } : s.biggestHit
  return {
    ...s,
    damageDealt: { ...s.damageDealt, [sourceId]: (s.damageDealt[sourceId] ?? 0) + amount },
    biggestHit,
  }
}

export function addTaken(s: CombatStats, targetId: string, amount: number): CombatStats {
  if (amount <= 0) return s
  return { ...s, damageTaken: { ...s.damageTaken, [targetId]: (s.damageTaken[targetId] ?? 0) + amount } }
}

const isDefeated = (c: Combatant): boolean => c.status !== 'active'
const label = (c: Combatant): string => (c.isPC ? c.name : c.label)

/** Every foe is on the board AND defeated (down/dead). False with no foes. */
export function allFoesDefeated(combatants: Combatant[]): boolean {
  const foes = combatants.filter(isFoe)
  return foes.length > 0 && foes.every(isDefeated)
}

/**
 * The party is finished: every PC is dead or stabilized. A PC still rolling death
 * saves (unconscious, not yet stable) keeps the fight going — it could recover.
 */
export function allPlayersDown(combatants: Combatant[]): boolean {
  const pcs = combatants.filter((c) => c.isPC)
  return pcs.length > 0 && pcs.every((c) => c.status === 'dead' || isStable(c))
}

export type Outcome = 'victory' | 'defeat' | 'inconclusive'

export interface Award {
  title: string
  label: string
  amount: number
}

export interface Recap {
  outcome: Outcome
  rounds: number
  /** In-game seconds = rounds × 6. */
  inGameSeconds: number
  /** IRL active (non-paused) time, ms. */
  activeMs: number
  totalXp: number
  partySize: number
  xpPerPlayer: number | null
  damageDealtTotal: number
  damageTakenTotal: number
  /** Standout combatants — most damage dealt / taken, biggest single hit. */
  awards: Award[]
}

/** The combatant with the highest value in `tally`, as { label, amount }. */
function top(combatants: Combatant[], tally: Record<string, number>): Award | null {
  let best: { id: string; amount: number } | null = null
  for (const [id, amount] of Object.entries(tally)) {
    if (!best || amount > best.amount) best = { id, amount }
  }
  if (!best) return null
  const c = combatants.find((x) => x.combatantId === best!.id)
  return { title: '', label: c ? label(c) : best.id, amount: best.amount }
}

/**
 * Snapshot the fight for the recap. Build this BEFORE resetting the encounter (stop
 * zeroes the round), passing the current wall-clock.
 */
export function buildRecap(encounter: Encounter, now: number): Recap {
  const { combatants, round } = encounter
  const stats = encounter.combatStats
  const outcome: Outcome = allPlayersDown(combatants)
    ? 'defeat'
    : allFoesDefeated(combatants)
      ? 'victory'
      : 'inconclusive'

  // XP from defeated monsters (PCs carry none, even foe-side ones).
  const totalXp = combatants.reduce(
    (sum, c) => (!c.isPC && isDefeated(c) ? sum + (c.creature.xp ?? 0) : sum),
    0,
  )
  const partySize = combatants.filter((c) => c.isPC).length
  const xpPerPlayer = partySize > 0 ? Math.floor(totalXp / partySize) : null

  const sum = (t: Record<string, number>) => Object.values(t).reduce((a, b) => a + b, 0)
  const dealt = stats?.damageDealt ?? {}
  const taken = stats?.damageTaken ?? {}

  const awards: Award[] = []
  const heavy = top(combatants, dealt)
  if (heavy) awards.push({ ...heavy, title: 'Most damage dealt' })
  const soaked = top(combatants, taken)
  if (soaked) awards.push({ ...soaked, title: 'Most damage taken' })
  if (stats?.biggestHit) {
    const c = combatants.find((x) => x.combatantId === stats.biggestHit!.sourceId)
    awards.push({ title: 'Biggest hit', label: c ? label(c) : stats.biggestHit.sourceId, amount: stats.biggestHit.amount })
  }

  return {
    outcome,
    rounds: round,
    inGameSeconds: round * 6,
    activeMs: stats ? activeMillis(stats, now) : 0,
    totalXp,
    partySize,
    xpPerPlayer,
    damageDealtTotal: sum(dealt),
    damageTakenTotal: sum(taken),
    awards,
  }
}
