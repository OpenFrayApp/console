// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import {
  parseFormula,
  roll as rollDice,
  rollDie,
  type DiceTerm,
  type DieGroup,
  type RandomSource,
  type RollResult as DiceRollResult,
  type AdvantageState,
} from 'opendice'
import { DAMAGE_TYPES, type DamageType } from '../schema/primitives.ts'

export { keptFlags } from 'opendice'
export type { DieGroup, RandomSource } from 'opendice'

/**
 * The one dice chokepoint. Presets, the manual box, monster attacks, and mass saves all
 * route through this. `opendice` owns the randomness and the grammar; what lives
 * here is the 5e sitting on top of them — what kind of roll it is, how a crit inflates
 * damage, and which damage type the total counts as. Effect-awareness layers on top via
 * effectroll.ts, which resolves the net advantage/bonuses and passes them in here.
 */

export type RollKind = 'attack' | 'save' | 'check' | 'damage' | 'raw'

/**
 * How a critical hit inflates damage dice. Only plain damage dice are affected — never
 * attack rolls, never flat modifiers, and never a group that keeps or explodes, where
 * "twice as many dice" has no one meaning:
 * - `none`          — not a crit
 * - `double-dice`   — RAW: roll twice as many dice
 * - `double-total`  — roll once, then double the dice total
 * - `max-plus-roll` — add the dice maximum, then roll once (a common house rule)
 */
export type CritRule = 'none' | 'double-dice' | 'double-total' | 'max-plus-roll'

/**
 * A roll as the console records it: the dice package's result, plus the three things
 * only this game knows. `tag` is swapped for `damageType` because the package carries a
 * label it never interprets, while here it is always one of the 5e damage types.
 */
export interface RollResult extends Omit<DiceRollResult, 'tag'> {
  kind: RollKind
  /** Natural 20 on a single d20, on an attack roll. */
  crit: boolean
  /** Natural 1 on a single d20, on an attack roll. */
  fumble: boolean
  damageType?: DamageType
}

export interface RollContext {
  kind?: RollKind
  /** Crit handling for damage dice. `true` is shorthand for RAW `double-dice`. */
  crit?: boolean | CritRule
  /** Force advantage/disadvantage on the d20 (the effect layer resolves the net). */
  advantage?: AdvantageState
  /** Extra additive terms folded in, e.g. Bless `'1d4'`; numbers or formula fragments. */
  bonuses?: (number | string)[]
  /** Injectable randomness for tests; defaults to the CSPRNG. */
  rand?: RandomSource
}

/** Resolve the crit option to a rule: `true` → RAW double-dice, absent/false → none. */
function normalizeCrit(crit: boolean | CritRule | undefined): CritRule {
  if (crit === true) return 'double-dice'
  if (!crit) return 'none'
  return crit
}

/**
 * The dice terms behind a result's groups, in the same order. `roll()` appends the
 * bonuses' terms after the formula's own, and emits one group per dice term, so the two
 * line up by index.
 */
function diceTerms(formula: string, bonuses: (number | string)[]): DiceTerm[] {
  const terms = [
    ...parseFormula(formula, { tags: DAMAGE_TYPES }).terms,
    ...bonuses.flatMap((b) => (typeof b === 'string' ? parseFormula(b).terms : [])),
  ]
  return terms.filter((t): t is DiceTerm => t.kind === 'dice')
}

/**
 * Whether a crit rule touches this group. Plain damage dice only: a group that dropped
 * dice was a keep rule or an advantage roll, and an exploding one has no fixed number of
 * dice to double or maximum to add. `term.keep`/`advantage` catch what the formula said;
 * the length check catches advantage applied at roll time, which the formula doesn't show.
 */
function critEligible(term: DiceTerm, group: DieGroup): boolean {
  return (
    !term.keep && !term.advantage && !term.explode && group.results.length === group.kept.length
  )
}

/**
 * Apply the crit rule to one group, returning what it now contributes. The extra dice of
 * `double-dice` are rolled here rather than by re-writing the formula, so the roll log
 * still reads `4d6 [3, 4, 5, 1]` — one group of eight dice, not two of four.
 */
function critGroup(
  group: DieGroup,
  term: DiceTerm,
  rule: CritRule,
  rand: RandomSource | undefined,
): DieGroup {
  const scale = group.sign * group.multiplier
  switch (rule) {
    case 'double-dice': {
      const extra = Array.from({ length: term.count }, () => rollDie(group.sides, rand))
      const sum = extra.reduce((a, b) => a + b, 0)
      return {
        ...group,
        results: [...group.results, ...extra],
        kept: [...group.kept, ...extra],
        total: group.total + scale * sum,
        // A second helping of dice is no longer one die showing its top face.
        naturalHigh: false,
        naturalLow: false,
      }
    }
    case 'double-total':
      return { ...group, multiplier: group.multiplier * 2, total: group.total * 2 }
    case 'max-plus-roll':
      return { ...group, total: group.total + scale * term.count * group.sides }
    default:
      return group
  }
}

