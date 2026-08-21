// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import type { ReactNode } from 'react'
import { cx } from '../../lib/cx.ts'

/**
 * The compendium's one list shape: a count line, a bordered scroll list of selectable
 * rows, and a single row saying the list is empty. Every tab renders one of these —
 * only the count, the row's content and the empty sentence differ per tab, so those
 * are what a caller brings.
 */
export function EntryList<T extends { id: string }>({
  items,
  count,
  selectedId,
  onSelect,
  row,
  empty,
}: {
  items: T[]
  /** The count line above the list, e.g. "3 encounters". */
  count: ReactNode
  selectedId: string | null
  onSelect: (id: string) => void
  /** One row's content, laid out inside the selectable button. */
  row: (item: T) => ReactNode
  /** The single row shown when there is nothing to list. */
  empty: ReactNode
}) {
  return (
    <>
      <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">{count}</p>
      <ul className="mt-1 min-h-0 flex-1 divide-y divide-slate-100 overflow-auto rounded-md border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => onSelect(item.id)}
              className={cx(
                'flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-sm',
                item.id === selectedId
                  ? 'bg-indigo-50 dark:bg-indigo-950/40'
                  : 'hover:bg-slate-50 dark:hover:bg-slate-900',
              )}
            >
              {row(item)}
            </button>
          </li>
        ))}
        {items.length === 0 && (
          <li className="px-3 py-2 text-sm text-slate-500 dark:text-slate-400">{empty}</li>
        )}
      </ul>
    </>
  )
}
