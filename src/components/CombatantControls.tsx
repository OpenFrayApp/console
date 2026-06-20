// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { useState } from 'react'
import type { Combatant } from '../schema/combatant.ts'
import type { EncounterAction } from '../state/encounter.ts'
import { applyDamage, applyHealing } from '../combat/resources.ts'
import {
  isStable,
  markDeathSaveFailure,
  markDeathSaveSuccess,
  rollDeathSave,
} from '../combat/deathsaves.ts'
import { DeathSaveControls } from './DeathSaveControls.tsx'

const BTN =
  'rounded border px-2 py-1 text-xs font-medium border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800'

export function CombatantControls({
  combatant,
  dispatch,
}: {
  combatant: Combatant
  dispatch: (action: EncounterAction) => void
}) {
  const [amount, setAmount] = useState('')
  const n = Math.max(0, Math.floor(Number(amount) || 0))
  const id = combatant.combatantId

  const apply = (update: (c: Combatant) => Combatant) => {
    dispatch({ type: 'update', id, update })
    setAmount('')
  }

  const showDeathSaves =
    combatant.isPC && combatant.status === 'unconscious' && !isStable(combatant)

  return (
    <div className="flex flex-wrap items-center gap-2 pl-9 text-sm">
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

      {showDeathSaves && (
        <DeathSaveControls
          onSave={() => dispatch({ type: 'update', id, update: (c) => (c.isPC ? markDeathSaveSuccess(c) : c) })}
          onFail={() => dispatch({ type: 'update', id, update: (c) => (c.isPC ? markDeathSaveFailure(c) : c) })}
          onRoll={() => dispatch({ type: 'update', id, update: (c) => (c.isPC ? rollDeathSave(c).pc : c) })}
        />
      )}
    </div>
  )
}
