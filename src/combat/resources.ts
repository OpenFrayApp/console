// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import type {
  Combatant,
  CombatantStatus,
  MonsterCombatant,
} from '../schema/combatant.ts'
import type { SpellLevel, SpellRef, SpellUsage } from '../schema/creature.ts'
import { markDeathSaveFailure } from './deathsaves.ts'

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

/**
 * Wound tier from current/max HP, independent of the alive/dead status:
 * - `healthy`  — at full HP
 * - `hurt`     — below max but above half
 * - `bloodied` — at or below half, above a quarter
 * - `critical` — at or below a quarter (close to death)
 *
 * This feeds the phase-2 player view, which shows a wound tier instead of exact HP.
 */
export type HpTier = 'healthy' | 'hurt' | 'bloodied' | 'critical'

export function hpTierOf(current: number, max: number): HpTier {
  if (max <= 0 || current >= max) return 'healthy'
  if (current > Math.floor(max / 2)) return 'hurt'
  if (current > Math.floor(max / 4)) return 'bloodied'
  return 'critical'
}

export function hpTier(c: Combatant): HpTier {
  return hpTierOf(c.hp.current, c.hp.max)
}

/** Bloodied-or-worse: at or below half max HP. */
export function isBloodied(c: Combatant): boolean {
  const tier = hpTier(c)
  return tier === 'bloodied' || tier === 'critical'
}

/**
 * Status after an HP change. A monster at 0 dies; a PC at 0 is downed (and will
 * make death saves) — unless the massive-damage rule kills it outright: the
 * leftover damage after reaching 0 equals or exceeds the PC's HP maximum.
 */
function statusForHp(
  c: Combatant,
  current: number,
  overkill: number,
): CombatantStatus {
  if (current > 0) return 'active'
  if (!c.isPC) return 'dead'
  return overkill >= c.hp.max ? 'dead' : 'unconscious'
}

export interface DamageOptions {
  /** A critical hit — doubles death-save failures dealt to an already-downed PC. */
  crit?: boolean
}

/** Apply damage: temporary HP absorbs first, then current HP floors at 0. */
export function applyDamage(
  c: Combatant,
  amount: number,
  opts: DamageOptions = {},
): Combatant {
  const dmg = clampNonNegativeInt(amount)
  // Damage to an already-unconscious PC causes death-save failures (two on a crit).
  if (c.isPC && c.status === 'unconscious' && dmg > 0) {
    return markDeathSaveFailure(c, opts.crit ? 2 : 1)
  }
  const fromTemp = Math.min(c.hp.temp, dmg)
  const temp = c.hp.temp - fromTemp
  const toHp = dmg - fromTemp
  const current = Math.max(0, c.hp.current - toHp)
  const overkill = Math.max(0, toHp - c.hp.current)
  const status = statusForHp(c, current, overkill)
  // Being knocked out or killed ends concentration immediately.
  const concentration = status === 'active' ? c.concentration : null
  return { ...c, hp: { ...c.hp, current, temp }, status, concentration }
}

/**
 * Set current HP to an exact value (the DM typed a number). Unlike applyDamage,
 * this does not route through temporary HP — it sets `current` directly and
 * recomputes status the same way.
 */
export function setCurrentHp(c: Combatant, value: number): Combatant {
  const current = Math.max(0, Math.min(c.hp.max, Math.floor(value)))
  if (current > 0 && c.isPC) {
    return {
      ...c,
      hp: { ...c.hp, current },
      status: 'active',
      deathSaves: { successes: 0, failures: 0 },
    }
  }
  const status = statusForHp(c, current, 0)
  const concentration = status === 'active' ? c.concentration : null
  return { ...c, hp: { ...c.hp, current }, status, concentration }
}

/** Parse an HP/temp edit: a bare number sets the value; `+N`/`-N` adjusts it. */
export type HpInput = { delta: number } | { set: number }

export function parseHpInput(raw: string): HpInput | null {
  const s = raw.trim()
  if (/^[+-]\d+$/.test(s)) return { delta: Number(s) }
  if (/^\d+$/.test(s)) return { set: Number(s) }
  return null
}

