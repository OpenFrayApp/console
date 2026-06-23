// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import type { Ability, ContentSource, Edition } from './primitives.ts'
import type { DamageRoll, SaveOutcome } from './action.ts'

export interface SpellComponents {
  verbal: boolean
  somatic: boolean
  material: boolean
  /** The material component text, when there is one. */
  materials?: string
}

/**
 * The save a spell forces. The DC is deliberately absent: it belongs to the
 * caster, not the spell (a monster's `Spellcasting.saveDc`, or DM-entered for a
 * PC, since a PC's DC depends on a build we don't model). `onSave` is `undefined`
 * when it can't be read from the spell text; the DM confirms it at cast time.
 */
export interface SpellSave {
  ability: Ability
  onSave?: SaveOutcome
}

/** A damage variant when the spell is cast at a higher level. */
export interface SpellScaling {
  /** Slot level (`by: 'slot'`) or caster/character level (`by: 'character'`). */
  level: number
  by: 'slot' | 'character'
  damage: DamageRoll[]
}

/**
 * Structured, rollable mechanics for a spell — present only when the spell has
 * any (damage, a save, or a spell attack). Utility spells (Shield, Detect Magic)
 * have none. Only *typed* damage is captured here; healing dice are not modelled yet.
 */
export interface SpellMechanics {
  /** Base damage at the spell's own level. */
  damage?: DamageRoll[]
  /** True when the spell resolves with a spell attack roll against AC. */
  attackRoll?: boolean
  /** Present when the spell forces a saving throw. */
  save?: SpellSave
  /** Higher-level damage variants, from the source's casting options. */
  scaling?: SpellScaling[]
}

/**
 * A compendium spell: display metadata, the prose body (`text`), and optional
 * structured `mechanics` for rolling. The DC is never a spell field — it comes from
 * the caster, not the spell. Shares the source/edition model with Creature.
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
  /** Structured mechanics for rolling/casting; absent for utility spells. */
  mechanics?: SpellMechanics
}
