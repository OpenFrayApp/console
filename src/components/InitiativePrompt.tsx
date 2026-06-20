// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { useRef, useState } from 'react'
import type { PlayerCharacter } from '../schema/combatant.ts'
import { useDismiss } from '../hooks/useDismiss.ts'

/**
 * When combat begins, monsters and quick adds roll initiative automatically, but
 * players roll their own. The DM enters each player's rolled total here; leaving
 * a field blank rolls d20 + that player's modifier instead. The app never rolls
 * a player's own dice unless asked (the blank-field case is opt-in).
 */
export function InitiativePrompt({
  pcs,
  onStart,
  onCancel,
}: {
  pcs: PlayerCharacter[]
  /** Raw field values (blank = roll d20 + modifier); the caller resolves them. */
  onStart: (values: Record<string, string>) => void
  onCancel: () => void
}) {
  const ref = useRef<HTMLFormElement>(null)
  useDismiss(ref, true, onCancel)
  const [values, setValues] = useState<Record<string, string>>({})

  const submit = () => onStart(values)

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
          Enter each player's rolled total, or leave blank to roll d20 + their modifier.
          Monsters and quick adds have already rolled.
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
