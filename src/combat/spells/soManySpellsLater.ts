// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { advantageAgainst, condition } from '../effects.ts'
import type { ReviewedSpellCasting } from '../reviewedSpells.ts'
import { boardEffect, nextTurnCondition } from './reviewedProfile.ts'
import { reviewed } from './soManySpells.ts'

export const SO_MANY_SPELLS_LATER: Record<string, ReviewedSpellCasting> = {
  'somanyrobots-so-many-spells:rending-gears': reviewed('Rending Gears', {
    mechanics: {
      damage: [{ formula: '5d8', type: 'bludgeoning' }],
      save: { ability: 'dex', onSave: 'half' },
    },
  }),
  'somanyrobots-so-many-spells:revenant-s-fortitude': reviewed("Revenant's Fortitude", {
    effect: boardEffect(
      "Revenant's Fortitude",
      [{ note: 'Turn start: 10 temp HP; resist necrotic/psychic' }],
      {
        summary: 'Turn start: 10 temp HP; resist necrotic/psychic',
        targeting: 'ally',
        multi: false,
      },
    ),
  }),
  'somanyrobots-so-many-spells:reviving-call': reviewed('Reviving Call', {}),
  'somanyrobots-so-many-spells:river-of-souls': reviewed('River of Souls', {}),
  'somanyrobots-so-many-spells:rotting-sands': reviewed('Rotting Sands', {}),
  'somanyrobots-so-many-spells:savage-rush': reviewed('Savage Rush', {
    effect: boardEffect(
      'Savage Rush',
      [{ note: 'Next turn’s first hit: advantage, +1d6 damage', duration: { type: 'manual' } }],
      { summary: 'Next turn’s first hit: advantage, +1d6 damage', targeting: 'ally', multi: true },
    ),
  }),
  'somanyrobots-so-many-spells:scintillating-spray': reviewed('Scintillating Spray', {}),
  'somanyrobots-so-many-spells:screaming-skull': reviewed('Screaming Skull', {}),
  'somanyrobots-so-many-spells:searing-hammer': reviewed('Searing Hammer', {}),
  'somanyrobots-so-many-spells:sever-soul': reviewed('Sever Soul', {
    mechanics: { save: { ability: 'cha', onSave: 'negates' } },
    effect: boardEffect(
      'Sever Soul',
      [
        {
          note: 'Soul severed; worsening HP and roll penalties',
          duration: { type: 'rounds', rounds: 10 },
        },
      ],
      {
        summary: 'Soul severed; worsening HP and roll penalties',
        targeting: 'enemy',
        multi: false,
      },
    ),
  }),
  'somanyrobots-so-many-spells:shackle-of-flame': reviewed('Shackle of Flame', {
    mechanics: { save: { ability: 'dex', onSave: 'negates' } },
    effect: boardEffect(
      'Shackle of Flame',
      [
        {
          note: 'Turn start: 6d6 fire; moving can add 4d6',
          duration: { type: 'rounds', rounds: 10 },
        },
      ],
      { summary: 'Turn start: 6d6 fire; moving can add 4d6', targeting: 'enemy', multi: false },
    ),
  }),
  'somanyrobots-so-many-spells:shademail': reviewed('Shademail', {
    effect: boardEffect('Shademail', [{ note: 'Temp HP: hide advantage in dim light/darkness' }], {
      summary: 'Temp HP: hide advantage in dim light/darkness',
      targeting: 'ally',
      multi: false,
    }),
  }),
  'somanyrobots-so-many-spells:shaderazor': reviewed('Shaderazor', {
    mechanics: {
      damage: [{ formula: '3d8', type: 'necrotic' }],
      save: { ability: 'dex', onSave: 'half' },
    },
    effect: {
      summary: 'Blinded until start of target next turn',
      targeting: 'enemy',
      multi: true,
      build: ({ source, target }) => [
        condition('Blinded', {
          source: target?.combatantId ?? source,
          duration: target ? { type: 'untilSourceTurn', when: 'startOfTurn' } : { type: 'manual' },
        }),
      ],
    },
  }),
  'somanyrobots-so-many-spells:shadow-dagger': reviewed('Shadow Dagger', {
    mechanics: { attackRoll: true, damage: [{ formula: '3d8', type: 'necrotic' }] },
  }),
  'somanyrobots-so-many-spells:shadow-hunger': reviewed('Shadow Hunger', {
    mechanics: {
      damage: [{ formula: '10d8', type: 'necrotic' }],
      save: { ability: 'dex', onSave: 'half' },
    },
    effect: {
      summary: 'Blinded until end of caster next turn',
      targeting: 'enemy',
      build: ({ source }) => [
        condition('Blinded', { source, duration: { type: 'untilSourceTurn', when: 'endOfTurn' } }),
      ],
    },
  }),
  'somanyrobots-so-many-spells:shadow-phase': reviewed('Shadow Phase', {
    effect: boardEffect('Shadow Phase', [{ note: 'Shadowed; action in darkness: Invisible' }], {
      summary: 'Shadowed; action in darkness: Invisible',
      targeting: 'self',
      multi: false,
    }),
  }),
  'somanyrobots-so-many-spells:shadow-puppets': reviewed('Shadow Puppets', {}),
  'somanyrobots-so-many-spells:shape-metal': reviewed('Shape Metal', {}),
  'somanyrobots-so-many-spells:shard-rain': reviewed('Shard Rain', {
    persistsAfterSave: true,
    mechanics: {
      damage: [{ formula: '9d8', type: 'piercing' }],
      save: { ability: 'dex', onSave: 'half' },
    },
  }),
  'somanyrobots-so-many-spells:shatter-skeleton': reviewed('Shatter Skeleton', {
    mechanics: {
      damage: [{ formula: '12d8', type: 'necrotic' }],
      save: { ability: 'con', onSave: 'half' },
    },
  }),
  'somanyrobots-so-many-spells:shifting-blade': reviewed('Shifting Blade', {
    effect: boardEffect('Shifting Blade', [{ note: 'Weapon hits: +1d6 shifting damage' }], {
      summary: 'Weapon hits: +1d6 shifting damage',
      targeting: 'ally',
      multi: false,
    }),
  }),
  'somanyrobots-so-many-spells:silver-wind': reviewed('Silver Wind', {
    mechanics: {
      damage: [{ formula: '6d8', type: 'piercing' }],
      save: { ability: 'dex', onSave: 'half' },
    },
  }),
  'somanyrobots-so-many-spells:sirocco': reviewed('Sirocco', {
    mechanics: {
      damage: [{ formula: '3d6', type: 'fire' }],
      save: { ability: 'str', onSave: 'half' },
    },
  }),
  'somanyrobots-so-many-spells:skeletal-shield': reviewed('Skeletal Shield', {
    effect: boardEffect(
      'Skeletal Shield',
      [
        {
          note: 'Bone shield; shattering deals 10 necrotic',
          duration: { type: 'rounds', rounds: 100 },
        },
        {
          duration: { type: 'rounds', rounds: 100 },
          modifier: { applies: 'ac', mode: 'flatBonus', value: 2, direction: 'outgoing' },
        },
      ],
      {
        summary: 'Bone shield; shattering deals 10 necrotic; AC: +2',
        targeting: 'self',
        multi: false,
      },
    ),
  }),
  'somanyrobots-so-many-spells:sonic-blast': reviewed('Sonic Blast', {
    mechanics: {
      attackRoll: true,
      damage: [{ formula: '1d8', type: 'thunder' }],
      scaling: [
        { level: 5, by: 'character', damage: [{ formula: '2d8', type: 'thunder' }] },
        { level: 11, by: 'character', damage: [{ formula: '3d8', type: 'thunder' }] },
        { level: 17, by: 'character', damage: [{ formula: '4d8', type: 'thunder' }] },
      ],
    },
    effect: nextTurnCondition('Deafened'),
  }),
  'somanyrobots-so-many-spells:sonorous-toll': reviewed('Sonorous Toll', {
    persistsAfterSave: true,
    mechanics: { save: { ability: 'wis', onSave: 'negates' } },
    effect: boardEffect(
      'Sonorous Toll',
      [
        { condition: 'Charmed', duration: { type: 'rounds', rounds: 10 } },
        {
          note: 'Cannot leave area; outside attacks disadvantage',
          duration: { type: 'rounds', rounds: 10 },
        },
      ],
      {
        summary: 'Charmed; Cannot leave area; outside attacks disadvantage',
        targeting: 'enemy',
        multi: true,
      },
    ),
  }),
  'somanyrobots-so-many-spells:soul-leech': reviewed('Soul Leech', {
    mechanics: {
      attackRoll: true,
      damage: [{ formula: '1d8', type: 'necrotic' }],
      scaling: [
        { level: 6, by: 'slot', damage: [{ formula: '2d8', type: 'necrotic' }] },
        { level: 8, by: 'slot', damage: [{ formula: '3d8', type: 'necrotic' }] },
      ],
    },
  }),
  'somanyrobots-so-many-spells:spirit-tether': reviewed('Spirit Tether', {
    effect: boardEffect(
      'Spirit Tether',
      [{ note: 'Bonus action: transfer 2d8 HP', duration: { type: 'rounds', rounds: 100 } }],
      { summary: 'Bonus action: transfer 2d8 HP', targeting: 'ally', multi: false },
    ),
  }),
  'somanyrobots-so-many-spells:spiritcraft': reviewed('Spiritcraft', {}),
  'somanyrobots-so-many-spells:spreading-toxin': reviewed('Spreading Toxin', {
    mechanics: {
      damage: [{ formula: '4d12', type: 'poison' }],
      save: { ability: 'con', onSave: 'half' },
    },
    effect: boardEffect('Spreading Toxin', [{ condition: 'Poisoned', duration: 'escape' }], {
      summary: 'Poisoned',
      targeting: 'enemy',
      multi: false,
    }),
  }),
  'somanyrobots-so-many-spells:starburst': reviewed('Starburst', {
    mechanics: {
      damage: [{ formula: '3d6', type: 'radiant' }],
      save: { ability: 'dex', onSave: 'negates' },
    },
  }),
  'somanyrobots-so-many-spells:starfire-beam': reviewed('Starfire Beam', {
    persistsAfterSave: true,
    mechanics: {
      damage: [{ formula: '6d8', type: 'radiant' }],
      save: { ability: 'dex', onSave: 'half' },
    },
    effect: {
      summary: 'Incoming attack advantage until start of caster next turn',
      targeting: 'enemy',
      build: ({ source }) => [
        advantageAgainst('Starfire Beam', {
          source,
          duration: { type: 'untilSourceTurn', when: 'startOfTurn' },
        }),
      ],
    },
  }),
  'somanyrobots-so-many-spells:starlight': reviewed('Starlight', {}),
  'somanyrobots-so-many-spells:starlight-sword': reviewed('Starlight Sword', {}),
  'somanyrobots-so-many-spells:steal-shadow': reviewed('Steal Shadow', {
    mechanics: {
      damage: [{ formula: '5d6', type: 'necrotic' }],
      save: { ability: 'cha', onSave: 'half' },
    },
    effect: boardEffect(
      'Steal Shadow',
      [{ note: 'Shadow stolen; Stealth disadvantage', duration: { type: 'rounds', rounds: 10 } }],
      { summary: 'Shadow stolen; Stealth disadvantage', targeting: 'enemy', multi: false },
    ),
  }),
}
