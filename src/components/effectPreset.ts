// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import type { Ability } from '../schema/primitives.ts'
import type {
  ConditionName,
  Effect,
  EffectApplies,
  EffectDirection,
  EffectDuration,
  EffectMode,
} from '../schema/effect.ts'
import type { EffectPreset } from '../schema/preset.ts'
import { condition, counter, modifierEffect, reminder } from '../combat/effects.ts'

/**
 * The Apply effect modal's staged state, and the pure mapping between it, the Effects
 * it commits, and the preset that saves it. The modal keeps only orchestration, so the
 * mapping can be tested without rendering — the same split `customMonster.ts` and
 * `customSpell.ts` use for their forms.
 */

/** The durations the modal offers. A preset can hold no duration the modal can't build. */
export type DurChoice =
  'manual' | 'consume' | 'save' | 'counter' | '1r' | '1m' | '10m' | '1h' | '8h' | '24h'

/** Timed durations in combat rounds (6s each), phrased the way spells are. */
export const TIMED_ROUNDS: Partial<Record<DurChoice, number>> = {
  '1r': 1,
  '1m': 10,
  '10m': 100,
  '1h': 600,
  '8h': 4800,
  '24h': 14400,
}

export const DURATION_OPTIONS: { value: DurChoice; label: string }[] = [
  { value: 'manual', label: 'Until removed' },
  { value: 'consume', label: 'This turn / next attack' },
  { value: '1r', label: '1 round' },
  { value: '1m', label: '1 minute' },
  { value: '10m', label: '10 minutes' },
  { value: '1h', label: '1 hour' },
  { value: '8h', label: '8 hours' },
  { value: '24h', label: '24 hours' },
  { value: 'save', label: 'Save ends' },
  { value: 'counter', label: 'Counter' },
]

/** The modifier builder's staged state; its amount is raw text until it is parsed. */
export interface ModifierDraft {
  label: string
  mode: EffectMode
  applies: EffectApplies
  direction: EffectDirection
  amount: string
}

/** Everything the modal stages before Apply commits it. */
export interface EffectDraft {
  duration: DurChoice
  saveAbility: Ability
  /** Raw text so the field can be empty; `makeDuration` falls back to DC 10. */
  saveDc: string
  saveWhen: 'startOfTurn' | 'endOfTurn'
  conditions: ConditionName[]
  modifier: ModifierDraft
  /** Whether the modifier is built at all — the builder is collapsed by default. */
  hasModifier: boolean
  note: string
}

/** A blank draft: nothing staged, lasting until the GM removes it. */
export function emptyDraft(): EffectDraft {
  return {
    duration: 'manual',
    saveAbility: 'dex',
    saveDc: '',
    saveWhen: 'endOfTurn',
    conditions: [],
    modifier: {
      label: '',
      mode: 'advantage',
      applies: 'attackRolls',
      direction: 'incoming',
      amount: '',
    },
    hasModifier: false,
    note: '',
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

/**
 * The duration the conditions and the modifier share. Counter is deliberately not one
 * of them: a tally is its own effect, and anything staged beside it has no timer to
 * inherit, so it lasts until removed.
 */
export function draftDuration(draft: EffectDraft): EffectDuration {
  if (draft.duration === 'consume') return { type: 'consumeOnRoll' }
  if (draft.duration === 'save')
    return {
      type: 'saveEnds',
      save: { ability: draft.saveAbility, dc: Number(draft.saveDc) || 10 },
      when: draft.saveWhen,
    }
  const rounds = TIMED_ROUNDS[draft.duration]
  if (rounds != null) return { type: 'rounds', rounds }
  return { type: 'manual' }
}

/**
 * Every Effect a draft commits: the conditions, the modifier if one was built, and the
 * reminder if one was typed — which the Counter duration turns into a tally instead,
 * since a counter is a reminder that happens to hold a number.
 *
 * Conditions already on the creature are the caller's business: the modal skips the
 * ones it is re-staging and removes the ones it unstaged.
 */
export function draftEffects(draft: EffectDraft): Effect[] {
  const duration = draftDuration(draft)
  const out: Effect[] = draft.conditions.map((c) => condition(c, { duration }))
  if (draft.hasModifier && modifierReady(draft.modifier)) {
    const m = draft.modifier
    out.push(
      modifierEffect(
        {
          name: m.label.trim(),
          mode: m.mode,
          direction: m.direction,
          applies: m.applies,
          value: m.mode === 'flatBonus' ? parseAmount(m.amount) : null,
        },
        { duration },
      ),
    )
  }
  const text = draft.note.trim()
  if (text)
    out.push(draft.duration === 'counter' ? counter(text) : reminder(text, text, { duration }))
  return out
}

/** Save a staged draft under a name. Ids are minted here, never reused from a preset. */
export function buildPreset(draft: EffectDraft, name: string): EffectPreset {
  const m = draft.modifier
  return {
    id: `custom:${crypto.randomUUID()}`,
    name: name.trim(),
    conditions: [...draft.conditions],
    modifier:
      draft.hasModifier && modifierReady(m)
        ? {
            name: m.label.trim(),
            mode: m.mode,
            direction: m.direction,
            applies: m.applies,
            value: m.mode === 'flatBonus' ? parseAmount(m.amount) : null,
          }
        : null,
    note: draft.note.trim() || null,
    duration: draftDuration(draft),
    ...(draft.duration === 'counter' ? { counter: true } : {}),
  }
}

/** The duration choice that built an EffectDuration, for reading a preset back into the form. */
function durationChoice(duration: EffectDuration, isCounter: boolean): DurChoice {
  if (isCounter) return 'counter'
  if (duration.type === 'consumeOnRoll') return 'consume'
  if (duration.type === 'saveEnds') return 'save'
  if (duration.type === 'counter') return 'counter'
  if (duration.type === 'rounds') {
    const match = (Object.keys(TIMED_ROUNDS) as DurChoice[]).find(
      (k) => TIMED_ROUNDS[k] === duration.rounds,
    )
    // A round count the modal can't build reads back as "until removed" rather than
    // silently rounding to a neighbouring one.
    if (match) return match
  }
  return 'manual'
}

/** Stage a saved preset back into the form, ready to apply or adjust. */
export function presetToDraft(preset: EffectPreset): EffectDraft {
  const base = emptyDraft()
  const save = preset.duration.type === 'saveEnds' ? preset.duration.save : null
  return {
    ...base,
    duration: durationChoice(preset.duration, preset.counter === true),
    saveAbility: save?.ability ?? base.saveAbility,
    saveDc: save ? String(save.dc) : '',
    saveWhen: preset.duration.when ?? base.saveWhen,
    conditions: [...preset.conditions],
    hasModifier: preset.modifier !== null,
    modifier: preset.modifier
      ? {
          label: preset.modifier.name,
          mode: preset.modifier.mode,
          applies: preset.modifier.applies,
          direction: preset.modifier.direction,
          amount: preset.modifier.value == null ? '' : String(preset.modifier.value),
        }
      : base.modifier,
    note: preset.note ?? '',
  }
}
