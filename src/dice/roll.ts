// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import type { DamageType } from '../schema/primitives.ts'
import { cryptoRandom, rollDie, type RandomSource } from './rng.ts'
import {
  parseFormula,
  type AdvantageState,
  type DiceTerm,
} from './formula.ts'

/**
 * The one dice chokepoint. Presets, the manual box, monster attacks, and (later)
 * mass saves all route through this — it's also where the roll log and, from
 * step 6, effect-awareness live. Effect resolution is not wired yet; the
 * `rollerId`/`targetId` context is accepted now so the signature is stable.
 */

export type RollKind = 'attack' | 'save' | 'check' | 'damage' | 'raw'

/**
 * How a critical hit inflates damage dice. Intended to become a campaign-level
 * setting; the engine already honours it per-roll. Only plain damage dice are
 * affected (never attack rolls, never flat modifiers):
 * - `none`          — not a crit
 * - `double-dice`   — RAW: roll twice as many dice
 * - `double-total`  — roll once, then double the dice total
 * - `max-plus-roll` — add the dice maximum, then roll once (a common house rule)
 */
export type CritRule = 'none' | 'double-dice' | 'double-total' | 'max-plus-roll'

export interface DieGroup {
  sides: number
  sign: 1 | -1
  /** Every die rolled, including those dropped by adv/dis/keep. */
  results: number[]
  /** The dice kept toward the total. */
  kept: number[]
  /** This group's signed contribution to the total (after any crit rule). */
  total: number
}

export interface RollResult {
  formula: string
  kind: RollKind
  dice: DieGroup[]
  /** Sum of flat numeric modifiers (dice are not counted here). */
  modifier: number
  total: number
  /** Natural 20 on a single d20. */
  crit: boolean
  /** Natural 1 on a single d20. */
  fumble: boolean
  advantageState: AdvantageState
  damageType?: DamageType
}

export interface RollContext {
  rollerId?: string
  targetId?: string
  kind?: RollKind
  /** Crit handling for damage dice. `true` is shorthand for RAW `double-dice`. */
  crit?: boolean | CritRule
  /** Injectable randomness for tests; defaults to the CSPRNG. */
  rand?: RandomSource
}

function normalizeCrit(crit: boolean | CritRule | undefined): CritRule {
  if (crit === true) return 'double-dice'
  if (!crit) return 'none'
  return crit
}

function keptDice(results: number[], keep: DiceTerm['keep']): number[] {
  if (!keep) return results
  const desc = [...results].sort((a, b) => b - a)
  const n = Math.min(keep.n, results.length)
  return keep.mode === 'kh' ? desc.slice(0, n) : desc.slice(results.length - n)
}

function rollGroup(
  term: DiceTerm,
  critRule: CritRule,
  rand: RandomSource,
): DieGroup {
  // Crit rules only apply to plain damage dice — never attack/keep/adv terms.
  const rule = term.keep || term.advantage ? 'none' : critRule
  const count = term.count * (rule === 'double-dice' ? 2 : 1)
  const results: number[] = []
  for (let i = 0; i < count; i++) results.push(rollDie(term.sides, rand))
  const kept = keptDice(results, term.keep)
  const sum = kept.reduce((a, b) => a + b, 0)

  let contribution: number
  switch (rule) {
    case 'double-total':
      contribution = sum * 2
      break
    case 'max-plus-roll':
      contribution = term.count * term.sides + sum
      break
    default: // 'none' and 'double-dice' (the extra dice are already rolled)
      contribution = sum
  }
  return { sides: term.sides, sign: term.sign, results, kept, total: term.sign * contribution }
}

/** Crit/fumble are only meaningful for a single kept d20. */
function critFumble(dice: DieGroup[]): { crit: boolean; fumble: boolean } {
  const d20s = dice.filter((g) => g.sides === 20)
  if (d20s.length !== 1 || d20s[0].kept.length !== 1) {
    return { crit: false, fumble: false }
  }
  const value = d20s[0].kept[0]
  return { crit: value === 20, fumble: value === 1 }
}

export function roll(formula: string, ctx: RollContext = {}): RollResult {
  const rand = ctx.rand ?? cryptoRandom
  const critRule = normalizeCrit(ctx.crit)
  const parsed = parseFormula(formula)

  const dice: DieGroup[] = []
  let modifier = 0
  let total = 0
  let advantageState: AdvantageState = 'normal'

  for (const term of parsed.terms) {
    if (term.kind === 'flat') {
      modifier += term.value
      total += term.value
      continue
    }
    if (term.advantage) advantageState = term.advantage
    const group = rollGroup(term, critRule, rand)
    total += group.total
    dice.push(group)
  }

  const { crit, fumble } = critFumble(dice)
  return {
    formula: parsed.source,
    kind: ctx.kind ?? 'raw',
    dice,
    modifier,
    total,
    crit,
    fumble,
    advantageState,
    damageType: parsed.damageType,
  }
}
