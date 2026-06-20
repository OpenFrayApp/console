// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { useState } from 'react'
import type { Action } from '../schema/action.ts'
import type { Combatant } from '../schema/combatant.ts'
import type { EncounterAction } from '../state/encounter.ts'
import { applyDamage, applyHealing } from '../combat/resources.ts'
import {
  isStable,
  markDeathSaveFailure,
  markDeathSaveSuccess,
  rollDeathSave,
} from '../combat/deathsaves.ts'
import { rollWithEffects } from '../combat/effectroll.ts'
import { roll } from '../dice/roll.ts'
import type { Effect } from '../schema/effect.ts'
import { DeathSaveControls } from './DeathSaveControls.tsx'
import { EffectPicker } from './EffectPicker.tsx'
import type { OnRoll } from './RollLog.tsx'

const signed = (n: number): string => (n >= 0 ? `+${n}` : `${n}`)
const CHIP =
  'rounded border px-2 py-1 text-xs font-medium border-indigo-300 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-300 dark:hover:bg-indigo-950'

const BTN =
  'rounded border px-2 py-1 text-xs font-medium border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800'

export function CombatantControls({
  combatant,
  dispatch,
  onRoll,
}: {
  combatant: Combatant
  dispatch: (action: EncounterAction) => void
  onRoll: OnRoll
}) {
  const [amount, setAmount] = useState('')
  const n = Math.max(0, Math.floor(Number(amount) || 0))
  const id = combatant.combatantId
  const name = combatant.isPC ? combatant.name : combatant.label

  const apply = (update: (c: Combatant) => Combatant) => {
    dispatch({ type: 'update', id, update })
    setAmount('')
  }

  const showDeathSaves =
    combatant.isPC && combatant.status === 'unconscious' && !isStable(combatant)

  // Monsters carry rollable actions; PCs roll their own at the table.
  const attacks: (Action & { toHit: number })[] = combatant.isPC
    ? []
    : (combatant.creature.actions ?? []).filter(
        (a): a is Action & { toHit: number } => a.toHit != null,
      )

  const rollAttack = (action: Action & { toHit: number }) => {
    const { result, applied } = rollWithEffects(`1d20${signed(action.toHit)}`, {
      roller: combatant,
      kind: 'attack',
    })
    onRoll(`${name}: ${action.name}`, result, applied)
  }

  const rollDamage = (action: Action) => {
    const formula = (action.damage ?? []).map((d) => d.formula).join('+')
    if (formula) onRoll(`${name}: ${action.name} damage`, roll(formula, { kind: 'damage' }))
  }

  const addEffect = (effect: Effect) =>
    dispatch({
      type: 'update',
      id,
      update: (c) => ({ ...c, effects: [...c.effects, effect] }),
    })

  return (
    <div className="space-y-1 pl-9">
      <div className="flex flex-wrap items-center gap-2 text-sm">
      <input
        type="number"
        min="0"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="HP"
        aria-label={`HP amount for ${combatant.isPC ? combatant.name : combatant.label}`}
        className="w-16 rounded border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
      />
      <button type="button" className={BTN} onClick={() => apply((c) => applyDamage(c, n))}>
        Damage
      </button>
      <button type="button" className={BTN} onClick={() => apply((c) => applyHealing(c, n))}>
        Heal
      </button>
      <button
        type="button"
        className={BTN}
        onClick={() => dispatch({ type: 'remove', id })}
      >
        Remove
      </button>

      <EffectPicker onApply={addEffect} />

      {showDeathSaves && (
        <DeathSaveControls
          onSave={() => dispatch({ type: 'update', id, update: (c) => (c.isPC ? markDeathSaveSuccess(c) : c) })}
          onFail={() => dispatch({ type: 'update', id, update: (c) => (c.isPC ? markDeathSaveFailure(c) : c) })}
          onRoll={() => dispatch({ type: 'update', id, update: (c) => (c.isPC ? rollDeathSave(c).pc : c) })}
        />
      )}
      </div>

      {attacks.length > 0 && (
        <div className="flex flex-wrap items-center gap-1">
          {attacks.map((action) => (
            <span key={action.id} className="inline-flex gap-px">
              <button type="button" className={CHIP} onClick={() => rollAttack(action)}>
                {action.name} {signed(action.toHit)}
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
          ))}
        </div>
      )}
    </div>
  )
}
