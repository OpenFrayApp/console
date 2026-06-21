// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import type { Action, DamageRoll } from '../schema/action.ts'
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

const ROUNDS_PER = { round: 1, minute: 10 } as const

/**
 * A spell's duration in combat rounds — for the concentration timer. Only
 * round/minute durations convert (1 minute = 10 rounds); hours and longer outlast
 * any fight, so they return undefined (tracked as indefinite).
 */
export function durationRounds(duration: string): number | undefined {
  const m = /(\d+)\s*(round|minute)s?/i.exec(duration)
  if (!m) return undefined
  return Number(m[1]) * ROUNDS_PER[m[2].toLowerCase() as 'round' | 'minute']
}

/**
 * Turn a spell into a resolvable Action so casting reuses the same attack / group
 * save modals as a monster's other actions. The caster supplies the DC and spell
 * attack bonus (a monster's `Spellcasting`); damage is the spell's **base** level —
 * 2024 monster spells are fixed to their listed level, so we never upcast here.
 * Returns null when there's nothing to resolve (a utility spell): the caller just
 * spends the use. Only attack-with-damage and save spells are auto-resolved; the
 * "damage only" Open5e shape is too noisy to trust, so it falls through to null.
 */
export function spellAction(
  spell: Spell,
  caster: { saveDc?: number; toHit?: number },
): Action | null {
  const m = spell.mechanics
  if (!m) return null
  const id = `spell:${spell.id}`
  const damage = m.damage // base level only
  if (m.attackRoll && damage) {
    return {
      id,
      name: spell.name,
      kind: 'ranged',
      toHit: caster.toHit ?? 0,
      damage,
      text: spell.text,
    }
  }
  if (m.save) {
    return {
      id,
      name: spell.name,
      kind: 'save',
      toHit: null,
      save: { ability: m.save.ability, dc: caster.saveDc ?? 10, onSave: m.save.onSave ?? 'half' },
      ...(damage && { damage }),
      text: spell.text,
    }
  }
  return null
}
