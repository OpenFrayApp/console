// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { useCallback, useRef, useState } from 'react'
import type { ConditionName, Effect } from '../schema/effect.ts'
import {
  advantageAgainst,
  condition,
  disadvantageOn,
  flatBonus,
  reminder,
} from '../combat/effects.ts'
import { useDismiss } from '../hooks/useDismiss.ts'

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
  const [up, setUp] = useState(false)
  const [custom, setCustom] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const close = useCallback(() => setOpen(false), [])
  useDismiss(ref, open, close)

  // Open upward when there isn't room below (the picker often sits low, in the
  // stat-block footer) — so the menu lands where there's space, not off-screen.
  const toggle = () => {
    if (!open && ref.current) {
      const rect = ref.current.getBoundingClientRect()
      const below = window.innerHeight - rect.bottom
      setUp(below < 260 && rect.top > below)
    }
    setOpen((o) => !o)
  }

  const apply = (effect: Effect) => {
    onApply(effect)
    setOpen(false)
  }

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        type="button"
        onClick={toggle}
        className="rounded border border-slate-300 px-2 py-1 text-xs font-medium hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
      >
        Apply condition
      </button>
      {open && (
        <div
          className={`absolute z-30 w-64 rounded-md border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-700 dark:bg-slate-900 ${
            up ? 'bottom-full mb-1' : 'top-full mt-1'
          }`}
        >
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
