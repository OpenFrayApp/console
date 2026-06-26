// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import type { ReactNode } from 'react'
import type { Outcome, Recap } from '../combat/recap.ts'

const OUTCOME: Record<Outcome, { label: string; badge: string }> = {
  victory: {
    label: 'Victory',
    badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200',
  },
  defeat: {
    label: 'Defeat',
    badge: 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-200',
  },
  inconclusive: {
    label: 'Combat ended',
    badge: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  },
}

/** "2m 30s" / "45s". Whole seconds. */
function duration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds))
  const m = Math.floor(s / 60)
  const rem = s % 60
  return m > 0 ? `${m}m ${rem}s` : `${rem}s`
}

function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
        {label}
      </div>
      <div className="mt-0.5 text-lg font-semibold tabular-nums">{value}</div>
      {hint && <div className="text-xs text-slate-500 dark:text-slate-400">{hint}</div>}
    </div>
  )
}

/** The end-of-combat recap. Outcome banner + XP, timing, and fight tallies. */
export function RecapScreen({ recap, onClose }: { recap: Recap; onClose: () => void }) {
  const o = OUTCOME[recap.outcome]
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Combat recap"
        className="max-h-full w-full max-w-lg overflow-auto rounded-xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className={`rounded-md px-2.5 py-1 text-sm font-semibold ${o.badge}`}>{o.label}</span>
            <h2 className="text-base font-semibold text-slate-700 dark:text-slate-200">Combat recap</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500"
          >
            Done
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Stat
            label="XP earned"
            value={recap.totalXp.toLocaleString()}
            hint={recap.xpPerPlayer != null ? `${recap.xpPerPlayer.toLocaleString()} / player` : undefined}
          />
          <Stat label="Rounds" value={recap.rounds} />
          <Stat label="Time (in-game)" value={duration(recap.inGameSeconds)} />
          <Stat label="Time (real)" value={duration(recap.activeMs / 1000)} hint="excludes pauses" />
          <Stat label="Damage dealt" value={recap.damageDealtTotal.toLocaleString()} />
          <Stat label="Damage taken" value={recap.damageTakenTotal.toLocaleString()} />
          {recap.spellsCast > 0 && <Stat label="Spells cast" value={recap.spellsCast} />}
          {recap.effectsApplied > 0 && <Stat label="Effects applied" value={recap.effectsApplied} />}
          {recap.knockouts > 0 && <Stat label="Knockouts" value={recap.knockouts} hint="downed or slain" />}
        </div>

        {recap.awards.length > 0 && (
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
            {recap.awards.map((a) => (
              <div
                key={a.title}
                className="rounded-lg border border-amber-300 bg-amber-50 p-3 dark:border-amber-700/60 dark:bg-amber-900/20"
              >
                <div className="text-[11px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
                  {a.title}
                </div>
                <div className="mt-0.5 font-semibold">{a.label}</div>
                <div className="text-sm text-slate-500 dark:text-slate-400 tabular-nums">
                  {a.amount.toLocaleString()} dmg
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/** Alert shown when every enemy is defeated: end the fight, or keep it running. */
export function EndCombatPrompt({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="End combat?"
        className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-800 dark:bg-slate-900"
      >
        <h2 className="text-base font-semibold">All enemies defeated</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">End combat and see the recap?</p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Keep fighting
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500"
          >
            End combat
          </button>
        </div>
      </div>
    </div>
  )
}
