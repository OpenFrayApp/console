// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import type { Creature, SpellLevel } from './creature.ts'
import type { Effect } from './effect.ts'

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
}

/** Spell slots consumed so far, keyed by level (decremented from template maxes). */
export type SlotsUsed = Partial<Record<SpellLevel, number>>

/** Live recharge / limited-use state, keyed by the LimitedUse id on the template. */
export interface LimitedUseState {
  available: boolean
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
  limitedUseState: Record<string, LimitedUseState>
  /** Resets to `creature.legendaryActions.perRound` at the end of its turn. */
  legendaryRemaining: number
  visibility: CombatantVisibility
}

/**
 * A player character — deliberately lightweight. These few fields cover ~95% of
 * what a DM needs at the table; the player's sheet owns everything else.
 */
export interface PlayerCharacter extends CombatantBase {
  isPC: true
  name: string
  ac: number
  passivePerception: number
  /** Languages the PC speaks, entered by the DM. Free-form. */
  languages?: string[]
  /** Present once the PC is downed; absent/zeroed when conscious. */
  deathSaves?: DeathSaves
}

/** Discriminated on `isPC`. */
export type Combatant = MonsterCombatant | PlayerCharacter
