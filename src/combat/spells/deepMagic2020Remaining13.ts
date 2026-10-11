// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import type { ReviewedSpellCasting } from '../reviewedSpells.ts'
import { deepMagicProfile, deepMagicTurnConditions } from './deepMagic2020Profile.ts'
import { ruleReminder, reviewedDamage } from './reviewedProfile.ts'

export const DEEP_MAGIC_2020_REMAINING_13: Record<string, ReviewedSpellCasting> = {
  'kobold-press-deepm:scribe': deepMagicProfile('Scribe', {
    manual:
      'Copy single page onto adequate medium in caster style; no copied magical properties. Document creation manual.',
  }),
  'kobold-press-deepm:scry-ambush': deepMagicProfile('Scry Ambush', {
    manual:
      'If surprised, casting-ability check versus initiative count permits reaction; success prevents ally surprise for casting modifier plus proficiency listeners/viewers. Check and surprise state manual.',
  }),
  'kobold-press-deepm:sculpt-snow': deepMagicProfile('Sculpt Snow', {
    manual:
      'Shape size/count-dependent snow objects; realistic appearance needs minute. Later Animate Objects, not this spell, adds matching cold damage. Higher-slot size/count conversion manual.',
  }),
  'kobold-press-deepm:seal-of-sanctuary': deepMagicProfile('Seal of Sanctuary', {
    manual:
      '50-foot sanctuary with type-specific later entry 10d8 radiant save/ban, off-plane fiend destruction, interior 2d8 ongoing radiant/penalties. Seal HP/defenses and protected-type exemptions manual.',
  }),
  'kobold-press-deepm:searing-sun': deepMagicProfile('Searing Sun', {
    effect: ruleReminder(
      'Searing Sun',
      'Requires visible sun; no initial damage. Later turn-start Constitution half-save 5d8 fire, solid shade grants advantage. Action moves cylinder 20 feet; later saves/manual.',
      { type: 'rounds', rounds: 10 },
      'self',
      false,
      'up to 1 minute',
    ),
    manual:
      'Requires visible sun; no initial damage. Later turn-start Constitution half-save 5d8 fire, solid shade grants advantage. Action moves cylinder 20 feet; later saves/manual.',
  }),
  'kobold-press-deepm:see-beyond': deepMagicProfile('See Beyond', {
    effect: ruleReminder(
      'See Beyond',
      'Willing target selectively sees through obstructions within 30 feet; cover still blocks attacks and other spell requirements still apply. Sight/eligibility manual.',
      { type: 'manual' },
      'ally',
      true,
      'Track printed duration and any early endpoint manually',
    ),
    manual:
      'Willing target selectively sees through obstructions within 30 feet; cover still blocks attacks and other spell requirements still apply. Sight/eligibility manual.',
  }),
  'kobold-press-deepm:seed-of-destruction': deepMagicProfile('Seed of Destruction', {
    mechanics: { attackRoll: true },
    attackKind: 'ranged',
    manual:
      'Hit plants embryo; later 1d3+1-round gestation deals save-based slashing, then commanded hydra. End-turn DC 15 Charisma control saves, summon/dispelling and lifetime manual.',
  }),
  'kobold-press-deepm:seeping-death': deepMagicProfile('Seeping Death', {
    mechanics: { attackRoll: true },
    attackKind: 'melee',
    manual:
      'Hit reduces Dexterity 1d4 and gives natural disease; later long-rest saves repeat reduction, Dexterity 0 kills. Cure/recovery requires post-cure long rest; no invented damage.',
  }),
  'kobold-press-deepm:seers-reaction': deepMagicProfile('Seer’s Reaction', {
    manual:
      'Reroll initiative +5, improve only if higher; beating active count gives immediate next turn then new initiative. Order/turn consumption manual.',
  }),
  'kobold-press-deepm:semblance-of-dread': deepMagicProfile('Semblance of Dread', {
    effect: ruleReminder(
      'Semblance of Dread',
      'Caster radiant vulnerability/fear-save advantage; nearby seeing nonconstruct/nonundead must later Wisdom save before approaching. Conditional saves/defenses manual, not general frightened.',
      { type: 'rounds', rounds: 10 },
      'self',
      false,
      'up to 1 minute',
    ),
    manual:
      'Caster radiant vulnerability/fear-save advantage; nearby seeing nonconstruct/nonundead must later Wisdom save before approaching. Conditional saves/defenses manual, not general frightened.',
  }),
  'kobold-press-deepm:shade': deepMagicProfile('Shade', {
    effect: ruleReminder(
      'Shade',
      'Prevent future visible-effect blindness, not existing blindness; ignore usual sunlight penalties. Higher slots extend 10 minutes; conditional defenses manual.',
      { type: 'rounds', rounds: 100 },
      'self',
      false,
      'up to 10 minutes',
    ),
    manual:
      'Prevent future visible-effect blindness, not existing blindness; ignore usual sunlight penalties. Higher slots extend 10 minutes; conditional defenses manual.',
  }),
  'kobold-press-deepm:shadow-armor': deepMagicProfile('Shadow Armor', {
    effect: ruleReminder(
      'Shadow Armor',
      'Triggering attack disadvantage only, radiant resistance until caster next turn start despite Instantaneous header. Apply triggering roll and defense manually.',
      { type: 'untilSourceTurn', when: 'startOfTurn' },
      'self',
      false,
      'Until caster next turn start',
    ),
    manual:
      'Triggering attack disadvantage only, radiant resistance until caster next turn start despite Instantaneous header. Apply triggering roll and defense manually.',
  }),
  'kobold-press-deepm:shadow-bite': deepMagicProfile('Shadow Bite', {
    mechanics: {
      save: { ability: 'con', onSave: 'negates' },
      ...reviewedDamage([{ formula: '1d6', type: 'necrotic' }], 0, [1]),
    },
    manual:
      'Failure halves speed until caster next turn start; rider manual. Cantrip scales at 5/11/17.',
  }),
  'kobold-press-deepm:shadow-blindness': deepMagicProfile('Shadow Blindness', {
    mechanics: { attackRoll: true },
    attackKind: 'melee',
    manual:
      'Only innate darkvision removed on hit for 1 round; magical darkvision and other senses unaffected. Sense/expiry manual, not blinded.',
  }),
  'kobold-press-deepm:shadow-hands': deepMagicProfile('Shadow Hands', {
    mechanics: {
      save: { ability: 'wis', onSave: 'half' },
      ...reviewedDamage([{ formula: '2d4', type: 'necrotic' }], 1, [2]),
    },
    effect: deepMagicTurnConditions(['Frightened'], 'target', 'endOfTurn', true),
    manual:
      '10-foot cone; failed saves frighten until target next turn end. Rider manual; +2d4 per higher slot.',
  }),
  'kobold-press-deepm:shadow-monsters': deepMagicProfile('Shadow Monsters', {
    mechanics: { save: { ability: 'wis', onSave: 'negates' } },
    effect: ruleReminder(
      'Shadow Monsters',
      'Up to two failures must attack nearest ally perceived as monster; end-turn repeat saves end. Target/attack behavior and higher-slot targets manual.',
      { type: 'manual' },
      'enemy',
      true,
      'Track printed consequence and endpoint manually',
    ),
    manual:
      'Up to two failures must attack nearest ally perceived as monster; end-turn repeat saves end. Target/attack behavior and higher-slot targets manual.',
  }),
  'kobold-press-deepm:shadow-puppets': deepMagicProfile('Shadow Puppets', {
    effect: ruleReminder(
      'Shadow Puppets',
      'Creating shadow alone does not attack; optional extra bonus action initially/later action melee hit deals 2d8 psychic then Intelligence save against incapacitation. Later attacks/save and higher-slot damage manual.',
      { type: 'rounds', rounds: 10 },
      'enemy',
      true,
      'up to 1 minute',
    ),
    manual:
      'Creating shadow alone does not attack; optional extra bonus action initially/later action melee hit deals 2d8 psychic then Intelligence save against incapacitation. Later attacks/save and higher-slot damage manual.',
  }),
  'kobold-press-deepm:shadow-trove': deepMagicProfile('Shadow Trove', {
    manual:
      'Store up to 750 pounds nonliving matter; caster/Intelligence-modifier designees access, spills at expiry. Higher slots add two hours; inventory manual.',
  }),
  'kobold-press-deepm:shared-sacrifice': deepMagicProfile('Shared Sacrifice', {
    manual:
      'Caster/up to five allies pay irreducible 5 necrotic each into healing pool; later contributor touch actions heal casting modifier and spend pool. No initial healing; counters/manual.',
  }),
  'kobold-press-deepm:sheen-of-ice': deepMagicProfile('Sheen of Ice', {
    mechanics: { save: { ability: 'dex', onSave: 'negates' } },
    effect: ruleReminder(
      'Sheen of Ice',
      'Failure halves speed and outlines invisibility for minute; target taking ≥5 fire ends individually. Defense/visibility and ending manual.',
      { type: 'manual' },
      'enemy',
      true,
      'Track printed consequence and endpoint manually',
    ),
    manual:
      'Failure halves speed and outlines invisibility for minute; target taking ≥5 fire ends individually. Defense/visibility and ending manual.',
  }),
  'kobold-press-deepm:shifting-the-odds': deepMagicProfile('Shifting the Odds', {
    manual:
      'Next attack/check gains advantage, second attack/check disadvantage, no printed expiry despite Instantaneous header. Track ordered roll consumption manually.',
  }),
  'kobold-press-deepm:shiver': deepMagicProfile('Shiver', {
    manual:
      'Roll 5d8 eligible humanoid HP threshold, increasing 4d8 per caster tier. Constitution failure prevents spells/loading until caster next turn end and grants 24-hour immunity; threshold/save manual.',
  }),
  'kobold-press-deepm:shroud-of-death': deepMagicProfile('Shroud of Death', {
    effect: ruleReminder(
      'Shroud of Death',
      'Initial automatic 1 necrotic per visible living creature grants aggregate temporary HP; caster-start increments damage/HP each round. No initial save; damage/HP and sight eligibility manual.',
      { type: 'rounds', rounds: 10 },
      'self',
      false,
      'up to 10 rounds',
    ),
    manual:
      'Initial automatic 1 necrotic per visible living creature grants aggregate temporary HP; caster-start increments damage/HP each round. No initial save; damage/HP and sight eligibility manual.',
  }),
  'kobold-press-deepm:sidestep-arrow': deepMagicProfile('Sidestep Arrow', {
    manual:
      'Reaction before ranged attack resolution moves up to 15 feet without opportunity attacks to interpose nearby foe. Invalid movement fails; retarget incoming attack manually.',
  }),
  'kobold-press-deepm:sign-of-koth': deepMagicProfile('Sign of Koth', {
    manual:
      'Choose creature type and inward/outward barrier mode; later teleport saves, sight-relative attack penalty, sensory/condition protections and rest healing differ. Persistent field/higher-slot radius manual.',
  }),
  'kobold-press-deepm:silhouette': deepMagicProfile('Silhouette', {
    effect: ruleReminder(
      'Silhouette',
      'Silent shadow play within 100-square-foot surface; Intelligence limits viewers/specific figures. Illusion appearance/perception manual.',
      { type: 'rounds', rounds: 10 },
      'self',
      false,
      'up to 1 minute',
    ),
    manual:
      'Silent shadow play within 100-square-foot surface; Intelligence limits viewers/specific figures. Illusion appearance/perception manual.',
  }),
  'kobold-press-deepm:sir-mittinzs-move-curse': deepMagicProfile('Sir Mittinz’s Move Curse', {
    manual:
      'Transfer existing curse between two creatures or two objects within range, never creature-to-object. State/identity changes manual.',
  }),
  'kobold-press-deepm:sleep-of-the-deep': deepMagicProfile('Sleep of the Deep', {
    mechanics: { save: { ability: 'wis', onSave: 'negates' } },
    manual:
      'Only sleeping eligible creature; failure negates rest benefits and later awakening causes exhaustion/short-term madness. Effects delayed, manual; higher slots add targets.',
  }),
  'kobold-press-deepm:slippery-fingers': deepMagicProfile('Slippery Fingers', {
    mechanics: { save: { ability: 'cha', onSave: 'negates' } },
    manual: 'Failure drops one chosen held nonmagical item. Inventory/position manual.',
  }),
  'kobold-press-deepm:slither': deepMagicProfile('Slither', {
    effect: ruleReminder(
      'Slither',
      'Shadow form squeezes, dark-dependent Stealth advantage and nonmagical physical immunity; cannot speak/use items/attack/cast. Reversion shunt/distance force damage, higher-slot willing targets manual.',
      { type: 'rounds', rounds: 10 },
      'self',
      false,
      'up to 1 minute',
    ),
    manual:
      'Shadow form squeezes, dark-dependent Stealth advantage and nonmagical physical immunity; cannot speak/use items/attack/cast. Reversion shunt/distance force damage, higher-slot willing targets manual.',
  }),
}
