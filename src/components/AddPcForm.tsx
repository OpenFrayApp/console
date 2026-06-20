// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { useCallback, useRef, useState, type FormEvent } from 'react'
import type { PlayerCharacter } from '../schema/combatant.ts'
import { useDismiss } from '../hooks/useDismiss.ts'

const num = (v: string): number => Math.max(0, Math.floor(Number(v) || 0))

const FIELD =
  'w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-800'

/** A form to add a lightweight player character. The DM enters initiative — the
 *  app never rolls for the player. */
export function AddPcForm({ onAdd }: { onAdd: (pc: PlayerCharacter) => void }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [ac, setAc] = useState('')
  const [hp, setHp] = useState('')
  const [initiative, setInitiative] = useState('')
  const [pp, setPp] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const close = useCallback(() => setOpen(false), [])
  useDismiss(ref, open, close)

  const reset = () => {
    setName('')
    setAc('')
    setHp('')
    setInitiative('')
    setPp('')
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    const maxHp = num(hp)
    onAdd({
      isPC: true,
      combatantId: crypto.randomUUID(),
      name: name.trim(),
      initiative: num(initiative),
      ac: num(ac),
      passivePerception: num(pp) || 10,
      status: 'active',
      hp: { current: maxHp, max: maxHp, temp: 0 },
      concentration: null,
      effects: [],
    })
    reset()
    setOpen(false)
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        + Add PC
      </button>
      {open && (
        <form
          onSubmit={submit}
          className="absolute right-0 z-30 mt-1 w-64 space-y-2 rounded-md border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-700 dark:bg-slate-900"
        >
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
            aria-label="PC name"
            className={FIELD}
          />
          <div className="grid grid-cols-2 gap-2">
            <input value={ac} onChange={(e) => setAc(e.target.value)} placeholder="AC" aria-label="AC" inputMode="numeric" className={FIELD} />
            <input value={hp} onChange={(e) => setHp(e.target.value)} placeholder="HP" aria-label="Max HP" inputMode="numeric" className={FIELD} />
            <input value={initiative} onChange={(e) => setInitiative(e.target.value)} placeholder="Init" aria-label="Initiative" inputMode="numeric" className={FIELD} />
            <input value={pp} onChange={(e) => setPp(e.target.value)} placeholder="Pass. Perc." aria-label="Passive Perception" inputMode="numeric" className={FIELD} />
          </div>
          <button
            type="submit"
            className="w-full rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500"
          >
            Add
          </button>
        </form>
      )}
    </div>
  )
}
