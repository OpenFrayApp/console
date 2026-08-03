// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import type { Ability } from '../schema/primitives.ts'
import type {
  ConditionName,
  Effect,
  EffectApplies,
  EffectBundle,
  EffectDirection,
  EffectDuration,
  EffectMode,
} from '../schema/effect.ts'
import type { EffectPreset, PresetPart } from '../schema/preset.ts'
import { condition, counter, modifierEffect, reminder } from '../combat/effects.ts'

/**
 * The Apply effect modal's staged state, and the pure mapping between it, the Effects
 * it commits, and the preset that saves it. The modal keeps only orchestration, so the
 * mapping can be tested without rendering — the same split `customMonster.ts` and
 * `customSpell.ts` use for their forms.
 *
 * A draft is a list of parts — conditions, modifiers, reminders, counters — sharing
 * one duration. Given a bundle name, the timed parts land as one named bundle: one
 * badge, cleared together. Counters always land on their own, whatever applied them.
 */

/** The durations the modal offers. A preset can hold no duration the modal can't build. */
export type DurChoice =
  'manual' | 'consume' | 'save' | 'custom' | '1r' | '1m' | '10m' | '1h' | '8h' | '24h'

/** Timed durations in combat rounds (6s each), phrased the way spells are. */
export const TIMED_ROUNDS: Partial<Record<DurChoice, number>> = {
  '1r': 1,
  '1m': 10,
  '10m': 100,
  '1h': 600,
  '8h': 4800,
  '24h': 14400,
}

/** The units the Custom duration counts in, each as combat rounds (6s a round). */
export const CUSTOM_UNITS = ['rounds', 'minutes', 'hours', 'days'] as const
export type CustomUnit = (typeof CUSTOM_UNITS)[number]
export const UNIT_ROUNDS: Record<CustomUnit, number> = {
  rounds: 1,
  minutes: 10,
  hours: 600,
  days: 14400,
}

export const DURATION_OPTIONS: { value: DurChoice; label: string }[] = [
  { value: 'manual', label: 'Until removed' },
  { value: 'consume', label: 'This turn / next attack' },
  { value: 'save', label: 'Save ends' },
  { value: '1r', label: '1 round' },
  { value: '1m', label: '1 minute' },
  { value: '10m', label: '10 minutes' },
  { value: '1h', label: '1 hour' },
  { value: '8h', label: '8 hours' },
  { value: '24h', label: '24 hours' },
  { value: 'custom', label: 'Custom…' },
]

/** The modifier builder's staged state; its amount is raw text until it is parsed. */
export interface ModifierDraft {
  label: string
  mode: EffectMode
  applies: EffectApplies
  direction: EffectDirection
  amount: string
  /** Narrows a saves/checks modifier to these abilities; empty = every ability. */
  abilities: Ability[]
}

/** A staged counter: a name, and whether the shared player view gets to see it. */
export interface CounterDraft {
  name: string
  gmOnly: boolean
}

/** Everything the modal stages before Apply commits it. */
export interface EffectDraft {
  duration: DurChoice
  /** For `custom`: raw text so the field can be empty; blank falls back to manual. */
  customAmount: string
  customUnit: CustomUnit
  saveAbility: Ability
  /** Raw text so the field can be empty; `makeDuration` falls back to DC 10. */
  saveDc: string
  saveWhen: 'startOfTurn' | 'endOfTurn'
  /**
   * Named, the timed parts apply as one bundle: one badge reading this, cleared
   * together. Blank, each part lands as its own effect, as it always has.
   */
  bundleName: string
  conditions: ConditionName[]
  modifiers: ModifierDraft[]
  /** Reminder texts; empties are staged UI state and commit nothing. */
  notes: string[]
  counters: CounterDraft[]
}

/** A blank modifier for the builder to start from. */
export function emptyModifier(): ModifierDraft {
  return {
    label: '',
    mode: 'advantage',
    applies: 'attackRolls',
    direction: 'incoming',
    amount: '',
    abilities: [],
  }
}

/** A blank draft: nothing staged, lasting until the GM removes it. */
export function emptyDraft(): EffectDraft {
  return {
    duration: 'manual',
    customAmount: '',
    customUnit: 'hours',
    saveAbility: 'dex',
    saveDc: '',
    saveWhen: 'endOfTurn',
    bundleName: '',
    conditions: [],
    modifiers: [],
    notes: [''],
    counters: [],
  }
}

/** Store a numeric amount as a number and a dice amount as a string; drop a `+`. */
export function parseAmount(raw: string): number | string {
  const s = raw.trim().replace(/^\+/, '')
  return /^-?\d+$/.test(s) ? Number(s) : s
}

/** A modifier is ready once it has a name, and an amount when it needs one. */
export function modifierReady(m: ModifierDraft): boolean {
  return m.label.trim() !== '' && (m.mode !== 'flatBonus' || m.amount.trim() !== '')
}

/** Whether the abilities picker means anything for this target — saves and checks only. */
export function canNarrowAbilities(applies: EffectApplies): boolean {
  return applies === 'savingThrows' || applies === 'abilityChecks'
}

/** A staged modifier as the spec the builders and describeModifier read. */
function modifierSpec(m: ModifierDraft): {
  name: string
  mode: EffectMode
  direction: EffectDirection
  applies: EffectApplies
  value: number | string | null
  abilities?: Ability[]
} {
  const abilities =
    canNarrowAbilities(m.applies) && m.abilities.length > 0 ? m.abilities : undefined
  return {
    name: m.label.trim(),
    mode: m.mode,
    direction: m.direction,
    applies: m.applies,
    value: m.mode === 'flatBonus' ? parseAmount(m.amount) : null,
    ...(abilities ? { abilities } : {}),
  }
}

