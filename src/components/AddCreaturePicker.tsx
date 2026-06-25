// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Creature } from '../schema/creature.ts'
import { loadSrdCreatures } from '../compendium/srd.ts'
import {
  DEFAULT_ENABLED_LIBRARIES,
  inEnabledLibrary,
  librarySource,
  libraryTag,
} from '../compendium/libraries.ts'
import { formatCr } from '../compendium/format.ts'
import { useDismiss } from '../hooks/useDismiss.ts'

/** A search popover to pick a creature (enabled SRD libraries + custom) to add. */
export function AddCreaturePicker({
  onPick,
  customCreatures = [],
  enabledLibraries = DEFAULT_ENABLED_LIBRARIES,
}: {
  onPick: (c: Creature) => void
  customCreatures?: Creature[]
  enabledLibraries?: string[]
}) {
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
  // Sort before slicing so the top results interleave libraries — otherwise the
  // first-loaded library (5.2) fills the whole unsearched list.
  const matches = [...customCreatures, ...(creatures ?? [])]
    .filter((c) => inEnabledLibrary(c, enabledLibraries))
    .filter((c) => !q || c.name.toLowerCase().includes(q))
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, 50)
  const isCustom = (c: Creature) => c.id.startsWith('custom:')
  // Source tag (Core / ToB3): only for library creatures, and only when more than one
  // library is on — with a single library every entry shares its source.
  const sourceTag = (c: Creature): string | undefined =>
    isCustom(c) || enabledLibraries.length <= 1 ? undefined : librarySource(c.source)
  // Edition tag: custom uses its own edition (always shown); SRD uses its library's
  // (shown only when more than one library is on, to avoid noise).
  const editionTag = (c: Creature): string | undefined =>
    isCustom(c) ? c.edition : enabledLibraries.length > 1 ? libraryTag(c.source) : undefined

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500"
      >
        Add creature
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
                    <span className="flex shrink-0 items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
                      {isCustom(c) && (
                        <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300">
                          Custom
                        </span>
                      )}
                      {sourceTag(c) && (
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                          {sourceTag(c)}
                        </span>
                      )}
                      {editionTag(c) && (
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                          {editionTag(c)}
                        </span>
                      )}
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
