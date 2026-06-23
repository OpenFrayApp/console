// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { useState } from 'react'
import type { Combatant } from '../schema/combatant.ts'
import type { EncounterAction } from '../state/encounter.ts'
import {
  isStable,
  markDeathSaveFailure,
  markDeathSaveSuccess,
  rollDeathSave,
} from '../combat/deathsaves.ts'
import { breakConcentration, startConcentration } from '../combat/concentration.ts'
import {
  legendaryResistanceLeft,
  setInLair,
  spendLegendaryResistance,
} from '../combat/resources.ts'
import type { Effect } from '../schema/effect.ts'
import { DeathSaveControls } from './DeathSaveControls.tsx'
import { EffectModal } from './EffectModal.tsx'
import type { OnRoll } from './RollLog.tsx'

const nameOf = (c: Combatant): string => (c.isPC ? c.name : c.label)

const BTN =
  'rounded border px-2 py-1 text-xs font-medium border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800'

/**
 * Per-combatant controls: remove, apply effects/conditions, concentration, and
 * death saves. Rolling a creature's own actions lives in the stat block (tap an
 * action name → resolver), not here.
 */
export function CombatantControls({
  combatant,
  round,
  dispatch,
  onRoll,
}: {
  combatant: Combatant
  /** Current round, recorded when concentration starts. */
  round: number
  dispatch: (action: EncounterAction) => void
  onRoll: OnRoll
}) {
  const [concInput, setConcInput] = useState<string | null>(null)
  const id = combatant.combatantId
  const name = nameOf(combatant)

  const apply = (update: (c: Combatant) => Combatant) => dispatch({ type: 'update', id, update })

  const startConc = () => {
    const spell = (concInput ?? '').trim()
    apply((c) => startConcentration(c, { spell, saveDc: 0, round }))
    setConcInput(null)
  }

  const showDeathSaves =
    combatant.isPC && combatant.status === 'unconscious' && !isStable(combatant)

  const addEffect = (effect: Effect) =>
    dispatch({
      type: 'update',
      id,
      update: (c) => ({ ...c, effects: [...c.effects, effect] }),
    })

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <EffectModal name={name} onApply={addEffect} />

        {combatant.concentration ? (
          <button
            type="button"
            onClick={() => apply(breakConcentration)}
            className="rounded border border-violet-400 px-2 py-1 text-xs font-medium text-violet-700 hover:bg-violet-50 dark:border-violet-700 dark:text-violet-300 dark:hover:bg-violet-950/40"
          >
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

        <button
          type="button"
          onClick={() => apply((c) => ({ ...c, reactionUsed: !c.reactionUsed }))}
          aria-pressed={combatant.reactionUsed === true}
          title="One reaction per round (opportunity attack, readied action, Shield, …). Refreshes at the start of this combatant's turn."
          className={
            combatant.reactionUsed
              ? 'rounded border px-2 py-1 text-xs font-medium border-amber-400 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
              : BTN
          }
        >
          {combatant.reactionUsed ? 'Reaction used' : 'Use reaction'}
        </button>

        {!combatant.isPC && combatant.creature.legendaryResistance != null && (
          <>
            <button
              type="button"
              onClick={() => apply((c) => (c.isPC ? c : spendLegendaryResistance(c)))}
              disabled={legendaryResistanceLeft(combatant) <= 0}
              title="Turn a failed save into a success; spends one use"
              className="rounded border border-amber-400 px-2 py-1 text-xs font-medium text-amber-700 hover:bg-amber-50 disabled:opacity-50 dark:border-amber-700 dark:text-amber-300 dark:hover:bg-amber-950/40"
            >
              Use Legendary Resistance
            </button>
            {combatant.creature.legendaryResistanceLair != null && (
              <label className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={!!combatant.inLair}
                  onChange={(e) => apply((c) => (c.isPC ? c : setInLair(c, e.target.checked)))}
                />
                In lair
              </label>
            )}
          </>
        )}

        {showDeathSaves && (
          <DeathSaveControls
            onSave={() => dispatch({ type: 'update', id, update: (c) => (c.isPC ? markDeathSaveSuccess(c) : c) })}
            onFail={() => dispatch({ type: 'update', id, update: (c) => (c.isPC ? markDeathSaveFailure(c) : c) })}
            onRoll={() => {
              if (!combatant.isPC) return
              const ds = rollDeathSave(combatant)
              onRoll(`${name}: death save`, ds.result)
              dispatch({ type: 'update', id, update: (c) => (c.isPC ? ds.pc : c) })
            }}
          />
        )}
      </div>
    </div>
  )
}
