// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { DEFAULT_CAMPAIGN_RULES, type Campaign } from '../schema/campaign.ts'
import {
  CRIT_OPTIONS,
  EDITION_OPTIONS,
  HP_OPTIONS,
  SURPRISE_OPTIONS,
  TIEBREAK_OPTIONS,
  labelOf,
} from './campaignLabels.ts'

function Row({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="font-semibold">{label}</dt>
      <dd>{value}</dd>
    </>
  )
}

/**
 * Read-only view of a campaign — its edition and house rules, in the same shape as
 * a creature stat block or spell card. Edit / Delete live in the bottom source row
 * (campaigns are always the viewer's own).
 */
export function CampaignCard({
  campaign,
  onEdit,
  onDelete,
}: {
  campaign: Campaign
  onEdit: () => void
  onDelete: () => void
}) {
  const rules = campaign.rules ?? DEFAULT_CAMPAIGN_RULES
  return (
    <div className="flex flex-1 flex-col space-y-3 pt-4">
      <div>
        <h3 className="text-lg font-semibold">{campaign.name}</h3>
        <p className="text-sm italic text-slate-500 dark:text-slate-400">
          {labelOf(EDITION_OPTIONS, campaign.edition)}
        </p>
      </div>

      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
        <Row label="Critical hit damage" value={labelOf(CRIT_OPTIONS, rules.crit)} />
        <Row label="Surprise round" value={labelOf(SURPRISE_OPTIONS, rules.surprise)} />
        <Row label="Creature HP" value={labelOf(HP_OPTIONS, rules.hp)} />
        <Row label="Initiative ties" value={labelOf(TIEBREAK_OPTIONS, rules.initiativeTiebreak)} />
      </dl>

      <div className="mt-auto flex items-center justify-end gap-2 border-t border-slate-200 pt-2 dark:border-slate-800">
        <button
          type="button"
          onClick={onEdit}
          className="rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="rounded border border-rose-300 px-2 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-950/40"
        >
          Delete
        </button>
      </div>
    </div>
  )
}
