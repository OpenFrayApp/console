// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { supabase } from '../lib/supabase.ts'
import { upgradePreset, type EffectPreset, type LegacyEffectPreset } from '../schema/preset.ts'

/**
 * The signed-in user's effect presets — the bundles they apply more than once, saved as
 * one JSONB blob per row in the `effects` table and isolated to the owner by Row-Level
 * Security. Mirrors `cloudSpells`. Presets a library ships never reach this: those follow
 * the enabled libraries and belong to nobody.
 */

/** Every preset the user owns, newest first — rows saved before parts upgrade on read. */
export async function loadEffectPresets(): Promise<EffectPreset[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('effects')
    .select('data')
    .order('updated_at', { ascending: false })
  if (error || !data) return []
  return data.map((row) => upgradePreset(row.data as EffectPreset | LegacyEffectPreset))
}

/** Save a newly-named preset. Best-effort; never blocks the UI. */
export async function saveEffectPreset(preset: EffectPreset): Promise<void> {
  if (!supabase) return
  await supabase.from('effects').insert({ name: preset.name, data: preset })
}

/** Replace an edited preset in place (matched by its stable id, RLS-scoped). */
export async function updateEffectPreset(preset: EffectPreset): Promise<void> {
  if (!supabase) return
  await supabase
    .from('effects')
    .update({ name: preset.name, data: preset })
    .eq('data->>id', preset.id)
}

/** Remove a preset by its stable id (RLS-scoped to the owner). */
export async function deleteEffectPreset(id: string): Promise<void> {
  if (!supabase) return
  await supabase.from('effects').delete().eq('data->>id', id)
}
