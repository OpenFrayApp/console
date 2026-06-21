// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { supabase } from '../lib/supabase.ts'
import type { Creature } from '../schema/creature.ts'

/**
 * The signed-in user's custom creature library — homebrew / SRD-excluded creatures
 * they've authored, saved as one JSONB blob per row in the `creatures` table and
 * isolated to the owner by Row-Level Security. Creating a creature saves it here
 * (not into a fight); it's then addable to encounters like any compendium entry.
 * Anonymous users can't create custom creatures, so they never reach this.
 */

/** Every custom creature the user owns, newest first. */
export async function loadCustomCreatures(): Promise<Creature[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('creatures')
    .select('data')
    .order('updated_at', { ascending: false })
  if (error || !data) return []
  return data.map((row) => row.data as Creature)
}

/** Save a newly-authored creature to the library. Best-effort; never blocks the UI. */
export async function saveCustomCreature(creature: Creature): Promise<void> {
  if (!supabase) return
  await supabase.from('creatures').insert({ name: creature.name, data: creature })
}
