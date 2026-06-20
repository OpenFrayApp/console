// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import type { DeathSaves } from '../schema/combatant.ts'

function Dots({ filled, tone }: { filled: number; tone: string }) {
  return (
    <span className="inline-flex gap-0.5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={`inline-block h-2 w-2 rounded-full ${
            i < filled ? tone : 'bg-slate-300 dark:bg-slate-600'
          }`}
        />
      ))}
    </span>
  )
}

/** Read-only death-save tally (successes / failures), for the combatant row. */
export function DeathSavePips({ saves }: { saves: DeathSaves }) {
  return (
    <span className="inline-flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
      <span className="inline-flex items-center gap-1">
        <span>Saves</span>
        <Dots filled={saves.successes} tone="bg-emerald-500" />
        <span className="sr-only">{saves.successes} of 3 successes</span>
      </span>
      <span className="inline-flex items-center gap-1">
        <span>Fails</span>
        <Dots filled={saves.failures} tone="bg-rose-500" />
        <span className="sr-only">{saves.failures} of 3 failures</span>
      </span>
    </span>
  )
}

interface DeathSaveControlsProps {
  /** The player rolled a success themselves. */
  onSave: () => void
  /** The player rolled a failure themselves. */
  onFail: () => void
  /** Optional in-app roll — only when the player can't roll their own die. */
  onRoll: () => void
}

const BTN = 'rounded border px-2 py-1 text-xs font-medium'

/**
 * Death-save controls. The app never rolls for the player: Save and Fail record
 * the player's own result; "Roll death save" is the fallback when they can't roll.
 * The running tally lives on the combatant row (DeathSavePips), not here.
 */
export function DeathSaveControls({
  onSave,
  onFail,
  onRoll,
}: DeathSaveControlsProps) {
  return (
    <div className="flex gap-1">
        <button
          type="button"
          onClick={onSave}
          className={`${BTN} border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950`}
        >
          Save
        </button>
        <button
          type="button"
          onClick={onFail}
          className={`${BTN} border-rose-300 text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-950`}
        >
          Fail
        </button>
        <button
          type="button"
          onClick={onRoll}
          className={`${BTN} border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800`}
        >
          Roll death save
        </button>
    </div>
  )
}
