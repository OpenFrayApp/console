// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import type { Combatant } from '../schema/combatant.ts'
import { abilityMod } from '../schema/roster.ts'
import { isFoe } from './combatant.ts'

export type DifficultyTier = 'trivial' | 'easy' | 'medium' | 'hard' | 'deadly'

export const DIFFICULTY_LABEL: Record<DifficultyTier, string> = {
  trivial: 'Trivial',
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
  deadly: 'Deadly',
}

/**
 * Per-character XP budget for each tier, indexed by level − 1: the standard 5e
 * encounter-building numbers, so the readout matches what a GM expects.
 */
const THRESHOLDS: readonly (readonly [number, number, number, number])[] = [
  [25, 50, 75, 100],
  [50, 100, 150, 200],
  [75, 150, 225, 400],
  [125, 250, 375, 500],
  [250, 500, 750, 1100],
  [300, 600, 900, 1400],
  [350, 750, 1100, 1700],
  [450, 900, 1400, 2100],
  [550, 1100, 1600, 2400],
  [600, 1200, 1900, 2800],
  [800, 1600, 2400, 3600],
  [1000, 2000, 3000, 4500],
  [1100, 2200, 3400, 5100],
  [1250, 2500, 3800, 5700],
  [1400, 2800, 4300, 6400],
  [1600, 3200, 4800, 7200],
  [2000, 3900, 5900, 8800],
  [2100, 4200, 6300, 9500],
  [2400, 4900, 7300, 10900],
  [2800, 5700, 8500, 12700],
]

/** Group-size multipliers, stepped by how many foes are on the board. */
const MULTIPLIERS = [1, 1.5, 2, 2.5, 3, 4] as const

/**
 * Rough XP for a combatant the GM invented on the spot, which carries no CR or XP —
 * a quick add, or a custom creature saved without one. Hit points place it in a band
 * and armor class nudges it up or down; deliberately loose, and only ever a fraction
 * of a real encounter's budget.
 */
const XP_BY_HP: readonly (readonly [number, number])[] = [
  [6, 10],
  [17, 25],
  [23, 50],
  [35, 100],
  [49, 200],
  [70, 450],
  [85, 700],
  [100, 1100],
  [115, 1800],
  [130, 2300],
  [145, 2900],
  [160, 3900],
  [175, 5000],
  [190, 5900],
  [205, 7200],
  [220, 8400],
  [235, 10000],
  [250, 11500],
  [265, 13000],
]

const clamp = (n: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, n))

export function estimateXp(maxHp: number, ac: number): number {
  let band = XP_BY_HP.findIndex(([hp]) => maxHp <= hp)
  if (band < 0) band = XP_BY_HP.length - 1
  // Every 2 points of armor class either side of an average 14 moves it a band.
  band = clamp(band + clamp(Math.round((ac - 14) / 2), -4, 4), 0, XP_BY_HP.length - 1)
  return XP_BY_HP[band][1]
}

/**
 * A character's level, worked back from their max hit points. OpenFray never stores
 * a PC's level or class (AGENTS.md scope rule), so this reads the one number the GM
 * has to keep current anyway: a 5e character has (hit die + CON) at 1st level and
 * roughly (average die + 1 + CON) per level after. Constitution is used when the GM
 * recorded it; otherwise a +2 stands in.
 */
export function estimateLevel(maxHp: number, con?: number): number {
  const mod = con != null ? abilityMod(con) : 2
  const perLevel = Math.max(1, 5 + mod)
  return clamp(Math.round(1 + (maxHp - (8 + mod)) / perLevel), 1, 20)
}

export interface EncounterDifficulty {
  tier: DifficultyTier
  /** Foe XP before the group-size multiplier. */
  rawXp: number
  /** Foe XP after it — what the tier is read from. */
  adjustedXp: number
  multiplier: number
  foeCount: number
  /** Estimated average level of the party. */
  partyLevel: number
  /** Party members, counting a friendly quick add as half of one. */
  partySize: number
  /** This party's budget for each tier, in adjusted XP. */
  budget: { easy: number; medium: number; hard: number; deadly: number }
}

const isDown = (c: Combatant): boolean => c.status === 'dead'
const isQuickAdd = (c: Combatant): boolean => c.isPC && c.kind === 'quick'

/**
 * How hard the fight on the board looks before it starts: total foe XP, adjusted for
 * how many of them there are, against the party's budget.
 *
 * Both sides are estimates. The party's level comes from hit points rather than a
 * stored level, and a foe with no XP of its own is sized up from its hit points and
 * armor class. Null when either side is empty — there is nothing to compare.
 */
export function assessEncounter(combatants: Combatant[]): EncounterDifficulty | null {
  const alive = combatants.filter((c) => !isDown(c))
  const foes = alive.filter(isFoe)
  const friends = alive.filter((c) => c.isPC && !isFoe(c))
  const players = friends.filter((c) => !isQuickAdd(c))
  if (foes.length === 0 || friends.length === 0) return null

  // A friendly quick add is a sidekick, not a party member: it counts for half.
  const partySize = players.length + (friends.length - players.length) * 0.5
  const sized = players.length > 0 ? players : friends
  const levels = sized.map((c) => estimateLevel(c.hp.max, c.isPC ? c.abilities?.con : undefined))
  const partyLevel = clamp(
    Math.round(levels.reduce((a, b) => a + b, 0) / levels.length),
    1,
    THRESHOLDS.length,
  )

  const rawXp = foes.reduce((sum, c) => {
    if (c.isPC) return sum + estimateXp(c.hp.max, c.ac)
    const xp = c.inLair ? (c.creature.xpLair ?? c.creature.xp) : c.creature.xp
    return sum + (xp && xp > 0 ? xp : estimateXp(c.hp.max, c.creature.ac))
  }, 0)

  // A small party feels the same fight harder, a large one easier — shift a step.
  const sizeShift = partySize < 3 ? 1 : partySize > 5 ? -1 : 0
  const step = clamp(multiplierStep(foes.length) + sizeShift, 0, MULTIPLIERS.length - 1)
  const multiplier = MULTIPLIERS[step]
  const adjustedXp = Math.round(rawXp * multiplier)

  const [easy, medium, hard, deadly] = THRESHOLDS[partyLevel - 1]
  const budget = {
    easy: easy * partySize,
    medium: medium * partySize,
    hard: hard * partySize,
    deadly: deadly * partySize,
  }
  const tier: DifficultyTier =
    adjustedXp >= budget.deadly
      ? 'deadly'
      : adjustedXp >= budget.hard
        ? 'hard'
        : adjustedXp >= budget.medium
          ? 'medium'
          : adjustedXp >= budget.easy
            ? 'easy'
            : 'trivial'

  return {
    tier,
    rawXp,
    adjustedXp,
    multiplier,
    foeCount: foes.length,
    partyLevel,
    partySize,
    budget,
  }
}

function multiplierStep(foeCount: number): number {
  if (foeCount <= 1) return 0
  if (foeCount === 2) return 1
  if (foeCount <= 6) return 2
  if (foeCount <= 10) return 3
  if (foeCount <= 14) return 4
  return 5
}
