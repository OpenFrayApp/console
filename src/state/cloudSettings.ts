// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { supabase } from '../lib/supabase.ts'

/**
 * Per-account app settings — one JSONB row per user in the `user_settings` table
 * (`owner_id` PK, RLS-isolated). The home for signed-in preferences that should sync
 * across devices; today just which content libraries are enabled. Anonymous users
 * have no row and fall back to defaults.
 */
export interface UserSettings {
  /** Content library ids the compendium/picker show (see compendium/libraries.ts). */
  enabledLibraries?: string[]
}

export async function loadUserSettings(): Promise<UserSettings> {
  if (!supabase) return {}
  const { data, error } = await supabase.from('user_settings').select('data').maybeSingle()
  if (error || !data) return {}
  return (data.data as UserSettings) ?? {}
}

/** Upsert the user's settings row. Best-effort; never blocks the UI. */
export async function saveUserSettings(settings: UserSettings): Promise<void> {
  if (!supabase) return
  await supabase.from('user_settings').upsert({ data: settings }, { onConflict: 'owner_id' })
}
