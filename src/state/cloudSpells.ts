// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { supabase } from '../lib/supabase.ts'
import type { Spell } from '../schema/spell.ts'

/**
 * The signed-in user's custom spell library — homebrew spells they've authored,
 * saved as one JSONB blob per row in the `spells` table and isolated to the owner by
 * Row-Level Security. Mirrors `cloudCreatures`: creating a spell saves it here, and
 * it then shows in the compendium and the cast picker. Anonymous users can't create
 * custom spells, so they never reach this.
 */

/** Every custom spell the user owns, newest first. */
export async function loadCustomSpells(): Promise<Spell[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('spells')
    .select('data')
    .order('updated_at', { ascending: false })
  if (error || !data) return []
  return data.map((row) => row.data as Spell)
}

/** Save a newly-authored spell to the library. Best-effort; never blocks the UI. */
export async function saveCustomSpell(spell: Spell): Promise<void> {
  if (!supabase) return
  await supabase.from('spells').insert({ name: spell.name, data: spell })
}

/** Replace an edited spell in place (matched by its stable id, RLS-scoped). */
export async function updateCustomSpell(spell: Spell): Promise<void> {
  if (!supabase) return
  await supabase
    .from('spells')
    .update({ name: spell.name, data: spell })
    .eq('data->>id', spell.id)
}

/** Remove a spell from the library by its stable id (RLS-scoped to the owner). */
export async function deleteCustomSpell(id: string): Promise<void> {
  if (!supabase) return
  await supabase.from('spells').delete().eq('data->>id', id)
}
