// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import type { Spell, SpellMechanics } from '../schema/spell.ts'
import type { SpellEffectDef } from './spells/shared.ts'
import { TOME_OF_HEROES_CASTING } from './spells/tomeOfHeroes.ts'

export interface ReviewedSpellCasting {
  source: Spell['source']
  edition: Spell['edition']
  name: string
  mechanics?: SpellMechanics
  effect?: SpellEffectDef
  /** Rules the existing resolvers cannot execute, shown alongside the cast. */
  manual: string
}

export const REVIEWED_SPELL_CASTING: Record<string, ReviewedSpellCasting> = TOME_OF_HEROES_CASTING

/** Find an explicitly reviewed source entry, never a same-name or custom-copy fallback. */
export function reviewedSpellCasting(spell: Spell): ReviewedSpellCasting | undefined {
  const reviewed = REVIEWED_SPELL_CASTING[spell.id]
  return reviewed?.source === spell.source &&
    reviewed.edition === spell.edition &&
    reviewed.name === spell.name
    ? reviewed
    : undefined
}
