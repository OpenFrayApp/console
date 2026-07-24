// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import type { Ability } from '../schema/primitives.ts'
import type { Effect } from '../schema/effect.ts'

/**
 * Save-ends effects each get their own saving throw. Two effects that happen to
 * share an ability and DC came from different sources — one die can't end both, so
 * they are never rolled together.
 */
export interface SaveEnds {
  effect: Effect
  ability: Ability
  dc: number
  when: 'startOfTurn' | 'endOfTurn'
}

/** The escape save an effect carries, or null when nothing ends it that way. */
export function saveEndsOf(effect: Effect): SaveEnds | null {
  const d = effect.duration
  if (d.type !== 'saveEnds' || !d.save) return null
  return { effect, ability: d.save.ability, dc: d.save.dc, when: d.when ?? 'endOfTurn' }
}

/** Every save-ends effect on a combatant, each with its own save. */
export function saveEndsEffects(effects: Effect[]): SaveEnds[] {
  return effects.map(saveEndsOf).filter((s): s is SaveEnds => s !== null)
}
