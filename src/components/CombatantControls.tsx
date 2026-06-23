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
import { saveBonus } from '../combat/masssave.ts'
import { roll } from '../dice/roll.ts'
import type { Effect } from '../schema/effect.ts'
import { DeathSaveControls } from './DeathSaveControls.tsx'
import { EffectModal } from './EffectModal.tsx'
import type { OnRoll } from './RollLog.tsx'

const nameOf = (c: Combatant): string => (c.isPC ? c.name : c.label)
const signed = (n: number): string => (n >= 0 ? `+${n}` : `${n}`)

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

  const removeEffect = (effectId: string) =>
    dispatch({
      type: 'update',
      id,
      update: (c) => ({ ...c, effects: c.effects.filter((e) => e.id !== effectId) }),
    })

  // Effects that a saving throw ends — surfaced so the DM is reminded one is owed.
  const saveEndsEffects = combatant.effects.filter((e) => e.duration.type === 'saveEnds')

  // Roll the escape save for a monster (PCs roll their own — never rolled for them).
  const rollSaveEnds = (effect: Effect) => {
    const save = effect.duration.save
    if (combatant.isPC || !save) return
    const bonus = saveBonus(combatant, save.ability) ?? 0
    const result = roll(`1d20${signed(bonus)}`, { kind: 'save' })
    onRoll(`${name}: ${effect.name} (${save.ability.toUpperCase()} save)`, result)
    if (result.total >= save.dc) removeEffect(effect.id)
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <EffectModal name={name} effects={combatant.effects} onApply={addEffect} onRemove={removeEffect} />

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

      {saveEndsEffects.length > 0 && (
        <div className="space-y-1">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
            Save ends
          </p>
          {saveEndsEffects.map((e) => {
            const save = e.duration.save
            return (
              <div key={e.id} className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-slate-600 dark:text-slate-300">
                  {e.name}
                  {save && ` — ${save.ability.toUpperCase()} save DC ${save.dc}`}
                  {save && (
                    <span className="text-slate-400 dark:text-slate-500">
                      {' '}
                      ({e.duration.when === 'startOfTurn' ? 'start of turn' : 'end of turn'})
                    </span>
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => removeEffect(e.id)}
                  title="Mark the save as passed and clear the effect"
                  className={`${BTN} border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950`}
                >
                  Saved — clear
                </button>
                {!combatant.isPC && (
                  <button type="button" onClick={() => rollSaveEnds(e)} className={BTN}>
                    Roll save
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
