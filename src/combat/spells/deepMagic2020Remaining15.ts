// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import type { ReviewedSpellCasting } from '../reviewedSpells.ts'
import { deepMagicProfile } from './deepMagic2020Profile.ts'
import { reviewedDamage, ruleReminder } from './reviewedProfile.ts'

export const DEEP_MAGIC_2020_REMAINING_15: Record<string, ReviewedSpellCasting> = {
  'kobold-press-deepm:thunder-bolt': deepMagicProfile('Thunder Bolt', {
    mechanics: {
      attackRoll: true,
      ...reviewedDamage([{ formula: '1d8', type: 'thunder' }], 0, [1]),
    },
    attackKind: 'ranged',
    manual:
      'Hit blocks reactions until caster next turn start; rider manual. Cantrip scales at 5/11/17.',
  }),
  'kobold-press-deepm:thunderclap': deepMagicProfile('Thunderclap', {
    mechanics: {
      save: { ability: 'con', onSave: 'half' },
      ...reviewedDamage([{ formula: '8d4', type: 'thunder' }], 3, [0]),
    },
    manual:
      'Failure deafens 1d8 rounds, margin 5+ also stuns one round. Silence prevents spell; brittle objects separate Dexterity protection saves. Rolled riders/object damage manual.',
  }),
  'kobold-press-deepm:thunderous-charge': deepMagicProfile('Thunderous Charge', {
    manual:
      'Move straight up to 10 feet then melee weapon hit chooses +5 damage or 10-foot shove; higher slots add movement/thunder. Weapon attack/choice manual.',
  }),
  'kobold-press-deepm:thunderous-stampede': deepMagicProfile('Thunderous Stampede', {
    manual:
      'Three targets use Thunderous Charge source rules, noncaster reactions required. Higher slots add movement/thunder; weapon attacks/choice and reactions manual.',
  }),
  'kobold-press-deepm:thunderous-wave': deepMagicProfile('Thunderous Wave', {
    manual:
      'Strength failure pushes 30 feet/prone, success pushes 15; damage only on collision, 5d6/2d6 respectively. Move first and resolve conditional collision manually, no immediate generic damage.',
  }),
  'kobold-press-deepm:thunderstorm': deepMagicProfile('Thunderstorm', {
    effect: ruleReminder(
      'Thunderstorm',
      'Willing target gets 60-foot flight inside heavily obscuring 30-foot cloud transparent to itself. Thunder/lightning harmless; flight/visibility manual.',
      { type: 'manual' },
      'ally',
      true,
      'Track printed duration and any early endpoint manually',
    ),
    manual:
      'Willing target gets 60-foot flight inside heavily obscuring 30-foot cloud transparent to itself. Thunder/lightning harmless; flight/visibility manual.',
  }),
  'kobold-press-deepm:tidal-barrier': deepMagicProfile('Tidal Barrier', {
    effect: ruleReminder(
      'Tidal Barrier',
      'Moving difficult-terrain aura; no initial save. Entry/turn-start Strength failure pushes 10 feet and speed 0 until target next turn start. Later saves/position manual.',
      { type: 'rounds', rounds: 10 },
      'self',
      false,
      'up to 1 minute',
    ),
    manual:
      'Moving difficult-terrain aura; no initial save. Entry/turn-start Strength failure pushes 10 feet and speed 0 until target next turn start. Later saves/position manual.',
  }),
  'kobold-press-deepm:time-in-a-bottle': deepMagicProfile('Time in a Bottle', {
    effect: ruleReminder(
      'Time in a Bottle',
      'Isolate 20-foot time field, freeze/reverse/advance up to minute; nobody can enter/affect. Action ending, restored states and time operations manual.',
      { type: 'rounds', rounds: 10 },
      'self',
      false,
      'up to 1 minute',
    ),
    manual:
      'Isolate 20-foot time field, freeze/reverse/advance up to minute; nobody can enter/affect. Action ending, restored states and time operations manual.',
  }),
  'kobold-press-deepm:time-jump': deepMagicProfile('Time Jump', {
    mechanics: { save: { ability: 'con', onSave: 'negates' } },
    manual:
      'Construct failure disappears 1d4+1 rounds immune to interaction, returns unaware. Rolled removal/return timer manual despite Instantaneous header.',
  }),
  'kobold-press-deepm:time-loop': deepMagicProfile('Time Loop', {
    manual:
      'Initial teleport occurs even on successful Wisdom save; failure repeats prior turn sequence or incapacitates if impossible. Later start teleports/end saves, occupied spaces and action history manual.',
  }),
  'kobold-press-deepm:time-slippage': deepMagicProfile('Time Slippage', {
    manual:
      'Both Intelligence outcomes affect target: failure stun, success half-speed/attack-save disadvantage. Duration-wide save advantages/disadvantages and three-consecutive-success ending counter; mixed states/timers manual.',
  }),
  'kobold-press-deepm:time-step': deepMagicProfile('Time Step', {
    manual:
      'Caster disappears untargetable until next turn start then reappears in visible chosen spot within 30 feet of origin. No awareness while missing; removal/return manual.',
  }),
  'kobold-press-deepm:time-vortex': deepMagicProfile('Time Vortex', {
    mechanics: { save: { ability: 'wis', onSave: 'negates' } },
    persistsAfterSave: true,
    manual:
      'Initial/later failure removes reactions, turn-start d10 table alters condition/speed/next-round initiative. Successful save grants casting immunity; bonus-action movement/higher-slot area and counters manual.',
  }),
  'kobold-press-deepm:timely-distraction': deepMagicProfile('Timely Distraction', {
    mechanics: { save: { ability: 'wis', onSave: 'negates' } },
    manual:
      'Failure rolls d4 blinded/stunned/deafened/prone; three-round expiry or end-turn repeat save. Selected condition/standing manual.',
  }),
  'kobold-press-deepm:tireless': deepMagicProfile('Tireless', {
    effect: ruleReminder(
      'Tireless',
      'No food/drink/rest need, triple overland speed/labor; does not prevent magical fatigue/exhaustion. Conditional travel/stamina manual.',
      { type: 'manual' },
      'ally',
      true,
      'Track printed duration and any early endpoint manually',
    ),
    manual:
      'No food/drink/rest need, triple overland speed/labor; does not prevent magical fatigue/exhaustion. Conditional travel/stamina manual.',
  }),
  'kobold-press-deepm:tongue-of-sand': deepMagicProfile('Tongue of Sand', {
    manual:
      'Implant triggered ≤25-word message in eligible sand; after trigger answer two ≤10-word questions as caster within 10 minutes. Trigger/communication/manual lifetime.',
  }),
  'kobold-press-deepm:tongue-tied': deepMagicProfile('Tongue Tied', {
    mechanics: { save: { ability: 'wis', onSave: 'negates' } },
    effect: ruleReminder(
      'Tongue Tied',
      'Failure prevents verbal communication, speech Charisma disadvantage; verbal casting needs Constitution check against caster DC, failure spends action not slot. Checks/restrictions manual.',
      { type: 'manual' },
      'enemy',
      true,
      'Track printed consequence and endpoint manually',
    ),
    manual:
      'Failure prevents verbal communication, speech Charisma disadvantage; verbal casting needs Constitution check against caster DC, failure spends action not slot. Checks/restrictions manual.',
  }),
  'kobold-press-deepm:torrent-of-fire': deepMagicProfile('Torrent of Fire', {
    mechanics: {
      save: { ability: 'dex', onSave: 'half' },
      ...reviewedDamage([{ formula: '6d6', type: 'fire' }], 4, [0]),
    },
    manual:
      '60-foot cone; caster may reposition anywhere within without movement/opportunity attacks. Optional position change manual.',
  }),
  'kobold-press-deepm:touch-of-the-unliving': deepMagicProfile('Touch of the Unliving', {
    mechanics: {
      attackRoll: true,
      ...reviewedDamage([{ formula: '2d6', type: 'necrotic' }], 3, [1]),
    },
    attackKind: 'melee',
    persistsAfterSave: true,
    manual:
      'Hit nonundead paralyzes until target next turn end; undead still take damage. Later action attacks/rider manual; +1d6 per higher slot.',
  }),
  'kobold-press-deepm:tracer': deepMagicProfile('Tracer', {
    effect: ruleReminder(
      'Tracer',
      'Initial/later bonus actions mark fired ammunition; weapon hit transfers beacon with same-plane directional warmth. Single target replaces prior beacon, Arcana detects; weapon trigger/manual.',
      { type: 'manual' },
      'self',
      false,
      'Track printed duration and any early endpoint manually',
    ),
    manual:
      'Initial/later bonus actions mark fired ammunition; weapon hit transfers beacon with same-plane directional warmth. Single target replaces prior beacon, Arcana detects; weapon trigger/manual.',
  }),
  'kobold-press-deepm:treasure-chasm': deepMagicProfile('Treasure Chasm', {
    mechanics: { save: { ability: 'wis', onSave: 'negates' } },
    effect: ruleReminder(
      'Treasure Chasm',
      'Failure compels next-turn movement then incapacitated treasure gathering; friendly harm/end-turn save ends. Dragons disadvantage initially but advantage after arrival; behavior/phase modifiers manual.',
      { type: 'manual' },
      'enemy',
      true,
      'Track printed consequence and endpoint manually',
    ),
    manual:
      'Failure compels next-turn movement then incapacitated treasure gathering; friendly harm/end-turn save ends. Dragons disadvantage initially but advantage after arrival; behavior/phase modifiers manual.',
  }),
  'kobold-press-deepm:tree-heal': deepMagicProfile('Tree Heal', {
    manual:
      'Plant-only touch heals 1d4 or cures one disease/removes pests; per-target 24-hour recast prohibition. Healing/choice/manual eligibility.',
  }),
  'kobold-press-deepm:tree-running': deepMagicProfile('Tree Running', {
    effect: ruleReminder(
      'Tree Running',
      'Willing creature climbs at walking speed only on rooted living plant/fungus, hands free, even unsupported branches. Conditional movement manual.',
      { type: 'manual' },
      'ally',
      true,
      'Track printed duration and any early endpoint manually',
    ),
    manual:
      'Willing creature climbs at walking speed only on rooted living plant/fungus, hands free, even unsupported branches. Conditional movement manual.',
  }),
  'kobold-press-deepm:tree-speak': deepMagicProfile('Tree Speak', {
    manual:
      'Ask touched tree one question for sensory answer without reliable humanoid timescale; can instead converse with merged tree creature. Information manual.',
  }),
  'kobold-press-deepm:trench': deepMagicProfile('Trench', {
    manual:
      'Create permanent trench only on eligible empty flat earth, not stone/paving; higher slots choose width/length increases. Terrain manual.',
  }),
  'kobold-press-deepm:trick-question': deepMagicProfile('Trick Question', {
    mechanics: { save: { ability: 'wis', onSave: 'negates' } },
    manual:
      'Hearing failure compels truthful one-word answer then knows magic used. Question/answer adjudication manual.',
  }),
  'kobold-press-deepm:triumph-of-ice': deepMagicProfile('Triumph of Ice', {
    manual:
      'Choose air/earth/fire/water mode; creature-element-specific saves, damage, terrain, falling and rolled conditions differ. No universal initial save/damage; element/area/ongoing effects manual.',
  }),
  'kobold-press-deepm:twist-the-skein': deepMagicProfile('Twist the Skein', {
    manual:
      'Roll d20 minus 10 and add signed result to triggering attack/save/skill roll, recalculating outcome. No persistent modifier or RNG adjustment.',
  }),
  'kobold-press-deepm:umbral-storm': deepMagicProfile('Umbral Storm', {
    effect: ruleReminder(
      'Umbral Storm',
      'No initial damage. First own-turn entry/turn-start Constitution half-save 6d8 necrotic, failure exhaustion; bonus action moves storm 30 feet. Later damage/saves manual.',
      { type: 'rounds', rounds: 10 },
      'self',
      false,
      'up to 1 minute',
    ),
    manual:
      'No initial damage. First own-turn entry/turn-start Constitution half-save 6d8 necrotic, failure exhaustion; bonus action moves storm 30 feet. Later damage/saves manual.',
  }),
  'kobold-press-deepm:uncontrollable-transformation': deepMagicProfile(
    'Uncontrollable Transformation',
    {
      effect: ruleReminder(
        'Uncontrollable Transformation',
        'Roll d10 mutation or choose from two rolls at exhaustion cost; each higher-slot extra mutation independently controlled/costed. Selected statistics/defenses/reversion manual.',
        { type: 'manual' },
        'self',
        false,
        'Track printed duration and any early endpoint manually',
      ),
      manual:
        'Roll d10 mutation or choose from two rolls at exhaustion cost; each higher-slot extra mutation independently controlled/costed. Selected statistics/defenses/reversion manual.',
    },
  ),
}
