// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import type { Creature } from '../schema/creature.ts'
import type { Spell } from '../schema/spell.ts'
import type { RosterPc } from '../schema/roster.ts'
import type { ConditionName } from '../schema/effect.ts'
import { CONDITION_TEXT } from './conditions.ts'
import { inEnabledLibrary } from './libraries.ts'

export type ReferenceResult =
  | { kind: 'creature'; entry: Creature }
  | { kind: 'spell'; entry: Spell }
  | { kind: 'character'; entry: RosterPc }
  | { kind: 'condition'; entry: { id: string; name: ConditionName } }

export interface SearchReferences {
  creatures: Creature[]
  spells: Spell[]
  /** Only the signed-in owner's roster is supplied by the caller. */
  characters: RosterPc[]
  enabledLibraries: string[]
  showHomebrew: boolean
}

/** Find all name matches across references, preserving each template's independent identity. */
export function searchReferences(
  query: string,
  data: SearchReferences,
): {
  matches: ReferenceResult[]
  total: number
} {
  const name = query.trim().toLowerCase()
  if (!name) return { matches: [], total: 0 }
  const results: ReferenceResult[] = [
    ...data.creatures
      .filter((entry) => inEnabledLibrary(entry, data.enabledLibraries, data.showHomebrew))
      .map((entry) => ({ kind: 'creature' as const, entry })),
    ...data.spells
      .filter((entry) => inEnabledLibrary(entry, data.enabledLibraries, data.showHomebrew))
      .map((entry) => ({ kind: 'spell' as const, entry })),
    ...data.characters.map((entry) => ({ kind: 'character' as const, entry })),
    ...(Object.keys(CONDITION_TEXT) as ConditionName[]).map((name) => ({
      kind: 'condition' as const,
      entry: { id: name, name },
    })),
  ]
  /** Rank exact names first, then prefixes, then other substrings. */
  const rank = (entry: ReferenceResult) => {
    const candidate = entry.entry.name.toLowerCase()
    return candidate === name ? 0 : candidate.startsWith(name) ? 1 : 2
  }
  const matches = results
    .filter((r) => r.entry.name.toLowerCase().includes(name))
    .sort(
      (a, b) =>
        rank(a) - rank(b) ||
        a.entry.name.localeCompare(b.entry.name) ||
        a.kind.localeCompare(b.kind) ||
        a.entry.id.localeCompare(b.entry.id),
    )
  return { matches, total: matches.length }
}
