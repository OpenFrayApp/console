// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { useEffect, useState } from 'react'
import type { Ability } from '../schema/primitives.ts'
import type { ConditionName, Effect, EffectApplies, EffectMode } from '../schema/effect.ts'
import type { EffectPreset } from '../schema/preset.ts'
import {
  CUSTOM_UNITS,
  DURATION_OPTIONS,
  buildPreset,
  canNarrowAbilities,
  draftEffects,
  draftParts,
  emptyDraft,
  emptyModifier,
  presetToDraft,
  type CustomUnit,
  type DurChoice,
  type EffectDraft,
  type ModifierDraft,
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

const ADD_LINK = 'text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400'

const REMOVE_LINK = 'text-xs text-slate-500 hover:underline dark:text-slate-400'

/**
 * One staged modifier's builder: effect, applies-to, direction, the optional
 * ability narrowing for saves and checks, amount and label, and the plain-English
 * summary of what was built.
 */
function ModifierBuilder({
  modifier,
  onChange,
  onRemove,
}: {
  modifier: ModifierDraft
  onChange: (m: ModifierDraft) => void
  onRemove: () => void
}) {
  /** Replace one field of this modifier. */
  const set = <K extends keyof ModifierDraft>(key: K, value: ModifierDraft[K]) =>
    onChange({ ...modifier, [key]: value })

  // Switching the modifier type picks sensible defaults: advantage → against it;
  // disadvantage → on its rolls; bonus → all rolls it makes.
  const chooseMode = (m: EffectMode) => {
    const applies: EffectApplies = m === 'flatBonus' ? 'all' : 'attackRolls'
    onChange({
      ...modifier,
      mode: m,
      applies,
      direction: m === 'advantage' ? 'incoming' : 'outgoing',
    })
  }

  /** Toggle one ability in the narrowing list. */
  const toggleAbility = (a: Ability) =>
    set(
      'abilities',
      modifier.abilities.includes(a)
        ? modifier.abilities.filter((x) => x !== a)
        : [...modifier.abilities, a],
    )

  // Placeholders stand in while the builder is half-filled; the wording itself is the
  // same one the preset card uses, so a modifier reads identically built and saved.
  const summary = describeModifier({
    name: modifier.label.trim() || 'Effect',
    mode: modifier.mode,
    direction: modifier.direction,
    applies: modifier.applies,
    value: modifier.mode === 'flatBonus' ? modifier.amount.trim() || '±N' : null,
    abilities:
      canNarrowAbilities(modifier.applies) && modifier.abilities.length > 0
        ? modifier.abilities
        : undefined,
  })

  return (
    <div className="space-y-2 rounded border border-slate-200 p-2 dark:border-slate-800">
      <div className="flex items-center justify-between">
        <p className={LABEL}>Modifier</p>
        <button type="button" onClick={onRemove} className={REMOVE_LINK}>
          Remove
        </button>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <label className="space-y-1">
          <span className="text-xs text-slate-500 dark:text-slate-400">Effect</span>
          <select
            value={modifier.mode}
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
          <span className="text-xs text-slate-500 dark:text-slate-400">Applies to</span>
          <select
            value={modifier.applies}
            onChange={(e) => set('applies', e.target.value as EffectApplies)}
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
      {canNarrowAbilities(modifier.applies) && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-slate-500 dark:text-slate-400">Abilities</span>
          {ABILITIES.map((a) => {
            const active = modifier.abilities.includes(a)
            return (
              <button
                key={a}
                type="button"
                aria-pressed={active}
                onClick={() => toggleAbility(a)}
                className={
                  active
                    ? 'rounded border border-indigo-500 bg-indigo-600 px-1.5 py-0.5 text-xs font-medium text-white'
                    : 'rounded border border-slate-300 px-1.5 py-0.5 text-xs hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800'
                }
              >
                {a.toUpperCase()}
              </button>
            )
          })}
          <span className="text-xs text-slate-400 dark:text-slate-500">
            {modifier.abilities.length === 0 ? 'all of them unless you pick' : ''}
          </span>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <span className={LABEL}>On</span>
        <label className="flex items-center gap-1">
          <input
            type="radio"
            checked={modifier.direction === 'outgoing'}
            onChange={() => set('direction', 'outgoing')}
          />
          Rolls it makes
        </label>
        <label className="flex items-center gap-1">
          <input
            type="radio"
            checked={modifier.direction === 'incoming'}
            onChange={() => set('direction', 'incoming')}
          />
          Rolls made against it
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {modifier.mode === 'flatBonus' && (
          <input
            value={modifier.amount}
            onChange={(e) => set('amount', e.target.value)}
            placeholder="+1d4 or -2"
            aria-label="Amount"
            className={`${FIELD_W} w-28`}
          />
        )}
        <input
          value={modifier.label}
          onChange={(e) => set('label', e.target.value)}
          placeholder="Label (Bless, Bane…)"
          aria-label="Modifier label"
          className={`${FIELD_W} min-w-0 flex-1`}
        />
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400">{summary}</p>
    </div>
  )
}

/**
 * The "Apply effect" modal: stage a duration, any conditions, modifiers, reminders
 * and counters, then commit them all at once with **Apply**. Several parts under one
 * name apply as a bundle — one badge, cleared together. Nothing lands on the creature
 * until Apply; ✕ / Escape / backdrop cancels.
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
  /** Commit every staged effect in one go — one board update, one log line per bundle. */
  onApply: (effects: Effect[]) => void
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

  // The only apply path. Commits everything staged at once: the conditions newly
  // checked, the modifiers, reminders and counters, and removes the conditions that
  // were unchecked. `draftEffects` owns the mapping. A counter the creature already
  // carries is left alone — its tally must survive a stage applied on top of it.
  const apply = () => {
    const current = new Set(conditionNames())
    const fresh = { ...draft, conditions: draft.conditions.filter((c) => !current.has(c)) }
    const existingCounters = new Set(
      effects.filter((e) => e.duration.type === 'counter').map((e) => e.name),
    )
    const minted = draftEffects(fresh).filter(
      (effect) => effect.duration.type !== 'counter' || !existingCounters.has(effect.name),
    )
    if (minted.length > 0) {
      minted.forEach(() => recordEvent(EVENTS.effectApplied))
      onApply(minted)
    }
    for (const c of current) {
      if (!draft.conditions.includes(c)) {
        const existing = effects.find((e) => e.icon === 'condition' && e.name === c)
        if (existing) onRemove(existing.id)
      }
    }
    setOpen(false)
  }

  // Picking a preset replaces whatever was staged — the form reads as the preset,
  // not as a pile of them. The conditions the creature already has are kept, though:
  // they are staged so Apply leaves them alone, and dropping them here would make
  // Apply strip them instead.
  const stage = (preset: EffectPreset) => {
    recordEvent(EVENTS.presetStaged)
    const staged = presetToDraft(preset)
    setDraft({ ...staged, conditions: [...new Set([...conditionNames(), ...staged.conditions])] })
  }

  // What would commit right now; drives Apply's confidence and the bundle-name field.
  const parts = draftParts(draft)
  const stagedAnything = parts.length > 0

  /** Name and keep what's staged, so the next fight is one click. */
  const savePreset = () => {
    const suggested =
      draft.bundleName.trim() ||
      draft.notes.find((n) => n.trim() !== '')?.trim() ||
      draft.modifiers[0]?.label.trim() ||
      draft.conditions[0] ||
      ''
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
                    Fills the form below. Nothing is added to the character until you press Apply.
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
                    {draft.duration === 'custom' && (
                      <span className="flex flex-wrap items-center gap-1 text-sm">
                        <input
                          value={draft.customAmount}
                          onChange={(e) => set('customAmount', e.target.value)}
                          placeholder="#"
                          aria-label="Duration amount"
                          inputMode="numeric"
                          className={`${FIELD_W} w-14`}
                        />
                        <select
                          value={draft.customUnit}
                          onChange={(e) => set('customUnit', e.target.value as CustomUnit)}
                          aria-label="Duration unit"
                          className={`${FIELD_W} w-24`}
                        >
                          {CUSTOM_UNITS.map((u) => (
                            <option key={u} value={u}>
                              {u}
                            </option>
                          ))}
                        </select>
                      </span>
                    )}
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
                  <p className={LABEL}>Reminders</p>
                  {draft.notes.map((note, i) => (
                    <div key={i} className="flex items-center gap-1">
                      <input
                        value={note}
                        onChange={(e) =>
                          set(
                            'notes',
                            draft.notes.map((n, j) => (j === i ? e.target.value : n)),
                          )
                        }
                        placeholder="e.g. Hex: +1d6 necrotic"
                        aria-label={i === 0 ? 'Custom reminder' : `Reminder ${i + 1}`}
                        className={`${FIELD_W} w-full`}
                      />
                      {draft.notes.length > 1 && (
                        <button
                          type="button"
                          aria-label={`Remove reminder ${i + 1}`}
                          onClick={() =>
                            set(
                              'notes',
                              draft.notes.filter((_, j) => j !== i),
                            )
                          }
                          className="rounded p-1 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => set('notes', [...draft.notes, ''])}
                    className={ADD_LINK}
                  >
                    + Add another reminder
                  </button>
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

              <div className="space-y-2 border-t border-slate-200 pt-3 dark:border-slate-800">
                {draft.counters.length > 0 && <p className={LABEL}>Counters</p>}
                {draft.counters.map((c, i) => (
                  <div key={i} className="flex flex-wrap items-center gap-2">
                    <input
                      value={c.name}
                      onChange={(e) =>
                        set(
                          'counters',
                          draft.counters.map((x, j) =>
                            j === i ? { ...x, name: e.target.value } : x,
                          ),
                        )
                      }
                      placeholder="e.g. Depth, Corruption"
                      aria-label={`Counter ${i + 1} name`}
                      className={`${FIELD_W} min-w-0 flex-1`}
                    />
                    <label className="flex items-center gap-1 text-sm">
                      <input
                        type="checkbox"
                        checked={c.gmOnly}
                        onChange={(e) =>
                          set(
                            'counters',
                            draft.counters.map((x, j) =>
                              j === i ? { ...x, gmOnly: e.target.checked } : x,
                            ),
                          )
                        }
                      />
                      Hidden from players
                    </label>
                    <button
                      type="button"
                      aria-label={`Remove counter ${i + 1}`}
                      onClick={() =>
                        set(
                          'counters',
                          draft.counters.filter((_, j) => j !== i),
                        )
                      }
                      className="rounded p-1 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => set('counters', [...draft.counters, { name: '', gmOnly: false }])}
                  className={ADD_LINK}
                >
                  + Add counter
                </button>
                {draft.counters.length > 0 && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    A tally you keep by hand. It starts at 0, never ticks down, and stays until you
                    clear it.
                  </p>
                )}
              </div>

              <div className="space-y-2 border-t border-slate-200 pt-3 dark:border-slate-800">
                {draft.modifiers.map((m, i) => (
                  <ModifierBuilder
                    key={i}
                    modifier={m}
                    onChange={(next) =>
                      set(
                        'modifiers',
                        draft.modifiers.map((x, j) => (j === i ? next : x)),
                      )
                    }
                    onRemove={() =>
                      set(
                        'modifiers',
                        draft.modifiers.filter((_, j) => j !== i),
                      )
                    }
                  />
                ))}
                <button
                  type="button"
                  onClick={() => set('modifiers', [...draft.modifiers, emptyModifier()])}
                  className={ADD_LINK}
                >
                  + Add a bonus or penalty
                </button>
              </div>

              {parts.length >= 2 && (
                <div className="space-y-1 border-t border-slate-200 pt-3 dark:border-slate-800">
                  <p className={LABEL}>Apply as one</p>
                  <input
                    value={draft.bundleName}
                    onChange={(e) => set('bundleName', e.target.value)}
                    placeholder="Name it — Drunk, Cursed…"
                    aria-label="Bundle name"
                    className={`${FIELD_W} w-full`}
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Named, everything above lands as one badge and clears together. Leave it blank
                    for separate badges. A counter always stands alone.
                  </p>
                </div>
              )}
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
