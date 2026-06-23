// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import type { Ability } from './primitives.ts'

/**
 * The Effect is the one abstraction for everything that should change a future
 * roll or remind the GM. Conditions are a *kind* of Effect, so there's one
 * system, not two.
 *
 * There are only ~6 shapes of consequence in all of 5e (a condition, advantage,
 * disadvantage, a flat modifier, a reminder, a save-ends effect). We model those
 * six — never the hundreds of class features that produce them. The GM transcribes
 * the outcome; the app reminds.
 */

/** The 15 standard 5e conditions — the most common Effect shape. */
export type ConditionName =
  | 'Blinded'
  | 'Charmed'
  | 'Deafened'
  | 'Exhaustion'
  | 'Frightened'
  | 'Grappled'
  | 'Incapacitated'
  | 'Invisible'
  | 'Paralyzed'
  | 'Petrified'
  | 'Poisoned'
  | 'Prone'
  | 'Restrained'
  | 'Stunned'
  | 'Unconscious'

/** Which category of roll a modifier touches. */
export type EffectApplies =
  | 'attackRolls'
  | 'savingThrows'
  | 'abilityChecks'
  | 'ac'
  | 'all'

export type EffectMode = 'advantage' | 'disadvantage' | 'flatBonus'

/**
 * Captures both Reckless Attack and Vicious Mockery with one field:
 * - `outgoing` — affects *this creature's own* rolls (mocked goblin attacks at disadvantage)
 * - `incoming` — affects rolls made *against* this creature (anyone attacking the
 *   reckless barbarian has advantage)
 */
export type EffectDirection = 'incoming' | 'outgoing'

export interface EffectModifier {
  applies: EffectApplies
  mode: EffectMode
  /**
   * For `flatBonus`: a number (e.g. `-2`) or a dice formula (e.g. `"1d4"` for
   * Bless). `null` for advantage/disadvantage modes.
   */
  value: number | string | null
  direction: EffectDirection
}

export type EffectDurationType =
  | 'consumeOnRoll'
  | 'rounds'
  | 'untilSourceTurn'
  | 'saveEnds'
  | 'manual'

export interface EffectDuration {
  type: EffectDurationType
  /** For `rounds`: how many rounds remain. */
  rounds?: number | null
  /** For `saveEnds`: the save that clears it. */
  save?: { ability: Ability; dc: number } | null
  /**
   * For `saveEnds`: when the escape save is made, relative to the affected
   * creature's own turn. Defaults to `endOfTurn` (the 5e norm) when absent.
   */
  when?: 'startOfTurn' | 'endOfTurn'
}

export interface Effect {
  id: string
  name: string
  /** Badge hint on the combatant row, e.g. `'debuff'`, `'condition'`. */
  icon?: string
  /**
   * combatantId of who caused it — needed for `untilSourceTurn` timing and
   * concentration links. Optional for sourceless reminders.
   */
  source?: string
  /** The mechanical effect the dice engine reads; `null` = reminder-only. */
  modifier: EffectModifier | null
  duration: EffectDuration
  /**
   * When set, the combatant is skipped in the initiative loop while this effect is
   * active — e.g. a Surprised creature under the 2014 rule, skipped on round 1.
   */
  skipsTurn?: boolean
  /** Always shown to the GM as a plain reminder. */
  note?: string
}
