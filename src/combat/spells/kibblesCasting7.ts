// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import type { ReviewedSpellCasting } from '../reviewedSpells.ts'
import { kibblesProfile, kibblesDamage } from './kibblesProfile.ts'
import { ruleReminder } from './reviewedProfile.ts'
import { condition } from '../effects.ts'

export const KIBBLES_CASTING_7: Record<string, ReviewedSpellCasting> = {
  'kibblestasty-casting-compendium-v2.3:mind-blast': kibblesProfile('Mind Blast', {
    mechanics: {
      save: { ability: 'int', onSave: 'half' },
      ...kibblesDamage([{ formula: '6d8', type: 'psychic' }], 6, [0]),
    },
    effect: {
      summary: 'Stunned',
      targeting: 'enemy',
      multi: true,
      build: ({ source, target }) => [
        condition('Stunned', {
          source: target?.combatantId ?? source,
          duration: { type: 'untilSourceTurn', when: 'endOfTurn' },
        }),
      ],
    },
    manual:
      'Select creatures in 60-foot cone. Failed initial saves stun until affected creature next turn end, with target-owned timer.',
  }),
  'kibblestasty-casting-compendium-v2.3:mind-ray': kibblesProfile('Mind Ray', {
    mechanics: {
      save: { ability: 'wis', onSave: 'half' },
      ...kibblesDamage([{ formula: '2d8', type: 'psychic' }], 1, [1]),
    },
    effect: ruleReminder(
      'Mind Ray',
      'Ignores cover/physical barriers. Failed save imposes disadvantage only on next attack or ability check before caster next turn start. Consume reminder on eligible roll manually; psychic +1d8 per higher slot.',
      { type: 'untilSourceTurn', when: 'startOfTurn' },
      'enemy',
      true,
    ),
    manual:
      'Ignores cover/physical barriers. Failed save imposes disadvantage only on next attack or ability check before caster next turn start. Consume reminder on eligible roll manually; psychic +1d8 per higher slot.',
  }),
  'kibblestasty-casting-compendium-v2.3:mirror-army': kibblesProfile('Mirror Army', {
    effect: ruleReminder(
      'Mirror Army',
      'Create duplicates for chosen allies within 30 feet. Incoming attacks roll d20, 11+ redirects to duplicate armor class 10 plus Dexterity modifier; hit destroys duplicate. Other damage ignored, special senses bypass illusion. Track copies individually; no armor bonus.',
      { type: 'manual' },
      'ally',
      true,
    ),
    manual:
      'Create duplicates for chosen allies within 30 feet. Incoming attacks roll d20, 11+ redirects to duplicate armor class 10 plus Dexterity modifier; hit destroys duplicate. Other damage ignored, special senses bypass illusion. Track copies individually; no armor bonus.',
  }),
  'kibblestasty-casting-compendium-v2.3:morbid-puppet': kibblesProfile('Morbid Puppet', {
    manual:
      'Eligible unconscious/recently dead Medium or smaller target. Later bonus action moves 20 feet and melee attacks with caster modifier and target weapon/size damage. Conscious target gets end-turn Charisma escape save; higher slots allow Large. No initial attack.',
  }),
  'kibblestasty-casting-compendium-v2.3:mounting-paranoia': kibblesProfile('Mounting Paranoia', {
    effect: ruleReminder(
      'Mounting Paranoia',
      'No initial save. Shadow vision limits targeting; Wisdom saves for redirection, seeing formerly shadowed creature causes fear, end-turn failures narrow vision and third failure paralyzes. Successful end-turn save ends spell. Track each trigger and vision manually.',
      { type: 'manual' },
      'enemy',
      true,
    ),
    manual:
      'No initial save. Shadow vision limits targeting; Wisdom saves for redirection, seeing formerly shadowed creature causes fear, end-turn failures narrow vision and third failure paralyzes. Successful end-turn save ends spell. Track each trigger and vision manually.',
  }),
  'kibblestasty-casting-compendium-v2.3:multishot': kibblesProfile('Multishot', {
    manual:
      'Imbue ammunition/thrown weapon through caster next turn end; first attack adds second target with separate ranged weapon attack for 2d8 force without modifiers. Higher slots add targets. No initial spell attack.',
  }),
  'kibblestasty-casting-compendium-v2.3:mutate': kibblesProfile('Mutate', {
    effect: ruleReminder(
      'Mutate',
      'Choose up to three mutation properties, action changes selections. Apply size, speed, reach, replacement armor class, scoped advantage, later regenerating temporary HP, and natural weapon manually. Higher slots add options, no unconditional defenses or initial attack.',
      { type: 'manual' },
      'self',
      false,
    ),
    manual:
      'Choose up to three mutation properties, action changes selections. Apply size, speed, reach, replacement armor class, scoped advantage, later regenerating temporary HP, and natural weapon manually. Higher slots add options, no unconditional defenses or initial attack.',
  }),
  'kibblestasty-casting-compendium-v2.3:nauseating-poison': kibblesProfile('Nauseating Poison', {
    effect: ruleReminder(
      'Nauseating Poison',
      'Next melee hit before caster next turn start adds 1d12 poison then Constitution save against poisoned until caster next turn end. Ends when damage dealt or next turn start; no initial damage/save.',
      { type: 'untilSourceTurn', when: 'startOfTurn' },
      'self',
      false,
    ),
    manual:
      'Next melee hit before caster next turn start adds 1d12 poison then Constitution save against poisoned until caster next turn end. Ends when damage dealt or next turn start; no initial damage/save.',
  }),
  'kibblestasty-casting-compendium-v2.3:nullify-effect': kibblesProfile('Nullify Effect', {
    effect: ruleReminder(
      'Nullify Effect',
      'Until caster next turn start: mental-save advantage including triggering save, psychic/force resistance. Slot 4+ permits one reroll, 5+ grants immunity instead. Apply defenses and reroll manually.',
      { type: 'untilSourceTurn', when: 'startOfTurn' },
      'self',
      false,
    ),
    manual:
      'Until caster next turn start: mental-save advantage including triggering save, psychic/force resistance. Slot 4+ permits one reroll, 5+ grants immunity instead. Apply defenses and reroll manually.',
  }),
  'kibblestasty-casting-compendium-v2.3:orbital-stones': kibblesProfile('Orbital Stones', {
    effect: ruleReminder(
      'Orbital Stones',
      'Orbit three eligible rocks; three-quarter cover with three, half with at least one. Later bonus-action fling uses ranged spell attack for 3d10 bludgeoning and 5-foot push. Track rock count/cover manually; no initial attack.',
      { type: 'manual' },
      'self',
      false,
    ),
    manual:
      'Orbit three eligible rocks; three-quarter cover with three, half with at least one. Later bonus-action fling uses ranged spell attack for 3d10 bludgeoning and 5-foot push. Track rock count/cover manually; no initial attack.',
  }),
  'kibblestasty-casting-compendium-v2.3:pillar-of-fire': kibblesProfile('Pillar of Fire', {
    mechanics: {
      save: { ability: 'dex', onSave: 'half' },
      ...kibblesDamage([{ formula: '10d6', type: 'fire' }], 4, [1]),
    },
    manual: 'Select creatures in 5-foot-radius, 30-foot-high cylinder. Fire +1d6 per higher slot.',
  }),
  'kibblestasty-casting-compendium-v2.3:platinum-lances': kibblesProfile('Platinum Lances', {
    mechanics: {
      save: { ability: 'dex', onSave: 'half' },
      ...kibblesDamage([{ formula: '8d8', type: 'radiant' }], 6, [1]),
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
      'Select creatures in four cylinders; overlapping targets affected once. Failed saves knock prone; radiant +1d8 per higher slot.',
  }),
  'kibblestasty-casting-compendium-v2.3:poison-blast': kibblesProfile('Poison Blast', {
    mechanics: {
      save: { ability: 'con', onSave: 'half' },
      ...kibblesDamage([{ formula: '4d12', type: 'poison' }], 4, [0]),
    },
    effect: ruleReminder(
      'Poison Blast',
      'Poison cloud persists until caster turn start; target poisoned expiry and later 2d4 turn-end damage manual.',
      { type: 'manual' },
      'self',
      false,
      'Cloud until caster’s next turn start; poison until target’s next turn start',
    ),
    manual:
      'Select 30-foot cone. Failed saves poisoned until target next turn start; track target timer manually. Area lightly obscured until caster turn start; later turn ends within area deal separate 2d4 poison. Mixed target/caster timers manual.',
  }),
  'kibblestasty-casting-compendium-v2.3:poison-dart': kibblesProfile('Poison Dart', {
    attackKind: 'ranged',
    mechanics: {
      attackRoll: true,
      ...kibblesDamage([{ formula: '3d12', type: 'poison' }], 2, [1]),
    },
    manual:
      'Ranged spell attack. Only on hit make separate Constitution save against poisoned until caster next turn start. Do not poison automatically on hit. Poison +1d12 per higher slot.',
  }),
  'kibblestasty-casting-compendium-v2.3:power-torrent': kibblesProfile('Power Torrent', {
    manual:
      'Automatic 4d12+4 force in line, no save/attack, bypass nonmagical obstacles. Dispel level-1-or-lower spells and impose concentration save disadvantage from damage manually. Higher slots add 1d12+1 each.',
  }),
  'kibblestasty-casting-compendium-v2.3:preservation': kibblesProfile('Preservation', {
    manual:
      'Preserve eligible object/container, ends on recast/destruction/24 hours. Does not slow interactions. Printed progression repeats 11th level for both fourth/fifth speed; leave ambiguity to GM. No combat modifier.',
  }),
  'kibblestasty-casting-compendium-v2.3:pressure-cutter': kibblesProfile('Pressure Cutter', {
    mechanics: {
      save: { ability: 'dex', onSave: 'half' },
      ...kibblesDamage([{ formula: '10d6', type: 'slashing' }], 5, [1]),
    },
    manual: 'Select creatures in 60-by-15-foot line. Slashing +1d6 per higher slot.',
  }),
  'kibblestasty-casting-compendium-v2.3:prismatic-flash': kibblesProfile('Prismatic Flash', {
    manual:
      'Manual Constitution save in 15-foot cone: failure blinded, success cannot opportunity attack, both until caster next turn start. Already blinded/unable to see unaffected. Higher slots enlarge cone; both outcomes manual.',
  }),
  'kibblestasty-casting-compendium-v2.3:pseudopod-slam': kibblesProfile('Pseudopod Slam', {
    attackKind: 'melee',
    mechanics: { attackRoll: true, ...kibblesDamage([{ formula: '8d4', type: 'acid' }], 2, [2]) },
    manual:
      'Melee spell attack; hit moves target 5 feet in chosen direction manually. Acid +2d4 per higher slot.',
  }),
  'kibblestasty-casting-compendium-v2.3:psychic-drain': kibblesProfile('Psychic Drain', {
    mechanics: {
      save: { ability: 'cha', onSave: 'negates' },
      ...kibblesDamage([{ formula: '3d8', type: 'psychic' }], 2, [0]),
    },
    manual:
      'Initial Charisma failure deals psychic; caster gains half actual damage as temporary HP and one psi point manually. Higher slots add the printed 1d8 manually; no per-slot progression is stated. Resource changes not modeled.',
  }),
  'kibblestasty-casting-compendium-v2.3:pyroclastic-lance': kibblesProfile('Pyroclastic Lance', {
    attackKind: 'ranged',
    mechanics: { attackRoll: true, ...kibblesDamage([{ formula: '8d6', type: 'fire' }], 5, [1]) },
    manual:
      'Ranged spell attack for initial fire only. Hit or miss creates ash cloud through caster next turn start; later turn-start Constitution failure deals 4d6 fire and blindness through target next turn start. Track cloud manually on both outcomes; initial +1d6 per higher slot.',
  }),
  'kibblestasty-casting-compendium-v2.3:quicksand': kibblesProfile('Quicksand', {
    effect: ruleReminder(
      'Quicksand',
      'No initial save/damage. Movement within/out costs fourfold; turn-end Strength save against prone. Track terrain and later saves manually.',
      { type: 'manual' },
      'self',
      false,
    ),
    manual:
      'No initial save/damage. Movement within/out costs fourfold; turn-end Strength save against prone. Track terrain and later saves manually.',
  }),
  'kibblestasty-casting-compendium-v2.3:quicksilver-steps': kibblesProfile('Quicksilver Steps', {
    effect: ruleReminder(
      'Quicksilver Steps',
      'Movement does not provoke; at another creature turn end move up to 10 feet, four uses restored at caster turn start. Only first attack after each move has disadvantage. Higher slots add uses; track movement and conditional disadvantage manually.',
      { type: 'manual' },
      'self',
      false,
    ),
    manual:
      'Movement does not provoke; at another creature turn end move up to 10 feet, four uses restored at caster turn start. Only first attack after each move has disadvantage. Higher slots add uses; track movement and conditional disadvantage manually.',
  }),
  'kibblestasty-casting-compendium-v2.3:rain-of-spiders': kibblesProfile('Rain of Spiders', {
    effect: ruleReminder(
      'Rain of Spiders',
      'Create separate spider swarms on each target in cylinder, acting after host. Action Athletics/Acrobatics removes swarm against caster DC; attacks use higher of swarm or caster modifier. No initial attack; manage swarm creatures and disappearance manually.',
      { type: 'manual' },
      'self',
      false,
    ),
    manual:
      'Create separate spider swarms on each target in cylinder, acting after host. Action Athletics/Acrobatics removes swarm against caster DC; attacks use higher of swarm or caster modifier. No initial attack; manage swarm creatures and disappearance manually.',
  }),
  'kibblestasty-casting-compendium-v2.3:rain-of-swords': kibblesProfile('Rain of Swords', {
    effect: ruleReminder(
      'Rain of Swords',
      'No initial save/damage. First entry on own turn or turn start triggers Dexterity save for 6d10 slashing, half on success. Swords can be used as nonmagical longswords until spell ends. Resolve triggers manually.',
      { type: 'manual' },
      'self',
      false,
    ),
    manual:
      'No initial save/damage. First entry on own turn or turn start triggers Dexterity save for 6d10 slashing, half on success. Swords can be used as nonmagical longswords until spell ends. Resolve triggers manually.',
  }),
  'kibblestasty-casting-compendium-v2.3:repair': kibblesProfile('Repair', {
    manual:
      'Heal construct/object 10d6 or reverse aging 10d6 years; condition only improves. Reattach material and apply healing manually; higher slots add 2d6. No damage.',
  }),
  'kibblestasty-casting-compendium-v2.3:returning-weapon': kibblesProfile('Returning Weapon', {
    manual:
      'Touch weapon: thrown 20/60 or add 20/60 to existing range, returns to thrower after attack. Apply selected weapon properties manually, no initial attack.',
  }),
  'kibblestasty-casting-compendium-v2.3:reverberating-dash': kibblesProfile('Reverberating Dash', {
    manual:
      'Initial weapon attack; hit adds thunder and permits 15-foot movement without opportunity attacks then next attack. Stop on miss/no eligible target, maximum three base attacks; thunder increases each dash. Higher slots change initial dice/dash count capped six attacks. Weapon-dependent chain manual.',
  }),
  'kibblestasty-casting-compendium-v2.3:ribcage': kibblesProfile('Ribcage', {
    effect: ruleReminder(
      'Ribcage',
      'Create bone dome manually: blocks Small+ creatures and bludgeoning/slashing attacks, half cover otherwise, AC 13/40 HP/vulnerable bludgeoning. Destruction ends spell; higher slots add 10 HP. No initial save or creature armor bonus.',
      { type: 'manual' },
      'self',
      false,
    ),
    manual:
      'Create bone dome manually: blocks Small+ creatures and bludgeoning/slashing attacks, half cover otherwise, AC 13/40 HP/vulnerable bludgeoning. Destruction ends spell; higher slots add 10 HP. No initial save or creature armor bonus.',
  }),
  'kibblestasty-casting-compendium-v2.3:rock-slam': kibblesProfile('Rock Slam', {
    attackKind: 'ranged',
    mechanics: {
      attackRoll: true,
      ...kibblesDamage([{ formula: '1d10', type: 'bludgeoning' }], 0, [1]),
    },
    manual:
      'Ranged spell attack; only critical hit permits prone or 10-foot push. Apply chosen critical rider manually, never on ordinary hit. Bludgeoning +1d10 at levels 5/11/17.',
  }),
}
