// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { useState } from 'react'
import type { Ability } from '../schema/primitives.ts'
import type { SaveOutcome } from '../schema/action.ts'
import type { Combatant } from '../schema/combatant.ts'
import type { EncounterAction } from '../state/encounter.ts'
import {
  applySaveDamage,
  damageForResult,
  evasionApplies,
  rollSave,
  type SaveResult,
} from '../combat/masssave.ts'
import {
  applyConcentrationResult,
  breakConcentration,
  concentrationPromptDC,
  rollConcentrationCheck,
} from '../combat/concentration.ts'
import { ConcentrationPrompt } from './ConcentrationPrompt.tsx'
import type { OnRoll } from './RollLog.tsx'

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

export interface GroupSaveSeed {
  ability?: Ability
  dc?: string
  onSave?: SaveOutcome
  /** Pre-filled damage number, e.g. the spell damage already rolled. */
  damage?: string
}

/**
 * The save-resolution card: pick combatants, set ability/DC/on-save, roll monster
 * saves (PCs are recorded by the DM), then apply one damage number split by the
 * rule. Shared by the standalone Group Save and by casting a save spell, which
 * seeds the ability/on-save from the spell and the DC from the caster.
 */
interface ConcPrompt {
  combatant: Combatant
  dc: number
  damage: number
}

export function GroupSaveForm({
  combatants,
  dispatch,
  onClose,
  onRoll,
  title = 'Group save',
  seed,
}: {
  combatants: Combatant[]
  dispatch: (action: EncounterAction) => void
  onClose: () => void
  /** Logs the optional in-app concentration roll, when available. */
  onRoll?: OnRoll
  title?: string
  seed?: GroupSaveSeed
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [ability, setAbility] = useState<Ability>(seed?.ability ?? 'dex')
  const [dc, setDc] = useState(seed?.dc ?? '15')
  const [onSave, setOnSave] = useState<SaveOutcome>(seed?.onSave ?? 'half')
  const [rows, setRows] = useState<Record<string, Row>>({})
  const [damage, setDamage] = useState(seed?.damage ?? '')
  const [pending, setPending] = useState<ConcPrompt[]>([])

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
    const prompts: ConcPrompt[] = []
    for (const c of combatants) {
      const result = rows[c.combatantId]?.result
      if (!result) continue
      const evasion = evasionApplies(c, ability, onSave)
      const dealt = damageForResult(full, result, onSave, evasion)
      const promptDc = concentrationPromptDC(c, applySaveDamage(c, full, result, onSave, evasion), dealt)
      if (promptDc != null) prompts.push({ combatant: c, dc: promptDc, damage: dealt })
      dispatch({
        type: 'update',
        id: c.combatantId,
        update: (cc) => applySaveDamage(cc, full, result, onSave, evasion),
      })
    }
    // Surviving concentrators that took damage owe a concentration save next.
    if (prompts.length > 0) setPending(prompts)
    else onClose()
  }

  const resolveConcentration = (combatantId: string, update?: (c: Combatant) => Combatant) => {
    if (update) dispatch({ type: 'update', id: combatantId, update })
    setPending((prev) => {
      const next = prev.filter((p) => p.combatant.combatantId !== combatantId)
      if (next.length === 0) onClose()
      return next
    })
  }

  const rollConcentration = (p: ConcPrompt) => {
    const check = rollConcentrationCheck(p.combatant, p.damage)
    onRoll?.(`${nameOf(p.combatant)}: concentration`, check.roll, check.applied)
    resolveConcentration(p.combatant.combatantId, (c) =>
      applyConcentrationResult(c, check.maintained),
    )
  }

  const resolved = Object.keys(rows).length > 0
  const selectedCombatants = combatants.filter((c) => selected.has(c.combatantId))

  if (pending.length > 0) {
    return (
      <div className="w-full rounded-lg border border-slate-200 p-3 dark:border-slate-800">
        <h3 className="mb-2 text-sm font-semibold">Concentration checks</h3>
        <ul className="space-y-2">
          {pending.map((p) => (
            <li
              key={p.combatant.combatantId}
              className="flex flex-wrap items-center justify-between gap-2"
            >
              <span className="text-sm font-medium">{nameOf(p.combatant)}</span>
              <ConcentrationPrompt
                dc={p.dc}
                canRoll={!p.combatant.isPC}
                onMaintain={() => resolveConcentration(p.combatant.combatantId)}
                onBreak={() =>
                  resolveConcentration(p.combatant.combatantId, breakConcentration)
                }
                onRoll={p.combatant.isPC ? undefined : () => rollConcentration(p)}
              />
            </li>
          ))}
        </ul>
      </div>
    )
  }

  return (
    <div className="w-full rounded-lg border border-slate-200 p-3 dark:border-slate-800">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold">{title}</h3>
        <button type="button" onClick={onClose} className="text-xs text-slate-500 hover:underline">
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
          <option value="half">save → half damage</option>
          <option value="none">save → no damage</option>
          <option value="negates">save → negates effect</option>
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
