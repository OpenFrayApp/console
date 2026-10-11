// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import type { ReviewedSpellCasting } from '../reviewedSpells.ts'
import { deepMagicProfile } from './deepMagic2020Profile.ts'
import { boardEffect, reviewedDamage } from './reviewedProfile.ts'

export const DEEP_MAGIC_2020_REMAINING_9: Record<string, ReviewedSpellCasting> = {
  'kobold-press-deepm:hide-in-ones-shadow': deepMagicProfile('Hide in One’s Shadow', {
    effect: boardEffect(
      'Hide in One’s Shadow',
      [{ note: 'Shadow form; immune except psychic/radiant' }],
      { summary: 'Shadow form; immune except psychic/radiant', targeting: 'ally', multi: true },
    ),
  }),
  'kobold-press-deepm:hoarfrost': deepMagicProfile('Hoarfrost', {
    effect: boardEffect(
      'Hoarfrost',
      [{ note: 'Next weapon hit: +1d4 cold', duration: { type: 'rounds', rounds: 10 } }],
      { summary: 'Next weapon hit: +1d4 cold', targeting: 'self', multi: false },
    ),
  }),
  'kobold-press-deepm:hobble': deepMagicProfile('Hobble', {
    mechanics: { save: { ability: 'dex', onSave: 'negates' } },
  }),
  'kobold-press-deepm:hobble-mount': deepMagicProfile('Hobble Mount', {
    mechanics: { attackRoll: true },
    attackKind: 'melee',
  }),
  'kobold-press-deepm:holy-ground': deepMagicProfile('Holy Ground', {}),
  'kobold-press-deepm:hone-blade': deepMagicProfile('Hone Blade', {}),
  'kobold-press-deepm:hunger-of-leng': deepMagicProfile('Hunger of Leng', {
    mechanics: { save: { ability: 'wis', onSave: 'negates' } },
    effect: boardEffect('Hunger of Leng', [{ note: 'Compelled bite; wounded-target advantage' }], {
      summary: 'Compelled bite; wounded-target advantage',
      targeting: 'enemy',
      multi: true,
    }),
  }),
  'kobold-press-deepm:hunters-endurance': deepMagicProfile("Hunter's Endurance", {
    effect: boardEffect(
      "Hunter's Endurance",
      [{ note: 'Quarry tracking advantage; pursuit exhaustion suspended' }],
      {
        summary: 'Quarry tracking advantage; pursuit exhaustion suspended',
        targeting: 'self',
        multi: false,
      },
    ),
  }),
  'kobold-press-deepm:hunting-stand': deepMagicProfile('Hunting Stand', {}),
  'kobold-press-deepm:ice-fortress': deepMagicProfile('Ice Fortress', {}),
  'kobold-press-deepm:ice-hammer': deepMagicProfile('Ice Hammer', {
    effect: boardEffect('Ice Hammer', [{ note: 'Warhammer hits: +1d10 cold' }], {
      summary: 'Warhammer hits: +1d10 cold',
      targeting: 'self',
      multi: false,
    }),
  }),
  'kobold-press-deepm:ice-soldiers': deepMagicProfile('Ice Soldiers', {}),
  'kobold-press-deepm:icicle-daggers': deepMagicProfile('Icicle Daggers', {}),
  'kobold-press-deepm:icy-grasp-of-the-void': deepMagicProfile('Icy Grasp of the Void', {
    mechanics: {
      save: { ability: 'con', onSave: 'half' },
      ...reviewedDamage([{ formula: '10d10', type: 'cold' }], 7, [0]),
    },
    effect: boardEffect(
      'Icy Grasp of the Void',
      [{ condition: 'Restrained', duration: 'escape' }],
      { summary: 'Restrained', targeting: 'enemy', multi: true },
    ),
  }),
  'kobold-press-deepm:icy-manipulation': deepMagicProfile('Icy Manipulation', {
    mechanics: { save: { ability: 'con', onSave: 'negates' } },
  }),
  'kobold-press-deepm:ill-fated-word': deepMagicProfile('Ill-Fated Word', {}),
  'kobold-press-deepm:illuminate-spoor': deepMagicProfile('Illuminate Spoor', {}),
  'kobold-press-deepm:impending-ally': deepMagicProfile('Impending Ally', {}),
  'kobold-press-deepm:innocuous-aspect': deepMagicProfile('Innocuous Aspect', {
    effect: boardEffect(
      'Innocuous Aspect',
      [{ note: 'Harmless disguise', duration: { type: 'rounds', rounds: 100 } }],
      { summary: 'Harmless disguise', targeting: 'self', multi: false },
    ),
  }),
  'kobold-press-deepm:insightful-maneuver': deepMagicProfile('Insightful Maneuver', {}),
  'kobold-press-deepm:inspiring-speech': deepMagicProfile('Inspiring Speech', {
    effect: boardEffect(
      'Inspiring Speech',
      [
        { note: 'Charm/fear save advantage while near living caster' },
        {
          modifier: { applies: 'attackRolls', mode: 'flatBonus', value: 1, direction: 'outgoing' },
        },
      ],
      {
        summary: 'Charm/fear save advantage while near living caster; Attacks: +1',
        targeting: 'ally',
        multi: true,
      },
    ),
  }),
  'kobold-press-deepm:instant-fortification': deepMagicProfile('Instant Fortification', {}),
  'kobold-press-deepm:instant-siege-weapon': deepMagicProfile('Instant Siege Weapon', {}),
  'kobold-press-deepm:instant-snare': deepMagicProfile('Instant Snare', {}),
  'kobold-press-deepm:ire-of-the-mountain': deepMagicProfile('Ire of the Mountain', {}),
  'kobold-press-deepm:iron-hand': deepMagicProfile('Iron Hand', {
    effect: boardEffect(
      'Iron Hand',
      [{ note: 'One arm fire immune; Dodge grants fire resistance' }],
      {
        summary: 'One arm fire immune; Dodge grants fire resistance',
        targeting: 'self',
        multi: false,
      },
    ),
  }),
  'kobold-press-deepm:kareefs-entreaty': deepMagicProfile('Kareef’s Entreaty', {}),
  'kobold-press-deepm:keening-wail': deepMagicProfile('Keening Wail', {}),
  'kobold-press-deepm:killing-fields': deepMagicProfile('Killing Fields', {}),
  'kobold-press-deepm:kiss-of-the-succubus': deepMagicProfile('Kiss of the Succubus', {
    mechanics: {
      save: { ability: 'con', onSave: 'half' },
      ...reviewedDamage([{ formula: '5d10', type: 'psychic' }], 5, [1]),
    },
  }),
}
