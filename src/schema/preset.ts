// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import type { ConditionName, EffectDuration } from './effect.ts'
import type { ModifierSpec } from '../combat/effects.ts'

/**
 * A named bundle of board state the GM applies more than once — Drunk, Hexed, a
 * disease stage. A preset is not an Effect: one press of Apply already commits several
 * at once (every staged condition, an optional modifier, an optional reminder), all
 * sharing one duration, so a preset stores that whole bundle.
 *
 * It carries no source and no concentration link — both belong to whoever applies it,
 * not to the template. Applying mints fresh Effects, so editing a preset afterwards
 * never touches what is already on the board.
 */
export interface EffectPreset {
  /** `custom:<uuid>` for the GM's own; `<library>:<slug>` for one a library ships. */
  id: string
  name: string
  /** The library that ships it. Absent on the GM's own, which is what makes it editable. */
  source?: string
  conditions: ConditionName[]
  /** The modifier builder's spec, or null when the preset carries none. */
  modifier: ModifierSpec | null
  /** The reminder text; becomes a tally instead when `counter` is set. */
  note: string | null
  /** The shared duration for the conditions and the modifier. */
  duration: EffectDuration
  /**
   * When set, the note becomes a tally the GM keeps by hand rather than a timed
   * reminder — Depth, Spore Load, a doom clock. Everything else staged with it lasts
   * until removed, having no timer to inherit.
   */
  counter?: boolean
}

/** A preset the GM owns, and may edit or delete. Library presets are read-only. */
export function isOwnPreset(preset: EffectPreset): boolean {
  return preset.source === undefined
}
