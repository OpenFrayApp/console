// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { condition } from '../effects.ts'
import type { ReviewedSpellCasting } from '../reviewedSpells.ts'
import { kibblesDamage, kibblesProfile } from './kibblesProfile.ts'
import { boardEffect } from './reviewedProfile.ts'

export const KIBBLES_CASTING_8: Record<string, ReviewedSpellCasting> = {
  'kibblestasty-casting-compendium-v2.3:rotting-curse': kibblesProfile('Rotting Curse', {
    effect: boardEffect('Rotting Curse', [{ note: 'Damage adds 1d4 necrotic; healing halved' }], {
      summary: 'Damage adds 1d4 necrotic; healing halved',
      targeting: 'enemy',
      multi: true,
    }),
  }),
  'kibblestasty-casting-compendium-v2.3:sanctified-charge': kibblesProfile('Sanctified Charge', {}),
  'kibblestasty-casting-compendium-v2.3:sanguine-doom': kibblesProfile('Sanguine Doom', {
    mechanics: { save: { ability: 'wis', onSave: 'negates' } },
    effect: boardEffect(
      'Sanguine Doom',
      [
        {
          note: 'Next attack hit becomes critical',
          duration: { type: 'manual' },
          durationNote: 'Until the next attack hits',
        },
      ],
      { summary: 'Next attack hit becomes critical', targeting: 'enemy', multi: true },
    ),
  }),
  'kibblestasty-casting-compendium-v2.3:sanguine-spears': kibblesProfile('Sanguine Spears', {
    effect: boardEffect('Sanguine Spears', [{ note: '3 blood spears; later hits heal 5 HP' }], {
      summary: '3 blood spears; later hits heal 5 HP',
      targeting: 'self',
      multi: false,
    }),
  }),
  'kibblestasty-casting-compendium-v2.3:seeking-orb': kibblesProfile('Seeking Orb', {}),
  'kibblestasty-casting-compendium-v2.3:seeking-projectile': kibblesProfile(
    'Seeking Projectile',
    {},
  ),
  'kibblestasty-casting-compendium-v2.3:seismic-wave': kibblesProfile('Seismic Wave', {
    mechanics: {
      save: { ability: 'str', onSave: 'half' },
      ...kibblesDamage([{ formula: '4d10', type: 'bludgeoning' }], 3, [0]),
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
  'kibblestasty-casting-compendium-v2.3:sense-blood': kibblesProfile('Sense Blood', {
    effect: boardEffect(
      'Sense Blood',
      [{ note: 'Perception/Insight advantage vs creatures with blood' }],
      {
        summary: 'Perception/Insight advantage vs creatures with blood',
        targeting: 'self',
        multi: false,
      },
    ),
  }),
  'kibblestasty-casting-compendium-v2.3:shadow-bind': kibblesProfile('Shadow Bind', {
    mechanics: { save: { ability: 'str', onSave: 'negates' } },
    effect: boardEffect('Shadow Bind', [{ condition: 'Restrained', duration: 'escape' }], {
      summary: 'Restrained',
      targeting: 'enemy',
      multi: true,
    }),
  }),
  'kibblestasty-casting-compendium-v2.3:shadow-lash': kibblesProfile('Shadow Lash', {
    attackKind: 'melee',
    mechanics: {
      attackRoll: true,
      ...kibblesDamage([{ formula: '2d4', type: 'psychic' }], 0, [2]),
    },
  }),
  'kibblestasty-casting-compendium-v2.3:shattering-shield': kibblesProfile('Shattering Shield', {}),
  'kibblestasty-casting-compendium-v2.3:shockwave': kibblesProfile('Shockwave', {
    mechanics: {
      save: { ability: 'str', onSave: 'half' },
      ...kibblesDamage([{ formula: '8d6', type: 'bludgeoning' }], 5, [0]),
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
  'kibblestasty-casting-compendium-v2.3:sky-burst': kibblesProfile('Sky Burst', {
    mechanics: {
      save: { ability: 'dex', onSave: 'half' },
      ...kibblesDamage([{ formula: '4d12+4', type: 'lightning' }], 5, [0]),
    },
  }),
  'kibblestasty-casting-compendium-v2.3:sonic-shriek': kibblesProfile('Sonic Shriek', {
    mechanics: {
      save: { ability: 'con', onSave: 'half' },
      ...kibblesDamage([{ formula: '6d8', type: 'thunder' }], 5, [1]),
    },
  }),
  'kibblestasty-casting-compendium-v2.3:spatial-manipulation': kibblesProfile(
    'Spatial Manipulation',
    {
      mechanics: { save: { ability: 'cha', onSave: 'negates' } },
    },
  ),
  'kibblestasty-casting-compendium-v2.3:spatial-swap': kibblesProfile('Spatial Swap', {
    mechanics: { save: { ability: 'cha', onSave: 'negates' } },
  }),
  'kibblestasty-casting-compendium-v2.3:spelltrap': kibblesProfile('Spelltrap', {
    effect: boardEffect('Spelltrap', [{ note: 'Absorbs next eligible spell on successful save' }], {
      summary: 'Absorbs next eligible spell on successful save',
      targeting: 'self',
      multi: false,
    }),
  }),
  'kibblestasty-casting-compendium-v2.3:spider-bite': kibblesProfile('Spider Bite', {
    attackKind: 'melee',
    mechanics: {
      attackRoll: true,
      ...kibblesDamage([{ formula: '4d12', type: 'poison' }], 3, [1]),
    },
  }),
  'kibblestasty-casting-compendium-v2.3:spirit-echo': kibblesProfile('Spirit Echo', {
    effect: boardEffect(
      'Spirit Echo',
      [{ note: 'First weapon attack gets half-damage force echo' }],
      {
        summary: 'First weapon attack gets half-damage force echo',
        targeting: 'self',
        multi: false,
      },
    ),
  }),
  'kibblestasty-casting-compendium-v2.3:spiritual-consultation': kibblesProfile(
    'Spiritual Consultation',
    {
      effect: boardEffect(
        'Spiritual Consultation',
        [{ note: 'Chosen skill proficiency; spirit can make checks' }],
        {
          summary: 'Chosen skill proficiency; spirit can make checks',
          targeting: 'self',
          multi: false,
        },
      ),
    },
  ),
  'kibblestasty-casting-compendium-v2.3:split-timeline': kibblesProfile('Split Timeline', {}),
  'kibblestasty-casting-compendium-v2.3:sprout-tree': kibblesProfile('Sprout Tree', {}),
  'kibblestasty-casting-compendium-v2.3:star-dust': kibblesProfile('Star Dust', {}),
  'kibblestasty-casting-compendium-v2.3:star-scry': kibblesProfile('Star Scry', {}),
  'kibblestasty-casting-compendium-v2.3:starfall': kibblesProfile('Starfall', {
    mechanics: {
      save: { ability: 'dex', onSave: 'half' },
      ...kibblesDamage([{ formula: '4d8', type: 'radiant' }], 4, [0]),
    },

    persistsAfterSave: true,
  }),
  'kibblestasty-casting-compendium-v2.3:static-field': kibblesProfile('Static Field', {}),
  'kibblestasty-casting-compendium-v2.3:stinging-swarm': kibblesProfile('Stinging Swarm', {}),
  'kibblestasty-casting-compendium-v2.3:stirge-swarm': kibblesProfile('Stirge Swarm', {}),
  'kibblestasty-casting-compendium-v2.3:stone-coffin': kibblesProfile('Stone Coffin', {
    mechanics: { save: { ability: 'dex', onSave: 'negates' } },
    effect: boardEffect(
      'Stone Coffin',
      [
        { note: 'Coffin: AC 15, 50 HP; crush 1d10 bludgeoning' },
        { condition: 'Blinded' },
        { condition: 'Restrained' },
      ],
      {
        summary: 'Coffin: AC 15, 50 HP; crush 1d10 bludgeoning; Blinded; Restrained',
        targeting: 'enemy',
        multi: true,
      },
    ),
  }),
  'kibblestasty-casting-compendium-v2.3:stone-fist': kibblesProfile('Stone Fist', {
    attackKind: 'melee',
    mechanics: {
      attackRoll: true,
      ...kibblesDamage([{ formula: '2d10', type: 'bludgeoning' }], 1, [1]),
    },
  }),
}
