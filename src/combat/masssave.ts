// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import type { Combatant } from '../schema/combatant.ts'
import type { Ability } from '../schema/primitives.ts'
import type { SaveOutcome } from '../schema/action.ts'
import type { RandomSource } from '../dice/rng.ts'
import type { RollResult } from '../dice/roll.ts'
import { rollWithEffects, type AppliedEffect } from './effectroll.ts'
import { applyDamage, type DamageOptions } from './resources.ts'

/**
 * Mass save — the Fireball flow. Roll a separate save per creature (or record the
 * player's own result), then apply one damage number split by the on-save rule.
 *
 * Monsters carry save bonuses, so they can be auto-rolled. PCs are lightweight by
 * design (no ability data) — their saves are rolled by the player and recorded by
 * the DM. The per-creature damage primitive (applySaveDamage) works for both.
 */

export type SaveResult = 'save' | 'fail'

export interface SaveRequest {
  ability: Ability
  dc: number
  /** What a success means for the *damage*: half, none, or the effect is negated. */
  onSave: SaveOutcome
}

export interface SaveRoll {
  combatantId: string
  total: number
  result: SaveResult
  roll: RollResult
  applied: AppliedEffect[]
}

export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2)
}

/** A creature's save bonus for an ability, or null for a PC (rolls their own). */
export function saveBonus(c: Combatant, ability: Ability): number | null {
  if (c.isPC) return null
  return c.creature.saves?.[ability] ?? abilityModifier(c.creature.abilities[ability])
}

const formatBonus = (n: number): string => (n === 0 ? '' : n > 0 ? `+${n}` : `${n}`)

/**
 * Auto-roll a save for a combatant that has a save bonus (monsters/NPCs). Folds
 * in any savingThrows effects (Bless, etc.). Throws for PCs — record those by hand.
 */
export function rollSave(
  c: Combatant,
  request: SaveRequest,
  ctx: { rand?: RandomSource } = {},
): SaveRoll {
  const bonus = saveBonus(c, request.ability)
  if (bonus === null) {
    throw new Error(
      `Cannot auto-roll a save for PC "${c.combatantId}"; record the result manually`,
    )
  }
  const { result, applied } = rollWithEffects(`1d20${formatBonus(bonus)}`, {
    roller: c,
    kind: 'save',
    rand: ctx.rand,
  })
  return {
    combatantId: c.combatantId,
    total: result.total,
    result: result.total >= request.dc ? 'save' : 'fail',
    roll: result,
    applied,
  }
}

/** Damage a creature takes given its result and the on-save rule. */
export function damageForResult(
  full: number,
  result: SaveResult,
  onSave: SaveOutcome,
): number {
  const dmg = Math.max(0, Math.floor(full))
  if (result === 'fail') return dmg
  return onSave === 'half' ? Math.floor(dmg / 2) : 0
}

/** Apply the split damage to one combatant (failures full, saves per the rule). */
export function applySaveDamage(
  c: Combatant,
  full: number,
  result: SaveResult,
  onSave: SaveOutcome,
  opts: DamageOptions = {},
): Combatant {
  return applyDamage(c, damageForResult(full, result, onSave), opts)
}
