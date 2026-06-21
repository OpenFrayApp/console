// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import type { Edition } from './primitives.ts'

/**
 * How a critical hit's damage is rolled. The console rolls monster damage, so
 * this drives those rolls (it never rolls a PC's attack).
 * - `double-dice`: roll all damage dice twice (5e standard).
 * - `max-plus-roll`: maximise the normal dice, then roll the extra crit dice.
 * - `double-total`: roll the normal damage once and double the result.
 */
export type CritRule = 'double-dice' | 'max-plus-roll' | 'double-total'

/**
 * How surprise is handled on the first round.
 * - `disadvantage`: surprised creatures roll initiative with disadvantage (2024).
 * - `skip`: surprised creatures skip their first turn (2014).
 */
export type SurpriseRule = 'disadvantage' | 'skip'

/** How a creature's hit points are determined when it enters the console. */
export type HpMethod = 'average' | 'roll' | 'min' | 'max'

/**
 * How initiative ties break.
 * - `dex`: higher Dexterity wins (then stable order).
 * - `pcs-first`: players act before monsters on a tie (common house rule).
 * - `manual`: leave tied creatures in insertion order for the DM to reorder.
 */
export type InitiativeTiebreak = 'dex' | 'pcs-first' | 'manual'

/** A campaign's house rules — combat options that vary table to table. */
export interface CampaignRules {
  crit: CritRule
  surprise: SurpriseRule
  hp: HpMethod
  initiativeTiebreak: InitiativeTiebreak
}

/** The 5.5-first defaults, applied to campaigns that predate the rules block. */
export const DEFAULT_CAMPAIGN_RULES: CampaignRules = {
  crit: 'double-dice',
  surprise: 'disadvantage',
  hp: 'average',
  initiativeTiebreak: 'dex',
}

/**
 * A campaign: a signed-up user's container for a game, carrying the settings that
 * apply across its encounters. Edition is a campaign-level choice (which SRD values
 * surface), not a per-creature toggle. Stored as one JSONB blob per row in the
 * `campaigns` table, isolated to the owner by Row-Level Security. Anonymous users
 * have no campaigns.
 */
export interface Campaign {
  /** Stable id, generated client-side; matches the row's `data->>id`. */
  id: string
  name: string
  edition: Edition
  /** House rules; optional for back-compat (fall back to DEFAULT_CAMPAIGN_RULES). */
  rules?: CampaignRules
}
