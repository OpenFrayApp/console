// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { condition } from '../effects.ts'
import type { ReviewedSpellCasting } from '../reviewedSpells.ts'
import { boardEffect } from './reviewedProfile.ts'
import { reviewed } from './soManySpells.ts'

export const SO_MANY_SPELLS_REMAINDER: Record<string, ReviewedSpellCasting> = {
  'somanyrobots-so-many-spells:disguise-creature': reviewed('Disguise Creature', {}),
  'somanyrobots-so-many-spells:disposable-skeleton': reviewed('Disposable Skeleton', {}),
  'somanyrobots-so-many-spells:dragonmaw': reviewed('Dragonmaw', {
    effect: boardEffect(
      'Dragonmaw',
      [
        {
          note: 'Chosen resistance; dragon bite and breath',
          duration: { type: 'rounds', rounds: 100 },
        },
      ],
      { summary: 'Chosen resistance; dragon bite and breath', targeting: 'ally', multi: false },
    ),
  }),
  'somanyrobots-so-many-spells:eagle-s-wings': reviewed("Eagle's Wings", {
    effect: boardEffect("Eagle's Wings", [{ note: 'Fly 60 ft; diving melee hit +4d6 damage' }], {
      summary: 'Fly 60 ft; diving melee hit +4d6 damage',
      targeting: 'ally',
      multi: true,
    }),
  }),
  'somanyrobots-so-many-spells:ebon-spear': reviewed('Ebon Spear', {
    mechanics: { attackRoll: true, damage: [{ formula: '7d10', type: 'necrotic' }] },
  }),
  'somanyrobots-so-many-spells:eclipse': reviewed('Eclipse', {
    persistsAfterSave: true,
    mechanics: {
      damage: [{ formula: '4d8', type: 'radiant' }],
      save: { ability: 'dex', onSave: 'half' },
    },
  }),
  'somanyrobots-so-many-spells:enveloping-blackness': reviewed('Enveloping Blackness', {}),
  'somanyrobots-so-many-spells:fetid-blade': reviewed('Fetid Blade', {
    effect: boardEffect(
      'Fetid Blade',
      [
        {
          note: 'Weapon hits: +1d12 poison; can poison target',
          duration: { type: 'rounds', rounds: 100 },
        },
      ],
      { summary: 'Weapon hits: +1d12 poison; can poison target', targeting: 'ally', multi: false },
    ),
  }),
  'somanyrobots-so-many-spells:field-of-rot': reviewed('Field of Rot', {}),
  'somanyrobots-so-many-spells:flashdaggers': reviewed('Flashdaggers', {
    mechanics: {
      damage: [{ formula: '5d4', type: 'piercing' }],
      save: { ability: 'dex', onSave: 'half' },
    },
  }),
  'somanyrobots-so-many-spells:force-barrier': reviewed('Force Barrier', {
    effect: boardEffect(
      'Force Barrier',
      [
        { note: 'Resist force/B/P/S; no reactions', duration: { type: 'rounds', rounds: 10 } },
        {
          duration: { type: 'rounds', rounds: 10 },
          modifier: { applies: 'speed', mode: 'flatBonus', value: 'half', direction: 'outgoing' },
        },
      ],
      { summary: 'Resist force/B/P/S; no reactions; Speed: half', targeting: 'self', multi: false },
    ),
  }),
  'somanyrobots-so-many-spells:form-of-bone': reviewed('Form of Bone', {
    effect: boardEffect(
      'Form of Bone',
      [
        {
          note: 'Resist P/S; poison immune; grasping hands',
          duration: { type: 'rounds', rounds: 100 },
        },
      ],
      { summary: 'Resist P/S; poison immune; grasping hands', targeting: 'self', multi: false },
    ),
  }),
  'somanyrobots-so-many-spells:ghastly-stampede': reviewed('Ghastly Stampede', {}),
  'somanyrobots-so-many-spells:ghost-in-the-machine': reviewed('Ghost in the Machine', {}),
  'somanyrobots-so-many-spells:ghoul-touch': reviewed('Ghoul Touch', {
    effect: boardEffect(
      'Ghoul Touch',
      [
        {
          note: 'Claws: 1d6 slashing + 1d6 necrotic; can paralyze',
          duration: { type: 'rounds', rounds: 10 },
        },
      ],
      {
        summary: 'Claws: 1d6 slashing + 1d6 necrotic; can paralyze',
        targeting: 'self',
        multi: false,
      },
    ),
  }),
  'somanyrobots-so-many-spells:glacial-axe': reviewed('Glacial Axe', {
    effect: boardEffect(
      'Glacial Axe',
      [{ note: 'Axe: +2d4 cold; hits slow target', duration: { type: 'rounds', rounds: 10 } }],
      { summary: 'Axe: +2d4 cold; hits slow target', targeting: 'self', multi: false },
    ),
  }),
  'somanyrobots-so-many-spells:gloamblast': reviewed('Gloamblast', {}),
  'somanyrobots-so-many-spells:grasping-dead': reviewed('Grasping Dead', {
    persistsAfterSave: true,
    mechanics: { save: { ability: 'str', onSave: 'negates' } },
    effect: boardEffect(
      'Grasping Dead',
      [
        { note: 'Turn start: 2d4 bludgeoning', duration: 'escape' },
        {
          duration: 'escape',
          modifier: { applies: 'speed', mode: 'flatBonus', value: 'zero', direction: 'outgoing' },
        },
      ],
      { summary: 'Turn start: 2d4 bludgeoning; Speed: zero', targeting: 'enemy', multi: true },
    ),
  }),
  'somanyrobots-so-many-spells:grave-passage': reviewed('Grave Passage', {}),
  'somanyrobots-so-many-spells:grave-wallop': reviewed('Grave Wallop', {
    attackKind: 'melee',
    mechanics: { attackRoll: true, damage: [{ formula: '1d10', type: 'bludgeoning' }] },
    effect: {
      summary: 'Knocked prone',
      targeting: 'enemy',
      build: ({ source }) => [
        { ...condition('Prone', { source }), durationNote: 'Until stood up or cleared' },
      ],
    },
  }),
  'somanyrobots-so-many-spells:gravitic-field': reviewed('Gravitic Field', {
    effect: boardEffect(
      'Gravitic Field',
      [
        {
          note: 'Ranged attacks blocked; difficult terrain',
          duration: { type: 'rounds', rounds: 100 },
        },
      ],
      { summary: 'Ranged attacks blocked; difficult terrain', targeting: 'self', multi: false },
    ),
  }),
  'somanyrobots-so-many-spells:gravity-slam': reviewed('Gravity Slam', {
    mechanics: {
      damage: [{ formula: '6d8', type: 'bludgeoning' }],
      save: { ability: 'str', onSave: 'half' },
    },
    effect: {
      summary: 'Prone; Restrained until target next turn starts',
      targeting: 'enemy',
      multi: true,
      build: ({ source, target }) => [
        { ...condition('Prone', { source }), durationNote: 'Until stood up or cleared' },
        condition('Restrained', {
          source: target?.combatantId ?? source,
          duration: target ? { type: 'untilSourceTurn', when: 'startOfTurn' } : { type: 'manual' },
        }),
      ],
    },
  }),
  'somanyrobots-so-many-spells:hateful-spirits': reviewed('Hateful Spirits', {}),
  'somanyrobots-so-many-spells:howl-of-the-moon': reviewed('Howl of the Moon', {
    effect: boardEffect(
      'Howl of the Moon',
      [
        {
          note: 'First melee hit: +2d4 radiant (+3d4 by moon)',
          duration: { type: 'rounds', rounds: 10 },
        },
      ],
      { summary: 'First melee hit: +2d4 radiant (+3d4 by moon)', targeting: 'ally', multi: true },
    ),
  }),
  'somanyrobots-so-many-spells:incandescent-blade': reviewed('Incandescent Blade', {}),
  'somanyrobots-so-many-spells:infectious-jig': reviewed('Infectious Jig', {
    mechanics: { save: { ability: 'wis', onSave: 'negates' } },
    effect: boardEffect(
      'Infectious Jig',
      [{ note: 'Turn start: move up to 20 ft as directed', duration: 'escape' }],
      { summary: 'Turn start: move up to 20 ft as directed', targeting: 'enemy', multi: false },
    ),
  }),
  'somanyrobots-so-many-spells:instant-guardian': reviewed('Instant Guardian', {}),
  'somanyrobots-so-many-spells:irresistible-melody': reviewed('Irresistible Melody', {
    persistsAfterSave: true,
    mechanics: { save: { ability: 'wis', onSave: 'negates' } },
    effect: boardEffect(
      'Irresistible Melody',
      [
        { condition: 'Charmed', duration: 'escape' },
        { condition: 'Incapacitated', duration: 'escape' },
        { note: 'Must approach melody', duration: 'escape' },
      ],
      { summary: 'Charmed; Incapacitated; Must approach melody', targeting: 'enemy', multi: true },
    ),
  }),
  'somanyrobots-so-many-spells:keen-weapon': reviewed('Keen Weapon', {
    effect: boardEffect(
      'Keen Weapon',
      [{ note: 'Weapon hits: +1d6 weapon damage', duration: { type: 'rounds', rounds: 10 } }],
      { summary: 'Weapon hits: +1d6 weapon damage', targeting: 'ally', multi: true },
    ),
  }),
  'somanyrobots-so-many-spells:latching-beetle': reviewed('Latching Beetle', {
    mechanics: {
      damage: [{ formula: '3d4', type: 'piercing' }],
      save: { ability: 'con', onSave: 'negates' },
    },
    effect: boardEffect(
      'Latching Beetle',
      [
        {
          note: 'Turn end: Con save or 3d4 poison and Poisoned',
          duration: { type: 'rounds', rounds: 10 },
        },
      ],
      {
        summary: 'Turn end: Con save or 3d4 poison and Poisoned',
        targeting: 'enemy',
        multi: false,
      },
    ),
  }),
  'somanyrobots-so-many-spells:lead-to-gold': reviewed('Lead to Gold', {}),
  'somanyrobots-so-many-spells:lich-s-mantle': reviewed("Lich's Mantle", {}),
  'somanyrobots-so-many-spells:lightfoot': reviewed('Lightfoot', {}),
  'somanyrobots-so-many-spells:lightning-spike': reviewed('Lightning Spike', {}),
  'somanyrobots-so-many-spells:lightning-sprint': reviewed('Lightning Sprint', {
    mechanics: {
      damage: [{ formula: '2d4', type: 'lightning' }],
      save: { ability: 'dex', onSave: 'negates' },
    },
  }),
}
