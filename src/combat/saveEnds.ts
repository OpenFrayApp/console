// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import type { Ability } from '../schema/primitives.ts'
import type { Effect } from '../schema/effect.ts'

/**
 * Save-ends effects that share one saving throw — same ability, DC, and timing —
 * are resolved with a single roll, not one per effect. Conditions applied together
 * (e.g. a spell that imposes two) carry the same save, so they group and end as one.
 */
export interface SaveEndsGroup {
  ability: Ability
  dc: number
  when: 'startOfTurn' | 'endOfTurn'
  effects: Effect[]
}

/** Group a combatant's save-ends effects by their shared save (ability + DC + timing). */
export function groupSaveEnds(effects: Effect[]): SaveEndsGroup[] {
  const groups = new Map<string, SaveEndsGroup>()
  for (const e of effects) {
    if (e.duration.type !== 'saveEnds' || !e.duration.save) continue
    const { ability, dc } = e.duration.save
    const when = e.duration.when ?? 'endOfTurn'
    const key = `${ability}|${dc}|${when}`
    const group = groups.get(key)
    if (group) group.effects.push(e)
    else groups.set(key, { ability, dc, when, effects: [e] })
  }
  return [...groups.values()]
}
