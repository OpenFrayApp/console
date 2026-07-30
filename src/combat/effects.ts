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
 * exotic uses `reminder()`, the escape hatch, or `counter()` when the thing being
 * remembered is a number that climbs.
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
        : String(spec.value ?? '')
            .trim()
            .startsWith('-')
    return negative ? 'debuff' : 'buff'
  }
  // Advantage on its own rolls, or disadvantage on rolls against it, helps it.
  const helps = (spec.mode === 'advantage') === (spec.direction === 'outgoing')
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

/**
 * A tally the GM keeps by hand — Depth, Spore Load, corruption, a doom clock.
 * It holds a number instead of a timer: nothing in the app raises or lowers it,
 * no clock ticks it, and it ends when the GM clears it. The escape hatch for
 * anything a table counts that the rules engine deliberately doesn't know about.
 */
export function counter(name: string, opts: EffectOpts = {}): Effect {
  return {
    id: newId(),
    name,
    icon: 'counter',
    source: opts.source,
    modifier: null,
    duration: { type: 'counter', count: 0 },
    note: opts.note,
  }
}

/** A tally is a whole number and never negative. */
function clampCount(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0
}

/** The tally an effect carries, or `null` when it isn't a counter. */
export function counterOf(effect: Effect): number | null {
  return effect.duration.type === 'counter' ? (effect.duration.count ?? 0) : null
}

/** Set a counter's tally, floored at zero; anything else is returned untouched. */
export function setCount(effect: Effect, count: number): Effect {
  if (effect.duration.type !== 'counter') return effect
  return { ...effect, duration: { ...effect.duration, count: clampCount(count) } }
}

/** What to print on the badge: the reminder note if present, else the name — with a counter's tally after it. */
export function badgeLabel(effect: Effect): string {
  const label = effect.note ?? effect.name
  const count = counterOf(effect)
  return count === null ? label : `${label} ${count}`
}

/** A reminder-only effect carries no mechanical modifier. */
export function isReminderOnly(effect: Effect): boolean {
  return effect.modifier === null
}

/**
 * How this effect ends, in words — the right-hand "Applied effects" list carries
 * this so the badge on the row can stay short. A `rounds` effect reports what is
 * left (it ticks down each round); anything the clock can't tick falls back to the
 * source's own wording ("8 hours"), then to "until removed".
 */
export function describeDuration(effect: Effect, sourceName?: string): string {
  const d = effect.duration
  switch (d.type) {
    case 'saveEnds': {
      if (!d.save) return 'save ends'
      const when = d.when === 'startOfTurn' ? 'SoT' : 'EoT'
      return `${d.save.ability.toUpperCase()} save DC ${d.save.dc} (${when})`
    }
    case 'rounds': {
      const rounds = d.rounds ?? 0
      // Rounds are what a GM counts in a fight, but past ten minutes of them the
      // number stops meaning anything — say it in time instead. (6 seconds a round.)
      if (rounds > 100) {
        const minutes = Math.round(rounds / 10)
        if (minutes < 60) return `${minutes} minutes left`
        const hours = Math.round(minutes / 60)
        return `${hours} hour${hours === 1 ? '' : 's'} left`
      }
      return `${rounds} round${rounds === 1 ? '' : 's'} left`
    }
    case 'counter':
      return `at ${d.count ?? 0}`
    case 'consumeOnRoll':
      return 'until its next roll'
    case 'untilSourceTurn':
      return sourceName ? `until ${sourceName}’s next turn` : 'until its source’s next turn'
    default:
      return effect.durationNote ?? 'until removed'
  }
}

/** Rounds in a long rest's 8 hours: 8 × 3600 ÷ 6s = 4800. */
const LONG_REST_ROUNDS = 4800

/**
 * Does an effect outlast a long rest? Combat-scoped durations (consume-on-roll,
 * until-source-turn, save-ends) and short timed `rounds` effects clear; a GM-managed
 * `manual` or `counter` effect, or an explicitly ≥8h `rounds` duration, survives.
 * A counter tracks something a rest doesn't settle — whether the night lowers it is
 * the GM's call, made with the +/− buttons.
 */
export function survivesLongRest(effect: Effect): boolean {
  const d = effect.duration
  if (d.type === 'manual' || d.type === 'counter') return true
  if (d.type === 'rounds') return (d.rounds ?? 0) >= LONG_REST_ROUNDS
  return false
}
