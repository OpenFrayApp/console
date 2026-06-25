// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import type { Combatant } from './combatant.ts'

export interface EncounterLogEntry {
  id: string
  round: number
  message: string
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
  log: EncounterLogEntry[]
  /** Set on Begin; carries the recap clock + damage tallies. Absent before combat. */
  combatStats?: CombatStats
}
