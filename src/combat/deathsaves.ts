// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import type { DeathSaves, PlayerCharacter } from '../schema/combatant.ts'
import { roll, type RollContext, type RollResult } from '../dice/roll.ts'

/**
 * Death saves, built as "apply this outcome" primitives. The app never rolls for
 * the player: the DM records Save/Fail directly (markDeathSaveSuccess/Failure);
 * rollDeathSave() is the optional in-app fallback for when the player can't roll.
 */

const NEEDED = 3
const SAVE_DC = 10

const tally = (pc: PlayerCharacter): DeathSaves =>
  pc.deathSaves ?? { successes: 0, failures: 0 }

const clampTally = (n: number): number => Math.max(0, Math.min(NEEDED, n))

function withTally(
  pc: PlayerCharacter,
  successes: number,
  failures: number,
): PlayerCharacter {
  const failed = clampTally(failures)
  return {
    ...pc,
    deathSaves: { successes: clampTally(successes), failures: failed },
    status: failed >= NEEDED ? 'dead' : pc.status,
  }
}

export function resetDeathSaves(pc: PlayerCharacter): PlayerCharacter {
  return { ...pc, deathSaves: { successes: 0, failures: 0 } }
}

export function markDeathSaveSuccess(pc: PlayerCharacter): PlayerCharacter {
  const { successes, failures } = tally(pc)
  return withTally(pc, successes + 1, failures)
}

export function markDeathSaveFailure(
  pc: PlayerCharacter,
  count = 1,
): PlayerCharacter {
  const { successes, failures } = tally(pc)
  return withTally(pc, successes, failures + count)
}

/** Three successes: stabilized at 0 HP (stays down until healed). */
export function stabilize(pc: PlayerCharacter): PlayerCharacter {
  return withTally(pc, NEEDED, tally(pc).failures)
}

export function isStable(pc: PlayerCharacter): boolean {
  return pc.status === 'unconscious' && tally(pc).successes >= NEEDED
}

/** Natural 20 on a death save: regain 1 HP and wake up. */
export function reviveAtOneHp(pc: PlayerCharacter): PlayerCharacter {
  return { ...resetDeathSaves(pc), hp: { ...pc.hp, current: 1 }, status: 'active' }
}

export type DeathSaveOutcome =
  | 'success'
  | 'failure'
  | 'critical-success'
  | 'critical-failure'

export interface DeathSaveRoll {
  pc: PlayerCharacter
  result: RollResult
  outcome: DeathSaveOutcome
}

/**
 * Optional in-app death save: roll 1d20 through the chokepoint and apply it.
 * Nat 20 → revive at 1 HP; nat 1 → two failures; 10+ → success; else failure.
 */
export function rollDeathSave(
  pc: PlayerCharacter,
  ctx: RollContext = {},
): DeathSaveRoll {
  const result = roll('1d20', { ...ctx, kind: 'save' })
  // A death save has its own nat-20 / nat-1 rule, independent of attack crits.
  const natural = result.dice.find((g) => g.sides === 20)?.kept[0]
  if (natural === 20) {
    return { pc: reviveAtOneHp(pc), result, outcome: 'critical-success' }
  }
  if (natural === 1) {
    return { pc: markDeathSaveFailure(pc, 2), result, outcome: 'critical-failure' }
  }
  if (result.total >= SAVE_DC) {
    return { pc: markDeathSaveSuccess(pc), result, outcome: 'success' }
  }
  return { pc: markDeathSaveFailure(pc, 1), result, outcome: 'failure' }
}
