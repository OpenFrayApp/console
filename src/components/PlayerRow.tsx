// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import type { PlayerRow as Row } from '../combat/playerView.ts'
import { cx } from '../lib/cx.ts'
import { DeathSavePips } from './DeathSaveControls.tsx'
import { hpToneFor, TIER_LABEL } from './hpTone.ts'

/**
 * A creature's hit points as the table is allowed to see them: a number, a wound word,
 * or nothing at all. The GM's own tracker never renders this — it always has the
 * numbers — so the three shapes live here rather than in `CombatantRow`.
 */
function Health({ hp }: { hp: Row['hp'] }) {
  if (!hp) return null
  if (hp.kind === 'tier') {
    return <span className={hpToneFor(hp.tier)}>{TIER_LABEL[hp.tier]}</span>
  }
  return (
    <span className="tabular-nums">
      <span className={hpToneFor(hp.current >= hp.max ? 'healthy' : 'hurt')}>{hp.current}</span>
      <span className="text-slate-400 dark:text-slate-500">/{hp.max}</span>
      {hp.temp > 0 && <span className="text-sky-600 dark:text-sky-400"> +{hp.temp}</span>}
    </span>
  )
}

/**
 * One row of the shared tracker. It takes the already-filtered `PlayerRow` rather than
 * a Combatant, because a Combatant carries the whole stat block and that is exactly
 * what never reaches this screen.
 */
export function PlayerRow({ row, active }: { row: Row; active: boolean }) {
  const dead = row.status === 'dead'
  return (
    <li
      aria-current={active ? 'true' : undefined}
      className={cx(
        'flex items-center gap-3 rounded-lg border border-l-4 px-3 py-2',
        row.isFoe
          ? 'border-l-rose-400 dark:border-l-rose-500'
          : 'border-l-sky-400 dark:border-l-sky-500',
        active
          ? 'border-indigo-400 bg-indigo-50 dark:border-indigo-500 dark:bg-indigo-950/40'
          : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900',
        dead && 'opacity-50',
      )}
    >
      <span className="w-7 shrink-0 text-center text-sm tabular-nums text-slate-500 dark:text-slate-400">
        {row.initiative}
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className={cx('font-medium', dead && 'line-through')}>{row.name}</span>
          {row.concentrating && (
            <span
              title="Concentrating"
              className="inline-flex h-5 shrink-0 items-center justify-center rounded bg-violet-200 px-1 text-xs font-bold text-violet-800 dark:bg-violet-900 dark:text-violet-200"
            >
              C
            </span>
          )}
          {dead && (
            <span className="rounded bg-slate-200 px-1 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:bg-slate-700 dark:text-slate-300">
              Dead
            </span>
          )}
          {row.status === 'unconscious' && (
            <span className="rounded bg-amber-200 px-1 text-xs font-semibold uppercase tracking-wide text-amber-800 dark:bg-amber-900 dark:text-amber-200">
              Unconscious
            </span>
          )}
          {row.stable && (
            <span className="rounded bg-emerald-200 px-1 text-xs font-semibold uppercase tracking-wide text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
              Stable
            </span>
          )}
        </span>

        {row.effects.length > 0 && (
          <span className="mt-1 flex flex-wrap gap-1">
            {row.effects.map((e) => (
              <span
                key={e.id}
                className="inline-flex items-center rounded bg-slate-200 px-1.5 py-0.5 text-xs font-medium text-slate-800 dark:bg-slate-700 dark:text-slate-100"
              >
                {e.label}
              </span>
            ))}
          </span>
        )}

        {row.deathSaves && (
          <span className="mt-1 block">
            <DeathSavePips saves={row.deathSaves} />
          </span>
        )}
      </span>

      <span className="shrink-0 text-right text-sm">
        <span className="block">
          <Health hp={row.hp} />
        </span>
        {row.ac !== undefined && (
          <span className="block text-xs text-slate-500 dark:text-slate-400">AC {row.ac}</span>
        )}
      </span>
    </li>
  )
}
