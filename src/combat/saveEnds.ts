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

/**
 * The effect ids a successful escape save clears: the effect itself, plus every
 * bundle-mate it was applied with. A spell's repeated save "ends the spell", so when
 * Slow's anchor is shaken off, its Speed and AC parts go with it. Timers are
 * different — a bundle's durations still tick one by one.
 */
export function saveEndsClears(effect: Effect, all: Effect[]): string[] {
  if (!effect.bundle) return [effect.id]
  const bundleId = effect.bundle.id
  return all.filter((e) => e.id === effect.id || e.bundle?.id === bundleId).map((e) => e.id)
}
