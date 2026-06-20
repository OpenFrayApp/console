// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { useState } from 'react'
import type { Action } from '../schema/action.ts'
import type { Combatant } from '../schema/combatant.ts'
import type { EncounterAction } from '../state/encounter.ts'
import {
  isStable,
  markDeathSaveFailure,
  markDeathSaveSuccess,
  rollDeathSave,
} from '../combat/deathsaves.ts'
import { breakConcentration, startConcentration } from '../combat/concentration.ts'
import { rollWithEffects } from '../combat/effectroll.ts'
import { roll } from '../dice/roll.ts'
import type { Effect } from '../schema/effect.ts'
import { DeathSaveControls } from './DeathSaveControls.tsx'
import { EffectPicker } from './EffectPicker.tsx'
import { GroupSaveForm } from './GroupSaveForm.tsx'
import type { OnRoll } from './RollLog.tsx'

const nameOf = (c: Combatant): string => (c.isPC ? c.name : c.label)

const signed = (n: number): string => (n >= 0 ? `+${n}` : `${n}`)
const CHIP =
  'rounded border px-2 py-1 text-xs font-medium border-indigo-300 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-300 dark:hover:bg-indigo-950'

const BTN =
  'rounded border px-2 py-1 text-xs font-medium border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800'

interface TaggedAction {
  action: Action
  /** Category label for non-standard actions (Bonus, Reaction, Legendary, Lair). */
  tag?: string
}

/** Every rollable action on a creature — attacks and saves, across all categories. */
function rollableActions(c: Combatant): TaggedAction[] {
  if (c.isPC) return []
  const { creature } = c
  const tagged: TaggedAction[] = [
    ...(creature.actions ?? []).map((action) => ({ action })),
    ...(creature.bonusActions ?? []).map((action) => ({ action, tag: 'Bonus' })),
    ...(creature.reactions ?? []).map((action) => ({ action, tag: 'Reaction' })),
    ...(creature.legendaryActions?.actions ?? []).map((action) => ({ action, tag: 'Legendary' })),
    ...(creature.lairActions ?? []).map((action) => ({ action, tag: 'Lair' })),
  ]
  return tagged.filter((t) => t.action.toHit != null || t.action.save != null)
}

