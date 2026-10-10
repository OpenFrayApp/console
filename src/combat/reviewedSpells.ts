// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import type { Spell, SpellMechanics } from '../schema/spell.ts'
import type { SpellEffectDef } from './spells/shared.ts'
import { TOME_OF_HEROES_CASTING } from './spells/tomeOfHeroes.ts'
import { TOME_OF_HEROES_REMAINDER } from './spells/tomeOfHeroesRemaining.ts'
import { SO_MANY_SPELLS_CASTING } from './spells/soManySpells.ts'
import { SO_MANY_SPELLS_REMAINDER } from './spells/soManySpellsRemaining.ts'
import { SO_MANY_SPELLS_MIDDLE } from './spells/soManySpellsMiddle.ts'
import { SO_MANY_SPELLS_LATER } from './spells/soManySpellsLater.ts'
import { SO_MANY_SPELLS_FINAL } from './spells/soManySpellsFinal.ts'

export interface ReviewedSpellCasting {
  source: Spell['source']
  edition: Spell['edition']
  name: string
  /** The area or creation remains even if every creature succeeds on its initial save. */
  persistsAfterSave?: boolean
  attackKind?: 'melee' | 'ranged'
  mechanics?: SpellMechanics
  effect?: SpellEffectDef
  /** Rules the existing resolvers cannot execute, shown alongside the cast. */
  manual: string
}

export const REVIEWED_SPELL_CASTING: Record<string, ReviewedSpellCasting> = {
  ...TOME_OF_HEROES_CASTING,
  ...TOME_OF_HEROES_REMAINDER,
  ...SO_MANY_SPELLS_CASTING,
  ...SO_MANY_SPELLS_REMAINDER,
  ...SO_MANY_SPELLS_MIDDLE,
  ...SO_MANY_SPELLS_LATER,
  ...SO_MANY_SPELLS_FINAL,
}

/** Find an explicitly reviewed source entry, never a same-name or custom-copy fallback. */
export function reviewedSpellCasting(spell: Spell): ReviewedSpellCasting | undefined {
  const reviewed = REVIEWED_SPELL_CASTING[spell.id]
  return reviewed?.source === spell.source &&
    reviewed.edition === spell.edition &&
    reviewed.name === spell.name
    ? reviewed
    : undefined
}
