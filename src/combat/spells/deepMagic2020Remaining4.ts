// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import type { ReviewedSpellCasting } from '../reviewedSpells.ts'
import { deepMagicProfile } from './deepMagic2020Profile.ts'
import { boardEffect, reviewedDamage } from './reviewedProfile.ts'

export const DEEP_MAGIC_2020_REMAINING_4: Record<string, ReviewedSpellCasting> = {
  'kobold-press-deepm:compelling-fate': deepMagicProfile('Compelling Fate', {
    mechanics: { save: { ability: 'cha', onSave: 'negates' } },
    effect: boardEffect('Compelling Fate', [{ note: 'Caster predicts target’s actions' }], {
      summary: 'Caster predicts target’s actions',
      targeting: 'enemy',
      multi: true,
    }),
  }),
  'kobold-press-deepm:comprehend-wild-shape': deepMagicProfile('Comprehend Wild Shape', {
    effect: boardEffect(
      'Comprehend Wild Shape',
      [{ note: 'Totem holders understand beast-form speech' }],
      { summary: 'Totem holders understand beast-form speech', targeting: 'ally', multi: true },
    ),
  }),
  'kobold-press-deepm:confound-senses': deepMagicProfile('Confound Senses', {
    mechanics: { save: { ability: 'int', onSave: 'negates' } },
    effect: boardEffect(
      'Confound Senses',
      [
        { note: 'Lost; ranged attacks disadvantage' },
        { modifier: { applies: 'speed', mode: 'flatBonus', value: 'half', direction: 'outgoing' } },
      ],
      {
        summary: 'Lost; ranged attacks disadvantage; Speed: half',
        targeting: 'enemy',
        multi: true,
      },
    ),
  }),
  'kobold-press-deepm:conjure-fey-hound': deepMagicProfile('Conjure Fey Hound', {}),
  'kobold-press-deepm:conjure-forest-defender': deepMagicProfile('Conjure Forest Defender', {}),
  'kobold-press-deepm:conjure-greater-spectral-dead': deepMagicProfile(
    'Conjure Greater Spectral Dead',
    {},
  ),
  'kobold-press-deepm:conjure-minor-voidborn': deepMagicProfile('Conjure Minor Voidborn', {}),
  'kobold-press-deepm:conjure-scarab-swarm': deepMagicProfile('Conjure Scarab Swarm', {}),
  'kobold-press-deepm:conjure-shadow-titan': deepMagicProfile('Conjure Shadow Titan', {}),
  'kobold-press-deepm:conjure-spectral-dead': deepMagicProfile('Conjure Spectral Dead', {}),
  'kobold-press-deepm:conjure-undead': deepMagicProfile('Conjure Undead', {}),
  'kobold-press-deepm:conjure-voidborn': deepMagicProfile('Conjure Voidborn', {}),
  'kobold-press-deepm:consult-the-storm': deepMagicProfile('Consult the Storm', {
    mechanics: {
      save: { ability: 'con', onSave: 'half' },
      ...reviewedDamage([{ formula: '7d6', type: 'thunder' }], 4, [1]),
    },
  }),
  'kobold-press-deepm:converse-with-dragon': deepMagicProfile('Converse With Dragon', {}),
  'kobold-press-deepm:costly-victory': deepMagicProfile('Costly Victory', {
    mechanics: { save: { ability: 'wis', onSave: 'negates' } },
  }),
  'kobold-press-deepm:create-ring-servant': deepMagicProfile('Create Ring Servant', {}),
  'kobold-press-deepm:create-thunderstaff': deepMagicProfile('Create Thunderstaff', {}),
  'kobold-press-deepm:creeping-ice': deepMagicProfile('Creeping Ice', {
    mechanics: { save: { ability: 'str', onSave: 'negates' } },
    persistsAfterSave: true,
  }),
  'kobold-press-deepm:crushing-curse': deepMagicProfile('Crushing Curse', {
    mechanics: {
      save: { ability: 'wis', onSave: 'negates' },
      ...reviewedDamage([{ formula: '1d6', type: 'psychic' }], 0, [1]),
    },
    effect: boardEffect(
      'Crushing Curse',
      [
        {
          condition: 'Deafened',
          duration: 'escape',
          fallbackDuration: { type: 'rounds', rounds: 10 },
        },
        {
          note: 'Can still hear Void Speech',
          duration: 'escape',
          fallbackDuration: { type: 'rounds', rounds: 10 },
        },
      ],
      { summary: 'Deafened; Can still hear Void Speech', targeting: 'enemy', multi: true },
    ),
  }),
  'kobold-press-deepm:crushing-trample': deepMagicProfile('Crushing Trample', {
    mechanics: {
      save: { ability: 'str', onSave: 'negates' },
      ...reviewedDamage([{ formula: '4d6', type: 'bludgeoning' }], 2, [0]),
    },
  }),
  'kobold-press-deepm:cure-beast': deepMagicProfile('Cure Beast', {}),
  'kobold-press-deepm:curse-of-boreas': deepMagicProfile('Curse of Boreas', {
    mechanics: { save: { ability: 'cha', onSave: 'negates' } },
  }),
  'kobold-press-deepm:curse-of-dust': deepMagicProfile('Curse of Dust', {
    effect: boardEffect('Curse of Dust', [{ note: 'Cannot gain nourishment' }], {
      summary: 'Cannot gain nourishment',
      targeting: 'enemy',
      multi: true,
    }),
  }),
  'kobold-press-deepm:curse-of-incompetence': deepMagicProfile('Curse of Incompetence', {
    mechanics: { save: { ability: 'int', onSave: 'negates' } },
    effect: boardEffect('Curse of Incompetence', [{ note: 'd4 behavior each turn' }], {
      summary: 'd4 behavior each turn',
      targeting: 'enemy',
      multi: true,
    }),
  }),
  'kobold-press-deepm:curse-of-the-grave': deepMagicProfile('Curse of the Grave', {
    mechanics: { save: { ability: 'con', onSave: 'negates' } },
    effect: boardEffect(
      'Curse of the Grave',
      [{ note: 'Cursed death saves; death creates vampire spawn' }],
      {
        summary: 'Cursed death saves; death creates vampire spawn',
        targeting: 'enemy',
        multi: true,
      },
    ),
  }),
  'kobold-press-deepm:curse-of-yig': deepMagicProfile('Curse of Yig', {}),
  'kobold-press-deepm:curse-ring': deepMagicProfile('Curse Ring', {}),
  'kobold-press-deepm:cursed-gift': deepMagicProfile('Cursed Gift', {}),
  'kobold-press-deepm:cynophobia': deepMagicProfile('Cynophobia', {
    mechanics: { save: { ability: 'wis', onSave: 'negates' } },
    effect: boardEffect('Cynophobia', [{ note: 'Canids trigger fear and roll disadvantage' }], {
      summary: 'Canids trigger fear and roll disadvantage',
      targeting: 'enemy',
      multi: true,
    }),
  }),
  'kobold-press-deepm:daggerhawk': deepMagicProfile('Daggerhawk', {}),
}
