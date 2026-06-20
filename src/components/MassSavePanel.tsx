// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { useState } from 'react'
import type { Ability } from '../schema/primitives.ts'
import type { SaveOutcome } from '../schema/action.ts'
import type { Combatant } from '../schema/combatant.ts'
import type { EncounterAction } from '../state/encounter.ts'
import { applySaveDamage, rollSave, type SaveResult } from '../combat/masssave.ts'

const ABILITIES: Ability[] = ['str', 'dex', 'con', 'int', 'wis', 'cha']
const num = (v: string): number => Math.max(0, Math.floor(Number(v) || 0))
const nameOf = (c: Combatant): string => (c.isPC ? c.name : c.label)

interface Row {
  result?: SaveResult
  total?: number
}

const TOGGLE = (active: boolean, tone: string) =>
  `rounded border px-1.5 py-0.5 text-xs font-medium ${
    active ? tone : 'border-slate-300 text-slate-500 dark:border-slate-700 dark:text-slate-400'
  }`

/**
 * The Fireball flow: select combatants, set ability/DC/on-save, roll monster saves
 * (PCs are recorded by the DM), then apply one damage number split by the rule.
 */
export function MassSavePanel({
  combatants,
  dispatch,
}: {
  combatants: Combatant[]
  dispatch: (action: EncounterAction) => void
}) {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [ability, setAbility] = useState<Ability>('dex')
  const [dc, setDc] = useState('15')
  const [onSave, setOnSave] = useState<SaveOutcome>('half')
  const [rows, setRows] = useState<Record<string, Row>>({})
  const [damage, setDamage] = useState('')

  const close = () => {
    setOpen(false)
    setSelected(new Set())
    setRows({})
    setDamage('')
  }

  const toggleSelected = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const rollSaves = () => {
    const request = { ability, dc: num(dc) || 10, onSave }
    const next: Record<string, Row> = {}
    for (const c of combatants) {
      if (!selected.has(c.combatantId)) continue
      if (c.isPC) {
        next[c.combatantId] = {} // the player rolls; DM records below
      } else {
        const { result, total } = rollSave(c, request)
        next[c.combatantId] = { result, total }
      }
    }
    setRows(next)
  }

  const setResult = (id: string, result: SaveResult) =>
    setRows((prev) => ({ ...prev, [id]: { ...prev[id], result } }))

  const applyDamage = () => {
    const full = num(damage)
    for (const c of combatants) {
      const result = rows[c.combatantId]?.result
      if (!result) continue
      dispatch({
        type: 'update',
        id: c.combatantId,
        update: (cc) => applySaveDamage(cc, full, result, onSave),
      })
    }
    close()
  }

  const resolved = Object.keys(rows).length > 0
  const selectedCombatants = combatants.filter((c) => selected.has(c.combatantId))

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={combatants.length === 0}
        className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        Group save
      </button>
    )
  }

  return (
    <div className="w-full rounded-lg border border-slate-200 p-3 dark:border-slate-800">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Group save</h3>
        <button type="button" onClick={close} className="text-xs text-slate-500 hover:underline">
          Cancel
        </button>
      </div>

      <div className="mb-2 flex flex-wrap items-center gap-2 text-sm">
        <select
          value={ability}
          onChange={(e) => setAbility(e.target.value as Ability)}
          aria-label="Save ability"
          className="rounded border border-slate-300 bg-white px-2 py-1 text-sm uppercase dark:border-slate-700 dark:bg-slate-900"
        >
          {ABILITIES.map((a) => (
            <option key={a} value={a}>
              {a.toUpperCase()}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-1">
          DC
          <input
            value={dc}
            onChange={(e) => setDc(e.target.value)}
            aria-label="Save DC"
            inputMode="numeric"
            className="w-14 rounded border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
          />
        </label>
        <select
          value={onSave}
          onChange={(e) => setOnSave(e.target.value as SaveOutcome)}
          aria-label="On save"
          className="rounded border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
        >
          <option value="half">save: half</option>
          <option value="none">save: none</option>
          <option value="negates">save: negates</option>
        </select>
      </div>

      <ul className="mb-2 max-h-48 space-y-1 overflow-auto">
        {combatants.map((c) => {
          const row = rows[c.combatantId]
          return (
            <li key={c.combatantId} className="flex items-center justify-between gap-2 text-sm">
              <label className="flex min-w-0 items-center gap-2">
                <input
                  type="checkbox"
                  checked={selected.has(c.combatantId)}
                  onChange={() => toggleSelected(c.combatantId)}
                  aria-label={`Select ${nameOf(c)}`}
                />
                <span className="truncate">{nameOf(c)}</span>
              </label>
              {resolved && selected.has(c.combatantId) && (
                <span className="flex items-center gap-1">
                  {row?.total != null && (
                    <span className="tabular-nums text-slate-500 dark:text-slate-400">
                      {row.total}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setResult(c.combatantId, 'save')}
                    className={TOGGLE(
                      row?.result === 'save',
                      'border-emerald-400 text-emerald-700 dark:text-emerald-300',
                    )}
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setResult(c.combatantId, 'fail')}
                    className={TOGGLE(
                      row?.result === 'fail',
                      'border-rose-400 text-rose-700 dark:text-rose-300',
                    )}
                  >
                    Fail
                  </button>
                </span>
              )}
            </li>
          )
        })}
      </ul>

      {!resolved ? (
        <button
          type="button"
          onClick={rollSaves}
          disabled={selectedCombatants.length === 0}
          className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          Roll saves
        </button>
      ) : (
        <div className="flex items-center gap-2">
          <input
            value={damage}
            onChange={(e) => setDamage(e.target.value)}
            placeholder="Damage"
            aria-label="Damage"
            inputMode="numeric"
            className="w-20 rounded border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
          />
          <button
            type="button"
            onClick={applyDamage}
            className="rounded-md bg-rose-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-rose-500"
          >
            Apply
          </button>
        </div>
      )}
    </div>
  )
}
