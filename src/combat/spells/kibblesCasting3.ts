// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import type { ReviewedSpellCasting } from '../reviewedSpells.ts'
import { kibblesProfile, kibblesDamage } from './kibblesProfile.ts'
import { ruleReminder } from './reviewedProfile.ts'
import { condition } from '../effects.ts'

export const KIBBLES_CASTING_3: Record<string, ReviewedSpellCasting> = {
  'kibblestasty-casting-compendium-v2.3:corpse-explosion': kibblesProfile('Corpse Explosion', {
    mechanics: {
      save: { ability: 'dex', onSave: 'half' },
      ...kibblesDamage(
        [
          { formula: '3d8', type: 'necrotic' },
          { formula: '3d8', type: 'thunder' },
        ],
        3,
        [0, 0],
      ),
    },
    manual:
      'Requires Small or larger bloody corpse slain within last minute. Select creatures within 15 feet. Higher slots add corpses; overlapping explosions impose save disadvantage but damage only once. Apply overlap modifier manually.',
  }),
  'kibblestasty-casting-compendium-v2.3:crackle': kibblesProfile('Crackle', {
    attackKind: 'ranged',
    mechanics: {
      attackRoll: true,
      ...kibblesDamage([{ formula: '1d12', type: 'lightning' }], 2, [0]),
    },
    manual:
      'Resolve three ranged attacks separately, +1 arc per higher slot. Three or more hits on same target trigger separate Constitution save against stunned until target next turn start; never apply stun on one hit.',
  }),
  'kibblestasty-casting-compendium-v2.3:crashing-wave': kibblesProfile('Crashing Wave', {
    mechanics: {
      save: { ability: 'str', onSave: 'half' },
      ...kibblesDamage([{ formula: '2d6', type: 'bludgeoning' }], 1, [1]),
    },
    manual:
      'Select 15-foot cone, 30 feet if sufficient nearby water. Failures push 10 feet; collision or failure by 5 also knocks prone. Apply movement and conditional prone manually. +1d6 per higher slot.',
  }),
  'kibblestasty-casting-compendium-v2.3:create-pit': kibblesProfile('Create Pit', {
    manual:
      'Manual Dexterity save in eligible dirt/stone square: failure falls into 10-foot pit; success jumps out or hangs prone from edge if no space. Resolve falling damage and climb manually; higher slots deepen pit to maximum 20 feet.',
  }),
  'kibblestasty-casting-compendium-v2.3:crescent-wind-slash': kibblesProfile(
    'Crescent Wind Slash',
    {
      manual:
        'Three weapon attacks, each 1d6 plus weapon attack ability modifier slashing. Not spell attacks. Higher slots add slashes; resolve weapon-specific modifiers and targets manually.',
    },
  ),
  'kibblestasty-casting-compendium-v2.3:crimson-poison': kibblesProfile('Crimson Poison', {
    manual:
      'Pay component HP manually and coat held weapon. Next three hits add acid equal to HP expended; ends after third hit or 1 minute. Higher slots increase allowed HP cost up to 10. No initial spell attack.',
  }),
  'kibblestasty-casting-compendium-v2.3:crimson-tide': kibblesProfile('Crimson Tide', {
    mechanics: {
      save: { ability: 'dex', onSave: 'half' },
      ...kibblesDamage([{ formula: '6d6', type: 'necrotic' }], 3, [0]),
    },
    effect: ruleReminder(
      'Crimson Tide',
      'Terrain until caster next turn start; restore component\u2019s 10 HP only when tide recedes.',
      { type: 'untilSourceTurn', when: 'startOfTurn' },
      'self',
      false,
    ),
    manual:
      'Select creatures in area; track difficult terrain except caster until caster next turn start. Pay 10 HP component manually; restore that 10 when tide recedes at caster next turn start, never heal immediately.',
  }),
  'kibblestasty-casting-compendium-v2.3:crippling-agony': kibblesProfile('Crippling Agony', {
    mechanics: { save: { ability: 'con', onSave: 'negates' } },
    effect: ruleReminder(
      'Crippling Agony',
      'Initial Constitution failure causes agony, no initial damage. Moving more than half speed or taking action deals later 1d6 necrotic. Repeat save ends spell; printed text does not specify repeat timing, so resolve manually.',
      { type: 'manual' },
      'enemy',
      true,
    ),
    manual:
      'Initial Constitution failure causes agony, no initial damage. Moving more than half speed or taking action deals later 1d6 necrotic. Repeat save ends spell; printed text does not specify repeat timing, so resolve manually.',
  }),
  'kibblestasty-casting-compendium-v2.3:cruel-puppetry': kibblesProfile('Cruel Puppetry', {
    mechanics: { save: { ability: 'cha', onSave: 'negates' } },
    effect: ruleReminder(
      'Cruel Puppetry',
      'Initial Charisma failure links doll; choose restraint, movement, weapon attack, 4d6 piercing, or 4d12 necrotic destroying doll. No unconditional damage/condition. Action manipulations allow disadvantage repeat saves afterward. Track 24-hour immunity, endpoint, and higher-slot range manually.',
      { type: 'manual' },
      'enemy',
      true,
    ),
    manual:
      'Initial Charisma failure links doll; choose restraint, movement, weapon attack, 4d6 piercing, or 4d12 necrotic destroying doll. No unconditional damage/condition. Action manipulations allow disadvantage repeat saves afterward. Track 24-hour immunity, endpoint, and higher-slot range manually.',
  }),
  'kibblestasty-casting-compendium-v2.3:crushing-singularity': kibblesProfile(
    'Crushing Singularity',
    {
      mechanics: {
        save: { ability: 'str', onSave: 'half' },
        ...kibblesDamage([{ formula: '6d6', type: 'bludgeoning' }], 3, [1]),
      },
      effect: ruleReminder(
        'Crushing Singularity',
        'Select creatures within 15 feet; failed saves pull adjacent. Movement away costs double; turn-end Strength failure adds separate 2d6 bludgeoning and pull. Ends caster next turn start. Higher slots increase printed damage; later damage/manual geometry separate.',
        { type: 'untilSourceTurn', when: 'startOfTurn' },
        'self',
        false,
      ),
      persistsAfterSave: true,
      manual:
        'Select creatures within 15 feet; failed saves pull adjacent. Movement away costs double; turn-end Strength failure adds separate 2d6 bludgeoning and pull. Ends caster next turn start. Higher slots increase printed damage; later damage/manual geometry separate.',
    },
  ),
  'kibblestasty-casting-compendium-v2.3:curse-of-impotence': kibblesProfile('Curse of Impotence', {
    effect: ruleReminder(
      'Curse of Impotence',
      'No initial save. Every attempted damaging action requires Wisdom save; failure completes action but deals no damage. Track conditional action checks manually.',
      { type: 'manual' },
      'enemy',
      true,
    ),
    manual:
      'No initial save. Every attempted damaging action requires Wisdom save; failure completes action but deals no damage. Track conditional action checks manually.',
  }),
  'kibblestasty-casting-compendium-v2.3:dancing-object': kibblesProfile('Dancing Object', {
    effect: ruleReminder(
      'Dancing Object',
      'Animate eligible Tiny nonmagical object manually. Use printed construct stats, weapon-dependent damage, bonus-action commands, attached-object speed zero, and damage overflow on reversion. No initial attack; manage separate combatant.',
      { type: 'manual' },
      'self',
      false,
    ),
    manual:
      'Animate eligible Tiny nonmagical object manually. Use printed construct stats, weapon-dependent damage, bonus-action commands, attached-object speed zero, and damage overflow on reversion. No initial attack; manage separate combatant.',
  }),
  'kibblestasty-casting-compendium-v2.3:dancing-wave': kibblesProfile('Dancing Wave', {
    effect: ruleReminder(
      'Dancing Wave',
      'Create cohesive water mass and terrain; no initial save/damage. Bonus action moves 30 feet and can hit one creature: Strength save against 2d6 bludgeoning and prone, automatic failure if prone. Track movement and later trigger manually.',
      { type: 'manual' },
      'self',
      false,
    ),
    manual:
      'Create cohesive water mass and terrain; no initial save/damage. Bonus action moves 30 feet and can hit one creature: Strength save against 2d6 bludgeoning and prone, automatic failure if prone. Track movement and later trigger manually.',
  }),
  'kibblestasty-casting-compendium-v2.3:decaying-touch': kibblesProfile('Decaying Touch', {
    attackKind: 'melee',
    mechanics: {
      attackRoll: true,
      ...kibblesDamage([{ formula: '1d6', type: 'necrotic' }], 0, [1]),
    },
    effect: ruleReminder(
      'Decaying Touch',
      'Hit: first damage from another source before caster next turn start adds separate necrotic dice; check disease immunity.',
      { type: 'untilSourceTurn', when: 'startOfTurn' },
      'enemy',
      true,
    ),
    manual:
      'Melee spell attack; disease immunity negates decay effect. First damage from another source before caster next turn start adds separate necrotic dice. Both components scale at character levels 5/11/17, but only initial is rolled here; later damage and immunity manual.',
  }),
  'kibblestasty-casting-compendium-v2.3:deglove-creature': kibblesProfile('Deglove Creature', {
    mechanics: {
      save: { ability: 'con', onSave: 'half' },
      ...kibblesDamage([{ formula: '7d10+7', type: 'necrotic' }], 5, [0]),
    },
    manual:
      'Initial Constitution save for 7d10+7 necrotic. If lethal, create hostile Skeleton attacking nearest living target manually; never summon before determining lethal damage.',
  }),
  'kibblestasty-casting-compendium-v2.3:delve-mind': kibblesProfile('Delve Mind', {
    mechanics: { save: { ability: 'int', onSave: 'negates' } },
    effect: ruleReminder(
      'Delve Mind',
      'Initial Intelligence failure grants past 12 hours of memories for duration; +12 hours history per higher slot. Resolve recalled information manually, no condition.',
      { type: 'manual' },
      'enemy',
      true,
    ),
    manual:
      'Initial Intelligence failure grants past 12 hours of memories for duration; +12 hours history per higher slot. Resolve recalled information manually, no condition.',
  }),
  'kibblestasty-casting-compendium-v2.3:devour-shadow': kibblesProfile('Devour Shadow', {
    mechanics: {
      save: { ability: 'cha', onSave: 'half' },
      ...kibblesDamage([{ formula: '6d6', type: 'necrotic' }], 4, [0]),
    },
    effect: ruleReminder(
      'Devour Shadow',
      'Requires caster and target shadows. Failed saves subtract 1d4 from target attacks/saves/checks and add 1d4 to caster rolls, never stacking caster bonus with extra targets. Apply dice modifiers and shadow loss manually; higher slots add targets.',
      { type: 'manual' },
      'enemy',
      true,
    ),
    manual:
      'Requires caster and target shadows. Failed saves subtract 1d4 from target attacks/saves/checks and add 1d4 to caster rolls, never stacking caster bonus with extra targets. Apply dice modifiers and shadow loss manually; higher slots add targets.',
  }),
  'kibblestasty-casting-compendium-v2.3:devouring-darkness': kibblesProfile('Devouring Darkness', {
    mechanics: {
      save: { ability: 'con', onSave: 'half' },
      ...kibblesDamage([{ formula: '6d8', type: 'necrotic' }], 5, [1]),
    },
    manual:
      'Select chosen creatures within 20 feet. Failures optionally pull adjacent. Heal caster one quarter total actual necrotic damage rounded down manually after resolution; +1d8 per higher slot.',
  }),
  'kibblestasty-casting-compendium-v2.3:devouring-mist': kibblesProfile('Devouring Mist', {
    effect: ruleReminder(
      'Devouring Mist',
      'Transform until caster next turn start; no actions, 60-foot hover, pass creatures/gaps, resistance except radiant/force/psychic. First movement into target triggers Constitution save for 6d8 necrotic and 10/5 healing, capped 50 total. No initial damage; track movement/healing/fall manually.',
      { type: 'untilSourceTurn', when: 'startOfTurn' },
      'self',
      false,
    ),
    manual:
      'Transform until caster next turn start; no actions, 60-foot hover, pass creatures/gaps, resistance except radiant/force/psychic. First movement into target triggers Constitution save for 6d8 necrotic and 10/5 healing, capped 50 total. No initial damage; track movement/healing/fall manually.',
  }),
  'kibblestasty-casting-compendium-v2.3:dig': kibblesProfile('Dig', {
    effect: ruleReminder(
      'Dig',
      'Burrow 30 feet through dirt/sand/clay, never stone, only until current turn end. Tunnel remains stable 1 minute. Track speed and terrain manually.',
      { type: 'untilSourceTurn', when: 'endOfTurn' },
      'self',
      false,
    ),
    manual:
      'Burrow 30 feet through dirt/sand/clay, never stone, only until current turn end. Tunnel remains stable 1 minute. Track speed and terrain manually.',
  }),
  'kibblestasty-casting-compendium-v2.3:dimension-cutter': kibblesProfile('Dimension Cutter', {
    manual:
      'Automatic 6d6 force to creatures in 15-foot cone, ignoring total cover and striking ethereal creatures. No save/attack; apply manually, +1d6 per higher slot.',
  }),
  'kibblestasty-casting-compendium-v2.3:disorient': kibblesProfile('Disorient', {
    mechanics: { save: { ability: 'wis', onSave: 'negates' } },
    effect: ruleReminder(
      'Disorient',
      'Initial Wisdom failure disorients: attack disadvantage, random 10-foot movement at turn start then speed zero. End-turn Wisdom save ends spell; failure by 5 causes prone. Apply movement and scoped modifiers manually; not concentration.',
      { type: 'manual' },
      'enemy',
      true,
    ),
    manual:
      'Initial Wisdom failure disorients: attack disadvantage, random 10-foot movement at turn start then speed zero. End-turn Wisdom save ends spell; failure by 5 causes prone. Apply movement and scoped modifiers manually; not concentration.',
  }),
  'kibblestasty-casting-compendium-v2.3:dispel-construct': kibblesProfile('Dispel Construct', {
    mechanics: { save: { ability: 'con', onSave: 'negates' } },
    effect: {
      summary: 'Stunned',
      targeting: 'enemy',
      multi: true,
      build: ({ source }) => [
        condition('Stunned', { source: source, duration: { type: 'manual' } }),
      ],
    },
    manual:
      'Construct takes unconditional 4d10 force before Constitution save. Failure stuns and sets HP zero if remaining HP under 50. Damage is not negated by save. Apply damage/threshold manually, then save and end-turn repeat checks; not concentration.',
  }),
  'kibblestasty-casting-compendium-v2.3:divide-self': kibblesProfile('Divide Self', {
    effect: ruleReminder(
      'Divide Self',
      'Create duplicate with split current HP, shared resources/concentration, separate actions and 15 damage cap. Manually switch positions and choose survivor; zero HP of either ends spell. Higher slots change HP and cap. Never derive player build.',
      { type: 'manual' },
      'self',
      false,
    ),
    manual:
      'Create duplicate with split current HP, shared resources/concentration, separate actions and 15 damage cap. Manually switch positions and choose survivor; zero HP of either ends spell. Higher slots change HP and cap. Never derive player build.',
  }),
  'kibblestasty-casting-compendium-v2.3:divine-descent': kibblesProfile('Divine Descent', {
    effect: ruleReminder(
      'Divine Descent',
      'Choose healing or burning on creation and next turn start, double effect on third turn. Heal non-undead/non-fiend creatures 4d8 or burn with Constitution save 4d8 radiant, half on success; final 8d8. Branching initial mode and later effects manual.',
      { type: 'manual' },
      'self',
      false,
    ),
    manual:
      'Choose healing or burning on creation and next turn start, double effect on third turn. Heal non-undead/non-fiend creatures 4d8 or burn with Constitution save 4d8 radiant, half on success; final 8d8. Branching initial mode and later effects manual.',
  }),
  'kibblestasty-casting-compendium-v2.3:divine-judgment': kibblesProfile('Divine Judgment', {
    mechanics: {
      save: { ability: 'dex', onSave: 'half' },
      ...kibblesDamage([{ formula: '2d8', type: 'radiant' }], 2, [1]),
    },
    manual:
      'Select cylinder creatures. Add 2d8 radiant before halving for undead/fiends manually; optional alignment variant only by GM decision. Higher slots add 1d8 base.',
  }),
  'kibblestasty-casting-compendium-v2.3:dragon-surge': kibblesProfile('Dragon Surge', {
    mechanics: { save: { ability: 'dex', onSave: 'half' } },
    manual:
      'Choose acid/cold/fire/lightning/poison manually, then Dexterity saves within 10 feet for 2d8 chosen type, half on success. Gain 30-foot flight until current turn end. Higher slots add 1d8 and 10 feet flight; no fixed damage type.',
  }),
  'kibblestasty-casting-compendium-v2.3:dust-cyclone': kibblesProfile('Dust Cyclone', {
    effect: ruleReminder(
      'Dust Cyclone',
      'No initial save. Turn start/first entry on own turn triggers Strength save for 1d12 bludgeoning, half on success, 5-foot push on failure. Bonus-action movement affects only first passed creature; loose material creates obscurity. Later damage and movement manual.',
      { type: 'manual' },
      'self',
      false,
    ),
    manual:
      'No initial save. Turn start/first entry on own turn triggers Strength save for 1d12 bludgeoning, half on success, 5-foot push on failure. Bonus-action movement affects only first passed creature; loose material creates obscurity. Later damage and movement manual.',
  }),
  'kibblestasty-casting-compendium-v2.3:earth-ripple': kibblesProfile('Earth Ripple', {
    mechanics: { save: { ability: 'dex', onSave: 'negates' } },
    manual:
      'Choose Sink, Slam, or Impale manually for initial Dexterity failures within 10 feet. Damage differs: 1d8 bludgeoning and no movement until dug free, 2d8 bludgeoning/push/prone, or 4d8 piercing. No single unconditional damage profile.',
  }),
  'kibblestasty-casting-compendium-v2.3:echoing-lance': kibblesProfile('Echoing Lance', {
    mechanics: {
      save: { ability: 'con', onSave: 'half' },
      ...kibblesDamage([{ formula: '3d8', type: 'thunder' }], 4, [1]),
    },
    effect: {
      summary: 'Stunned',
      targeting: 'enemy',
      multi: true,
      build: ({ source }) => [
        condition('Stunned', { source: source, duration: { type: 'manual' } }),
      ],
    },
    manual:
      'Initial Constitution failure stuns. End-turn Constitution success ends spell; failure deals separate 1d8 thunder. Initial thunder +1d8 per higher slot. Never roll later echoes on casting.',
  }),
}
