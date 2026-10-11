// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import type { ReviewedSpellCasting } from '../reviewedSpells.ts'
import { deepMagicProfile, deepMagicTurnConditions } from './deepMagic2020Profile.ts'
import { boardEffect, reviewedDamage } from './reviewedProfile.ts'

export const DEEP_MAGIC_2020_REMAINING_12: Record<string, ReviewedSpellCasting> = {
  'kobold-press-deepm:protective-ice': deepMagicProfile('Protective Ice', {
    effect: boardEffect(
      'Protective Ice',
      [{ note: 'Ice breastplate; melee attacker takes 1d6 cold' }],
      { summary: 'Ice breastplate; melee attacker takes 1d6 cold', targeting: 'ally', multi: true },
    ),
  }),
  'kobold-press-deepm:puff-of-smoke': deepMagicProfile('Puff of Smoke', {
    mechanics: { save: { ability: 'dex', onSave: 'negates' } },
    effect: deepMagicTurnConditions(['Blinded'], 'caster', 'startOfTurn'),
  }),
  'kobold-press-deepm:pummelstone': deepMagicProfile('Pummelstone', {
    mechanics: {
      attackRoll: true,
      ...reviewedDamage([{ formula: '1d6', type: 'bludgeoning' }], 0, [1]),
    },
    attackKind: 'ranged',
  }),
  'kobold-press-deepm:pyroclasm': deepMagicProfile('Pyroclasm', {
    mechanics: {
      save: { ability: 'dex', onSave: 'half' },
      ...reviewedDamage([{ formula: '10d8', type: 'fire' }], 9, [0]),
    },
    persistsAfterSave: true,
  }),
  'kobold-press-deepm:quick-time': deepMagicProfile('Quick Time', {
    mechanics: { save: { ability: 'con', onSave: 'negates' } },
  }),
  'kobold-press-deepm:quicken': deepMagicProfile('Quicken', {
    effect: boardEffect(
      'Quicken',
      [{ note: 'One initiative roll or Dex save: +1d4', duration: { type: 'rounds', rounds: 10 } }],
      { summary: 'One initiative roll or Dex save: +1d4', targeting: 'ally', multi: true },
    ),
  }),
  'kobold-press-deepm:quicksilver-mantle': deepMagicProfile('Quicksilver Mantle', {
    effect: boardEffect(
      'Quicksilver Mantle',
      [
        { note: 'Gaze save advantage; rays may reflect' },
        { modifier: { applies: 'ac', mode: 'flatBonus', value: 2, direction: 'outgoing' } },
      ],
      { summary: 'Gaze save advantage; rays may reflect; AC: +2', targeting: 'self', multi: false },
    ),
  }),
  'kobold-press-deepm:quintessence': deepMagicProfile('Quintessence', {
    effect: boardEffect(
      'Quintessence',
      [{ note: 'AC 20 minimum; fear/necrotic immune', duration: { type: 'rounds', rounds: 10 } }],
      { summary: 'AC 20 minimum; fear/necrotic immune', targeting: 'self', multi: false },
    ),
  }),
  'kobold-press-deepm:raid-the-lair': deepMagicProfile('Raid the Lair', {
    effect: boardEffect('Raid the Lair', [{ note: 'Dragon lair protection' }], {
      summary: 'Dragon lair protection',
      targeting: 'self',
      multi: false,
    }),
  }),
  'kobold-press-deepm:rain-of-blades': deepMagicProfile('Rain of Blades', {
    mechanics: {
      save: { ability: 'dex', onSave: 'half' },
      ...reviewedDamage([{ formula: '6d6', type: 'slashing' }], 5, [0]),
    },
  }),
  'kobold-press-deepm:ray-of-alchemical-negation': deepMagicProfile(
    'Ray of Alchemical Negation',
    {},
  ),
  'kobold-press-deepm:ray-of-life-suppression': deepMagicProfile('Ray of Life Suppression', {
    mechanics: {
      attackRoll: true,
      ...reviewedDamage([{ formula: '6d8', type: 'necrotic' }], 4, [0]),
    },
    attackKind: 'ranged',
  }),
  'kobold-press-deepm:reaver-spirit': deepMagicProfile('Reaver Spirit', {
    effect: boardEffect(
      'Reaver Spirit',
      [
        {
          note: 'Resist nonmagic B/P/S; melee weapon damage +2',
          duration: { type: 'rounds', rounds: 10 },
        },
        {
          duration: { type: 'rounds', rounds: 10 },
          modifier: {
            applies: 'abilityChecks',
            mode: 'advantage',
            value: null,
            direction: 'outgoing',
            abilities: ['str'],
          },
        },
        {
          duration: { type: 'rounds', rounds: 10 },
          modifier: {
            applies: 'savingThrows',
            mode: 'advantage',
            value: null,
            direction: 'outgoing',
            abilities: ['str'],
          },
        },
      ],
      {
        summary:
          'Resist nonmagic B/P/S; melee weapon damage +2; Checks (str): advantage; Saves (str): advantage',
        targeting: 'ally',
        multi: true,
      },
    ),
  }),
  'kobold-press-deepm:reposition': deepMagicProfile('Reposition', {}),
  'kobold-press-deepm:reset': deepMagicProfile('Reset', {}),
  'kobold-press-deepm:reverberate': deepMagicProfile('Reverberate', {
    mechanics: {
      save: { ability: 'dex', onSave: 'half' },
      ...reviewedDamage([{ formula: '4d6', type: 'thunder' }], 2, [1]),
    },
  }),
  'kobold-press-deepm:revive-beast': deepMagicProfile('Revive Beast', {}),
  'kobold-press-deepm:right-the-stars': deepMagicProfile('Right the Stars', {
    effect: boardEffect(
      'Right the Stars',
      [{ note: 'Later conjuration duration doubled; 30 temp HP' }],
      {
        summary: 'Later conjuration duration doubled; 30 temp HP',
        targeting: 'self',
        multi: false,
      },
    ),
  }),
  'kobold-press-deepm:ring-strike': deepMagicProfile('Ring Strike', {
    effect: boardEffect('Ring Strike', [{ note: '2 rings: hit adds 1d10 bludgeoning and push' }], {
      summary: '2 rings: hit adds 1d10 bludgeoning and push',
      targeting: 'self',
      multi: false,
    }),
  }),
  'kobold-press-deepm:ring-ward': deepMagicProfile('Ring Ward', {
    effect: boardEffect(
      'Ring Ward',
      [{ note: 'Aura: magical save advantage; chosen resistance' }],
      {
        summary: 'Aura: magical save advantage; chosen resistance',
        targeting: 'self',
        multi: false,
      },
    ),
  }),
  'kobold-press-deepm:riptide': deepMagicProfile('Riptide', {
    mechanics: { save: { ability: 'str', onSave: 'negates' } },
  }),
  'kobold-press-deepm:rolling-thunder': deepMagicProfile('Rolling Thunder', {
    mechanics: { save: { ability: 'con', onSave: 'negates' } },
    effect: boardEffect(
      'Rolling Thunder',
      [
        { note: 'Turn start: 2d8 thunder', duration: 'escape' },
        { duration: 'escape', condition: 'Deafened' },
        {
          duration: 'escape',
          modifier: { applies: 'speed', mode: 'flatBonus', value: 'half', direction: 'outgoing' },
        },
      ],
      {
        summary: 'Turn start: 2d8 thunder; Deafened; Speed: half',
        targeting: 'enemy',
        multi: true,
      },
    ),
  }),
  'kobold-press-deepm:rotting-corpse': deepMagicProfile('Rotting Corpse', {}),
  'kobold-press-deepm:rune-of-imprisonment': deepMagicProfile('Rune of Imprisonment', {
    mechanics: { attackRoll: true },
    attackKind: 'ranged',
  }),
  'kobold-press-deepm:salt-lash': deepMagicProfile('Salt Lash', {
    effect: boardEffect(
      'Salt Lash',
      [
        {
          note: 'Salt blade: 2d8 slashing; hits can stun',
          duration: { type: 'rounds', rounds: 100 },
        },
      ],
      { summary: 'Salt blade: 2d8 slashing; hits can stun', targeting: 'self', multi: false },
    ),
  }),
  'kobold-press-deepm:sand-ship': deepMagicProfile('Sand Ship', {}),
  'kobold-press-deepm:sanguine-horror': deepMagicProfile('Sanguine Horror', {}),
  'kobold-press-deepm:scale-rot': deepMagicProfile('Scale Rot', {
    mechanics: { save: { ability: 'con', onSave: 'negates' } },
    effect: boardEffect(
      'Scale Rot',
      [
        { note: 'No healing' },
        {
          modifier: {
            applies: 'attackRolls',
            mode: 'advantage',
            value: null,
            direction: 'incoming',
          },
        },
      ],
      { summary: 'No healing; Attacks: advantage', targeting: 'enemy', multi: true },
    ),
  }),
  'kobold-press-deepm:scentless': deepMagicProfile('Scentless', {
    effect: boardEffect('Scentless', [{ note: 'No odor; smell-only observers cannot see it' }], {
      summary: 'No odor; smell-only observers cannot see it',
      targeting: 'ally',
      multi: true,
    }),
  }),
  'kobold-press-deepm:screaming-ray': deepMagicProfile('Screaming Ray', {
    mechanics: {
      attackRoll: true,
      ...reviewedDamage([{ formula: '1d4', type: 'psychic' }], 1, [0]),
    },
    attackKind: 'ranged',
  }),
}
