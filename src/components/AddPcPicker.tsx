// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { useCallback, useRef, useState } from 'react'
import type { RosterPc } from '../schema/roster.ts'
import type { Campaign } from '../schema/campaign.ts'
import { useDismiss } from '../hooks/useDismiss.ts'
import { campaignAcronym } from './campaignLabels.ts'

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
}: {
  rosterPcs: RosterPc[]
  /** The user's campaigns, to show each PC's campaign acronym. */
  campaigns?: Campaign[]
  /** Add a saved roster PC to the current encounter. */
  onPick: (pc: RosterPc) => void
  /** Open the compendium's Characters tab to create a character. */
  onCreate: () => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const close = useCallback(() => setOpen(false), [])
  useDismiss(ref, open, close)

  const q = query.trim().toLowerCase()
  const matches = rosterPcs.filter((pc) => !q || pc.name.toLowerCase().includes(q))
  const campaignName = (id?: string | null): string | undefined =>
    campaigns.find((c) => c.id === id)?.name

  const pick = (pc: RosterPc) => {
    onPick(pc)
    setOpen(false)
  }
  const create = () => {
    setOpen(false)
    onCreate()
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        Add PC
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-1 w-64 rounded-md border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-700 dark:bg-slate-900">
          <input
            autoFocus
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your characters…"
            aria-label="Search your characters"
            className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-800"
          />
          {rosterPcs.length === 0 ? (
            <p className="mt-2 px-2 py-1 text-xs text-slate-500 dark:text-slate-400">
              No saved characters yet.
            </p>
          ) : (
            <ul className="mt-1 max-h-64 overflow-auto">
              {matches.map((pc) => (
                <li key={pc.id}>
                  <button
                    type="button"
                    onClick={() => pick(pc)}
                    className="flex w-full justify-between gap-2 rounded px-2 py-1 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <span className="truncate">{pc.name}</span>
                    <span
                      className="shrink-0 text-xs text-slate-400 dark:text-slate-500"
                      title={campaignName(pc.campaignId)}
                    >
                      {(() => {
                        const name = campaignName(pc.campaignId)
                        return name ? campaignAcronym(name) : ''
                      })()}
                    </span>
                  </button>
                </li>
              ))}
              {matches.length === 0 && (
                <li className="px-2 py-1 text-xs text-slate-500 dark:text-slate-400">No matches</li>
              )}
            </ul>
          )}
          <button
            type="button"
            onClick={create}
            className="mt-1 w-full rounded border-t border-slate-200 px-2 pt-2 pb-1 text-left text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:border-slate-800 dark:text-indigo-400"
          >
            Create a character…
          </button>
        </div>
      )}
    </div>
  )
}
