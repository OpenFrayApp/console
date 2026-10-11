// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import type { ReviewedSpellCasting } from '../reviewedSpells.ts'
import { kibblesProfile, kibblesDamage } from './kibblesProfile.ts'
import { ruleReminder } from './reviewedProfile.ts'
import { condition } from '../effects.ts'

export const KIBBLES_CASTING_10: Record<string, ReviewedSpellCasting> = {
  'kibblestasty-casting-compendium-v2.3:vacuum-pull': kibblesProfile('Vacuum Pull', {
    mechanics: { save: { ability: 'str', onSave: 'negates' } },
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
      'Huge or smaller Strength failure pulls adjacent and knocks prone. Flying targets save with disadvantage, set manually. Higher slots increase range by printed 10 feet; no initial damage.',
  }),
  'kibblestasty-casting-compendium-v2.3:vampiric-blade': kibblesProfile('Vampiric Blade', {
    manual:
      'Empower selected weapon, no initial damage/healing. Hit adds 1d8 necrotic and heals actual necrotic damage; ends after total necrotic reaches twice HP component cost. Track cost, damage and cap manually.',
  }),
  'kibblestasty-casting-compendium-v2.3:vampiric-brand': kibblesProfile('Vampiric Brand', {
    mechanics: { save: { ability: 'wis', onSave: 'negates' } },
    effect: ruleReminder(
      'Vampiric Brand',
      'Initial Wisdom failure brands target, no initial damage. Each later damage event adds 2d6 necrotic and caster heals half actual necrotic; target healing also heals caster half. End-turn Wisdom save ends spell; later damage/healing manual.',
      { type: 'manual' },
      'enemy',
      true,
    ),
    manual:
      'Initial Wisdom failure brands target, no initial damage. Each later damage event adds 2d6 necrotic and caster heals half actual necrotic; target healing also heals caster half. End-turn Wisdom save ends spell; later damage/healing manual.',
  }),
  'kibblestasty-casting-compendium-v2.3:vampiric-mosquito': kibblesProfile('Vampiric Mosquito', {
    effect: ruleReminder(
      'Vampiric Mosquito',
      'No initial damage/healing. Caster turn ends mosquito bites random hostile within 30 feet for 1d4 necrotic. Only on spell end heal 1 per damaging bite up to 10; action ends early. Track random target/count manually.',
      { type: 'rounds', rounds: 10 },
      'self',
      false,
    ),
    manual:
      'No initial damage/healing. Caster turn ends mosquito bites random hostile within 30 feet for 1d4 necrotic. Only on spell end heal 1 per damaging bite up to 10; action ends early. Track random target/count manually.',
  }),
  'kibblestasty-casting-compendium-v2.3:vessel-of-transportation': kibblesProfile(
    'Vessel of Transportation',
    {
      effect: ruleReminder(
        'Vessel of Transportation',
        'Create Magical Vessel and designate pilots manually. Pilot action controls and senses via external sensor; caster can replace pilot. Track capacity, levitation limits, immunity and caster HP loss replacing vehicle damage. No initial attack or passenger conditions.',
        { type: 'manual' },
        'self',
        false,
      ),
      manual:
        'Create Magical Vessel and designate pilots manually. Pilot action controls and senses via external sensor; caster can replace pilot. Track capacity, levitation limits, immunity and caster HP loss replacing vehicle damage. No initial attack or passenger conditions.',
    },
  ),
  'kibblestasty-casting-compendium-v2.3:vicious-hound': kibblesProfile('Vicious Hound', {
    effect: ruleReminder(
      'Vicious Hound',
      'No initial save/damage. Target moving less than 40 feet from turn-start position takes later 3d8 psychic. End-turn Wisdom save ends illusion regardless of damage. Track distance and later checks manually.',
      { type: 'manual' },
      'enemy',
      true,
    ),
    manual:
      'No initial save/damage. Target moving less than 40 feet from turn-start position takes later 3d8 psychic. End-turn Wisdom save ends illusion regardless of damage. Track distance and later checks manually.',
  }),
  'kibblestasty-casting-compendium-v2.3:vicious-vapors': kibblesProfile('Vicious Vapors', {
    mechanics: {
      save: { ability: 'con', onSave: 'half' },
      ...kibblesDamage([{ formula: '1d12', type: 'poison' }], 2, [1]),
    },
    effect: ruleReminder(
      'Vicious Vapors',
      'Initial up to three chosen creatures: Constitution failures poisoned until caster next turn start. Miasma lightly obscures caster and permits later bonus-action surges regardless of initial success. Track self miasma separately; initial poison +1d12 per higher slot.',
      { type: 'manual' },
      'self',
      false,
    ),
    persistsAfterSave: true,
    manual:
      'Initial up to three chosen creatures: Constitution failures poisoned until caster next turn start. Miasma lightly obscures caster and permits later bonus-action surges regardless of initial success. Track self miasma separately; initial poison +1d12 per higher slot.',
  }),
  'kibblestasty-casting-compendium-v2.3:violent-crush': kibblesProfile('Violent Crush', {
    mechanics: {
      save: { ability: 'str', onSave: 'half' },
      ...kibblesDamage([{ formula: '6d12', type: 'bludgeoning' }], 4, [1]),
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
      'Large or smaller creature/object only; failed saves prone. Objects and size eligibility manual; bludgeoning +1d12 per higher slot.',
  }),
  'kibblestasty-casting-compendium-v2.3:violent-updraft': kibblesProfile('Violent Updraft', {
    mechanics: { save: { ability: 'str', onSave: 'negates' } },
    manual:
      'Large or smaller Strength failure launches 20 feet up, willing failure allowed. Falling damage/prone only if no flight/handhold; higher slots add 10 feet. No unconditional damage or prone.',
  }),
  'kibblestasty-casting-compendium-v2.3:vital-surge': kibblesProfile('Vital Surge', {
    effect: ruleReminder(
      'Vital Surge',
      'Up to four recipients, no initial healing. One later bonus action heals 4d8 and optionally up to four hit dice plus Constitution per die; ends for that recipient. Higher slots add targets/hit-dice maximum, not base healing. Track one-use healing manually.',
      { type: 'manual' },
      'ally',
      true,
    ),
    manual:
      'Up to four recipients, no initial healing. One later bonus action heals 4d8 and optionally up to four hit dice plus Constitution per die; ends for that recipient. Higher slots add targets/hit-dice maximum, not base healing. Track one-use healing manually.',
  }),
  'kibblestasty-casting-compendium-v2.3:volcanic-burst': kibblesProfile('Volcanic Burst', {
    mechanics: {
      save: { ability: 'dex', onSave: 'half' },
      ...kibblesDamage(
        [
          { formula: '4d10', type: 'bludgeoning' },
          { formula: '4d6', type: 'fire' },
        ],
        6,
        [0, 0],
      ),
    },
    manual:
      'Select creatures in 20-foot radius. Failures inside inner 10 feet also launched 10 feet, take falling damage/prone conditionally. Inner terrain persists until cleared. Apply inner-zone riders manually.',
  }),
  'kibblestasty-casting-compendium-v2.3:vorpal-shot': kibblesProfile('Vorpal Shot', {
    manual:
      'Imbue ammunition/thrown weapon. Next weapon attack +3 attack/damage, bypass type resistance/immunity, hit +6d8 weapon-type damage and lethal wound at zero HP. One-use weapon rules manual, no initial spell attack.',
  }),
  'kibblestasty-casting-compendium-v2.3:vorpal-weapon': kibblesProfile('Vorpal Weapon', {
    manual:
      'Selected weapon ignores slashing resistance, double object/structure damage, conditional replacement +3 bonus. Critical leaving target below 50 HP decapitates/kills. Apply selected weapon and lethal threshold manually, no blanket attacker bonus.',
  }),
  'kibblestasty-casting-compendium-v2.3:vortex-blast': kibblesProfile('Vortex Blast', {
    mechanics: { save: { ability: 'str', onSave: 'negates' } },
    manual:
      'All creatures in 30-foot cone take automatic 3d6 bludgeoning before Strength save. Failure launches 30 feet backward/up with conditional 3d6 falling. Higher slots add 1d6 initial. Apply damage/movement manually; save never negates initial damage.',
  }),
  'kibblestasty-casting-compendium-v2.3:wall-of-blood': kibblesProfile('Wall of Blood', {
    effect: ruleReminder(
      'Wall of Blood',
      'Create opaque blood wall; no initial save/damage. Crossing costs triple movement and Constitution save for 3d8 necrotic, half on success; caster can pay 2 HP for +2d8. Track wall and later entry/cost manually.',
      { type: 'manual' },
      'self',
      false,
    ),
    manual:
      'Create opaque blood wall; no initial save/damage. Crossing costs triple movement and Constitution save for 3d8 necrotic, half on success; caster can pay 2 HP for +2d8. Track wall and later entry/cost manually.',
  }),
  'kibblestasty-casting-compendium-v2.3:wasp-barrage': kibblesProfile('Wasp Barrage', {
    attackKind: 'ranged',
    mechanics: { attackRoll: true },
    manual:
      'Separate ranged spell attack against each chosen creature in cone. Hit deals 1 piercing plus 4d12 poison; higher poison +1d12 per second slot above 3rd. Full flat component and paired-slot scaling resolved manually, attack-only resolver.',
  }),
  'kibblestasty-casting-compendium-v2.3:water-blast': kibblesProfile('Water Blast', {
    attackKind: 'ranged',
    mechanics: {
      attackRoll: true,
      ...kibblesDamage([{ formula: '3d6', type: 'bludgeoning' }], 1, [1]),
    },
    manual:
      'Ranged spell attack; Large or smaller hit separately Strength saves against prone. Never apply prone on hit alone. Bludgeoning +1d6 per higher slot.',
  }),
  'kibblestasty-casting-compendium-v2.3:water-bullet': kibblesProfile('Water Bullet', {
    attackKind: 'ranged',
    mechanics: { attackRoll: true },
    manual:
      'Ranged spell attack for 1d6 plus caster modifier piercing; +1d6 at levels 5/11/17. Attack-only resolver; enter damage with actual casting modifier manually.',
  }),
  'kibblestasty-casting-compendium-v2.3:water-cannon': kibblesProfile('Water Cannon', {
    mechanics: {
      save: { ability: 'str', onSave: 'half' },
      ...kibblesDamage([{ formula: '6d6', type: 'bludgeoning' }], 3, [1]),
    },
    manual:
      'Select creatures in 60-by-5-foot line. Failure pushes to far end; lack of space instead nearest space, extra 2d6 bludgeoning and prone. Apply conditional collision manually. Initial bludgeoning +1d6 per higher slot.',
  }),
  'kibblestasty-casting-compendium-v2.3:waterspout': kibblesProfile('Waterspout', {
    effect: ruleReminder(
      'Waterspout',
      'No creation save/damage. Entry on own turn or funnel movement triggers Strength save for 2d8 bludgeoning, half on success. Failure blinded/deafened/no speech and carried until target next turn start ejection. Double size on Huge+ body of water; later triggers/conditions manual.',
      { type: 'manual' },
      'self',
      false,
    ),
    manual:
      'No creation save/damage. Entry on own turn or funnel movement triggers Strength save for 2d8 bludgeoning, half on success. Failure blinded/deafened/no speech and carried until target next turn start ejection. Double size on Huge+ body of water; later triggers/conditions manual.',
  }),
  'kibblestasty-casting-compendium-v2.3:whirling-conflagration': kibblesProfile(
    'Whirling Conflagration',
    {
      manual:
        'One weapon attack roll against all creatures within 15 feet for 6d6 fire, half on miss. Higher slots add 1d6. Weapon roll and miss-half damage manual; no spell attack.',
    },
  ),
  'kibblestasty-casting-compendium-v2.3:wind-cutter': kibblesProfile('Wind Cutter', {
    manual:
      'Imbue selected weapon; own-turn attacks reach 30 feet, beyond normal reach slashing, +1d4 damage. Same attack roll may strike adjacent secondary for half actual first damage. Weapon-specific modifiers and secondary target manual.',
  }),
  'kibblestasty-casting-compendium-v2.3:windborne-weapon': kibblesProfile('Windborne Weapon', {
    attackKind: 'ranged',
    mechanics: { attackRoll: true },
    manual:
      'Ranged spell attack ignores cover; damage uses component weapon type. Printed scaling says +1d8 but examples use additional d10, leave ambiguity to GM. Attack-only resolver, no fixed damage type.',
  }),
  'kibblestasty-casting-compendium-v2.3:windsense': kibblesProfile('Windsense', {
    effect: ruleReminder(
      'Windsense',
      'Until caster next turn start: 60-foot blindsight, Perception advantage, ranged weapon attacks within blindsight need no sight and ignore cover. Apply scoped benefits manually, no all-Wisdom bonus.',
      { type: 'untilSourceTurn', when: 'startOfTurn' },
      'self',
      false,
    ),
    manual:
      'Until caster next turn start: 60-foot blindsight, Perception advantage, ranged weapon attacks within blindsight need no sight and ignore cover. Apply scoped benefits manually, no all-Wisdom bonus.',
  }),
  'kibblestasty-casting-compendium-v2.3:wither': kibblesProfile('Wither', {
    mechanics: {
      save: { ability: 'con', onSave: 'half' },
      ...kibblesDamage([{ formula: '4d10+4', type: 'necrotic' }], 3, [1]),
    },
    effect: ruleReminder(
      'Wither',
      'Failure withers until caster next turn start: remove fire resistance if present, otherwise grant vulnerability. Apply conditional defense manually; necrotic +1d10 per higher slot with fixed +4.',
      { type: 'untilSourceTurn', when: 'startOfTurn' },
      'enemy',
      true,
    ),
    manual:
      'Failure withers until caster next turn start: remove fire resistance if present, otherwise grant vulnerability. Apply conditional defense manually; necrotic +1d10 per higher slot with fixed +4.',
  }),
}
