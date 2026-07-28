// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import type { Combatant } from '../schema/combatant.ts'
import { assessEncounter, DIFFICULTY_LABEL, type DifficultyTier } from '../combat/difficulty.ts'

const TONE: Record<DifficultyTier, string> = {
  trivial: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  easy: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200',
  medium: 'bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-200',
  hard: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200',
  deadly: 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-200',
}

function ScalesIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500"
      aria-hidden="true"
    >
      <path d="M12 4v16M7 20h10M4 8h16M12 6 4 8l-2 5a4 4 0 0 0 8 0Zm0 0 8 2 2 5a4 4 0 0 1-8 0Z" />
    </svg>
  )
}

/**
 * Pre-combat difficulty readout for the footer, in the slot the clocks take over
 * once the fight begins. Recomputed as combatants come and go. With only one side
 * on the board there is nothing to rate, and it holds the footer's first column
 * open rather than letting the rest of the row shift into it.
 */
export function CombatDifficulty({ combatants }: { combatants: Combatant[] }) {
  const assessment = assessEncounter(combatants)
  if (!assessment) return <div className="hidden lg:block" aria-hidden="true" />
  const { tier, adjustedXp, partyLevel } = assessment

  return (
    <div
      className="flex items-center gap-2.5 text-sm text-slate-500 dark:text-slate-400"
      title={`Estimated for a party of about level ${partyLevel}`}
    >
      <ScalesIcon />
      <span>Difficulty</span>
      <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${TONE[tier]}`}>
        {DIFFICULTY_LABEL[tier]}
      </span>
      <span className="tabular-nums">{adjustedXp.toLocaleString()} XP</span>
    </div>
  )
}
