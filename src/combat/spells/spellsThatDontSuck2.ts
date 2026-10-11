// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import type { ReviewedSpellCasting } from '../reviewedSpells.ts'
import { boardEffect, sourceProfile } from './reviewedProfile.ts'

export const SPELLS_THAT_DONT_SUCK_2: Record<string, ReviewedSpellCasting> = {
  'somanyrobots-spells-that-dont-suck:conjure-beast-pack': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Conjure Beast Pack',
    {},
  ),
  'somanyrobots-spells-that-dont-suck:conjure-herald': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Conjure Herald',
    {},
  ),
  'somanyrobots-spells-that-dont-suck:conjure-minor-fiends': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Conjure Minor Fiends',
    {},
  ),
  'somanyrobots-spells-that-dont-suck:corpse-puppets': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Corpse Puppets',
    {},
  ),
  'somanyrobots-spells-that-dont-suck:corrosive-burst': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Corrosive Burst',
    {
      mechanics: {
        save: { ability: 'dex', onSave: 'half' },
        damage: [{ formula: '8d4', type: 'acid' }],
        scaling: [
          { by: 'slot', level: 5, damage: [{ formula: '10d4', type: 'acid' }] },
          { by: 'slot', level: 6, damage: [{ formula: '12d4', type: 'acid' }] },
          { by: 'slot', level: 7, damage: [{ formula: '14d4', type: 'acid' }] },
          { by: 'slot', level: 8, damage: [{ formula: '16d4', type: 'acid' }] },
          { by: 'slot', level: 9, damage: [{ formula: '18d4', type: 'acid' }] },
        ],
      },
      effect: boardEffect(
        'Corrosive Burst',
        [{ note: 'Turn end: 4d4 acid until wiped off', duration: { type: 'rounds', rounds: 10 } }],
        { summary: 'Turn end: 4d4 acid until wiped off', targeting: 'enemy', multi: true },
      ),
    },
  ),
  'somanyrobots-spells-that-dont-suck:curse-of-weakness': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Curse of Weakness',
    {},
  ),
  'somanyrobots-spells-that-dont-suck:dazzle': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Dazzle',
    {
      mechanics: { save: { ability: 'con', onSave: 'negates' } },
      effect: boardEffect(
        'Dazzle',
        [
          { condition: 'Blinded', duration: { type: 'untilSourceTurn', when: 'endOfTurn' } },
          {
            duration: { type: 'untilSourceTurn', when: 'endOfTurn' },
            modifier: { applies: 'speed', mode: 'flatBonus', value: 'half', direction: 'outgoing' },
          },
        ],
        { summary: 'Blinded; Speed: half', targeting: 'enemy', multi: true },
      ),
    },
  ),
  'somanyrobots-spells-that-dont-suck:death-ray': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Death Ray',
    {},
  ),
  'somanyrobots-spells-that-dont-suck:deflect': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Deflect',
    {},
  ),
  'somanyrobots-spells-that-dont-suck:detect-hazards': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Detect Hazards',
    {
      effect: boardEffect('Detect Hazards', [{ note: 'Senses traps within 120 ft' }], {
        summary: 'Senses traps within 120 ft',
        targeting: 'self',
        multi: false,
      }),
    },
  ),
  'somanyrobots-spells-that-dont-suck:detect-otherworldly-influence': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Detect Otherworldly Influence',
    {
      effect: boardEffect(
        'Detect Otherworldly Influence',
        [{ note: 'Senses listed types within 30 ft' }],
        { summary: 'Senses listed types within 30 ft', targeting: 'self', multi: false },
      ),
    },
  ),
  'somanyrobots-spells-that-dont-suck:devil-binding': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Devil Binding',
    {},
  ),
  'somanyrobots-spells-that-dont-suck:disrupting-smite': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Disrupting Smite',
    {
      effect: boardEffect(
        'Disrupting Smite',
        [{ note: 'Next melee hit: +5d10 force; can incapacitate' }],
        {
          summary: 'Next melee hit: +5d10 force; can incapacitate',
          targeting: 'self',
          multi: false,
        },
      ),
    },
  ),
  'somanyrobots-spells-that-dont-suck:divine-temple': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Divine Temple',
    {},
  ),
  'somanyrobots-spells-that-dont-suck:draining-bolt': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Draining Bolt',
    {
      mechanics: {
        attackRoll: true,
        damage: [{ formula: '1d6', type: 'necrotic' }],
        scaling: [
          { by: 'character', level: 5, damage: [{ formula: '2d6', type: 'necrotic' }] },
          { by: 'character', level: 11, damage: [{ formula: '3d6', type: 'necrotic' }] },
          { by: 'character', level: 17, damage: [{ formula: '4d6', type: 'necrotic' }] },
        ],
      },
      effect: boardEffect(
        'Draining Bolt',
        [
          {
            note: 'Next weapon attack: disadvantage',
            duration: { type: 'untilSourceTurn', when: 'endOfTurn' },
            turnOwner: 'target',
          },
        ],
        { summary: 'Next weapon attack: disadvantage', targeting: 'enemy', multi: false },
      ),
    },
  ),
  'somanyrobots-spells-that-dont-suck:drink-life': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Drink Life',
    {
      persistsAfterSave: true,
      mechanics: {
        save: { ability: 'con', onSave: 'half' },
        damage: [{ formula: '6d8', type: 'necrotic' }],
        scaling: [
          { by: 'slot', level: 6, damage: [{ formula: '7d8', type: 'necrotic' }] },
          { by: 'slot', level: 7, damage: [{ formula: '8d8', type: 'necrotic' }] },
          { by: 'slot', level: 8, damage: [{ formula: '9d8', type: 'necrotic' }] },
          { by: 'slot', level: 9, damage: [{ formula: '10d8', type: 'necrotic' }] },
        ],
      },
      effect: boardEffect(
        'Drink Life',
        [
          {
            modifier: { applies: 'speed', mode: 'flatBonus', value: 'half', direction: 'outgoing' },
            duration: { type: 'untilSourceTurn', when: 'startOfTurn' },
          },
        ],
        { summary: 'Speed: half', targeting: 'enemy', multi: false },
      ),
    },
  ),
  'somanyrobots-spells-that-dont-suck:dust-cyclone': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Dust Cyclone',
    {},
  ),
  'somanyrobots-spells-that-dont-suck:earth-forming': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Earth Forming',
    {},
  ),
  'somanyrobots-spells-that-dont-suck:earth-leash': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Earth Leash',
    {
      mechanics: { save: { ability: 'str', onSave: 'negates' } },
      effect: boardEffect(
        'Earth Leash',
        [
          {
            condition: 'Prone',
            concentration: false,
            durationNote: 'Prone until stood up; flight loss 1 minute',
          },
          {
            note: 'Flying speed lost',
            concentration: false,
            durationNote: 'Prone until stood up; flight loss 1 minute',
          },
        ],
        { summary: 'Prone; Flying speed lost', targeting: 'enemy', multi: false },
      ),
    },
  ),
  'somanyrobots-spells-that-dont-suck:earth-rumble': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Earth Rumble',
    {
      mechanics: {
        save: { ability: 'dex', onSave: 'half' },
        damage: [{ formula: '2d6', type: 'bludgeoning' }],
        scaling: [
          { by: 'slot', level: 2, damage: [{ formula: '3d6', type: 'bludgeoning' }] },
          { by: 'slot', level: 3, damage: [{ formula: '4d6', type: 'bludgeoning' }] },
          { by: 'slot', level: 4, damage: [{ formula: '5d6', type: 'bludgeoning' }] },
          { by: 'slot', level: 5, damage: [{ formula: '6d6', type: 'bludgeoning' }] },
          { by: 'slot', level: 6, damage: [{ formula: '7d6', type: 'bludgeoning' }] },
          { by: 'slot', level: 7, damage: [{ formula: '8d6', type: 'bludgeoning' }] },
          { by: 'slot', level: 8, damage: [{ formula: '9d6', type: 'bludgeoning' }] },
          { by: 'slot', level: 9, damage: [{ formula: '10d6', type: 'bludgeoning' }] },
        ],
      },
      effect: boardEffect(
        'Earth Rumble',
        [
          {
            condition: 'Prone',
            duration: { type: 'manual' },
            concentration: false,
            durationNote: 'Until stood up or removed',
          },
        ],
        { summary: 'Prone', targeting: 'enemy', multi: true },
      ),
    },
  ),
  'somanyrobots-spells-that-dont-suck:eldritch-armor': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Eldritch Armor',
    {
      effect: boardEffect(
        'Eldritch Armor',
        [{ note: 'While temp HP remain: melee attacker takes 2d4 acid' }],
        {
          summary: 'While temp HP remain: melee attacker takes 2d4 acid',
          targeting: 'self',
          multi: false,
        },
      ),
    },
  ),
  'somanyrobots-spells-that-dont-suck:eldritch-rift': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Eldritch Rift',
    {
      mechanics: {
        save: { ability: 'str', onSave: 'half' },
        damage: [{ formula: '3d4', type: 'necrotic' }],
        scaling: [
          { by: 'slot', level: 2, damage: [{ formula: '5d4', type: 'necrotic' }] },
          { by: 'slot', level: 3, damage: [{ formula: '7d4', type: 'necrotic' }] },
          { by: 'slot', level: 4, damage: [{ formula: '9d4', type: 'necrotic' }] },
          { by: 'slot', level: 5, damage: [{ formula: '11d4', type: 'necrotic' }] },
          { by: 'slot', level: 6, damage: [{ formula: '13d4', type: 'necrotic' }] },
          { by: 'slot', level: 7, damage: [{ formula: '15d4', type: 'necrotic' }] },
          { by: 'slot', level: 8, damage: [{ formula: '17d4', type: 'necrotic' }] },
          { by: 'slot', level: 9, damage: [{ formula: '19d4', type: 'necrotic' }] },
        ],
      },
    },
  ),
  'somanyrobots-spells-that-dont-suck:elemental-reflection': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Elemental Reflection',
    {},
  ),
  'somanyrobots-spells-that-dont-suck:elemental-shield': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Elemental Shield',
    {
      effect: boardEffect(
        'Elemental Shield',
        [{ note: 'Chosen immunity; adjacent allies resist' }],
        { summary: 'Chosen immunity; adjacent allies resist', targeting: 'self', multi: false },
      ),
    },
  ),
  'somanyrobots-spells-that-dont-suck:enkindle': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Enkindle',
    {},
  ),
  'somanyrobots-spells-that-dont-suck:erudition': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Erudition',
    {
      effect: boardEffect('Erudition', [{ note: 'Enhanced chosen skill' }], {
        summary: 'Enhanced chosen skill',
        targeting: 'self',
        multi: false,
      }),
    },
  ),
  'somanyrobots-spells-that-dont-suck:ethereal-slip': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Ethereal Slip',
    {
      effect: boardEffect('Ethereal Slip', [{ note: 'Turn end: d20 determines Ethereal shift' }], {
        summary: 'Turn end: d20 determines Ethereal shift',
        targeting: 'self',
        multi: false,
      }),
    },
  ),
  'somanyrobots-spells-that-dont-suck:expose-weakness': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Expose Weakness',
    {
      mechanics: { save: { ability: 'cha', onSave: 'negates' } },
      effect: boardEffect(
        'Expose Weakness',
        [{ note: 'Chosen resistance removed; +2d6 matching damage' }],
        {
          summary: 'Chosen resistance removed; +2d6 matching damage',
          targeting: 'enemy',
          multi: false,
        },
      ),
    },
  ),
  'somanyrobots-spells-that-dont-suck:expulsion': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Expulsion',
    {
      mechanics: { save: { ability: 'cha', onSave: 'negates' } },
      effect: boardEffect(
        'Expulsion',
        [
          { condition: 'Incapacitated', duration: { type: 'rounds', rounds: 10 } },
          {
            note: 'Resist all damage; repeated failures banish',
            duration: { type: 'rounds', rounds: 10 },
          },
        ],
        {
          summary: 'Incapacitated; Resist all damage; repeated failures banish',
          targeting: 'enemy',
          multi: true,
        },
      ),
    },
  ),
  'somanyrobots-spells-that-dont-suck:false-death': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'False Death',
    {
      effect: boardEffect(
        'False Death',
        [{ note: 'Feigning death: Prone; resist nonpsychic damage' }],
        {
          summary: 'Feigning death: Prone; resist nonpsychic damage',
          targeting: 'ally',
          multi: false,
        },
      ),
    },
  ),
}
