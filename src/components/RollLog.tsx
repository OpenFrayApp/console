// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import type { RollResult } from '../dice/roll.ts'
import { describeApplied, type AppliedEffect } from '../combat/effectroll.ts'

/**
 * How an applied effect reads in the log, where `describeRoll` already prints the
 * advantage/disadvantage state. So an adv/disadv effect only needs to name its
 * *cause* (e.g. "Reckless Attack"); a generic "Advantage"/"Disadvantage" chip adds
 * nothing over the state and is dropped. Flat bonuses (Bless) keep their detail.
 */
function describeAppliedForLog(a: AppliedEffect): string | null {
  if (a.effect === 'advantage' || a.effect === 'disadvantage') {
    return a.source.toLowerCase() === a.effect.toLowerCase() ? null : a.source
  }
  return describeApplied(a)
}

export interface RollEntry {
  id: string
  label: string
  /** Absent for a note-only entry (e.g. "Mage casts Fireball"), which has no dice. */
  result?: RollResult
  applied?: AppliedEffect[]
}

export type OnRoll = (
  label: string,
  result: RollResult,
  applied?: AppliedEffect[],
) => void

/** Record a roll-less line in the log (a cast, a spent ability, a board note). */
export type OnNote = (label: string) => void

/**
 * A one-line breakdown of a roll — the transparency that builds trust. Each die
 * group reads `NdM [v, v, …]`; when dice are dropped (advantage / keep-highest)
 * the kept ones follow as `→ k`. The grand total is shown separately, so the
 * per-die values aren't repeated as a sum.
 */
function describeRoll(result: RollResult): string {
  const dice = result.dice.map((g) => {
    const head = `${g.sign < 0 ? '−' : ''}${g.results.length}d${g.sides}`
    const rolls = `[${g.results.join(', ')}]`
    const base =
      g.results.length === g.kept.length
        ? `${head} ${rolls}`
        : `${head} ${rolls} → ${g.kept.join(', ')}`
    // A crit rule (maximised normal dice, or a doubled total) adds to this group
    // beyond the kept dice — surface it so the breakdown reconciles with the total.
    const keptSum = g.sign * g.kept.reduce((a, b) => a + b, 0)
    const critBonus = g.total - keptSum
    return critBonus === 0 ? base : `${base} ${critBonus >= 0 ? '+' : '−'}${Math.abs(critBonus)} crit`
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
          {entry.result ? (
            <>
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
                {(() => {
                  const reasons = (entry.applied ?? []).map(describeAppliedForLog).filter(Boolean)
                  return reasons.length > 0 ? <> · {reasons.join(', ')}</> : null
                })()}
              </div>
            </>
          ) : (
            // A note-only line (no dice): a cast or other board event.
            <span className="text-sm text-slate-600 dark:text-slate-300">{entry.label}</span>
          )}
        </li>
      ))}
    </ul>
  )
}
