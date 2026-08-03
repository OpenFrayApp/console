// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { abilityMod, type AbilityScores } from './primitives.ts'
import type { ArmorName, PcClass } from './combatant.ts'

/**
 * Derivations for a player character's armor class and initiative modifier, from the
 * facts the GM transcribes: class, level, ability scores, and the armor worn. This is
 * the deliberate carve-out from the "never derive a build" line (issues #5 and #6):
 * the GM still types what the sheet says; these turn those facts into the two numbers
 * the board needs, and nothing here models what a class can *do*.
 *
 * Verified against the SRD before building: no class AC formula scales with level —
 * the unarmored defenses are ability-only. Level matters to initiative, where Jack of
 * All Trades adds half the proficiency bonus, and PB is a function of level.
 */

/** The twelve SRD classes. Multiclassing stays a sheet concern — one class, the main one. */
export const PC_CLASSES: readonly PcClass[] = [
  'Barbarian',
  'Bard',
  'Cleric',
  'Druid',
  'Fighter',
  'Monk',
  'Paladin',
  'Ranger',
  'Rogue',
  'Sorcerer',
  'Warlock',
  'Wizard',
]

interface ArmorEntry {
  label: string
  /** The AC the table prints before Dexterity. */
  base: number
  /** How much Dexterity modifier the armor lets through; null = all of it. */
  dexCap: number | null
}

/**
 * The SRD armor table. Absent armor is unarmored; a shield is a flat +2 on top.
 * Mage Armor sits here too — 13 + full DEX — for the tables that keep it on all
 * day rather than casting it each morning.
 */
export const ARMOR: Record<ArmorName, ArmorEntry> = {
  'mage-armor': { label: 'Mage Armor', base: 13, dexCap: null },
  padded: { label: 'Padded', base: 11, dexCap: null },
  leather: { label: 'Leather', base: 11, dexCap: null },
  'studded-leather': { label: 'Studded Leather', base: 12, dexCap: null },
  hide: { label: 'Hide', base: 12, dexCap: 2 },
  'chain-shirt': { label: 'Chain Shirt', base: 13, dexCap: 2 },
  'scale-mail': { label: 'Scale Mail', base: 14, dexCap: 2 },
  breastplate: { label: 'Breastplate', base: 14, dexCap: 2 },
  'half-plate': { label: 'Half Plate', base: 15, dexCap: 2 },
  'ring-mail': { label: 'Ring Mail', base: 14, dexCap: 0 },
  'chain-mail': { label: 'Chain Mail', base: 16, dexCap: 0 },
  splint: { label: 'Splint', base: 17, dexCap: 0 },
  plate: { label: 'Plate', base: 18, dexCap: 0 },
}

/** The armor names in the order the table prints them — the form's dropdown order. */
export const ARMOR_NAMES = Object.keys(ARMOR) as ArmorName[]

/** A PC's proficiency bonus by level — +2 at 1st, one more every four levels. */
export function pcProficiencyBonus(level: number): number {
  return Math.ceil(Math.max(1, Math.min(20, Math.floor(level))) / 4) + 1
}

/** The facts an AC derivation reads. All optional — return null over guessing. */
export interface PcDeriveInput {
  class?: PcClass
  level?: number
  abilities?: AbilityScores
  armor?: ArmorName
  /** A magic armor's enhancement (+1, +2, +3); counts only while armor is worn. */
  armorBonus?: number
  shield?: boolean
  /** A magic shield's enhancement, on top of the shield's own +2. */
  shieldBonus?: number
}

/**
 * The armor class the transcribed facts derive, or null when the ability scores are
 * missing. Armor wins over any unarmored formula; without armor, Barbarians add CON
 * and Monks add WIS — the Monk formula asks for no shield as well, so a shielded Monk
 * falls back to the plain 10 + DEX. Magic enhancements ride their item: an armor's
 * +N only while it is worn, a shield's +N only with the shield.
 */
export function deriveAc(pc: PcDeriveInput): number | null {
  if (!pc.abilities) return null
  const dex = abilityMod(pc.abilities.dex)
  const shield = pc.shield ? 2 + (pc.shieldBonus ?? 0) : 0
  if (pc.armor) {
    const entry = ARMOR[pc.armor]
    const dexPart = entry.dexCap === null ? dex : Math.min(dex, entry.dexCap)
    return entry.base + (pc.armorBonus ?? 0) + dexPart + shield
  }
  if (pc.class === 'Barbarian') return 10 + dex + abilityMod(pc.abilities.con) + shield
  if (pc.class === 'Monk' && !pc.shield) return 10 + dex + abilityMod(pc.abilities.wis)
  return 10 + dex + shield
}

/** "Wizard 5", "Monk", or null with no class — the stat block's class line. */
export function classLabel(pc: { class?: PcClass; level?: number }): string | null {
  if (!pc.class) return null
  return pc.level ? `${pc.class} ${pc.level}` : pc.class
}

/**
 * The initiative modifier the transcribed facts derive, or null without ability
 * scores: the Dexterity modifier, plus half the proficiency bonus for a Bard of
 * level 2 or higher (Jack of All Trades — initiative is an unproficient Dexterity
 * check). Anything a feat grants isn't derivable and belongs in the manual override.
 */
export function deriveInitiativeMod(pc: PcDeriveInput): number | null {
  if (!pc.abilities) return null
  const dex = abilityMod(pc.abilities.dex)
  if (pc.class === 'Bard' && (pc.level ?? 1) >= 2) {
    return dex + Math.floor(pcProficiencyBonus(pc.level ?? 1) / 2)
  }
  return dex
}
