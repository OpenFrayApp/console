// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import type { ReviewedSpellCasting } from '../reviewedSpells.ts'
import { sourceProfile, ruleReminder } from './reviewedProfile.ts'
import { condition, reminder } from '../effects.ts'

export const SPELLS_THAT_DONT_SUCK_2: Record<string, ReviewedSpellCasting> = {
  'somanyrobots-spells-that-dont-suck:conjure-beast-pack': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Conjure Beast Pack',
    {
      manual:
        'Manually add eight eligible CR 1/4 Small/Tiny beasts (six if flying), Fey type, turns after caster, verbal commands or group Dodge. Later group melee attacks depend on number attacking each target, with conditional advantage/casting modifier; no initial attack. Higher slots add two beasts each.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:conjure-herald': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Conjure Herald',
    {
      manual:
        'Choose fixed Ward until dispelled or mobile Announcement for 1 hour. Store 25-word message, conditions/repetition or route in 5-mile area; no initial save/damage or combat creature.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:conjure-minor-fiends': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Conjure Minor Fiends',
    {
      manual:
        'Manually add two Minor Fiends or GM-selected combined CR 2 fiends; turns after caster. Losing concentration makes them hostile, does not remove them; last 1 hour and cannot dismiss. Track attacks, randomized Bile, end-turn escape and 24-hour immunity. Higher slots increase count/combined CR.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:corpse-puppets': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Corpse Puppets',
    {
      manual:
        'Manually reanimate up to five eligible CR 1/4+ corpses as printed Skeleton/Zombie puppets. Turns after caster, bonus-action command or Dodge/avoid hazards; no initial attack. Track form statistics, Zombie fortitude and allied-only grapple advantage. Higher slots add two puppets each; ending spell makes inanimate.',
    },
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
      effect: ruleReminder(
        'Corrosive Burst',
        'Failure only: 4d4 acid each turn end; action by target or creature within 5 feet clears acid.',
        { type: 'rounds', rounds: 10 },
        'enemy',
        true,
      ),
      manual:
        'Select creatures in 20-foot sphere. Failure only: 4d4 acid each later turn end until target or adjacent creature spends action clearing it. Later damage manual, not part of initial roll. +2d4 initial acid per slot above 4th; ongoing damage unchanged.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:curse-of-weakness': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Curse of Weakness',
    {
      effect: ruleReminder(
        'Curse of Weakness',
        'Own-turn entry/start Constitution failure: Strength checks/saves disadvantage, half Strength weapon damage, speed -10 until turn end.',
        { type: 'manual' },
        'self',
        false,
      ),
      manual:
        'No initial save. Start turn or move into 10-foot sphere on own turn: Constitution failure curses until turn end, Strength-check/save disadvantage, half Strength weapon damage, speed -10. Conditional modifiers and later saves manual; higher slots enlarge area.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:dazzle': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Dazzle',
    {
      mechanics: { save: { ability: 'con', onSave: 'negates' } },
      effect: {
        summary:
          'Blinded and half speed through caster next turn end. All targets perceive caster space as heavily obscured regardless of save.',
        targeting: 'enemy',
        multi: true,
        build: ({ source }) => [
          condition('Blinded', {
            source,
            duration: { type: 'untilSourceTurn', when: 'endOfTurn' },
          }),
          reminder(
            'Dazzle',
            'Blinded and half speed through caster next turn end. All targets perceive caster space as heavily obscured regardless of save.',
            { source, duration: { type: 'untilSourceTurn', when: 'endOfTurn' } },
          ),
        ],
      },
      manual:
        'Select creatures in 20-foot cone. Every target sees caster space as heavily obscured, even on success; failures Blinded and half speed until caster next turn end. Resolve speed/obscuration manually; +5 feet cone per higher slot.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:death-ray': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Death Ray',
    {
      manual:
        'Manual ranged spell attack: 8d10+30 necrotic on hit, half on miss. Existing attack resolver cannot safely apply miss damage. Track humanoid death now or within 1 minute of hit, rising zombie at caster next turn start; higher slots +2d10.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:deflect': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Deflect',
    {
      manual:
        'Apply +5 AC only up to maximum AC 21, including triggering attack, until caster next turn start; Magic Missile immunity. Cap prevents blanket +5 modifier. Higher slots increase bonus and cap per two levels above 1st; manage AC manually.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:detect-hazards': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Detect Hazards',
    {
      effect: ruleReminder(
        'Detect Hazards',
        'Trap presence/direction within 120 feet; exact location and inspection-only advantage within 15 feet, subject to barriers.',
        { type: 'manual' },
        'self',
        false,
      ),
      manual:
        'Track trap presence/vague direction within 120 feet, exact detection and inspection-only advantage within 15 feet. Excludes ambushing creatures; blocked by printed stone/metal/lead/wood barriers. No initial save or broad check advantage.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:detect-otherworldly-influence': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Detect Otherworldly Influence',
    {
      effect: ruleReminder(
        'Detect Otherworldly Influence',
        'Listed otherworldly types located within 30 feet; Perception/Insight advantage only against them, subject to barriers.',
        { type: 'manual' },
        'self',
        false,
      ),
      manual:
        'Track eligible creature types/locations within 30 feet and Perception/Insight advantage only against those creatures. Printed material barriers block detection; no initial save or all-check advantage.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:devil-binding': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Devil Binding',
    {
      manual:
        'Manually summon GM-selected CR 4-8 devil; true name/talisman may bypass CR. Commands stop being binding after 10 minutes. Full-hour concentration permits return; early end leaves devil indefinitely. No initial attack/save; higher slots extend CR ceiling.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:disrupting-smite': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Disrupting Smite',
    {
      effect: ruleReminder(
        'Disrupting Smite',
        'Next melee weapon hit +5d10 force then Charisma save against Incapacitated/all-damage resistance. End-turn Charisma escape.',
        { type: 'manual' },
        'self',
        false,
      ),
      manual:
        'No initial attack/save/damage. Next melee weapon hit adds 5d10 force, then Charisma save; failure Incapacitated and all-damage resistance until concentration ends. End-turn Charisma escape manual; do not roll rider on casting or grant resistance before failed hit-triggered save.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:divine-temple': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Divine Temple',
    {
      manual:
        'Manual temple geometry and selected opposed creature types. No initial save. Entry Charisma failure excludes 24 hours, success gives d4 attack/check/save penalties inside. Blocks low-level divination; daily year permanence and higher-slot size/casting/divination limit manual.',
    },
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
      effect: {
        summary:
          'Disadvantage on next weapon attack before affected creature next turn end; clear after use.',
        targeting: 'enemy',
        multi: false,
        build: ({ source, target }) => [
          reminder(
            'Draining Bolt',
            'Disadvantage on next weapon attack before affected creature next turn end; clear after use.',
            {
              source: target?.combatantId ?? source,
              duration: target
                ? { type: 'untilSourceTurn', when: 'endOfTurn' }
                : { type: 'manual' },
            },
          ),
        ],
      },
      manual:
        'Choose visible creature. On hit only, disadvantage on next weapon attack before target next turn end. Clear after that attack; no blanket all-attack disadvantage. Cantrip damage scaling at 5/11/17.',
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
      effect: ruleReminder(
        'Drink Life',
        'Failure half speed until caster next turn start; manually heal caster half actual damage on either outcome. Later actions repeat tendril.',
        { type: 'manual' },
        'enemy',
        false,
      ),
      manual:
        'Choose visible creature for initial tendril. Failure speed halved until caster next turn start; heal caster by half actual damage dealt on either outcome manually. Repeat using later actions manually; successful initial save does not end caster power. +1d8 necrotic per slot above 5th.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:dust-cyclone': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Dust Cyclone',
    {
      effect: ruleReminder(
        'Dust Cyclone',
        'Own-turn entry/start Strength 1d12 bludgeoning/half, failure push 5 feet. Bonus-action movement can strike only first passed creature per turn.',
        { type: 'manual' },
        'self',
        false,
      ),
      manual:
        'No initial save/damage. Start turn/first entry on own turn: Strength save 1d12 bludgeoning/half and failure push 5 feet. Bonus action move 30 feet may affect only first creature passed through that turn. Loose debris heavily obscures until caster next turn start; track area/movement manually.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:earth-forming': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Earth Forming',
    {
      manual:
        'Manual slow reshaping of 20-foot soft-earth cube over 5 minutes within 30 feet; no initial save/damage. Hard material excluded, surrounding structures may destabilize. Only one active formation; unfinished work reverts. Ritual consumes 500-gp pickaxe.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:earth-leash': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Earth Leash',
    {
      mechanics: { save: { ability: 'str', onSave: 'negates' } },
      effect: {
        summary:
          'Prone; flying speed lost for 1 minute. Resolve actual fall distance/damage manually.',
        targeting: 'enemy',
        multi: false,
        build: ({ source }) => [
          {
            ...condition('Prone', { source, duration: { type: 'manual' } }),
            durationNote: 'Prone until stood up; flight loss 1 minute',
            concentration: false,
          },
          {
            ...reminder(
              'Earth Leash',
              'Prone; flying speed lost for 1 minute. Resolve actual fall distance/damage manually.',
              { source, duration: { type: 'manual' } },
            ),
            durationNote: 'Prone until stood up; flight loss 1 minute',
            concentration: false,
          },
        ],
      },
      manual:
        'Choose visible creature; failure Prone and flying speed removed for 1 minute. Falling damage depends on altitude, capped at 4d6, resolved manually without invented automatic 4d6. Higher slots add targets and raise cap.',
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
      effect: {
        summary:
          'Prone until stood up/removed; dirt/stone ground difficult terrain for others for 1 hour.',
        targeting: 'enemy',
        multi: true,
        build: ({ source }) => [
          {
            ...condition('Prone', { source, duration: { type: 'manual' } }),
            durationNote: 'Until stood up or removed',
            concentration: false,
          },
          {
            ...reminder(
              'Earth Rumble',
              'Prone until stood up/removed; dirt/stone ground difficult terrain for others for 1 hour.',
              { source, duration: { type: 'manual' } },
            ),
            durationNote: 'Until stood up or removed',
            concentration: false,
          },
        ],
      },
      manual:
        'Select other creatures within 10 feet. Failure Prone; it lasts until stood up or removed, not for a fixed round. Dirt/stone becomes difficult terrain for others for 1 hour. Higher slots add 1d6 damage and expand radius per two slot levels.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:eldritch-armor': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Eldritch Armor',
    {
      effect: ruleReminder(
        'Eldritch Armor',
        'Initially 1d4+4 temporary HP; while these remain, melee attacker takes 2d4 acid. Both scale to 5th-level cap.',
        { type: 'manual' },
        'self',
        false,
      ),
      manual:
        'Gain 1d4+4 temporary HP manually. While these remain, creature hitting caster in melee takes 2d4 acid manually. No initial damage or save; do not treat retaliation as an initial attack. Higher slots increase both dice by 2d4, capped at 5th-level values.',
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
      manual:
        'Select other creatures within 10 feet. Failures cannot react until their next turn start; successes instead have opportunity-attack disadvantage until that time. Apply both branch riders manually; +2d4 damage and up to +5 feet radius per higher slot.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:elemental-reflection': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Elemental Reflection',
    {
      manual:
        'Reaction resistance applies to triggering damage. Choose extension through caster next turn end or next-weapon-hit +1d8 of triggering type and type-dependent rider; no initial attack/save. Resolve acid delay, cold speed, ignition, reaction denial, or Deafened manually; higher slots add 1d8.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:elemental-shield': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Elemental Shield',
    {
      effect: ruleReminder(
        'Elemental Shield',
        'Chosen elemental immunity for caster and resistance for chosen creatures within 5 feet; bonus action changes type.',
        { type: 'manual' },
        'self',
        false,
      ),
      manual:
        'Choose elemental type: caster immune, chosen creatures within 5 feet resistant. Change type by bonus action; apply defenses and remove when aura membership/concentration ends manually. No initial save/damage or permanent defense mutation.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:enkindle': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Enkindle',
    {
      effect: ruleReminder(
        'Enkindle',
        'Holder turn-start Constitution 2d4 fire/half; failure disadvantage only using heated item. Full-minute concentration destroys nonmagical item.',
        { type: 'manual' },
        'self',
        false,
      ),
      manual:
        'Choose Medium or smaller unworn object. No initial damage/save. Holder turn starts Constitution save: 2d4 fire/half, failures disadvantage only with item. Full-minute concentration destroys nonmagical object; higher slots +1d4.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:erudition': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Erudition',
    {
      effect: ruleReminder(
        'Erudition',
        'Chosen skill proficiency/expertise or one-die reroll while advantaged if already expert; recast ends old spell.',
        { type: 'manual' },
        'self',
        false,
      ),
      manual:
        'Choose skill; manually grant proficiency, expertise if already proficient, or one-die reroll while advantaged if already expert. Recasting ends previous spell. No blanket all-check advantage or build-derived proficiency.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:ethereal-slip': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Ethereal Slip',
    {
      effect: ruleReminder(
        'Ethereal Slip',
        'End-turn d20 11+ slips Ethereal until next turn start; prior success/failure determines lower/higher of 2d20 next time.',
        { type: 'manual' },
        'self',
        false,
      ),
      manual:
        'No initial roll or invisibility condition. End turn d20 11+ shifts to Ethereal until next turn start; prior result changes next roll to lower/higher of 2d20. Track planar visibility/interactions, occupied return, and spell-end return manually.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:expose-weakness': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Expose Weakness',
    {
      mechanics: { save: { ability: 'cha', onSave: 'negates' } },
      effect: ruleReminder(
        'Expose Weakness',
        'Chosen nonphysical resistance removed; first two matching damage instances per round add 2d6. Restore defense when concentration ends.',
        { type: 'manual' },
        'enemy',
        false,
      ),
      manual:
        'Select visible creature and nonphysical damage type. Initial Charisma failure removes chosen resistance and enables +2d6 first two matching damage instances each round; no initial damage or vulnerability. Track per-round counter/defense restoration; higher slots increase counter per two levels.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:expulsion': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Expulsion',
    {
      mechanics: { save: { ability: 'cha', onSave: 'negates' } },
      effect: {
        summary:
          'Incapacitated/all-damage resistance. End-turn Charisma saves; extraplanar second failure disappears, third returns home.',
        targeting: 'enemy',
        multi: true,
        build: ({ source }) => [
          condition('Incapacitated', { source, duration: { type: 'rounds', rounds: 10 } }),
          reminder(
            'Expulsion',
            'Incapacitated/all-damage resistance. End-turn Charisma saves; extraplanar second failure disappears, third returns home.',
            { source, duration: { type: 'rounds', rounds: 10 } },
          ),
        ],
      },
      manual:
        'Select visible creature. Failed initial Charisma: Incapacitated and resistance to all damage. End-turn saves: success ends spell, extraplanar second failure disappears, third failure returns home. Full-duration concentration makes banishment permanent; position, saves, defenses and higher-slot targets manual.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:false-death': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'False Death',
    {
      effect: ruleReminder(
        'False Death',
        'Initially 10 temporary HP. Later feign death: Prone and nonpsychic resistance, ends on movement/action/bonus action/reaction.',
        { type: 'manual' },
        'ally',
        false,
      ),
      manual:
        'Touch willing creature; initially grant 10 temporary HP manually, no Prone/resistance until later action or hit/damage reaction feigns death. False state ends on movement/action/bonus action/reaction; leaving it ends spell. Track disease/poison suppression and touched dismissal manually.',
    },
  ),
}
