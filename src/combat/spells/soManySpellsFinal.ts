// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { condition } from '../effects.ts'
import type { ReviewedSpellCasting } from '../reviewedSpells.ts'
import { boardEffect } from './reviewedProfile.ts'
import { reviewed } from './soManySpells.ts'

export const SO_MANY_SPELLS_FINAL: Record<string, ReviewedSpellCasting> = {
  'somanyrobots-so-many-spells:steelskin': reviewed('Steelskin', {
    effect: boardEffect('Steelskin', [{ note: 'AC 19 minimum; resist B/P/S; 10 temp HP/turn' }], {
      summary: 'AC 19 minimum; resist B/P/S; 10 temp HP/turn',
      targeting: 'ally',
      multi: false,
    }),
  }),
  'somanyrobots-so-many-spells:storm-of-spirits': reviewed('Storm of Spirits', {
    mechanics: {
      damage: [{ formula: '10d8', type: 'necrotic' }],
      save: { ability: 'wis', onSave: 'half' },
    },
    effect: {
      summary: 'Frightened until end of caster next turn',
      targeting: 'enemy',
      build: ({ source }) => [
        condition('Frightened', {
          source,
          duration: { type: 'untilSourceTurn', when: 'endOfTurn' },
        }),
      ],
    },
  }),
  'somanyrobots-so-many-spells:stormwall': reviewed('Stormwall', {
    persistsAfterSave: true,
    mechanics: {
      damage: [{ formula: '4d12', type: 'lightning' }],
      save: { ability: 'dex', onSave: 'half' },
    },
  }),
  'somanyrobots-so-many-spells:summon-fell-machine': reviewed('Summon Fell Machine', {}),
  'somanyrobots-so-many-spells:summon-spider': reviewed('Summon Spider', {}),
  'somanyrobots-so-many-spells:surf-skip': reviewed('Surf Skip', {
    effect: boardEffect(
      'Surf Skip',
      [
        {
          note: 'Skims liquid; move 30 ft each turn or sink',
          duration: { type: 'rounds', rounds: 100 },
        },
      ],
      { summary: 'Skims liquid; move 30 ft each turn or sink', targeting: 'ally', multi: false },
    ),
  }),
  'somanyrobots-so-many-spells:terrifying-guise': reviewed('Terrifying Guise', {
    mechanics: { save: { ability: 'wis', onSave: 'negates' } },
    effect: boardEffect(
      'Terrifying Guise',
      [
        { condition: 'Frightened', duration: { type: 'rounds', rounds: 10 } },
        {
          note: 'Turn start: d8 terror; caster hits +1d6 psychic',
          duration: { type: 'rounds', rounds: 10 },
        },
      ],
      {
        summary: 'Frightened; Turn start: d8 terror; caster hits +1d6 psychic',
        targeting: 'enemy',
        multi: true,
      },
    ),
  }),
  'somanyrobots-so-many-spells:thorn-lance': reviewed('Thorn Lance', {
    mechanics: { attackRoll: true, damage: [{ formula: '6d8', type: 'piercing' }] },
    effect: boardEffect(
      'Thorn Lance',
      [
        {
          condition: 'Restrained',
          duration: 'escape',
          fallbackDuration: { type: 'rounds', rounds: 10 },
        },
        {
          note: 'Turn end: 2d8 piercing',
          duration: 'escape',
          fallbackDuration: { type: 'rounds', rounds: 10 },
        },
      ],
      { summary: 'Restrained; Turn end: 2d8 piercing', targeting: 'enemy', multi: false },
    ),
  }),
  'somanyrobots-so-many-spells:thunderous-chords': reviewed('Thunderous Chords', {}),
  'somanyrobots-so-many-spells:tieleman-s-cannon': reviewed('Tieleman’s Cannon', {}),
  'somanyrobots-so-many-spells:titan-s-might': reviewed('Titan’s Might', {
    effect: boardEffect(
      'Titan’s Might',
      [
        {
          note: 'Str attack/check advantage; +1d8 Str damage',
          duration: { type: 'rounds', rounds: 100 },
        },
        {
          duration: { type: 'rounds', rounds: 100 },
          modifier: {
            applies: 'attackRolls',
            mode: 'advantage',
            value: null,
            direction: 'outgoing',
            abilities: ['str'],
          },
        },
        {
          duration: { type: 'rounds', rounds: 100 },
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
        summary:
          'Str attack/check advantage; +1d8 Str damage; Attacks (str): advantage; Checks (str): advantage',
        targeting: 'self',
        multi: false,
      },
    ),
  }),
  'somanyrobots-so-many-spells:turning-ward': reviewed('Turning Ward', {
    effect: boardEffect('Turning Ward', [{ note: 'Attackers: Int save or redirected' }], {
      summary: 'Attackers: Int save or redirected',
      targeting: 'ally',
      multi: false,
    }),
  }),
  'somanyrobots-so-many-spells:twist-shadow': reviewed('Twist Shadow', {
    effect: boardEffect('Twist Shadow', [{ condition: 'Invisible' }], {
      summary: 'Invisible',
      targeting: 'self',
      multi: false,
    }),
  }),
  'somanyrobots-so-many-spells:undead-familiar': reviewed('Undead Familiar', {}),
  'somanyrobots-so-many-spells:unholy-crypt': reviewed('Unholy Crypt', {}),
  'somanyrobots-so-many-spells:vampiric-mist': reviewed('Vampiric Mist', {
    persistsAfterSave: true,
    mechanics: {
      damage: [{ formula: '2d6', type: 'necrotic' }],
      save: { ability: 'con', onSave: 'negates' },
    },
  }),
  'somanyrobots-so-many-spells:venomous-maw': reviewed('Venomous Maw', {
    attackKind: 'melee',
    mechanics: {
      attackRoll: true,
      damage: [
        { formula: '1d12', type: 'piercing' },
        { formula: '5d12', type: 'poison' },
      ],
    },
    effect: boardEffect('Venomous Maw', [{ condition: 'Poisoned', duration: 'escape' }], {
      summary: 'Poisoned',
      targeting: 'enemy',
      multi: false,
    }),
  }),
  'somanyrobots-so-many-spells:vile-harpoon': reviewed('Vile Harpoon', {
    mechanics: {
      damage: [
        { formula: '4d8', type: 'piercing' },
        { formula: '4d8', type: 'necrotic' },
      ],
      save: { ability: 'dex', onSave: 'negates' },
    },
  }),
  'somanyrobots-so-many-spells:void-rift': reviewed('Void Rift', {}),
  'somanyrobots-so-many-spells:volcanic-seep': reviewed('Volcanic Seep', {}),
  'somanyrobots-so-many-spells:voltaic-pulse': reviewed('Voltaic Pulse', {
    mechanics: {
      damage: [{ formula: '3d12', type: 'lightning' }],
      save: { ability: 'con', onSave: 'half' },
    },
  }),
  'somanyrobots-so-many-spells:waldrip-s-wondrous-wagon': reviewed("Waldrip's Wondrous Wagon", {}),
  'somanyrobots-so-many-spells:wall-of-blood': reviewed('Wall of Blood', {}),
  'somanyrobots-so-many-spells:wall-of-bones': reviewed('Wall of Bones', {}),
  'somanyrobots-so-many-spells:wall-of-insects': reviewed('Wall of Insects', {}),
  'somanyrobots-so-many-spells:wall-of-misery': reviewed('Wall of Misery', {
    persistsAfterSave: true,
    mechanics: {
      damage: [{ formula: '4d8', type: 'necrotic' }],
      save: { ability: 'cha', onSave: 'negates' },
    },
    effect: boardEffect(
      'Wall of Misery',
      [
        {
          note: 'No healing; −1d6 attacks, saves, and checks',
          duration: 'escape',
          concentration: false,
          fallbackDuration: { type: 'rounds', rounds: 10 },
        },
        {
          duration: 'escape',
          concentration: false,
          modifier: {
            applies: 'attackRolls',
            mode: 'flatBonus',
            value: '-1d6',
            direction: 'outgoing',
          },
          fallbackDuration: { type: 'rounds', rounds: 10 },
        },
        {
          duration: 'escape',
          concentration: false,
          modifier: {
            applies: 'savingThrows',
            mode: 'flatBonus',
            value: '-1d6',
            direction: 'outgoing',
          },
          fallbackDuration: { type: 'rounds', rounds: 10 },
        },
        {
          duration: 'escape',
          concentration: false,
          modifier: {
            applies: 'abilityChecks',
            mode: 'flatBonus',
            value: '-1d6',
            direction: 'outgoing',
          },
          fallbackDuration: { type: 'rounds', rounds: 10 },
        },
      ],
      {
        summary:
          'No healing; −1d6 attacks, saves, and checks; Attacks: -1d6; Saves: -1d6; Checks: -1d6',
        targeting: 'enemy',
        multi: true,
      },
    ),
  }),
  'somanyrobots-so-many-spells:wall-of-snow': reviewed('Wall of Snow', {}),
  'somanyrobots-so-many-spells:wave-of-darkness': reviewed('Wave of Darkness', {
    mechanics: {
      damage: [{ formula: '3d8', type: 'necrotic' }],
      save: { ability: 'con', onSave: 'half' },
    },
  }),
  'somanyrobots-so-many-spells:wheel-of-bone': reviewed('Wheel of Bone', {}),
  'somanyrobots-so-many-spells:whiteout': reviewed('Whiteout', {}),
  'somanyrobots-so-many-spells:wind-of-ruin': reviewed('Wind of Ruin', {
    mechanics: { save: { ability: 'cha', onSave: 'negates' } },
    effect: boardEffect(
      'Wind of Ruin',
      [
        {
          modifier: {
            applies: 'abilityChecks',
            mode: 'disadvantage',
            value: null,
            direction: 'outgoing',
            abilities: ['str', 'dex', 'con'],
          },
          duration: 'escape',
        },
        { note: 'Turn start: −2d10 current/max HP', duration: 'escape' },
        {
          duration: 'escape',
          modifier: {
            applies: 'attackRolls',
            mode: 'flatBonus',
            value: '-1d6',
            direction: 'outgoing',
          },
        },
      ],
      {
        summary:
          'Checks (str/dex/con): disadvantage; Turn start: −2d10 current/max HP; Attacks: -1d6',
        targeting: 'enemy',
        multi: true,
      },
    ),
  }),
  'somanyrobots-so-many-spells:wisdom-of-the-forgotten': reviewed('Wisdom of the Forgotten', {
    effect: boardEffect(
      'Wisdom of the Forgotten',
      [
        {
          modifier: {
            applies: 'abilityChecks',
            mode: 'advantage',
            value: null,
            direction: 'outgoing',
            abilities: ['int', 'wis'],
          },
        },
        {
          modifier: {
            applies: 'savingThrows',
            mode: 'advantage',
            value: null,
            direction: 'outgoing',
            abilities: ['int', 'wis'],
          },
        },
        { note: 'Limited failed skill checks become 20' },
      ],
      {
        summary:
          'Checks (int/wis): advantage; Saves (int/wis): advantage; Limited failed skill checks become 20',
        targeting: 'self',
        multi: false,
      },
    ),
  }),
  'somanyrobots-so-many-spells:wraithbind': reviewed('Wraithbind', {
    mechanics: {
      damage: [{ formula: '8d8', type: 'necrotic' }],
      save: { ability: 'cha', onSave: 'negates' },
    },
    effect: boardEffect(
      'Wraithbind',
      [
        {
          note: 'Death during spell: hostile wraith in 24 hours',
          duration: { type: 'rounds', rounds: 10 },
        },
      ],
      {
        summary: 'Death during spell: hostile wraith in 24 hours',
        targeting: 'enemy',
        multi: false,
      },
    ),
  }),
  'somanyrobots-so-many-spells:wraithform': reviewed('Wraithform', {
    effect: boardEffect(
      'Wraithform',
      [
        {
          note: 'Fly 50 ft; incorporeal; resist nonmagic weapons',
          duration: { type: 'rounds', rounds: 100 },
        },
      ],
      {
        summary: 'Fly 50 ft; incorporeal; resist nonmagic weapons',
        targeting: 'self',
        multi: false,
      },
    ),
  }),
}
