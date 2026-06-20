// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

const BTN = 'rounded border px-2 py-1 text-xs font-medium'

/**
 * Concentration check after a concentrator takes damage. Mirrors the death-save
 * pattern: the app never rolls for the player, so Maintained/Broken record the
 * player's own result; "Roll" is the optional in-app save, offered only for
 * monsters (`canRoll`). The DC comes from the damage taken.
 */
export function ConcentrationPrompt({
  dc,
  canRoll,
  onMaintain,
  onBreak,
  onRoll,
}: {
  dc: number
  canRoll: boolean
  onMaintain: () => void
  onBreak: () => void
  onRoll?: () => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-1 text-xs">
      <span className="font-medium text-amber-700 dark:text-amber-300">
        Concentration — DC {dc}
      </span>
      <button
        type="button"
        onClick={onMaintain}
        className={`${BTN} border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950`}
      >
        Maintained
      </button>
      <button
        type="button"
        onClick={onBreak}
        className={`${BTN} border-rose-300 text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-950`}
      >
        Broken
      </button>
      {canRoll && onRoll && (
        <button
          type="button"
          onClick={onRoll}
          className={`${BTN} border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800`}
        >
          Roll CON save
        </button>
      )}
    </div>
  )
}
