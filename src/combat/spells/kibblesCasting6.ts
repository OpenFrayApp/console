// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { condition } from '../effects.ts'
import type { ReviewedSpellCasting } from '../reviewedSpells.ts'
import { kibblesDamage, kibblesProfile } from './kibblesProfile.ts'
import { boardEffect } from './reviewedProfile.ts'

export const KIBBLES_CASTING_6: Record<string, ReviewedSpellCasting> = {
  'kibblestasty-casting-compendium-v2.3:imbue-luck': kibblesProfile('Imbue Luck', {}),
  'kibblestasty-casting-compendium-v2.3:immutability': kibblesProfile('Immutability', {
    effect: boardEffect(
      'Immutability',
      [{ note: 'Form-change immune; stillness grants protection' }],
      {
        summary: 'Form-change immune; stillness grants protection',
        targeting: 'self',
        multi: false,
      },
    ),
  }),
  'kibblestasty-casting-compendium-v2.3:impact': kibblesProfile('Impact', {
    attackKind: 'melee',
    mechanics: {
      attackRoll: true,
      ...kibblesDamage([{ formula: '1d10', type: 'bludgeoning' }], 0, [1]),
    },
  }),
  'kibblestasty-casting-compendium-v2.3:induce-headache': kibblesProfile('Induce Headache', {
    effect: boardEffect(
      'Induce Headache',
      [{ note: 'Turn start: 1 psychic; concentration disadvantage' }],
      {
        summary: 'Turn start: 1 psychic; concentration disadvantage',
        targeting: 'enemy',
        multi: true,
      },
    ),
  }),
  'kibblestasty-casting-compendium-v2.3:infernal-shackles': kibblesProfile('Infernal Shackles', {
    mechanics: {
      save: { ability: 'str', onSave: 'half' },
      ...kibblesDamage([{ formula: '3d6', type: 'fire' }], 2, [0]),
    },
    effect: boardEffect(
      'Infernal Shackles',
      [
        { note: 'Failed turn-end escape: 2d6 fire', duration: 'escape' },
        {
          modifier: { applies: 'speed', mode: 'flatBonus', value: 'zero', direction: 'outgoing' },
          duration: 'escape',
        },
      ],
      { summary: 'Failed turn-end escape: 2d6 fire; Speed: zero', targeting: 'enemy', multi: true },
    ),
  }),
  'kibblestasty-casting-compendium-v2.3:infinite-edge': kibblesProfile('Infinite Edge', {
    effect: boardEffect(
      'Infinite Edge',
      [
        {
          note: 'Next weapon hit: advantage, +1d10 damage',
          duration: { type: 'untilSourceTurn', when: 'startOfTurn' },
        },
      ],
      { summary: 'Next weapon hit: advantage, +1d10 damage', targeting: 'self', multi: false },
    ),
  }),
  'kibblestasty-casting-compendium-v2.3:inner-world': kibblesProfile('Inner World', {}),
  'kibblestasty-casting-compendium-v2.3:instant-bulwark': kibblesProfile('Instant Bulwark', {}),
  'kibblestasty-casting-compendium-v2.3:instant-counter': kibblesProfile('Instant Counter', {}),
  'kibblestasty-casting-compendium-v2.3:invest-life': kibblesProfile('Invest Life', {}),
  'kibblestasty-casting-compendium-v2.3:iron-garden': kibblesProfile('Iron Garden', {
    mechanics: {
      save: { ability: 'dex', onSave: 'half' },
      ...kibblesDamage([{ formula: '6d8', type: 'piercing' }], 4, [1]),
    },
  }),
  'kibblestasty-casting-compendium-v2.3:iron-wind-strike': kibblesProfile('Iron Wind Strike', {}),
  'kibblestasty-casting-compendium-v2.3:jumping-jolt': kibblesProfile('Jumping Jolt', {}),
  'kibblestasty-casting-compendium-v2.3:karmic-reflection': kibblesProfile('Karmic Reflection', {
    effect: boardEffect(
      'Karmic Reflection',
      [
        {
          note: 'Reflects damage as radiant, up to 10 total',
          duration: { type: 'untilSourceTurn', when: 'startOfTurn' },
        },
      ],
      { summary: 'Reflects damage as radiant, up to 10 total', targeting: 'enemy', multi: true },
    ),
  }),
  'kibblestasty-casting-compendium-v2.3:killing-curse': kibblesProfile('Killing Curse', {
    effect: boardEffect(
      'Killing Curse',
      [{ note: 'Turn start: Cha save or −1d10−10 current/max HP' }],
      {
        summary: 'Turn start: Cha save or −1d10−10 current/max HP',
        targeting: 'enemy',
        multi: true,
      },
    ),
  }),
  'kibblestasty-casting-compendium-v2.3:life-link': kibblesProfile('Life Link', {
    effect: boardEffect('Life Link', [{ note: 'Linked HP: mirrors damage/healing (40 cap)' }], {
      summary: 'Linked HP: mirrors damage/healing (40 cap)',
      targeting: 'self',
      multi: false,
    }),
  }),
  'kibblestasty-casting-compendium-v2.3:life-support': kibblesProfile('Life Support', {
    effect: boardEffect(
      'Life Support',
      [{ note: 'Conscious at 0 HP; damage transfers to caster' }],
      { summary: 'Conscious at 0 HP; damage transfers to caster', targeting: 'ally', multi: false },
    ),
  }),
  'kibblestasty-casting-compendium-v2.3:lightning-charged': kibblesProfile('Lightning Charged', {
    effect: boardEffect(
      'Lightning Charged',
      [{ note: '6 discharges: 1d6 lightning on melee/grapple' }],
      { summary: '6 discharges: 1d6 lightning on melee/grapple', targeting: 'ally', multi: false },
    ),
  }),
  'kibblestasty-casting-compendium-v2.3:lightning-shot': kibblesProfile('Lightning Shot', {}),
  'kibblestasty-casting-compendium-v2.3:lightning-tendril': kibblesProfile('Lightning Tendril', {
    effect: boardEffect('Lightning Tendril', [{ note: 'Action: 1d12 lightning' }], {
      summary: 'Action: 1d12 lightning',
      targeting: 'self',
      multi: false,
    }),
  }),
  'kibblestasty-casting-compendium-v2.3:macabre-marionette': kibblesProfile('Macabre Marionette', {
    mechanics: { save: { ability: 'wis', onSave: 'negates' } },
    effect: boardEffect(
      'Macabre Marionette',
      [{ note: 'No reactions; caster can move/attack with target', duration: 'escape' }],
      {
        summary: 'No reactions; caster can move/attack with target',
        targeting: 'enemy',
        multi: true,
      },
    ),
  }),
  'kibblestasty-casting-compendium-v2.3:manipulate-earth': kibblesProfile('Manipulate Earth', {}),
  'kibblestasty-casting-compendium-v2.3:manipulate-fate': kibblesProfile('Manipulate Fate', {}),
  'kibblestasty-casting-compendium-v2.3:manipulate-fire': kibblesProfile('Manipulate Fire', {}),
  'kibblestasty-casting-compendium-v2.3:manipulate-water': kibblesProfile('Manipulate Water', {}),
  'kibblestasty-casting-compendium-v2.3:manipulate-wind': kibblesProfile('Manipulate Wind', {}),
  'kibblestasty-casting-compendium-v2.3:martial-transformation': kibblesProfile(
    'Martial Transformation',
    {
      effect: boardEffect(
        'Martial Transformation',
        [{ note: 'Weapon advantage; +2d12 force; cannot cast' }],
        { summary: 'Weapon advantage; +2d12 force; cannot cast', targeting: 'self', multi: false },
      ),
    },
  ),
  'kibblestasty-casting-compendium-v2.3:melt': kibblesProfile('Melt', {
    mechanics: {
      save: { ability: 'con', onSave: 'half' },
      ...kibblesDamage([{ formula: '10d10', type: 'fire' }], 6, [1]),
    },
  }),
  'kibblestasty-casting-compendium-v2.3:melting-glob': kibblesProfile('Melting Glob', {
    attackKind: 'ranged',
    mechanics: { attackRoll: true, ...kibblesDamage([{ formula: '4d4', type: 'acid' }], 1, [2]) },
    effect: boardEffect(
      'Melting Glob',
      [{ note: 'Turn end: 1d4 acid until wiped off', duration: { type: 'rounds', rounds: 10 } }],
      { summary: 'Turn end: 1d4 acid until wiped off', targeting: 'enemy', multi: true },
    ),
  }),
  'kibblestasty-casting-compendium-v2.3:meteor-jump': kibblesProfile('Meteor Jump', {
    mechanics: {
      save: { ability: 'str', onSave: 'half' },
      ...kibblesDamage([{ formula: '2d10', type: 'bludgeoning' }], 3, [0]),
    },
    effect: {
      summary: 'Prone',
      targeting: 'enemy',
      multi: true,
      build: ({ source }) => [
        {
          ...condition('Prone', { source, duration: { type: 'manual' } }),
          concentration: false,
          durationNote: 'Until it stands up',
        },
      ],
    },
  }),
}
