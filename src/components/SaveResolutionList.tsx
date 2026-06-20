// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import type { SaveResult } from '../combat/masssave.ts'

export interface SaveLine {
  combatantId: string
  label: string
  /** The save roll total, if it has been rolled or recorded. */
  total?: number
  result: SaveResult | 'pending'
}

function ResultBadge({ result }: { result: SaveResult | 'pending' }) {
  const base = 'rounded px-1.5 text-xs font-semibold uppercase tracking-wide'
  if (result === 'save') {
    return (
      <span className={`${base} bg-emerald-200 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200`}>
        Save
      </span>
    )
  }
  if (result === 'fail') {
    return (
      <span className={`${base} bg-rose-200 text-rose-800 dark:bg-rose-900 dark:text-rose-200`}>
        Fail
      </span>
    )
  }
  return (
    <span className={`${base} bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300`}>
      —
    </span>
  )
}

/**
 * Renders a group of save results as a pass/fail list — the shared resolution
 * renderer for mass saves and single-target saves alike.
 */
export function SaveResolutionList({ lines }: { lines: SaveLine[] }) {
  return (
    <ul className="divide-y divide-slate-200 dark:divide-slate-800">
      {lines.map((line) => (
        <li
          key={line.combatantId}
          className="flex items-center justify-between gap-3 py-1.5"
        >
          <span className="min-w-0 truncate font-medium">{line.label}</span>
          <span className="flex items-center gap-3">
            {line.total != null && (
              <span className="tabular-nums text-slate-500 dark:text-slate-400">
                {line.total}
              </span>
            )}
            <ResultBadge result={line.result} />
          </span>
        </li>
      ))}
    </ul>
  )
}
