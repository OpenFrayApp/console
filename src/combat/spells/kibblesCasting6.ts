// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import type { ReviewedSpellCasting } from '../reviewedSpells.ts'
import { kibblesProfile, kibblesDamage } from './kibblesProfile.ts'
import { ruleReminder } from './reviewedProfile.ts'
import { condition } from '../effects.ts'

export const KIBBLES_CASTING_6: Record<string, ReviewedSpellCasting> = {
  'kibblestasty-casting-compendium-v2.3:imbue-luck': kibblesProfile('Imbue Luck', {
    manual:
      'Imbue weapon or worn item; one extra d20 chosen after roll but before outcome changes wielder attack or incoming attack respectively. Ends after die rolled. Track item and one-use choice manually.',
  }),
  'kibblestasty-casting-compendium-v2.3:immutability': kibblesProfile('Immutability', {
    effect: ruleReminder(
      'Immutability',
      'Immune to form-changing magic. No movement on turn grants Strength/Constitution save advantage and forced movement/prone protection until next turn start. Reaction physical resistance sets speed zero through next turn end. Apply conditional benefits manually.',
      { type: 'manual' },
      'self',
      false,
    ),
    manual:
      'Immune to form-changing magic. No movement on turn grants Strength/Constitution save advantage and forced movement/prone protection until next turn start. Reaction physical resistance sets speed zero through next turn end. Apply conditional benefits manually.',
  }),
  'kibblestasty-casting-compendium-v2.3:impact': kibblesProfile('Impact', {
    attackKind: 'melee',
    mechanics: {
      attackRoll: true,
      ...kibblesDamage([{ formula: '1d10', type: 'bludgeoning' }], 0, [1]),
    },
    manual:
      'Melee spell attack; hit pushes 5 feet directly away manually. Bludgeoning +1d10 at levels 5/11/17.',
  }),
  'kibblestasty-casting-compendium-v2.3:induce-headache': kibblesProfile('Induce Headache', {
    effect: ruleReminder(
      'Induce Headache',
      'Intelligence 5 or less unaffected. No initial save/damage: 1 psychic at target turn start, disadvantage only on concentration Constitution saves and Intelligence checks. Apply scoped disadvantage and later damage manually.',
      { type: 'manual' },
      'enemy',
      true,
    ),
    manual:
      'Intelligence 5 or less unaffected. No initial save/damage: 1 psychic at target turn start, disadvantage only on concentration Constitution saves and Intelligence checks. Apply scoped disadvantage and later damage manually.',
  }),
  'kibblestasty-casting-compendium-v2.3:infernal-shackles': kibblesProfile('Infernal Shackles', {
    mechanics: {
      save: { ability: 'str', onSave: 'half' },
      ...kibblesDamage([{ formula: '3d6', type: 'fire' }], 2, [0]),
    },
    effect: ruleReminder(
      'Infernal Shackles',
      'Initial Strength failure sets speed zero, not Restrained. End-turn Strength success ends spell; failure deals separate 2d6 fire. Higher slots add targets, not initial damage. Speed and later saves manual.',
      { type: 'manual' },
      'enemy',
      true,
    ),
    manual:
      'Initial Strength failure sets speed zero, not Restrained. End-turn Strength success ends spell; failure deals separate 2d6 fire. Higher slots add targets, not initial damage. Speed and later saves manual.',
  }),
  'kibblestasty-casting-compendium-v2.3:infinite-edge': kibblesProfile('Infinite Edge', {
    effect: ruleReminder(
      'Infinite Edge',
      'Empower piercing/slashing weapon; next attack before caster next turn start has advantage and hit adds 1d10 weapon-type damage. Higher slots add 1d6 only per slot above 2nd as printed. No initial attack.',
      { type: 'untilSourceTurn', when: 'startOfTurn' },
      'self',
      false,
    ),
    manual:
      'Empower piercing/slashing weapon; next attack before caster next turn start has advantage and hit adds 1d10 weapon-type damage. Higher slots add 1d6 only per slot above 2nd as printed. No initial attack.',
  }),
  'kibblestasty-casting-compendium-v2.3:inner-world': kibblesProfile('Inner World', {
    effect: ruleReminder(
      'Inner World',
      'Create imaginary world and transport nearby creatures, no initial save/damage. Track legal terrain/hazards, later entry/exit Charisma saves, 4d4+4 psychic hazards, caster save overrides, and later action Intelligence attack for 8d8+8 psychic/ejection manually. Resource/build modeling remains manual.',
      { type: 'manual' },
      'self',
      false,
    ),
    manual:
      'Create imaginary world and transport nearby creatures, no initial save/damage. Track legal terrain/hazards, later entry/exit Charisma saves, 4d4+4 psychic hazards, caster save overrides, and later action Intelligence attack for 8d8+8 psychic/ejection manually. Resource/build modeling remains manual.',
  }),
  'kibblestasty-casting-compendium-v2.3:instant-bulwark': kibblesProfile('Instant Bulwark', {
    manual:
      'Create earth wall manually with 4d10 plus casting modifier HP, total cover and damage interception. Blocked damage counts once, excess passes after destruction. Crumbles caster next turn start; higher slots add HP/length. No creature armor bonus.',
  }),
  'kibblestasty-casting-compendium-v2.3:instant-counter': kibblesProfile('Instant Counter', {
    manual:
      'Teleport adjacent to damaging creature and make one weapon attack. Higher slots add 1d8 force on hit per slot above 2nd. Weapon-dependent attack/damage and teleport manual.',
  }),
  'kibblestasty-casting-compendium-v2.3:invest-life': kibblesProfile('Invest Life', {
    manual:
      'Caster takes unreducible 4d8 necrotic; visible target heals twice amount taken. Higher slots add 1d8 cost. Resolve cost and healing manually, never assign damage to recipient.',
  }),
  'kibblestasty-casting-compendium-v2.3:iron-garden': kibblesProfile('Iron Garden', {
    mechanics: {
      save: { ability: 'dex', onSave: 'half' },
      ...kibblesDamage([{ formula: '6d8', type: 'piercing' }], 4, [1]),
    },
    manual:
      'Initial Dexterity save within 20 feet; failure speed zero until target next turn end. Until caster next turn start movement through area deals separate 1d8 piercing per 5 feet. Track target timer/terrain manually; initial +1d8 per higher slot.',
  }),
  'kibblestasty-casting-compendium-v2.3:iron-wind-strike': kibblesProfile('Iron Wind Strike', {
    manual:
      'Up to three melee weapon attacks for 3d8 weapon-type damage each, +1d8 per higher slot. Then teleport adjacent to target. Not spell attacks; resolve manually.',
  }),
  'kibblestasty-casting-compendium-v2.3:jumping-jolt': kibblesProfile('Jumping Jolt', {
    manual:
      'Manual ranged spell attack for 4d12 lightning; miss deals half and ends chain, hit can jump with new roll up to five times. Never hit same target twice or exceed range. +1d12 per higher slot; standard miss-zero resolver cannot represent this.',
  }),
  'kibblestasty-casting-compendium-v2.3:karmic-reflection': kibblesProfile('Karmic Reflection', {
    effect: ruleReminder(
      'Karmic Reflection',
      'Until caster next turn start, reflect action/bonus-action/reaction damage as radiant, maximum 10 total then ends. Higher slots add 10 only per slot above 2nd. No initial save/damage; track reflected amount manually.',
      { type: 'untilSourceTurn', when: 'startOfTurn' },
      'enemy',
      true,
    ),
    manual:
      'Until caster next turn start, reflect action/bonus-action/reaction damage as radiant, maximum 10 total then ends. Higher slots add 10 only per slot above 2nd. No initial save/damage; track reflected amount manually.',
  }),
  'kibblestasty-casting-compendium-v2.3:killing-curse': kibblesProfile('Killing Curse', {
    effect: ruleReminder(
      'Killing Curse',
      'Automatic untyped current/maximum HP loss 3d10+10 on casting, death if zero. Later target turn-start Charisma failure loses 1d10+10, success ends spell. Healing restrictions and death saves of 1 persist; maximum restores after long rest. No initial save or typed damage.',
      { type: 'manual' },
      'enemy',
      true,
    ),
    manual:
      'Automatic untyped current/maximum HP loss 3d10+10 on casting, death if zero. Later target turn-start Charisma failure loses 1d10+10, success ends spell. Healing restrictions and death saves of 1 persist; maximum restores after long rest. No initial save or typed damage.',
  }),
  'kibblestasty-casting-compendium-v2.3:life-link': kibblesProfile('Life Link', {
    effect: ruleReminder(
      'Life Link',
      'Link two targets, choose normal or inverse mode. Mirror later damage/healing without recursion until 40 transferred or concentration ends. Higher slots raise cap by 10 each. No initial damage/healing; track paired consequences manually.',
      { type: 'manual' },
      'self',
      false,
    ),
    manual:
      'Link two targets, choose normal or inverse mode. Mirror later damage/healing without recursion until 40 transferred or concentration ends. Higher slots raise cap by 10 each. No initial damage/healing; track paired consequences manually.',
  }),
  'kibblestasty-casting-compendium-v2.3:life-support': kibblesProfile('Life Support', {
    effect: ruleReminder(
      'Life Support',
      'Target just reduced to zero can act without unconsciousness; transfer damage to caster. Ends if target healed above zero. Apply survival, transfer and ending manually; no initial healing.',
      { type: 'manual' },
      'ally',
      false,
    ),
    manual:
      'Target just reduced to zero can act without unconsciousness; transfer damage to caster. Ends if target healed above zero. Apply survival, transfer and ending manually; no initial healing.',
  }),
  'kibblestasty-casting-compendium-v2.3:lightning-charged': kibblesProfile('Lightning Charged', {
    effect: ruleReminder(
      'Lightning Charged',
      'Touch target, no initial damage. Melee/touch hits, melee attackers, and grapple turn ends discharge 1d6 lightning against other creature. Ends after six discharges; higher slots add two uses each. Track use count and later triggers manually.',
      { type: 'manual' },
      'ally',
      false,
    ),
    manual:
      'Touch target, no initial damage. Melee/touch hits, melee attackers, and grapple turn ends discharge 1d6 lightning against other creature. Ends after six discharges; higher slots add two uses each. Track use count and later triggers manually.',
  }),
  'kibblestasty-casting-compendium-v2.3:lightning-shot': kibblesProfile('Lightning Shot', {
    manual:
      'Imbue ammunition/thrown weapon; first attack uses one weapon roll against all creatures in 100-by-5-foot line for 4d8 lightning, half on miss. No weapon damage bonuses. Higher slots add 1d8 capped 6d8. Weapon-specific roll and hit/miss damage manual.',
  }),
  'kibblestasty-casting-compendium-v2.3:lightning-tendril': kibblesProfile('Lightning Tendril', {
    effect: ruleReminder(
      'Lightning Tendril',
      'No initial attack/save/damage. Later action automatically deals 1d12 lightning; higher slots change dice/range in printed paired thresholds up to 4d12/120 feet. Resolve later actions manually.',
      { type: 'manual' },
      'self',
      false,
    ),
    manual:
      'No initial attack/save/damage. Later action automatically deals 1d12 lightning; higher slots change dice/range in printed paired thresholds up to 4d12/120 feet. Resolve later actions manually.',
  }),
  'kibblestasty-casting-compendium-v2.3:macabre-marionette': kibblesProfile('Macabre Marionette', {
    mechanics: { save: { ability: 'wis', onSave: 'negates' } },
    effect: ruleReminder(
      'Macabre Marionette',
      'Initial Wisdom failure partially controls movement and blocks normal reactions. Later bonus action spends target reaction to move up to 20 feet and weapon attack; end-turn Wisdom save ends spell. No initial attack or charmed condition.',
      { type: 'manual' },
      'enemy',
      true,
    ),
    manual:
      'Initial Wisdom failure partially controls movement and blocks normal reactions. Later bonus action spends target reaction to move up to 20 feet and weapon attack; end-turn Wisdom save ends spell. No initial attack or charmed condition.',
  }),
  'kibblestasty-casting-compendium-v2.3:manipulate-earth': kibblesProfile('Manipulate Earth', {
    manual:
      'Choose earth excavation, cosmetic shaping, or 1-hour difficult terrain square; maximum three terrain patches, oldest ends on fourth. No initial save/damage.',
  }),
  'kibblestasty-casting-compendium-v2.3:manipulate-fate': kibblesProfile('Manipulate Fate', {
    effect: ruleReminder(
      'Manipulate Fate',
      'Reaction after roll before result replaces d20 with printed adjacent face; unrestricted replacement takes difference-many d6 necrotic and ends spell. Track table, timing and backlash manually; never modify randomness globally.',
      { type: 'manual' },
      'self',
      false,
    ),
    manual:
      'Reaction after roll before result replaces d20 with printed adjacent face; unrestricted replacement takes difference-many d6 necrotic and ends spell. Track table, timing and backlash manually; never modify randomness globally.',
  }),
  'kibblestasty-casting-compendium-v2.3:manipulate-fire': kibblesProfile('Manipulate Fire', {
    manual:
      'Choose fire resistance until caster next turn start, ignite/spread, douse, or cosmetic flame change. No unconditional defense effect; apply chosen mode manually.',
  }),
  'kibblestasty-casting-compendium-v2.3:manipulate-water': kibblesProfile('Manipulate Water', {
    manual:
      'Choose flow, shape, color/opacity, freeze or thaw water. Durations differ; holding altered flow requires concentration beyond next turn start. No creature save/damage.',
  }),
  'kibblestasty-casting-compendium-v2.3:manipulate-wind': kibblesProfile('Manipulate Wind', {
    manual:
      'Choose next ranged weapon attack disadvantage, Strength save against 5-foot push/prone, jump increase, or minor wind manipulation. Branching targets and rules manual; no unconditional save or advantage modifier.',
  }),
  'kibblestasty-casting-compendium-v2.3:martial-transformation': kibblesProfile(
    'Martial Transformation',
    {
      effect: ruleReminder(
        'Martial Transformation',
        'Cannot cast/concentrate. Manually grant temporary HP, weapon-only advantage/+2d12 force, proficiencies, limited extra attack and conjured equipment. End with DC 15 Constitution save against exhaustion. No initial attack; never derive character build.',
        { type: 'manual' },
        'self',
        false,
      ),
      manual:
        'Cannot cast/concentrate. Manually grant temporary HP, weapon-only advantage/+2d12 force, proficiencies, limited extra attack and conjured equipment. End with DC 15 Constitution save against exhaustion. No initial attack; never derive character build.',
    },
  ),
  'kibblestasty-casting-compendium-v2.3:melt': kibblesProfile('Melt', {
    mechanics: {
      save: { ability: 'con', onSave: 'half' },
      ...kibblesDamage([{ formula: '10d10', type: 'fire' }], 6, [1]),
    },
    manual:
      'Creature option uses Constitution save for fire; eligible unattended object instead takes 20d10 automatically. Melt target if zero HP. Object handling and destruction manual; creature fire +1d10 per higher slot.',
  }),
  'kibblestasty-casting-compendium-v2.3:melting-glob': kibblesProfile('Melting Glob', {
    attackKind: 'ranged',
    mechanics: { attackRoll: true, ...kibblesDamage([{ formula: '4d4', type: 'acid' }], 1, [2]) },
    effect: ruleReminder(
      'Melting Glob',
      'Hit: 1d4 acid at each target turn end; action clears acid early. Roll later damage manually.',
      { type: 'rounds', rounds: 10 },
      'enemy',
      true,
    ),
    manual:
      'Ranged spell attack; hit covers target in acid for 1 minute with separate 1d4 acid each turn end until action clears it. Initial +2d4 per higher slot; later dice unchanged.',
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
    manual:
      'Jump triple maximum distance without movement cost, then resolve landing Strength saves within 10 feet. Failures prone; direct landing target has save disadvantage and push on either result if eligible size. No falling damage below 100 feet. Movement and conditional modifiers manual.',
  }),
}
