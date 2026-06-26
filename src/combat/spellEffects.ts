// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import type { Effect, EffectDuration } from '../schema/effect.ts'
import type { Spell } from '../schema/spell.ts'
import { condition, flatBonus, reminder } from './effects.ts'
import { durationRounds } from './casting.ts'

/**
 * A curated map of buff/utility spells to the board effect they leave behind, so
 * casting one can *offer* to apply it instead of only showing the card. We model the
 * consequence (one of the ~6 Effect shapes), never the spell's rules — and only where
 * the effect is unambiguous. Save-or-suck spells (Hold Person, Bane) route through the
 * save resolver instead; this map is for the no-save buffs that otherwise just spend a
 * use. Keyed by normalized name so it spans editions/sources.
 */

/** Who a spell's effect usually lands on — drives default target selection. */
export type EffectTargeting = 'self' | 'ally' | 'enemy'

export interface SpellEffectDef {
  /** Plain-English board effect, shown on the apply prompt. */
  summary: string
  targeting: EffectTargeting
  /** True when the spell normally affects more than one creature (e.g. Bless, up to 3). */
  multi?: boolean
  /** Build a fresh effect (with a unique id) for one target. Call once per target. */
  build: (ctx: { source?: string; spell: Spell }) => Effect[]
}

/** The spell's stated duration as an Effect duration; manual when it doesn't convert (hours+). */
export function timedDuration(spell: Spell): EffectDuration {
  const rounds = durationRounds(spell.duration)
  return rounds != null ? { type: 'rounds', rounds } : { type: 'manual' }
}

const CONSUME: EffectDuration = { type: 'consumeOnRoll' }

const SPELL_EFFECTS: Record<string, SpellEffectDef> = {
  bless: {
    summary: '+1d4 to attack rolls and saving throws',
    targeting: 'ally',
    multi: true,
    build: ({ source, spell }) => [
      flatBonus('Bless', '1d4', { source, duration: timedDuration(spell), note: '+1d4 to attacks & saves' }),
    ],
  },
  guidance: {
    summary: '+1d4 to one ability check',
    targeting: 'ally',
    build: ({ source }) => [
      flatBonus('Guidance', '1d4', { source, applies: 'abilityChecks', duration: CONSUME, note: '+1d4 to an ability check' }),
    ],
  },
  resistance: {
    summary: '+1d4 to one saving throw',
    targeting: 'ally',
    build: ({ source }) => [
      flatBonus('Resistance', '1d4', { source, applies: 'savingThrows', duration: CONSUME, note: '+1d4 to a saving throw' }),
    ],
  },
  'shield of faith': {
    summary: '+2 AC',
    targeting: 'ally',
    build: ({ source, spell }) => [
      flatBonus('Shield of Faith', 2, { source, applies: 'ac', duration: timedDuration(spell), note: '+2 AC' }),
    ],
  },
  invisibility: {
    summary: 'Invisible',
    targeting: 'ally',
    build: ({ source, spell }) => [condition('Invisible', { source, duration: timedDuration(spell) })],
  },
  heroism: {
    summary: 'Immune to Frightened; temp HP each turn',
    targeting: 'ally',
    build: ({ source, spell }) => [
      reminder('Heroism', 'Immune to Frightened; gains temp HP at the start of each turn', {
        source,
        duration: timedDuration(spell),
      }),
    ],
  },
  'mage armor': {
    summary: 'AC 13 + Dex while unarmored',
    targeting: 'ally',
    build: ({ source }) => [
      reminder('Mage Armor', 'AC 13 + Dex modifier while not wearing armor', { source, duration: { type: 'manual' } }),
    ],
  },
}

/** Normalize a spell name for lookup: lowercased, straight apostrophes, trimmed. */
const normalize = (name: string): string => name.toLowerCase().replace(/['’]/g, "'").trim()

/** The board effect a buff/utility spell applies, or null if we don't model one. */
export function spellEffectFor(spell: Spell): SpellEffectDef | null {
  return SPELL_EFFECTS[normalize(spell.name)] ?? null
}
