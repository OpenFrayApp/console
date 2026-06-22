// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { useEffect, useState } from 'react'
import type { Combatant } from '../schema/combatant.ts'
import type { EncounterAction } from '../state/encounter.ts'
import { isFoe } from '../combat/combatant.ts'
import { hpTierOf, parseHpInput } from '../combat/resources.ts'
import { hpToneFor } from './hpTone.ts'

/** A campfire — short rest. */
function BonfireIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
      <path d="M12 3c2.5 2.5 3.5 4.7 3.5 6.5a3.5 3.5 0 0 1-7 0c0-1 .4-1.9 1-2.5.2 1 .8 1.5 1.3 1.5.7 0 1.2-.8.7-2C11 5.8 11.3 4.4 12 3Z" />
      <path d="M4 20l16-4" />
      <path d="M4 16l16 4" />
    </svg>
  )
}

/** A tent — long rest. */
function TentIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
      <path d="M2 20h20" />
      <path d="M12 4 4 20" />
      <path d="m12 4 8 16" />
      <path d="M12 9v11" />
      <path d="M9.5 20 12 14.5l2.5 5.5" />
    </svg>
  )
}

const label = (c: Combatant): string => (c.isPC ? c.name : c.label)

/** Modal to enter each friendly combatant's new current HP for a short rest. */
function ShortRestModal({
  combatants,
  dispatch,
  onClose,
}: {
  combatants: Combatant[]
  dispatch: (action: EncounterAction) => void
  onClose: () => void
}) {
  const [values, setValues] = useState<Record<string, string>>({})

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const submit = () => {
    const hp: Record<string, number> = {}
    for (const c of combatants) {
      const raw = (values[c.combatantId] ?? '').trim()
      if (!raw) continue
      const parsed = parseHpInput(raw)
      if (!parsed) continue
      hp[c.combatantId] = 'delta' in parsed ? c.hp.current + parsed.delta : parsed.set
    }
    dispatch({ type: 'shortRest', hp })
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-start justify-center overflow-auto bg-black/40 p-4 sm:p-8"
      onClick={onClose}
    >
      <form
        role="dialog"
        aria-label="Short rest"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
        className="my-auto w-full max-w-md rounded-lg border border-slate-200 bg-white text-left shadow-xl dark:border-slate-700 dark:bg-slate-900"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          <h2 className="text-lg font-semibold">Short rest</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded p-1 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            ✕
          </button>
        </div>

        <div className="max-h-[60vh] space-y-2 overflow-auto p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Enter each character's new HP — a number sets it, <code>+N</code> heals by that
            much. Blank leaves them unchanged.
          </p>
          {combatants.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No player characters or friendly NPCs to rest.
            </p>
          ) : (
            combatants.map((c) => (
              <div key={c.combatantId} className="flex items-center gap-3">
                <span className="min-w-0 flex-1 truncate text-sm">{label(c)}</span>
                <span className="shrink-0 text-xs tabular-nums">
                  <span className={hpToneFor(hpTierOf(c.hp.current, c.hp.max))}>{c.hp.current}</span>
                  <span className="text-slate-400 dark:text-slate-500">/{c.hp.max}</span>
                </span>
                <input
                  value={values[c.combatantId] ?? ''}
                  onChange={(e) =>
                    setValues((prev) => ({ ...prev, [c.combatantId]: e.target.value }))
                  }
                  placeholder="+N or #"
                  aria-label={`New HP for ${label(c)}`}
                  inputMode="numeric"
                  autoComplete="off"
                  data-1p-ignore="true"
                  className="w-20 shrink-0 rounded border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-800"
                />
              </div>
            ))
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-4 py-3 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500"
          >
            Take short rest
          </button>
        </div>
      </form>
    </div>
  )
}

/**
 * Short-rest / long-rest controls — an icon set in the header (campfire = short,
 * tent = long). A long rest restores all player characters and friendly NPCs to
 * full HP after a confirm; a short rest opens a per-character HP modal. Both are
 * disabled while combat is running (rests happen between fights). The short-rest
 * tally since the last long rest is shown to signed-in users.
 */
export function RestControls({
  combatants,
  dispatch,
  disabled,
  shortRests,
  showCounter,
}: {
  combatants: Combatant[]
  dispatch: (action: EncounterAction) => void
  /** True while combat is running — rests are disabled (not hidden). */
  disabled: boolean
  shortRests: number
  /** Show the short-rest tally (signed-in users only). */
  showCounter: boolean
}) {
  const [open, setOpen] = useState(false)
  const friendly = combatants.filter((c) => !isFoe(c))
  const longRest = () => {
    if (
      window.confirm(
        'Take a long rest? All player characters and friendly NPCs return to full HP.',
      )
    ) {
      dispatch({ type: 'longRest' })
    }
  }

  const cell = (extra = ''): string =>
    `flex items-center justify-center px-3 py-1.5 text-slate-700 dark:text-slate-200 ${extra} ${
      disabled ? 'cursor-not-allowed opacity-40' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
    }`

  return (
    <div className="flex items-center gap-2">
      <nav
        className="flex overflow-hidden rounded-md border border-slate-300 dark:border-slate-700"
        aria-label="Rest"
      >
        <button
          type="button"
          onClick={() => setOpen(true)}
          disabled={disabled}
          aria-label="Short rest"
          title="Short rest"
          className={cell()}
        >
          <BonfireIcon />
        </button>
        <button
          type="button"
          onClick={longRest}
          disabled={disabled}
          aria-label="Long rest"
          title="Long rest"
          className={cell('border-l border-slate-300 dark:border-slate-700')}
        >
          <TentIcon />
        </button>
      </nav>
      {showCounter && (
        <span
          title="Short rests taken since the last long rest"
          className="text-xs tabular-nums text-slate-500 dark:text-slate-400"
        >
          {shortRests} SR
        </span>
      )}
      {open && (
        <ShortRestModal combatants={friendly} dispatch={dispatch} onClose={() => setOpen(false)} />
      )}
    </div>
  )
}
