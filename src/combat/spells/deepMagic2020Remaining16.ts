// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import type { ReviewedSpellCasting } from '../reviewedSpells.ts'
import { deepMagicProfile, deepMagicTurnConditions } from './deepMagic2020Profile.ts'
import { boardEffect, reviewedDamage } from './reviewedProfile.ts'

export const DEEP_MAGIC_2020_REMAINING_16: Record<string, ReviewedSpellCasting> = {
  'kobold-press-deepm:undermine-armor': deepMagicProfile('Undermine Armor', {
    mechanics: { save: { ability: 'con', onSave: 'negates' } },
    effect: boardEffect(
      'Undermine Armor',
      [{ modifier: { applies: 'ac', mode: 'flatBonus', value: -2, direction: 'outgoing' } }],
      { summary: 'AC: -2', targeting: 'enemy', multi: true },
    ),
  }),
  'kobold-press-deepm:unholy-defiance': deepMagicProfile('Unholy Defiance', {
    effect: boardEffect(
      'Unholy Defiance',
      [
        {
          note: 'Turning saves: advantage (or +1d4 with defiance)',
          duration: { type: 'rounds', rounds: 10 },
        },
      ],
      {
        summary: 'Turning saves: advantage (or +1d4 with defiance)',
        targeting: 'self',
        multi: false,
      },
    ),
  }),
  'kobold-press-deepm:unleash-effigy': deepMagicProfile('Unleash Effigy', {}),
  'kobold-press-deepm:unluck-on-that': deepMagicProfile('Unluck On That', {}),
  'kobold-press-deepm:unseen-strangler': deepMagicProfile('Unseen Strangler', {}),
  'kobold-press-deepm:visage-of-madness': deepMagicProfile('Visage of Madness', {
    mechanics: { save: { ability: 'wis', onSave: 'negates' } },
  }),
  'kobold-press-deepm:vital-mark': deepMagicProfile('Vital Mark', {}),
  'kobold-press-deepm:void-rift': deepMagicProfile('Void Rift', {}),
  'kobold-press-deepm:void-strike': deepMagicProfile('Void Strike', {
    mechanics: {
      attackRoll: true,
      ...reviewedDamage([{ formula: '5d8', type: 'necrotic' }], 3, [1]),
    },
    attackKind: 'ranged',
    persistsAfterSave: true,
    effect: deepMagicTurnConditions(['Frightened'], 'caster', 'startOfTurn'),
  }),
  'kobold-press-deepm:volley-shield': deepMagicProfile('Volley Shield', {
    effect: boardEffect(
      'Volley Shield',
      [
        {
          note: 'Resist nonmagic B/P/S; saved spells reflect',
          duration: { type: 'rounds', rounds: 10 },
        },
        {
          duration: { type: 'rounds', rounds: 10 },
          modifier: { applies: 'ac', mode: 'flatBonus', value: 5, direction: 'outgoing' },
        },
      ],
      {
        summary: 'Resist nonmagic B/P/S; saved spells reflect; AC: +5',
        targeting: 'ally',
        multi: true,
      },
    ),
  }),
  'kobold-press-deepm:vomit-tentacles': deepMagicProfile('Vomit Tentacles', {}),
  'kobold-press-deepm:voorish-sign': deepMagicProfile('Voorish Sign', {
    effect: boardEffect(
      'Voorish Sign',
      [{ note: 'Sees invisible; fear-save advantage', duration: { type: 'rounds', rounds: 100 } }],
      { summary: 'Sees invisible; fear-save advantage', targeting: 'self', multi: false },
    ),
  }),
  'kobold-press-deepm:waft': deepMagicProfile('Waft', {
    effect: boardEffect(
      'Waft',
      [
        {
          note: 'Fly 60 ft; gentle descent on ending',
          duration: { type: 'untilSourceTurn', when: 'startOfTurn' },
          durationNote: 'Until caster next turn start',
        },
      ],
      { summary: 'Fly 60 ft; gentle descent on ending', targeting: 'self', multi: false },
    ),
  }),
  'kobold-press-deepm:walk-the-twisted-path': deepMagicProfile('Walk the Twisted Path', {}),
  'kobold-press-deepm:walking-wall': deepMagicProfile('Walking Wall', {}),
  'kobold-press-deepm:wall-of-time': deepMagicProfile('Wall of Time', {}),
  'kobold-press-deepm:warning-shout': deepMagicProfile('Warning Shout', {}),
  'kobold-press-deepm:warp-mind-and-matter': deepMagicProfile('Warp Mind and Matter', {
    mechanics: { save: { ability: 'wis', onSave: 'negates' } },
  }),
  'kobold-press-deepm:weapon-of-blood': deepMagicProfile('Weapon of Blood', {
    effect: boardEffect(
      'Weapon of Blood',
      [{ note: 'Blood dagger; spent HP cannot heal while blade lasts' }],
      {
        summary: 'Blood dagger; spent HP cannot heal while blade lasts',
        targeting: 'self',
        multi: false,
      },
    ),
  }),
  'kobold-press-deepm:weilers-ward': deepMagicProfile('Weiler’s Ward', {
    effect: boardEffect('Weiler’s Ward', [{ note: '4 orbs: reaction force damage/push' }], {
      summary: '4 orbs: reaction force damage/push',
      targeting: 'self',
      multi: false,
    }),
  }),
  'kobold-press-deepm:wild-shield': deepMagicProfile('Wild Shield', {
    effect: boardEffect(
      'Wild Shield',
      [
        {
          note: 'No Stealth; reaction repels eligible spells',
          duration: { type: 'rounds', rounds: 10 },
        },
      ],
      { summary: 'No Stealth; reaction repels eligible spells', targeting: 'self', multi: false },
    ),
  }),
  'kobold-press-deepm:wind-lash': deepMagicProfile('Wind Lash', {
    mechanics: {
      attackRoll: true,
      ...reviewedDamage([{ formula: '1d8', type: 'slashing' }], 0, [1]),
    },
    attackKind: 'melee',
  }),
  'kobold-press-deepm:wind-of-the-hereafter': deepMagicProfile('Wind of the Hereafter', {}),
  'kobold-press-deepm:wind-tunnel': deepMagicProfile('Wind Tunnel', {}),
  'kobold-press-deepm:winters-radiance': deepMagicProfile("Winter's Radiance", {
    mechanics: { save: { ability: 'con', onSave: 'negates' } },
    effect: boardEffect("Winter's Radiance", [{ note: 'Targets gain three-quarters cover' }], {
      summary: 'Targets gain three-quarters cover',
      targeting: 'enemy',
      multi: true,
    }),
  }),
  'kobold-press-deepm:winterdark': deepMagicProfile('Winterdark', {
    mechanics: {
      save: { ability: 'con', onSave: 'negates' },
      ...reviewedDamage([{ formula: '1d6', type: 'cold' }], 6, [0]),
    },
    persistsAfterSave: true,
  }),
  'kobold-press-deepm:wintry-glide': deepMagicProfile('Wintry Glide', {}),
  'kobold-press-deepm:withered-sight': deepMagicProfile('Withered Sight', {
    mechanics: { save: { ability: 'con', onSave: 'negates' } },
    effect: boardEffect(
      'Withered Sight',
      [
        { note: 'Perception disadvantage', duration: 'escape' },
        {
          modifier: {
            applies: 'attackRolls',
            mode: 'disadvantage',
            value: null,
            direction: 'outgoing',
          },
          duration: 'escape',
        },
      ],
      {
        summary: 'Perception disadvantage; Attacks: disadvantage',
        targeting: 'enemy',
        multi: true,
      },
    ),
  }),
  'kobold-press-deepm:wolfsong': deepMagicProfile('Wolfsong', {}),
  'kobold-press-deepm:word-of-misfortune': deepMagicProfile('Word of Misfortune', {
    effect: boardEffect(
      'Word of Misfortune',
      [
        {
          modifier: {
            applies: 'savingThrows',
            mode: 'flatBonus',
            value: '-1d4',
            direction: 'outgoing',
          },
          duration: { type: 'rounds', rounds: 10, endsOnRoll: true },
        },
      ],
      { summary: 'Saves: -1d4', targeting: 'enemy', multi: true },
    ),
  }),
}
