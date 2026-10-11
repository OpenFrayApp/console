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

import { SPELLS_THAT_DONT_SUCK_1 } from './spells/spellsThatDontSuck1.ts'
import { SPELLS_THAT_DONT_SUCK_2 } from './spells/spellsThatDontSuck2.ts'
import { SPELLS_THAT_DONT_SUCK_3 } from './spells/spellsThatDontSuck3.ts'
import { SPELLS_THAT_DONT_SUCK_4 } from './spells/spellsThatDontSuck4.ts'
import { SPELLS_THAT_DONT_SUCK_5 } from './spells/spellsThatDontSuck5.ts'
import { SPELLS_THAT_DONT_SUCK_6 } from './spells/spellsThatDontSuck6.ts'
import { SPELLS_THAT_DONT_SUCK_7 } from './spells/spellsThatDontSuck7.ts'

import { KIBBLES_CASTING_1 } from './spells/kibblesCasting1.ts'
import { KIBBLES_CASTING_2 } from './spells/kibblesCasting2.ts'
import { KIBBLES_CASTING_3 } from './spells/kibblesCasting3.ts'
import { KIBBLES_CASTING_4 } from './spells/kibblesCasting4.ts'
import { KIBBLES_CASTING_5 } from './spells/kibblesCasting5.ts'
import { KIBBLES_CASTING_6 } from './spells/kibblesCasting6.ts'
import { KIBBLES_CASTING_7 } from './spells/kibblesCasting7.ts'
import { KIBBLES_CASTING_8 } from './spells/kibblesCasting8.ts'
import { KIBBLES_CASTING_9 } from './spells/kibblesCasting9.ts'
import { KIBBLES_CASTING_10 } from './spells/kibblesCasting10.ts'

import { DEEP_MAGIC_2020_FIRST } from './spells/deepMagic2020First.ts'
import { DEEP_MAGIC_2020_REMAINING_1 } from './spells/deepMagic2020Remaining1.ts'
import { DEEP_MAGIC_2020_REMAINING_2 } from './spells/deepMagic2020Remaining2.ts'
import { DEEP_MAGIC_2020_REMAINING_3 } from './spells/deepMagic2020Remaining3.ts'
import { DEEP_MAGIC_2020_REMAINING_4 } from './spells/deepMagic2020Remaining4.ts'
import { DEEP_MAGIC_2020_REMAINING_5 } from './spells/deepMagic2020Remaining5.ts'
import { DEEP_MAGIC_2020_REMAINING_6 } from './spells/deepMagic2020Remaining6.ts'
import { DEEP_MAGIC_2020_REMAINING_7 } from './spells/deepMagic2020Remaining7.ts'
import { DEEP_MAGIC_2020_REMAINING_8 } from './spells/deepMagic2020Remaining8.ts'
import { DEEP_MAGIC_2020_REMAINING_9 } from './spells/deepMagic2020Remaining9.ts'
import { DEEP_MAGIC_2020_REMAINING_10 } from './spells/deepMagic2020Remaining10.ts'
import { DEEP_MAGIC_2020_REMAINING_11 } from './spells/deepMagic2020Remaining11.ts'
import { DEEP_MAGIC_2020_REMAINING_12 } from './spells/deepMagic2020Remaining12.ts'
import { DEEP_MAGIC_2020_REMAINING_13 } from './spells/deepMagic2020Remaining13.ts'
import { DEEP_MAGIC_2020_REMAINING_14 } from './spells/deepMagic2020Remaining14.ts'
import { DEEP_MAGIC_2020_REMAINING_15 } from './spells/deepMagic2020Remaining15.ts'
import { DEEP_MAGIC_2020_REMAINING_16 } from './spells/deepMagic2020Remaining16.ts'
import { DEEP_MAGIC_2020_REMAINING_17 } from './spells/deepMagic2020Remaining17.ts'

export interface ReviewedSpellCasting {
  source: Spell['source']
  edition: Spell['edition']
  name: string
  /** The area or creation remains even if its initial attack misses or every initial save succeeds. */
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
  ...SPELLS_THAT_DONT_SUCK_1,
  ...SPELLS_THAT_DONT_SUCK_2,
  ...SPELLS_THAT_DONT_SUCK_3,
  ...SPELLS_THAT_DONT_SUCK_4,
  ...SPELLS_THAT_DONT_SUCK_5,
  ...SPELLS_THAT_DONT_SUCK_6,
  ...SPELLS_THAT_DONT_SUCK_7,
  ...KIBBLES_CASTING_1,
  ...KIBBLES_CASTING_2,
  ...KIBBLES_CASTING_3,
  ...KIBBLES_CASTING_4,
  ...KIBBLES_CASTING_5,
  ...KIBBLES_CASTING_6,
  ...KIBBLES_CASTING_7,
  ...KIBBLES_CASTING_8,
  ...KIBBLES_CASTING_9,
  ...KIBBLES_CASTING_10,
  ...DEEP_MAGIC_2020_FIRST,
  ...DEEP_MAGIC_2020_REMAINING_1,
  ...DEEP_MAGIC_2020_REMAINING_2,
  ...DEEP_MAGIC_2020_REMAINING_3,
  ...DEEP_MAGIC_2020_REMAINING_4,
  ...DEEP_MAGIC_2020_REMAINING_5,
  ...DEEP_MAGIC_2020_REMAINING_6,
  ...DEEP_MAGIC_2020_REMAINING_7,
  ...DEEP_MAGIC_2020_REMAINING_8,
  ...DEEP_MAGIC_2020_REMAINING_9,
  ...DEEP_MAGIC_2020_REMAINING_10,
  ...DEEP_MAGIC_2020_REMAINING_11,
  ...DEEP_MAGIC_2020_REMAINING_12,
  ...DEEP_MAGIC_2020_REMAINING_13,
  ...DEEP_MAGIC_2020_REMAINING_14,
  ...DEEP_MAGIC_2020_REMAINING_15,
  ...DEEP_MAGIC_2020_REMAINING_16,
  ...DEEP_MAGIC_2020_REMAINING_17,
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
