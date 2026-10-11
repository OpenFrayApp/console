// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { advantageAgainst } from '../effects.ts'
import type { ReviewedSpellCasting } from '../reviewedSpells.ts'
import { boardEffect, nextTurnCondition, sourceProfile } from './reviewedProfile.ts'

/** Bind a reviewed So Many Spells card to its approved source and edition. */
export function reviewed(
  name: string,
  profile: Omit<ReviewedSpellCasting, 'source' | 'edition' | 'name'>,
): ReviewedSpellCasting {
  return sourceProfile('somanyrobots-so-many-spells', '5.0', name, profile)
}

export const SO_MANY_SPELLS_CASTING: Record<string, ReviewedSpellCasting> = {
  'somanyrobots-so-many-spells:accursed-blade': reviewed('Accursed Blade', {
    effect: boardEffect('Accursed Blade', [{ note: 'Weapon: −1d4 attacks; +4d4 necrotic' }], {
      summary: 'Weapon: −1d4 attacks; +4d4 necrotic',
      targeting: 'ally',
      multi: false,
    }),
  }),
  'somanyrobots-so-many-spells:acid-jet': reviewed('Acid Jet', {
    mechanics: {
      damage: [{ formula: '12d4', type: 'acid' }],
      save: { ability: 'dex', onSave: 'half' },
    },
    effect: boardEffect(
      'Acid Jet',
      [
        {
          note: 'Next turn end: 6d4 acid unless removed',
          duration: { type: 'untilSourceTurn', when: 'endOfTurn' },
          turnOwner: 'target',
        },
      ],
      { summary: 'Next turn end: 6d4 acid unless removed', targeting: 'enemy', multi: true },
    ),
  }),
  'somanyrobots-so-many-spells:alter-metal': reviewed('Alter Metal', {}),
  'somanyrobots-so-many-spells:ambertrap': reviewed('Ambertrap', {
    mechanics: { save: { ability: 'dex', onSave: 'negates' } },
    effect: boardEffect(
      'Ambertrap',
      [
        { condition: 'Restrained', duration: { type: 'rounds', rounds: 10 } },
        { note: 'Amber: AC 14, 20 HP; destroy to free', duration: { type: 'rounds', rounds: 10 } },
      ],
      {
        summary: 'Restrained; Amber: AC 14, 20 HP; destroy to free',
        targeting: 'enemy',
        multi: false,
      },
    ),
  }),
  'somanyrobots-so-many-spells:astral-armor': reviewed('Astral Armor', {
    effect: boardEffect('Astral Armor', [{ note: 'AC 16 minimum; radiant resistance' }], {
      summary: 'AC 16 minimum; radiant resistance',
      targeting: 'self',
      multi: false,
    }),
  }),
  'somanyrobots-so-many-spells:aura-of-iron': reviewed('Aura of Iron', {
    effect: boardEffect(
      'Aura of Iron',
      [
        {
          note: 'Aura: resist next B/P/S; maximize one P/S die',
          duration: { type: 'rounds', rounds: 10 },
        },
      ],
      { summary: 'Aura: resist next B/P/S; maximize one P/S die', targeting: 'self', multi: false },
    ),
  }),
  'somanyrobots-so-many-spells:aura-of-slaughter': reviewed('Aura of Slaughter', {
    effect: boardEffect(
      'Aura of Slaughter',
      [
        {
          note: 'Aura: +1d6 necrotic on first melee hit',
          duration: { type: 'rounds', rounds: 10 },
        },
      ],
      { summary: 'Aura: +1d6 necrotic on first melee hit', targeting: 'self', multi: false },
    ),
  }),
  'somanyrobots-so-many-spells:auric-lance': reviewed('Auric Lance', {
    mechanics: { attackRoll: true, damage: [{ formula: '10d8', type: 'piercing' }] },
    effect: {
      summary: 'Advantage on attacks against target until start of caster’s next turn',
      targeting: 'enemy',
      build: ({ source }) => [
        advantageAgainst('Auric Lance', {
          source,
          duration: { type: 'untilSourceTurn', when: 'startOfTurn' },
        }),
      ],
    },
  }),
  'somanyrobots-so-many-spells:axiomatic-artillery': reviewed('Axiomatic Artillery', {
    effect: boardEffect(
      'Axiomatic Artillery',
      [
        {
          note: 'Caster next turn: 100 force (50 if interrupted)',
          duration: { type: 'untilSourceTurn', when: 'startOfTurn' },
        },
      ],
      {
        summary: 'Caster next turn: 100 force (50 if interrupted)',
        targeting: 'enemy',
        multi: false,
      },
    ),
  }),
  'somanyrobots-so-many-spells:banshee-s-wail': reviewed("Banshee's Wail", {
    mechanics: {
      damage: [{ formula: '10d8', type: 'necrotic' }],
      save: { ability: 'con', onSave: 'half' },
    },
    effect: boardEffect(
      "Banshee's Wail",
      [{ condition: 'Frightened', duration: 'escape', escapeAbility: 'wis' }],
      { summary: 'Frightened', targeting: 'enemy', multi: true },
    ),
  }),
  'somanyrobots-so-many-spells:beast-claw': reviewed('Beast Claw', {}),
  'somanyrobots-so-many-spells:bewitching-phantom': reviewed('Bewitching Phantom', {
    persistsAfterSave: true,
    mechanics: { save: { ability: 'wis', onSave: 'negates' } },
    effect: boardEffect(
      'Bewitching Phantom',
      [
        {
          condition: 'Charmed',
          durationNote: 'Until start of target’s next turn',
          duration: { type: 'manual' },
        },
        {
          note: 'Approaches specter; touching it: 2d8 necrotic',
          durationNote: 'Until start of target’s next turn',
          duration: { type: 'manual' },
        },
      ],
      {
        summary: 'Charmed; approaches specter; touching it: 2d8 necrotic',
        targeting: 'enemy',
        multi: false,
      },
    ),
  }),
  'somanyrobots-so-many-spells:black-bolt': reviewed('Black Bolt', {}),
  'somanyrobots-so-many-spells:black-moon': reviewed('Black Moon', {}),
  'somanyrobots-so-many-spells:blade-shell': reviewed('Blade Shell', {
    effect: boardEffect(
      'Blade Shell',
      [
        {
          note: 'Next melee attacker takes 2d4 piercing',
          duration: { type: 'untilSourceTurn', when: 'startOfTurn' },
        },
      ],
      { summary: 'Next melee attacker takes 2d4 piercing', targeting: 'self', multi: false },
    ),
  }),
  'somanyrobots-so-many-spells:bloody-scythe': reviewed('Bloody Scythe', {
    effect: boardEffect(
      'Bloody Scythe',
      [
        {
          note: 'Blood glaive: +1d6 necrotic; can explode',
          duration: { type: 'rounds', rounds: 100 },
        },
      ],
      { summary: 'Blood glaive: +1d6 necrotic; can explode', targeting: 'ally', multi: false },
    ),
  }),
  'somanyrobots-so-many-spells:bone-hatchet': reviewed('Bone Hatchet', {
    attackKind: 'melee',
    mechanics: {
      attackRoll: true,
      damage: [
        { formula: '1d4', type: 'slashing' },
        { formula: '1d4', type: 'necrotic' },
      ],
      scaling: [
        {
          level: 5,
          by: 'character',
          damage: [
            { formula: '1d4', type: 'slashing' },
            { formula: '2d4', type: 'necrotic' },
          ],
        },
        {
          level: 11,
          by: 'character',
          damage: [
            { formula: '1d4', type: 'slashing' },
            { formula: '3d4', type: 'necrotic' },
          ],
        },
        {
          level: 17,
          by: 'character',
          damage: [
            { formula: '1d4', type: 'slashing' },
            { formula: '4d4', type: 'necrotic' },
          ],
        },
      ],
    },
  }),
  'somanyrobots-so-many-spells:bone-spear': reviewed('Bone Spear', {
    mechanics: {
      attackRoll: true,
      damage: [
        { formula: '2d8', type: 'piercing' },
        { formula: '2d8', type: 'necrotic' },
      ],
      scaling: [
        {
          level: 4,
          by: 'slot',
          damage: [
            { formula: '3d8', type: 'piercing' },
            { formula: '3d8', type: 'necrotic' },
          ],
        },
        {
          level: 6,
          by: 'slot',
          damage: [
            { formula: '4d8', type: 'piercing' },
            { formula: '4d8', type: 'necrotic' },
          ],
        },
        {
          level: 8,
          by: 'slot',
          damage: [
            { formula: '5d8', type: 'piercing' },
            { formula: '5d8', type: 'necrotic' },
          ],
        },
      ],
    },
    effect: boardEffect(
      'Bone Spear',
      [{ note: 'Healing halved while impaled', duration: { type: 'rounds', rounds: 10 } }],
      { summary: 'Healing halved while impaled', targeting: 'enemy', multi: false },
    ),
  }),
  'somanyrobots-so-many-spells:bone-spines': reviewed('Bone Spines', {
    mechanics: {
      damage: [{ formula: '5d8', type: 'piercing' }],
      save: { ability: 'dex', onSave: 'half' },
    },
    effect: boardEffect(
      'Bone Spines',
      [{ note: 'Moving: 1d4 piercing per 5 ft', duration: { type: 'rounds', rounds: 10 } }],
      { summary: 'Moving: 1d4 piercing per 5 ft', targeting: 'enemy', multi: true },
    ),
  }),
  'somanyrobots-so-many-spells:bone-weaving': reviewed('Bone Weaving', {}),
  'somanyrobots-so-many-spells:bony-maws': reviewed('Bony Maws', {}),
  'somanyrobots-so-many-spells:chaotic-vortex': reviewed('Chaotic Vortex', {}),
  'somanyrobots-so-many-spells:cinder-cloud': reviewed('Cinder Cloud', {}),
  'somanyrobots-so-many-spells:cloak-of-wasps': reviewed('Cloak of Wasps', {
    effect: boardEffect(
      'Cloak of Wasps',
      [
        {
          note: 'Melee attacker: 1d4 piercing + 1d4 poison',
          duration: { type: 'rounds', rounds: 100 },
        },
      ],
      { summary: 'Melee attacker: 1d4 piercing + 1d4 poison', targeting: 'ally', multi: false },
    ),
  }),
  'somanyrobots-so-many-spells:conjure-poltergeist': reviewed('Conjure Poltergeist', {
    persistsAfterSave: true,
    mechanics: {
      damage: [{ formula: '2d8', type: 'bludgeoning' }],
      save: { ability: 'dex', onSave: 'negates' },
    },
  }),
  'somanyrobots-so-many-spells:conjure-weapon': reviewed('Conjure Weapon', {}),
  'somanyrobots-so-many-spells:corpselight': reviewed('Corpselight', {}),
  'somanyrobots-so-many-spells:corrosion': reviewed('Corrosion', {}),
  'somanyrobots-so-many-spells:coruscating-flash': reviewed('Coruscating Flash', {
    mechanics: {
      damage: [{ formula: '2d6', type: 'radiant' }],
      save: { ability: 'con', onSave: 'half' },
    },
    effect: nextTurnCondition('Blinded', true),
  }),
  'somanyrobots-so-many-spells:creeping-shadow': reviewed('Creeping Shadow', {
    attackKind: 'melee',
    mechanics: { attackRoll: true, damage: [{ formula: '2d10', type: 'necrotic' }] },
  }),
  'somanyrobots-so-many-spells:crown-of-entropy': reviewed('Crown of Entropy', {
    persistsAfterSave: true,
    mechanics: {
      damage: [{ formula: '6d8', type: 'necrotic' }],
      save: { ability: 'con', onSave: 'half' },
    },
  }),
  'somanyrobots-so-many-spells:crystal-blossom': reviewed('Crystal Blossom', {
    mechanics: {
      damage: [{ formula: '4d8', type: 'cold' }],
      save: { ability: 'con', onSave: 'negates' },
    },
  }),
  'somanyrobots-so-many-spells:cursed-coinage': reviewed('Cursed Coinage', {}),
  'somanyrobots-so-many-spells:deadly-light': reviewed('Deadly Light', {
    mechanics: { save: { ability: 'con', onSave: 'negates' } },
    effect: boardEffect(
      'Deadly Light',
      [
        {
          note: 'Glowing; cannot benefit from invisibility',
          duration: { type: 'untilSourceTurn', when: 'endOfTurn' },
          turnOwner: 'target',
          concentration: false,
        },
      ],
      { summary: 'Glowing; cannot benefit from invisibility', targeting: 'enemy', multi: true },
    ),
  }),
  'somanyrobots-so-many-spells:death-hex': reviewed('Death Hex', {
    mechanics: { save: { ability: 'cha', onSave: 'negates' } },
    effect: boardEffect(
      'Death Hex',
      [{ note: 'Death curse; HP halves every 24 hours', duration: { type: 'manual' } }],
      { summary: 'Death curse; HP halves every 24 hours', targeting: 'enemy', multi: false },
    ),
  }),
  'somanyrobots-so-many-spells:deathgrip': reviewed('Deathgrip', {
    mechanics: { attackRoll: true },
    effect: boardEffect(
      'Deathgrip',
      [
        {
          note: 'Turn start: 1d6 necrotic; speech requires save',
          duration: { type: 'rounds', rounds: 10 },
        },
      ],
      {
        summary: 'Turn start: 1d6 necrotic; speech requires save',
        targeting: 'enemy',
        multi: false,
      },
    ),
  }),
  'somanyrobots-so-many-spells:deathly-chill': reviewed('Deathly Chill', {}),
  'somanyrobots-so-many-spells:deepen-shadows': reviewed('Deepen Shadows', {}),
  'somanyrobots-so-many-spells:detect-treasure': reviewed('Detect Treasure', {}),
  'somanyrobots-so-many-spells:devil-s-dagger': reviewed("Devil's Dagger", {
    mechanics: {
      attackRoll: true,
      damage: [
        { formula: '2d4', type: 'fire' },
        { formula: '1d4', type: 'piercing' },
      ],
    },
    effect: boardEffect(
      "Devil's Dagger",
      [
        {
          note: 'First attack: −1d4; same die as fire damage',
          duration: { type: 'rounds', rounds: 10 },
        },
      ],
      { summary: 'First attack: −1d4; same die as fire damage', targeting: 'enemy', multi: false },
    ),
  }),
}
