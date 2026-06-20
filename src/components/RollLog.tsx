// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import type { RollResult } from '../dice/roll.ts'
import type { AppliedEffect } from '../combat/effectroll.ts'

export interface RollEntry {
  id: string
  label: string
  result: RollResult
  applied?: AppliedEffect[]
}

export type OnRoll = (
  label: string,
  result: RollResult,
  applied?: AppliedEffect[],
) => void

/** A one-line breakdown of a roll — the transparency that builds trust. */
function describeRoll(result: RollResult): string {
  const dice = result.dice.map((g) => {
    const rolled =
      g.results.length > 1
        ? `${g.results.join('/')}→${g.kept.join('+')}`
        : g.kept.join('+')
    return `${g.sign < 0 ? '−' : ''}d${g.sides}(${rolled})`
  })
  let line = dice.join(' + ')
  if (result.modifier) line += ` ${result.modifier >= 0 ? '+' : ''}${result.modifier}`
  if (result.advantageState !== 'normal') line += ` · ${result.advantageState}`
  if (result.crit) line += ' · CRIT'
  if (result.fumble) line += ' · FUMBLE'
  return line
}

export function RollLog({ entries }: { entries: RollEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">No rolls yet.</p>
  }
  return (
    <ul className="space-y-1.5">
      {entries.map((entry) => (
        <li
          key={entry.id}
          className="rounded border border-slate-200 px-3 py-1.5 dark:border-slate-800"
        >
          <div className="flex items-baseline justify-between gap-2">
            <span className="truncate text-sm">{entry.label}</span>
            <span
              className={`text-lg font-bold tabular-nums ${
                entry.result.crit
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : entry.result.fumble
                    ? 'text-red-600 dark:text-red-400'
                    : ''
              }`}
            >
              {entry.result.total}
            </span>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {describeRoll(entry.result)}
            {entry.applied && entry.applied.length > 0 && (
              <> · {entry.applied.map((a) => `${a.source}: ${a.effect}`).join(', ')}</>
            )}
          </div>
        </li>
      ))}
    </ul>
  )
}
