// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/** True once the project URL + anon key are present (`.env.local` configured). */
export const isSupabaseConfigured = Boolean(url && anonKey)

/**
 * The Supabase client, or `null` when the app hasn't been pointed at a project
 * yet (no `.env.local`). Anonymous mode works entirely without it; auth and
 * cloud persistence light up only once it's configured.
 *
 * The anon/publishable key is a *public*, Row-Level-Security-gated key — it's
 * meant to ship in the browser bundle. Data isolation is enforced by the
 * database's RLS policies (every row's `owner_id` must equal `auth.uid()`),
 * never by hiding this key.
 */
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url as string, anonKey as string)
  : null
