// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import type { Action } from '../schema/action.ts'
import type { Creature } from '../schema/creature.ts'
import type { RandomSource } from './../dice/rng.ts'
import { roll, type RollResult } from '../dice/roll.ts'

/**
 * Recharge abilities — the headline monster-resource feature. An ability with a
 * dice recharge ("Recharge 5–6") is spent on use and comes back when a d6 meets
 * its threshold, rolled at the start of the creature's turn (or on demand). Every
 * such action is tracked by its id in the combatant's `limitedUseState`.
 */

/** Is this action gated behind a recharge die? */
export function isRechargeable(action: Action): boolean {
  return action.recharge?.type === 'dice'
}

/** Every rechargeable action on a creature, across all action categories. */
export function rechargeActions(creature: Creature): Action[] {
  return [
    ...(creature.actions ?? []),
    ...(creature.bonusActions ?? []),
    ...(creature.reactions ?? []),
    ...(creature.legendaryActions?.actions ?? []),
    ...(creature.lairActions ?? []),
  ].filter(isRechargeable)
}

/** "Recharge 5–6" / "Recharge 6" label for a dice-recharge action. */
export function rechargeRangeLabel(action: Action): string {
  const value = action.recharge?.type === 'dice' ? action.recharge.value : 6
  return value >= 6 ? 'Recharge 6' : `Recharge ${value}–6`
}

/**
 * Roll a recharge die. The ability returns on a roll at or above its threshold
 * (e.g. 5 for "Recharge 5–6"). Routes through the one dice chokepoint so the
 * roll is logged and uniform.
 */
export function rollRecharge(
  action: Action,
  ctx: { rand?: RandomSource } = {},
): { recharged: boolean; roll: RollResult } {
  const result = roll('1d6', { kind: 'raw', rand: ctx.rand })
  const threshold = action.recharge?.type === 'dice' ? action.recharge.value : 6
  return { recharged: result.total >= threshold, roll: result }
}
