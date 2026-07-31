// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { supabase } from '../lib/supabase.ts'
import type { Encounter } from '../schema/encounter.ts'

/**
 * Cloud persistence for signed-in users: the live encounter is one autosaved
 * JSONB blob in the `encounters` table, isolated to the owner by Row-Level
 * Security (the database checks `owner_id = auth.uid()`, never this code). The
 * local-first pattern is unchanged — the UI mutates in memory and renders at once;
 * these calls run in the background. Anonymous users never reach here (the client
 * is null), so their state stays in `sessionStorage`.
 */

/** The user's most recent encounter, or null if they have none / not configured. */
export async function loadCloudEncounter(): Promise<{
  id: string
  encounter: Encounter
  playerCode: string | null
} | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('encounters')
    .select('id, state, player_code')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error || !data) return null
  return {
    id: data.id,
    encounter: data.state as Encounter,
    playerCode: (data.player_code as string | null) ?? null,
  }
}

/** Whether a chosen share code was claimed, was already somebody else's, or didn't save. */
export type ClaimResult = 'ok' | 'taken' | 'failed'

/**
 * Claim a share code for this GM's encounter row. Uniqueness is a database index, and
 * the write is how we ask: Row-Level Security stops one GM from ever *reading*
 * another's row, so a lookup would come back empty and wrongly call every name free.
 * A `23505` unique violation is the real answer, and it settles a race between two GMs
 * claiming the same name at the same moment without a read policy or a round trip.
 */
export async function claimPlayerCode(id: string, code: string): Promise<ClaimResult> {
  if (!supabase) return 'failed'
  const { error } = await supabase.from('encounters').update({ player_code: code }).eq('id', id)
  if (!error) return 'ok'
  return (error as { code?: string }).code === '23505' ? 'taken' : 'failed'
}

/**
 * Upsert the encounter. With an `id` it updates that row; without one it inserts
 * (owner_id auto-fills from the session) and returns the new id to reuse. Returns
 * the row id, or the passed id on failure — persistence is best-effort, never a
 * gatekeeper for the UI.
 */
export async function saveCloudEncounter(
  id: string | null,
  encounter: Encounter,
): Promise<string | null> {
  if (!supabase) return id
  const updatedAt = new Date().toISOString()
  if (id) {
    const { error } = await supabase
      .from('encounters')
      .update({ state: encounter, updated_at: updatedAt })
      .eq('id', id)
    return error ? id : id
  }
  const { data, error } = await supabase
    .from('encounters')
    .insert({ state: encounter, updated_at: updatedAt })
    .select('id')
    .single()
  return error || !data ? null : (data.id as string)
}
