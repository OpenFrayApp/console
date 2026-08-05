// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { useMemo, useState } from 'react'
import type { GameLogCategory, GameLogEntry } from '../schema/encounter.ts'
import type { RollResult } from '../dice/roll.ts'
import { describeDamageWorking, describeRoll } from '../dice/describe.ts'
import type { AppliedEffect } from '../combat/effectroll.ts'
import { Modal } from './Modal.tsx'

/** What a roll carries beyond its dice — all optional, all known only at the call site. */
export interface RollDetails {
  /** Effects that changed the roll: advantage, Bless, and the rest. */
  applied?: AppliedEffect[]
  /**
   * Whose roll it is. The shared player view needs it to tell a creature's numbers
   * from a character's, since the message is prose and is never read back for meaning.
   */
  sourceId?: string
  /** For a saving throw: whether it succeeded. */
  saved?: boolean
  /** Keep the roll off the shared player view — GM bookkeeping (see GameLogEntry). */
  gmOnly?: boolean
}

export type OnRoll = (label: string, result: RollResult, details?: RollDetails) => void

/**
 * Record a roll the GM keeps to themselves — a creature's recharge or escape save,
 * which hands the table a resource or a bonus it hasn't seen. It reads identically in
 * the GM's own log; only the shared player view drops it.
 */
export type OnGmRoll = (label: string, result: RollResult) => void

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
  heal: 'bg-emerald-500',
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
  hp: 'Damage',
  heal: 'Heal',
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
  'heal',
  'turn',
  'rest',
  'death',
  'note',
]

/**
 * How an applied effect reads in the log. `describeRoll` already prints what every
 * effect did — the advantage state, and each flat modifier on its own — so the line
 * beside it names the *cause* and nothing else: "Exhaustion 3", not "Exhaustion 3:
 * -6" over a breakdown that already reads `+1 -6`. An effect named after its own mode
 * ("Disadvantage: disadvantage") would say nothing at all, so it is dropped.
 */
function describeAppliedForLog(a: AppliedEffect): string | null {
  return a.source.toLowerCase() === a.effect.toLowerCase() ? null : a.source
}

/** "18 piercing + 7 fire = 25" (the "= total" is dropped for a single type). */
function describeDamage(damage: { type: string; amount: number }[]): string {
  const parts = damage.filter((d) => d.amount > 0)
  if (parts.length === 0) return '0 damage'
  const text = parts.map((d) => `${d.amount} ${d.type}`).join(' + ')
  if (parts.length === 1) return text
  return `${text} = ${parts.reduce((s, d) => s + d.amount, 0)}`
}

const OUTCOME_LABEL = { hit: 'Hit', crit: 'Crit', miss: 'Miss' } as const

/** Colored category dot for a log entry; the category name is its tooltip. */
function Dot({ category }: { category: GameLogCategory }) {
  return (
    <span
      title={CATEGORY_LABEL[category]}
      className={`mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full ${CATEGORY_DOT[category]}`}
    />
  )
}

/**
 * How a roll turned out, under its breakdown: hit or miss for an attack, saved or
 * failed for a saving throw. Rendered from the entry's own fields, so it still reads
 * on the shared player view where a creature's dice have been withheld.
 */
function Outcome({ entry }: { entry: GameLogEntry }) {
  if (!entry.outcome && entry.saved === undefined) return null
  const missed = entry.outcome === 'miss' || entry.saved === false
  const label = entry.outcome ? OUTCOME_LABEL[entry.outcome] : entry.saved ? 'Saved' : 'Failed'
  return (
    <div className="pl-3 text-xs text-slate-500 dark:text-slate-400">
      <span
        className={
          missed
            ? 'text-slate-400 dark:text-slate-500'
            : 'font-medium text-slate-600 dark:text-slate-300'
        }
      >
        {label}
      </span>
      {entry.outcome !== 'miss' && entry.damage && entry.damage.length > 0 && (
        <> · {describeDamage(entry.damage)}</>
      )}
    </div>
  )
}

/**
 * The dice behind the damage, one line per type, under the totals — the same working
 * the to-hit line shows. Nothing renders on the shared player view, which strips a
 * roll's arithmetic before the table sees it: a damage breakdown states the creature's
 * bonus outright, where the total on its own is just what the blow came to.
 */
function DamageWorking({ entry }: { entry: GameLogEntry }) {
  if (entry.outcome === 'miss') return null
  const lines = describeDamageWorking(entry.damage ?? [])
  if (lines.length === 0) return null
  return (
    <div className="pl-3 text-xs text-slate-500 dark:text-slate-400">
      {lines.map((line, i) => (
        <div key={i}>{line}</div>
      ))}
    </div>
  )
}

/** One log entry: a roll with total, breakdown, and outcome, or a plain message line. */
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
                entry.result.crit || entry.outcome === 'crit'
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : entry.result.fumble
                    ? 'text-red-600 dark:text-red-400'
                    : ''
              }`}
            >
              {entry.result.total}
            </span>
          </div>
          {(() => {
            // The shared player view strips a creature's dice and modifier, leaving the
            // total alone — so there can be nothing left to break down, and an empty
            // line under the total would just look like a rendering fault.
            const breakdown = describeRoll(entry.result)
            const reasons = (entry.applied ?? []).map(describeAppliedForLog).filter(Boolean)
            if (!breakdown && reasons.length === 0) return null
            return (
              <div className="pl-3 text-xs text-slate-500 dark:text-slate-400">
                {breakdown}
                {reasons.length > 0 && <> · {reasons.join(', ')}</>}
              </div>
            )
          })()}
          <Outcome entry={entry} />
          <DamageWorking entry={entry} />
        </>
      ) : (
        <>
          <span className="flex items-baseline gap-1.5 text-sm text-slate-600 dark:text-slate-300">
            <Dot category={entry.category} />
            <span className="min-w-0">{entry.message}</span>
          </span>
          {/* A roll whose dice were withheld still says how it went. */}
          <Outcome entry={entry} />
          <DamageWorking entry={entry} />
        </>
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

  /** A filter chip; clicking it narrows the log to one category ('all' shows everything). */
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
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {present.length > 0 && chip('all', 'All')}
          {present.map((c) => chip(c, CATEGORY_LABEL[c]))}
        </div>
        {entries.length > 0 && (
          <button
            type="button"
            onClick={() => {
              onClear()
              onClose()
            }}
            className="shrink-0 text-xs text-slate-500 hover:underline dark:text-slate-400"
          >
            Clear log
          </button>
        )}
      </div>

      {groups.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">Nothing logged yet.</p>
      ) : (
        groups.map(([round, items]) => (
          <div key={round} className="mb-3">
            {/* Round 0 is pre-combat setup — the entries speak for themselves. */}
            {round > 0 && (
              <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                Round {round}
              </h4>
            )}
            <ul className="space-y-1.5">
              {items.map((entry) => (
                <LogLine key={entry.id} entry={entry} />
              ))}
            </ul>
          </div>
        ))
      )}
    </Modal>
  )
}
