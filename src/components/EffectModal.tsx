// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { useEffect, useState } from 'react'
import type { Ability } from '../schema/primitives.ts'
import type {
  ConditionName,
  Effect,
  EffectApplies,
  EffectDirection,
  EffectMode,
} from '../schema/effect.ts'
import type { EffectPreset } from '../schema/preset.ts'
import {
  DURATION_OPTIONS,
  buildPreset,
  draftEffects,
  emptyDraft,
  modifierReady,
  presetToDraft,
  type DurChoice,
  type EffectDraft,
} from './effectPreset.ts'
import { describeModifier } from '../combat/effects.ts'
import { LibraryPicker } from './LibraryPicker.tsx'
import { FIELD, FIELD_W, LABEL } from './ActionEditor.tsx'
import { track as recordEvent, EVENTS } from '../lib/analytics.ts'

// Ordered roughly by table frequency.
const CONDITIONS: ConditionName[] = [
  'Prone',
  'Grappled',
  'Frightened',
  'Restrained',
  'Poisoned',
  'Stunned',
  'Blinded',
  'Charmed',
  'Incapacitated',
  'Invisible',
  'Paralyzed',
  'Petrified',
  'Deafened',
  'Unconscious',
  'Exhaustion',
]

const ABILITIES: Ability[] = ['str', 'dex', 'con', 'int', 'wis', 'cha']

const CHIP =
  'rounded border border-slate-300 px-2 py-1 text-sm hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800'

/**
 * The "Apply effect" modal: stage a duration, any conditions, an optional modifier
 * (advantage / disadvantage / flat bonus), and a reminder, then commit them all at once
 * with **Apply**. Nothing lands on the creature until Apply; ✕ / Escape / backdrop cancels.
 */
