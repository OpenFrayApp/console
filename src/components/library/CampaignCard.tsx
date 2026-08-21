// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { DEFAULT_CAMPAIGN_RULES, type Campaign } from '../../schema/campaign.ts'
import {
  CRIT_OPTIONS,
  EDITION_OPTIONS,
  HP_OPTIONS,
  LEVELING_OPTIONS,
  SURPRISE_OPTIONS,
  TIEBREAK_OPTIONS,
  labelOf,
} from './campaignLabels.ts'
import { SECTION_HEADING } from '../statblock/CreatureStatBlock.tsx'
import { GmNotes } from '../statblock/GmNotes.tsx'
import { Button } from '../ui/primitives.tsx'

/** One label/value line (dt/dd pair) in the rules list. */
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
  onEditNotes,
  onDelete,
}: {
  campaign: Campaign
  onEdit: () => void
  /** Commit the campaign notes edited here, without opening the form. */
  onEditNotes?: (text: string) => void
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
        <Row label="Level up" value={labelOf(LEVELING_OPTIONS, rules.leveling ?? 'xp')} />
      </dl>

      {(onEditNotes || campaign.notes?.trim()) && (
        <div>
          <h4 className={SECTION_HEADING}>Campaign notes</h4>
          <GmNotes
            value={campaign.notes}
            onCommit={onEditNotes}
            label="Campaign notes"
            prompt="campaign notes"
            savedTo="this campaign"
          />
        </div>
      )}

      <div className="mt-auto flex items-center justify-end gap-2 border-t border-slate-200 pt-2 dark:border-slate-800">
        <Button size="sm" onClick={onEdit}>
          Edit
        </Button>
        <Button size="sm" variant="danger" onClick={onDelete}>
          Delete
        </Button>
      </div>
    </div>
  )
}
