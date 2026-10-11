// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import type { ReviewedSpellCasting } from '../reviewedSpells.ts'
import { deepMagicProfile } from './deepMagic2020Profile.ts'
import { ruleReminder, reviewedDamage } from './reviewedProfile.ts'

export const DEEP_MAGIC_2020_REMAINING_2: Record<string, ReviewedSpellCasting> = {
  'kobold-press-deepm:blade-of-wrath': deepMagicProfile('Blade of Wrath', {
    effect: ruleReminder(
      'Blade of Wrath',
      'Create luminous blade; later melee spell hits deal 2d8 fire plus 2d8 radiant with eligible-type Wisdom fright save. Higher-slot damage component is chosen; attacks, choice, dropped blade, and recovery manual.',
      { type: 'rounds', rounds: 100 },
      'self',
      false,
      'up to 10 minutes',
    ),
    manual:
      'Create luminous blade; later melee spell hits deal 2d8 fire plus 2d8 radiant with eligible-type Wisdom fright save. Higher-slot damage component is chosen; attacks, choice, dropped blade, and recovery manual.',
  }),
  'kobold-press-deepm:blazing-chariot': deepMagicProfile('Blazing Chariot', {
    effect: ruleReminder(
      'Blazing Chariot',
      'Create chariot with printed defenses, speeds, and riders. Contact/melee retaliation deals 3d6 fire plus 3d6 radiant; later overrun also pushes and Strength-save prone. Movement, commands, and damage manual.',
      { type: 'manual' },
      'self',
      false,
      'Track printed duration and any early endpoint manually',
    ),
    manual:
      'Create chariot with printed defenses, speeds, and riders. Contact/melee retaliation deals 3d6 fire plus 3d6 radiant; later overrun also pushes and Strength-save prone. Movement, commands, and damage manual.',
  }),
  'kobold-press-deepm:bleating-call': deepMagicProfile('Bleating Call', {
    effect: ruleReminder(
      'Bleating Call',
      'Create sound; hearing creatures make Wisdom saves only at turn start. Failures approach/examine illusion; charm immunity, friendly damage ending, and examined-target immunity manual.',
      { type: 'rounds', rounds: 10 },
      'self',
      false,
      '1 minute',
    ),
    manual:
      'Create sound; hearing creatures make Wisdom saves only at turn start. Failures approach/examine illusion; charm immunity, friendly damage ending, and examined-target immunity manual.',
  }),
  'kobold-press-deepm:bleed': deepMagicProfile('Bleed', {
    effect: ruleReminder(
      'Bleed',
      'Enchant carried slashing weapon: later hits add 1d4 necrotic and Constitution-save bleeding, with stacking repeat-hit bonus capped at 10. Medicine action or magical healing ends wound; exclude undead/constructs.',
      { type: 'rounds', rounds: 10 },
      'self',
      false,
      'up to 1 minute',
    ),
    manual:
      'Enchant carried slashing weapon: later hits add 1d4 necrotic and Constitution-save bleeding, with stacking repeat-hit bonus capped at 10. Medicine action or magical healing ends wound; exclude undead/constructs.',
  }),
  'kobold-press-deepm:bless-the-dead': deepMagicProfile('Bless the Dead', {
    manual:
      'Bless deceased creature to prevent becoming undead; no effect on living or already-undead creatures.',
  }),
  'kobold-press-deepm:blessed-halo': deepMagicProfile('Blessed Halo', {
    effect: ruleReminder(
      'Blessed Halo',
      'Track 10-point healing pool, optional initial/later action healing, light, good-creature Charisma advantage, and darkness dispelling manually. +5 pool per higher slot.',
      { type: 'rounds', rounds: 10 },
      'self',
      false,
      'up to 1 minute',
    ),
    manual:
      'Track 10-point healing pool, optional initial/later action healing, light, good-creature Charisma advantage, and darkness dispelling manually. +5 pool per higher slot.',
  }),
  'kobold-press-deepm:blizzard': deepMagicProfile('Blizzard', {
    mechanics: {
      save: { ability: 'con', onSave: 'half' },
      ...reviewedDamage([{ formula: '8d8', type: 'cold' }], 7, [0]),
    },
    persistsAfterSave: true,
    manual:
      'Initial cylinder cold damage; later first entry per turn or turn end repeats save/damage. Heavily obscured; damaged creatures have concentration-save disadvantage until their next turn start. Later effects manual.',
  }),
  'kobold-press-deepm:blood-and-steel': deepMagicProfile('Blood and Steel', {
    manual:
      'Pay unhealable-until-rest 1d4 slashing manually. Uncontrolled construct Constitution save against charm has conditional advantage and charm-immunity exception; damage repeat saves/control and already-controlled Intelligence/skill mode differ. Higher-slot durations manual.',
  }),
  'kobold-press-deepm:blood-armor': deepMagicProfile('Blood Armor', {
    effect: ruleReminder(
      'Blood Armor',
      'Requires just-hit bleeding foe; set armor class to 18 plus Dexterity modifier, not additive bonus. Celestial blood also grants Charisma save advantage; apply manually.',
      { type: 'manual' },
      'self',
      false,
      'Track printed duration and any early endpoint manually',
    ),
    manual:
      'Requires just-hit bleeding foe; set armor class to 18 plus Dexterity modifier, not additive bonus. Celestial blood also grants Charisma save advantage; apply manually.',
  }),
  'kobold-press-deepm:blood-lure': deepMagicProfile('Blood Lure', {
    mechanics: { save: { ability: 'cha', onSave: 'negates' } },
    effect: ruleReminder(
      'Blood Lure',
      'Only blood-feeding creatures near pint of blood eligible. Scent advantage traits impose save disadvantage, undead advantage; move/consume compulsion ends on successful attack or blood consumption manually.',
      { type: 'manual' },
      'enemy',
      true,
      'Track printed consequence and endpoint manually',
    ),
    manual:
      'Only blood-feeding creatures near pint of blood eligible. Scent advantage traits impose save disadvantage, undead advantage; move/consume compulsion ends on successful attack or blood consumption manually.',
  }),
  'kobold-press-deepm:blood-offering': deepMagicProfile('Blood Offering', {
    manual:
      'Consume eligible recently dead corpse previously damaged by caster; heal 1d4 times CR (minimum 1d4). Resurrection restrictions and healing manual.',
  }),
  'kobold-press-deepm:blood-puppet': deepMagicProfile('Blood Puppet', {
    mechanics: { save: { ability: 'con', onSave: 'negates' } },
    effect: ruleReminder(
      'Blood Puppet',
      'Requires visible target and its blood; failure controls physical activity via bonus actions while component handled each round. Target turn-end Constitution saves and commands manual.',
      { type: 'manual' },
      'enemy',
      true,
      'Track printed consequence and endpoint manually',
    ),
    manual:
      'Requires visible target and its blood; failure controls physical activity via bonus actions while component handled each round. Target turn-end Constitution saves and commands manual.',
  }),
  'kobold-press-deepm:blood-scarab': deepMagicProfile('Blood Scarab', {
    mechanics: {
      save: { ability: 'con', onSave: 'negates' },
      ...reviewedDamage([{ formula: '1d6', type: 'necrotic' }], 1, [0]),
    },
    manual:
      'Grant temporary HP equal to damage actually dealt manually. Higher slots add scarabs; distribute and combine damage per target with one save each, not generic dice upcast.',
  }),
  'kobold-press-deepm:blood-spoor': deepMagicProfile('Blood Spoor', {
    effect: ruleReminder(
      'Blood Spoor',
      'Requires blood from past hour. Follow mundane/magical trail manually; nondetection/divination barriers and planar absence limit tracking.',
      { type: 'rounds', rounds: 100 },
      'self',
      false,
      'up to 10 minutes',
    ),
    manual:
      'Requires blood from past hour. Follow mundane/magical trail manually; nondetection/divination barriers and planar absence limit tracking.',
  }),
  'kobold-press-deepm:blood-tide': deepMagicProfile('Blood Tide', {
    mechanics: { save: { ability: 'con', onSave: 'negates' } },
    effect: ruleReminder(
      'Blood Tide',
      'Exclude undead/constructs. Failure gives −2 Intelligence/Charisma/Wisdom checks without damage. Cure Wounds or DC 10 Medicine ends bleeding; duration 4 rounds/2 minutes/10 minutes/1 hour by caster tier, manual.',
      { type: 'manual' },
      'enemy',
      true,
      'Track printed consequence and endpoint manually',
    ),
    manual:
      'Exclude undead/constructs. Failure gives −2 Intelligence/Charisma/Wisdom checks without damage. Cure Wounds or DC 10 Medicine ends bleeding; duration 4 rounds/2 minutes/10 minutes/1 hour by caster tier, manual.',
  }),
  'kobold-press-deepm:blood-to-acid': deepMagicProfile('Blood to Acid', {
    mechanics: {
      save: { ability: 'con', onSave: 'half' },
      ...reviewedDamage([{ formula: '10d12', type: 'acid' }], 9, [0]),
    },
    manual:
      'Requires blood; failure also stuns for rolled 1d4 rounds manually. Mainly-blood creatures die on failure instead; handle exception manually before resolving damage.',
  }),
  'kobold-press-deepm:bloodhound': deepMagicProfile('Bloodhound', {
    effect: ruleReminder(
      'Bloodhound',
      'Smell Perception and tracking Survival advantage; 3rd or higher slot also grants 30-foot blindsight. Apply conditional benefits manually.',
      { type: 'manual' },
      'ally',
      true,
      'Track printed duration and any early endpoint manually',
    ),
    manual:
      'Smell Perception and tracking Survival advantage; 3rd or higher slot also grants 30-foot blindsight. Apply conditional benefits manually.',
  }),
  'kobold-press-deepm:bloodshot': deepMagicProfile('Bloodshot', {
    mechanics: {
      attackRoll: true,
      ...reviewedDamage(
        [
          { formula: '2d10', type: 'fire' },
          { formula: '2d8', type: 'psychic' },
        ],
        2,
        [1, 0],
      ),
    },
    attackKind: 'ranged',
    manual:
      'Pay caster 1d6 necrotic manually before attack; hit damage has fire-only +1d10 per higher slot.',
  }),
  'kobold-press-deepm:bloody-hands': deepMagicProfile('Bloody Hands', {
    mechanics: { save: { ability: 'con', onSave: 'negates' } },
    effect: ruleReminder(
      'Bloody Hands',
      'Failure causes 1 necrotic each round and disadvantage only on hand-dependent attacks; somatic/material casting requires DC 10 Constitution save without losing failed spell. Later damage/restrictions manual.',
      { type: 'manual' },
      'enemy',
      true,
      'Track printed consequence and endpoint manually',
    ),
    manual:
      'Failure causes 1 necrotic each round and disadvantage only on hand-dependent attacks; somatic/material casting requires DC 10 Constitution save without losing failed spell. Later damage/restrictions manual.',
  }),
  'kobold-press-deepm:bloody-smite': deepMagicProfile('Bloody Smite', {
    effect: ruleReminder(
      'Bloody Smite',
      'Next melee weapon hit adds 1d6 necrotic; target turn-start Constitution failures deal later 1d6 and prevent speech/verbal casting. Save, Medicine action, or magical healing ends spell; resolve manually.',
      { type: 'rounds', rounds: 10 },
      'self',
      false,
      'up to 1 minute',
    ),
    manual:
      'Next melee weapon hit adds 1d6 necrotic; target turn-start Constitution failures deal later 1d6 and prevent speech/verbal casting. Save, Medicine action, or magical healing ends spell; resolve manually.',
  }),
  'kobold-press-deepm:boiling-blood': deepMagicProfile('Boiling Blood', {
    mechanics: {
      save: { ability: 'con', onSave: 'half' },
      ...reviewedDamage([{ formula: '4d6', type: 'fire' }], 4, [0]),
    },
    manual:
      'Exclude undead/constructs; failed save also blinds. End-turn Constitution success ends spell; failure deals separate 2d6 fire and keeps blindness. Higher slots add nearby targets; later outcomes manual.',
  }),
  'kobold-press-deepm:boiling-oil': deepMagicProfile('Boiling Oil', {
    effect: ruleReminder(
      'Boiling Oil',
      '15-foot-radius pool difficult terrain; no creation damage. Entry/turn-start Dexterity save for 3d8 fire, half on success, failure prone. +1d8 per higher slot; later saves/manual standing.',
      { type: 'rounds', rounds: 10 },
      'self',
      false,
      'up to 1 minute',
    ),
    manual:
      '15-foot-radius pool difficult terrain; no creation damage. Entry/turn-start Dexterity save for 3d8 fire, half on success, failure prone. +1d8 per higher slot; later saves/manual standing.',
  }),
  'kobold-press-deepm:bolster-undead': deepMagicProfile('Bolster Undead', {
    effect: ruleReminder(
      'Bolster Undead',
      'Choose 3 undead; advantage only on saves against turning or radiant-damage spells/effects. +1 target per higher slot; apply conditional benefits manually.',
      { type: 'manual' },
      'ally',
      true,
      'Track printed duration and any early endpoint manually',
    ),
    manual:
      'Choose 3 undead; advantage only on saves against turning or radiant-damage spells/effects. +1 target per higher slot; apply conditional benefits manually.',
  }),
  'kobold-press-deepm:booster-shot': deepMagicProfile('Booster Shot', {
    effect: ruleReminder(
      'Booster Shot',
      'Enchant two-handed ranged weapon; roll d6 once for printed damage/rider mode. Later projectile hits and area/line/cone effects, turn-owner conditions, push, and +1d10 higher-slot scaling manual.',
      { type: 'rounds', rounds: 10 },
      'self',
      false,
      'up to 1 minute',
    ),
    manual:
      'Enchant two-handed ranged weapon; roll d6 once for printed damage/rider mode. Later projectile hits and area/line/cone effects, turn-owner conditions, push, and +1d10 higher-slot scaling manual.',
  }),
  'kobold-press-deepm:boreass-breath': deepMagicProfile('Boreas’s Breath', {
    manual:
      'Freeze water; partial submersion restrains, full submersion incapacitates/prevents breathing. Later cold damage, DC 10 ice-slip save, escape checks/DC 20 save, ice defenses, and higher-slot area manual.',
  }),
  'kobold-press-deepm:bottled-arcana': deepMagicProfile('Bottled Arcana', {
    manual:
      'Store intentionally cast spell within next round for up to 24 hours; releasing action targets by stored spell rules. Track container dispelling, held slot, and higher-slot maximum stored level manually.',
  }),
  'kobold-press-deepm:bottomless-stomach': deepMagicProfile('Bottomless Stomach', {
    effect: ruleReminder(
      'Bottomless Stomach',
      'Store up to 10 gallons dangerous liquids safely only when swallowed, not general immunity. Later bonus-action regurgitation uses DC 15 Dexterity and GM-selected effect; stored liquid vanishes on ending.',
      { type: 'manual' },
      'self',
      false,
      'Track printed duration and any early endpoint manually',
    ),
    manual:
      'Store up to 10 gallons dangerous liquids safely only when swallowed, not general immunity. Later bonus-action regurgitation uses DC 15 Dexterity and GM-selected effect; stored liquid vanishes on ending.',
  }),
  'kobold-press-deepm:breathtaking-wind': deepMagicProfile('Breathtaking Wind', {
    mechanics: { save: { ability: 'con', onSave: 'negates' } },
    effect: ruleReminder(
      'Breathtaking Wind',
      'Failed save prevents speaking and verbal-component casting for concentration duration; apply restriction manually without invented silence area.',
      { type: 'manual' },
      'enemy',
      true,
      'Track printed consequence and endpoint manually',
    ),
    manual:
      'Failed save prevents speaking and verbal-component casting for concentration duration; apply restriction manually without invented silence area.',
  }),
  'kobold-press-deepm:breeze-compass': deepMagicProfile('Breeze Compass', {
    effect: ruleReminder(
      'Breeze Compass',
      'Follow efficient path to known Material Plane destination; DC 8 Arcana at forks or spell ends. Avoids natural obstacles, not enemies; navigation manual.',
      { type: 'manual' },
      'self',
      false,
      'Track printed duration and any early endpoint manually',
    ),
    manual:
      'Follow efficient path to known Material Plane destination; DC 8 Arcana at forks or spell ends. Avoids natural obstacles, not enemies; navigation manual.',
  }),
  'kobold-press-deepm:brimstone-infusion': deepMagicProfile('Brimstone Infusion', {
    manual:
      'Enchant alchemist’s fire for 24 hours: 40-foot throw, 2d6 fire, extinguish save uses caster DC. Later item attacks/damage manual.',
  }),
}
