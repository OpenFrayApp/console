// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import type { ReviewedSpellCasting } from '../reviewedSpells.ts'
import { kibblesProfile, kibblesDamage } from './kibblesProfile.ts'
import { ruleReminder } from './reviewedProfile.ts'
import { condition } from '../effects.ts'

export const KIBBLES_CASTING_5: Record<string, ReviewedSpellCasting> = {
  'kibblestasty-casting-compendium-v2.3:form-of-ice': kibblesProfile('Form of Ice', {
    effect: ruleReminder(
      'Form of Ice',
      'Ice form: cold immunity, ice/snow terrain travel, moving 15-foot difficult terrain aura. Later action Constitution cone for 4d8 cold with failed-save speed halved; own-turn cold roll grants temporary HP equal to one die. No initial cone/temp HP; apply manually.',
      { type: 'manual' },
      'self',
      false,
    ),
    manual:
      'Ice form: cold immunity, ice/snow terrain travel, moving 15-foot difficult terrain aura. Later action Constitution cone for 4d8 cold with failed-save speed halved; own-turn cold roll grants temporary HP equal to one die. No initial cone/temp HP; apply manually.',
  }),
  'kibblestasty-casting-compendium-v2.3:form-of-stone': kibblesProfile('Form of Stone', {
    effect: ruleReminder(
      'Form of Stone',
      'Stone form: nonmagical physical attack resistance, earth/stone travel. Ending movement inside solid terrain ejects caster, ends spell and stuns until target next turn end. Later action Dexterity saves for 4d8 piercing and terrain. No initial damage; apply manually.',
      { type: 'manual' },
      'self',
      false,
    ),
    manual:
      'Stone form: nonmagical physical attack resistance, earth/stone travel. Ending movement inside solid terrain ejects caster, ends spell and stuns until target next turn end. Later action Dexterity saves for 4d8 piercing and terrain. No initial damage; apply manually.',
  }),
  'kibblestasty-casting-compendium-v2.3:form-of-the-elements': kibblesProfile(
    'Form of the Elements',
    {
      effect: ruleReminder(
        'Form of the Elements',
        'Apply all five printed elemental forms manually: defenses, flight/invisibility, movement, terrain, conditional damage and action attacks. No simultaneous initial attacks or build derivation.',
        { type: 'manual' },
        'self',
        false,
      ),
      manual:
        'Apply all five printed elemental forms manually: defenses, flight/invisibility, movement, terrain, conditional damage and action attacks. No simultaneous initial attacks or build derivation.',
    },
  ),
  'kibblestasty-casting-compendium-v2.3:form-of-water': kibblesProfile('Form of Water', {
    effect: ruleReminder(
      'Form of Water',
      'Water form: conditional physical resistance, pass through creatures/terrain, later crossing Strength save against prone. Later action water line Strength save for 5d6 bludgeoning/prone, half on success. No initial damage.',
      { type: 'manual' },
      'self',
      false,
    ),
    manual:
      'Water form: conditional physical resistance, pass through creatures/terrain, later crossing Strength save against prone. Later action water line Strength save for 5d6 bludgeoning/prone, half on success. No initial damage.',
  }),
  'kibblestasty-casting-compendium-v2.3:form-of-wind': kibblesProfile('Form of Wind', {
    effect: ruleReminder(
      'Form of Wind',
      'Wind form: 60-foot flight, pass/occupy creatures and ignore terrain, invisible. Later action Strength cone for 4d8 bludgeoning and 15-foot push, half/no push on success. Track form and later actions manually.',
      { type: 'manual' },
      'self',
      false,
    ),
    manual:
      'Wind form: 60-foot flight, pass/occupy creatures and ignore terrain, invisible. Later action Strength cone for 4d8 bludgeoning and 15-foot push, half/no push on success. Track form and later actions manually.',
  }),
  'kibblestasty-casting-compendium-v2.3:freeze': kibblesProfile('Freeze', {
    attackKind: 'melee',
    mechanics: { attackRoll: true, ...kibblesDamage([{ formula: '1d8', type: 'cold' }], 0, [1]) },
    effect: ruleReminder(
      'Freeze',
      'Hit: speed reduced by 10 feet until affected creature next turn end; target-owned timer manual.',
      { type: 'manual' },
      'enemy',
      true,
      'Until the end of the affected creature’s next turn; manual timer',
    ),
    manual:
      'Melee spell attack; hit reduces speed by 10 feet until affected creature next turn end. Track target-owned timer and speed manually; cold +1d8 at levels 5/11/17.',
  }),
  'kibblestasty-casting-compendium-v2.3:future-insight': kibblesProfile('Future Insight', {
    effect: ruleReminder(
      'Future Insight',
      'Roll and record 3d4 or 1d12. Spend individual results after a roll but before outcome to add/subtract from rolls within 60 feet. Ends when dice expended; no blanket modifier.',
      { type: 'manual' },
      'self',
      false,
    ),
    manual:
      'Roll and record 3d4 or 1d12. Spend individual results after a roll but before outcome to add/subtract from rolls within 60 feet. Ends when dice expended; no blanket modifier.',
  }),
  'kibblestasty-casting-compendium-v2.3:gale-bolt': kibblesProfile('Gale Bolt', {
    attackKind: 'ranged',
    mechanics: {
      attackRoll: true,
      ...kibblesDamage([{ formula: '2d8', type: 'bludgeoning' }], 1, [1]),
    },
    manual:
      'Ranged spell attack; Large or smaller hits pushed 10 feet manually. Bludgeoning +1d8 per higher slot.',
  }),
  'kibblestasty-casting-compendium-v2.3:gale-shot': kibblesProfile('Gale Shot', {
    manual:
      'Imbue ammunition/thrown weapon for first attack. Hit adds 4d8 weapon-type damage and pushes 30 feet, collision adds 2d8 bludgeoning; miss half/no push. Printed 5th-slot adjustment adds 1d8 and 10 feet; no invented progression. Weapon-dependent resolution manual.',
  }),
  'kibblestasty-casting-compendium-v2.3:geyser': kibblesProfile('Geyser', {
    mechanics: {
      save: { ability: 'dex', onSave: 'half' },
      ...kibblesDamage([{ formula: '4d6', type: 'bludgeoning' }], 4, [1]),
    },
    manual:
      'Initial Dexterity save within 10 feet. Failure launches 60 feet upward; success still moves 10 feet away or up by target choice. Apply both movement outcomes and falling damage manually. +1d6 per higher slot.',
  }),
  'kibblestasty-casting-compendium-v2.3:ghost-step': kibblesProfile('Ghost Step', {
    effect: ruleReminder(
      'Ghost Step',
      'Intangible until caster next turn start: free-direction movement, ignore permitted obstacles and immunity except force. Reappearance in occupied space shunts with twice distance force damage; fall if airborne. Apply movement and defense manually.',
      { type: 'untilSourceTurn', when: 'startOfTurn' },
      'self',
      false,
    ),
    manual:
      'Intangible until caster next turn start: free-direction movement, ignore permitted obstacles and immunity except force. Reappearance in occupied space shunts with twice distance force damage; fall if airborne. Apply movement and defense manually.',
  }),
  'kibblestasty-casting-compendium-v2.3:glacial-crash': kibblesProfile('Glacial Crash', {
    mechanics: {
      save: { ability: 'dex', onSave: 'half' },
      ...kibblesDamage([{ formula: '6d6', type: 'cold' }], 7, [0]),
    },
    manual:
      'Initial Dexterity save within 30 feet for cold; targets within 10 feet also take 6d8 bludgeoning, halved on success. Add inner-zone damage manually before application. Terrain persists until caster next turn end.',
  }),
  'kibblestasty-casting-compendium-v2.3:glimpse-the-future': kibblesProfile('Glimpse the Future', {
    effect: ruleReminder(
      'Glimpse the Future',
      'Roll d4 or choose outcome with slot 3+. Record d20 replacement, conditional death evasion, temporary HP/fear immunity, or surprise/attack reversal. Ends when foreseen event occurs; apply chosen branch manually.',
      { type: 'manual' },
      'ally',
      false,
    ),
    manual:
      'Roll d4 or choose outcome with slot 3+. Record d20 replacement, conditional death evasion, temporary HP/fear immunity, or surprise/attack reversal. Ends when foreseen event occurs; apply chosen branch manually.',
  }),
  'kibblestasty-casting-compendium-v2.3:gory-doom': kibblesProfile('Gory Doom', {
    manual:
      'Only on target reduced to zero HP with eligible anatomy. Living unconscious target first Constitution save: success causes death-save failure if applicable, failure explodes. Dead target explodes automatically. Then nearby Dexterity saves for 3d6 necrotic, +1d6 per higher slot. Both stages manual.',
  }),
  'kibblestasty-casting-compendium-v2.3:grasping-roots': kibblesProfile('Grasping Roots', {
    mechanics: { save: { ability: 'str', onSave: 'negates' } },
    manual:
      'Large or smaller Strength save controls pull distance: 20 feet failure, 5 feet success, willing failure allowed. Higher slots add 5 feet; movement on both outcomes resolved manually.',
  }),
  'kibblestasty-casting-compendium-v2.3:gravity-surge': kibblesProfile('Gravity Surge', {
    mechanics: {
      save: { ability: 'str', onSave: 'half' },
      ...kibblesDamage([{ formula: '2d6', type: 'bludgeoning' }], 2, [0]),
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
      'Select creatures in 15-foot-radius sphere. Airborne creatures have save disadvantage, set manually. Failures fall prone.',
  }),
  'kibblestasty-casting-compendium-v2.3:grip-of-the-dead': kibblesProfile('Grip of the Dead', {
    mechanics: { save: { ability: 'str', onSave: 'negates' } },
    effect: {
      summary: 'Restrained',
      targeting: 'enemy',
      multi: true,
      build: ({ source }) => [
        condition('Restrained', { source: source, duration: { type: 'manual' } }),
      ],
    },
    manual:
      'Initial Strength failure restrains in maintained grip. Target turn-start 1d8 necrotic and caster healing half dealt are later; +1d8 per higher slot. Action Athletics/Acrobatics escape against spell DC, not repeat save. Track grip and healing manually.',
  }),
  'kibblestasty-casting-compendium-v2.3:heavenly-ray': kibblesProfile('Heavenly Ray', {
    effect: ruleReminder(
      'Heavenly Ray',
      'Create light cylinder, no initial healing/damage. First entry per turn or turn start heals non-undead/non-construct 2d8 and gives 2d8 temporary HP; undead take 2d8 radiant, constructs unaffected. Later healing capped at half maximum HP. Bonus action moves pillar; all triggers manual.',
      { type: 'manual' },
      'self',
      false,
    ),
    manual:
      'Create light cylinder, no initial healing/damage. First entry per turn or turn start heals non-undead/non-construct 2d8 and gives 2d8 temporary HP; undead take 2d8 radiant, constructs unaffected. Later healing capped at half maximum HP. Bonus action moves pillar; all triggers manual.',
  }),
  'kibblestasty-casting-compendium-v2.3:heavy-blow': kibblesProfile('Heavy Blow', {
    effect: ruleReminder(
      'Heavy Blow',
      'Empower first melee weapon hit before caster next turn start: +1d10 bludgeoning then Constitution save against dazed until target next turn start. Dazed means no reactions and incoming attack advantage, not Stunned. Higher slots add 1d6 only per slot above 2nd. No initial attack.',
      { type: 'untilSourceTurn', when: 'startOfTurn' },
      'self',
      false,
    ),
    manual:
      'Empower first melee weapon hit before caster next turn start: +1d10 bludgeoning then Constitution save against dazed until target next turn start. Dazed means no reactions and incoming attack advantage, not Stunned. Higher slots add 1d6 only per slot above 2nd. No initial attack.',
  }),
  'kibblestasty-casting-compendium-v2.3:hellfire-pit': kibblesProfile('Hellfire Pit', {
    effect: ruleReminder(
      'Hellfire Pit',
      'Manual creation Dexterity save requires escaping 5 feet or automatically fails. Failure falls for 1d6 bludgeoning/prone; later turn starts deal 4d6 fire plus 4d6 necrotic. Movement-spend Strength escape and speed zero on failure; deposit prone when spell ends.',
      { type: 'manual' },
      'self',
      false,
    ),
    manual:
      'Manual creation Dexterity save requires escaping 5 feet or automatically fails. Failure falls for 1d6 bludgeoning/prone; later turn starts deal 4d6 fire plus 4d6 necrotic. Movement-spend Strength escape and speed zero on failure; deposit prone when spell ends.',
  }),
  'kibblestasty-casting-compendium-v2.3:hungering-void': kibblesProfile('Hungering Void', {
    effect: ruleReminder(
      'Hungering Void',
      'No initial save/damage. Turn-start Constitution save in magical darkness for 2d6 cold plus 2d6 necrotic, half on success. Failed saves stack speed reduction until starting outside. Slot 5+ changes both dice and reduction once; track darkness and triggers manually.',
      { type: 'manual' },
      'self',
      false,
    ),
    manual:
      'No initial save/damage. Turn-start Constitution save in magical darkness for 2d6 cold plus 2d6 necrotic, half on success. Failed saves stack speed reduction until starting outside. Slot 5+ changes both dice and reduction once; track darkness and triggers manually.',
  }),
  'kibblestasty-casting-compendium-v2.3:hungry-blood': kibblesProfile('Hungry Blood', {
    attackKind: 'melee',
    mechanics: {
      attackRoll: true,
      ...kibblesDamage(
        [
          { formula: '2d6', type: 'piercing' },
          { formula: '2d6', type: 'necrotic' },
        ],
        2,
        [0, 0],
      ),
    },
    manual:
      'Melee spell attack; on hit heal caster 2d6 manually after damage. Higher slots increase necrotic and healing by the printed 1d6, not piercing; apply this increase manually because no per-slot progression is stated.',
  }),
  'kibblestasty-casting-compendium-v2.3:hurricane-slash': kibblesProfile('Hurricane Slash', {
    mechanics: {
      save: { ability: 'dex', onSave: 'half' },
      ...kibblesDamage([{ formula: '3d8', type: 'slashing' }], 2, [0]),
    },
    manual:
      'Select creatures in 30-by-5-foot line. Slot 3+ creates additional line as printed, not extra damage. Overlapping targets affected only once.',
  }),
  'kibblestasty-casting-compendium-v2.3:ice-arrow': kibblesProfile('Ice Arrow', {
    attackKind: 'ranged',
    mechanics: { attackRoll: true },
    manual:
      'Ranged spell attack for 2d8 plus casting ability modifier cold, +1d8 per higher slot. Attack-only resolver; enter full damage with actual modifier manually.',
  }),
  'kibblestasty-casting-compendium-v2.3:ice-spike': kibblesProfile('Ice Spike', {
    manual:
      'Manual Dexterity save: failure takes 4d8 piercing and 4d8 cold, success only cold. No uniform half/negate outcome. Slots 6/7 create second spike, 8/9 third; resolve each spike separately.',
  }),
  'kibblestasty-casting-compendium-v2.3:ice-weapon': kibblesProfile('Ice Weapon', {
    manual:
      'Choose ice weapon form and associated weapon properties/dice manually; all deal cold. Bonus action changes/reforms weapon, maximum three simultaneously. No initial spell attack or cantrip damage scaling.',
  }),
  'kibblestasty-casting-compendium-v2.3:ichorous-blood': kibblesProfile('Ichorous Blood', {
    effect: ruleReminder(
      'Ichorous Blood',
      'Grant 8 temporary HP manually. Physical damage reduced by 4 to minimum 1, melee attackers take 4 acid; higher slots add 1 reduction/retaliation. Apply flat reduction and later retaliation manually.',
      { type: 'manual' },
      'self',
      false,
    ),
    manual:
      'Grant 8 temporary HP manually. Physical damage reduced by 4 to minimum 1, melee attackers take 4 acid; higher slots add 1 reduction/retaliation. Apply flat reduction and later retaliation manually.',
  }),
  'kibblestasty-casting-compendium-v2.3:illusionary-dart': kibblesProfile('Illusionary Dart', {
    attackKind: 'ranged',
    mechanics: {
      attackRoll: true,
      ...kibblesDamage([{ formula: '1d8', type: 'psychic' }], 0, [0]),
    },
    manual:
      'Resolve each dart as separate ranged spell attack for 1d8 psychic. Character levels 5/11/17 add darts, not per-dart damage; target selection and repetitions manual.',
  }),
  'kibblestasty-casting-compendium-v2.3:illusionary-fireball': kibblesProfile(
    'Illusionary Fireball',
    {
      mechanics: {
        save: { ability: 'wis', onSave: 'negates' },
        ...kibblesDamage([{ formula: '6d6', type: 'psychic' }], 3, [1]),
      },
      manual:
        'Select chosen creatures within 20 feet; illusion appearance never changes psychic type. Initial psychic +1d6 per higher slot.',
    },
  ),
  'kibblestasty-casting-compendium-v2.3:illusory-pit': kibblesProfile('Illusory Pit', {
    mechanics: { save: { ability: 'wis', onSave: 'negates' } },
    effect: ruleReminder(
      'Illusory Pit',
      'Initial Wisdom save in illusory pit, flyers automatically succeed. Failures fall prone, cannot stand or see outside radius. Action repeat save or damage repeat save can end illusion; success spends movement standing. Higher slots enlarge radius. Track vision/standing restrictions manually; creation persists on successes.',
      { type: 'manual' },
      'self',
      false,
    ),
    persistsAfterSave: true,
    manual:
      'Initial Wisdom save in illusory pit, flyers automatically succeed. Failures fall prone, cannot stand or see outside radius. Action repeat save or damage repeat save can end illusion; success spends movement standing. Higher slots enlarge radius. Track vision/standing restrictions manually; creation persists on successes.',
  }),
}
