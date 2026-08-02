// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import type { Edition } from '../schema/primitives.ts'
import {
  DEFAULT_ENABLED_LIBRARIES,
  editionBadgeClass,
  editionLabel,
  inEnabledLibrary,
  librarySource,
  librarySourceBadgeClass,
  libraryTag,
} from '../compendium/libraries.ts'
import { useDismiss } from '../hooks/useDismiss.ts'
import { Button, EntryBadges as Badges, type ButtonVariant } from './ui.tsx'

/** The least a picker needs of a creature or spell: a label and its badges. */
export interface LibraryEntry {
  id: string
  name: string
  source: string
  edition?: Edition
}

/** True for a user-created entry (a `custom:` id) rather than a library one. */
const isCustom = (e: LibraryEntry): boolean => e.id.startsWith('custom:')

/** Custom / source / edition badges for one row, in the order the compendium uses. */
function EntryBadges({ entry, showEdition }: { entry: LibraryEntry; showEdition: boolean }) {
  // A custom entry carries its own edition and no source badge; a library entry
  // takes both from its library.
  const source = isCustom(entry) ? undefined : librarySource(entry.source)
  const edition = showEdition
    ? isCustom(entry)
      ? entry.edition
      : libraryTag(entry.source)
    : undefined
  return (
    <>
      <Badges
        custom={isCustom(entry)}
        source={source}
        sourceTone={librarySourceBadgeClass(entry.source)}
        edition={edition && editionLabel(edition)}
        editionTone={edition && editionBadgeClass(edition)}
      />
    </>
  )
}

/**
 * The search popover every content picker uses — Add creature, Cast spell, and the
 * "start from" on the custom forms. A trigger button opens a search over the enabled
 * libraries plus the GM's own entries, sorted the way the compendium is, each row
 * badged with where it came from. The list is only fetched once the popover opens
 * (`onOpen`).
 */
export function LibraryPicker<T extends LibraryEntry>({
  label,
  variant = 'secondary',
  disabled = false,
  align = 'right',
  placeholder,
  searchLabel,
  entries,
  custom = [],
  enabledLibraries = DEFAULT_ENABLED_LIBRARIES,
  showHomebrew = true,
  sortKey,
  meta,
  showEdition = true,
  onOpen,
  onPick,
  closeOnPick = true,
  children,
}: {
  label: string
  variant?: ButtonVariant
  disabled?: boolean
  /** Which edge of the trigger the popover hangs from. */
  align?: 'left' | 'right'
  placeholder: string
  searchLabel: string
  /** The library entries, or null while they load. */
  entries: T[] | null
  /** The GM's own entries, listed first and never filtered by library. */
  custom?: T[]
  enabledLibraries?: string[]
  showHomebrew?: boolean
  /** Numeric sort key (CR, spell level). When set, the list sorts by it ascending
   *  with name as tiebreak — the compendium's CR/level order; otherwise alphabetical. */
  sortKey?: (entry: T) => number
  /** Trailing text for a row, e.g. "CR 5" or "Lvl 3". */
  meta?: (entry: T) => ReactNode
  /** Whether rows carry an edition badge. Off for content that isn't edition-specific,
   *  like an effect preset — a condition reads the same in either edition. */
  showEdition?: boolean
  /** Fired when the popover opens, so the caller can fetch the entries. */
  onOpen?: () => void
  onPick: (entry: T) => void
  /** Whether picking closes the popover. Adding creatures leaves it open, so a
   *  reinforcement wave is a row of clicks rather than a row of reopenings. */
  closeOnPick?: boolean
  /** Extra controls above the search box, e.g. the cast panel's caster select. */
  children?: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const close = useCallback(() => {
    setOpen(false)
    setQuery('')
  }, [])
  useDismiss(ref, open, close)

  useEffect(() => {
    if (open) onOpen?.()
  }, [open, onOpen])

  const q = query.trim().toLowerCase()
  // Sorted across every enabled library — by the caller's key when given, else
  // alphabetically; the whole list lives in the scroll container, so it browses as
  // well as it searches.
  const matches = [...custom, ...(entries ?? [])]
    .filter((e) => inEnabledLibrary(e, enabledLibraries, showHomebrew))
    .filter((e) => !q || e.name.toLowerCase().includes(q))
    .sort((a, b) =>
      sortKey
        ? sortKey(a) - sortKey(b) || a.name.localeCompare(b.name)
        : a.name.localeCompare(b.name),
    )

  return (
    <div className="relative" ref={ref}>
      <Button variant={variant} onClick={() => setOpen((o) => !o)} disabled={disabled}>
        {label}
      </Button>
      {open && (
        <div
          className={`absolute ${align === 'left' ? 'left-0' : 'right-0'} z-30 mt-1 w-72 rounded-md border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-700 dark:bg-slate-900`}
        >
          {children}
          <input
            autoFocus
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            aria-label={searchLabel}
            className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-800"
          />
          {entries === null ? (
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Loading…</p>
          ) : (
            <ul className="mt-1 max-h-64 overflow-auto">
              {matches.map((e) => (
                <li key={e.id}>
                  <button
                    type="button"
                    onClick={() => {
                      if (closeOnPick) close()
                      onPick(e)
                    }}
                    className="flex w-full justify-between gap-2 rounded px-2 py-1 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <span className="truncate">{e.name}</span>
                    <span className="flex shrink-0 items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
                      <EntryBadges entry={e} showEdition={showEdition} />
                      {meta?.(e)}
                    </span>
                  </button>
                </li>
              ))}
              {matches.length === 0 && (
                <li className="px-2 py-1 text-xs text-slate-500 dark:text-slate-400">No matches</li>
              )}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