/** Apply the crit rule across a result's groups, leaving the ones it doesn't touch alone. */
function applyCrit(
  dice: DieGroup[],
  terms: DiceTerm[],
  rule: CritRule,
  rand: RandomSource | undefined,
): { dice: DieGroup[]; total: number } {
  const crit = dice.map((group, i) => {
    const term = terms[i]
    return term && critEligible(term, group) ? critGroup(group, term, rule, rand) : group
  })
  const shift = crit.reduce((sum, g, i) => sum + (g.total - dice[i].total), 0)
  return { dice: crit, total: shift }
}

/** The d20 group behind a roll, when there is exactly one — what the UI shows raw. */
export function d20Group(result: RollResult): DieGroup | undefined {
  const d20s = result.dice.filter((g) => g.sides === 20)
  return d20s.length === 1 ? d20s[0] : undefined
}

/**
 * Crit and fumble on an attack: the roll's one d20 showing 20 or 1. `naturalHigh` and
 * `naturalLow` are already false unless that group kept a single die, which is what makes
 * a 20 among two rolled dice count only when it's the one advantage kept.
 */
function critFumble(dice: DieGroup[]): { crit: boolean; fumble: boolean } {
  const d20s = dice.filter((g) => g.sides === 20)
  if (d20s.length !== 1) return { crit: false, fumble: false }
  return { crit: d20s[0].naturalHigh, fumble: d20s[0].naturalLow }
}

/** A formula's trailing damage type, and the formula with it removed. */
function splitDamageType(formula: string): { expr: string; damageType?: DamageType } {
  const source = formula.trim()
  const match = /\s+([a-z]+)$/i.exec(source)
  if (!match) return { expr: source }
  const tag = match[1].toLowerCase() as DamageType
  if (!DAMAGE_TYPES.includes(tag)) return { expr: source }
  return { expr: source.slice(0, match.index), damageType: tag }
}

/**
 * Total a damage entry that rolls nothing — the stat blocks that read "1 piercing
 * damage", of which the SRD has some forty. There is nothing to roll, so nothing is:
 * the numbers are added up and reported with an empty `dice` list. The dice package
 * refuses these outright, which is the right call for a dice library and the wrong
 * answer for a console that has to show the 1. Crit rules inflate dice, so none apply.
 */
function flatResult(source: string, expr: string, bonuses: (number | string)[]): RollResult {
  const values = [
    ...expr.split(/(?=[+-])/).map(Number),
    ...bonuses.map((b) => {
      if (typeof b !== 'number') {
        throw new Error(`Cannot add "${b}" to "${source}", which rolls no dice`)
      }
      return b
    }),
  ]
  const total = values.reduce((a, b) => a + b, 0)
  return {
    formula: source,
    kind: 'raw',
    dice: [],
    modifier: total,
    modifiers: values,
    total,
    crit: false,
    fumble: false,
    advantageState: 'normal',
  }
}

/** The one dice chokepoint: parse, apply adv/dis and bonuses, roll, flag attack crit/fumble. */
export function roll(formula: string, ctx: RollContext = {}): RollResult {
  const bonuses = ctx.bonuses ?? []
  const { expr, damageType } = splitDamageType(formula)
  if (/^[+-]?\d+(?:[+-]\d+)*$/.test(expr.replace(/\s+/g, ''))) {
    const flat = flatResult(formula.trim(), expr.replace(/\s+/g, ''), bonuses)
    return { ...flat, kind: ctx.kind ?? 'raw', ...(damageType ? { damageType } : {}) }
  }

  const result = rollDice(formula, {
    tags: DAMAGE_TYPES,
    advantage: ctx.advantage,
    bonuses,
    rand: ctx.rand,
  })

  const rule = normalizeCrit(ctx.crit)
  const { dice, total } =
    rule === 'none'
      ? { dice: result.dice, total: 0 }
      : applyCrit(result.dice, diceTerms(formula, bonuses), rule, ctx.rand)

  // A natural 20 / 1 only crits or fumbles on an attack roll — saves and checks
  // (and damage) don't.
  const { crit, fumble } = ctx.kind === 'attack' ? critFumble(dice) : { crit: false, fumble: false }
  return {
    ...result,
    dice,
    total: result.total + total,
    kind: ctx.kind ?? 'raw',
    crit,
    fumble,
    ...(result.tag ? { damageType: result.tag as DamageType } : {}),
  }
}
