// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { useRef, useState } from 'react'
import { roll } from '../../dice/roll.ts'
import type { AdvantageState } from 'opendice'
import { Chip } from '../ui/primitives.tsx'
import { useOpenRequest } from '../../hooks/useOpenRequest.ts'
import type { OnRoll } from '../log/GameLog.tsx'
import { track, EVENTS } from '../../lib/analytics.ts'

const DICE = ['d100', 'd20', 'd12', 'd10', 'd8', 'd6', 'd4']

/** The three ways a d20 can be rolled, in the order the resolver offers them. */
const MODES: { value: AdvantageState; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'advantage', label: 'Advantage' },
  { value: 'disadvantage', label: 'Disadvantage' },
]

/** The manual / quick-roll bar — type a formula or tap a die. */
export function QuickRoll({
  onRoll,
  focusRequest,
  keyHint,
}: {
  onRoll: OnRoll
  /** Bump to put the caret in the formula box — the keyboard's command. */
  focusRequest?: number
  /** The keyboard chord that focuses the box, shown in its tooltip. */
  keyHint?: string
}) {
  const [formula, setFormula] = useState('')
  const [mode, setMode] = useState<AdvantageState>('normal')
  const inputRef = useRef<HTMLInputElement>(null)
  useOpenRequest(focusRequest, () => {
    setTimeout(() => inputRef.current?.focus(), 0)
  })

  /** Roll the formula and log it; malformed input does nothing. Either way the box clears. */
  const submit = (input: string) => {
    const trimmed = input.trim()
    if (!trimmed) return
    try {
      // opendice forces the pair on the first plain d20 and leaves every other die
      // alone, so a mode left on advantage does nothing to 2d6+3.
      const result = roll(trimmed, { advantage: mode })
      track(EVENTS.manualRoll)
      onRoll(trimmed, result)
    } catch {
      // Ignore malformed formulas; the input simply does nothing.
    }
    setFormula('')
  }

  return (
    // One row that wraps only when it must. On a compact screen the six dice do not fit
    // beside the formula once they are finger-sized, so they take the next line — and
    // fill it, sharing it evenly, rather than trailing off half way across.
    <div className="flex flex-wrap items-center gap-4 narrow:gap-2">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          submit(formula)
        }}
        className="flex gap-1"
      >
        <input
          ref={inputRef}
          value={formula}
          onChange={(e) => setFormula(e.target.value)}
          placeholder="2d6+3"
          title={keyHint ? `Dice formula (${keyHint})` : undefined}
          aria-label="Dice formula"
          className="tap-y w-24 rounded border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
        />
        <button
          type="submit"
          className="tap rounded border border-slate-300 px-2 py-1 text-sm font-medium hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
        >
          Roll
        </button>
      </form>
      <div role="radiogroup" aria-label="How to roll a d20" className="flex gap-1 narrow:gap-1.5">
        {MODES.map((m) => (
          <Chip
            key={m.value}
            size="sm"
            role="radio"
            aria-checked={mode === m.value}
            active={mode === m.value}
            onClick={() => setMode(m.value)}
          >
            {m.label}
          </Chip>
        ))}
      </div>
      <div className="flex gap-1 narrow:flex-1 narrow:gap-1.5">
        {DICE.map((die) => (
          <button
            key={die}
            type="button"
            onClick={() => submit(`1${die}`)}
            className="tap rounded border border-slate-300 px-2 py-1 text-sm hover:bg-slate-100 narrow:flex-1 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            {die}
          </button>
        ))}
      </div>
    </div>
  )
}
