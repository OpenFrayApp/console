// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import type { ReviewedSpellCasting } from '../reviewedSpells.ts'
import { deepMagicProfile } from './deepMagic2020Profile.ts'
import { boardEffect, reviewedDamage } from './reviewedProfile.ts'

export const DEEP_MAGIC_2020_REMAINING_1: Record<string, ReviewedSpellCasting> = {
  'kobold-press-deepm:animated-scroll': deepMagicProfile('Animated Scroll', {}),
  'kobold-press-deepm:anticipate-arcana': deepMagicProfile('Anticipate Arcana', {
    effect: boardEffect(
      'Anticipate Arcana',
      [
        {
          note: 'Magical effect saves: advantage',
          duration: { type: 'untilSourceTurn', when: 'startOfTurn' },
          durationNote: 'Until caster next turn start',
        },
      ],
      { summary: 'Magical effect saves: advantage', targeting: 'self', multi: false },
    ),
  }),
  'kobold-press-deepm:anticipate-attack': deepMagicProfile('Anticipate Attack', {}),
  'kobold-press-deepm:anticipate-weakness': deepMagicProfile('Anticipate Weakness', {
    effect: boardEffect(
      'Anticipate Weakness',
      [
        {
          modifier: {
            applies: 'attackRolls',
            mode: 'advantage',
            value: null,
            direction: 'outgoing',
          },
          duration: { type: 'untilSourceTurn', when: 'endOfTurn' },
        },
      ],
      { summary: 'Attacks: advantage', targeting: 'self', multi: false },
    ),
  }),
  'kobold-press-deepm:arcane-sight': deepMagicProfile('Arcane Sight', {
    effect: boardEffect('Arcane Sight', [{ note: 'True Seeing; Detect Magic' }], {
      summary: 'True Seeing; Detect Magic',
      targeting: 'ally',
      multi: true,
    }),
  }),
  'kobold-press-deepm:as-you-were': deepMagicProfile('As You Were', {}),
  'kobold-press-deepm:ashen-memories': deepMagicProfile('Ashen Memories', {}),
  'kobold-press-deepm:aspect-of-the-dragon': deepMagicProfile('Aspect of the Dragon', {
    effect: boardEffect(
      'Aspect of the Dragon',
      [{ note: 'Dragon form (dragon HP)', duration: { type: 'rounds', rounds: 10 } }],
      { summary: 'Dragon form (dragon HP)', targeting: 'self', multi: false },
    ),
  }),
  'kobold-press-deepm:aspect-of-the-serpent': deepMagicProfile('Aspect of the Serpent', {
    effect: boardEffect(
      'Aspect of the Serpent',
      [
        {
          note: 'Darkvision 60 ft; blindsight 30 ft; serpent strike',
          duration: { type: 'rounds', rounds: 10 },
        },
      ],
      {
        summary: 'Darkvision 60 ft; blindsight 30 ft; serpent strike',
        targeting: 'ally',
        multi: true,
      },
    ),
  }),
  'kobold-press-deepm:aura-of-protection-or-destruction': deepMagicProfile(
    'Aura of Protection or Destruction',
    {
      effect: boardEffect(
        'Aura of Protection or Destruction',
        [{ note: 'Aura: attacks become natural 1 or 20', duration: { type: 'manual' } }],
        { summary: 'Aura: attacks become natural 1 or 20', targeting: 'self', multi: false },
      ),
    },
  ),
  'kobold-press-deepm:auspicious-warning': deepMagicProfile('Auspicious Warning', {}),
  'kobold-press-deepm:avoid-grievous-injury': deepMagicProfile('Avoid Grievous Injury', {}),
  'kobold-press-deepm:avronins-astral-assembly': deepMagicProfile('Avronin’s Astral Assembly', {
    effect: boardEffect(
      'Avronin’s Astral Assembly',
      [{ note: 'Astral projection (body Unconscious)' }],
      { summary: 'Astral projection (body Unconscious)', targeting: 'self', multi: false },
    ),
  }),
  'kobold-press-deepm:awaken-object': deepMagicProfile('Awaken Object', {}),
  'kobold-press-deepm:bad-timing': deepMagicProfile('Bad Timing', {
    mechanics: { save: { ability: 'cha', onSave: 'negates' } },
    effect: boardEffect(
      'Bad Timing',
      [{ note: 'Next attack or ability check: disadvantage', duration: { type: 'manual' } }],
      { summary: 'Next attack or ability check: disadvantage', targeting: 'enemy', multi: true },
    ),
  }),
  'kobold-press-deepm:batsense': deepMagicProfile('Batsense', {
    effect: boardEffect(
      'Batsense',
      [{ note: 'Echolocation 60 ft; fails when Deafened/silenced' }],
      {
        summary: 'Echolocation 60 ft; fails when Deafened/silenced',
        targeting: 'ally',
        multi: true,
      },
    ),
  }),
  'kobold-press-deepm:become-nightwing': deepMagicProfile('Become Nightwing', {
    effect: boardEffect(
      'Become Nightwing',
      [
        {
          note: 'Fly 60 ft; Recharge 4–6 necrotic breath',
          duration: { type: 'rounds', rounds: 10 },
        },
      ],
      { summary: 'Fly 60 ft; Recharge 4–6 necrotic breath', targeting: 'self', multi: false },
    ),
  }),
  'kobold-press-deepm:beguiling-bet': deepMagicProfile('Beguiling Bet', {
    mechanics: { save: { ability: 'wis', onSave: 'negates' } },
    effect: boardEffect(
      'Beguiling Bet',
      [{ condition: 'Charmed' }, { note: 'Compelled to skill contest' }],
      { summary: 'Charmed; Compelled to skill contest', targeting: 'enemy', multi: true },
    ),
  }),
  'kobold-press-deepm:benediction': deepMagicProfile('Benediction', {
    effect: boardEffect(
      'Benediction',
      [{ note: 'Next damage reduced by 1d4', duration: { type: 'rounds', rounds: 10 } }],
      { summary: 'Next damage reduced by 1d4', targeting: 'ally', multi: true },
    ),
  }),
  'kobold-press-deepm:bestial-fury': deepMagicProfile('Bestial Fury', {
    mechanics: { save: { ability: 'cha', onSave: 'negates' } },
    effect: boardEffect('Bestial Fury', [{ note: 'Nearest enemy: natural/unarmed attacks +1d6' }], {
      summary: 'Nearest enemy: natural/unarmed attacks +1d6',
      targeting: 'enemy',
      multi: true,
    }),
  }),
  'kobold-press-deepm:binding-oath': deepMagicProfile('Binding Oath', {}),
  'kobold-press-deepm:biting-arrow': deepMagicProfile('Biting Arrow', {}),
  'kobold-press-deepm:bitter-chains': deepMagicProfile('Bitter Chains', {
    mechanics: { attackRoll: true },
    attackKind: 'melee',
  }),
  'kobold-press-deepm:black-goats-blessing': deepMagicProfile('Black Goat’s Blessing', {
    effect: boardEffect(
      'Black Goat’s Blessing',
      [
        {
          note: 'This caster’s spells: save disadvantage',
          duration: { type: 'untilSourceTurn', when: 'endOfTurn' },
        },
      ],
      { summary: 'This caster’s spells: save disadvantage', targeting: 'enemy', multi: true },
    ),
  }),
  'kobold-press-deepm:black-hand': deepMagicProfile('Black Hand', {
    mechanics: { attackRoll: true },
    attackKind: 'ranged',
  }),
  'kobold-press-deepm:black-ribbons': deepMagicProfile('Black Ribbons', {}),
  'kobold-press-deepm:black-sunshine': deepMagicProfile('Black Sunshine', {}),
  'kobold-press-deepm:black-swan-storm': deepMagicProfile('Black Swan Storm', {
    mechanics: {
      save: { ability: 'dex', onSave: 'half' },
      ...reviewedDamage([{ formula: '2d8', type: 'force' }], 2, [1]),
    },
    persistsAfterSave: true,
  }),
  'kobold-press-deepm:black-well': deepMagicProfile('Black Well', {}),
  'kobold-press-deepm:blade-of-my-brother': deepMagicProfile('Blade of my Brother', {}),
}
