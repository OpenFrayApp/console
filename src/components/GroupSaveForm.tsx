// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { useState } from 'react'
import type { Ability, DamageType } from '../schema/primitives.ts'
import type { SaveOutcome } from '../schema/action.ts'
import type { Combatant } from '../schema/combatant.ts'
import type { ConditionName, EffectDuration } from '../schema/effect.ts'
import type { EncounterAction } from '../state/encounter.ts'
import { d20Group, type DieGroup } from '../dice/roll.ts'
import { condition } from '../combat/effects.ts'
import { nameOf } from '../combat/combatant.ts'
import { parseNonNegativeInt as num } from '../lib/form.ts'
import {
  applySaveDamage,
  evasionApplies,
  rollSave,
  saveDamageFor,
  type SaveResult,
} from '../combat/masssave.ts'
import { concentrationPromptDC, rollConcentrationCheck } from '../combat/concentration.ts'
import { ConcentrationPrompt } from './ConcentrationPrompt.tsx'
import { ConditionChips, DamageTypeSelect, NaturalRoll } from './ActionResolver.tsx'
import { Button, Chip, Field, Select } from './ui.tsx'
import type { OnRoll } from './GameLog.tsx'
import { track, EVENTS } from '../lib/analytics.ts'

const ABILITIES: Ability[] = ['str', 'dex', 'con', 'int', 'wis', 'cha']

interface Row {
  result?: SaveResult
  total?: number
  /** The d20 group of an auto-rolled save, so both dice show under advantage. */
  d20?: DieGroup
}

export interface GroupSaveSeed {
  ability?: Ability
  dc?: string
  onSave?: SaveOutcome
  /** Pre-filled damage number, e.g. the spell damage already rolled. */
  damage?: string
}

/** A queued concentration check: who owes it, at what DC, from how much damage. */
interface ConcPrompt {
  combatant: Combatant
  dc: number
  damage: number
}