/** Heal up to max HP. Healing above 0 revives a downed/dead creature (revivify). */
export function applyHealing(c: Combatant, amount: number): Combatant {
  const current = Math.min(c.hp.max, c.hp.current + clampNonNegativeInt(amount))
  if (current <= 0) return { ...c, hp: { ...c.hp, current } }
  // Back above 0: conscious again, and a revived PC's death saves reset.
  if (c.isPC) {
    return {
      ...c,
      hp: { ...c.hp, current },
      status: 'active',
      deathSaves: { successes: 0, failures: 0 },
    }
  }
  return { ...c, hp: { ...c.hp, current }, status: 'active' }
}

/** Grant temporary HP. Temp HP does not stack — the higher value wins (5e rule). */
export function grantTempHp(c: Combatant, amount: number): Combatant {
  const temp = Math.max(c.hp.temp, clampNonNegativeInt(amount))
  return { ...c, hp: { ...c.hp, temp } }
}

// --- spell slots (monsters/NPCs; PCs track their own on their sheet) --------

export function slotMax(c: MonsterCombatant, level: SpellLevel): number {
  return c.creature.spellcasting?.slots?.[level] ?? 0
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

export function spendLimited(c: MonsterCombatant, id: string): MonsterCombatant {
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

// --- legendary resistance (turn a failed save into a success, N/day) --------

/** Per-day uses available — the higher in-lair count when the fight is in its lair. */
export function legendaryResistanceMax(c: MonsterCombatant): number {
  const base = c.creature.legendaryResistance ?? 0
  const lair = c.creature.legendaryResistanceLair
  return c.inLair && lair != null ? lair : base
}

export function legendaryResistanceLeft(c: MonsterCombatant): number {
  return Math.max(0, legendaryResistanceMax(c) - (c.legendaryResistanceSpent ?? 0))
}

/** Spend one Legendary Resistance; a no-op if none remain. */
export function spendLegendaryResistance(c: MonsterCombatant): MonsterCombatant {
  if (legendaryResistanceLeft(c) <= 0) return c
  return { ...c, legendaryResistanceSpent: (c.legendaryResistanceSpent ?? 0) + 1 }
}

/** Toggle whether the fight is in this creature's lair (raises its max LR). */
export function setInLair(c: MonsterCombatant, inLair: boolean): MonsterCombatant {
  return { ...c, inLair }
}

// --- spellcasting uses (At Will / N per day, each spell counted on its own) --

/** The state key for a spell: its compendium ref, falling back to its name. */
export function spellKey(spell: SpellRef): string {
  return spell.ref ?? spell.name
}

/** The usage tier a spell belongs to, or undefined if it isn't in the block. */
export function spellUsage(
  c: MonsterCombatant,
  spell: SpellRef,
): SpellUsage | undefined {
  const key = spellKey(spell)
  for (const group of c.creature.spellcasting?.groups ?? []) {
    if (group.spells.some((s) => spellKey(s) === key)) return group.usage
  }
  return undefined
}

/**
 * Uses left for a spell: `null` when unlimited (at-will, or a spell not gated by
 * a per-day limit), otherwise the per-day count minus what's been spent.
 */
export function spellUsesRemaining(
  c: MonsterCombatant,
  spell: SpellRef,
): number | null {
  const usage = spellUsage(c, spell)
  if (!usage || usage.type === 'atWill') return null
  return Math.max(0, usage.per - (c.spellUsesSpent[spellKey(spell)] ?? 0))
}

/** Spend one use of a per-day spell; a no-op for at-will spells or when drained. */
export function castSpell(c: MonsterCombatant, spell: SpellRef): MonsterCombatant {
  const remaining = spellUsesRemaining(c, spell)
  if (remaining == null || remaining <= 0) return c
  const key = spellKey(spell)
  return {
    ...c,
    spellUsesSpent: { ...c.spellUsesSpent, [key]: (c.spellUsesSpent[key] ?? 0) + 1 },
  }
}

/** Give back one spent use of a per-day spell; a no-op if none are spent. */
export function restoreSpellUse(
  c: MonsterCombatant,
  spell: SpellRef,
): MonsterCombatant {
  const key = spellKey(spell)
  const spent = c.spellUsesSpent[key] ?? 0
  if (spent <= 0) return c
  return { ...c, spellUsesSpent: { ...c.spellUsesSpent, [key]: spent - 1 } }
}
