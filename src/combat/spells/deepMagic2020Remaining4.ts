// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import type { ReviewedSpellCasting } from '../reviewedSpells.ts'
import { deepMagicProfile } from './deepMagic2020Profile.ts'
import { ruleReminder, reviewedDamage } from './reviewedProfile.ts'

export const DEEP_MAGIC_2020_REMAINING_4: Record<string, ReviewedSpellCasting> = {
  'kobold-press-deepm:compelling-fate': deepMagicProfile('Compelling Fate', {
    mechanics: { save: { ability: 'cha', onSave: 'negates' } },
    effect: ruleReminder(
      'Compelling Fate',
      'Failure enables relational attack advantage, borrowed movement on target turn, and reaction warning +2 defenses against next attack. Duration and higher-slot rounds manually tracked.',
      { type: 'manual' },
      'enemy',
      true,
      'Track printed consequence and endpoint manually',
    ),
    manual:
      'Failure enables relational attack advantage, borrowed movement on target turn, and reaction warning +2 defenses against next attack. Duration and higher-slot rounds manually tracked.',
  }),
  'kobold-press-deepm:comprehend-wild-shape': deepMagicProfile('Comprehend Wild Shape', {
    effect: ruleReminder(
      'Comprehend Wild Shape',
      'Totem holders understand each other’s beast-shape speech; no telepathy or beast-form spellcasting. Higher slots add two matching-totem targets each.',
      { type: 'manual' },
      'ally',
      true,
      'Track printed duration and any early endpoint manually',
    ),
    manual:
      'Totem holders understand each other’s beast-shape speech; no telepathy or beast-form spellcasting. Higher slots add two matching-totem targets each.',
  }),
  'kobold-press-deepm:confound-senses': deepMagicProfile('Confound Senses', {
    mechanics: { save: { ability: 'int', onSave: 'negates' } },
    effect: ruleReminder(
      'Confound Senses',
      'Up to 6 targets: half speed, ranged attack disadvantage, automatic lost-avoidance Survival failures, random paths. Navigation and modifiers manual.',
      { type: 'manual' },
      'enemy',
      true,
      'Track printed consequence and endpoint manually',
    ),
    manual:
      'Up to 6 targets: half speed, ranged attack disadvantage, automatic lost-avoidance Survival failures, random paths. Navigation and modifiers manual.',
  }),
  'kobold-press-deepm:conjure-fey-hound': deepMagicProfile('Conjure Fey Hound', {
    effect: ruleReminder(
      'Conjure Fey Hound',
      'Summon hound of the night with independent initiative and verbal commands; disappears at 0 HP/ending. Slots 7/9 summon two/three hounds; no initial attack.',
      { type: 'manual' },
      'self',
      false,
      'Track printed duration and any early endpoint manually',
    ),
    manual:
      'Summon hound of the night with independent initiative and verbal commands; disappears at 0 HP/ending. Slots 7/9 summon two/three hounds; no initial attack.',
  }),
  'kobold-press-deepm:conjure-forest-defender': deepMagicProfile('Conjure Forest Defender', {
    manual:
      'Forest-only sacrificed body becomes defender; commands require caster line of sight. Recasting destroys prior defender; slot 9 allows two. Track initiative, sight, and resurrection limits manually.',
  }),
  'kobold-press-deepm:conjure-greater-spectral-dead': deepMagicProfile(
    'Conjure Greater Spectral Dead',
    {
      effect: ruleReminder(
        'Conjure Greater Spectral Dead',
        'Choose printed undead; independent initiative. Reaction command costs 1d6 psychic at turn end. Concentration loss makes creature hostile but does not dismiss it before hour expiry; slot 9 choices manual.',
        { type: 'manual' },
        'self',
        false,
        'Track printed duration and any early endpoint manually',
      ),
      manual:
        'Choose printed undead; independent initiative. Reaction command costs 1d6 psychic at turn end. Concentration loss makes creature hostile but does not dismiss it before hour expiry; slot 9 choices manual.',
    },
  ),
  'kobold-press-deepm:conjure-minor-voidborn': deepMagicProfile('Conjure Minor Voidborn', {
    effect: ruleReminder(
      'Conjure Minor Voidborn',
      'Choose printed CR/count fiend/aberration group; reaction command costs 1d6 psychic. Concentration loss makes summons hostile, not absent; hour expiry and slots 7/9 multipliers manual.',
      { type: 'manual' },
      'self',
      false,
      'Track printed duration and any early endpoint manually',
    ),
    manual:
      'Choose printed CR/count fiend/aberration group; reaction command costs 1d6 psychic. Concentration loss makes summons hostile, not absent; hour expiry and slots 7/9 multipliers manual.',
  }),
  'kobold-press-deepm:conjure-scarab-swarm': deepMagicProfile('Conjure Scarab Swarm', {
    effect: ruleReminder(
      'Conjure Scarab Swarm',
      'Summon two beetle swarms with shared initiative, verbal commands, and self-defense default. Remove on 0 HP or spell ending; no initial attack.',
      { type: 'rounds', rounds: 100 },
      'self',
      false,
      'up to 10 minutes',
    ),
    manual:
      'Summon two beetle swarms with shared initiative, verbal commands, and self-defense default. Remove on 0 HP or spell ending; no initial attack.',
  }),
  'kobold-press-deepm:conjure-shadow-titan': deepMagicProfile('Conjure Shadow Titan', {
    effect: ruleReminder(
      'Conjure Shadow Titan',
      'Use stone giant with dim-light camouflage and cold shadow-rock damage. Independent initiative, verbal/telepathic commands, and removal on 0 HP/ending manual.',
      { type: 'manual' },
      'self',
      false,
      'Track printed duration and any early endpoint manually',
    ),
    manual:
      'Use stone giant with dim-light camouflage and cold shadow-rock damage. Independent initiative, verbal/telepathic commands, and removal on 0 HP/ending manual.',
  }),
  'kobold-press-deepm:conjure-spectral-dead': deepMagicProfile('Conjure Spectral Dead', {
    effect: ruleReminder(
      'Conjure Spectral Dead',
      'Summon commanded shroud with independent initiative and self-defense default; higher slots choose printed shroud/specter/ghost/wight alternatives. No initial attack.',
      { type: 'manual' },
      'self',
      false,
      'Track printed duration and any early endpoint manually',
    ),
    manual:
      'Summon commanded shroud with independent initiative and self-defense default; higher slots choose printed shroud/specter/ghost/wight alternatives. No initial attack.',
  }),
  'kobold-press-deepm:conjure-undead': deepMagicProfile('Conjure Undead', {
    effect: ruleReminder(
      'Conjure Undead',
      'Summon commanded shadow with independent initiative; slots 4/5 add printed wight/ghost options. Remove when spell ends; no initial attack.',
      { type: 'manual' },
      'self',
      false,
      'Track printed duration and any early endpoint manually',
    ),
    manual:
      'Summon commanded shadow with independent initiative; slots 4/5 add printed wight/ghost options. Remove when spell ends; no initial attack.',
  }),
  'kobold-press-deepm:conjure-voidborn': deepMagicProfile('Conjure Voidborn', {
    effect: ruleReminder(
      'Conjure Voidborn',
      'Summon CR 6 fiend/aberration; attacks nearest creature unless reaction Void Speech command costs 2d6 psychic. Concentration loss creates hostile summon until hour expiry; higher slots raise CR.',
      { type: 'manual' },
      'self',
      false,
      'Track printed duration and any early endpoint manually',
    ),
    manual:
      'Summon CR 6 fiend/aberration; attacks nearest creature unless reaction Void Speech command costs 2d6 psychic. Concentration loss creates hostile summon until hour expiry; higher slots raise CR.',
  }),
  'kobold-press-deepm:consult-the-storm': deepMagicProfile('Consult the Storm', {
    mechanics: {
      save: { ability: 'con', onSave: 'half' },
      ...reviewedDamage([{ formula: '7d6', type: 'thunder' }], 4, [1]),
    },
    manual:
      'Ask up to 15-word question; truthful answer heard within 600 feet and initial damage within 15 feet of chosen point. +1d6 per higher slot.',
  }),
  'kobold-press-deepm:converse-with-dragon': deepMagicProfile('Converse With Dragon', {
    manual:
      'Limited 120-foot dragon-only telepathy, optional dragon Charisma save blocks contact; disposition unchanged. Communication and refusal manual.',
  }),
  'kobold-press-deepm:costly-victory': deepMagicProfile('Costly Victory', {
    mechanics: { save: { ability: 'wis', onSave: 'negates' } },
    manual:
      'Up to 10 enemies cursed; only later reducing ally to 0 HP triggers 6d8 fire plus 6d8 radiant. Flammability-based continuing fire/casting modifier and extinguishing action manual.',
  }),
  'kobold-press-deepm:create-ring-servant': deepMagicProfile('Create Ring Servant', {
    effect: ruleReminder(
      'Create Ring Servant',
      'Create friendly ring servant with independent initiative, verbal commands, self/caster-defense default; reverts to rings on 0 HP or ending. No initial attack.',
      { type: 'manual' },
      'self',
      false,
      'Track printed duration and any early endpoint manually',
    ),
    manual:
      'Create friendly ring servant with independent initiative, verbal commands, self/caster-defense default; reverts to rings on 0 HP or ending. No initial attack.',
  }),
  'kobold-press-deepm:create-thunderstaff': deepMagicProfile('Create Thunderstaff', {
    manual:
      'Charge quarterstaff in noisy location for 60 days; later +1 weapon, 10 charges, hit-trigger thunder and bonus-action Thunderwave manual. No recharge; unused final charge expiry manual.',
  }),
  'kobold-press-deepm:creeping-ice': deepMagicProfile('Creeping Ice', {
    mechanics: { save: { ability: 'str', onSave: 'negates' } },
    persistsAfterSave: true,
    manual:
      'Initial failure restrains but no initial cold. Ice area persists after success; later turn-start cold, disadvantaged action Strength escape, ice damage split, and tiered higher-slot area/damage/HP manual.',
  }),
  'kobold-press-deepm:crushing-curse': deepMagicProfile('Crushing Curse', {
    mechanics: {
      save: { ability: 'wis', onSave: 'negates' },
      ...reviewedDamage([{ formula: '1d6', type: 'psychic' }], 0, [1]),
    },
    effect: ruleReminder(
      'Crushing Curse',
      'Requires hearing; failure deafens except Void Speech for 1 minute. Target end-turn repeat save and selective deafness manual; cantrip scaling at 5/11/17.',
      { type: 'manual' },
      'enemy',
      true,
      'Track printed consequence and endpoint manually',
    ),
    manual:
      'Requires hearing; failure deafens except Void Speech for 1 minute. Target end-turn repeat save and selective deafness manual; cantrip scaling at 5/11/17.',
  }),
  'kobold-press-deepm:crushing-trample': deepMagicProfile('Crushing Trample', {
    mechanics: {
      save: { ability: 'str', onSave: 'negates' },
      ...reviewedDamage([{ formula: '4d6', type: 'bludgeoning' }], 2, [0]),
    },
    manual:
      'Move straight up to twice speed without opportunity attacks; only eligible size enemies trampled. Failure also prone; hooves add Strength modifier minimum 1 manually, larger enemy stops movement/spell.',
  }),
  'kobold-press-deepm:cure-beast': deepMagicProfile('Cure Beast', {
    manual:
      'Heal visible beast for 1d6 plus casting modifier, +1d6 per higher slot; healing and eligibility manual.',
  }),
  'kobold-press-deepm:curse-of-boreas': deepMagicProfile('Curse of Boreas', {
    mechanics: { save: { ability: 'cha', onSave: 'negates' } },
    manual:
      'Failure freezes creature/equipment permanently into effectively paralyzed ice statue. Damage carries through; Dispel Magic only permits temporary speech, Greater Restoration or stronger frees target manually.',
  }),
  'kobold-press-deepm:curse-of-dust': deepMagicProfile('Curse of Dust', {
    effect: ruleReminder(
      'Curse of Dust',
      'No initial save. Prevent nourishment; Constitution saves only every 24 hours cause exhaustion on failure, two consecutive successes end curse. Track 5 days and later saves manually.',
      { type: 'manual' },
      'enemy',
      true,
      'Track printed duration and any early endpoint manually',
    ),
    manual:
      'No initial save. Prevent nourishment; Constitution saves only every 24 hours cause exhaustion on failure, two consecutive successes end curse. Track 5 days and later saves manually.',
  }),
  'kobold-press-deepm:curse-of-incompetence': deepMagicProfile('Curse of Incompetence', {
    mechanics: { save: { ability: 'int', onSave: 'negates' } },
    effect: ruleReminder(
      'Curse of Incompetence',
      'Requires target sight; failed save rolls d4 behavior table. End-turn saves end or reroll behavior; initiative penalty, actions, and flee/fight branch manual.',
      { type: 'manual' },
      'enemy',
      true,
      'Track printed consequence and endpoint manually',
    ),
    manual:
      'Requires target sight; failed save rolls d4 behavior table. End-turn saves end or reroll behavior; initiative penalty, actions, and flee/fight branch manual.',
  }),
  'kobold-press-deepm:curse-of-the-grave': deepMagicProfile('Curse of the Grave', {
    mechanics: { save: { ability: 'con', onSave: 'negates' } },
    effect: ruleReminder(
      'Curse of the Grave',
      'Humanoid curse changes death saves; dying raises controlled vampire spawn after 1 round. Single-spawn limit, harmful-action Wisdom release save, and curse removal manual.',
      { type: 'manual' },
      'enemy',
      true,
      'Track printed consequence and endpoint manually',
    ),
    manual:
      'Humanoid curse changes death saves; dying raises controlled vampire spawn after 1 round. Single-spawn limit, harmful-action Wisdom release save, and curse removal manual.',
  }),
  'kobold-press-deepm:curse-of-yig': deepMagicProfile('Curse of Yig', {
    manual:
      'Willing transformation automatic, unwilling Wisdom save. Replace eligible creature with servant of Yig, alignment/attitude and separate HP; repeat unwilling end-turn saves, excess damage, and equipment manual.',
  }),
  'kobold-press-deepm:curse-ring': deepMagicProfile('Curse Ring', {
    manual:
      'Enchant uncarried/unworn ring with chosen Bestow Curse effect; next willing wearer gets curse without save. Ring becomes mundane, curse persists; identify/removal manual.',
  }),
  'kobold-press-deepm:cursed-gift': deepMagicProfile('Cursed Gift', {
    manual:
      'Store existing harmful effect in object; only freely accepting recipient later makes Charisma save to transfer. Returning/destroying object does not end effect; expiry returns unexpired effect, higher-slot days manual.',
  }),
  'kobold-press-deepm:cynophobia': deepMagicProfile('Cynophobia', {
    mechanics: { save: { ability: 'wis', onSave: 'negates' } },
    effect: ruleReminder(
      'Cynophobia',
      'Failure creates canine fear susceptibility, not immediate fright. Later first sight of each canid Wisdom save and nearby-canid attack/check disadvantage, higher-slot duration manual.',
      { type: 'manual' },
      'enemy',
      true,
      'Track printed consequence and endpoint manually',
    ),
    manual:
      'Failure creates canine fear susceptibility, not immediate fright. Later first sight of each canid Wisdom save and nearby-canid attack/check disadvantage, higher-slot duration manual.',
  }),
  'kobold-press-deepm:daggerhawk': deepMagicProfile('Daggerhawk', {
    manual:
      'Initial and later action melee attacks use spell attack bonus but damage 1d4 plus Intelligence modifier, not generic casting modifier. Eligible hit against invulnerable AC 14 hawk delays attacks manually.',
  }),
}
