// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import type { Combatant } from '../schema/combatant.ts'
import type { Ability } from '../schema/primitives.ts'
import type { ConditionName, Effect, EffectApplies, EffectModifier } from '../schema/effect.ts'
import type { AdvantageState, RandomSource } from 'opendice'
import { roll, type CritRule, type RollKind, type RollResult } from '../dice/roll.ts'
import { conditionAttackAdvantage, type AttackRange } from './conditionrules.ts'

/**
 * Effect-aware rolling. A roll consults the roller's `outgoing` effects and the
 * target's `incoming` effects, nets advantage and disadvantage (one of each cancels
 * to a straight roll), folds in flat bonuses (Bless), and consumes `consumeOnRoll`
 * effects. The dice module stays generic; this layer translates effects into its
 * `advantage` / `bonuses` context.
 */

export interface AppliedEffect {
  /** The effect's name (or a synthesized source like "Unconscious"). */
  source: string
  /** What it did: `advantage`, `disadvantage`, or a bonus like `+1d4`. */
  effect: string
}

/**
 * A human label for an applied effect. The "Adv against" / "Disadv on" quick
 * chips name the effect after its own mode, so a naive `name: mode` would read
 * "Disadvantage: disadvantage" — collapse that to just the name.
 */
export function describeApplied(a: AppliedEffect): string {
  if (a.source.toLowerCase() === a.effect.toLowerCase()) return a.source
  return `${a.source}: ${a.effect}`
}

export interface EffectRollOptions {
  roller?: Combatant
  target?: Combatant
  kind: RollKind
  /**
   * Which ability a save or check rolls, when the caller knows it — what lets an
   * ability-narrowed modifier ("Disadvantage on Wisdom checks") match. Left unset,
   * narrowed modifiers simply don't fire; the engine never guesses.
   */
  ability?: Ability
  /** Attack range — drives Prone (melee = advantage, ranged = disadvantage). */
  range?: AttackRange
  /** Extra advantage sources beyond effects, e.g. a trait like "Magic Resistance". */
  advantageSources?: string[]
  /** Extra disadvantage sources beyond effects. */
  disadvantageSources?: string[]
  /** The GM's own Normal/Advantage/Disadvantage setting. It nets with the effects like
   *  any other source but is never named in `applied` — the control that set it is on
   *  screen, and the dropped die already shows it landed. */
  advantage?: AdvantageState
  crit?: boolean | CritRule
  rand?: RandomSource
}

export interface EffectRoll {
  result: RollResult
  applied: AppliedEffect[]
  /** Combatants with any consumeOnRoll effects removed (same refs if none fired). */
  roller?: Combatant
  target?: Combatant
}

/** `all` covers the three roll kinds; specific applies-targets match their kind. */
function appliesToKind(applies: EffectApplies, kind: RollKind): boolean {
  if (applies === 'all') {
    return kind === 'attack' || kind === 'save' || kind === 'check'
  }
  switch (kind) {
    case 'attack':
      return applies === 'attackRolls'
    case 'save':
      return applies === 'savingThrows'
    case 'check':
      return applies === 'abilityChecks'
    default:
      return false
  }
}

interface Applicable {
  effect: Effect
  modifier: EffectModifier
}

/**
 * Whether a modifier narrowed to particular abilities matches this roll. Only saves
 * and checks carry an ability, so a narrowed modifier never touches an attack — and
 * when the caller didn't say which ability rolls, it doesn't fire at all.
 */
function abilitiesMatch(m: EffectModifier, kind: RollKind, ability: Ability | undefined): boolean {
  if (!m.abilities || m.abilities.length === 0) return true
  if (kind !== 'save' && kind !== 'check') return false
  return ability !== undefined && m.abilities.includes(ability)
}

