// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { supabase } from '../lib/supabase.ts'
import type { Campaign } from '../schema/campaign.ts'

/**
 * The signed-in user's campaigns — one JSONB blob per row in the `campaigns`
 * table, isolated to the owner by Row-Level Security. Each campaign carries its
 * own settings (edition, …). Anonymous users can't create campaigns, so they
 * never reach this; every call no-ops when Supabase isn't configured.
 */

/** Every campaign the user owns, newest first. */
export async function loadCampaigns(): Promise<Campaign[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('campaigns')
    .select('data')
    .order('updated_at', { ascending: false })
  if (error || !data) return []
  return data.map((row) => row.data as Campaign)
}

/** Save a new campaign. Best-effort; never blocks the UI. */
export async function saveCampaign(campaign: Campaign): Promise<void> {
  if (!supabase) return
  await supabase.from('campaigns').insert({ name: campaign.name, data: campaign })
}

/** Replace an edited campaign in place (matched by its stable id, RLS-scoped). */
export async function updateCampaign(campaign: Campaign): Promise<void> {
  if (!supabase) return
  await supabase
    .from('campaigns')
    .update({ name: campaign.name, data: campaign })
    .eq('data->>id', campaign.id)
}

/** Remove a campaign by its stable id (RLS-scoped to the owner). */
export async function deleteCampaign(id: string): Promise<void> {
  if (!supabase) return
  await supabase.from('campaigns').delete().eq('data->>id', id)
}
