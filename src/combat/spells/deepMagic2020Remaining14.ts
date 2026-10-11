// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import type { ReviewedSpellCasting } from '../reviewedSpells.ts'
import { deepMagicProfile } from './deepMagic2020Profile.ts'
import { boardEffect, reviewedDamage } from './reviewedProfile.ts'

export const DEEP_MAGIC_2020_REMAINING_14: Record<string, ReviewedSpellCasting> = {
  'kobold-press-deepm:snow-boulder': deepMagicProfile('Snow Boulder', {}),
  'kobold-press-deepm:snow-fort': deepMagicProfile('Snow Fort', {}),
  'kobold-press-deepm:snowy-coat': deepMagicProfile('Snowy Coat', {
    effect: boardEffect(
      'Snowy Coat',
      [{ note: 'Snow: Stealth advantage; bonus action Invisible' }],
      {
        summary: 'Snow: Stealth advantage; bonus action Invisible',
        targeting: 'ally',
        multi: true,
      },
    ),
  }),
  'kobold-press-deepm:speak-with-inanimate-object': deepMagicProfile(
    'Speak with Inanimate Object',
    {},
  ),
  'kobold-press-deepm:spin': deepMagicProfile('Spin', {
    mechanics: { save: { ability: 'wis', onSave: 'negates' } },
    effect: boardEffect('Spin', [{ note: 'Spinning; residual attack/check disadvantage' }], {
      summary: 'Spinning; residual attack/check disadvantage',
      targeting: 'enemy',
      multi: true,
    }),
  }),
  'kobold-press-deepm:spinning-axes': deepMagicProfile('Spinning Axes', {
    mechanics: {
      save: { ability: 'dex', onSave: 'half' },
      ...reviewedDamage([{ formula: '5d8', type: 'force' }], 4, [1]),
    },
  }),
  'kobold-press-deepm:spiteful-weapon': deepMagicProfile('Spiteful Weapon', {}),
  'kobold-press-deepm:spur-mount': deepMagicProfile('Spur Mount', {
    effect: boardEffect(
      'Spur Mount',
      [
        {
          note: 'Mount can bonus-action Dash/Disengage',
          duration: { type: 'untilSourceTurn', when: 'endOfTurn' },
        },
      ],
      { summary: 'Mount can bonus-action Dash/Disengage', targeting: 'ally', multi: true },
    ),
  }),
  'kobold-press-deepm:staff-of-violet-fire': deepMagicProfile('Staff of Violet Fire', {
    effect: boardEffect('Staff of Violet Fire', [{ note: '10-charge violet fire staff' }], {
      summary: '10-charge violet fire staff',
      targeting: 'self',
      multi: false,
    }),
  }),
  'kobold-press-deepm:stanch': deepMagicProfile('Stanch', {}),
  'kobold-press-deepm:stars-heart': deepMagicProfile("Star's Heart", {}),
  'kobold-press-deepm:starburst': deepMagicProfile('Starburst', {
    mechanics: {
      save: { ability: 'cha', onSave: 'negates' },
      ...reviewedDamage([{ formula: '1d8', type: 'radiant' }], 0, [1]),
    },
  }),
  'kobold-press-deepm:starfall': deepMagicProfile('Starfall', {
    mechanics: {
      save: { ability: 'dex', onSave: 'half' },
      ...reviewedDamage([{ formula: '6d6', type: 'radiant' }], 5, [0]),
    },
  }),
  'kobold-press-deepm:starry-vision': deepMagicProfile('Starry Vision', {
    mechanics: { save: { ability: 'cha', onSave: 'negates' } },
    effect: boardEffect(
      'Starry Vision',
      [{ note: 'Caster predicts target’s actions', duration: 'escape' }],
      { summary: 'Caster predicts target’s actions', targeting: 'enemy', multi: true },
    ),
  }),
  'kobold-press-deepm:steal-warmth': deepMagicProfile('Steal Warmth', {}),
  'kobold-press-deepm:steam-blast': deepMagicProfile('Steam Blast', {
    mechanics: {
      save: { ability: 'dex', onSave: 'half' },
      ...reviewedDamage([{ formula: '5d8', type: 'fire' }], 4, [1]),
    },
  }),
  'kobold-press-deepm:steam-whistle': deepMagicProfile('Steam Whistle', {
    mechanics: {
      save: { ability: 'con', onSave: 'half' },
      ...reviewedDamage([{ formula: '10d10', type: 'thunder' }], 8, [0]),
    },
  }),
  'kobold-press-deepm:stench-of-rot': deepMagicProfile('Stench of Rot', {
    mechanics: { save: { ability: 'cha', onSave: 'negates' } },
    effect: boardEffect(
      'Stench of Rot',
      [
        { note: 'Smell tracking bonus; concentration disadvantage' },
        {
          modifier: {
            applies: 'abilityChecks',
            mode: 'disadvantage',
            value: null,
            direction: 'outgoing',
            abilities: ['cha'],
          },
        },
      ],
      {
        summary: 'Smell tracking bonus; concentration disadvantage; Checks (cha): disadvantage',
        targeting: 'enemy',
        multi: true,
      },
    ),
  }),
  'kobold-press-deepm:storm-of-wings': deepMagicProfile('Storm of Wings', {}),
  'kobold-press-deepm:sudden-dawn': deepMagicProfile('Sudden Dawn', {}),
  'kobold-press-deepm:summon-eldritch-servitor': deepMagicProfile('Summon Eldritch Servitor', {}),
  'kobold-press-deepm:summon-star': deepMagicProfile('Summon Star', {}),
  'kobold-press-deepm:surge-dampener': deepMagicProfile('Surge Dampener', {
    effect: boardEffect(
      'Surge Dampener',
      [{ note: 'Chaos surge protection; ends on save', duration: { type: 'rounds', rounds: 10 } }],
      { summary: 'Chaos surge protection; ends on save', targeting: 'ally', multi: true },
    ),
  }),
  'kobold-press-deepm:surprise-blessing': deepMagicProfile('Surprise Blessing', {}),
  'kobold-press-deepm:symbol-of-sorcery': deepMagicProfile('Symbol of Sorcery', {}),
  'kobold-press-deepm:talons-of-a-hungry-land': deepMagicProfile('Talons of a Hungry Land', {
    mechanics: {
      save: { ability: 'dex', onSave: 'half' },
      ...reviewedDamage([{ formula: '8d8', type: 'slashing' }], 7, [1]),
    },
    persistsAfterSave: true,
  }),
  'kobold-press-deepm:targeting-foreknowledge': deepMagicProfile('Targeting Foreknowledge', {}),
  'kobold-press-deepm:thin-the-ice': deepMagicProfile('Thin the Ice', {}),
  'kobold-press-deepm:thousand-darts': deepMagicProfile('Thousand Darts', {
    mechanics: {
      save: { ability: 'dex', onSave: 'half' },
      ...reviewedDamage([{ formula: '6d6', type: 'piercing' }], 3, [1]),
    },
  }),
  'kobold-press-deepm:throes-of-ecstasy': deepMagicProfile('Throes of Ecstasy', {
    mechanics: { save: { ability: 'con', onSave: 'negates' } },
    effect: boardEffect(
      'Throes of Ecstasy',
      [
        { note: 'Auto-fails Wis saves; ending causes exhaustion', duration: 'escape' },
        { condition: 'Incapacitated', duration: 'escape' },
        {
          modifier: {
            applies: 'attackRolls',
            mode: 'advantage',
            value: null,
            direction: 'incoming',
          },
          duration: 'escape',
        },
      ],
      {
        summary:
          'Auto-fails Wis saves; ending causes exhaustion; Incapacitated; Attacks: advantage',
        targeting: 'enemy',
        multi: true,
      },
    ),
  }),
}
