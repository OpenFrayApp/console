// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import type { ReviewedSpellCasting } from '../reviewedSpells.ts'
import { deepMagicProfile } from './deepMagic2020Profile.ts'
import { boardEffect, reviewedDamage } from './reviewedProfile.ts'

export const DEEP_MAGIC_2020_REMAINING_10: Record<string, ReviewedSpellCasting> = {
  'kobold-press-deepm:kobolds-fury': deepMagicProfile('Kobold’s Fury', {
    effect: boardEffect(
      'Kobold’s Fury',
      [
        {
          note: 'Melee weapons: advantage; larger-target hit +2d8',
          duration: { type: 'untilSourceTurn', when: 'endOfTurn' },
          turnOwner: 'target',
          concentration: false,
        },
      ],
      {
        summary: 'Melee weapons: advantage; larger-target hit +2d8',
        targeting: 'ally',
        multi: true,
      },
    ),
  }),
  'kobold-press-deepm:labyrinth-mastery': deepMagicProfile('Labyrinth Mastery', {
    effect: boardEffect(
      'Labyrinth Mastery',
      [{ note: 'Maze guide; conditional surprise/initiative advantage' }],
      {
        summary: 'Maze guide; conditional surprise/initiative advantage',
        targeting: 'self',
        multi: false,
      },
    ),
  }),
  'kobold-press-deepm:labyrinthine-howl': deepMagicProfile('Labyrinthine Howl', {
    mechanics: { save: { ability: 'wis', onSave: 'negates' } },
  }),
  'kobold-press-deepm:lacerate': deepMagicProfile('Lacerate', {
    mechanics: {
      save: { ability: 'con', onSave: 'half' },
      ...reviewedDamage([{ formula: '4d8', type: 'slashing' }], 2, [1]),
    },
  }),
  'kobold-press-deepm:lair-sense': deepMagicProfile('Lair Sense', {}),
  'kobold-press-deepm:last-rays-of-the-dying-sun': deepMagicProfile('Last Rays of the Dying Sun', {
    mechanics: {
      save: { ability: 'dex', onSave: 'half' },
      ...reviewedDamage(
        [
          { formula: '6d6', type: 'fire' },
          { formula: '6d6', type: 'cold' },
        ],
        7,
        [1, 1],
      ),
    },
  }),
  'kobold-press-deepm:lava-stone': deepMagicProfile('Lava Stone', {}),
  'kobold-press-deepm:lay-to-rest': deepMagicProfile('Lay to Rest', {
    mechanics: {
      save: { ability: 'con', onSave: 'half' },
      ...reviewedDamage([{ formula: '8d6', type: 'radiant' }], 5, [0]),
    },
  }),
  'kobold-press-deepm:legend-killer': deepMagicProfile('Legend Killer', {
    mechanics: { save: { ability: 'con', onSave: 'negates' } },
    effect: boardEffect(
      'Legend Killer',
      [{ note: 'Legendary actions suppressed; saves restore one' }],
      {
        summary: 'Legendary actions suppressed; saves restore one',
        targeting: 'enemy',
        multi: true,
      },
    ),
  }),
  'kobold-press-deepm:legion': deepMagicProfile('Legion', {}),
  'kobold-press-deepm:legion-of-rabid-squirrels': deepMagicProfile('Legion of Rabid Squirrels', {}),
  'kobold-press-deepm:lesser-maze': deepMagicProfile('Lesser Maze', {
    mechanics: { save: { ability: 'int', onSave: 'negates' } },
  }),
  'kobold-press-deepm:life-drain': deepMagicProfile('Life Drain', {
    mechanics: {
      save: { ability: 'con', onSave: 'half' },
      ...reviewedDamage([{ formula: '10d6', type: 'necrotic' }], 6, [1]),
    },
  }),
  'kobold-press-deepm:life-from-death': deepMagicProfile('Life from Death', {
    mechanics: {
      attackRoll: true,
      ...reviewedDamage([{ formula: '2d6', type: 'radiant' }], 3, [1]),
    },
    attackKind: 'melee',
    persistsAfterSave: true,
  }),
  'kobold-press-deepm:life-hack': deepMagicProfile('Life Hack', {
    effect: boardEffect('Life Hack', [{ note: 'Shared 120-temp-HP pool; bonus action to draw' }], {
      summary: 'Shared 120-temp-HP pool; bonus action to draw',
      targeting: 'ally',
      multi: true,
    }),
  }),
  'kobold-press-deepm:life-sense': deepMagicProfile('Life Sense', {
    effect: boardEffect(
      'Life Sense',
      [{ note: 'Senses living creatures within 30 ft', duration: { type: 'rounds', rounds: 100 } }],
      { summary: 'Senses living creatures within 30 ft', targeting: 'self', multi: false },
    ),
  }),
  'kobold-press-deepm:life-transference-arrow': deepMagicProfile('Life Transference Arrow', {}),
  'kobold-press-deepm:litany-of-sure-hands': deepMagicProfile('Litany of Sure Hands', {
    effect: boardEffect(
      'Litany of Sure Hands',
      [
        {
          note: 'Bonus-action simple tasks; ignores loading',
          duration: { type: 'rounds', rounds: 10 },
        },
      ],
      { summary: 'Bonus-action simple tasks; ignores loading', targeting: 'ally', multi: true },
    ),
  }),
  'kobold-press-deepm:living-shadows': deepMagicProfile('Living Shadows', {}),
  'kobold-press-deepm:lock-armor': deepMagicProfile('Lock Armor', {
    mechanics: { save: { ability: 'wis', onSave: 'negates' } },
    effect: boardEffect('Lock Armor', [{ note: 'Metal armor locked; movement restricted' }], {
      summary: 'Metal armor locked; movement restricted',
      targeting: 'enemy',
      multi: true,
    }),
  }),
  'kobold-press-deepm:looping-trail': deepMagicProfile('Looping Trail', {}),
  'kobold-press-deepm:lovesick': deepMagicProfile('Lovesick', {
    mechanics: { save: { ability: 'wis', onSave: 'negates' } },
    effect: boardEffect(
      'Lovesick',
      [{ note: 'No reactions; d10 behavior each turn', duration: 'escape' }],
      { summary: 'No reactions; d10 behavior each turn', targeting: 'enemy', multi: true },
    ),
  }),
  'kobold-press-deepm:maddening-whispers': deepMagicProfile('Maddening Whispers', {
    mechanics: { save: { ability: 'cha', onSave: 'negates' } },
    effect: boardEffect(
      'Maddening Whispers',
      [
        { note: 'Any damage ends effect; caster action upkeep' },
        { condition: 'Incapacitated' },
        { modifier: { applies: 'speed', mode: 'flatBonus', value: 'zero', direction: 'outgoing' } },
      ],
      {
        summary: 'Any damage ends effect; caster action upkeep; Incapacitated; Speed: zero',
        targeting: 'enemy',
        multi: true,
      },
    ),
  }),
  'kobold-press-deepm:maim': deepMagicProfile('Maim', {
    mechanics: {
      attackRoll: true,
      ...reviewedDamage([{ formula: '4d6', type: 'necrotic' }], 5, [0]),
    },
    attackKind: 'melee',
  }),
  'kobold-press-deepm:malevolent-waves': deepMagicProfile('Malevolent Waves', {
    effect: boardEffect(
      'Malevolent Waves',
      [
        {
          note: 'Aura: ally Stealth advantage; enemies Poisoned',
          duration: { type: 'rounds', rounds: 10 },
        },
      ],
      {
        summary: 'Aura: ally Stealth advantage; enemies Poisoned',
        targeting: 'self',
        multi: false,
      },
    ),
  }),
  'kobold-press-deepm:mammons-due': deepMagicProfile('Mammon’s Due', {}),
  'kobold-press-deepm:mark-prey': deepMagicProfile('Mark Prey', {
    effect: boardEffect('Mark Prey', [{ note: 'Caster sees/attacks/tracks marked prey better' }], {
      summary: 'Caster sees/attacks/tracks marked prey better',
      targeting: 'enemy',
      multi: true,
    }),
  }),
  'kobold-press-deepm:mass-hobble-mount': deepMagicProfile('Mass Hobble Mount', {
    mechanics: { attackRoll: true },
    attackKind: 'ranged',
  }),
  'kobold-press-deepm:mass-surge-dampener': deepMagicProfile('Mass Surge Dampener', {
    effect: boardEffect(
      'Mass Surge Dampener',
      [{ note: 'Chaos surge protection; ends on save', duration: { type: 'rounds', rounds: 10 } }],
      { summary: 'Chaos surge protection; ends on save', targeting: 'ally', multi: true },
    ),
  }),
  'kobold-press-deepm:maw-of-needles': deepMagicProfile('Maw of Needles', {
    effect: boardEffect(
      'Maw of Needles',
      [
        {
          note: 'Bite: 2d6 piercing; embedded spines 1d6 later',
          duration: { type: 'rounds', rounds: 10 },
        },
      ],
      { summary: 'Bite: 2d6 piercing; embedded spines 1d6 later', targeting: 'self', multi: false },
    ),
  }),
}
