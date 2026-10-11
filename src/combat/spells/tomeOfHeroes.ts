// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { condition } from '../effects.ts'
import type { ReviewedSpellCasting } from '../reviewedSpells.ts'
import { boardEffect, nextTurnCondition, sourceProfile } from './reviewedProfile.ts'

/** Bind a reviewed Tome of Heroes profile to its printed source and edition. */
export function reviewed(
  name: string,
  profile: Omit<ReviewedSpellCasting, 'source' | 'edition' | 'name'>,
): ReviewedSpellCasting {
  return sourceProfile('kobold-press-toh', '5.0', name, profile)
}

export const TOME_OF_HEROES_CASTING: Record<string, ReviewedSpellCasting> = {
  'kobold-press-toh:clear-the-board': reviewed('Clear the Board', {
    mechanics: { save: { ability: 'wis', onSave: 'negates' } },
  }),
  'kobold-press-toh:forced-reposition': reviewed('Forced Reposition', {
    mechanics: { save: { ability: 'con', onSave: 'negates' } },
  }),
  'kobold-press-toh:power-word-rend': reviewed('Power Word Rend', {
    mechanics: {
      damage: [{ formula: '4d6+20', type: 'force' }],
      save: { ability: 'con', onSave: 'half' },
    },
  }),
  'kobold-press-toh:sudden-slue': reviewed('Sudden Slue', {
    mechanics: {
      damage: [{ formula: '6d6', type: 'bludgeoning' }],
      save: { ability: 'dex', onSave: 'half' },
    },
    effect: {
      summary: 'Knocked prone',
      targeting: 'enemy',
      multi: true,
      build: ({ source }) => [condition('Prone', { source })],
    },
  }),
  'kobold-press-toh:damaging-intel': reviewed('Damaging Intel', {
    mechanics: { save: { ability: 'cha', onSave: 'negates' } },
    effect: boardEffect(
      'Damaging Intel',
      [
        {
          note: 'Next ally attack: advantage',
          duration: { type: 'untilSourceTurn', when: 'endOfTurn' },
        },
      ],
      { summary: 'Next ally attack: advantage', targeting: 'enemy', multi: false },
    ),
  }),
  'kobold-press-toh:stone-aegis': reviewed('Stone Aegis', {
    effect: boardEffect(
      'Stone Aegis',
      [
        {
          modifier: { applies: 'ac', mode: 'flatBonus', value: 2, direction: 'outgoing' },
          note: '+2 AC',
          duration: { type: 'untilSourceTurn', when: 'startOfTurn' },
        },
      ],
      { summary: '+2 AC', targeting: 'self', multi: false },
    ),
  }),
  'kobold-press-toh:burst-stone': reviewed('Burst Stone', {
    mechanics: {
      damage: [{ formula: '4d8', type: 'bludgeoning' }],
      save: { ability: 'dex', onSave: 'half' },
    },
    effect: {
      summary: 'Knocked prone',
      targeting: 'enemy',
      multi: true,
      build: ({ source }) => [condition('Prone', { source })],
    },
  }),
  'kobold-press-toh:furious-wail': reviewed('Furious Wail', {
    mechanics: {
      damage: [{ formula: '10d10+30', type: 'psychic' }],
      save: { ability: 'cha', onSave: 'half' },
    },
    effect: nextTurnCondition('Stunned', true),
  }),
  'kobold-press-toh:lance': reviewed('Lance', {
    mechanics: { attackRoll: true, damage: [{ formula: '5d6', type: 'force' }] },
    effect: nextTurnCondition('Restrained'),
  }),
  'kobold-press-toh:shocking-volley': reviewed('Shocking Volley', {
    mechanics: {
      damage: [{ formula: '2d8', type: 'lightning' }],
      save: { ability: 'dex', onSave: 'half' },
    },
    effect: nextTurnCondition('Incapacitated', true),
  }),
  'kobold-press-toh:pincer': reviewed('Pincer', {
    mechanics: {
      damage: [{ formula: '5d10', type: 'thunder' }],
      save: { ability: 'con', onSave: 'half' },
    },
  }),
  'kobold-press-toh:babble': reviewed('Babble', {
    mechanics: { save: { ability: 'int', onSave: 'negates' } },
    effect: boardEffect('Babble', [{ note: 'No verbal spells' }], {
      summary: 'No verbal spells',
      targeting: 'enemy',
      multi: true,
    }),
  }),
  'kobold-press-toh:blunted-edge': reviewed('Blunted Edge', {
    mechanics: { save: { ability: 'wis', onSave: 'negates' } },
    effect: boardEffect(
      'Blunted Edge',
      [{ note: 'Weapon damage: roll twice, take lower', duration: 'escape' }],
      { summary: 'Weapon damage: roll twice, take lower', targeting: 'enemy', multi: false },
    ),
  }),
  'kobold-press-toh:bound-haze': reviewed('Bound Haze', {
    mechanics: { save: { ability: 'dex', onSave: 'negates' } },
    effect: boardEffect(
      'Bound Haze',
      [
        { note: 'In gas: save disadvantage', duration: 'escape' },
        {
          duration: 'escape',
          modifier: {
            applies: 'attackRolls',
            mode: 'disadvantage',
            value: null,
            direction: 'outgoing',
          },
        },
      ],
      {
        summary: 'In gas: save disadvantage; Attacks: disadvantage',
        targeting: 'enemy',
        multi: false,
      },
    ),
  }),
  'kobold-press-toh:toothless-beast': reviewed('Toothless Beast', {
    mechanics: { save: { ability: 'wis', onSave: 'negates' } },
    effect: boardEffect(
      'Toothless Beast',
      [{ note: 'Natural weapon damage: take lower roll', duration: 'escape' }],
      { summary: 'Natural weapon damage: take lower roll', targeting: 'enemy', multi: false },
    ),
  }),
  'kobold-press-toh:crown-of-thorns': reviewed('Crown of Thorns', {
    effect: boardEffect(
      'Crown of Thorns',
      [
        {
          note: 'Casting: Cha save or 2d6 psychic; spell fails',
          duration: { type: 'rounds', rounds: 10 },
        },
      ],
      {
        summary: 'Casting: Cha save or 2d6 psychic; spell fails',
        targeting: 'enemy',
        multi: false,
      },
    ),
  }),
  'kobold-press-toh:iron-gut': reviewed('Iron Gut', {
    effect: boardEffect('Iron Gut', [{ note: 'Poison resistance; poison save advantage' }], {
      summary: 'Poison resistance; poison save advantage',
      targeting: 'ally',
      multi: false,
    }),
  }),
  'kobold-press-toh:misdirection': reviewed('Misdirection', {}),
}
