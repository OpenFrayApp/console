// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import type { Campaign } from '../schema/campaign.ts'

/**
 * Footer control for the DM to pick which campaign they're running. The active
 * campaign's house rules then drive the console (crit damage, creature HP,
 * initiative ties). "No campaign" returns the console to the standard ruleset.
 * Signed-up-only and only shown when the user has at least one campaign.
 */
export function CampaignPicker({
  campaigns,
  activeId,
  onChange,
}: {
  campaigns: Campaign[]
  activeId: string | null
  onChange: (id: string | null) => void
}) {
  if (campaigns.length === 0) return null
  return (
    <label className="flex items-center gap-1.5 text-xs">
      <span className="text-slate-400 dark:text-slate-500">Campaign</span>
      <select
        value={activeId ?? ''}
        onChange={(e) => onChange(e.target.value || null)}
        aria-label="Active campaign"
        className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
      >
        <option value="">No campaign</option>
        {campaigns.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </label>
  )
}
