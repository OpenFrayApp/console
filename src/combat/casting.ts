// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import type { Action, DamageRoll } from '../schema/action.ts'
import type { Combatant, Concentration } from '../schema/combatant.ts'
import type { Spell } from '../schema/spell.ts'
import { spellEffectFor } from './spellEffects.ts'

/**
 * A spell supplies dice, damage type, and save ability; the *caster* supplies the
 * DC (a monster's Spellcasting.saveDc, or GM-entered for a PC) and cast level. These
 * helpers resolve only the spell-owned half and leave the DC to the cast-time UI.
 * See local/docs/compendium-ingest.md #14 (maintainer notes).
 */

export interface DamageVariant {
  key: string
  /** Human label, e.g. "Level 3", "Slot 4", "Caster level 5". */
  label: string
  damage: DamageRoll[]
}

/** The display label for a spell level: "Cantrip" for 0, otherwise "Level N". */
const levelLabel = (level: number): string => (level === 0 ? 'Cantrip' : `Level ${level}`)

/** Base damage plus each upcast/caster-level variant. Empty when the spell deals no typed damage. */
export function damageVariants(spell: Spell): DamageVariant[] {
  const damage = spell.mechanics?.damage
  if (!damage) return []
  const variants: DamageVariant[] = [{ key: 'base', label: levelLabel(spell.level), damage }]
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
 * A spell's duration in combat rounds, for the concentration timer. Only round/minute
 * durations convert (1 minute = 10 rounds); hours and longer return undefined (indefinite).
 */
export function durationRounds(duration: string): number | undefined {
  const m = /(\d+)\s*(round|minute)s?/i.exec(duration)
  if (!m) return undefined
  return Number(m[1]) * ROUNDS_PER[m[2].toLowerCase() as 'round' | 'minute']
}

/**
 * The concentration a caster takes on, once its spell has landed. The save DC is the
 * caster's own — a monster's from its stat block, and 0 for a player character, whose
 * DC lives on a sheet we deliberately don't read. Casting alone never starts this: a
 * spell every target shrugged off has nothing to sustain.
 */
export function spellConcentration(caster: Combatant, spell: Spell, round: number): Concentration {
  return {
    spell: spell.name,
    saveDc: caster.isPC ? 0 : (caster.creature.spellcasting?.saveDc ?? 0),
    round,
    rounds: durationRounds(spell.duration),
  }
}

/**
 * Turn a spell into a resolvable Action so casting reuses the same attack / group
 * save modals as a monster's other actions. Damage is the spell's base level — 2024
 * monster spells are fixed to their listed level, so we never upcast here. Returns
 * null for utility spells and the untrustworthy Open5e "damage only" shape; the
 * caller just spends the use.
 */
export function spellAction(
  spell: Spell,
  caster: { saveDc?: number; toHit?: number },
): Action | null {
  const m = spell.mechanics
  if (!m) return null
  const id = `spell:${spell.id}`
  const damage = m.damage
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

/**
 * Whether casting the spell is the whole of it: nothing to roll against the board, and
 * no effect to put on anyone. There is no landing to wait for, so a concentration spell
 * of this shape (Wall of Force, Silent Image) takes hold on the cast.
 */
export function landsOnCast(spell: Spell): boolean {
  return spellAction(spell, {}) === null && spellEffectFor(spell) === null
}
