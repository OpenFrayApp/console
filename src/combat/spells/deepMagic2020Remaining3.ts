// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import type { ReviewedSpellCasting } from '../reviewedSpells.ts'
import { deepMagicProfile } from './deepMagic2020Profile.ts'
import { boardEffect, reviewedDamage } from './reviewedProfile.ts'

export const DEEP_MAGIC_2020_REMAINING_3: Record<string, ReviewedSpellCasting> = {
  'kobold-press-deepm:brittling': deepMagicProfile('Brittling', {}),
  'kobold-press-deepm:broken-charge': deepMagicProfile('Broken Charge', {
    mechanics: {
      save: { ability: 'wis', onSave: 'negates' },
      ...reviewedDamage([{ formula: '2d4', type: 'psychic' }], 1, [2]),
    },
  }),
  'kobold-press-deepm:by-the-light-of-the-moon': deepMagicProfile('By the Light of the Moon', {}),
  'kobold-press-deepm:by-the-light-of-the-watchful-moon': deepMagicProfile(
    'By the Light of the Watchful Moon',
    {},
  ),
  'kobold-press-deepm:call-shadow-mastiff': deepMagicProfile('Call Shadow Mastiff', {}),
  'kobold-press-deepm:calm-of-the-storm': deepMagicProfile('Calm of the Storm', {}),
  'kobold-press-deepm:candles-insight': deepMagicProfile('Candle’s Insight', {}),
  'kobold-press-deepm:carmello-voltas-irksome-preserves': deepMagicProfile(
    'Carmello-Volta’s Irksome Preserves',
    {},
  ),
  'kobold-press-deepm:catapult': deepMagicProfile('Catapult', {}),
  'kobold-press-deepm:catch-the-breath': deepMagicProfile('Catch the Breath', {
    effect: boardEffect(
      'Catch the Breath',
      [{ note: 'Stored breath: next-turn force attack', duration: { type: 'manual' } }],
      { summary: 'Stored breath: next-turn force attack', targeting: 'self', multi: false },
    ),
  }),
  'kobold-press-deepm:caustic-blood': deepMagicProfile('Caustic Blood', {
    mechanics: {
      save: { ability: 'dex', onSave: 'negates' },
      ...reviewedDamage([{ formula: '1d10', type: 'acid' }], 2, [0]),
    },
  }),
  'kobold-press-deepm:caustic-torrent': deepMagicProfile('Caustic Torrent', {
    mechanics: {
      save: { ability: 'dex', onSave: 'half' },
      ...reviewedDamage([{ formula: '14d6', type: 'acid' }], 8, [0]),
    },
  }),
  'kobold-press-deepm:caustic-touch': deepMagicProfile('Caustic Touch', {
    mechanics: { attackRoll: true, ...reviewedDamage([{ formula: '1d8', type: 'acid' }], 0, [1]) },
    attackKind: 'melee',
  }),
  'kobold-press-deepm:chains-of-the-goddess': deepMagicProfile('Chains of the Goddess', {
    mechanics: {
      save: { ability: 'wis', onSave: 'negates' },
      ...reviewedDamage([{ formula: '6d8', type: 'bludgeoning' }], 5, [0]),
    },
  }),
  'kobold-press-deepm:chains-of-torment': deepMagicProfile('Chains of Torment', {
    mechanics: { save: { ability: 'dex', onSave: 'negates' } },
  }),
  'kobold-press-deepm:champions-weapon': deepMagicProfile('Champion’s Weapon', {
    effect: boardEffect(
      'Champion’s Weapon',
      [
        {
          note: 'Chosen force weapon; caster proficient',
          duration: { type: 'rounds', rounds: 100 },
        },
      ],
      { summary: 'Chosen force weapon; caster proficient', targeting: 'self', multi: false },
    ),
  }),
  'kobold-press-deepm:chaotic-form': deepMagicProfile('Chaotic Form', {
    effect: boardEffect(
      'Chaotic Form',
      [
        {
          note: 'Half movement; squeezes; grapple-escape advantage',
          duration: { type: 'rounds', rounds: 100 },
        },
      ],
      {
        summary: 'Half movement; squeezes; grapple-escape advantage',
        targeting: 'ally',
        multi: true,
      },
    ),
  }),
  'kobold-press-deepm:chaotic-vitality': deepMagicProfile('Chaotic Vitality', {
    mechanics: { attackRoll: true },
    attackKind: 'melee',
  }),
  'kobold-press-deepm:chaotic-world': deepMagicProfile('Chaotic World', {
    mechanics: { save: { ability: 'int', onSave: 'negates' } },
  }),
  'kobold-press-deepm:chilling-words': deepMagicProfile('Chilling Words', {
    mechanics: { save: { ability: 'wis', onSave: 'negates' } },
  }),
  'kobold-press-deepm:chronal-lance': deepMagicProfile('Chronal Lance', {
    mechanics: { save: { ability: 'wis', onSave: 'negates' } },
    effect: boardEffect(
      'Chronal Lance',
      [
        {
          modifier: { applies: 'speed', mode: 'flatBonus', value: 'half', direction: 'outgoing' },
          duration: 'escape',
        },
        {
          modifier: {
            applies: 'abilityChecks',
            mode: 'disadvantage',
            value: null,
            direction: 'outgoing',
            abilities: ['dex'],
          },
          duration: 'escape',
        },
      ],
      { summary: 'Speed: half; Checks (dex): disadvantage', targeting: 'enemy', multi: true },
    ),
  }),
  'kobold-press-deepm:circle-of-wind': deepMagicProfile('Circle of Wind', {
    effect: boardEffect(
      'Circle of Wind',
      [{ note: 'Ranged attacks: +2 AC; inhaled hazard save advantage' }],
      {
        summary: 'Ranged attacks: +2 AC; inhaled hazard save advantage',
        targeting: 'self',
        multi: false,
      },
    ),
  }),
  'kobold-press-deepm:clash-of-glaciers': deepMagicProfile('Clash of Glaciers', {
    mechanics: {
      save: { ability: 'dex', onSave: 'half' },
      ...reviewedDamage(
        [
          { formula: '5d6', type: 'bludgeoning' },
          { formula: '5d6', type: 'cold' },
        ],
        5,
        [0, 0],
      ),
    },
  }),
  'kobold-press-deepm:claws-of-darkness': deepMagicProfile('Claws of Darkness', {
    effect: boardEffect(
      'Claws of Darkness',
      [{ note: 'Claws: reach 10 ft; 1d10 cold', duration: { type: 'rounds', rounds: 10 } }],
      { summary: 'Claws: reach 10 ft; 1d10 cold', targeting: 'self', multi: false },
    ),
  }),
  'kobold-press-deepm:claws-of-the-earth-dragon': deepMagicProfile('Claws of the Earth Dragon', {
    mechanics: {
      save: { ability: 'str', onSave: 'half' },
      ...reviewedDamage([{ formula: '6d8', type: 'bludgeoning' }], 5, [1]),
    },
  }),
  'kobold-press-deepm:cloak-of-shadow': deepMagicProfile('Cloak of Shadow', {
    effect: boardEffect(
      'Cloak of Shadow',
      [
        {
          note: 'Sight-dependent observers: Stealth advantage',
          duration: { type: 'rounds', rounds: 10 },
        },
      ],
      { summary: 'Sight-dependent observers: Stealth advantage', targeting: 'self', multi: false },
    ),
  }),
  'kobold-press-deepm:clockwork-bolt': deepMagicProfile('Clockwork Bolt', {}),
  'kobold-press-deepm:closing-in': deepMagicProfile('Closing In', {
    mechanics: { save: { ability: 'wis', onSave: 'negates' } },
    effect: boardEffect(
      'Closing In',
      [
        { note: 'Turn end: 2d6 psychic', duration: 'escape' },
        {
          modifier: {
            applies: 'attackRolls',
            mode: 'disadvantage',
            value: null,
            direction: 'outgoing',
          },
          duration: 'escape',
        },
        {
          modifier: {
            applies: 'abilityChecks',
            mode: 'disadvantage',
            value: null,
            direction: 'outgoing',
          },
          duration: 'escape',
        },
      ],
      {
        summary: 'Turn end: 2d6 psychic; Attacks: disadvantage; Checks: disadvantage',
        targeting: 'enemy',
        multi: true,
      },
    ),
  }),
  'kobold-press-deepm:cobra-fangs': deepMagicProfile('Cobra Fangs', {}),
  'kobold-press-deepm:compelled-movement': deepMagicProfile('Compelled Movement', {
    mechanics: { save: { ability: 'cha', onSave: 'negates' } },
    effect: boardEffect(
      'Compelled Movement',
      [{ note: 'Approaches paired target; bodies may fuse' }],
      { summary: 'Approaches paired target; bodies may fuse', targeting: 'enemy', multi: true },
    ),
  }),
}