/** Gather the roller's outgoing and the target's incoming effects that fit this roll. */
function collect(
  roller: Combatant | undefined,
  target: Combatant | undefined,
  kind: RollKind,
  ability: Ability | undefined,
): Applicable[] {
  const out: Applicable[] = []
  for (const effect of roller?.effects ?? []) {
    const m = effect.modifier
    if (
      m &&
      m.direction === 'outgoing' &&
      appliesToKind(m.applies, kind) &&
      abilitiesMatch(m, kind, ability)
    ) {
      out.push({ effect, modifier: m })
    }
  }
  for (const effect of target?.effects ?? []) {
    const m = effect.modifier
    if (
      m &&
      m.direction === 'incoming' &&
      appliesToKind(m.applies, kind) &&
      abilitiesMatch(m, kind, ability)
    ) {
      out.push({ effect, modifier: m })
    }
  }
  return out
}

/** Format a flat bonus for display: numbers gain a sign ("+2"), dice strings pass through. */
function describeBonus(value: number | string): string {
  if (typeof value === 'number') return value >= 0 ? `+${value}` : `${value}`
  return value
}

/** Roll a formula with both sides' effects netted in; consumeOnRoll effects are spent. */
export function rollWithEffects(formula: string, opts: EffectRollOptions): EffectRoll {
  const { roller, target, kind } = opts
  const applicable = collect(roller, target, kind, opts.ability)

  let advCount = 0
  let disCount = 0
  const bonuses: (number | string)[] = []
  const applied: AppliedEffect[] = []

  /** Tally one advantage/disadvantage source into the counts and `applied`; null does nothing. */
  const addAdvantage = (state: AdvantageState | null, source: string): void => {
    if (state === 'advantage') {
      advCount += 1
      applied.push({ source, effect: 'advantage' })
    } else if (state === 'disadvantage') {
      disCount += 1
      applied.push({ source, effect: 'disadvantage' })
    }
  }

  // Advantage / disadvantage passed in by the caller: a named trait, then the GM's own
  // unnamed setting.
  for (const source of opts.advantageSources ?? []) addAdvantage('advantage', source)
  for (const source of opts.disadvantageSources ?? []) addAdvantage('disadvantage', source)
  if (opts.advantage === 'advantage') advCount++
  else if (opts.advantage === 'disadvantage') disCount++

  for (const { effect, modifier } of applicable) {
    if (modifier.mode === 'advantage' || modifier.mode === 'disadvantage') {
      addAdvantage(modifier.mode, effect.name)
    } else if (modifier.mode === 'flatBonus' && modifier.value != null) {
      bonuses.push(modifier.value)
      applied.push({ source: effect.name, effect: describeBonus(modifier.value) })
    }
  }

  // Condition-driven attack advantage/disadvantage (Prone is range-dependent).
  if (kind === 'attack') {
    const range = opts.range ?? 'melee'
    for (const effect of roller?.effects ?? []) {
      if (effect.icon === 'condition') {
        addAdvantage(
          conditionAttackAdvantage(effect.name as ConditionName, 'attacker', range),
          effect.name,
        )
      }
    }
    for (const effect of target?.effects ?? []) {
      if (effect.icon === 'condition') {
        addAdvantage(
          conditionAttackAdvantage(effect.name as ConditionName, 'defender', range),
          effect.name,
        )
      }
    }
    // The Unconscious life-state grants advantage to attackers, regardless of range.
    if (target?.status === 'unconscious') addAdvantage('advantage', 'Unconscious')
  }

  const advantage: AdvantageState =
    advCount > 0 && disCount > 0
      ? 'normal'
      : advCount > 0
        ? 'advantage'
        : disCount > 0
          ? 'disadvantage'
          : 'normal'

  const result = roll(formula, {
    kind,
    crit: opts.crit,
    rand: opts.rand,
    advantage,
    bonuses,
  })

  // Consume consumeOnRoll effects that fired, from whichever combatant owns them.
  const consumed = new Set(
    applicable.filter((a) => a.effect.duration.type === 'consumeOnRoll').map((a) => a.effect.id),
  )
  /** Drop consumed effects from a combatant; same reference when it owned none of them. */
  const strip = (c: Combatant | undefined): Combatant | undefined => {
    if (!c || !c.effects.some((e) => consumed.has(e.id))) return c
    return { ...c, effects: c.effects.filter((e) => !consumed.has(e.id)) }
  }

  return { result, applied, roller: strip(roller), target: strip(target) }
}
