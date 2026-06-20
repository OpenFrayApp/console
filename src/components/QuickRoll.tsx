// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { useState } from 'react'
import { roll } from '../dice/roll.ts'
import type { OnRoll } from './RollLog.tsx'

const DICE = ['d20', 'd12', 'd10', 'd8', 'd6', 'd4']

/** The manual / quick-roll bar — type a formula or tap a die. */
export function QuickRoll({ onRoll }: { onRoll: OnRoll }) {
  const [formula, setFormula] = useState('')

  const submit = (input: string) => {
    const trimmed = input.trim()
    if (!trimmed) return
    try {
      onRoll(trimmed, roll(trimmed))
    } catch {
      // Ignore malformed formulas; the input simply does nothing.
    }
    setFormula('')
  }

  return (
    <div className="flex flex-wrap items-center gap-1">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          submit(formula)
        }}
        className="flex gap-1"
      >
        <input
          value={formula}
          onChange={(e) => setFormula(e.target.value)}
          placeholder="2d6+3"
          aria-label="Dice formula"
          className="w-24 rounded border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
        />
        <button
          type="submit"
          className="rounded border border-slate-300 px-2 py-1 text-sm font-medium hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
        >
          Roll
        </button>
      </form>
      {DICE.map((die) => (
        <button
          key={die}
          type="button"
          onClick={() => submit(`1${die}`)}
          className="rounded border border-slate-300 px-2 py-1 text-xs hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
        >
          {die}
        </button>
      ))}
    </div>
  )
}
