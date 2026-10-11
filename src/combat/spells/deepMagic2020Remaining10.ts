// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import type { ReviewedSpellCasting } from '../reviewedSpells.ts'
import { deepMagicProfile } from './deepMagic2020Profile.ts'
import { ruleReminder, reviewedDamage } from './reviewedProfile.ts'

export const DEEP_MAGIC_2020_REMAINING_10: Record<string, ReviewedSpellCasting> = {
  'kobold-press-deepm:kobolds-fury': deepMagicProfile('Kobold’s Fury', {
    effect: ruleReminder(
      'Kobold’s Fury',
      'Melee weapon advantage until target next turn end; next successful hit versus larger creature adds untyped 2d8 matching unresolved weapon context manually.',
      { type: 'manual' },
      'ally',
      true,
      'Track printed duration and any early endpoint manually',
    ),
    manual:
      'Melee weapon advantage until target next turn end; next successful hit versus larger creature adds untyped 2d8 matching unresolved weapon context manually.',
  }),
  'kobold-press-deepm:labyrinth-mastery': deepMagicProfile('Labyrinth Mastery', {
    effect: ruleReminder(
      'Labyrinth Mastery',
      'Maze navigation/memory; surprise checks and initiative advantage only while guided out. Action escapes Maze variants without check; benefits/navigation manual.',
      { type: 'manual' },
      'self',
      false,
      'Track printed duration and any early endpoint manually',
    ),
    manual:
      'Maze navigation/memory; surprise checks and initiative advantage only while guided out. Action escapes Maze variants without check; benefits/navigation manual.',
  }),
  'kobold-press-deepm:labyrinthine-howl': deepMagicProfile('Labyrinthine Howl', {
    mechanics: { save: { ability: 'wis', onSave: 'negates' } },
    manual:
      'Hearing enemies fail then choose 7d8 psychic and end, or prone/stunned until caster next turn end. Choice and higher-slot +2d8 damage manual.',
  }),
  'kobold-press-deepm:lacerate': deepMagicProfile('Lacerate', {
    mechanics: {
      save: { ability: 'con', onSave: 'half' },
      ...reviewedDamage([{ formula: '4d8', type: 'slashing' }], 2, [1]),
    },
    manual: 'Failure margin 5+ adds one exhaustion manually; +1d8 per higher slot.',
  }),
  'kobold-press-deepm:lair-sense': deepMagicProfile('Lair Sense', {
    effect: ruleReminder(
      'Lair Sense',
      'Know Tiny-or-larger entry/exit/type within shaped boundary while same plane; can awaken caster. Higher slots enlarge boundary and duration; area awareness manual.',
      { type: 'manual' },
      'self',
      false,
      'Track printed duration and any early endpoint manually',
    ),
    manual:
      'Know Tiny-or-larger entry/exit/type within shaped boundary while same plane; can awaken caster. Higher slots enlarge boundary and duration; area awareness manual.',
  }),
  'kobold-press-deepm:last-rays-of-the-dying-sun': deepMagicProfile('Last Rays of the Dying Sun', {
    mechanics: {
      save: { ability: 'dex', onSave: 'half' },
      ...reviewedDamage(
        [
          { formula: '6d6', type: 'fire' },
          { formula: '6d6', type: 'cold' },
        ],
        7,
        [1, 1],
      ),
    },
    manual:
      'Enemies only; fire then cold waves with same Dexterity half save. Both components gain +1d6 per higher slot.',
  }),
  'kobold-press-deepm:lava-stone': deepMagicProfile('Lava Stone', {
    manual:
      'Requires sling and immediate bonus-action ranged spell hit for 1d8 bludgeoning plus 6d6 fire. Later caster starts 4d6/2d6/1d6 fire, Medicine removal; staged attack/timing manual.',
  }),
  'kobold-press-deepm:lay-to-rest': deepMagicProfile('Lay to Rest', {
    mechanics: {
      save: { ability: 'con', onSave: 'half' },
      ...reviewedDamage([{ formula: '8d6', type: 'radiant' }], 5, [0]),
    },
    manual:
      'Only undead within 15 feet; killed targets disintegrate but leave possessions. Death transformation manual.',
  }),
  'kobold-press-deepm:legend-killer': deepMagicProfile('Legend Killer', {
    mechanics: { save: { ability: 'con', onSave: 'negates' } },
    effect: ruleReminder(
      'Legend Killer',
      'Target must have legendary actions and cannot spend legendary resistance on this save. Failure removes actions; end-turn successes restore one each. Resource edits/counters manual.',
      { type: 'manual' },
      'enemy',
      true,
      'Track printed consequence and endpoint manually',
    ),
    manual:
      'Target must have legendary actions and cannot spend legendary resistance on this save. Failure removes actions; end-turn successes restore one each. Resource edits/counters manual.',
  }),
  'kobold-press-deepm:legion': deepMagicProfile('Legion', {
    effect: ruleReminder(
      'Legion',
      'Cube difficult terrain. Only entry/turn-start nearby triggers melee spell attack for 3d8 necrotic; no attack on creation. Later attacks manual.',
      { type: 'rounds', rounds: 10 },
      'self',
      false,
      'up to 1 minute',
    ),
    manual:
      'Cube difficult terrain. Only entry/turn-start nearby triggers melee spell attack for 3d8 necrotic; no attack on creation. Later attacks manual.',
  }),
  'kobold-press-deepm:legion-of-rabid-squirrels': deepMagicProfile('Legion of Rabid Squirrels', {
    effect: ruleReminder(
      'Legion of Rabid Squirrels',
      'Forest-only swarm uses poisonous-snake swarm with climbing; commands/initiative manual. Beyond 60 feet ends; nearby canids disadvantaged against other targets. Higher-slot poison dice manual.',
      { type: 'rounds', rounds: 10 },
      'self',
      false,
      'up to 1 minute',
    ),
    manual:
      'Forest-only swarm uses poisonous-snake swarm with climbing; commands/initiative manual. Beyond 60 feet ends; nearby canids disadvantaged against other targets. Higher-slot poison dice manual.',
  }),
  'kobold-press-deepm:lesser-maze': deepMagicProfile('Lesser Maze', {
    mechanics: { save: { ability: 'int', onSave: 'negates' } },
    manual:
      'Failure banishes as Maze; action DC 12 Intelligence check escapes. Extradimensional movement and escape checks manual.',
  }),
  'kobold-press-deepm:life-drain': deepMagicProfile('Life Drain', {
    mechanics: {
      save: { ability: 'con', onSave: 'half' },
      ...reviewedDamage([{ formula: '10d6', type: 'necrotic' }], 6, [1]),
    },
    manual:
      'For each damaged creature choose different secondary healing recipient excluding constructs/undead, heal half actual damage. Healing/selection manual; +1d6 per higher slot.',
  }),
  'kobold-press-deepm:life-from-death': deepMagicProfile('Life from Death', {
    mechanics: {
      attackRoll: true,
      ...reviewedDamage([{ formula: '2d6', type: 'radiant' }], 3, [1]),
    },
    attackKind: 'melee',
    persistsAfterSave: true,
    manual:
      'Attack undead only; heal caster/eligible ally half actual damage, ally limited to half maximum HP. Later action attacks/healing manual; +1d6 higher slots.',
  }),
  'kobold-press-deepm:life-hack': deepMagicProfile('Life Hack', {
    effect: ruleReminder(
      'Life Hack',
      'Up to five share 120 temporary-HP pool divided per recipient; bonus actions draw only without existing temporary HP. No initial grant; counters/draws manual.',
      { type: 'manual' },
      'ally',
      true,
      'Track printed duration and any early endpoint manually',
    ),
    manual:
      'Up to five share 120 temporary-HP pool divided per recipient; bonus actions draw only without existing temporary HP. No initial grant; counters/draws manual.',
  }),
  'kobold-press-deepm:life-sense': deepMagicProfile('Life Sense', {
    effect: ruleReminder(
      'Life Sense',
      'Sense living nonconstruct/nonundead within 30 feet despite barriers; hiding Charisma success blocks this casting. Detection and voluntary later saves manual.',
      { type: 'rounds', rounds: 100 },
      'self',
      false,
      'up to 10 minutes',
    ),
    manual:
      'Sense living nonconstruct/nonundead within 30 feet despite barriers; hiding Charisma success blocks this casting. Detection and voluntary later saves manual.',
  }),
  'kobold-press-deepm:life-transference-arrow': deepMagicProfile('Life Transference Arrow', {
    manual:
      'Ranged spell hit either deals target 2d6 necrotic/heals caster or damages caster/heals target. Choose direction, actual damage/healing and +1d6 higher-slot scaling manually.',
  }),
  'kobold-press-deepm:litany-of-sure-hands': deepMagicProfile('Litany of Sure Hands', {
    effect: ruleReminder(
      'Litany of Sure Hands',
      'Permit simple nonattack/nonspell task as bonus action and ignore weapon loading; task eligibility/actions manual.',
      { type: 'rounds', rounds: 10 },
      'ally',
      true,
      '1 minute',
    ),
    manual:
      'Permit simple nonattack/nonspell task as bonus action and ignore weapon loading; task eligibility/actions manual.',
  }),
  'kobold-press-deepm:living-shadows': deepMagicProfile('Living Shadows', {
    effect: ruleReminder(
      'Living Shadows',
      'No initial save. Entry/turn-start Strength failure restrains; restrained turn-start Constitution failure exhaustion. Action Strength/Dexterity check escapes; later hazards manual.',
      { type: 'rounds', rounds: 10 },
      'self',
      false,
      '1 minute',
    ),
    manual:
      'No initial save. Entry/turn-start Strength failure restrains; restrained turn-start Constitution failure exhaustion. Action Strength/Dexterity check escapes; later hazards manual.',
  }),
  'kobold-press-deepm:lock-armor': deepMagicProfile('Lock Armor', {
    mechanics: { save: { ability: 'wis', onSave: 'negates' } },
    effect: ruleReminder(
      'Lock Armor',
      'Eligible moving-piece metal armor/metal constructs lock; breastplate unaffected, speech usually remains. Partial movement/paralysis, end-turn saves and Grease release manual; higher slots add targets.',
      { type: 'manual' },
      'enemy',
      true,
      'Track printed consequence and endpoint manually',
    ),
    manual:
      'Eligible moving-piece metal armor/metal constructs lock; breastplate unaffected, speech usually remains. Partial movement/paralysis, end-turn saves and Grease release manual; higher slots add targets.',
  }),
  'kobold-press-deepm:looping-trail': deepMagicProfile('Looping Trail', {
    manual:
      'Alter up-to-mile trail into misleading closed loop; Survival check notices looping. Navigation and route configuration manual.',
  }),
  'kobold-press-deepm:lovesick': deepMagicProfile('Lovesick', {
    mechanics: { save: { ability: 'wis', onSave: 'negates' } },
    effect: ruleReminder(
      'Lovesick',
      'Failure removes reactions and rolls printed d10 behavior each turn, including variable movement/attacks/armor loss. End-turn repeat saves and higher-slot radius manual.',
      { type: 'manual' },
      'enemy',
      true,
      'Track printed consequence and endpoint manually',
    ),
    manual:
      'Failure removes reactions and rolls printed d10 behavior each turn, including variable movement/attacks/armor loss. End-turn repeat saves and higher-slot radius manual.',
  }),
  'kobold-press-deepm:maddening-whispers': deepMagicProfile('Maddening Whispers', {
    mechanics: { save: { ability: 'cha', onSave: 'negates' } },
    effect: ruleReminder(
      'Maddening Whispers',
      'Requires hearing; failure incapacitates with speed 0. Caster must spend subsequent actions; any target damage ends spell. Restrictions/action upkeep manual.',
      { type: 'manual' },
      'enemy',
      true,
      'Track printed consequence and endpoint manually',
    ),
    manual:
      'Requires hearing; failure incapacitates with speed 0. Caster must spend subsequent actions; any target damage ends spell. Restrictions/action upkeep manual.',
  }),
  'kobold-press-deepm:maim': deepMagicProfile('Maim', {
    mechanics: {
      attackRoll: true,
      ...reviewedDamage([{ formula: '4d6', type: 'necrotic' }], 5, [0]),
    },
    attackKind: 'melee',
    manual:
      'Hit permanently withers chosen limb/body: printed check/attack penalties, speed loss, or selected physical defense alteration. Remove Curse/restoration ends rider; selected permanent consequence manual.',
  }),
  'kobold-press-deepm:malevolent-waves': deepMagicProfile('Malevolent Waves', {
    effect: ruleReminder(
      'Malevolent Waves',
      '30-foot aura: ally Stealth advantage and enemies poisoned only inside radius. Track moving area and remove on exit manually.',
      { type: 'rounds', rounds: 10 },
      'self',
      false,
      'up to 1 minute',
    ),
    manual:
      '30-foot aura: ally Stealth advantage and enemies poisoned only inside radius. Track moving area and remove on exit manually.',
  }),
  'kobold-press-deepm:mammons-due': deepMagicProfile('Mammon’s Due', {
    manual:
      'Pit automatically deals 10d6 fire initially/later; targets choose Strength/Dexterity save against restraint. Expanding radius, sinking/suffocation, escape checks and post-concentration cooling persistent pit manual.',
  }),
  'kobold-press-deepm:mark-prey': deepMagicProfile('Mark Prey', {
    effect: ruleReminder(
      'Mark Prey',
      'Caster-only outline, sight-dependent attack advantage, tracking advantages, invisibility ignored relative to caster. Bonus-action retarget after 0 HP and higher-slot hours manual.',
      { type: 'manual' },
      'enemy',
      true,
      'Track printed duration and any early endpoint manually',
    ),
    manual:
      'Caster-only outline, sight-dependent attack advantage, tracking advantages, invisibility ignored relative to caster. Bonus-action retarget after 0 HP and higher-slot hours manual.',
  }),
  'kobold-press-deepm:mass-hobble-mount': deepMagicProfile('Mass Hobble Mount', {
    mechanics: { attackRoll: true },
    attackKind: 'ranged',
    manual:
      'Separate attacks against up to six eligible ridden beasts; hit causes later 4d6 bludgeoning only when exceeding half base speed. No initial damage; movement triggers manual.',
  }),
  'kobold-press-deepm:mass-surge-dampener': deepMagicProfile('Mass Surge Dampener', {
    effect: ruleReminder(
      'Mass Surge Dampener',
      'Up to three others get DC 13 Charisma save against otherwise-unsaveable chaos surge, or advantage on existing surge save. Individual success expends protection; conditional saves manual.',
      { type: 'rounds', rounds: 10 },
      'ally',
      true,
      '1 minute, or until expended',
    ),
    manual:
      'Up to three others get DC 13 Charisma save against otherwise-unsaveable chaos surge, or advantage on existing surge save. Individual success expends protection; conditional saves manual.',
  }),
  'kobold-press-deepm:maw-of-needles': deepMagicProfile('Maw of Needles', {
    effect: ruleReminder(
      'Maw of Needles',
      'Grant later-action melee spell bite 2d6 piercing; Dexterity failure embeds spines causing later Constitution-negated 1d6. Single embedded target, casting-modifier repeat-hit bonus and two-slot scaling manual.',
      { type: 'rounds', rounds: 10 },
      'self',
      false,
      '1 minute',
    ),
    manual:
      'Grant later-action melee spell bite 2d6 piercing; Dexterity failure embeds spines causing later Constitution-negated 1d6. Single embedded target, casting-modifier repeat-hit bonus and two-slot scaling manual.',
  }),
}