export function EffectModal({
  name,
  effects,
  onApply,
  onRemove,
  presets = [],
  enabledLibraries,
  onSavePreset,
}: {
  name: string
  effects: Effect[]
  onApply: (effect: Effect) => void
  onRemove: (id: string) => void
  /** Presets offered above the form — the GM's own, plus any an enabled library ships. */
  presets?: EffectPreset[]
  /** Which libraries are on, so the picker filters its rows the way every other one does. */
  enabledLibraries?: string[]
  /** Save what is staged as a new preset. Absent for anonymous GMs, who can't keep one. */
  onSavePreset?: (preset: EffectPreset) => void
}) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<EffectDraft>(emptyDraft)

  /** Replace one field of the staged draft. */
  const set = <K extends keyof EffectDraft>(key: K, value: EffectDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }))

  /** Replace one field of the staged modifier. */
  const setMod = <K extends keyof EffectDraft['modifier']>(
    key: K,
    value: EffectDraft['modifier'][K],
  ) => setDraft((d) => ({ ...d, modifier: { ...d.modifier, [key]: value } }))

  /** The creature's active conditions, read from its condition effects. */
  const conditionNames = (): ConditionName[] =>
    effects.filter((e) => e.icon === 'condition').map((e) => e.name as ConditionName)

  // Open with the creature's current conditions pre-selected, and everything else reset.
  const openModal = () => {
    setDraft({ ...emptyDraft(), conditions: conditionNames() })
    setOpen(true)
  }

  useEffect(() => {
    if (!open) return
    /** Close the modal on Escape. */
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  // Switching the modifier type picks sensible defaults: advantage → against it;
  // disadvantage → on its rolls; bonus → all rolls it makes.
  const chooseMode = (m: EffectMode) => {
    const applies: EffectApplies = m === 'flatBonus' ? 'all' : 'attackRolls'
    const direction: EffectDirection = m === 'advantage' ? 'incoming' : 'outgoing'
    setDraft((d) => ({ ...d, modifier: { ...d.modifier, mode: m, applies, direction } }))
  }

  /** Toggle a condition in the staged list. */
  const toggleCondition = (c: ConditionName) =>
    setDraft((d) => ({
      ...d,
      conditions: d.conditions.includes(c)
        ? d.conditions.filter((x) => x !== c)
        : [...d.conditions, c],
    }))

  // The picker wants a source on every row; the GM's own carry a `custom:` id instead,
  // which is what earns them the Custom badge.
  const pickerEntries = presets
    .filter((p) => p.source !== undefined)
    .map((p) => ({ ...p, source: p.source as string }))
  const pickerCustom = presets
    .filter((p) => p.source === undefined)
    .map((p) => ({ ...p, source: 'custom' }))

  const mod = draft.modifier
  // Placeholders stand in while the builder is half-filled; the wording itself is the
  // same one the preset card uses, so a modifier reads identically built and saved.
  const summary = describeModifier({
    name: mod.label.trim() || 'Effect',
    mode: mod.mode,
    direction: mod.direction,
    applies: mod.applies,
    value: mod.mode === 'flatBonus' ? mod.amount.trim() || '±N' : null,
  })

  // The only apply path. Commits everything staged at once: the conditions newly
  // checked, the modifier and the reminder if they were built, and removes the
  // conditions that were unchecked. `draftEffects` owns the mapping.
  const apply = () => {
    const current = new Set(conditionNames())
    const fresh = { ...draft, conditions: draft.conditions.filter((c) => !current.has(c)) }
    for (const effect of draftEffects(fresh)) {
      recordEvent(EVENTS.effectApplied)
      onApply(effect)
    }
    for (const c of current) {
      if (!draft.conditions.includes(c)) {
        const existing = effects.find((e) => e.icon === 'condition' && e.name === c)
        if (existing) onRemove(existing.id)
      }
    }
    setOpen(false)
  }

  // Picking a preset replaces whatever the last one staged — the form reads as the
  // preset, not as a pile of them. The conditions the creature already has are kept,
  // though: they are staged so Apply leaves them alone, and dropping them here would
  // make Apply strip them instead.
  const stage = (preset: EffectPreset) => {
    recordEvent(EVENTS.presetStaged)
    const staged = presetToDraft(preset)
    setDraft({ ...staged, conditions: [...new Set([...conditionNames(), ...staged.conditions])] })
  }

  // Nothing to save until something is staged; a preset with no name is not offered.
  const stagedAnything =
    draft.conditions.length > 0 ||
    draft.note.trim() !== '' ||
    (draft.hasModifier && modifierReady(draft.modifier))

  /** Name and keep what's staged, so the next fight is one click. */
  const savePreset = () => {
    const suggested = draft.note.trim() || draft.modifier.label.trim() || draft.conditions[0] || ''
    const chosen = window.prompt('Name this preset', suggested)
    if (chosen === null || chosen.trim() === '') return
    recordEvent(EVENTS.presetSaved)
    onSavePreset?.(buildPreset(draft, chosen))
  }

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="rounded border border-slate-300 px-2 py-1 text-xs font-medium hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
      >
        Apply effect
      </button>

      {open && (
        <div
          className="fixed inset-0 z-40 flex items-start justify-center overflow-auto bg-black/40 p-4 sm:p-8"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-label={`Apply effect to ${name}`}
            onClick={(e) => e.stopPropagation()}
            className="my-auto w-full max-w-lg rounded-lg border border-slate-200 bg-white text-left shadow-xl dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
              <h2 className="text-lg font-semibold">Apply effect to {name}</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="rounded p-1 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <div className="max-h-[70vh] space-y-4 overflow-auto p-4">
              {presets.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <LibraryPicker
                    label="Presets"
                    align="left"
                    placeholder="Search presets…"
                    searchLabel="Search presets"
                    entries={pickerEntries}
                    custom={pickerCustom}
                    enabledLibraries={enabledLibraries}
                    showEdition={false}
                    onPick={stage}
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Fills the form below. Nothing lands until you press Apply.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <p className={LABEL}>Duration</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={draft.duration}
                      onChange={(e) => set('duration', e.target.value as DurChoice)}
                      aria-label="Duration"
                      className={`${FIELD_W} w-full`}
                    >
                      {DURATION_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    {draft.duration === 'save' && (
                      <span className="flex flex-wrap items-center gap-1 text-sm">
                        <select
                          value={draft.saveAbility}
                          onChange={(e) => set('saveAbility', e.target.value as Ability)}
                          aria-label="Save ability"
                          className={`${FIELD_W} w-20`}
                        >
                          {ABILITIES.map((a) => (
                            <option key={a} value={a}>
                              {a.toUpperCase()}
                            </option>
                          ))}
                        </select>
                        DC
                        <input
                          value={draft.saveDc}
                          onChange={(e) => set('saveDc', e.target.value)}
                          placeholder="#"
                          aria-label="Save DC"
                          inputMode="numeric"
                          className={`${FIELD_W} w-14`}
                        />
                        <select
                          value={draft.saveWhen}
                          onChange={(e) =>
                            set('saveWhen', e.target.value as EffectDraft['saveWhen'])
                          }
                          aria-label="Save timing"
                          className={`${FIELD_W} w-32`}
                        >
                          <option value="endOfTurn">end of turn</option>
                          <option value="startOfTurn">start of turn</option>
                        </select>
                      </span>
                    )}
                  </div>
                  {draft.duration === 'save' && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      OpenFray rolls this for a creature at the chosen moment. A player rolls their
                      own, and you record it.
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <p className={LABEL}>Reminder</p>
                  <input
                    value={draft.note}
                    onChange={(e) => set('note', e.target.value)}
                    placeholder={
                      draft.duration === 'counter'
                        ? 'e.g. Depth, Corruption'
                        : 'e.g. Hex: +1d6 necrotic'
                    }
                    aria-label="Custom reminder"
                    className={`${FIELD_W} w-full`}
                  />
                </div>
              </div>

              <div className="space-y-1 border-t border-slate-200 pt-3 dark:border-slate-800">
                <p className={LABEL}>Condition</p>
                <div className="flex flex-wrap gap-1.5">
                  {CONDITIONS.map((c) => {
                    const active = draft.conditions.includes(c)
                    return (
                      <button
                        key={c}
                        type="button"
                        aria-pressed={active}
                        onClick={() => toggleCondition(c)}
                        className={
                          active
                            ? 'rounded border border-indigo-500 bg-indigo-600 px-2 py-1 text-sm font-medium text-white'
                            : CHIP
                        }
                      >
                        {c}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="border-t border-slate-200 pt-3 dark:border-slate-800">
                {!draft.hasModifier ? (
                  <button
                    type="button"
                    onClick={() => set('hasModifier', true)}
                    className="text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                  >
                    + Add a bonus or penalty
                  </button>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className={LABEL}>Modifier</p>
                      <button
                        type="button"
                        onClick={() => set('hasModifier', false)}
                        className="text-xs text-slate-500 hover:underline dark:text-slate-400"
                      >
                        Hide
                      </button>
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <label className="space-y-1">
                        <span className="text-xs text-slate-500 dark:text-slate-400">Effect</span>
                        <select
                          value={mod.mode}
                          onChange={(e) => chooseMode(e.target.value as EffectMode)}
                          aria-label="Modifier effect"
                          className={FIELD}
                        >
                          <option value="advantage">Advantage</option>
                          <option value="disadvantage">Disadvantage</option>
                          <option value="flatBonus">Bonus / penalty</option>
                        </select>
                      </label>
                      <label className="space-y-1">
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          Applies to
                        </span>
                        <select
                          value={mod.applies}
                          onChange={(e) => setMod('applies', e.target.value as EffectApplies)}
                          aria-label="Applies to"
                          className={FIELD}
                        >
                          <option value="attackRolls">Attack rolls</option>
                          <option value="savingThrows">Saving throws</option>
                          <option value="abilityChecks">Ability checks</option>
                          <option value="all">Everything</option>
                        </select>
                      </label>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                      <span className={LABEL}>On</span>
                      <label className="flex items-center gap-1">
                        <input
                          type="radio"
                          name="effect-direction"
                          checked={mod.direction === 'outgoing'}
                          onChange={() => setMod('direction', 'outgoing')}
                        />
                        Rolls it makes
                      </label>
                      <label className="flex items-center gap-1">
                        <input
                          type="radio"
                          name="effect-direction"
                          checked={mod.direction === 'incoming'}
                          onChange={() => setMod('direction', 'incoming')}
                        />
                        Rolls made against it
                      </label>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {mod.mode === 'flatBonus' && (
                        <input
                          value={mod.amount}
                          onChange={(e) => setMod('amount', e.target.value)}
                          placeholder="+1d4 or -2"
                          aria-label="Amount"
                          className={`${FIELD_W} w-28`}
                        />
                      )}
                      <input
                        value={mod.label}
                        onChange={(e) => setMod('label', e.target.value)}
                        placeholder="Label (Bless, Bane…)"
                        aria-label="Modifier label"
                        className={`${FIELD_W} min-w-0 flex-1`}
                      />
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{summary}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-4 py-3 dark:border-slate-800">
              {onSavePreset && (
                <button
                  type="button"
                  onClick={savePreset}
                  disabled={!stagedAnything}
                  title="Keep what's staged, so the next fight is one click"
                  className="mr-auto rounded-md px-3 py-1.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50 disabled:opacity-40 disabled:hover:bg-transparent dark:text-indigo-400 dark:hover:bg-indigo-950/40"
                >
                  Save as preset
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={apply}
                className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