/** The duration the conditions, modifiers, and reminders share. */
export function draftDuration(draft: EffectDraft): EffectDuration {
  if (draft.duration === 'consume') return { type: 'consumeOnRoll' }
  if (draft.duration === 'save')
    return {
      type: 'saveEnds',
      save: { ability: draft.saveAbility, dc: Number(draft.saveDc) || 10 },
      when: draft.saveWhen,
    }
  if (draft.duration === 'custom') {
    const amount = Math.trunc(Number(draft.customAmount))
    // No amount is no duration — the effect simply lasts until removed.
    if (!Number.isFinite(amount) || amount <= 0) return { type: 'manual' }
    return { type: 'rounds', rounds: amount * UNIT_ROUNDS[draft.customUnit] }
  }
  const rounds = TIMED_ROUNDS[draft.duration]
  if (rounds != null) return { type: 'rounds', rounds }
  return { type: 'manual' }
}

/** The staged parts that would actually commit something. */
export function draftParts(draft: EffectDraft): PresetPart[] {
  const out: PresetPart[] = draft.conditions.map((c) => ({ kind: 'condition', condition: c }))
  for (const m of draft.modifiers) {
    if (modifierReady(m)) out.push({ kind: 'modifier', modifier: modifierSpec(m) })
  }
  for (const raw of draft.notes) {
    const note = raw.trim()
    if (note) out.push({ kind: 'reminder', note })
  }
  for (const c of draft.counters) {
    const name = c.name.trim()
    if (name) out.push({ kind: 'counter', name, ...(c.gmOnly ? { gmOnly: true } : {}) })
  }
  return out
}

/**
 * Every Effect a draft commits: the conditions, each finished modifier, each
 * reminder, and each named counter. With a bundle name, the timed parts carry one
 * freshly-minted bundle — a counter never does, since its tally must outlive
 * whatever applied it.
 *
 * Conditions already on the creature are the caller's business: the modal skips the
 * ones it is re-staging and removes the ones it unstaged.
 */
export function draftEffects(draft: EffectDraft): Effect[] {
  const duration = draftDuration(draft)
  const name = draft.bundleName.trim()
  const bundle: EffectBundle | undefined = name ? { id: crypto.randomUUID(), name } : undefined
  const out: Effect[] = []
  for (const part of draftParts(draft)) {
    if (part.kind === 'condition') out.push(condition(part.condition, { duration, bundle }))
    else if (part.kind === 'modifier') out.push(modifierEffect(part.modifier, { duration, bundle }))
    else if (part.kind === 'reminder')
      out.push(reminder(part.note, part.note, { duration, bundle }))
    else out.push(counter(part.name, { count: part.start, gmOnly: part.gmOnly }))
  }
  return out
}

/** Save a staged draft under a name. Ids are minted here, never reused from a preset. */
export function buildPreset(draft: EffectDraft, name: string): EffectPreset {
  return {
    id: `custom:${crypto.randomUUID()}`,
    name: name.trim(),
    duration: draftDuration(draft),
    parts: draftParts(draft),
  }
}

/** The largest unit that divides a round count evenly, so "3 hours" reads back as 3 hours. */
export function bestUnit(rounds: number): { amount: number; unit: CustomUnit } {
  for (const unit of [...CUSTOM_UNITS].reverse()) {
    if (rounds % UNIT_ROUNDS[unit] === 0) return { amount: rounds / UNIT_ROUNDS[unit], unit }
  }
  return { amount: rounds, unit: 'rounds' }
}

/** The duration choice that built an EffectDuration, for reading a preset back into the form. */
function durationChoice(duration: EffectDuration): DurChoice {
  if (duration.type === 'consumeOnRoll') return 'consume'
  if (duration.type === 'saveEnds') return 'save'
  if (duration.type === 'rounds') {
    const match = (Object.keys(TIMED_ROUNDS) as DurChoice[]).find(
      (k) => TIMED_ROUNDS[k] === duration.rounds,
    )
    // A round count with no quick chip reads back as a Custom amount, losing nothing.
    return match ?? 'custom'
  }
  return 'manual'
}

/** Stage a saved preset back into the form, ready to apply or adjust. */
export function presetToDraft(preset: EffectPreset): EffectDraft {
  const base = emptyDraft()
  const save = preset.duration.type === 'saveEnds' ? preset.duration.save : null
  const choice = durationChoice(preset.duration)
  const custom =
    choice === 'custom' && preset.duration.type === 'rounds'
      ? bestUnit(preset.duration.rounds ?? 0)
      : null
  const notes = preset.parts.flatMap((p) => (p.kind === 'reminder' ? [p.note] : []))
  return {
    ...base,
    duration: choice,
    customAmount: custom ? String(custom.amount) : base.customAmount,
    customUnit: custom ? custom.unit : base.customUnit,
    saveAbility: save?.ability ?? base.saveAbility,
    saveDc: save ? String(save.dc) : '',
    saveWhen: preset.duration.when ?? base.saveWhen,
    bundleName: preset.name,
    conditions: preset.parts.flatMap((p) => (p.kind === 'condition' ? [p.condition] : [])),
    modifiers: preset.parts.flatMap((p) =>
      p.kind === 'modifier'
        ? [
            {
              label: p.modifier.name,
              mode: p.modifier.mode,
              applies: p.modifier.applies,
              direction: p.modifier.direction,
              amount: p.modifier.value == null ? '' : String(p.modifier.value),
              abilities: p.modifier.abilities ? [...p.modifier.abilities] : [],
            },
          ]
        : [],
    ),
    notes: notes.length > 0 ? notes : [''],
    counters: preset.parts.flatMap((p) =>
      p.kind === 'counter' ? [{ name: p.name, gmOnly: p.gmOnly === true }] : [],
    ),
  }
}
