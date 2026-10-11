// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import type { ReviewedSpellCasting } from '../reviewedSpells.ts'
import { boardEffect, nextTurnCondition } from './reviewedProfile.ts'
import { reviewed } from './soManySpells.ts'

export const SO_MANY_SPELLS_MIDDLE: Record<string, ReviewedSpellCasting> = {
  'somanyrobots-so-many-spells:lion-s-roar': reviewed("Lion's Roar", {
    mechanics: { save: { ability: 'wis', onSave: 'negates' } },
    effect: boardEffect(
      "Lion's Roar",
      [
        { condition: 'Frightened', duration: 'escape' },
        { note: 'Sees caster at turn start: 1d6 psychic', duration: 'escape' },
      ],
      {
        summary: 'Frightened; Sees caster at turn start: 1d6 psychic',
        targeting: 'enemy',
        multi: true,
      },
    ),
  }),
  'somanyrobots-so-many-spells:liquid-armor': reviewed('Liquid Armor', {
    effect: boardEffect(
      'Liquid Armor',
      [
        {
          note: 'AC 16 minimum; resist next 3 B/P/S hits',
          duration: { type: 'rounds', rounds: 100 },
        },
      ],
      { summary: 'AC 16 minimum; resist next 3 B/P/S hits', targeting: 'ally', multi: false },
    ),
  }),
  'somanyrobots-so-many-spells:magma-spike': reviewed('Magma Spike', {
    mechanics: {
      damage: [
        { formula: '2d6', type: 'fire' },
        { formula: '2d6', type: 'piercing' },
      ],
      save: { ability: 'dex', onSave: 'half' },
    },
    effect: boardEffect(
      'Magma Spike',
      [
        { note: 'Turn end: 1d6 fire while impaled', duration: 'escape' },
        { duration: 'escape', condition: 'Restrained' },
      ],
      { summary: 'Turn end: 1d6 fire while impaled; Restrained', targeting: 'enemy', multi: false },
    ),
  }),
  'somanyrobots-so-many-spells:magnetic-smite': reviewed('Magnetic Smite', {
    effect: boardEffect(
      'Magnetic Smite',
      [{ note: 'Next melee hit: +4d8 bludgeoning', duration: { type: 'rounds', rounds: 10 } }],
      { summary: 'Next melee hit: +4d8 bludgeoning', targeting: 'self', multi: false },
    ),
  }),
  'somanyrobots-so-many-spells:mantle-of-darkness': reviewed('Mantle of Darkness', {
    effect: boardEffect(
      'Mantle of Darkness',
      [
        {
          note: 'Darkness; caster sees; misses can frighten',
          duration: { type: 'rounds', rounds: 100 },
        },
      ],
      { summary: 'Darkness; caster sees; misses can frighten', targeting: 'self', multi: false },
    ),
  }),
  'somanyrobots-so-many-spells:melt-flesh': reviewed('Melt Flesh', {
    mechanics: { save: { ability: 'con', onSave: 'negates' } },
    effect: boardEffect(
      'Melt Flesh',
      [
        {
          modifier: {
            applies: 'attackRolls',
            mode: 'advantage',
            value: null,
            direction: 'incoming',
          },
          note: 'Attacks against it have advantage',
          duration: 'escape',
        },
        { note: 'Turn start: 8d4 acid, +2d4 per failed escape', duration: 'escape' },
        {
          duration: 'escape',
          modifier: { applies: 'speed', mode: 'flatBonus', value: 'half', direction: 'outgoing' },
        },
      ],
      {
        summary:
          'Attacks against it have advantage; Turn start: 8d4 acid, +2d4 per failed escape; Speed: half',
        targeting: 'enemy',
        multi: false,
      },
    ),
  }),
  'somanyrobots-so-many-spells:meteor-strike': reviewed('Meteor Strike', {
    mechanics: {
      damage: [{ formula: '4d8', type: 'fire' }],
      save: { ability: 'dex', onSave: 'negates' },
    },
  }),
  'somanyrobots-so-many-spells:midnight-fire': reviewed('Midnight Fire', {
    effect: boardEffect(
      'Midnight Fire',
      [
        {
          note: 'Within 10 ft: 2d10 necrotic on entry/turn start',
          duration: { type: 'rounds', rounds: 10 },
        },
      ],
      {
        summary: 'Within 10 ft: 2d10 necrotic on entry/turn start',
        targeting: 'self',
        multi: false,
      },
    ),
  }),
  'somanyrobots-so-many-spells:molten-shard': reviewed('Molten Shard', {
    mechanics: {
      attackRoll: true,
      damage: [
        { formula: '2d8', type: 'piercing' },
        { formula: '2d8', type: 'fire' },
      ],
    },
    effect: boardEffect(
      'Molten Shard',
      [
        {
          modifier: {
            applies: 'attackRolls',
            mode: 'disadvantage',
            value: null,
            direction: 'outgoing',
          },
          duration: { type: 'manual' },
          durationNote: 'Until shard removed',
        },
        {
          note: 'Turn end: 1d8 fire until shard removed',
          duration: { type: 'manual' },
          durationNote: 'Until shard removed',
        },
      ],
      {
        summary: 'Attacks: disadvantage; Turn end: 1d8 fire until shard removed',
        targeting: 'enemy',
        multi: false,
      },
    ),
  }),
  'somanyrobots-so-many-spells:moonlit-glade': reviewed('Moonlit Glade', {}),
  'somanyrobots-so-many-spells:moonrock': reviewed('Moonrock', {
    mechanics: {
      damage: [{ formula: '2d10', type: 'bludgeoning' }],
      save: { ability: 'dex', onSave: 'negates' },
    },
  }),
  'somanyrobots-so-many-spells:moonstrike': reviewed('Moonstrike', {
    mechanics: { save: { ability: 'wis', onSave: 'negates' } },
    effect: boardEffect(
      'Moonstrike',
      [{ note: 'Short-term madness', duration: { type: 'manual' } }],
      { summary: 'Short-term madness', targeting: 'enemy', multi: false },
    ),
  }),
  'somanyrobots-so-many-spells:mummy-fist': reviewed('Mummy Fist', {
    effect: boardEffect(
      'Mummy Fist',
      [{ note: 'Melee hits: +1d12 necrotic; can cause mummy rot' }],
      {
        summary: 'Melee hits: +1d12 necrotic; can cause mummy rot',
        targeting: 'ally',
        multi: false,
      },
    ),
  }),
  'somanyrobots-so-many-spells:murder-of-crows': reviewed('Murder of Crows', {}),
  'somanyrobots-so-many-spells:necrotic-mine': reviewed('Necrotic Mine', {}),
  'somanyrobots-so-many-spells:oozeform': reviewed('Oozeform', {
    effect: boardEffect(
      'Oozeform',
      [
        {
          note: 'Acid immune; melee attacker takes 2d4 acid',
          duration: { type: 'rounds', rounds: 100 },
        },
      ],
      { summary: 'Acid immune; melee attacker takes 2d4 acid', targeting: 'self', multi: false },
    ),
  }),
  'somanyrobots-so-many-spells:osseous-weapon': reviewed('Osseous Weapon', {
    effect: boardEffect(
      'Osseous Weapon',
      [
        {
          note: 'Weapon hits: +1d4 necrotic; can shatter',
          duration: { type: 'rounds', rounds: 10 },
        },
      ],
      { summary: 'Weapon hits: +1d4 necrotic; can shatter', targeting: 'ally', multi: false },
    ),
  }),
  'somanyrobots-so-many-spells:phantom-web': reviewed('Phantom Web', {}),
  'somanyrobots-so-many-spells:plague-arrow': reviewed('Plague Arrow', {}),
  'somanyrobots-so-many-spells:plague-of-rats': reviewed('Plague of Rats', {}),
  'somanyrobots-so-many-spells:poison-light': reviewed('Poison Light', {
    mechanics: { save: { ability: 'con', onSave: 'negates' } },
    effect: nextTurnCondition('Poisoned'),
  }),
  'somanyrobots-so-many-spells:poison-nova': reviewed('Poison Nova', {
    mechanics: { save: { ability: 'con', onSave: 'negates' } },
    effect: boardEffect('Poison Nova', [{ condition: 'Poisoned', duration: 'escape' }], {
      summary: 'Poisoned',
      targeting: 'enemy',
      multi: true,
    }),
  }),
  'somanyrobots-so-many-spells:prismatic-shield': reviewed('Prismatic Shield', {}),
  'somanyrobots-so-many-spells:putrefy': reviewed('Putrefy', {
    mechanics: { save: { ability: 'con', onSave: 'negates' } },
    effect: boardEffect(
      'Putrefy',
      [
        { condition: 'Poisoned', duration: 'escape' },
        { note: 'Turn start: 3d10 necrotic', duration: 'escape' },
      ],
      { summary: 'Poisoned; Turn start: 3d10 necrotic', targeting: 'enemy', multi: false },
    ),
  }),
  'somanyrobots-so-many-spells:putrid-aura': reviewed('Putrid Aura', {
    effect: boardEffect(
      'Putrid Aura',
      [
        {
          note: 'Turn start in aura: Con save or Poisoned',
          duration: { type: 'rounds', rounds: 10 },
        },
      ],
      { summary: 'Turn start in aura: Con save or Poisoned', targeting: 'ally', multi: false },
    ),
  }),
  'somanyrobots-so-many-spells:quicksand': reviewed('Quicksand', {}),
  'somanyrobots-so-many-spells:quicksilver-lash': reviewed('Quicksilver Lash', {
    attackKind: 'melee',
    mechanics: { attackRoll: true, damage: [{ formula: '6d8', type: 'slashing' }] },
  }),
  'somanyrobots-so-many-spells:rain-of-coins': reviewed('Rain of Coins', {}),
  'somanyrobots-so-many-spells:rain-of-ooze': reviewed('Rain of Ooze', {}),
  'somanyrobots-so-many-spells:rattle-bones': reviewed('Rattle Bones', {
    mechanics: {
      damage: [{ formula: '6d8', type: 'necrotic' }],
      save: { ability: 'con', onSave: 'negates' },
    },
    effect: boardEffect(
      'Rattle Bones',
      [
        {
          modifier: { applies: 'speed', mode: 'flatBonus', value: 'half', direction: 'outgoing' },
          duration: { type: 'untilSourceTurn', when: 'endOfTurn' },
          turnOwner: 'target',
        },
      ],
      { summary: 'Speed: half', targeting: 'enemy', multi: false },
    ),
  }),
  'somanyrobots-so-many-spells:raven-s-rake': reviewed("Raven's Rake", {
    mechanics: {
      damage: [{ formula: '4d8', type: 'slashing' }],
      save: { ability: 'dex', onSave: 'half' },
    },
  }),
  'somanyrobots-so-many-spells:raven-s-wings': reviewed("Raven's Wings", {
    mechanics: {
      damage: [{ formula: '5d8', type: 'slashing' }],
      save: { ability: 'str', onSave: 'half' },
    },
  }),
  'somanyrobots-so-many-spells:reanimating-smite': reviewed('Reanimating Smite', {
    effect: boardEffect(
      'Reanimating Smite',
      [
        {
          note: 'Next melee hit: +4d8 necrotic; soul rot',
          duration: { type: 'rounds', rounds: 10 },
        },
      ],
      { summary: 'Next melee hit: +4d8 necrotic; soul rot', targeting: 'self', multi: false },
    ),
  }),
  'somanyrobots-so-many-spells:reanimation-mass': reviewed('Reanimation, Mass', {}),
  'somanyrobots-so-many-spells:reap-soul': reviewed('Reap Soul', {
    mechanics: {
      damage: [{ formula: '8d8+50', type: 'necrotic' }],
      save: { ability: 'cha', onSave: 'half' },
    },
  }),
}
