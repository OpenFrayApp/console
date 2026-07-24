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
const PrevTurnIcon = () => (
  <svg viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor" aria-hidden="true">
    <path d="M11.5 3v10L5 8zM4.5 3h1.5v10H4.5z" />
  </svg>
)
const NextTurnIcon = () => (
  <svg viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor" aria-hidden="true">
    <path d="M4.5 3v10L11 8zM10 3h1.5v10H10z" />
  </svg>
)

/**
 * Step back and forward through the initiative order. Sits with the round heading —
 * these move the turn, while the playback controls start and stop the fight.
 */
export function TurnControls({
  dispatch,
  onNextTurn,
}: {
  dispatch: (action: EncounterAction) => void
  onNextTurn?: () => void
}) {
  const grey =
    'border-slate-300 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
  return (
    <span className="inline-flex items-center gap-1">
      <button
        type="button"
        aria-label="Previous turn"
        title="Previous turn — steps the marker back; it doesn’t undo the turn’s effects"
        onClick={() => dispatch({ type: 'prevTurn' })}
        className={`${ICON_BTN} ${grey}`}
      >
        <PrevTurnIcon />
      </button>
      <button
        type="button"
        aria-label="Next turn"
        title="Next turn"
        onClick={onNextTurn ?? (() => dispatch({ type: 'nextTurn' }))}
        className={`${ICON_BTN} ${grey}`}
      >
        <NextTurnIcon />
      </button>
    </span>
  )
}
const BroomIcon = () => (
  <svg
    viewBox="0 0 24 24"
    className="h-4 w-4"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {/* handle */}
    <path d="M20 4 12 12" />
    {/* bristle head (bound at the top, flaring to the sweeping edge) */}
    <path d="M9.5 9.5 14.5 14.5 8 21 2.5 15.5Z" />
    {/* bristle lines */}
    <path d="M11 11 5 17" />
    <path d="M12.5 12.5 6.5 18.5" />
  </svg>
)
const SkullIcon = () => (
  <svg
    viewBox="0 0 24 24"
    className="h-4 w-4"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {/* cranium + jaw */}
    <path d="M12 2.5c-4.4 0-7.5 3-7.5 7 0 2.4 1.1 4.2 2.8 5.3v2.4c0 .7.6 1.3 1.3 1.3h6.8c.7 0 1.3-.6 1.3-1.3v-2.4c1.7-1.1 2.8-2.9 2.8-5.3 0-4-3.1-7-7.5-7Z" />
    {/* eye sockets */}
    <circle cx="9" cy="10" r="1.6" fill="currentColor" stroke="none" />
    <circle cx="15" cy="10" r="1.6" fill="currentColor" stroke="none" />
    {/* nose + teeth */}
    <path d="M12 12.5v1.5" />
    <path d="M9.5 18.5v-2M12 18.5v-2M14.5 18.5v-2" />
  </svg>
)

/**
 * Out-of-combat board cleanup: a skull (remove every combatant, ending the encounter)
 * and a broom (remove only foes, keep the party). Both are hidden during combat — the
 * round counter takes their place — so they never fire mid-fight.
 */
export function EncounterCleanup({
  hasCombatants,
  hasFoes,
  dispatch,
}: {
  hasCombatants: boolean
  hasFoes: boolean
  dispatch: (action: EncounterAction) => void
}) {
  const grey =
    'border-slate-300 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
  const clearAll = () => {
    if (window.confirm('Remove all combatants from the encounter?')) dispatch({ type: 'clearAll' })
  }
  const clearFoes = () => {
    if (window.confirm('Remove all foes from the encounter?')) dispatch({ type: 'clearFoes' })
  }
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        aria-label="Remove all combatants"
        title="Remove all combatants"
        disabled={!hasCombatants}
        onClick={clearAll}
        className={`${ICON_BTN} ${grey}`}
      >
        <SkullIcon />
      </button>
      <button
        type="button"
        aria-label="Remove all foes"
        title="Remove all foes"
        disabled={!hasFoes}
        onClick={clearFoes}
        className={`${ICON_BTN} ${grey}`}
      >
        <BroomIcon />
      </button>
    </div>
  )
}

/**
 * Start and stop the fight. Before combat: a green Play (Begin). Running: a grey
 * Pause (resumable hold) and a red Stop (end → back to setup, keeps the combatants).
 * Paused: a green Play (Resume) plus Stop. Stepping through turns is `TurnControls`,
 * which sits with the round heading.
 */
export function EncounterPlayback({
  started,
  paused,
  canBegin,
  dispatch,
  onBegin,
  onStop,
}: {
  started: boolean
  paused: boolean
  canBegin: boolean
  dispatch: (action: EncounterAction) => void
  /** Override for begin so the caller can also move the selection. */
  onBegin?: () => void
  /** Override for stop so the caller can show the end-of-combat recap. */
  onStop?: () => void
}) {
  const begin = onBegin ?? (() => dispatch({ type: 'begin' }))
  const stop = onStop ?? (() => dispatch({ type: 'stop' }))
  const green =
    'border-emerald-500 text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950'
  const grey =
    'border-slate-300 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
  const red =
    'border-rose-500 text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950'

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
        <button
          type="button"
          aria-label="Pause"
          title="Pause"
          onClick={() => dispatch({ type: 'pause' })}
          className={`${ICON_BTN} ${grey}`}
        >
          <PauseIcon />
        </button>
      )}
      <button
        type="button"
        aria-label="Stop"
        title="Stop"
        onClick={stop}
        className={`${ICON_BTN} ${red}`}
      >
        <StopIcon />
      </button>
    </div>
  )
}
