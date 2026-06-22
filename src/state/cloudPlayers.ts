// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { supabase } from '../lib/supabase.ts'
import type { RosterPc } from '../schema/roster.ts'

/**
 * The signed-in user's party roster — durable player characters saved as one JSONB
 * blob per row in the `players` table, isolated to the owner by Row-Level Security.
 * A roster PC is reusable across encounters; adding it to a fight instantiates a
 * fresh combatant. Anonymous users add ephemeral PCs at the table instead, so they
 * never reach this; every call no-ops when Supabase isn't configured.
 */

/** Every roster PC the user owns, newest first. */
export async function loadRosterPcs(): Promise<RosterPc[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('players')
    .select('data')
    .order('updated_at', { ascending: false })
  if (error || !data) return []
  return data.map((row) => row.data as RosterPc)
}

/** Save a new roster PC. Best-effort; never blocks the UI. */
export async function saveRosterPc(pc: RosterPc): Promise<void> {
  if (!supabase) return
  await supabase.from('players').insert({ name: pc.name, data: pc })
}

/** Replace an edited roster PC in place (matched by its stable id, RLS-scoped). */
export async function updateRosterPc(pc: RosterPc): Promise<void> {
  if (!supabase) return
  await supabase.from('players').update({ name: pc.name, data: pc }).eq('data->>id', pc.id)
}

/** Remove a roster PC by its stable id (RLS-scoped to the owner). */
export async function deleteRosterPc(id: string): Promise<void> {
  if (!supabase) return
  await supabase.from('players').delete().eq('data->>id', id)
}
