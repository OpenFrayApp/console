// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import type { Action, Recharge } from './action.ts'
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

/** Recharge / x-per-day abilities. */
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
  name: string
  /** Compendium id, e.g. `"srd-5.2:fireball"`; resolves the card + mechanics. */
  ref?: string
}

/**
 * How often a spell can be cast.
 * - `atWill` — unlimited (also covers cantrips).
 * - `perDay` — the 2024 "N/Day Each" model; *each* spell in the group has its own
 *   N uses, so casting one never spends another's (tracked in `spellUsesSpent`).
 * - `slots` — the 2014/5.1 prepared-caster model; spells of a given level all draw
 *   from a shared pool of that level's slots (counts in `Spellcasting.slots`,
 *   consumed via `Combatant.slotsUsed`).
 */
export type SpellUsage =
  | { type: 'atWill' }
  | { type: 'perDay'; per: number }
  | { type: 'slots'; level: number }

/** A usage tier of a spellcaster's list, e.g. "2/Day Each: Fireball, Invisibility". */
export interface SpellGroup {
  usage: SpellUsage
  spells: SpellRef[]
}

export interface Spellcasting {
  ability?: Ability
  /** The caster's save DC (used to pre-seed a cast); the spell never owns the DC. */
  saveDc?: number
  /** Spell attack bonus, when the block lists one. */
  toHit?: number
  /** Spells grouped by usage, in stat-block order. */
  groups: SpellGroup[]
  /** Per-level spell-slot maxes for the 2014/5.1 slot model (absent for 2024 monsters). */
  slots?: SpellSlots
  /** A trailing note from the stat block (e.g. "*casts these on itself before combat"). */
  note?: string
}

/**
 * The master schema, shared by monsters, NPCs, and the compendium. A library
 * Creature is a read-only *template*; adding it to combat instantiates a mutable
 * Combatant by snapshotting this data — editing a template must never mutate an
 * in-progress fight.
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
  /** Alignment, e.g. `"chaotic evil"`, `"unaligned"`, `"any alignment"`. Display only. */
  alignment?: string
  /**
   * Optional flavor/lore text (markdown), display only. Absent for SRD creatures —
   * that lore isn't part of the SRD — and populated only by imports / custom content.
   */
  description?: string
  ac: number
  maxHp: number
  /** Optional dice formula to roll HP per instance, e.g. `"19d12+133"`. */
  hpFormula?: string
  initiative?: number
  speed: Speeds
  abilities: AbilityScores
  /** Proficient saving throws only (others fall back to the ability modifier). */
  saves?: SaveBonuses
  /** Proficient skills. */
  skills?: SkillBonuses
  senses: Senses
  languages?: string[]
  /** Damage resistances / immunities / vulnerabilities, and condition immunities. */
  resistances?: string[]
  immunities?: string[]
  vulnerabilities?: string[]
  conditionImmunities?: string[]
  /** Challenge rating. */
  cr?: number
  /** XP award for the encounter, e.g. 15000 at CR 16. */
  xp?: number

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
  /** Uses per day of Legendary Resistance (turn a failed save into a success). */
  legendaryResistance?: number
  /** Higher Legendary Resistance count while in the creature's lair, when it has one. */
  legendaryResistanceLair?: number
}
