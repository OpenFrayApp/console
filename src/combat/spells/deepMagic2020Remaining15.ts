// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import type { ReviewedSpellCasting } from '../reviewedSpells.ts'
import { deepMagicProfile } from './deepMagic2020Profile.ts'
import { boardEffect, reviewedDamage } from './reviewedProfile.ts'

export const DEEP_MAGIC_2020_REMAINING_15: Record<string, ReviewedSpellCasting> = {
  'kobold-press-deepm:thunder-bolt': deepMagicProfile('Thunder Bolt', {
    mechanics: {
      attackRoll: true,
      ...reviewedDamage([{ formula: '1d8', type: 'thunder' }], 0, [1]),
    },
    attackKind: 'ranged',
  }),
  'kobold-press-deepm:thunderclap': deepMagicProfile('Thunderclap', {
    mechanics: {
      save: { ability: 'con', onSave: 'half' },
      ...reviewedDamage([{ formula: '8d4', type: 'thunder' }], 3, [0]),
    },
  }),
  'kobold-press-deepm:thunderous-charge': deepMagicProfile('Thunderous Charge', {}),
  'kobold-press-deepm:thunderous-stampede': deepMagicProfile('Thunderous Stampede', {}),
  'kobold-press-deepm:thunderous-wave': deepMagicProfile('Thunderous Wave', {}),
  'kobold-press-deepm:thunderstorm': deepMagicProfile('Thunderstorm', {
    effect: boardEffect(
      'Thunderstorm',
      [{ note: 'Fly 60 ft; obscuring cloud transparent to target' }],
      {
        summary: 'Fly 60 ft; obscuring cloud transparent to target',
        targeting: 'ally',
        multi: true,
      },
    ),
  }),
  'kobold-press-deepm:tidal-barrier': deepMagicProfile('Tidal Barrier', {
    effect: boardEffect(
      'Tidal Barrier',
      [
        {
          note: 'Entry/turn start: Str save or pushed and Speed 0',
          duration: { type: 'rounds', rounds: 10 },
        },
      ],
      {
        summary: 'Entry/turn start: Str save or pushed and Speed 0',
        targeting: 'self',
        multi: false,
      },
    ),
  }),
  'kobold-press-deepm:time-in-a-bottle': deepMagicProfile('Time in a Bottle', {}),
  'kobold-press-deepm:time-jump': deepMagicProfile('Time Jump', {
    mechanics: { save: { ability: 'con', onSave: 'negates' } },
  }),
  'kobold-press-deepm:time-loop': deepMagicProfile('Time Loop', {}),
  'kobold-press-deepm:time-slippage': deepMagicProfile('Time Slippage', {}),
  'kobold-press-deepm:time-step': deepMagicProfile('Time Step', {}),
  'kobold-press-deepm:time-vortex': deepMagicProfile('Time Vortex', {
    mechanics: { save: { ability: 'wis', onSave: 'negates' } },
    persistsAfterSave: true,
  }),
  'kobold-press-deepm:timely-distraction': deepMagicProfile('Timely Distraction', {
    mechanics: { save: { ability: 'wis', onSave: 'negates' } },
  }),
  'kobold-press-deepm:tireless': deepMagicProfile('Tireless', {
    effect: boardEffect('Tireless', [{ note: 'No food/rest needed; travel Speed tripled' }], {
      summary: 'No food/rest needed; travel Speed tripled',
      targeting: 'ally',
      multi: true,
    }),
  }),
  'kobold-press-deepm:tongue-of-sand': deepMagicProfile('Tongue of Sand', {}),
  'kobold-press-deepm:tongue-tied': deepMagicProfile('Tongue Tied', {
    mechanics: { save: { ability: 'wis', onSave: 'negates' } },
    effect: boardEffect(
      'Tongue Tied',
      [{ note: 'No verbal communication; verbal spells need check' }],
      {
        summary: 'No verbal communication; verbal spells need check',
        targeting: 'enemy',
        multi: true,
      },
    ),
  }),
  'kobold-press-deepm:torrent-of-fire': deepMagicProfile('Torrent of Fire', {
    mechanics: {
      save: { ability: 'dex', onSave: 'half' },
      ...reviewedDamage([{ formula: '6d6', type: 'fire' }], 4, [0]),
    },
  }),
  'kobold-press-deepm:touch-of-the-unliving': deepMagicProfile('Touch of the Unliving', {
    mechanics: {
      attackRoll: true,
      ...reviewedDamage([{ formula: '2d6', type: 'necrotic' }], 3, [1]),
    },
    attackKind: 'melee',
    persistsAfterSave: true,
  }),
  'kobold-press-deepm:tracer': deepMagicProfile('Tracer', {}),
  'kobold-press-deepm:treasure-chasm': deepMagicProfile('Treasure Chasm', {
    mechanics: { save: { ability: 'wis', onSave: 'negates' } },
    effect: boardEffect('Treasure Chasm', [{ note: 'Compelled to approach and gather treasure' }], {
      summary: 'Compelled to approach and gather treasure',
      targeting: 'enemy',
      multi: true,
    }),
  }),
  'kobold-press-deepm:tree-heal': deepMagicProfile('Tree Heal', {}),
  'kobold-press-deepm:tree-running': deepMagicProfile('Tree Running', {
    effect: boardEffect('Tree Running', [{ note: 'Climbs rooted plants hands-free' }], {
      summary: 'Climbs rooted plants hands-free',
      targeting: 'ally',
      multi: true,
    }),
  }),
  'kobold-press-deepm:tree-speak': deepMagicProfile('Tree Speak', {}),
  'kobold-press-deepm:trench': deepMagicProfile('Trench', {}),
  'kobold-press-deepm:trick-question': deepMagicProfile('Trick Question', {
    mechanics: { save: { ability: 'wis', onSave: 'negates' } },
  }),
  'kobold-press-deepm:triumph-of-ice': deepMagicProfile('Triumph of Ice', {}),
  'kobold-press-deepm:twist-the-skein': deepMagicProfile('Twist the Skein', {}),
  'kobold-press-deepm:umbral-storm': deepMagicProfile('Umbral Storm', {}),
  'kobold-press-deepm:uncontrollable-transformation': deepMagicProfile(
    'Uncontrollable Transformation',
    {
      effect: boardEffect('Uncontrollable Transformation', [{ note: 'Chosen/rolled mutations' }], {
        summary: 'Chosen/rolled mutations',
        targeting: 'self',
        multi: false,
      }),
    },
  ),
}
