// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import type { RosterPc } from '../../schema/roster.ts'
import type { Campaign } from '../../schema/campaign.ts'
import { campaignAcronym } from '../library/campaignLabels.ts'
import { LibraryPicker } from './LibraryPicker.tsx'

// The roster dressed as a one-library shelf, so the picker's library filter keeps every PC.
const ROSTER_SOURCE = 'roster'

/**
 * The signed-in "Add PC" control: a popover to drop one of the user's saved roster
 * characters into the encounter, or jump to the compendium to create one. (Anonymous
 * users get the lightweight inline `AddPcForm` instead — they have no roster.)
 */
export function AddPcPicker({
  rosterPcs,
  campaigns = [],
  onPick,
  onCreate,
  autoOpen = false,
  openRequest,
  onClosed,
  keyHint,
  hideTrigger = false,
}: {
  rosterPcs: RosterPc[]
  /** The user's campaigns, to show each PC's campaign acronym. */
  campaigns?: Campaign[]
  /** Add a saved roster PC to the current encounter. */
  onPick: (pc: RosterPc) => void
  /** Open the compendium's Characters tab to create a character. */
  onCreate: () => void
  /** Start open, and report closing — the phone Add menu opens this one directly. */
  autoOpen?: boolean
  /** Bump to open the already-mounted control from outside — the keyboard's command. */
  openRequest?: number
  onClosed?: () => void
  /** Hide this control's own trigger — the Add menu keeps its button in the header. */
  hideTrigger?: boolean
  /** The keyboard chord, shown in the trigger's tooltip. */
  keyHint?: string
}) {
  /** Look up a campaign's name by id; undefined when the PC has no campaign. */
  const campaignName = (id?: string | null): string | undefined =>
    campaigns.find((c) => c.id === id)?.name
  const entries = rosterPcs.map((pc) => ({ id: pc.id, name: pc.name, source: ROSTER_SOURCE, pc }))

  return (
    <LibraryPicker
      label="Add PC"
      placeholder="Search your characters…"
      searchLabel="Search your characters"
      entries={entries}
      enabledLibraries={[ROSTER_SOURCE]}
      showEdition={false}
      // Picking deliberately keeps the popover open, like Add creature: dropping the
      // whole party in is several picks in a row. Escape or a click outside closes it.
      closeOnPick={false}
      onPick={(e) => onPick(e.pc)}
      row={(e) => {
        const name = campaignName(e.pc.campaignId)
        return (
          <>
            <span className="truncate">{e.name}</span>
            <span className="shrink-0 text-xs text-slate-400 dark:text-slate-500" title={name}>
              {name ? campaignAcronym(name) : ''}
            </span>
          </>
        )
      }}
      empty={
        <p className="mt-2 px-2 py-1 text-xs text-slate-500 dark:text-slate-400">
          No saved characters yet.
        </p>
      }
      footer={
        <button
          type="button"
          onClick={onCreate}
          className="mt-1 w-full rounded border-t border-slate-200 px-2 pt-2 pb-1 text-left text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:border-slate-800 dark:text-indigo-400"
        >
          Create a character…
        </button>
      }
      autoOpen={autoOpen}
      openRequest={openRequest}
      onClosed={onClosed}
      triggerTitle={keyHint ? `Add PC (${keyHint})` : undefined}
      hideTrigger={hideTrigger}
    />
  )
}
