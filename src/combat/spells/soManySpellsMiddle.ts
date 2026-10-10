// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import type { ReviewedSpellCasting } from '../reviewedSpells.ts'
import { advantageAgainst, condition, modifierEffect, reminder } from '../effects.ts'
import { nextTurnCondition, ruleReminder } from './reviewedProfile.ts'
import { reviewed } from './soManySpells.ts'

export const SO_MANY_SPELLS_MIDDLE: Record<string, ReviewedSpellCasting> = {
  'somanyrobots-so-many-spells:lion-s-roar': reviewed("Lion's Roar", {
    mechanics: { save: { ability: 'wis', onSave: 'negates' } },
    effect: {
      summary: 'Frightened; caster-only attack advantage and conditional turn-start damage',
      targeting: 'enemy',
      multi: true,
      build: ({ source }) => [
        condition('Frightened', { source, duration: { type: 'rounds', rounds: 10 } }),
        reminder(
          "Lion's Roar",
          'Caster attacks have advantage against affected creature only. Start target turn, if it sees caster: 1d6 psychic. End-turn Wisdom escape save.',
          { source, duration: { type: 'rounds', rounds: 10 } },
        ),
      ],
    },
    manual:
      'Select chosen creatures within 30 feet. No initial damage. Resolve caster-only advantage, sight-dependent damage, and escape manually; remove bundle on escape. Do not give every attacker advantage.',
  }),
  'somanyrobots-so-many-spells:liquid-armor': reviewed('Liquid Armor', {
    effect: ruleReminder(
      'Liquid Armor',
      'AC floor 16; resistance to next 3 instances of bludgeoning/piercing/slashing damage, then spell ends.',
      { type: 'rounds', rounds: 100 },
      'ally',
    ),
    manual:
      'Choose willing touched creature. Set AC floor and count damage instances manually, restoring previous AC when spell ends. +1 resisted instance per slot above 2nd. No permanent resistance or additive AC bonus.',
  }),
  'somanyrobots-so-many-spells:magma-spike': reviewed('Magma Spike', {
    mechanics: {
      damage: [
        { formula: '2d6', type: 'fire' },
        { formula: '2d6', type: 'piercing' },
      ],
      save: { ability: 'dex', onSave: 'half' },
    },
    effect: ruleReminder(
      'Magma Spike',
      'Large-or-smaller failures: impaled and Restrained, 1d6 fire each turn end, then Dexterity escape save.',
      { type: 'manual' },
    ),
    manual:
      'Choose one visible creature. Manually apply Restrained only if Large or smaller; Huge/Gargantuan take damage without impalement. Resolve later fire and end-turn escape saves manually, removing reminder/condition on escape. Instantaneous duration does not grant a 1-minute escape timer.',
  }),
  'somanyrobots-so-many-spells:magnetic-smite': reviewed('Magnetic Smite', {
    effect: ruleReminder(
      'Magnetic Smite',
      'Next melee weapon hit: +4d8 bludgeoning. Target each turn start rolls any die: odd attack disadvantage, even half speed, until next turn starts. End-turn Strength save ends spell.',
      { type: 'rounds', rounds: 10 },
      'self',
    ),
    manual:
      'No initial attack/save/damage. Track next-hit trigger then mark target and resolve random impairment and escape manually. +1d8 bonus damage per slot above 4th; never grant unconditional disadvantage before the die result.',
  }),
  'somanyrobots-so-many-spells:mantle-of-darkness': reviewed('Mantle of Darkness', {
    effect: ruleReminder(
      'Mantle of Darkness',
      'Own space magical darkness, caster sees normally. Bonus action extinguishes eligible light within 30 feet. Melee miss against caster: Wisdom save or Frightened until end of caster next turn.',
      { type: 'rounds', rounds: 100 },
      'self',
    ),
    manual:
      'No initial save/damage. Resolve sight, eligible light (not spells 3rd+), and miss-triggered saves manually. Fear ends on caster timing, not attacker timing; no blanket disadvantage beyond actual visibility rules.',
  }),
  'somanyrobots-so-many-spells:melt-flesh': reviewed('Melt Flesh', {
    mechanics: { save: { ability: 'con', onSave: 'negates' } },
    effect: {
      summary: 'Incoming attack advantage; half speed and escalating turn-start acid',
      targeting: 'enemy',
      build: ({ source }) => [
        advantageAgainst('Melt Flesh', { source, duration: { type: 'rounds', rounds: 10 } }),
        reminder(
          'Melt Flesh',
          'Half speed; start-turn 8d4 acid. End-turn Constitution save ends spell; failure adds 2d4 to later damage. Action clearing prevents next damage, resets to 8d4, gives next save advantage.',
          { source, duration: { type: 'rounds', rounds: 10 } },
        ),
      ],
    },
    manual:
      'Choose one visible creature. Initial save deals no damage. Resolve later acid, escalation, half speed, escape, and clearing action manually; remove bundle on escape. Higher slots add 2d4 per slot above 4th per printed damage rule; use source for reset interactions.',
  }),
  'somanyrobots-so-many-spells:meteor-strike': reviewed('Meteor Strike', {
    mechanics: {
      damage: [{ formula: '4d8', type: 'fire' }],
      save: { ability: 'dex', onSave: 'negates' },
    },
    manual:
      'Select creatures within 30 feet of visible point for fire save. Separately apply automatic 4d8 bludgeoning to creatures within 10 feet, regardless of save. Do not combine bludgeoning into save damage or halve it on success.',
  }),
  'somanyrobots-so-many-spells:midnight-fire': reviewed('Midnight Fire', {
    effect: ruleReminder(
      'Midnight Fire',
      '10-foot magical darkness; caster sees normally; radiant resistance. Other creature turn start/first entry on its turn within 10 feet: automatic 2d10 necrotic.',
      { type: 'rounds', rounds: 10 },
      'self',
    ),
    manual:
      'No initial save/damage. Track aura, radiant resistance, and later automatic damage manually. Darkvision cannot see through darkness; only spell light 5th+ illuminates. Do not invent a save.',
  }),
  'somanyrobots-so-many-spells:molten-shard': reviewed('Molten Shard', {
    mechanics: {
      attackRoll: true,
      damage: [
        { formula: '2d8', type: 'piercing' },
        { formula: '2d8', type: 'fire' },
      ],
    },
    effect: {
      summary: 'Attack disadvantage while embedded; end-turn fire',
      targeting: 'enemy',
      build: ({ source }) =>
        [
          modifierEffect(
            {
              name: 'Molten Shard',
              applies: 'attackRolls',
              direction: 'outgoing',
              mode: 'disadvantage',
            },
            { source },
          ),
          reminder(
            'Molten Shard',
            '1d8 fire at each turn end. Creature within 5 feet can remove shard with DC 10 Wisdom (Medicine) check.',
            { source },
          ),
        ].map((effect) => ({ ...effect, durationNote: 'Until shard removed' })),
    },
    manual:
      'Choose one visible creature. Apply embedded bundle only on hit; later fire and removal check are manual. Remove entire bundle on removal. Printed duration is Instantaneous; do not invent a 1-minute limit or an end-turn escape save.',
  }),
  'somanyrobots-so-many-spells:moonlit-glade': reviewed('Moonlit Glade', {
    manual:
      'Manual 30-foot-radius, 100-foot-high dim-light cylinder; no initial save/damage. Start-turn/entry on own turn Constitution save negates 2d6 radiant. Silver-susceptible/shapechanger: disadvantage, +2d6 on failure, no form change. Designated creatures auto-save; no invisibility. Overlapping darkness from spells 3rd or lower is dispelled. Track eligibility and separate bonus damage.',
  }),
  'somanyrobots-so-many-spells:moonrock': reviewed('Moonrock', {
    mechanics: {
      damage: [{ formula: '2d10', type: 'bludgeoning' }],
      save: { ability: 'dex', onSave: 'negates' },
    },
    manual:
      'Choose creature in targeted 5-foot space. Separately apply automatic 2d6 radiant regardless of save; initial save only controls bludgeoning. Do not put radiant into negated damage or halve it.',
  }),
  'somanyrobots-so-many-spells:moonstrike': reviewed('Moonstrike', {
    mechanics: { save: { ability: 'wis', onSave: 'negates' } },
    effect: ruleReminder('Moonstrike', 'Roll and apply Short-term Madness table result.', {
      type: 'manual',
    }),
    manual:
      'Choose one visible creature. Apply automatic 6d8 radiant manually regardless of Wisdom result; save only determines madness. Resolve random madness and result-specific duration manually; no generic Frightened or psychic damage.',
  }),
  'somanyrobots-so-many-spells:mummy-fist': reviewed('Mummy Fist', {
    effect: ruleReminder(
      'Mummy Fist',
      'Melee hits +1d12 necrotic. Once per turn on hit: Constitution save against mummy rot (no healing; necrotic damage reduces max HP by half suffered). End-turn Constitution saves/Remove Curse cure rot.',
      { type: 'manual' },
      'ally',
    ),
    manual:
      'Choose touched creature. No initial attack/save/damage. Track later hit curse, maximum HP reductions, and cure manually. Death crumbles to dust unless caster reaction preserves corpse as printed. Track 1-hour concentration and distinguish weapon benefit from resulting curse.',
  }),
  'somanyrobots-so-many-spells:murder-of-crows': reviewed('Murder of Crows', {
    manual:
      'Manual circling 30-foot flock. Initial creatures immediately make concentration-maintenance saves at caster DC with disadvantage, not a damage save; only actual concentration is relevant. Start-turn Dexterity save against 12d4 piercing, half on success. Heavy obscuration, Deafened in area, concentration-save disadvantage are membership-dependent. Track new circle target after host drops to 0 HP and 1-hour concentration.',
  }),
  'somanyrobots-so-many-spells:necrotic-mine': reviewed('Necrotic Mine', {
    manual:
      'Manual skull trap; no initial save/damage. Choose living-creature trigger distance 5/10/15 feet. Detonation: 20-foot Dexterity save, 6d8 necrotic and no healing until next turn ends on failure, half/no other effects on success. Further mines same turn deal half damage; keep mines at least 5 feet apart. Moving detonates except caster disarm; victims killed rise as zombies next moonless night. Track 8-hour duration.',
  }),
  'somanyrobots-so-many-spells:oozeform': reviewed('Oozeform', {
    effect: ruleReminder(
      'Oozeform',
      'Acid immunity; fit through 1-inch gaps; melee hit from within 5 feet retaliates 2d4 acid. Later action envelop same-size/smaller: Dexterity save or Grappled/Restrained, 8d4 acid each turn start; action save escapes.',
      { type: 'rounds', rounds: 100 },
      'self',
    ),
    manual:
      'Choose optional size one category up/down. No initial save/damage. Resolve immunity, retaliation, space sharing, later envelop and escape manually. Do not assume initial Grappled target or resistance to other damage.',
  }),
  'somanyrobots-so-many-spells:osseous-weapon': reviewed('Osseous Weapon', {
    effect: ruleReminder(
      'Osseous Weapon',
      'Chosen bone melee weapon: normal damage +1d4 necrotic, thrown if property applies. Caster reaction after hit may shatter: target takes 2d6 necrotic and no healing until caster next turn ends.',
      { type: 'rounds', rounds: 10 },
      'ally',
    ),
    manual:
      'Mark bone weapon; no initial attack/damage. Resolve later hit and shattering separately, clearing created weapon on shatter. Healing restriction uses caster turn, not target turn. Track concentration and 1 minute.',
  }),
  'somanyrobots-so-many-spells:phantom-web': reviewed('Phantom Web', {
    manual:
      'Manual 20-foot illusion cube; designate immune creatures. No initial save/attack. Start-turn/entry on own turn Intelligence save against Restrained; action repeat save escapes. Later bonus-action melee spell attack web/near-edge target for 4d6 psychic (+1d6 per slot above 5th); outside Large-or-smaller hit may pull 10 feet toward web. Track affected-only difficult terrain and 1-hour concentration.',
  }),
  'somanyrobots-so-many-spells:plague-arrow': reviewed('Plague Arrow', {
    manual:
      'Manual ammunition/thrown-weapon enchantment; no initial attack. Later action ranged spell attack or normal ranged weapon attack: hit +2d12 poison, then Constitution save against contagious disease/Poisoned. Diseased end-turn 3d8 necrotic, spread saves within 10 feet, own escape save. Caster action dismissal/recast cures all. +5 feet spread per slot above 4th. Track 10 minutes; do not invent concentration.',
  }),
  'somanyrobots-so-many-spells:plague-of-rats': reviewed('Plague of Rats', {
    manual:
      'Manual moving 30-foot ground swarm; no initial save/damage. Start-turn/entry on own turn Constitution save: 8d4 piercing and Poisoned until next turn ends; half/no poison on success. Bonus action moves 15 feet. Area spell damage 25+ disperses; action reforms in same place. +1d4 and +5 damage dispersal threshold per slot above 5th; track 10-minute concentration.',
  }),
  'somanyrobots-so-many-spells:poison-light': reviewed('Poison Light', {
    mechanics: { save: { ability: 'con', onSave: 'negates' } },
    effect: nextTurnCondition('Poisoned'),
    manual:
      'Choose one visible creature. On failure, reduce current/max HP by 3d4 manually, not typed damage; while Poisoned target glows 5 feet and cannot benefit from invisibility. Other creatures ending turn in glow lose 1d4 current/max HP automatically, no save. Reductions recover after long rest and outlast condition.',
  }),
  'somanyrobots-so-many-spells:poison-nova': reviewed('Poison Nova', {
    mechanics: { save: { ability: 'con', onSave: 'negates' } },
    effect: {
      summary: 'Poisoned for 1 minute; Constitution escape saves at turn end',
      targeting: 'enemy',
      multi: true,
      build: ({ source }) => [
        condition('Poisoned', { source, duration: { type: 'rounds', rounds: 10 } }),
        reminder(
          'Poison Nova',
          'Constitution save at each turn end ends effect; clear bundle on success.',
          { source, duration: { type: 'rounds', rounds: 10 } },
        ),
      ],
    },
    manual:
      'Select creatures in 15-foot radius, +5 feet per slot above 3rd. No damage. Resolve escape saves manually and remove bundle on success; do not add later entry saves not printed.',
  }),
  'somanyrobots-so-many-spells:prismatic-shield': reviewed('Prismatic Shield', {
    manual:
      'Manual random shield: own turn start d6 chooses dominant acid/cold/fire/lightning/poison (6 choose). Resist all five, immune dominant. Melee damage triggers printed table (damage, next-attack advantage, target-turn Restrained/Poisoned, or shocked speed/reaction). No initial attack/save/damage or fixed elemental defense choice; track 10-minute concentration.',
  }),
  'somanyrobots-so-many-spells:putrefy': reviewed('Putrefy', {
    mechanics: { save: { ability: 'con', onSave: 'negates' } },
    effect: {
      summary: 'Poisoned; turn-start necrotic, end-turn escape saves',
      targeting: 'enemy',
      build: ({ source }) => [
        condition('Poisoned', { source, duration: { type: 'rounds', rounds: 10 } }),
        reminder(
          'Putrefy',
          '3d10 necrotic each turn start. End-turn Constitution save ends spell.',
          { source, duration: { type: 'rounds', rounds: 10 } },
        ),
      ],
    },
    manual:
      'Choose touched creature. No initial damage; later necrotic and escape saves manual. Remove bundle on escape. Poisoned immunity means no damage while not Poisoned; do not label necrotic as poison damage.',
  }),
  'somanyrobots-so-many-spells:putrid-aura': reviewed('Putrid Aura', {
    effect: ruleReminder(
      'Putrid Aura',
      'Other creatures starting within 15 feet make Constitution save or Poisoned until next turn starts. Nonbreathing/poison-immune creatures auto-save; moderate wind suppresses aura.',
      { type: 'rounds', rounds: 10 },
      'ally',
    ),
    manual:
      'Choose one visible aura host, including a hostile host if desired. No initial save/damage. Resolve membership, later saves, and wind manually. Host is not Poisoned by initial casting; concentration owns aura, not an unrelated target-turn timer.',
  }),
  'somanyrobots-so-many-spells:quicksand': reviewed('Quicksand', {
    manual:
      'Manual 15-foot difficult-terrain ground square; no initial save. Entry/start-turn Strength failure gives speed 0 until next turn starts. Three consecutive failures cause Restrained until success; speed 0 alone is not Restrained. Track streaks and later saves manually. Square +5 feet per two slots above 1st, starting 3rd.',
  }),
  'somanyrobots-so-many-spells:quicksilver-lash': reviewed('Quicksilver Lash', {
    attackKind: 'melee',
    mechanics: { attackRoll: true, damage: [{ formula: '6d8', type: 'slashing' }] },
    manual:
      'Choose one creature within 30 feet. Only after hit, Large-or-smaller target makes separate Strength save manually; failure permits pull up to 30 feet and Prone. Do not apply Prone/pull from attack hit alone or require save for initial slashing.',
  }),
  'somanyrobots-so-many-spells:rain-of-coins': reviewed('Rain of Coins', {
    manual:
      'Manual 30-foot-across, 100-foot-high difficult-terrain cylinder; no initial damage/save. Start-turn automatic 4d8 bludgeoning then Wisdom save against forced coin-scooping action. Charm-immune auto-save but still take damage. After spell 4d4 gold remains. Do not negate automatic damage with Wisdom save; track 1-minute concentration.',
  }),
  'somanyrobots-so-many-spells:rain-of-ooze': reviewed('Rain of Ooze', {
    manual:
      'Manual 30-foot-radius, 100-foot-high slime cylinder; no initial save. Start-turn/entry on own turn Dexterity save negates 8d4 bludgeoning and slime. Flying targets save at disadvantage. Slime -10 feet speed; three coatings cause Restrained. Action within 5 feet clears slime, otherwise persists until spell ends. Track coatings, movement, and 1-minute concentration manually.',
  }),
  'somanyrobots-so-many-spells:rattle-bones': reviewed('Rattle Bones', {
    mechanics: {
      damage: [{ formula: '6d8', type: 'necrotic' }],
      save: { ability: 'con', onSave: 'negates' },
    },
    effect: {
      summary: 'Attack disadvantage and half speed until target next turn ends',
      targeting: 'enemy',
      build: ({ source, target }) => {
        const options = {
          source: target?.combatantId ?? source,
          duration: target
            ? { type: 'untilSourceTurn' as const, when: 'endOfTurn' as const }
            : { type: 'manual' as const },
        }
        return [
          modifierEffect(
            {
              name: 'Rattle Bones',
              applies: 'attackRolls',
              direction: 'outgoing',
              mode: 'disadvantage',
            },
            options,
          ),
          reminder('Rattle Bones', 'Speed halved until end of next turn.', options),
        ]
      },
    },
    manual:
      'Choose one visible creature. Later bonus-action shakes and saves are manual; each failure reapplies temporary penalties. First successful save ends spell; recast or bonus-action dismissal also ends it. Penalties expire at target next turn end, not after full 1-minute spell duration; no concentration.',
  }),
  'somanyrobots-so-many-spells:raven-s-rake': reviewed("Raven's Rake", {
    mechanics: {
      damage: [{ formula: '4d8', type: 'slashing' }],
      save: { ability: 'dex', onSave: 'half' },
    },
    manual:
      'Select creatures in 15-foot-wide, 10-foot-deep area. Printed higher-slot clause says +1d8 per slot above 3rd, even though base spell is 2nd level; keep that threshold, do not silently change it to above 2nd.',
  }),
  'somanyrobots-so-many-spells:raven-s-wings': reviewed("Raven's Wings", {
    mechanics: {
      damage: [{ formula: '5d8', type: 'slashing' }],
      save: { ability: 'str', onSave: 'half' },
    },
    manual:
      'Select chosen creatures within 15 feet (printed range header is 30 feet). Failures pushed 10 feet manually. After casting, fly up to 30 feet once; wings disappear. Per slot above 3rd: +1d8 damage and +10 feet flight, not permanent fly speed.',
  }),
  'somanyrobots-so-many-spells:reanimating-smite': reviewed('Reanimating Smite', {
    effect: ruleReminder(
      'Reanimating Smite',
      'Next melee weapon hit: +4d8 necrotic, then Charisma save against soul rot. If target dies during spell, rises as controlled zombie; turns after caster, corpse again after 1 hour.',
      { type: 'rounds', rounds: 10 },
      'self',
    ),
    manual:
      'No initial attack/save/damage. Resolve next-hit bonus, separate curse save, death trigger, and created zombie manually. Do not raise target from initial casting or infer a player weapon attack.',
  }),
  'somanyrobots-so-many-spells:reanimation-mass': reviewed('Reanimation, Mass', {
    manual:
      'Manual corpse/bonepile animation using Skeleton/Zombie templates or printed Undead Horde for 3+ remains. Eligible original types and CR <=8, combined CR <=18. Bonus action commands within 60 feet; default hostile attack or Dodge. Printed header says 24 hours but control prose says 48 hours; show source ambiguity, do not invent resolution. Recasting renews control; track horde corpses, damage, and half-HP loss manually.',
  }),
  'somanyrobots-so-many-spells:reap-soul': reviewed('Reap Soul', {
    mechanics: {
      damage: [{ formula: '8d8+50', type: 'necrotic' }],
      save: { ability: 'cha', onSave: 'half' },
    },
    manual:
      'Choose one creature. Only failed-save damage that kills destroys body and empowers caster. Manually grant temporary HP equal to half damage dealt; while held, caster may reroll necrotic damage dice and keep new result. Successful save never grants empowerment, even if half damage kills.',
  }),
}
