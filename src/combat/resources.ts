// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import type { Combatant, CombatantStatus, MonsterCombatant } from '../schema/combatant.ts'
import type { Action } from '../schema/action.ts'
import type { SpellLevel, SpellRef, SpellUsage } from '../schema/creature.ts'
import { isStable, markDeathSaveFailure, resetDeathSaves } from './deathsaves.ts'

/**
 * Resource mutations on a Combatant — HP/damage/heal, spell slots, legendary
 * actions, and limited-use abilities. All pure: they return a new value and
 * never mutate the input.
 */

const clampNonNegativeInt = (n: number): number => Math.max(0, Math.floor(n))

/**
 * Wound tier from current/max HP, independent of alive/dead status. Feeds the player
 * view, which shows a tier instead of exact HP:
 * - `healthy`  — at full HP
 * - `hurt`     — below max but above half
 * - `bloodied` — at or below half, above a quarter
 * - `critical` — at or below a quarter
 */
export type HpTier = 'healthy' | 'hurt' | 'bloodied' | 'critical'

/** The wound tier for a current/max pair; max ≤ 0 or full HP reads as healthy. */
export function hpTierOf(current: number, max: number): HpTier {
  if (max <= 0 || current >= max) return 'healthy'
  if (current > Math.floor(max / 2)) return 'hurt'
  if (current > Math.floor(max / 4)) return 'bloodied'
  return 'critical'
}

/**
 * The hit point maximum with the active `maxHp` effects folded in — a disease's
 * "HP max −10" is a number now. Flat deltas apply first, then a `'half'` halves what
 * is left (2014 Exhaustion's fourth level), rounding down. Floors at 0; the stored
 * `hp.max` stays the true maximum, so clearing the effect gives the ceiling back
 * (current HP does not spring back with it — the reducer clamped it down when the
 * reduction landed).
 */
export function effectiveMaxHp(c: Combatant): number {
  const mods = c.effects.flatMap((e) =>
    e.modifier?.applies === 'maxHp' && e.modifier.mode === 'flatBonus' ? [e.modifier.value] : [],
  )
  const delta = mods.reduce<number>((sum, v) => (typeof v === 'number' ? sum + v : sum), 0)
  const max = Math.max(0, c.hp.max + delta)
  return mods.includes('half') ? Math.floor(max / 2) : max
}

