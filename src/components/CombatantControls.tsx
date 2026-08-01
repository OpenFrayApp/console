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
import { isFoe, nameOf } from '../combat/combatant.ts'
import { heldBack, onSharedBoard } from '../combat/playerView.ts'
import { signed } from '../compendium/format.ts'
import { counterOf, describeDuration, setCount } from '../combat/effects.ts'
import { saveEndsOf, type SaveEnds } from '../combat/saveEnds.ts'
import { roll } from '../dice/roll.ts'
import type { Effect } from '../schema/effect.ts'
import type { EffectPreset } from '../schema/preset.ts'
import { DeathSaveControls } from './DeathSaveControls.tsx'
import { EffectModal } from './EffectModal.tsx'
import type { OnGmRoll, OnRoll } from './GameLog.tsx'
import { track, EVENTS } from '../lib/analytics.ts'

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
  onGmRoll,
  presets,
  enabledLibraries,
  onSavePreset,
}: {
  combatant: Combatant
  /** The rest of the board, to name whoever caused a source-relative effect. */
  combatants?: Combatant[]
  /** Current round, recorded when concentration starts. */
  round: number
  dispatch: (action: EncounterAction) => void
  onRoll: OnRoll
  /** Rolls the shared player view withholds — here, a creature's escape save. */
  onGmRoll: OnGmRoll
  /** Effect presets offered above the Apply effect form. */
  presets?: EffectPreset[]
  /** Which libraries are on, so the preset picker filters like every other one. */
  enabledLibraries?: string[]
  /** Save what's staged as a preset; absent for an anonymous GM, who can't keep one. */
  onSavePreset?: (preset: EffectPreset) => void
}) {
  const [concInput, setConcInput] = useState<string | null>(null)
  const [concDur, setConcDur] = useState<number | null>(null)
  const id = combatant.combatantId
  const name = nameOf(combatant)
  const started = round > 0

  /** Dispatch a functional update against this combatant. */
  const apply = (update: (c: Combatant) => Combatant) => dispatch({ type: 'update', id, update })

  /** Start concentration with the typed spell and duration (in rounds), then clear the form. */
  const startConc = () => {
    track(EVENTS.concentrationStarted)
    const spell = (concInput ?? '').trim()
    apply((c) => startConcentration(c, { spell, saveDc: 0, round, rounds: concDur ?? undefined }))
    setConcInput(null)
    setConcDur(null)
  }

  const showDeathSaves =
    combatant.isPC && combatant.status === 'unconscious' && !isStable(combatant)

  /** Append an effect to this combatant's list. */
  const addEffect = (effect: Effect) =>
    dispatch({
      type: 'update',
      id,
      update: (c) => ({ ...c, effects: [...c.effects, effect] }),
    })

  /** Drop one effect from this combatant by id. */
  const removeEffect = (effectId: string) =>
    dispatch({
      type: 'update',
      id,
      update: (c) => ({ ...c, effects: c.effects.filter((e) => e.id !== effectId) }),
    })

  /** Replace one effect on this combatant by id, leaving the rest in place. */
  const changeEffect = (effectId: string, change: (e: Effect) => Effect) =>
    dispatch({
      type: 'update',
      id,
      update: (c) => ({
        ...c,
        effects: c.effects.map((e) => (e.id === effectId ? change(e) : e)),
      }),
    })

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
    // The die gives away the creature's save bonus; whether the effect ended is
    // logged separately by the update diff, and that part the table does see.
    onGmRoll(`${name}: ${save.effect.name} (${save.ability.toUpperCase()} save)`, result)
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
          presets={presets}
          enabledLibraries={enabledLibraries}
          onSavePreset={onSavePreset}
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
              placeholder="Spell name (optional)"
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
          onClick={() => {
            if (!combatant.reactionUsed) track(EVENTS.reactionUsed)
            apply((c) => ({ ...c, reactionUsed: !c.reactionUsed }))
          }}
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

        {isFoe(combatant) && (
          <button
            type="button"
            onClick={() =>
              apply((c) => ({ ...c, shared: onSharedBoard(c, started) ? 'hidden' : 'shown' }))
            }
            aria-pressed={heldBack(combatant)}
            title="Whether the shared player screen shows this creature. Foes appear there when the fight begins; hide one to keep an ambush off the table's board, or show it early."
            className={
              heldBack(combatant)
                ? 'rounded border border-amber-400 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                : BTN
            }
          >
            {onSharedBoard(combatant, started) ? 'Hide from players' : 'Show to players'}
          </button>
        )}

        {!combatant.isPC && (
          <button
            type="button"
            onClick={() => apply((c) => (c.isPC ? c : { ...c, side: isFoe(c) ? 'friend' : 'foe' }))}
            aria-pressed={!isFoe(combatant)}
            title="Which side this creature is on — a summons, a hired guard, or an ogre that has just been charmed. Allies keep nothing back from the shared player view."
            className={
              isFoe(combatant)
                ? BTN
                : 'rounded border border-sky-400 bg-sky-50 px-2 py-1 text-xs font-medium text-sky-700 dark:border-sky-700 dark:bg-sky-950/40 dark:text-sky-300'
            }
          >
            {isFoe(combatant) ? 'Make ally' : 'Ally'}
          </button>
        )}

        {!combatant.isPC && combatant.creature.legendaryResistance != null && (
          <>
            <button
              type="button"
              onClick={() => {
                track(EVENTS.legendaryResistanceUsed)
                apply((c) => (c.isPC ? c : spendLegendaryResistance(c)))
              }}
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
              onRoll(`${name}: death save`, ds.result, { sourceId: id })
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
              const count = counterOf(e)
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
                    {count !== null && (
                      <>
                        <button
                          type="button"
                          onClick={() => changeEffect(e.id, (x) => setCount(x, count - 1))}
                          disabled={count <= 0}
                          aria-label={`Lower ${e.name}`}
                          className={`${BTN} disabled:opacity-50`}
                        >
                          −1
                        </button>
                        <button
                          type="button"
                          onClick={() => changeEffect(e.id, (x) => setCount(x, count + 1))}
                          aria-label={`Raise ${e.name}`}
                          className={BTN}
                        >
                          +1
                        </button>
                        <button
                          type="button"
                          onClick={() => changeEffect(e.id, (x) => setCount(x, 0))}
                          disabled={count === 0}
                          title={`Set ${e.name} back to 0, keeping it on ${name}`}
                          className={`${BTN} disabled:opacity-50`}
                        >
                          Reset
                        </button>
                      </>
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
