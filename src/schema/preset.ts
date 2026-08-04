// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import type { ConditionName, EffectDuration } from './effect.ts'
import type { ModifierSpec } from '../combat/effects.ts'

/**
 * A named bundle of board state the GM applies more than once — Drunk, Hexed, a
 * disease stage. A preset is not an Effect: applying one mints several at once,
 * so a preset stores the whole bundle as a list of parts.
 *
 * It carries no source and no concentration link — both belong to whoever applies it,
 * not to the template. Applying mints fresh Effects, so editing a preset afterwards
 * never touches what is already on the board.
 */

/**
 * One part of a preset: a condition, a modifier, a reminder, a counter, or a change in
 * Exhaustion. The timed parts share the preset's one duration; a counter has no timer to
 * share and always lands as its own independent effect, outside the applied bundle.
 * `gmOnly` keeps a part off the shared player view.
 *
 * Exhaustion is the one part stored as a **change** rather than a value: the rules make
 * it cumulative ("each time you receive it, you gain 1 Exhaustion level"), so a night in
 * the cold costs a level whatever the creature was already carrying. `levels` may be
 * negative for a preset that relieves it.
 */
export type PresetPart =
  | { kind: 'condition'; condition: ConditionName; gmOnly?: boolean }
  | { kind: 'modifier'; modifier: ModifierSpec; gmOnly?: boolean }
  | { kind: 'reminder'; note: string; gmOnly?: boolean }
  | { kind: 'counter'; name: string; start?: number; gmOnly?: boolean }
  | { kind: 'exhaustion'; levels: number }

export interface EffectPreset {
  /** `custom:<uuid>` for the GM's own; `<library>:<slug>` for one a library ships. */
  id: string
  name: string
  /** The library that ships it. Absent on the GM's own, which is what makes it editable. */
  source?: string
  /** The one duration the condition, modifier, and reminder parts share. */
  duration: EffectDuration
  parts: PresetPart[]
}

/**
 * The shape presets were first saved in: flat fields for one modifier, one note,
 * and a `counter` flag that turned the note into a tally. Kept only so stored
 * rows can be read back; everything else works on parts.
 */
export interface LegacyEffectPreset {
  id: string
  name: string
  source?: string
  conditions: ConditionName[]
  modifier: ModifierSpec | null
  note: string | null
  duration: EffectDuration
  counter?: boolean
}

/** Whether a stored preset predates parts — the upgrade trigger. */
function isLegacy(p: EffectPreset | LegacyEffectPreset): p is LegacyEffectPreset {
  return !('parts' in p) || !Array.isArray((p as EffectPreset).parts)
}

/**
 * Read a stored preset in either shape, upgrading the flat pre-parts form. A
 * legacy counter preset becomes a counter part named after its note; everything
 * else maps one field to one part.
 */
export function upgradePreset(p: EffectPreset | LegacyEffectPreset): EffectPreset {
  if (!isLegacy(p)) return p
  const parts: PresetPart[] = []
  for (const condition of p.conditions) parts.push({ kind: 'condition', condition })
  if (p.modifier) parts.push({ kind: 'modifier', modifier: p.modifier })
  if (p.note) {
    if (p.counter) parts.push({ kind: 'counter', name: p.note })
    else parts.push({ kind: 'reminder', note: p.note })
  }
  return {
    id: p.id,
    name: p.name,
    ...(p.source !== undefined ? { source: p.source } : {}),
    // A legacy counter stored `{type: 'counter'}` as the shared duration; the
    // counter is its own part now, so the rest of the bundle falls back to manual.
    duration: p.duration.type === 'counter' ? { type: 'manual' } : p.duration,
    parts,
  }
}

/** A preset the GM owns, and may edit or delete. Library presets are read-only. */
export function isOwnPreset(preset: EffectPreset): boolean {
  return preset.source === undefined
}
