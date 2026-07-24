// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import type { Spell } from '../schema/spell.ts'
import { SPELL_EFFECTS } from './spells/index.ts'
import type { SpellEffectDef } from './spells/shared.ts'

/**
 * The map of spells to the board effect they leave behind, so casting one can *offer*
 * to apply it instead of only showing the card. We model the consequence (one of the
 * ~6 Effect shapes), never the spell's rules. Keyed by normalized name so one entry
 * spans both editions; entries that genuinely differ branch on `spell.edition`.
 *
 * Every compendium spell is either in this map or in the skip list the coverage test
 * reads (`tests/combat/spellCoverage.data.ts`) — a new library fails that test until
 * its spells are triaged.
 */

export type {
  EffectTargeting,
  SpellEffectContext,
  SpellEffectDef,
  SpellEffectTable,
} from './spells/shared.ts'
export { timedDuration } from './spells/shared.ts'
export { SPELL_EFFECTS } from './spells/index.ts'

/** Normalize a spell name for lookup: lowercased, straight apostrophes, trimmed. */
export const normalize = (name: string): string => name.toLowerCase().replace(/['’]/g, "'").trim()

/**
 * A pure buff that should open its card, not the save resolver. The 5.2 ingest gave
 * several of these a phantom `mechanics.save` by reading a saving throw mentioned in
 * their own text (Haste's advantage on Dex saves, Beacon of Hope's, Gaseous Form's,
 * Sanctuary's, Holy Aura's) — all of them carry no mechanics in the 5.1 data, so it is
 * a parser bug, reported upstream to the openfray-compendium repo. Guarding on the
 * modelled effect keeps correctly-tagged spells untouched.
 */
export function isSupportSpell(spell: Spell): boolean {
  const def = SPELL_EFFECTS[normalize(spell.name)]
  if (!def || def.targeting === 'enemy') return false
  return !spell.mechanics?.damage?.length && !spell.mechanics?.attackRoll
}

/**
 * The board effect a spell applies, or null if we don't model one. Two things are
 * stamped on here rather than in every entry: the concentration flag (so ending the
 * caster's concentration clears the effect from every target) and the spell's own
 * duration wording (so an effect the round clock can't tick — "8 hours" — can still
 * say how long it lasts).
 */
export function spellEffectFor(spell: Spell): SpellEffectDef | null {
  const def = SPELL_EFFECTS[normalize(spell.name)]
  if (!def) return null
  return {
    ...def,
    build: (ctx) =>
      def.build(ctx).map((effect) => ({
        ...effect,
        ...(spell.concentration && { concentration: true as const }),
        ...(effect.duration.type === 'manual' && { durationNote: spell.duration }),
      })),
  }
}
