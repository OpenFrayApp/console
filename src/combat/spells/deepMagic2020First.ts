// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { condition } from '../effects.ts'
import type { ReviewedSpellCasting } from '../reviewedSpells.ts'
import { boardEffect, sourceProfile } from './reviewedProfile.ts'

/** Bind a verdict to the approved Deep Magic 2020 card. */
function profile(name: string, rules: Omit<ReviewedSpellCasting, 'source' | 'edition' | 'name'>) {
  return sourceProfile('kobold-press-deepm', '5.0', name, rules)
}

export const DEEP_MAGIC_2020_FIRST: Record<string, ReviewedSpellCasting> = {
  'kobold-press-deepm:abhorrent-apparition': profile('Abhorrent Apparition', {
    mechanics: {
      save: { ability: 'wis', onSave: 'half' },
      damage: [{ formula: '6d8', type: 'psychic' }],
      scaling: [5, 6, 7, 8, 9].map((level) => ({
        by: 'slot',
        level,
        damage: [{ formula: `${level + 2}d8`, type: 'psychic' }],
      })),
    },
    effect: boardEffect(
      'Abhorrent Apparition',
      [
        {
          condition: 'Frightened',
          duration: 'escape',
          fallbackDuration: { type: 'rounds', rounds: 10 },
        },
      ],
      { summary: 'Frightened', targeting: 'enemy', multi: true },
    ),
  }),
  'kobold-press-deepm:accelerate': profile('Accelerate', {
    effect: boardEffect(
      'Accelerate',
      [
        { note: 'Bonus action: Dash', duration: { type: 'rounds', rounds: 10 } },
        {
          duration: { type: 'rounds', rounds: 10 },
          modifier: { applies: 'speed', mode: 'flatBonus', value: 'double', direction: 'outgoing' },
        },
        {
          duration: { type: 'rounds', rounds: 10 },
          modifier: {
            applies: 'savingThrows',
            mode: 'advantage',
            value: null,
            direction: 'outgoing',
            abilities: ['dex'],
          },
        },
      ],
      {
        summary: 'Bonus action: Dash; Speed: double; Saves (dex): advantage',
        targeting: 'ally',
        multi: true,
      },
    ),
  }),
  'kobold-press-deepm:acid-gate': profile('Acid Gate', {}),
  'kobold-press-deepm:acid-rain': profile('Acid Rain', {}),
  'kobold-press-deepm:adjust-position': profile('Adjust Position', {}),
  'kobold-press-deepm:agonizing-mark': profile('Agonizing Mark', {
    effect: boardEffect(
      'Agonizing Mark',
      [{ note: 'Caster damage: Cha save or Prone', duration: { type: 'rounds', rounds: 10 } }],
      { summary: 'Caster damage: Cha save or Prone', targeting: 'enemy', multi: false },
    ),
  }),
  'kobold-press-deepm:alchemical-form': profile('Alchemical Form', {
    effect: boardEffect(
      'Alchemical Form',
      [
        {
          note: 'Acid/poison, Poisoned/Stunned immune; resist nonmagic fire/piercing/slashing',
          duration: { type: 'rounds', rounds: 10 },
        },
      ],
      {
        summary: 'Acid/poison, Poisoned/Stunned immune; resist nonmagic fire/piercing/slashing',
        targeting: 'self',
        multi: false,
      },
    ),
  }),
  'kobold-press-deepm:ale-dritch-blast': profile('Ale-dritch Blast', {
    attackKind: 'ranged',
    mechanics: {
      attackRoll: true,
      damage: [{ formula: '1d8', type: 'cold' }],
      scaling: [5, 11, 17].map((level, i) => ({
        by: 'character',
        level,
        damage: [{ formula: `${i + 2}d8`, type: 'cold' }],
      })),
    },
  }),
  'kobold-press-deepm:ally-aegis': profile('Ally Aegis', {
    effect: boardEffect(
      'Ally Aegis',
      [
        {
          note: 'Force immune; spell damage reduced except psychic',
          duration: { type: 'untilSourceTurn', when: 'startOfTurn' },
        },
      ],
      {
        summary: 'Force immune; spell damage reduced except psychic',
        targeting: 'ally',
        multi: true,
      },
    ),
  }),
  'kobold-press-deepm:alone': profile('Alone', {
    mechanics: { save: { ability: 'wis', onSave: 'negates' } },
    effect: boardEffect(
      'Alone',
      [
        {
          note: 'Cannot perceive or interact with allies',
          duration: { type: 'rounds', rounds: 10 },
        },
      ],
      { summary: 'Cannot perceive or interact with allies', targeting: 'enemy', multi: false },
    ),
  }),
  'kobold-press-deepm:alter-arrows-fortune': profile('Alter Arrow’s Fortune', {
    mechanics: { save: { ability: 'cha', onSave: 'negates' } },
  }),
  'kobold-press-deepm:altheas-travel-tent': profile('Althea’s Travel Tent', {}),
  'kobold-press-deepm:amplify-gravity': profile('Amplify Gravity', {
    persistsAfterSave: true,
    mechanics: { save: { ability: 'str', onSave: 'negates' } },
    effect: {
      summary: 'Prone; gravity area and later saves manual',
      targeting: 'enemy',
      multi: true,
      build: ({ source }) => [
        {
          ...condition('Prone', { source, duration: { type: 'manual' } }),
          concentration: false,
          durationNote: 'Until it stands; Strength save required inside gravity area',
        },
      ],
    },
  }),
  'kobold-press-deepm:analyze-device': profile('Analyze Device', {}),
  'kobold-press-deepm:ancestors-strength': profile('Ancestor’s Strength', {
    effect: boardEffect(
      'Ancestor’s Strength',
      [
        { note: 'Counts one size larger for lifting/carrying' },
        {
          modifier: {
            applies: 'abilityChecks',
            mode: 'advantage',
            value: null,
            direction: 'outgoing',
            abilities: ['str'],
          },
        },
      ],
      {
        summary: 'Counts one size larger for lifting/carrying; Checks (str): advantage',
        targeting: 'ally',
        multi: false,
      },
    ),
  }),
  'kobold-press-deepm:anchoring-rope': profile('Anchoring Rope', {}),
  'kobold-press-deepm:ancient-shade': profile('Ancient Shade', {}),
  'kobold-press-deepm:angelic-guardian': profile('Angelic Guardian', {
    effect: boardEffect(
      'Angelic Guardian',
      [
        {
          note: 'First failed Dex save: reaction reroll, then ends',
          duration: { type: 'rounds', rounds: 10 },
        },
        {
          duration: { type: 'rounds', rounds: 10 },
          modifier: { applies: 'ac', mode: 'flatBonus', value: 2, direction: 'outgoing' },
        },
      ],
      {
        summary: 'First failed Dex save: reaction reroll, then ends; AC: +2',
        targeting: 'ally',
        multi: false,
      },
    ),
  }),
  'kobold-press-deepm:animate-ghoul': profile('Animate Ghoul', {}),
  'kobold-press-deepm:animate-greater-undead': profile('Animate Greater Undead', {}),
}
