// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { useMemo, useState } from 'react'
import type { GameLogCategory, GameLogEntry } from '../schema/encounter.ts'
import type { RollResult } from '../dice/roll.ts'
import { describeApplied, type AppliedEffect } from '../combat/effectroll.ts'
import { Modal } from './Modal.tsx'

export type OnRoll = (label: string, result: RollResult, applied?: AppliedEffect[]) => void

/**
 * Record a board event in the game log (a cast, a spent ability, a note). Defaults
 * to a plain `note`; pass a category so the entry gets the right icon and filter.
 */
export type OnNote = (label: string, category?: GameLogCategory) => void

const CATEGORY_DOT: Record<GameLogCategory, string> = {
  roll: 'bg-slate-400 dark:bg-slate-500',
  cast: 'bg-indigo-500',
  action: 'bg-amber-500',
  condition: 'bg-sky-500',
  concentration: 'bg-violet-500',
  hp: 'bg-rose-500',
  turn: 'bg-slate-300 dark:bg-slate-600',
  rest: 'bg-emerald-500',
  death: 'bg-red-600',
  note: 'bg-slate-400 dark:bg-slate-500',
}

const CATEGORY_LABEL: Record<GameLogCategory, string> = {
  roll: 'Roll',
  cast: 'Spell',
  action: 'Action',
  condition: 'Condition',
  concentration: 'Concentration',
  hp: 'HP',
  turn: 'Turn',
  rest: 'Rest',
  death: 'Death',
  note: 'Note',
}

const CATEGORY_ORDER: GameLogCategory[] = [
  'roll',
  'cast',
  'action',
  'condition',
  'concentration',
  'hp',
  'turn',
  'rest',
  'death',
  'note',
]

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

/**
 * A one-line breakdown of a roll. Each die group reads `NdM [v, v, …]`; when dice
 * are dropped (advantage / keep-highest) the kept ones follow as `→ k`.
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

function Dot({ category }: { category: GameLogCategory }) {
  return (
    <span
      title={CATEGORY_LABEL[category]}
      className={`mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full ${CATEGORY_DOT[category]}`}
    />
  )
}

function LogLine({ entry }: { entry: GameLogEntry }) {
  return (
    <li className="rounded border border-slate-200 px-3 py-1.5 dark:border-slate-800">
      {entry.result ? (
        <>
          <div className="flex items-baseline justify-between gap-2">
            <span className="flex min-w-0 items-baseline gap-1.5">
              <Dot category={entry.category} />
              <span className="truncate text-sm">{entry.message}</span>
            </span>
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
          <div className="pl-3 text-xs text-slate-500 dark:text-slate-400">
            {describeRoll(entry.result)}
            {(() => {
              const reasons = (entry.applied ?? []).map(describeAppliedForLog).filter(Boolean)
              return reasons.length > 0 ? <> · {reasons.join(', ')}</> : null
            })()}
          </div>
        </>
      ) : (
        <span className="flex items-baseline gap-1.5 text-sm text-slate-600 dark:text-slate-300">
          <Dot category={entry.category} />
          <span className="min-w-0">{entry.message}</span>
        </span>
      )}
    </li>
  )
}

/** The slim sidebar feed — renders entries in the order given (newest-first). */
export function GameLog({ entries }: { entries: GameLogEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">Nothing logged yet.</p>
  }
  return (
    <ul className="space-y-1.5">
      {entries.map((entry) => (
        <LogLine key={entry.id} entry={entry} />
      ))}
    </ul>
  )
}

/**
 * The full combat record — every entry grouped by round, with a category filter.
 * Receives the log oldest-first (chronological, as stored on the encounter).
 */
export function GameLogModal({
  entries,
  onClose,
  onClear,
}: {
  entries: GameLogEntry[]
  onClose: () => void
  onClear: () => void
}) {
  const [filter, setFilter] = useState<GameLogCategory | 'all'>('all')

  const present = useMemo(() => {
    const seen = new Set(entries.map((e) => e.category))
    return CATEGORY_ORDER.filter((c) => seen.has(c))
  }, [entries])

  const shown = filter === 'all' ? entries : entries.filter((e) => e.category === filter)

  const groups = useMemo(() => {
    const byRound = new Map<number, GameLogEntry[]>()
    for (const e of shown) {
      const list = byRound.get(e.round)
      if (list) list.push(e)
      else byRound.set(e.round, [e])
    }
    return [...byRound.entries()].sort((a, b) => a[0] - b[0])
  }, [shown])

  const chip = (key: GameLogCategory | 'all', label: string) => (
    <button
      key={key}
      type="button"
      onClick={() => setFilter(key)}
      className={`rounded-full border px-2.5 py-0.5 text-xs ${
        filter === key
          ? 'border-indigo-500 bg-indigo-500 text-white'
          : 'border-slate-300 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
      }`}
    >
      {label}
    </button>
  )

  return (
    <Modal
      title="Game log"
      subtitle={`${entries.length} ${entries.length === 1 ? 'entry' : 'entries'} this fight`}
      onClose={onClose}
    >
      {present.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {chip('all', 'All')}
          {present.map((c) => chip(c, CATEGORY_LABEL[c]))}
        </div>
      )}

      {groups.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">Nothing logged yet.</p>
      ) : (
        groups.map(([round, items]) => (
          <div key={round} className="mb-3">
            <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
              {round === 0 ? 'Setup' : `Round ${round}`}
            </h4>
            <ul className="space-y-1.5">
              {items.map((entry) => (
                <LogLine key={entry.id} entry={entry} />
              ))}
            </ul>
          </div>
        ))
      )}

      {entries.length > 0 && (
        <div className="mt-2 border-t border-slate-200 pt-2 dark:border-slate-800">
          <button
            type="button"
            onClick={() => {
              onClear()
              onClose()
            }}
            className="text-xs text-slate-500 hover:underline dark:text-slate-400"
          >
            Clear log
          </button>
        </div>
      )}
    </Modal>
  )
}
