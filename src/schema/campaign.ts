// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import type { Edition } from './primitives.ts'

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
}
