// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import type { Action } from './action.ts'
import type {
  Ability,
  AbilityScores,
  ContentSource,
  Edition,
  SaveBonuses,
  Senses,
  Size,
  SkillBonuses,
  Speeds,
} from './primitives.ts'

/** Spell levels 1–9 (cantrips have no slots, so they're excluded here). */
export type SpellLevel = '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9'

/** Max spell slots per level. */
export type SpellSlots = Partial<Record<SpellLevel, number>>

/**
 * How a limited-use ability comes back:
 * - `dice`     — recharge on a die roll, e.g. "Recharge 5–6" → `value: 5`
 * - `perDay`   — N uses per day
 * - `perRound` — N uses per round
 */
export type Recharge =
  | { type: 'dice'; value: number }
  | { type: 'perDay'; value: number }
  | { type: 'perRound'; value: number }

/** Recharge / x-per-day abilities (the headline monster-resource feature). */
export interface LimitedUse {
  id: string
  name: string
  recharge: Recharge
  action: Action
}

export interface LegendaryActions {
  perRound: number
  actions: Action[]
}

/** A passive feature (Amphibious, Legendary Resistance, etc.). Prose may be markdown. */
export interface Trait {
  name: string
  text: string
}

/** A reference from a spellcaster to a compendium spell entry. */
export interface SpellRef {
  level: number
  name: string
  /** Compendium id, e.g. `"srd:fireball"`. */
  ref?: string
}

export interface Spellcasting {
  ability: Ability
  saveDc: number
  toHit: number
  slots: SpellSlots
  spells: SpellRef[]
}

/**
 * The master schema, shared by monsters, NPCs, and the compendium. A library
 * Creature is a read-only *template*; adding it to combat instantiates a mutable
 * Combatant (build step 2) by snapshotting this data — editing a template must
 * never mutate an in-progress fight.
 *
 * Mechanics live in structured fields; prose lives in `Action.text`.
 */
export interface Creature {
  /** Stable id, e.g. `"srd:adult-red-dragon"`. */
  id: string
  source: ContentSource
  /** Campaign-level edition this block belongs to. */
  edition?: Edition
  name: string
  size: Size
  /** Creature type, e.g. `"dragon"`, `"humanoid"`. */
  type: string
  ac: number
  maxHp: number
  /** Optional dice formula to roll HP per instance, e.g. `"19d12+133"`. */
  hpFormula?: string
  speed: Speeds
  abilities: AbilityScores
  saves?: SaveBonuses
  skills?: SkillBonuses
  senses: Senses
  /** Challenge rating. */
  cr?: number

  /** Passive features shown above the actions. */
  traits?: Trait[]
  actions?: Action[]
  bonusActions?: Action[]
  reactions?: Action[]
  legendaryActions?: LegendaryActions
  /** Fire on initiative count 20. */
  lairActions?: Action[]
  spellcasting?: Spellcasting
  /** Recharge / x-per-day / x-per-round abilities. */
  limitedUse?: LimitedUse[]
}
