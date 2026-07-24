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
import { startConcentration } from '../combat/concentration.ts'
import {
  legendaryResistanceLeft,
  setInLair,
  spendLegendaryResistance,
} from '../combat/resources.ts'
import { saveBonus } from '../combat/masssave.ts'
import { describeDuration } from '../combat/effects.ts'
import { saveEndsOf, type SaveEnds } from '../combat/saveEnds.ts'
import { roll } from '../dice/roll.ts'
import type { Effect, EffectDuration } from '../schema/effect.ts'
import { DeathSaveControls } from './DeathSaveControls.tsx'
import { EffectModal } from './EffectModal.tsx'
import type { OnRoll } from './GameLog.tsx'

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
  combatants,
  round,
  dispatch,
  onRoll,
}: {
  combatant: Combatant
  /** The rest of the board, to name whoever caused a source-relative effect. */
  combatants?: Combatant[]
  /** Current round, recorded when concentration starts. */
  round: number
  dispatch: (action: EncounterAction) => void
  onRoll: OnRoll
}) {
  const [concInput, setConcInput] = useState<string | null>(null)
  const [concDur, setConcDur] = useState<number | null>(null)
  const id = combatant.combatantId
  const name = nameOf(combatant)

  const apply = (update: (c: Combatant) => Combatant) => dispatch({ type: 'update', id, update })

  const startConc = () => {
    const spell = (concInput ?? '').trim()
    apply((c) => startConcentration(c, { spell, saveDc: 0, round, rounds: concDur ?? undefined }))
    setConcInput(null)
    setConcDur(null)
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

  // Called when the GM changes the shared duration after already applying some effects this session.
  const setEffectsDuration = (ids: string[], duration: EffectDuration) => {
    const set = new Set(ids)
    dispatch({
      type: 'update',
      id,
      update: (c) => ({
        ...c,
        effects: c.effects.map((e) => (set.has(e.id) ? { ...e, duration } : e)),
      }),
    })
  }

  // Alphabetical, so a row keeps its place as effects come and go.
  const sortedEffects = [...combatant.effects].sort((a, b) => a.name.localeCompare(b.name))

  /** Name of whoever caused an effect, for a source-relative duration. */
  const sourceName = (e: Effect): string | undefined => {
    const src = combatants?.find((c) => c.combatantId === e.source)
    return src && (src.isPC ? src.name : src.label)
  }

  // Monster escape save (PCs roll their own). One die per effect — effects that share
  // an ability and DC came from different sources, so one roll can't end both.
  const rollSaveEnds = (save: SaveEnds) => {
    if (combatant.isPC) return
    const bonus = saveBonus(combatant, save.ability) ?? 0
    const result = roll(`1d20${signed(bonus)}`, { kind: 'save' })
    onRoll(`${name}: ${save.effect.name} (${save.ability.toUpperCase()} save)`, result)
    if (result.total >= save.dc) removeEffect(save.effect.id)
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <EffectModal
          name={name}
          effects={combatant.effects}
          onApply={addEffect}
          onRemove={removeEffect}
          onUpdateDuration={setEffectsDuration}
        />

        {combatant.effects.length > 0 && (
          <button
            type="button"
            onClick={() => apply((c) => ({ ...c, effects: [] }))}
            title={`Clear every effect on ${name}`}
            className={BTN}
          >
            Clear effects
          </button>
        )}

        {combatant.concentration ? (
          <button
            type="button"
            onClick={() => dispatch({ type: 'endConcentration', id: combatant.combatantId })}
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
              className="w-36 rounded border border-slate-300 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-900"
            />
            <select
              value={concDur === null ? '' : String(concDur)}
              onChange={(e) => setConcDur(e.target.value === '' ? null : Number(e.target.value))}
              aria-label={`Concentration duration for ${name}`}
              className="rounded border border-slate-300 bg-white px-1 py-1 text-xs dark:border-slate-700 dark:bg-slate-900"
            >
              <option value="">Until removed</option>
              <option value="10">1 minute</option>
              <option value="100">10 minutes</option>
              <option value="600">1 hour</option>
              <option value="4800">8 hours</option>
            </select>
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
            onSave={() =>
              dispatch({
                type: 'update',
                id,
                update: (c) => (c.isPC ? markDeathSaveSuccess(c) : c),
              })
            }
            onFail={() =>
              dispatch({
                type: 'update',
                id,
                update: (c) => (c.isPC ? markDeathSaveFailure(c) : c),
              })
            }
            onRoll={() => {
              if (!combatant.isPC) return
              const ds = rollDeathSave(combatant)
              onRoll(`${name}: death save`, ds.result)
              dispatch({ type: 'update', id, update: (c) => (c.isPC ? ds.pc : c) })
            }}
          />
        )}
      </div>

      {combatant.effects.length > 0 && (
        <div className="rounded-md border border-slate-300/70 bg-slate-50/70 px-2 py-1.5 dark:border-slate-700/60 dark:bg-slate-900/40">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Applied effects
          </p>
          {/* Two columns — what it is, and what to do about it — so the buttons line up. */}
          <ul className="divide-y divide-slate-200/80 dark:divide-slate-800/80">
            {sortedEffects.map((e) => {
              const save = saveEndsOf(e)
              return (
                <li key={e.id} className="flex items-center justify-between gap-2 py-1 text-xs">
                  <span className="min-w-0 text-slate-700 dark:text-slate-200">
                    <span className="font-medium">{e.name}</span>{' '}
                    <span className="text-slate-500 dark:text-slate-400">
                      ·{' '}
                      {save ? (
                        <>
                          {save.ability.toUpperCase()} save DC {save.dc} (
                          <abbr
                            title={save.when === 'startOfTurn' ? 'Start of turn' : 'End of turn'}
                            className="cursor-help underline decoration-dotted underline-offset-2"
                          >
                            {save.when === 'startOfTurn' ? 'SoT' : 'EoT'}
                          </abbr>
                          )
                        </>
                      ) : (
                        describeDuration(e, sourceName(e))
                      )}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1">
                    {save && !combatant.isPC && (
                      <button type="button" onClick={() => rollSaveEnds(save)} className={BTN}>
                        Roll save
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => removeEffect(e.id)}
                      title={save ? `${e.name}: save made — clear it` : `Clear ${e.name}`}
                      className={`${BTN} border-slate-300 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800`}
                    >
                      Clear
                    </button>
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
