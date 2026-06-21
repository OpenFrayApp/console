// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import type { Creature } from '../schema/creature.ts'
import type { HpMethod } from '../schema/campaign.ts'
import { parseFormula } from '../dice/formula.ts'
import { roll } from '../dice/roll.ts'

/**
 * The max HP a creature enters combat with, per the campaign's HP method.
 *
 * `average` uses the creature's printed average (its `maxHp`). `min`/`max`/`roll`
 * derive from the hit-dice `hpFormula` (e.g. "19d12+133"): the floor (all 1s), the
 * ceiling (all max faces), or a fresh roll. Without a formula there is nothing to
 * vary, so every method falls back to the printed average. Result is clamped to ≥1.
 */
export function resolveMaxHp(creature: Creature, method: HpMethod): number {
  if (method === 'average' || !creature.hpFormula) return creature.maxHp
  if (method === 'roll') return Math.max(1, roll(creature.hpFormula).total)

  // min → every die shows 1; max → every die shows its max face. Flats pass through.
  let total = 0
  for (const term of parseFormula(creature.hpFormula).terms) {
    if (term.kind === 'flat') {
      total += term.value
    } else {
      const perDie = method === 'min' ? 1 : term.sides
      total += term.sign * term.count * perDie
    }
  }
  return Math.max(1, total)
}
