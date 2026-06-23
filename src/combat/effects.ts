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

/**
 * Constructors for the ~6 consequence shapes, all expressed as one Effect type —
 * conditions are Effects too, so there is one system, not two. We model the
 * board state a class feature leaves behind, never the feature itself. Anything
 * exotic uses `reminder()`, the escape hatch.
 */

const newId = (): string => crypto.randomUUID()

interface EffectOpts {
  source?: string
  duration?: EffectDuration
  note?: string
}

/** A 5e condition (Prone, Frightened, …). Reminder-only; manual duration by default. */
export function condition(name: ConditionName, opts: EffectOpts = {}): Effect {
  return {
    id: newId(),
    name,
    icon: 'condition',
    source: opts.source,
    modifier: null,
    duration: opts.duration ?? { type: 'manual' },
    note: opts.note,
  }
}

/** Advantage on attacks AGAINST this creature (Faerie Fire, Reckless, prone-in-melee). */
export function advantageAgainst(name: string, opts: EffectOpts = {}): Effect {
  return {
    id: newId(),
    name,
    icon: 'debuff',
    source: opts.source,
    modifier: {
      applies: 'attackRolls',
      mode: 'advantage',
      value: null,
      direction: 'incoming',
    },
    duration: opts.duration ?? { type: 'untilSourceTurn' },
    note: opts.note ?? 'Attacks against it have advantage',
  }
}

/** Disadvantage on THIS creature's own attacks (Vicious Mockery, Bane). */
export function disadvantageOn(name: string, opts: EffectOpts = {}): Effect {
  return {
    id: newId(),
    name,
    icon: 'debuff',
    source: opts.source,
    modifier: {
      applies: 'attackRolls',
      mode: 'disadvantage',
      value: null,
      direction: 'outgoing',
    },
    duration: opts.duration ?? { type: 'consumeOnRoll' },
    note: opts.note ?? 'Disadvantage on its next attack',
  }
}

/** A flat modifier to the creature's own rolls (Bless +1d4, Bane −1d4). */
export function flatBonus(
  name: string,
  value: number | string,
  opts: EffectOpts & { applies?: EffectApplies } = {},
): Effect {
  return {
    id: newId(),
    name,
    icon: 'buff',
    source: opts.source,
    modifier: {
      applies: opts.applies ?? 'all',
      mode: 'flatBonus',
      value,
      direction: 'outgoing',
    },
    duration: opts.duration ?? { type: 'rounds', rounds: 10 },
    note: opts.note ?? `${value} to rolls`,
  }
}

/** The shape of a built-by-the-GM mechanical effect (the effect modal's output). */
export interface ModifierSpec {
  name: string
  mode: EffectMode
  direction: EffectDirection
  applies: EffectApplies
  /** For `flatBonus`: a number (−2) or formula (`"1d4"`); ignored for adv/disadv. */
  value?: number | string | null
}

/** Whether a modifier helps the creature (buff) or hurts it (debuff) — badge tone. */
function modifierIcon(spec: ModifierSpec): string {
  if (spec.mode === 'flatBonus') {
    const negative =
      typeof spec.value === 'number'
        ? spec.value < 0
        : String(spec.value ?? '').trim().startsWith('-')
    return negative ? 'debuff' : 'buff'
  }
  // Advantage on its own rolls, or disadvantage on rolls against it, helps it.
  const helps =
    (spec.mode === 'advantage') === (spec.direction === 'outgoing')
  return helps ? 'buff' : 'debuff'
}

/**
 * A general mechanical modifier built from explicit parts — the effect modal's
 * output. Covers advantage/disadvantage (on its own rolls or rolls against it,
 * scoped to attacks/saves/checks/all) and flat bonuses/penalties (Bless, Bane,
 * Bardic Inspiration, …) without enumerating spells. The GM names it and picks the
 * duration; nothing here knows what feature produced it.
 */
export function modifierEffect(spec: ModifierSpec, opts: EffectOpts = {}): Effect {
  return {
    id: newId(),
    name: spec.name,
    icon: modifierIcon(spec),
    source: opts.source,
    modifier: {
      applies: spec.applies,
      mode: spec.mode,
      value: spec.mode === 'flatBonus' ? (spec.value ?? null) : null,
      direction: spec.direction,
    },
    duration: opts.duration ?? { type: 'manual' },
    note: opts.note,
  }
}

/** A note-only reminder — the long-tail escape hatch (Hex, Hunter's Mark). */
export function reminder(name: string, note: string, opts: EffectOpts = {}): Effect {
  return {
    id: newId(),
    name,
    icon: 'reminder',
    source: opts.source,
    modifier: null,
    duration: opts.duration ?? { type: 'manual' },
    note,
  }
}

/** An ongoing effect a saving throw ends (persistent fire, Ensnaring Strike). */
export function saveEnds(
  name: string,
  save: { ability: Ability; dc: number },
  opts: EffectOpts = {},
): Effect {
  return {
    id: newId(),
    name,
    icon: 'reminder',
    source: opts.source,
    modifier: null,
    duration: { type: 'saveEnds', save },
    note: opts.note,
  }
}

/** What to print on the badge: the reminder note if present, else the name. */
export function badgeLabel(effect: Effect): string {
  return effect.note ?? effect.name
}

/** A reminder-only effect carries no mechanical modifier. */
export function isReminderOnly(effect: Effect): boolean {
  return effect.modifier === null
}
