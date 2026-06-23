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
 * the GM. The per-creature damage primitive (applySaveDamage) works for both.
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
 * Magic Resistance — advantage on saves against spells and other magical effects.
 * A creature trait, so it's board data we can read (true only for monsters).
 */
export function hasMagicResistance(c: Combatant): boolean {
  if (c.isPC) return false
  return (c.creature.traits ?? []).some((t) => /magic resistance/i.test(t.name))
}

/**
 * Evasion — on a Dexterity save against an effect that deals half damage on a
 * success, the creature takes *no* damage on a success and *half* on a failure.
 * A creature trait (Assassin, etc.), so it's board data we can read.
 */
export function hasEvasion(c: Combatant): boolean {
  if (c.isPC) return false
  return (c.creature.traits ?? []).some((t) => /^evasion\b/i.test(t.name))
}

/** Whether Evasion changes the outcome here: only Dex saves that halve on success. */
export function evasionApplies(c: Combatant, ability: Ability, onSave: SaveOutcome): boolean {
  return ability === 'dex' && onSave === 'half' && hasEvasion(c)
}

/**
 * Auto-roll a save for a combatant that has a save bonus (monsters/NPCs). Folds
 * in any savingThrows effects (Bless, etc.). Pass `magicResistance` to grant
 * advantage when the effect is magical and the creature resists magic. Throws
 * for PCs — record those by hand.
 */
export function rollSave(
  c: Combatant,
  request: SaveRequest,
  ctx: { rand?: RandomSource; magicResistance?: boolean } = {},
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
    advantageSources: ctx.magicResistance ? ['Magic Resistance'] : [],
  })
  return {
    combatantId: c.combatantId,
    total: result.total,
    result: result.total >= request.dc ? 'save' : 'fail',
    roll: result,
    applied,
  }
}

/**
 * Damage a creature takes given its result and the on-save rule. With `evasion`
 * (a Dex, half-on-success effect against a creature with Evasion), a success
 * takes nothing and a failure takes half.
 */
export function damageForResult(
  full: number,
  result: SaveResult,
  onSave: SaveOutcome,
  evasion = false,
): number {
  const dmg = Math.max(0, Math.floor(full))
  if (evasion) return result === 'fail' ? Math.floor(dmg / 2) : 0
  if (result === 'fail') return dmg
  return onSave === 'half' ? Math.floor(dmg / 2) : 0
}

/** Apply the split damage to one combatant (failures full, saves per the rule). */
export function applySaveDamage(
  c: Combatant,
  full: number,
  result: SaveResult,
  onSave: SaveOutcome,
  evasion = false,
  opts: DamageOptions = {},
): Combatant {
  return applyDamage(c, damageForResult(full, result, onSave, evasion), opts)
}
