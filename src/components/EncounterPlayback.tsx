// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import type { EncounterAction } from '../state/encounter.ts'

const ICON_BTN =
  'inline-flex h-8 w-8 items-center justify-center rounded-md border text-sm disabled:cursor-not-allowed disabled:opacity-40'

const PlayIcon = () => (
  <svg viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor" aria-hidden="true">
    <path d="M4 2.5v11l9-5.5z" />
  </svg>
)
const PauseIcon = () => (
  <svg viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor" aria-hidden="true">
    <path d="M4 2.5h3v11H4zM9 2.5h3v11H9z" />
  </svg>
)
const StopIcon = () => (
  <svg viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor" aria-hidden="true">
    <rect x="3.5" y="3.5" width="9" height="9" rx="1" />
  </svg>
)

/**
 * The encounter playback controls. Before combat: a green Play (Begin). Running:
 * Next turn, a grey Pause (resumable hold), and a red Stop (end → back to setup,
 * keeps the combatants). Paused: a green Play (Resume) plus Stop.
 */
export function EncounterPlayback({
  started,
  paused,
  canBegin,
  dispatch,
  onBegin,
  onNextTurn,
}: {
  started: boolean
  paused: boolean
  canBegin: boolean
  dispatch: (action: EncounterAction) => void
  /** Overrides for begin / next turn so the caller can also move the selection. */
  onBegin?: () => void
  onNextTurn?: () => void
}) {
  const begin = onBegin ?? (() => dispatch({ type: 'begin' }))
  const advance = onNextTurn ?? (() => dispatch({ type: 'nextTurn' }))
  const green = 'border-emerald-500 text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950'
  const grey = 'border-slate-300 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
  const red = 'border-rose-500 text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950'

  if (!started) {
    return (
      <button
        type="button"
        aria-label="Begin"
        title="Begin"
        disabled={!canBegin}
        onClick={begin}
        className={`${ICON_BTN} ${green}`}
      >
        <PlayIcon />
      </button>
    )
  }

  return (
    <div className="flex items-center gap-1">
      {paused ? (
        <button
          type="button"
          aria-label="Resume"
          title="Resume"
          onClick={() => dispatch({ type: 'resume' })}
          className={`${ICON_BTN} ${green}`}
        >
          <PlayIcon />
        </button>
      ) : (
        <>
          <button
            type="button"
            onClick={advance}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Next turn
          </button>
          <button
            type="button"
            aria-label="Pause"
            title="Pause"
            onClick={() => dispatch({ type: 'pause' })}
            className={`${ICON_BTN} ${grey}`}
          >
            <PauseIcon />
          </button>
        </>
      )}
      <button
        type="button"
        aria-label="Stop"
        title="Stop"
        onClick={() => dispatch({ type: 'stop' })}
        className={`${ICON_BTN} ${red}`}
      >
        <StopIcon />
      </button>
    </div>
  )
}
