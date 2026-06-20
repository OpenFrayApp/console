// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Creature } from '../schema/creature.ts'
import { loadSrdCreatures } from '../compendium/srd.ts'
import { formatCr } from '../compendium/format.ts'
import { useDismiss } from '../hooks/useDismiss.ts'

/** A search popover to pick an SRD creature to add to the encounter. */
export function AddCreaturePicker({ onPick }: { onPick: (c: Creature) => void }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [creatures, setCreatures] = useState<Creature[] | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  const close = useCallback(() => setOpen(false), [])
  useDismiss(ref, open, close)

  useEffect(() => {
    if (open && creatures === null) {
      loadSrdCreatures().then(setCreatures, () => setCreatures([]))
    }
  }, [open, creatures])

  const q = query.trim().toLowerCase()
  const matches = (creatures ?? [])
    .filter((c) => !q || c.name.toLowerCase().includes(q))
    .slice(0, 50)

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500"
      >
        + Add creature
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-1 w-72 rounded-md border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-700 dark:bg-slate-900">
          <input
            autoFocus
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search SRD creatures…"
            aria-label="Search SRD creatures"
            className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-800"
          />
          {creatures === null ? (
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Loading…</p>
          ) : (
            <ul className="mt-1 max-h-64 overflow-auto">
              {matches.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => onPick(c)}
                    className="flex w-full justify-between gap-2 rounded px-2 py-1 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <span className="truncate">{c.name}</span>
                    <span className="shrink-0 text-xs text-slate-400 dark:text-slate-500">
                      CR {formatCr(c.cr)}
                    </span>
                  </button>
                </li>
              ))}
              {matches.length === 0 && (
                <li className="px-2 py-1 text-xs text-slate-500 dark:text-slate-400">
                  No matches
                </li>
              )}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
