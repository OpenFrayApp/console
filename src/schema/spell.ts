// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import type { ContentSource, Edition } from './primitives.ts'

export interface SpellComponents {
  verbal: boolean
  somatic: boolean
  material: boolean
  /** The material component text, when there is one. */
  materials?: string
}

/**
 * A compendium spell. Spells are largely DM-adjudicated prose, so the body lives
 * in `text` (display only); the surrounding fields are the structured metadata
 * the UI filters and renders by. Shares the source/edition model with Creature.
 */
export interface Spell {
  /** Stable id, e.g. `"srd:fireball"`. */
  id: string
  source: ContentSource
  edition?: Edition
  name: string
  /** 0 for cantrips. */
  level: number
  school: string
  castingTime: string
  range: string
  components: SpellComponents
  duration: string
  concentration: boolean
  ritual: boolean
  /** Classes that have the spell on their list (for display/filtering). */
  classes?: string[]
  /** The spell description — display only. */
  text: string
}
