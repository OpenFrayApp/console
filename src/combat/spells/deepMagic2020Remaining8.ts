// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import type { ReviewedSpellCasting } from '../reviewedSpells.ts'
import { deepMagicProfile } from './deepMagic2020Profile.ts'
import { boardEffect, reviewedDamage } from './reviewedProfile.ts'

export const DEEP_MAGIC_2020_REMAINING_8: Record<string, ReviewedSpellCasting> = {
  'kobold-press-deepm:glacial-cascade': deepMagicProfile('Glacial Cascade', {
    mechanics: {
      save: { ability: 'con', onSave: 'half' },
      ...reviewedDamage([{ formula: '10d8', type: 'cold' }], 8, [0]),
    },
  }),
  'kobold-press-deepm:glacial-fog': deepMagicProfile('Glacial Fog', {}),
  'kobold-press-deepm:gliding-step': deepMagicProfile('Gliding Step', {
    effect: boardEffect(
      'Gliding Step',
      [{ note: 'Moves freely on snow and thin ice', duration: { type: 'rounds', rounds: 100 } }],
      { summary: 'Moves freely on snow and thin ice', targeting: 'self', multi: false },
    ),
  }),
  'kobold-press-deepm:glimpse-of-the-void': deepMagicProfile('Glimpse of the Void', {
    mechanics: { save: { ability: 'int', onSave: 'negates' } },
    effect: boardEffect(
      'Glimpse of the Void',
      [{ note: 'Only shrieking actions; erratic movement' }],
      { summary: 'Only shrieking actions; erratic movement', targeting: 'enemy', multi: true },
    ),
  }),
  'kobold-press-deepm:gloomwrought-barrier': deepMagicProfile('Gloomwrought Barrier', {}),
  'kobold-press-deepm:gluey-globule': deepMagicProfile('Gluey Globule', {}),
  'kobold-press-deepm:glyph-of-shifting': deepMagicProfile('Glyph of Shifting', {}),
  'kobold-press-deepm:goats-hoof-charm': deepMagicProfile("Goat's Hoof Charm", {
    effect: boardEffect(
      "Goat's Hoof Charm",
      [{ note: 'Falls/ledges: +2 Dex checks/saves', duration: { type: 'rounds', rounds: 10 } }],
      { summary: 'Falls/ledges: +2 Dex checks/saves', targeting: 'ally', multi: true },
    ),
  }),
  'kobold-press-deepm:going-in-circles': deepMagicProfile('Going in Circles', {}),
  'kobold-press-deepm:gordolays-pleasant-aroma': deepMagicProfile('Gordolay’s Pleasant Aroma', {
    effect: boardEffect(
      'Gordolay’s Pleasant Aroma',
      [
        {
          note: 'First attacker each round: Wis save or disadvantage',
          duration: { type: 'rounds', rounds: 10 },
        },
      ],
      {
        summary: 'First attacker each round: Wis save or disadvantage',
        targeting: 'self',
        multi: false,
      },
    ),
  }),
  'kobold-press-deepm:grasp-of-the-tupilak': deepMagicProfile('Grasp of the Tupilak', {}),
  'kobold-press-deepm:greater-maze': deepMagicProfile('Greater Maze', {
    effect: boardEffect(
      'Greater Maze',
      [
        {
          note: 'Banished; turn-start Dex save, 4d6 psychic',
          duration: { type: 'rounds', rounds: 100 },
        },
      ],
      { summary: 'Banished; turn-start Dex save, 4d6 psychic', targeting: 'enemy', multi: true },
    ),
  }),
  'kobold-press-deepm:greater-seal-of-sanctuary': deepMagicProfile('Greater Seal of Sanctuary', {}),
  'kobold-press-deepm:green-decay': deepMagicProfile('Green Decay', {
    mechanics: { attackRoll: true },
    attackKind: 'melee',
  }),
  'kobold-press-deepm:grudge-match': deepMagicProfile('Grudge Match', {
    effect: boardEffect('Grudge Match', [{ note: 'Target-relative rolls: +2/−2' }], {
      summary: 'Target-relative rolls: +2/−2',
      targeting: 'self',
      multi: false,
    }),
  }),
  'kobold-press-deepm:guiding-star': deepMagicProfile('Guiding Star', {}),
  'kobold-press-deepm:hamstring': deepMagicProfile('Hamstring', {
    mechanics: { attackRoll: true, ...reviewedDamage([{ formula: '1d4', type: 'force' }], 0, [1]) },
    attackKind: 'ranged',
  }),
  'kobold-press-deepm:hard-heart': deepMagicProfile('Hard Heart', {
    mechanics: { save: { ability: 'wis', onSave: 'negates' } },
    effect: boardEffect('Hard Heart', [{ note: 'Charm immune; incoming influence disadvantage' }], {
      summary: 'Charm immune; incoming influence disadvantage',
      targeting: 'enemy',
      multi: true,
    }),
  }),
  'kobold-press-deepm:harry': deepMagicProfile('Harry', {
    mechanics: { save: { ability: 'wis', onSave: 'negates' } },
    effect: boardEffect('Harry', [{ note: 'Caster tracks target; fear and rest restrictions' }], {
      summary: 'Caster tracks target; fear and rest restrictions',
      targeting: 'enemy',
      multi: true,
    }),
  }),
  'kobold-press-deepm:harrying-hounds': deepMagicProfile('Harrying Hounds', {
    mechanics: { save: { ability: 'wis', onSave: 'negates' } },
    effect: boardEffect('Harrying Hounds', [{ note: 'Compelled travel; fear outside combat' }], {
      summary: 'Compelled travel; fear outside combat',
      targeting: 'enemy',
      multi: true,
    }),
  }),
  'kobold-press-deepm:harsh-light-of-summers-glare': deepMagicProfile(
    'Harsh Light of Summer’s Glare',
    {
      mechanics: { save: { ability: 'con', onSave: 'negates' } },
    },
  ),
  'kobold-press-deepm:heart-to-heart': deepMagicProfile('Heart to Heart', {
    effect: boardEffect('Heart to Heart', [{ note: 'Linked survival; can split healing' }], {
      summary: 'Linked survival; can split healing',
      targeting: 'ally',
      multi: true,
    }),
  }),
  'kobold-press-deepm:heart-seeking-arrow': deepMagicProfile('Heart-Seeking Arrow', {
    effect: boardEffect(
      'Heart-Seeking Arrow',
      [
        {
          note: 'Next ranged hit: +6d6; half damage on miss',
          duration: { type: 'rounds', rounds: 10 },
        },
      ],
      { summary: 'Next ranged hit: +6d6; half damage on miss', targeting: 'self', multi: false },
    ),
  }),
  'kobold-press-deepm:heartache': deepMagicProfile('Heartache', {
    mechanics: {
      save: { ability: 'cha', onSave: 'half' },
      ...reviewedDamage([{ formula: '5d6', type: 'psychic' }], 2, [0]),
    },
  }),
  'kobold-press-deepm:heartstop': deepMagicProfile('Heartstop', {
    effect: boardEffect(
      'Heartstop',
      [{ note: 'Appears dead', duration: { type: 'rounds', rounds: 100 } }],
      { summary: 'Appears dead', targeting: 'ally', multi: true },
    ),
  }),
  'kobold-press-deepm:heartstrike': deepMagicProfile('Heartstrike', {
    effect: boardEffect(
      'Heartstrike',
      [
        {
          note: 'Ranged weapons: advantage; ignores partial cover',
          duration: { type: 'untilSourceTurn', when: 'startOfTurn' },
          durationNote: 'Until caster next turn start',
          concentration: false,
        },
      ],
      {
        summary: 'Ranged weapons: advantage; ignores partial cover',
        targeting: 'self',
        multi: false,
      },
    ),
  }),
  'kobold-press-deepm:heavenly-crown': deepMagicProfile('Heavenly Crown', {
    effect: boardEffect(
      'Heavenly Crown',
      [
        {
          note: 'Bonus action: ally reaction attack/movement',
          duration: { type: 'rounds', rounds: 10 },
        },
      ],
      { summary: 'Bonus action: ally reaction attack/movement', targeting: 'self', multi: false },
    ),
  }),
  'kobold-press-deepm:hedrens-birds-of-clay': deepMagicProfile('Hedren’s Birds of Clay', {
    effect: boardEffect(
      'Hedren’s Birds of Clay',
      [{ note: 'Clay pigeons intercept ranged attacks', duration: { type: 'rounds', rounds: 50 } }],
      { summary: 'Clay pigeons intercept ranged attacks', targeting: 'self', multi: false },
    ),
  }),
  'kobold-press-deepm:hematomancy': deepMagicProfile('Hematomancy', {
    mechanics: { save: { ability: 'wis', onSave: 'negates' } },
  }),
  'kobold-press-deepm:heros-steel': deepMagicProfile("Hero's Steel", {
    effect: boardEffect(
      "Hero's Steel",
      [{ note: 'Weapon hits can frighten/stun', duration: { type: 'rounds', rounds: 10 } }],
      { summary: 'Weapon hits can frighten/stun', targeting: 'self', multi: false },
    ),
  }),
}
