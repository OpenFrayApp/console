// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import type { Creature, SpellLevel } from './creature.ts'
import type { Effect } from './effect.ts'
import type { AbilityScores, Senses, Speeds } from './primitives.ts'

export interface HitPoints {
  current: number
  max: number
  temp: number
}

export interface Concentration {
  /** What is being concentrated on (spell or effect name). */
  spell: string
  saveDc: number
  /** Round the concentration began. */
  round: number
  /** Rounds left before it lapses (ticked at the caster's turn); absent = indefinite. */
  rounds?: number | null
}

/** Spell slots consumed so far, keyed by level (decremented from template maxes). */
export type SlotsUsed = Partial<Record<SpellLevel, number>>

/** Live recharge / limited-use state, keyed by the LimitedUse id on the template. */
export interface LimitedUseState {
  available: boolean
}

/**
 * Free-form character notes a DM keeps on a PC — display-only reference, never
 * mechanics. Shared by the durable roster PC and the in-combat combatant so both
 * render the same stat block. The four short lists are roleplay prompts; `backstory`
 * is longer prose (markdown). Nothing here derives a build or branches logic.
 */
export interface CharacterDetails {
  alignment?: string
  /** Ancestry / race (Elf, Dwarf, …) — free text. */
  race?: string
  /** Deity / faith the character follows — matters for clerics & paladins. */
  faith?: string
  personalityTraits?: string[]
  ideals?: string[]
  bonds?: string[]
  flaws?: string[]
  /** Backstory / goals — longer prose, rendered as markdown. */
  backstory?: string
  /** Private DM notes for tracking anything about this character — markdown. */
  dmNotes?: string
}

/** Death is non-destructive: the combatant stays in order, greyed and skipped. */
export type CombatantStatus = 'active' | 'unconscious' | 'dead'

/** A downed PC's death-save tally (3 successes → stable, 3 failures → dead). */
export interface DeathSaves {
  successes: number
  failures: number
}

// Per-field visibility for the phase-2 player view. The flags exist now so the
// data model never needs migration; they are not rendered in phase 1.
export type NameVisibility = 'shown' | 'hidden' | 'unknown'
export type HpVisibility = 'exact' | 'bloodied' | 'hidden'
export type FieldVisibility = 'shown' | 'hidden'

export interface CombatantVisibility {
  name: NameVisibility
  hp: HpVisibility
  conditions: FieldVisibility
  ac: FieldVisibility
}

interface CombatantBase {
  combatantId: string
  initiative: number
  status: CombatantStatus
  hp: HitPoints
  concentration: Concentration | null
  /** Unified effect list — conditions are Effects too: one system, not two. */
  effects: Effect[]
  /**
   * Whether this combatant has spent its one reaction this round (opportunity
   * attack, readied action, Shield, …). Refreshes at the start of its turn.
   * Undefined = available. Independent of any specific reaction in the stat block.
   */
  reactionUsed?: boolean
}

/**
 * A monster or NPC in an encounter. Instantiated from a Creature template by
 * snapshotting its data into `creature` — editing the library template must
 * never mutate this in-progress copy.
 */
export interface MonsterCombatant extends CombatantBase {
  isPC: false
  /** Template id, for "open the source stat block". Combat reads `creature`. */
  creatureId: string
  /** Independent snapshot of the template. */
  creature: Creature
  /** Disambiguates duplicates, e.g. `"Goblin (B)"`. */
  label: string
  slotsUsed: SlotsUsed
  /** Per-spell uses spent, keyed by spell ref (or name). At-will spells aren't tracked. */
  spellUsesSpent: Record<string, number>
  limitedUseState: Record<string, LimitedUseState>
  /** Resets to `creature.legendaryActions.perRound` at the end of its turn. */
  legendaryRemaining: number
  /** Legendary Resistance uses spent (per day; the max depends on `inLair`). */
  legendaryResistanceSpent?: number
  /** Whether the fight is in this creature's lair (raises its Legendary Resistance). */
  inLair?: boolean
  visibility: CombatantVisibility
}

/**
 * A player character — deliberately lightweight. These few fields cover ~95% of
 * what a DM needs at the table; the player's sheet owns everything else.
 */
/**
 * A lightweight, non-snapshot combatant. Two flavours:
 * - `pc` — a player character: the combat-relevant fields the DM wants on the
 *   board (defenses, speed, etc.). Players roll their own dice.
 * - `quick` — a generic quick add (an NPC or a creature dropped in mid-fight):
 *   just name / HP / AC. Shown as "Quick add".
 * Defaults to `pc` when `kind` is absent.
 */
export interface PlayerCharacter extends CombatantBase, CharacterDetails {
  isPC: true
  kind?: 'pc' | 'quick'
  /**
   * The durable roster character this was instantiated from, when added from the
   * saved roster. Lets the encounter persist character-level edits (e.g. DM notes)
   * back to the DB. Absent for anonymous quick adds and PCs added at the table.
   */
  rosterId?: string
  /**
   * Friend vs foe for a quick add — drives the row colour and the pre-combat
   * grouping (a foe quick add sits with the Creatures, not the players). Absent
   * means friend; a `pc` is always a friend. Independent of `isPC`, which governs
   * mechanics (lightweight, rolls its own dice, no creature snapshot).
   */
  side?: 'friend' | 'foe'
  name: string
  ac: number
  /** Initiative modifier; used to roll at combat start when no value is entered. */
  initiativeMod?: number
  /** Passive Perception only — the anonymous quick form's lightweight field. */
  passivePerception?: number
  /** Full senses (PP + darkvision/etc.), carried from a durable roster PC. */
  senses?: Senses
  /** Languages the PC speaks, entered by the DM. Free-form. */
  languages?: string[]
  /** Damage resistances / immunities / vulnerabilities, entered by the DM. */
  resistances?: string[]
  immunities?: string[]
  vulnerabilities?: string[]
  speed?: Speeds
  /**
   * The six ability scores, carried from a durable roster PC (signed-in only).
   * Optional — anonymous PCs added at the table don't have them. Stored for a
   * future Dexterity-based initiative tiebreak; nothing derives from it yet.
   */
  abilities?: AbilityScores
  /** Present once the PC is downed; absent/zeroed when conscious. */
  deathSaves?: DeathSaves
}

/** Discriminated on `isPC`. */
export type Combatant = MonsterCombatant | PlayerCharacter
