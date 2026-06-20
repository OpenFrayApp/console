// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import type {
  Combatant,
  CombatantStatus,
  MonsterCombatant,
} from '../schema/combatant.ts'
import type { SpellLevel } from '../schema/creature.ts'

/**
 * Resource mutations on a Combatant — HP/damage/heal, spell slots, legendary
 * actions, and limited-use abilities. All pure: they return a new value and
 * never mutate the input.
 *
 * Deferred to the dice engine (steps 5–6): rolling `Recharge 5–6` dice and the
 * concentration check triggered by damage. The state setters here are what those
 * later flows will call once a die has been rolled.
 */

const clampNonNegativeInt = (n: number): number => Math.max(0, Math.floor(n))

/** A creature is bloodied at or below half its max HP. */
export function isBloodied(c: Combatant): boolean {
  return c.hp.current <= Math.floor(c.hp.max / 2)
}

/** Reaching 0 HP downs a PC and kills a monster (by default); above 0 is active. */
function statusForHp(c: Combatant, current: number): CombatantStatus {
  if (current > 0) return 'active'
  return c.isPC ? 'down' : 'dead'
}

/** Apply damage: temporary HP absorbs first, then current HP floors at 0. */
export function applyDamage(c: Combatant, amount: number): Combatant {
  const dmg = clampNonNegativeInt(amount)
  const fromTemp = Math.min(c.hp.temp, dmg)
  const temp = c.hp.temp - fromTemp
  const current = Math.max(0, c.hp.current - (dmg - fromTemp))
  return { ...c, hp: { ...c.hp, current, temp }, status: statusForHp(c, current) }
}

/** Heal up to max HP. Healing above 0 revives a downed/dead creature (revivify). */
export function applyHealing(c: Combatant, amount: number): Combatant {
  const current = Math.min(c.hp.max, c.hp.current + clampNonNegativeInt(amount))
  const status = current > 0 ? 'active' : c.status
  return { ...c, hp: { ...c.hp, current }, status }
}

/** Grant temporary HP. Temp HP does not stack — the higher value wins (5e rule). */
export function grantTempHp(c: Combatant, amount: number): Combatant {
  const temp = Math.max(c.hp.temp, clampNonNegativeInt(amount))
  return { ...c, hp: { ...c.hp, temp } }
}

// --- spell slots (monsters/NPCs; PCs track their own on their sheet) --------

export function slotMax(c: MonsterCombatant, level: SpellLevel): number {
  return c.creature.spellcasting?.slots[level] ?? 0
}

export function slotsRemaining(c: MonsterCombatant, level: SpellLevel): number {
  return slotMax(c, level) - (c.slotsUsed[level] ?? 0)
}

/** Spend one slot of the given level; a no-op if none remain. */
export function useSlot(c: MonsterCombatant, level: SpellLevel): MonsterCombatant {
  if (slotsRemaining(c, level) <= 0) return c
  const used = (c.slotsUsed[level] ?? 0) + 1
  return { ...c, slotsUsed: { ...c.slotsUsed, [level]: used } }
}

/** Give back one spent slot; a no-op if none are spent. */
export function restoreSlot(
  c: MonsterCombatant,
  level: SpellLevel,
): MonsterCombatant {
  const used = c.slotsUsed[level] ?? 0
  if (used <= 0) return c
  return { ...c, slotsUsed: { ...c.slotsUsed, [level]: used - 1 } }
}

// --- legendary actions ------------------------------------------------------

/** Spend legendary actions this round; clamps at 0. (Reset happens in nextTurn.) */
export function spendLegendary(
  c: MonsterCombatant,
  cost = 1,
): MonsterCombatant {
  const remaining = Math.max(0, c.legendaryRemaining - clampNonNegativeInt(cost))
  return { ...c, legendaryRemaining: remaining }
}

// --- limited-use / recharge abilities ---------------------------------------

export function isLimitedAvailable(c: MonsterCombatant, id: string): boolean {
  return c.limitedUseState[id]?.available ?? false
}

export function useLimited(c: MonsterCombatant, id: string): MonsterCombatant {
  return {
    ...c,
    limitedUseState: { ...c.limitedUseState, [id]: { available: false } },
  }
}

export function rechargeLimited(c: MonsterCombatant, id: string): MonsterCombatant {
  return {
    ...c,
    limitedUseState: { ...c.limitedUseState, [id]: { available: true } },
  }
}
