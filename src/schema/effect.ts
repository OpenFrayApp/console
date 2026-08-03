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

/**
 * Which category of roll a modifier touches — or, for the last three, which of the
 * creature's numbers it moves: armor class, Speed, or the hit point maximum. The
 * stat targets take flat values only ({@link EffectModifier.value}); a Speed value
 * may also be `'half'`, `'zero'`, or `'double'`, the three changes the rules phrase
 * that way (Slow, a web, Haste).
 */
export type EffectApplies =
  'attackRolls' | 'savingThrows' | 'abilityChecks' | 'ac' | 'speed' | 'maxHp' | 'all'

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
  /**
   * Narrows a saving-throw or ability-check modifier to particular abilities —
   * "Disadvantage on Wisdom checks" is `applies: 'abilityChecks', abilities: ['wis']`.
   * Absent (or empty) means every ability, and a roll whose ability the engine
   * doesn't know is never matched against a narrowed modifier.
   */
  abilities?: Ability[]
  /**
   * For an `ac` modifier: an alternative unarmored base — Mage Armor's 13 + DEX.
   * A player character wearing no armor uses the better of this and their own base;
   * anyone whose "unarmored" the app can't know keeps reading it as a reminder.
   */
  acBase?: number
}

/**
 * The bundle an effect was applied as part of — a preset like Drunk, or several
 * parts the GM staged and named together. Presentation and lifecycle only, never a
 * seventh consequence shape: members render as one badge carrying the bundle's
 * name and clear together, while their durations still tick one by one.
 */
export interface EffectBundle {
  /** Minted per application, so two Drunk creatures hold two distinct bundles. */
  id: string
  /** What the badge on the tracker row says: "Drunk", "Mortification 3". */
  name: string
}

export type EffectDurationType =
  'consumeOnRoll' | 'rounds' | 'untilSourceTurn' | 'saveEnds' | 'manual' | 'counter'

export interface EffectDuration {
  type: EffectDurationType
  /** For `rounds`: how many rounds remain. */
  rounds?: number | null
  /**
   * For `counter`: the current tally, never below zero. Nothing in the app raises
   * or lowers it — the GM does, from the Applied effects list.
   */
  count?: number
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
  /**
   * Set when the effect exists only while `source` concentrates on the spell that
   * made it. Ending that concentration clears it from every target.
   */
  concentration?: boolean
  /** Always shown to the GM as a plain reminder. */
  note?: string
  /**
   * The source's own wording for how long this lasts ("8 hours", "Until dispelled"),
   * kept for effects the clock can't tick. Display-only — nothing derives from it.
   */
  durationNote?: string
  /** Set when this effect was applied as part of a named bundle. */
  bundle?: EffectBundle
  /**
   * Held back from the shared player view — a Depth counter, a secret the table
   * shouldn't read. The GM sees it as ever; `playerBoard()` never sends it.
   */
  gmOnly?: boolean
}
