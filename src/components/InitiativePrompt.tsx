// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { useRef, useState } from 'react'
import type { Combatant } from '../schema/combatant.ts'
import { isFoe } from '../combat/combatant.ts'
import { useDismiss } from '../hooks/useDismiss.ts'

const nameOf = (c: Combatant): string => (c.isPC ? c.name : c.label)
const isPlayer = (c: Combatant): boolean => c.isPC && c.kind !== 'quick'

function WarningIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  )
}

/** One combatant's row: name, an editable initiative, and a Surprise toggle. */
function Row({
  combatant,
  value,
  surprised,
  onValue,
  onToggle,
  autoFocus,
}: {
  combatant: Combatant
  value: string
  surprised: boolean
  onValue: (v: string) => void
  onToggle: () => void
  autoFocus: boolean
}) {
  const name = nameOf(combatant)
  return (
    <li className="flex items-center gap-2 rounded-md bg-slate-50 px-3 py-1.5 dark:bg-slate-800/50">
      <span className="min-w-0 flex-1 truncate text-sm font-medium">{name}</span>
      <input
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => onValue(e.target.value)}
        inputMode="numeric"
        placeholder={isPlayer(combatant) ? 'roll' : ''}
        aria-label={`Initiative for ${name}`}
        className="w-16 rounded border border-slate-300 bg-white px-2 py-1 text-right text-sm dark:border-slate-700 dark:bg-slate-900"
      />
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={surprised}
        aria-label={`Mark ${name} surprised`}
        title="Surprised"
        className={`rounded border p-1.5 ${
          surprised
            ? 'border-amber-400 bg-amber-100 text-amber-700 dark:border-amber-500/60 dark:bg-amber-500/20 dark:text-amber-300'
            : 'border-slate-300 text-slate-400 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-500 dark:hover:bg-slate-800'
        }`}
      >
        <WarningIcon />
      </button>
    </li>
  )
}

/**
 * The "Roll Initiative" step. Monsters and quick adds arrive pre-rolled (editable);
 * players start blank — the DM enters each roll, or leaves it blank to roll d20 +
 * modifier (the app never rolls a player's dice unless asked). Combatants can be
 * toggled Surprised, applying the campaign's surprise rule on start.
 */
export function InitiativePrompt({
  combatants,
  initial,
  onStart,
  onCancel,
}: {
  combatants: Combatant[]
  /** Pre-filled initiative per combatant (blank for players). */
  initial: Record<string, string>
  onStart: (result: { values: Record<string, string>; surprised: string[] }) => void
  onCancel: () => void
}) {
  const ref = useRef<HTMLFormElement>(null)
  useDismiss(ref, true, onCancel)
  const [values, setValues] = useState<Record<string, string>>(initial)
  const [surprised, setSurprised] = useState<Set<string>>(() => new Set())

  const setValue = (id: string, v: string) => setValues((prev) => ({ ...prev, [id]: v }))
  const toggle = (id: string) =>
    setSurprised((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const submit = () => onStart({ values, surprised: [...surprised] })

  const allies = combatants.filter((c) => !isFoe(c))
  const foes = combatants.filter((c) => isFoe(c))

  const column = (list: Combatant[], heading: string, startIndex: number) =>
    list.length > 0 && (
      <div className="min-w-0 flex-1 space-y-2">
        <h4 className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
          {heading}
        </h4>
        <ul className="space-y-1.5">
          {list.map((c, i) => (
            <Row
              key={c.combatantId}
              combatant={c}
              value={values[c.combatantId] ?? ''}
              surprised={surprised.has(c.combatantId)}
              onValue={(v) => setValue(c.combatantId, v)}
              onToggle={() => toggle(c.combatantId)}
              autoFocus={startIndex === 0 && i === 0}
            />
          ))}
        </ul>
      </div>
    )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form
        ref={ref}
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
        className="w-full max-w-2xl rounded-lg border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="mb-1 flex items-start justify-between gap-3">
          <h3 className="text-base font-semibold">Roll Initiative</h3>
          <button
            type="button"
            onClick={onCancel}
            className="text-sm text-slate-500 hover:underline dark:text-slate-400"
          >
            Cancel
          </button>
        </div>
        <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">
          Players are blank — enter each roll, or leave blank to roll d20 + modifier.
          Toggle <span className="text-amber-600 dark:text-amber-400">⚠</span> to mark
          a combatant surprised; leave them off for an ordinary fight.
        </p>
        <div className="flex flex-col gap-4 sm:flex-row">
          {column(allies, 'Players & NPCs', 0)}
          {column(foes, 'Creatures', allies.length)}
        </div>
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
