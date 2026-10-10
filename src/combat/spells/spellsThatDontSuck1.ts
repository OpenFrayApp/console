// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import type { ReviewedSpellCasting } from '../reviewedSpells.ts'
import { sourceProfile, ruleReminder } from './reviewedProfile.ts'
import { condition, reminder } from '../effects.ts'

export const SPELLS_THAT_DONT_SUCK_1: Record<string, ReviewedSpellCasting> = {
  'somanyrobots-spells-that-dont-suck:adaptation': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Adaptation',
    {
      effect: ruleReminder(
        'Adaptation',
        'Chosen environment options; action switches option, recast/dismiss ends spell.',
        { type: 'manual' },
        'ally',
        false,
      ),
      manual:
        'Touch one creature; choose environment adaptations and change options as an action. Apply swimming, glide reaction, tail, appearance, or natural weapon manually. No initial attack/save. Recasting or dismissal ends previous spell; higher slots change weapon bonus and option count.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:alter-weather': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Alter Weather',
    {
      manual:
        'Requires sight of sky; ends at turn end without it. Shift weather stages over 30 minutes, including cumulative precipitation/wind effects and weather-specific hourly DC 10 Constitution saves. Track protections, 1-mile radius, return to original weather, and higher-slot duration/radius manually.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:animal-ally': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Animal Ally',
    {
      effect: ruleReminder(
        'Animal Ally',
        'Within 120 feet: telepathy, casting proficiency bonus to beast checks, +1d6 hit damage, attack advantage only against creatures caster recently attacked.',
        { type: 'manual' },
        'ally',
        false,
      ),
      manual:
        'Choose friendly beast. Within 120 feet: telepathy, caster proficiency bonus to checks, +1d6 on hits, and advantage only against creatures caster attacked since last turn start. Sense sharing costs action until next turn start; no blanket attack advantage. Higher slots extend duration.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:animal-transformation': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Animal Transformation',
    {
      mechanics: { save: { ability: 'cha', onSave: 'negates' } },
      effect: ruleReminder(
        'Animal Transformation',
        'Chosen beast form; end-turn Charisma escape saves, zero-HP reversion and original HP/overflow tracked manually.',
        { type: 'manual' },
        'enemy',
        false,
      ),
      manual:
        'Select unwilling visible nonzero-HP creature for Charisma resolver; willing transformation bypasses save manually. Replace statistics/HP with eligible beast CR at most 4, retaining personality and allegiances. Track original HP, excess damage, end-turn escape saves, zero-HP reversion, and higher-slot CR manually.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:arcane-shelter': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Arcane Shelter',
    {
      manual:
        'Manual stationary 10-foot dome; enough space required. Designate up to ten passable creatures, count Large as four Medium, and spend 25 feet to cross. Blocks projectiles and magic; ends when caster exits. No initial save or creature armor bonus.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:arcane-wall': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Arcane Wall',
    {
      manual:
        'Manual invisible force wall geometry; creation pushes occupants to chosen side. Each panel AC 15/100 HP with printed immunities, blocks ethereal travel, immune to Dispel Magic but destroyed by Disintegrate. No initial save/damage; track 10-minute concentration.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:arcanist-s-sword': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    "Arcanist's Sword",
    {
      manual:
        'Choose Attack, Guard, or Whirl command manually on creation. Attack/Guard use melee spell attack and 3d10 plus casting modifier force; Whirl uses later Dexterity saves to negate 3d10. Move 20 feet on commands; Guard grants half cover and attacks once per command. No single unconditional creation attack; not concentration.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:arctic-breath': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Arctic Breath',
    {
      mechanics: {
        save: { ability: 'dex', onSave: 'half' },
        damage: [{ formula: '2d8', type: 'cold' }],
        scaling: [
          { by: 'slot', level: 2, damage: [{ formula: '3d8', type: 'cold' }] },
          { by: 'slot', level: 3, damage: [{ formula: '4d8', type: 'cold' }] },
          { by: 'slot', level: 4, damage: [{ formula: '5d8', type: 'cold' }] },
          { by: 'slot', level: 5, damage: [{ formula: '6d8', type: 'cold' }] },
          { by: 'slot', level: 6, damage: [{ formula: '7d8', type: 'cold' }] },
          { by: 'slot', level: 7, damage: [{ formula: '8d8', type: 'cold' }] },
          { by: 'slot', level: 8, damage: [{ formula: '9d8', type: 'cold' }] },
          { by: 'slot', level: 9, damage: [{ formula: '10d8', type: 'cold' }] },
        ],
      },
      effect: {
        summary: 'Failure: speed -10 until end of affected creature next turn.',
        targeting: 'enemy',
        multi: true,
        build: ({ source, target }) => [
          reminder(
            'Arctic Breath',
            'Failure: speed -10 until end of affected creature next turn.',
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
        'Select creatures in 30-by-5-foot line. Failures lose 10 feet speed until affected creature next turn end; track speed manually. Initial cold +1d8 per slot above 1st.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:assemble': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Assemble',
    {
      manual:
        'Manually assemble up to eight object equivalents from unfinished materials, never creatures, magic items, or attached products. Metal/stone limited to Medium; artisan proficiency required for skilled work, equivalent to eight hours work. No initial save/damage.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:aura-of-concealment': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Aura of Concealment',
    {
      effect: ruleReminder(
        'Aura of Concealment',
        'Chosen creatures within 30 feet: +5 Stealth and no nonmagical tracking; track aura membership.',
        { type: 'manual' },
        'self',
        false,
      ),
      manual:
        'Track chosen creatures within moving 30-foot aura: +5 Stealth and no nonmagical tracking. Apply bonus only while in aura; no all-Dexterity modifier. +1 bonus per slot above 2nd.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:aura-of-truth': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Aura of Truth',
    {
      effect: ruleReminder(
        'Aura of Truth',
        'First turn end within aura: Charisma save against deliberate lies. Action compels two yes/no answers then ends spell.',
        { type: 'manual' },
        'self',
        false,
      ),
      manual:
        'No initial save. First turn end within moving aura: Charisma save against lying; willing failure allowed and caster knows result. Action asks up to two truthful yes/no questions then ends spell. Higher slots increase radius/questions.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:beast-perception': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Beast Perception',
    {
      effect: ruleReminder(
        'Beast Perception',
        'Chosen sense option; action changes it. Perception advantage applies only to chosen sense.',
        { type: 'manual' },
        'self',
        false,
      ),
      manual:
        'Choose one sense option, switch as action. Hearing/sight/smell advantage applies only to corresponding Perception checks; echolocation requires audible squeaking preventing normal speech. Track darkvision, tremorsense, and web contact manually.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:befriend': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Befriend',
    {
      effect: ruleReminder(
        'Befriend',
        'Persuasion/Deception advantage only with chosen target; target knows influence and becomes hostile afterward.',
        { type: 'manual' },
        'enemy',
        false,
      ),
      manual:
        'Choose visible creature. No save and no Charmed condition printed; advantage only on Persuasion/Deception interactions with that target. After concentration ends target knows and becomes hostile; resolve response manually.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:befriend-beast': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Befriend Beast',
    {
      mechanics: { save: { ability: 'wis', onSave: 'negates' } },
      effect: {
        summary:
          'Charmed; harmless simple tasks/delivery. Harm by caster or companions ends spell.',
        targeting: 'enemy',
        multi: true,
        build: ({ source }) => [
          condition('Charmed', { source, duration: { type: 'manual' } }),
          reminder(
            'Befriend Beast',
            'Charmed; harmless simple tasks/delivery. Harm by caster or companions ends spell.',
            { source, duration: { type: 'manual' } },
          ),
        ],
      },
      manual:
        'Select beast that sees/hears caster. Intelligence 4+ automatically succeeds; resolve those saves as successes manually. Charmed ends if caster/companions harm beast. Tasks and delivery pace manual; higher slots extend duration or add targets.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:benediction': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Benediction',
    {
      effect: ruleReminder(
        'Benediction',
        'Once add 1d4 to chosen ability check before/after roll, then end spell.',
        { type: 'manual' },
        'ally',
        false,
      ),
      manual:
        'Choose creature that sees and understands caster. Once before spell ends add 1d4 to one chosen ability check, before or after roll, then clear concentration. No blanket advantage or permanent check bonus; observers with Intelligence 4+ know influence.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:bewilder': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Bewilder',
    {
      mechanics: { save: { ability: 'wis', onSave: 'negates' } },
      effect: ruleReminder(
        'Bewilder',
        'No reactions. Start turn: half movement random d8 direction, d4 behavior. End-turn/damage Wisdom escape saves.',
        { type: 'rounds', rounds: 10 },
        'enemy',
        true,
      ),
      manual:
        'Select creatures in 20-foot sphere. Failures cannot react; later turn starts move half speed in random d8 direction and use d4 behavior table. No initial Stunned/Frightened. End-turn or damage-triggered Wisdom escape saves manual; higher slots enlarge area.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:black-ice': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Black Ice',
    {
      persistsAfterSave: true,
      mechanics: {
        save: { ability: 'dex', onSave: 'negates' },
        damage: [{ formula: '1d6', type: 'cold' }],
        scaling: [
          { by: 'character', level: 5, damage: [{ formula: '2d6', type: 'cold' }] },
          { by: 'character', level: 11, damage: [{ formula: '3d6', type: 'cold' }] },
          { by: 'character', level: 17, damage: [{ formula: '4d6', type: 'cold' }] },
        ],
      },
      manual:
        'Select occupant of initial 5-foot ice square only. Ice persists after successful saves; Prone only on failure for Medium or smaller, applied manually independently of concentration. Later entry/turn-end saves and cantrip scaling manual.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:blade-burst': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Blade Burst',
    {
      mechanics: {
        save: { ability: 'dex', onSave: 'negates' },
        damage: [{ formula: '1d6', type: 'slashing' }],
        scaling: [
          { by: 'character', level: 5, damage: [{ formula: '2d6', type: 'slashing' }] },
          { by: 'character', level: 11, damage: [{ formula: '3d6', type: 'slashing' }] },
          { by: 'character', level: 17, damage: [{ formula: '4d6', type: 'slashing' }] },
        ],
      },
      manual:
        'Select other creatures within 5 feet. Base profile uses slashing; change to piercing manually if chosen, never combine both. Caster-level damage increases at 5/11/17.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:blazing-blade': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Blazing Blade',
    {
      manual:
        'Touch weapon; +1d6 fire and +1d6 radiant on hits, replace base type with chosen fire/radiant. No initial attack/save. Later Sunfire Swipe ends spell: separate Dexterity saves, 3d6 fire plus 3d6 radiant/half, failures holy fire 1 minute; undead/fiends disadvantage. Track visible-target attack advantage, no invisibility, and Wisdom end-turn escape manually.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:brilliance': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Brilliance',
    {
      manual:
        'Manual 60-foot bright sphere plus 60-foot dim light; not sunlight. Valid held/unworn object can carry light, opaque covering blocks it. Dispels overlapping darkness of spell level or lower. No initial save/damage.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:burst-of-flame': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Burst of Flame',
    {
      manual:
        'Choose Light, Heat, or Smoke manually; existing nonmagical flame is extinguished for enhanced option. Light Constitution save against Blinded until caster next turn end, Heat Constitution 3d6 fire/half (4d6 atop flame), Smoke heavily obscured cloud for 1 minute or strong breeze. Different options cannot share one resolver.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:call-for-aid': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Call for Aid',
    {
      manual:
        'Manually add servant chosen by powerful extraplanar being in unoccupied space. Friendly but not compelled to help; negotiate payment, task, and return. No initial attack/save, automatic control, or assumed creature statistics.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:captivate': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Captivate',
    {
      mechanics: { save: { ability: 'wis', onSave: 'negates' } },
      effect: {
        summary:
          'Charmed; initiative and other-creature Perception disadvantage. If rolling initiative, speed -10/no reactions until first turn ends. Requires seeing/hearing caster.',
        targeting: 'enemy',
        multi: true,
        build: ({ source }) => [
          condition('Charmed', { source, duration: { type: 'rounds', rounds: 10 } }),
          reminder(
            'Captivate',
            'Charmed; initiative and other-creature Perception disadvantage. If rolling initiative, speed -10/no reactions until first turn ends. Requires seeing/hearing caster.',
            { source, duration: { type: 'rounds', rounds: 10 } },
          ),
        ],
      },
      manual:
        'Select chosen creatures that can see/hear performance. Fighting caster/companions grants save advantage. Failures Charmed; conditional Perception/initiative disadvantage manual. If rolling initiative while affected, speed -10 and no reactions through first turn end. Remove when sight/hearing lost, caster incapacitated or unable to speak; higher slots extend duration/radius.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:caustic-quarrel': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Caustic Quarrel',
    {
      mechanics: {
        attackRoll: true,
        damage: [{ formula: '6d4', type: 'acid' }],
        scaling: [
          { by: 'slot', level: 3, damage: [{ formula: '7d4', type: 'acid' }] },
          { by: 'slot', level: 4, damage: [{ formula: '8d4', type: 'acid' }] },
          { by: 'slot', level: 5, damage: [{ formula: '9d4', type: 'acid' }] },
          { by: 'slot', level: 6, damage: [{ formula: '10d4', type: 'acid' }] },
          { by: 'slot', level: 7, damage: [{ formula: '11d4', type: 'acid' }] },
          { by: 'slot', level: 8, damage: [{ formula: '12d4', type: 'acid' }] },
          { by: 'slot', level: 9, damage: [{ formula: '13d4', type: 'acid' }] },
        ],
      },
      effect: {
        summary:
          '4d4 acid at affected creature next turn end unless action wipes it off. Higher slots add 1d4 to later damage too.',
        targeting: 'enemy',
        multi: false,
        build: ({ source, target }) => [
          reminder(
            'Caustic Quarrel',
            '4d4 acid at affected creature next turn end unless action wipes it off. Higher slots add 1d4 to later damage too.',
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
        'Choose one target. On hit only, coated acid: target may spend action to wipe off; otherwise 4d4 acid at end of its next turn, resolved manually. Both damage instances +1d4 per slot above 2nd. No damage on miss.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:circle-of-protection': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Circle of Protection',
    {
      effect: ruleReminder(
        'Circle of Protection',
        'Chosen type/CR boundary ward; later cross-boundary effects require Charisma save. Optional long casting removes concentration.',
        { type: 'manual' },
        'self',
        false,
      ),
      manual:
        'Manual grounded cylinder and selected creature type/CR limit. Later boundary-crossing attacks, spells, travel or effects require Charisma save; no creation save. Optional 10-minute casting removes concentration requirement, so manage concentration manually for that mode. Higher slots alter CR, duration, and concentration.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:cold-snap': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Cold Snap',
    {
      mechanics: {
        save: { ability: 'con', onSave: 'half' },
        damage: [{ formula: '3d8', type: 'cold' }],
        scaling: [
          { by: 'slot', level: 3, damage: [{ formula: '4d8', type: 'cold' }] },
          { by: 'slot', level: 4, damage: [{ formula: '5d8', type: 'cold' }] },
          { by: 'slot', level: 5, damage: [{ formula: '6d8', type: 'cold' }] },
          { by: 'slot', level: 6, damage: [{ formula: '7d8', type: 'cold' }] },
          { by: 'slot', level: 7, damage: [{ formula: '8d8', type: 'cold' }] },
          { by: 'slot', level: 8, damage: [{ formula: '9d8', type: 'cold' }] },
          { by: 'slot', level: 9, damage: [{ formula: '10d8', type: 'cold' }] },
        ],
      },
      effect: ruleReminder(
        'Cold Snap',
        'Failed targets speed -10 until caster next turn start; ground difficult terrain even on success.',
        { type: 'untilSourceTurn', when: 'startOfTurn' },
        'enemy',
        true,
      ),
      manual:
        'Select creatures in initial 5-foot sphere. Failed targets speed -10 until caster next turn start; ground difficult terrain until that same time even on successes. Track movement/terrain manually. +1d8 cold per slot above 2nd.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:command-beast': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Command Beast',
    {
      mechanics: { save: { ability: 'wis', onSave: 'negates' } },
      effect: {
        summary:
          'Charmed; telepathic commands. Action full control through caster next turn end; shared reaction cost. Damage triggers Wisdom escape save.',
        targeting: 'enemy',
        multi: false,
        build: ({ source }) => [
          condition('Charmed', { source, duration: { type: 'rounds', rounds: 10 } }),
          reminder(
            'Command Beast',
            'Charmed; telepathic commands. Action full control through caster next turn end; shared reaction cost. Damage triggers Wisdom escape save.',
            { source, duration: { type: 'rounds', rounds: 10 } },
          ),
        ],
      },
      manual:
        'Select visible beast; CR 4+ automatically succeeds at base slot. Fighting caster/allies grants advantage. Damage triggers new Wisdom escape save. Telepathic commands and action full control through caster next turn end, including shared reaction cost, manual. Slots 4+ remove CR limit.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:command-objects': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Command Objects',
    {
      manual:
        'Manually animate same-size eligible nonmagical objects with printed count/statistics. Turn immediately after caster; bonus-action command within range or Dodge. Object attacks use caster spell attack modifier, not an initial spell attack. Track object form, damage type, attached speed 0, destruction and overflow.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:cone-of-flame': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Cone of Flame',
    {
      mechanics: {
        save: { ability: 'dex', onSave: 'half' },
        damage: [{ formula: '3d6', type: 'fire' }],
        scaling: [
          { by: 'slot', level: 2, damage: [{ formula: '4d6', type: 'fire' }] },
          { by: 'slot', level: 3, damage: [{ formula: '5d6', type: 'fire' }] },
          { by: 'slot', level: 4, damage: [{ formula: '6d6', type: 'fire' }] },
          { by: 'slot', level: 5, damage: [{ formula: '7d6', type: 'fire' }] },
          { by: 'slot', level: 6, damage: [{ formula: '8d6', type: 'fire' }] },
          { by: 'slot', level: 7, damage: [{ formula: '9d6', type: 'fire' }] },
          { by: 'slot', level: 8, damage: [{ formula: '10d6', type: 'fire' }] },
          { by: 'slot', level: 9, damage: [{ formula: '11d6', type: 'fire' }] },
        ],
      },
      manual:
        'Select creatures in 15-foot cone; ignite unworn/uncarried flammables manually. +1d6 fire and +5 feet cone per slot above 1st.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:confinement': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Confinement',
    {
      manual:
        'Manual cage/box geometry, AC 17/140 HP; trap wholly enclosed creatures and push partial/oversized creatures outside. No initial save. Later teleport/interplanar escape requires Charisma save; blocks ethereal travel, immune to Dispel Magic. Higher slots increase AC/HP.',
    },
  ),
}
