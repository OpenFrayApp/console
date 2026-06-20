// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { useState } from 'react'
import type { ConditionName, Effect } from '../schema/effect.ts'
import {
  advantageAgainst,
  condition,
  disadvantageOn,
  flatBonus,
  reminder,
} from '../combat/effects.ts'

// Ordered roughly by table frequency.
const CONDITIONS: ConditionName[] = [
  'Prone',
  'Grappled',
  'Frightened',
  'Restrained',
  'Poisoned',
  'Stunned',
  'Blinded',
  'Charmed',
  'Incapacitated',
  'Invisible',
  'Paralyzed',
  'Petrified',
  'Deafened',
  'Unconscious',
  'Exhaustion',
]

const CHIP =
  'rounded border border-slate-300 px-1.5 py-0.5 text-xs hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800'

/** Quick-apply picker: tap a condition or one of the ~6 effect shapes. */
export function EffectPicker({ onApply }: { onApply: (effect: Effect) => void }) {
  const [open, setOpen] = useState(false)
  const [custom, setCustom] = useState('')

  const apply = (effect: Effect) => {
    onApply(effect)
    setOpen(false)
  }

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="rounded border border-slate-300 px-2 py-1 text-xs font-medium hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
      >
        + Effect
      </button>
      {open && (
        <div className="absolute z-10 mt-1 w-64 rounded-md border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-700 dark:bg-slate-900">
          <div className="flex flex-wrap gap-1">
            {CONDITIONS.map((c) => (
              <button key={c} type="button" className={CHIP} onClick={() => apply(condition(c))}>
                {c}
              </button>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-1 border-t border-slate-200 pt-2 dark:border-slate-800">
            <button type="button" className={CHIP} onClick={() => apply(advantageAgainst('Advantage'))}>
              Adv against
            </button>
            <button type="button" className={CHIP} onClick={() => apply(disadvantageOn('Disadvantage'))}>
              Disadv on
            </button>
            <button type="button" className={CHIP} onClick={() => apply(flatBonus('Bless', '1d4'))}>
              Bless +1d4
            </button>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              const text = custom.trim()
              if (text) {
                apply(reminder(text, text))
                setCustom('')
              }
            }}
            className="mt-2 flex gap-1 border-t border-slate-200 pt-2 dark:border-slate-800"
          >
            <input
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              placeholder="Custom reminder…"
              aria-label="Custom reminder"
              className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800"
            />
            <button type="submit" className={CHIP}>
              Add
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
