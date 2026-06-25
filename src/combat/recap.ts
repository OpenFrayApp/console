// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import type { Combatant } from '../schema/combatant.ts'
import type { CombatStats, Encounter } from '../schema/encounter.ts'
import { isFoe } from './combatant.ts'

export const startStats = (now: number): CombatStats => ({
  startedAt: now,
  activeMs: 0,
  runningSince: now,
  damageDealt: {},
  damageTaken: {},
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
  return { ...s, damageDealt: { ...s.damageDealt, [sourceId]: (s.damageDealt[sourceId] ?? 0) + amount } }
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

/** Every player character is defeated (down/dead). False with no PCs. */
export function allPlayersDown(combatants: Combatant[]): boolean {
  const pcs = combatants.filter((c) => c.isPC)
  return pcs.length > 0 && pcs.every(isDefeated)
}

export type Outcome = 'victory' | 'defeat' | 'inconclusive'

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
  crits: number
  fumbles: number
  damageTakenTotal: number
  mvp: { label: string; amount: number } | null
}

type RollLike = { result?: { crit?: boolean; fumble?: boolean } }

/**
 * Snapshot the fight for the recap. Build this BEFORE resetting the encounter (stop
 * zeroes the round), passing the live roll log and the current wall-clock.
 */
export function buildRecap(encounter: Encounter, rolls: RollLike[], now: number): Recap {
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

  let crits = 0
  let fumbles = 0
  for (const r of rolls) {
    if (r.result?.crit) crits++
    if (r.result?.fumble) fumbles++
  }

  let mvp: Recap['mvp'] = null
  for (const [id, amount] of Object.entries(stats?.damageDealt ?? {})) {
    if (!mvp || amount > mvp.amount) {
      const c = combatants.find((x) => x.combatantId === id)
      mvp = { label: c ? label(c) : id, amount }
    }
  }
  const damageTakenTotal = Object.values(stats?.damageTaken ?? {}).reduce((a, b) => a + b, 0)

  return {
    outcome,
    rounds: round,
    inGameSeconds: round * 6,
    activeMs: stats ? activeMillis(stats, now) : 0,
    totalXp,
    partySize,
    xpPerPlayer,
    crits,
    fumbles,
    damageTakenTotal,
    mvp,
  }
}
