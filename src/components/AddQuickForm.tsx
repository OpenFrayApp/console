// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { useCallback, useRef, useState, type FormEvent } from 'react'
import type { PlayerCharacter } from '../schema/combatant.ts'
import { useDismiss } from '../hooks/useDismiss.ts'

const num = (v: string): number => Math.max(0, Math.floor(Number(v) || 0))

const FIELD_BASE =
  'rounded border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-800'
const FIELD = `w-full ${FIELD_BASE}`

/**
 * Quick add — a generic combatant (an NPC, or a creature dropped in mid-fight)
 * that just needs a name, HP, and AC. Shown as "Quick add", not a full PC.
 */
export function AddQuickForm({ onAdd }: { onAdd: (c: PlayerCharacter) => void }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [ac, setAc] = useState('')
  const [hp, setHp] = useState('')
  // Quick adds are most often an enemy dropped in mid-fight, so default to foe.
  const [side, setSide] = useState<'friend' | 'foe'>('foe')
  const ref = useRef<HTMLDivElement>(null)
  const close = useCallback(() => setOpen(false), [])
  useDismiss(ref, open, close)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    const maxHp = Math.max(1, num(hp))
    onAdd({
      isPC: true,
      kind: 'quick',
      side,
      combatantId: crypto.randomUUID(),
      name: name.trim(),
      initiative: 0, // rolled when combat begins
      ac: num(ac),
      status: 'active',
      hp: { current: maxHp, max: maxHp, temp: 0 },
      concentration: null,
      effects: [],
    })
    setName('')
    setAc('')
    setHp('')
    setSide('foe')
    setOpen(false)
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        Quick add
      </button>
      {open && (
        <form
          onSubmit={submit}
          className="absolute right-0 z-30 mt-1 w-72 space-y-2 rounded-md border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-700 dark:bg-slate-900"
        >
          <div className="flex gap-2">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name"
              aria-label="Quick add name"
              autoComplete="off"
              data-1p-ignore="true"
              data-lpignore="true"
              className={`${FIELD_BASE} min-w-0 flex-1`}
            />
            <select
              value={side}
              onChange={(e) => setSide(e.target.value as 'friend' | 'foe')}
              aria-label="Side"
              className={`${FIELD_BASE} w-24 shrink-0`}
            >
              <option value="foe">Foe</option>
              <option value="friend">Friend</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input value={ac} onChange={(e) => setAc(e.target.value)} placeholder="AC" aria-label="AC" inputMode="numeric" className={FIELD} />
            <input value={hp} onChange={(e) => setHp(e.target.value)} placeholder="HP" aria-label="Max HP" inputMode="numeric" className={FIELD} />
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
