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
