// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { useRef, useState } from 'react'
import type { PlayerCharacter } from '../schema/combatant.ts'
import { useDismiss } from '../hooks/useDismiss.ts'

const toNum = (v: string): number => Math.max(0, Math.floor(Number(v) || 0))

/**
 * When combat begins, monsters roll initiative automatically but players roll
 * their own — so the DM enters each PC's number here (the app never rolls for a
 * player). Monsters' initiatives have already been rolled by this point.
 */
export function InitiativePrompt({
  pcs,
  onStart,
  onCancel,
}: {
  pcs: PlayerCharacter[]
  onStart: (initiatives: Record<string, number>) => void
  onCancel: () => void
}) {
  const ref = useRef<HTMLFormElement>(null)
  useDismiss(ref, true, onCancel)
  const [values, setValues] = useState<Record<string, string>>({})

  const submit = () => {
    const out: Record<string, number> = {}
    for (const pc of pcs) out[pc.combatantId] = toNum(values[pc.combatantId] ?? '')
    onStart(out)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form
        ref={ref}
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
        className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="mb-1 flex items-start justify-between gap-3">
          <h3 className="text-base font-semibold">Players’ initiative</h3>
          <button
            type="button"
            onClick={onCancel}
            className="text-sm text-slate-500 hover:underline dark:text-slate-400"
          >
            Cancel
          </button>
        </div>
        <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">
          Enter what each player rolled. Monsters have already rolled.
        </p>
        <ul className="space-y-2">
          {pcs.map((pc, i) => (
            <li key={pc.combatantId} className="flex items-center justify-between gap-3">
              <label htmlFor={`init-${pc.combatantId}`} className="min-w-0 truncate text-sm font-medium">
                {pc.name}
              </label>
              <input
                id={`init-${pc.combatantId}`}
                autoFocus={i === 0}
                value={values[pc.combatantId] ?? ''}
                onChange={(e) =>
                  setValues((prev) => ({ ...prev, [pc.combatantId]: e.target.value }))
                }
                inputMode="numeric"
                aria-label={`Initiative for ${pc.name}`}
                className="w-20 rounded border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
              />
            </li>
          ))}
        </ul>
        <button
          type="submit"
          className="mt-4 w-full rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500"
        >
          Start combat
        </button>
      </form>
    </div>
  )
}