/**
 * The save-resolution card: pick combatants, set ability/DC/on-save, roll monster
 * saves (PCs are recorded by the GM), then apply one damage number split by the
 * rule. Shared by the standalone Group Save and by casting a save spell, which
 * seeds the ability/on-save from the spell and the DC from the caster.
 */
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
  const [damageType, setDamageType] = useState<DamageType | ''>('')
  const [pending, setPending] = useState<ConcPrompt[]>([])

  // Rerolling the spell's damage upstream re-seeds this field and nothing else. The
  // card used to be remounted on a new total instead, which threw away the targets
  // and the saves the GM had already settled.
  const [seeded, setSeeded] = useState(seed?.damage)
  if (seed?.damage !== seeded) {
    setSeeded(seed?.damage)
    setDamage(seed?.damage ?? '')
  }

  /** Toggle a combatant in the selection. */
  const toggleSelected = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  /** Roll one creature's save against the current DC. Never called for a PC. */
  const rollOne = (c: Combatant): Row => {
    const saveRoll = rollSave(c, { ability, dc: num(dc) || 10, onSave })
    return { result: saveRoll.result, total: saveRoll.total, d20: d20Group(saveRoll.roll) }
  }

  /** Auto-roll each selected monster's save; PC rows stay blank for the GM to record. */
  const rollSaves = () => {
    track(EVENTS.groupSaveRolled)
    const next: Record<string, Row> = {}
    for (const c of combatants) {
      if (!selected.has(c.combatantId)) continue
      if (c.isPC) {
        next[c.combatantId] = {} // the player rolls; GM records below
      } else {
        next[c.combatantId] = rollOne(c)
      }
    }
    setRows(next)
  }

  /** Reroll one creature's save — per creature, so settled rows keep their result. */
  const reroll = (c: Combatant) => {
    const row = rollOne(c)
    setRows((prev) => ({ ...prev, [c.combatantId]: row }))
  }

  /** Record a combatant's save or fail. */
  const setResult = (id: string, result: SaveResult) =>
    setRows((prev) => ({ ...prev, [id]: { ...prev[id], result } }))

  /** Apply the damage per row's result (save rule, evasion, defenses); queue concentration checks. */
  const applyDamage = () => {
    const full = num(damage)
    const opts = { type: damageType || undefined }
    const prompts: ConcPrompt[] = []
    for (const c of combatants) {
      const result = rows[c.combatantId]?.result
      if (!result) continue
      const evasion = evasionApplies(c, ability, onSave)
      const dealt = saveDamageFor(c, full, result, onSave, evasion, opts.type)
      const promptDc = concentrationPromptDC(
        c,
        applySaveDamage(c, full, result, onSave, evasion, opts),
        dealt,
      )
      if (promptDc != null) prompts.push({ combatant: c, dc: promptDc, damage: dealt })
      dispatch({
        type: 'update',
        id: c.combatantId,
        update: (cc) => applySaveDamage(cc, full, result, onSave, evasion, opts),
      })
    }
    // Surviving concentrators that took damage owe a concentration save next.
    if (prompts.length > 0) setPending(prompts)
    else onClose()
  }

  /** Settle one concentration prompt (optionally breaking it); close the card when none remain. */
  const resolveConcentration = (combatantId: string, broke = false) => {
    if (broke) dispatch({ type: 'endConcentration', id: combatantId })
    setPending((prev) => {
      const next = prev.filter((p) => p.combatant.combatantId !== combatantId)
      if (next.length === 0) onClose()
      return next
    })
  }

  /** Roll a monster's concentration check, log it, and resolve the prompt by the outcome. */
  const rollConcentration = (p: ConcPrompt) => {
    const check = rollConcentrationCheck(p.combatant, p.damage)
    onRoll?.(`${nameOf(p.combatant)}: concentration`, check.roll, {
      applied: check.applied,
      sourceId: p.combatant.combatantId,
    })
    resolveConcentration(p.combatant.combatantId, !check.maintained)
  }

  const resolved = Object.keys(rows).length > 0
  const selectedCombatants = combatants.filter((c) => selected.has(c.combatantId))

  // Conditions land on those who failed (or all selected pre-roll), like a save action.
  const applyCondition = (name: ConditionName, duration: EffectDuration) => {
    const affected = resolved
      ? selectedCombatants.filter((c) => rows[c.combatantId]?.result === 'fail')
      : selectedCombatants
    for (const c of affected) {
      dispatch({
        type: 'update',
        id: c.combatantId,
        update: (cc) => ({ ...cc, effects: [...cc.effects, condition(name, { duration })] }),
      })
    }
  }

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
                onBreak={() => resolveConcentration(p.combatant.combatantId, true)}
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
        <Button variant="quiet" onClick={onClose}>
          Cancel
        </Button>
      </div>

      <div className="mb-2 flex flex-wrap items-center gap-2 text-sm">
        <Select
          value={ability}
          onChange={(e) => setAbility(e.target.value as Ability)}
          aria-label="Save ability"
          className="uppercase"
        >
          {ABILITIES.map((a) => (
            <option key={a} value={a}>
              {a.toUpperCase()}
            </option>
          ))}
        </Select>
        <label className="flex items-center gap-1">
          DC
          <Field
            value={dc}
            onChange={(e) => setDc(e.target.value)}
            aria-label="Save DC"
            inputMode="numeric"
            className="w-14"
          />
        </label>
        <Select
          value={onSave}
          onChange={(e) => setOnSave(e.target.value as SaveOutcome)}
          aria-label="On save"
        >
          <option value="half">save → half damage</option>
          <option value="none">save → no damage</option>
          <option value="negates">save → negates effect</option>
        </Select>
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
                  {row?.d20 && <NaturalRoll group={row.d20} total={row.total} />}
                  <Chip
                    size="sm"
                    tone="good"
                    active={row?.result === 'save'}
                    onClick={() => setResult(c.combatantId, 'save')}
                  >
                    Save
                  </Chip>
                  <Chip
                    size="sm"
                    tone="bad"
                    active={row?.result === 'fail'}
                    onClick={() => setResult(c.combatantId, 'fail')}
                  >
                    Fail
                  </Chip>
                  {!c.isPC && (
                    <Chip size="sm" onClick={() => reroll(c)}>
                      Reroll
                    </Chip>
                  )}
                </span>
              )}
            </li>
          )
        })}
      </ul>

      {!resolved ? (
        <Button variant="primary" onClick={rollSaves} disabled={selectedCombatants.length === 0}>
          Roll saves
        </Button>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <Field
            value={damage}
            onChange={(e) => setDamage(e.target.value)}
            placeholder="Damage"
            aria-label="Damage"
            inputMode="numeric"
            className="w-20"
          />
          <DamageTypeSelect value={damageType} onChange={setDamageType} />
          <Button variant="danger" onClick={applyDamage}>
            Apply
          </Button>
        </div>
      )}

      {resolved && <ConditionChips onApply={applyCondition} />}
    </div>
  )
}
