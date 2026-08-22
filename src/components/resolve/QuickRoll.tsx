// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { useRef, useState } from 'react'
import { roll } from '../../dice/roll.ts'
import type { AdvantageState } from 'opendice'
import { cx } from '../../lib/cx.ts'
import { useOpenRequest } from '../../hooks/useOpenRequest.ts'
import type { OnRoll } from '../log/GameLog.tsx'
import { track, EVENTS } from '../../lib/analytics.ts'

const DICE = ['d100', 'd20', 'd12', 'd10', 'd8', 'd6', 'd4']

/**
 * The three ways a d20 can be rolled, in the order the resolver offers them. Short on
 * screen because they sit in a row of dice; the whole word is the accessible name and
 * the tooltip, so nothing is lost to the abbreviation.
 */
const MODES: { value: AdvantageState; short: string; label: string }[] = [
  { value: 'normal', short: 'Regular', label: 'Regular' },
  { value: 'advantage', short: 'Adv', label: 'Advantage' },
  { value: 'disadvantage', short: 'Dis', label: 'Disadvantage' },
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

  /**
   * Roll the formula and log it; malformed input does nothing. Either way the box
   * clears. `advantage` comes from the dice buttons: a typed formula is rolled exactly
   * as it was typed, since somebody writing `2d20kh1` has already said what they want.
   */
  const submit = (input: string, advantage: AdvantageState = 'normal') => {
    const trimmed = input.trim()
    if (!trimmed) return
    try {
      const result = roll(trimmed, { advantage })
      track(EVENTS.manualRoll)
      onRoll(trimmed, result)
    } catch {
      // Ignore malformed formulas; the input simply does nothing.
    }
    setFormula('')
  }

  /**
   * Roll one die at the chosen mode. 5e defines advantage on the d20 alone, so that is
   * the engine's own advantage and logs as such; on any other die the same idea has to
   * be said outright — two of them, keep the higher or the lower.
   */
  const rollDie = (die: string) => {
    if (mode === 'normal') return submit(`1${die}`)
    if (die === 'd20') return submit(`1${die}`, mode)
    submit(`2${die}${mode === 'advantage' ? 'kh1' : 'kl1'}`)
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
      {/* The mode and the dice are one cluster: the mode is how the next die is
        rolled, and the formula beside them is taken exactly as it was typed. */}
      <div className="flex items-center gap-1 narrow:flex-1 narrow:gap-1.5">
        {/* One segmented control rather than three chips, drawn the way the rests are:
          these are three answers to one question, not three things to press. */}
        <div
          role="radiogroup"
          aria-label="How to roll a d20"
          className="flex shrink-0 overflow-hidden rounded-md border border-slate-300 dark:border-slate-700"
        >
          {MODES.map((m, i) => (
            <button
              key={m.value}
              type="button"
              role="radio"
              aria-checked={mode === m.value}
              aria-label={m.label}
              title={m.label}
              onClick={() => setMode(m.value)}
              className={cx(
                'tap-y px-2 py-1 text-sm',
                i > 0 && 'border-l border-slate-300 dark:border-slate-700',
                mode === m.value
                  ? 'font-medium text-indigo-700 dark:text-indigo-300'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
              )}
            >
              {m.short}
            </button>
          ))}
        </div>
        {DICE.map((die) => (
          <button
            key={die}
            type="button"
            onClick={() => rollDie(die)}
            className="tap rounded border border-slate-300 px-2 py-1 text-sm hover:bg-slate-100 narrow:flex-1 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            {die}
          </button>
        ))}
      </div>
    </div>
  )
}