export function CombatantControls({
  combatant,
  combatants,
  round,
  dispatch,
  onRoll,
}: {
  combatant: Combatant
  /** The full order, so attacks can pick a target for effect-aware rolling. */
  combatants: Combatant[]
  /** Current round, recorded when concentration starts. */
  round: number
  dispatch: (action: EncounterAction) => void
  onRoll: OnRoll
}) {
  const [targetId, setTargetId] = useState('')
  const [concInput, setConcInput] = useState<string | null>(null)
  const [saveAction, setSaveAction] = useState<{ action: Action; damage?: number } | null>(null)
  const id = combatant.combatantId
  const name = nameOf(combatant)

  const apply = (update: (c: Combatant) => Combatant) => dispatch({ type: 'update', id, update })

  const startConc = () => {
    const spell = (concInput ?? '').trim()
    apply((c) => startConcentration(c, { spell, saveDc: 0, round }))
    setConcInput(null)
  }

  const others = combatants.filter((c) => c.combatantId !== id)
  const target = others.find((c) => c.combatantId === targetId)

  const showDeathSaves =
    combatant.isPC && combatant.status === 'unconscious' && !isStable(combatant)

  const actions = rollableActions(combatant)

  const rollAttack = (action: Action) => {
    if (action.toHit == null) return
    const range = action.kind === 'ranged' ? 'ranged' : 'melee'
    const { result, applied } = rollWithEffects(`1d20${signed(action.toHit)}`, {
      roller: combatant,
      target,
      range,
      kind: 'attack',
    })
    const label = target ? `${name}: ${action.name} → ${nameOf(target)}` : `${name}: ${action.name}`
    onRoll(label, result, applied)
  }

  const rollDamage = (action: Action) => {
    const formula = (action.damage ?? []).map((d) => d.formula).join('+')
    if (formula) onRoll(`${name}: ${action.name} damage`, roll(formula, { kind: 'damage' }))
  }

  // A save action (breath weapon, etc.) rolls its damage, then opens the group
  // save seeded from the action — the same resolver as a cast save spell.
  const triggerSaveAction = (action: Action) => {
    const formula = (action.damage ?? []).map((d) => d.formula).join('+')
    let dealt: number | undefined
    if (formula) {
      const result = roll(formula, { kind: 'damage' })
      onRoll(`${name}: ${action.name} damage`, result)
      dealt = result.total
    }
    setSaveAction({ action, damage: dealt })
  }

  const addEffect = (effect: Effect) =>
    dispatch({
      type: 'update',
      id,
      update: (c) => ({ ...c, effects: [...c.effects, effect] }),
    })

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <button type="button" className={BTN} onClick={() => dispatch({ type: 'remove', id })}>
          Remove
        </button>

        <EffectPicker onApply={addEffect} />

        {combatant.concentration ? (
          <button type="button" className={BTN} onClick={() => apply(breakConcentration)}>
            End concentration
          </button>
        ) : concInput === null ? (
          <button type="button" className={BTN} onClick={() => setConcInput('')}>
            Concentrate
          </button>
        ) : (
          <span className="inline-flex items-center gap-1">
            <input
              autoFocus
              value={concInput}
              onChange={(e) => setConcInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') startConc()
                if (e.key === 'Escape') setConcInput(null)
              }}
              placeholder="Spell / effect (optional)"
              aria-label={`Concentration spell for ${name}`}
              className="w-40 rounded border border-slate-300 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-900"
            />
            <button type="button" className={BTN} onClick={startConc}>
              Set
            </button>
          </span>
        )}

        {showDeathSaves && (
          <DeathSaveControls
            onSave={() => dispatch({ type: 'update', id, update: (c) => (c.isPC ? markDeathSaveSuccess(c) : c) })}
            onFail={() => dispatch({ type: 'update', id, update: (c) => (c.isPC ? markDeathSaveFailure(c) : c) })}
            onRoll={() => dispatch({ type: 'update', id, update: (c) => (c.isPC ? rollDeathSave(c).pc : c) })}
          />
        )}
      </div>

      {actions.length > 0 && (
        <div className="flex flex-wrap items-center gap-1">
          {others.length > 0 && (
            <select
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              aria-label={`Attack target for ${name}`}
              className="rounded border border-slate-300 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-900"
            >
              <option value="">No target</option>
              {others.map((c) => (
                <option key={c.combatantId} value={c.combatantId}>
                  {nameOf(c)}
                </option>
              ))}
            </select>
          )}
          {actions.map(({ action, tag }, i) => {
            const suffix = tag ? ` (${tag})` : ''
            if (action.toHit != null) {
              return (
                <span key={`${action.id}-${i}`} className="inline-flex gap-px">
                  <button type="button" className={CHIP} onClick={() => rollAttack(action)}>
                    {action.name} {signed(action.toHit)}
                    {suffix}
                  </button>
                  {action.damage && action.damage.length > 0 && (
                    <button
                      type="button"
                      className={CHIP}
                      aria-label={`${action.name} damage`}
                      onClick={() => rollDamage(action)}
                    >
                      dmg
                    </button>
                  )}
                </span>
              )
            }
            return (
              <button
                key={`${action.id}-${i}`}
                type="button"
                className={CHIP}
                onClick={() => triggerSaveAction(action)}
              >
                {action.name} · {action.save?.ability.toUpperCase()} save
                {suffix}
              </button>
            )
          })}
        </div>
      )}

      {saveAction?.action.save && (
        <GroupSaveForm
          combatants={combatants}
          dispatch={dispatch}
          onRoll={onRoll}
          onClose={() => setSaveAction(null)}
          title={`${name}: ${saveAction.action.name}`}
          seed={{
            ability: saveAction.action.save.ability,
            dc: String(saveAction.action.save.dc),
            onSave: saveAction.action.save.onSave,
            damage: saveAction.damage != null ? String(saveAction.damage) : undefined,
          }}
        />
      )}
    </div>
  )
}
