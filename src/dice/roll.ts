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

export interface DieGroup {
  sides: number
  sign: 1 | -1
  /** Every die rolled, including those dropped by adv/dis/keep. */
  results: number[]
  /** The dice kept toward the total. */
  kept: number[]
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
  /** A critical hit doubles the dice count of every dice term (never modifiers). */
  crit?: boolean
  /** Injectable randomness for tests; defaults to the CSPRNG. */
  rand?: RandomSource
}

function keptDice(results: number[], keep: DiceTerm['keep']): number[] {
  if (!keep) return results
  const desc = [...results].sort((a, b) => b - a)
  const n = Math.min(keep.n, results.length)
  return keep.mode === 'kh' ? desc.slice(0, n) : desc.slice(results.length - n)
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
    const count = term.count * (ctx.crit ? 2 : 1)
    const results: number[] = []
    for (let i = 0; i < count; i++) results.push(rollDie(term.sides, rand))
    const kept = keptDice(results, term.keep)
    total += term.sign * kept.reduce((a, b) => a + b, 0)
    dice.push({ sides: term.sides, sign: term.sign, results, kept })
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