/** The combatant's wound tier, read from its current and effective max HP. */
export function hpTier(c: Combatant): HpTier {
  return hpTierOf(c.hp.current, effectiveMaxHp(c))
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
function statusForHp(c: Combatant, current: number, overkill: number): CombatantStatus {
  if (current > 0) return 'active'
  if (!c.isPC) return 'dead'
  return overkill >= effectiveMaxHp(c) ? 'dead' : 'unconscious'
}

export interface DamageOptions {
  /** A critical hit — doubles death-save failures dealt to an already-downed PC. */
  crit?: boolean
}

/** Apply damage: temporary HP absorbs first, then current HP floors at 0. */
export function applyDamage(c: Combatant, amount: number, opts: DamageOptions = {}): Combatant {
  const dmg = clampNonNegativeInt(amount)
  // Damage to an already-unconscious PC causes death-save failures (two on a crit).
  // A *stable* PC taking damage is no longer stable: clear its three accumulated
  // successes first, so the hit drops it back into dying with the failure(s) it took.
  if (c.isPC && c.status === 'unconscious' && dmg > 0) {
    const base = isStable(c) ? resetDeathSaves(c) : c
    return markDeathSaveFailure(base, opts.crit ? 2 : 1)
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
 * Set current HP to an exact value (the GM typed a number). Unlike applyDamage,
 * this does not route through temporary HP — it sets `current` directly and
 * recomputes status the same way.
 */
export function setCurrentHp(c: Combatant, value: number): Combatant {
  const current = Math.max(0, Math.min(effectiveMaxHp(c), Math.floor(value)))
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

/** An HP/temp edit: a relative adjustment or an absolute value. */
export type HpInput = { delta: number } | { set: number }

/** Parse an HP/temp edit string: "+N"/"-N" → delta, bare digits → set, anything else → null. */
export function parseHpInput(raw: string): HpInput | null {
  const s = raw.trim()
  if (/^[+-]\d+$/.test(s)) return { delta: Number(s) }
  if (/^\d+$/.test(s)) return { set: Number(s) }
  return null
}

/** Heal up to the effective max HP. Healing above 0 revives a downed/dead creature (revivify). */
export function applyHealing(c: Combatant, amount: number): Combatant {
  const current = Math.min(effectiveMaxHp(c), c.hp.current + clampNonNegativeInt(amount))
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

/** The stat block's slot count for a level; 0 when the creature has none there. */
export function slotMax(c: MonsterCombatant, level: SpellLevel): number {
  return c.creature.spellcasting?.slots?.[level] ?? 0
}

/** Unspent slots at a level: the stat-block max minus what's been used. */
export function slotsRemaining(c: MonsterCombatant, level: SpellLevel): number {
  return slotMax(c, level) - (c.slotsUsed[level] ?? 0)
}

/** Spend one slot of the given level; a no-op if none remain. */
export function spendSlot(c: MonsterCombatant, level: SpellLevel): MonsterCombatant {
  if (slotsRemaining(c, level) <= 0) return c
  const used = (c.slotsUsed[level] ?? 0) + 1
  return { ...c, slotsUsed: { ...c.slotsUsed, [level]: used } }
}

/** Give back one spent slot; a no-op if none are spent. */
export function restoreSlot(c: MonsterCombatant, level: SpellLevel): MonsterCombatant {
  const used = c.slotsUsed[level] ?? 0
  if (used <= 0) return c
  return { ...c, slotsUsed: { ...c.slotsUsed, [level]: used - 1 } }
}

/** Spend legendary actions this round; clamps at 0. (Reset happens in nextTurn.) */
export function spendLegendary(c: MonsterCombatant, cost = 1): MonsterCombatant {
  const remaining = Math.max(0, c.legendaryRemaining - clampNonNegativeInt(cost))
  return { ...c, legendaryRemaining: remaining }
}

/** Whether a limited-use ability is ready; an untracked id reads as unavailable. */
export function isLimitedAvailable(c: MonsterCombatant, id: string): boolean {
  return c.limitedUseState[id]?.available ?? false
}

/** Mark a limited-use ability spent, until rechargeLimited flips it back. */
export function spendLimited(c: MonsterCombatant, id: string): MonsterCombatant {
  return {
    ...c,
    limitedUseState: { ...c.limitedUseState, [id]: { available: false } },
  }
}

/** Per-day uses left for an action with an "N/Day" recharge; null for any other action. */
export function actionUsesRemaining(c: MonsterCombatant, action: Action): number | null {
  if (action.recharge?.type !== 'perDay') return null
  return Math.max(0, action.recharge.value - (c.actionUsesSpent?.[action.id] ?? 0))
}

/** Spend one per-day use of an action (tracked like a spell's "N/Day Each" uses). */
export function spendActionUse(c: MonsterCombatant, id: string): MonsterCombatant {
  const spent = c.actionUsesSpent ?? {}
  return { ...c, actionUsesSpent: { ...spent, [id]: (spent[id] ?? 0) + 1 } }
}

/** Make a limited-use ability available again, e.g. on a successful recharge roll. */
export function rechargeLimited(c: MonsterCombatant, id: string): MonsterCombatant {
  return {
    ...c,
    limitedUseState: { ...c.limitedUseState, [id]: { available: true } },
  }
}

/** Per-day maximum — the higher in-lair count when the fight is in its lair. */
export function legendaryResistanceMax(c: MonsterCombatant): number {
  const base = c.creature.legendaryResistance ?? 0
  const lair = c.creature.legendaryResistanceLair
  return c.inLair && lair != null ? lair : base
}

/** Legendary Resistance uses left: the lair-aware max minus spent, never below 0. */
export function legendaryResistanceLeft(c: MonsterCombatant): number {
  return Math.max(0, legendaryResistanceMax(c) - (c.legendaryResistanceSpent ?? 0))
}

/** Spend one Legendary Resistance; a no-op if none remain. */
export function spendLegendaryResistance(c: MonsterCombatant): MonsterCombatant {
  if (legendaryResistanceLeft(c) <= 0) return c
  return { ...c, legendaryResistanceSpent: (c.legendaryResistanceSpent ?? 0) + 1 }
}

/** Legendary actions per round — the higher in-lair budget while in the lair. */
export function legendaryPerRound(c: MonsterCombatant): number {
  const la = c.creature.legendaryActions
  if (!la) return 0
  return c.inLair && la.perRoundLair != null ? la.perRoundLair : la.perRound
}

/** Toggle whether the fight is in this creature's lair (raises its max LR and, for
 *  a creature with a lair legendary budget, refreshes legendary actions to it). */
export function setInLair(c: MonsterCombatant, inLair: boolean): MonsterCombatant {
  const next = { ...c, inLair }
  return c.creature.legendaryActions?.perRoundLair != null
    ? { ...next, legendaryRemaining: legendaryPerRound(next) }
    : next
}

/** The state key for a spell: its compendium ref, falling back to its name. */
export function spellKey(spell: SpellRef): string {
  return spell.ref ?? spell.name
}

/** The usage tier a spell belongs to, or undefined if it isn't in the block. */
export function spellUsage(c: MonsterCombatant, spell: SpellRef): SpellUsage | undefined {
  const key = spellKey(spell)
  for (const group of c.creature.spellcasting?.groups ?? []) {
    if (group.spells.some((s) => spellKey(s) === key)) return group.usage
  }
  return undefined
}

/**
 * The counter a per-day cast draws on. Normally the spell's own, because the usual tier is
 * "N/Day Each". A `shared` tier is one pool between its spells — the Fidele Angel's
 * "1/Day: bless, daylight, hallow, …" is a single casting from that list — so every spell
 * in it spends the same counter, keyed by the group's position in the snapshot.
 */
function spellUsesKey(c: MonsterCombatant, spell: SpellRef): string {
  const key = spellKey(spell)
  const groups = c.creature.spellcasting?.groups ?? []
  const index = groups.findIndex((g) => g.spells.some((s) => spellKey(s) === key))
  const usage = groups[index]?.usage
  return usage?.type === 'perDay' && usage.shared ? `group:${index}` : key
}

/**
 * Uses left for a spell: `null` when unlimited (at-will, or a spell not gated by
 * a per-day limit), otherwise the per-day count minus what's been spent.
 */
export function spellUsesRemaining(c: MonsterCombatant, spell: SpellRef): number | null {
  const usage = spellUsage(c, spell)
  if (!usage || usage.type === 'atWill') return null
  // Slot spells share a per-level pool; surface that level's remaining slots.
  if (usage.type === 'slots') return slotsRemaining(c, String(usage.level) as SpellLevel)
  return Math.max(0, usage.per - (c.spellUsesSpent[spellUsesKey(c, spell)] ?? 0))
}

/** Spend a cast: a per-day spell's own use, or one slot of its level. No-op for
 *  at-will spells or when the resource is drained. */
export function castSpell(c: MonsterCombatant, spell: SpellRef): MonsterCombatant {
  const usage = spellUsage(c, spell)
  if (!usage || usage.type === 'atWill') return c
  if (usage.type === 'slots') return spendSlot(c, String(usage.level) as SpellLevel)
  if ((spellUsesRemaining(c, spell) ?? 0) <= 0) return c
  const key = spellUsesKey(c, spell)
  return {
    ...c,
    spellUsesSpent: { ...c.spellUsesSpent, [key]: (c.spellUsesSpent[key] ?? 0) + 1 },
  }
}

/** Give back one spent cast — a per-day use or a level's slot; a no-op if none spent. */
export function restoreSpellUse(c: MonsterCombatant, spell: SpellRef): MonsterCombatant {
  const usage = spellUsage(c, spell)
  if (usage?.type === 'slots') return restoreSlot(c, String(usage.level) as SpellLevel)
  const key = spellUsesKey(c, spell)
  const spent = c.spellUsesSpent[key] ?? 0
  if (spent <= 0) return c
  return { ...c, spellUsesSpent: { ...c.spellUsesSpent, [key]: spent - 1 } }
}
