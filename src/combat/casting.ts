// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import type { DamageRoll } from '../schema/action.ts'
import type { Spell } from '../schema/spell.ts'

/**
 * Turning a compendium spell into something rollable. A spell supplies the dice,
 * the damage type, and the save ability; the *caster* supplies the DC (a monster's
 * Spellcasting.saveDc, or DM-entered for a PC) and the cast level. So these helpers
 * resolve only the spell-owned half — the damage for a chosen level — and leave the
 * DC to the cast-time UI. See docs/compendium-ingest.md #14.
 */

export interface DamageVariant {
  /** Stable key for selection. */
  key: string
  /** Human label, e.g. "Level 3", "Slot 4", "Caster level 5". */
  label: string
  damage: DamageRoll[]
}

const levelLabel = (level: number): string => (level === 0 ? 'Cantrip' : `Level ${level}`)

/**
 * The damage options for a spell: its base damage, then each higher-level variant
 * (upcasting a slot, or a cantrip scaling with caster level). Empty when the spell
 * deals no typed damage.
 */
export function damageVariants(spell: Spell): DamageVariant[] {
  const damage = spell.mechanics?.damage
  if (!damage) return []
  const variants: DamageVariant[] = [
    { key: 'base', label: levelLabel(spell.level), damage },
  ]
  for (const s of spell.mechanics?.scaling ?? []) {
    const label = s.by === 'slot' ? `Slot ${s.level}` : `Caster level ${s.level}`
    variants.push({ key: `${s.by}-${s.level}`, label, damage: s.damage })
  }
  return variants
}

/** Combine damage components into one rollable formula, e.g. `"2d6+1d8"`. */
export function damageFormula(damage: DamageRoll[]): string {
  return damage.map((d) => d.formula).join('+')
}

/** The distinct damage types in a set of components, for display (e.g. "fire"). */
export function damageTypes(damage: DamageRoll[]): string[] {
  return [...new Set(damage.map((d) => d.type))]
}
