// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { useCallback, useRef, useState, type FormEvent } from 'react'
import type { PlayerCharacter } from '../schema/combatant.ts'
import { parseSpeedInput } from '../combat/speed.ts'
import { useDismiss } from '../hooks/useDismiss.ts'

const num = (v: string): number => Math.max(0, Math.floor(Number(v) || 0))
const signed = (v: string): number => Math.floor(Number(v) || 0)
const list = (v: string): string[] =>
  v
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

const FIELD =
  'w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-800'
const LABEL = 'text-[11px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500'

// None of these are credential fields — keep password managers (1Password's
// `data-1p-ignore`) and browser autofill off them so their popups don't cover the
// inputs. Spread onto the form and every field.
const NO_AUTOFILL = { autoComplete: 'off', 'data-1p-ignore': true } as const

/**
 * Add a player character — the combat-relevant fields the DM wants on the board.
 * The initiative field is a *modifier*: at combat start it's rolled (d20 + this)
 * unless the DM types a flat value into the initiative prompt. Players roll their
 * own dice, so nothing here is auto-rolled.
 */
export function AddPcForm({ onAdd }: { onAdd: (pc: PlayerCharacter) => void }) {
  const [open, setOpen] = useState(false)
  const [f, setF] = useState({
    name: '',
    ac: '',
    hp: '',
    init: '',
    pp: '',
    languages: '',
    speed: '',
    resistances: '',
    immunities: '',
    vulnerabilities: '',
  })
  const ref = useRef<HTMLDivElement>(null)
  const close = useCallback(() => setOpen(false), [])
  useDismiss(ref, open, close)

  const set = (key: keyof typeof f) => (e: { target: { value: string } }) =>
    setF((prev) => ({ ...prev, [key]: e.target.value }))

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!f.name.trim()) return
    const maxHp = Math.max(1, num(f.hp))
    const speed = parseSpeedInput(f.speed)
    onAdd({
      isPC: true,
      kind: 'pc',
      combatantId: crypto.randomUUID(),
      name: f.name.trim(),
      initiative: 0, // rolled/entered when combat begins
      initiativeMod: f.init ? signed(f.init) : undefined,
      ac: num(f.ac),
      passivePerception: f.pp ? num(f.pp) : undefined,
      languages: list(f.languages).length ? list(f.languages) : undefined,
      resistances: list(f.resistances).length ? list(f.resistances) : undefined,
      immunities: list(f.immunities).length ? list(f.immunities) : undefined,
      vulnerabilities: list(f.vulnerabilities).length ? list(f.vulnerabilities) : undefined,
      speed: Object.keys(speed).length ? speed : undefined,
      status: 'active',
      hp: { current: maxHp, max: maxHp, temp: 0 },
      concentration: null,
      effects: [],
    })
    setF({
      name: '',
      ac: '',
      hp: '',
      init: '',
      pp: '',
      languages: '',
      speed: '',
      resistances: '',
      immunities: '',
      vulnerabilities: '',
    })
    setOpen(false)
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        Add PC
      </button>
      {open && (
        <form
          onSubmit={submit}
          {...NO_AUTOFILL}
          className="absolute right-0 z-30 mt-1 max-h-[70vh] w-72 space-y-2 overflow-auto rounded-md border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-700 dark:bg-slate-900"
        >
          <input
            autoFocus
            value={f.name}
            onChange={set('name')}
            placeholder="Name"
            aria-label="PC name"
            {...NO_AUTOFILL}
            className={FIELD}
          />
          <div className="grid grid-cols-3 gap-2">
            <input value={f.ac} onChange={set('ac')} placeholder="AC" aria-label="AC" inputMode="numeric" {...NO_AUTOFILL} className={FIELD} />
            <input value={f.hp} onChange={set('hp')} placeholder="HP" aria-label="Max HP" inputMode="numeric" {...NO_AUTOFILL} className={FIELD} />
            <input value={f.init} onChange={set('init')} placeholder="Init +" aria-label="Initiative modifier" inputMode="numeric" {...NO_AUTOFILL} className={FIELD} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input value={f.pp} onChange={set('pp')} placeholder="Pass. Perc." aria-label="Passive Perception" inputMode="numeric" {...NO_AUTOFILL} className={FIELD} />
            <input value={f.speed} onChange={set('speed')} placeholder="Speed (30, Climb 12)" aria-label="Speed" {...NO_AUTOFILL} className={FIELD} />
          </div>
          <input value={f.languages} onChange={set('languages')} placeholder="Languages (comma-separated)" aria-label="Languages" {...NO_AUTOFILL} className={FIELD} />
          <div className="space-y-1">
            <p className={LABEL}>Defenses (comma-separated)</p>
            <input value={f.resistances} onChange={set('resistances')} placeholder="Resistances" aria-label="Resistances" {...NO_AUTOFILL} className={FIELD} />
            <input value={f.immunities} onChange={set('immunities')} placeholder="Immunities" aria-label="Immunities" {...NO_AUTOFILL} className={FIELD} />
            <input value={f.vulnerabilities} onChange={set('vulnerabilities')} placeholder="Vulnerabilities" aria-label="Vulnerabilities" {...NO_AUTOFILL} className={FIELD} />
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
