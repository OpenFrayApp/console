// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import type { Combatant } from './combatant.ts'

export interface EncounterLogEntry {
  id: string
  round: number
  /** Human-readable summary. Richer roll data arrives with the dice engine. */
  message: string
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
}
