// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import type { Combatant } from './combatant.ts'
import type { RollResult } from '../dice/roll.ts'
import type { AppliedEffect } from '../combat/effectroll.ts'

/**
 * What kind of thing a game-log entry records. Drives the sidebar icon and the
 * review-modal filter. `roll` carries dice detail; the rest are board events.
 */
export type GameLogCategory =
  | 'roll'
  | 'cast'
  | 'action'
  | 'condition'
  | 'concentration'
  | 'hp'
  | 'turn'
  | 'rest'
  | 'death'
  | 'note'

/**
 * One line in the game log — the full combat record. Replaces the old roll-only
 * log: dice rolls keep their `result`/`applied` detail, board events (a condition
 * applied, a turn passing, damage taken) carry just a `message` + `category`.
 */
export interface GameLogEntry {
  id: string
  round: number
  category: GameLogCategory
  message: string
  /** Dice detail; present only for `roll` entries. */
  result?: RollResult
  applied?: AppliedEffect[]
  /** The combatant the entry is about, when known (for future filtering). */
  sourceId?: string
  /**
   * For a resolved attack, collapsed onto one entry with its to-hit `result`: the
   * outcome and the damage rolled per type (omitted on a miss). Lets the log show
   * "Bite → Ogre · 27 hit · 18 piercing + 7 fire" as a single line.
   */
  outcome?: 'hit' | 'crit' | 'miss'
  damage?: { type: string; amount: number }[]
}

/**
 * Combat clock + tallies kept while a fight runs, read by the end-of-combat recap.
 * The IRL clock excludes paused time (`activeMs` accumulates; `runningSince` is when
 * it last started, null while paused/ended). See `combat/recap.ts`.
 */
export interface CombatStats {
  startedAt: number
  activeMs: number
  runningSince: number | null
  /** combatantId → damage dealt (only where a source is known; drives the MVP). */
  damageDealt: Record<string, number>
  /** combatantId → damage taken (every HP loss, captured by the reducer). */
  damageTaken: Record<string, number>
  /** The single largest damage instance dealt, and by whom. */
  biggestHit: { sourceId: string; amount: number } | null
}

/**
 * The whole session state — persisted as one autosaved JSONB blob. Combatants
 * live inside it, not as separately-queried rows.
 */
export interface Encounter {
  encounterId: string
  /** Owner for row-level security; null for anonymous, ephemeral sessions. */
  ownerId: string | null
  name?: string
  round: number
  /** Combat is started (round > 0) but held — the turn cursor is hidden until resumed. */
  paused?: boolean
  /** Index into the initiative-sorted combatants of whose turn it is. */
  activeIndex: number
  /** Short rests taken since the last long rest (reset to 0 on a long rest). */
  shortRests?: number
  /** Sorted by initiative descending. */
  combatants: Combatant[]
  /** The full combat record — every roll and board event, in chronological order. */
  log: GameLogEntry[]
  /** Set on Begin; carries the recap clock + damage tallies. Absent before combat. */
  combatStats?: CombatStats
}
