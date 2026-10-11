// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import type { ReviewedSpellCasting } from '../reviewedSpells.ts'
import { deepMagicProfile } from './deepMagic2020Profile.ts'
import { reviewedDamage, ruleReminder } from './reviewedProfile.ts'

export const DEEP_MAGIC_2020_REMAINING_3: Record<string, ReviewedSpellCasting> = {
  'kobold-press-deepm:brittling': deepMagicProfile('Brittling', {
    manual:
      'Touched metal/stone loses caster-level HP temporarily; break checks gain advantage for 1 minute. Restore original state if not shattered; no creature damage.',
  }),
  'kobold-press-deepm:broken-charge': deepMagicProfile('Broken Charge', {
    mechanics: {
      save: { ability: 'wis', onSave: 'negates' },
      ...reviewedDamage([{ formula: '2d4', type: 'psychic' }], 1, [2]),
    },
    manual:
      'Reaction to visible enemy entering within 5 feet; failure also redirects remaining movement manually. +2d4 per higher slot.',
  }),
  'kobold-press-deepm:by-the-light-of-the-moon': deepMagicProfile('By the Light of the Moon', {
    effect: ruleReminder(
      'By the Light of the Moon',
      '30-foot dim moonlight grants Perception/Investigation advantage and highlights hidden clues; apply area-limited checks manually.',
      { type: 'rounds', rounds: 10 },
      'self',
      false,
      'up to 1 minute',
    ),
    manual:
      '30-foot dim moonlight grants Perception/Investigation advantage and highlights hidden clues; apply area-limited checks manually.',
  }),
  'kobold-press-deepm:by-the-light-of-the-watchful-moon': deepMagicProfile(
    'By the Light of the Watchful Moon',
    {
      manual:
        'Reveal initial threats with moving light beams; enemy Charisma save resists. Invisible targets remain invisible, new entrants unaffected, leaving area stops illumination; track manually.',
    },
  ),
  'kobold-press-deepm:call-shadow-mastiff': deepMagicProfile('Call Shadow Mastiff', {
    effect: ruleReminder(
      'Call Shadow Mastiff',
      'Create friendly shadow mastiff with separate initiative and verbal commands; remove on 0 HP or spell ending. No initial attack.',
      { type: 'rounds', rounds: 10 },
      'self',
      false,
      'up to 1 minute',
    ),
    manual:
      'Create friendly shadow mastiff with separate initiative and verbal commands; remove on 0 HP or spell ending. No initial attack.',
  }),
  'kobold-press-deepm:calm-of-the-storm': deepMagicProfile('Calm of the Storm', {
    manual:
      'Undo recent chaos surge only for touched other creature; +1 minute allowable history per higher slot. Reconstruct affected state manually.',
  }),
  'kobold-press-deepm:candles-insight': deepMagicProfile('Candle’s Insight', {
    manual:
      'Candle indicates believed honesty, not objective truth; partial answers dim it, lies extinguish and end spell. Track candle manually.',
  }),
  'kobold-press-deepm:carmello-voltas-irksome-preserves': deepMagicProfile(
    'Carmello-Volta’s Irksome Preserves',
    {
      manual:
        'Jam disables device; construct Dexterity save negates with component-limited disadvantage unless Tiny. Cleaning action works only after spell ends; collected jam heals 1d4 if eaten within 24 hours manually.',
    },
  ),
  'kobold-press-deepm:catapult': deepMagicProfile('Catapult', {
    manual:
      'Throw up to 500 pounds 40 feet; only aimed objects require spell attack. Creature throw deals 6d10 bludgeoning plus falling, split between collision victims with prone. Higher-slot mass/distance/damage manual.',
  }),
  'kobold-press-deepm:catch-the-breath': deepMagicProfile('Catch the Breath', {
    effect: ruleReminder(
      'Catch the Breath',
      'Reaction grants breath-save advantage and no damage on success; next-turn optional ranged spell attack deals 3d10 force, +1d10 per higher slot. No attack on casting; expire stored energy manually.',
      { type: 'manual' },
      'self',
      false,
      'Track printed duration and any early endpoint manually',
    ),
    manual:
      'Reaction grants breath-save advantage and no damage on success; next-turn optional ranged spell attack deals 3d10 force, +1d10 per higher slot. No attack on casting; expire stored energy manually.',
  }),
  'kobold-press-deepm:caustic-blood': deepMagicProfile('Caustic Blood', {
    mechanics: {
      save: { ability: 'dex', onSave: 'negates' },
      ...reviewedDamage([{ formula: '1d10', type: 'acid' }], 2, [0]),
    },
    manual:
      'Reaction to piercing/slashing damage targets up to 3 creatures. Higher slots add targets, maximum 6; no damage dice upcast.',
  }),
  'kobold-press-deepm:caustic-torrent': deepMagicProfile('Caustic Torrent', {
    mechanics: {
      save: { ability: 'dex', onSave: 'half' },
      ...reviewedDamage([{ formula: '14d6', type: 'acid' }], 8, [0]),
    },
    manual:
      '60-by-5-foot line; 0 HP liquefies/kills. Separate fumes poison in/within 5 feet of line regardless of Dexterity result except nonbreathers/acid immune; manual repeat Constitution saves, 1-minute expiry, and poison selection.',
  }),
  'kobold-press-deepm:caustic-touch': deepMagicProfile('Caustic Touch', {
    mechanics: { attackRoll: true, ...reviewedDamage([{ formula: '1d8', type: 'acid' }], 0, [1]) },
    attackKind: 'melee',
    manual:
      'Hit imposes disadvantage only on resulting concentration save manually. Cantrip damage rises at caster levels 5/11/17.',
  }),
  'kobold-press-deepm:chains-of-the-goddess': deepMagicProfile('Chains of the Goddess', {
    mechanics: {
      save: { ability: 'wis', onSave: 'negates' },
      ...reviewedDamage([{ formula: '6d8', type: 'bludgeoning' }], 5, [0]),
    },
    manual:
      'Failure restrains; later caster turn-start 6d8 bludgeoning and target end-turn Wisdom save to end restraint/spell resolved manually.',
  }),
  'kobold-press-deepm:chains-of-torment': deepMagicProfile('Chains of Torment', {
    mechanics: { save: { ability: 'dex', onSave: 'negates' } },
    manual:
      'Failure grapples and restrains, escape DC caster DC; only one target. Later target turn-start 4d6 psychic (+1d6 per higher slot), action Wisdom-save mind scan, and escape manual.',
  }),
  'kobold-press-deepm:champions-weapon': deepMagicProfile('Champion’s Weapon', {
    effect: ruleReminder(
      'Champion’s Weapon',
      'Create caster-only proficient chosen melee weapon with force damage/light; separation or other wielder ends spell. Weapon-dependent attacks and +1d8 higher-slot damage manual.',
      { type: 'rounds', rounds: 100 },
      'self',
      false,
      'up to 10 minutes',
    ),
    manual:
      'Create caster-only proficient chosen melee weapon with force damage/light; separation or other wielder ends spell. Weapon-dependent attacks and +1d8 higher-slot damage manual.',
  }),
  'kobold-press-deepm:chaotic-form': deepMagicProfile('Chaotic Form', {
    effect: ruleReminder(
      'Chaotic Form',
      'Willing target: half movement, ignore difficult terrain, grapple-escape Acrobatics advantage, and easier squeezing. +10 minutes per higher slot; benefits/expiry manual.',
      { type: 'rounds', rounds: 100 },
      'ally',
      true,
      '10 minutes',
    ),
    manual:
      'Willing target: half movement, ignore difficult terrain, grapple-escape Acrobatics advantage, and easier squeezing. +10 minutes per higher slot; benefits/expiry manual.',
  }),
  'kobold-press-deepm:chaotic-vitality': deepMagicProfile('Chaotic Vitality', {
    mechanics: { attackRoll: true },
    attackKind: 'melee',
    manual:
      'Eligible target has HP and Hit Dice within printed limit. On hit roll adjusted d100 and redistribute combined HP via flux table, temporary-HP duration and haste result manually; higher slots raise eligibility.',
  }),
  'kobold-press-deepm:chaotic-world': deepMagicProfile('Chaotic World', {
    mechanics: { save: { ability: 'int', onSave: 'negates' } },
    manual:
      'Enemies in cube fail into blinded, deafened, prone; cannot recover within area, all three end immediately on leaving. Apply bundled conditions/area exit manually.',
  }),
  'kobold-press-deepm:chilling-words': deepMagicProfile('Chilling Words', {
    mechanics: { save: { ability: 'wis', onSave: 'negates' } },
    manual:
      'Failure makes target susceptible to later phrase, not immediate restraint. Later limited utterances trigger Constitution save, psychic damage/restraint, minute immunity; final utterance has mixed success/failure durations, manual.',
  }),
  'kobold-press-deepm:chronal-lance': deepMagicProfile('Chronal Lance', {
    mechanics: { save: { ability: 'wis', onSave: 'negates' } },
    effect: ruleReminder(
      'Chronal Lance',
      'Up to 3 targets: halve walking speed rounded up to 5 feet and disadvantage Dexterity checks, not saves. End-turn repeat saves and +1 target per higher slot manual.',
      { type: 'manual' },
      'enemy',
      true,
      'Track printed consequence and endpoint manually',
    ),
    manual:
      'Up to 3 targets: halve walking speed rounded up to 5 feet and disadvantage Dexterity checks, not saves. End-turn repeat saves and +1 target per higher slot manual.',
  }),
  'kobold-press-deepm:circle-of-wind': deepMagicProfile('Circle of Wind', {
    effect: ruleReminder(
      'Circle of Wind',
      '+2 armor class only against ranged attacks; advantage only on environmental-heat and harmful gas/vapor/inhaled-poison saves. Apply conditional defenses manually for 8 hours.',
      { type: 'manual' },
      'self',
      false,
      'Track printed duration and any early endpoint manually',
    ),
    manual:
      '+2 armor class only against ranged attacks; advantage only on environmental-heat and harmful gas/vapor/inhaled-poison saves. Apply conditional defenses manually for 8 hours.',
  }),
  'kobold-press-deepm:clash-of-glaciers': deepMagicProfile('Clash of Glaciers', {
    mechanics: {
      save: { ability: 'dex', onSave: 'half' },
      ...reviewedDamage(
        [
          { formula: '5d6', type: 'bludgeoning' },
          { formula: '5d6', type: 'cold' },
        ],
        5,
        [0, 0],
      ),
    },
    manual:
      '100-foot line initial damage; each higher-slot extra d6 is chosen bludgeoning or cold, so higher-slot distribution manual.',
  }),
  'kobold-press-deepm:claws-of-darkness': deepMagicProfile('Claws of Darkness', {
    effect: ruleReminder(
      'Claws of Darkness',
      'Create 10-foot-reach claws; later melee spell attack deals 1d10 cold. No initial attack specified; track later attacks manually.',
      { type: 'rounds', rounds: 10 },
      'self',
      false,
      'up to 1 minute',
    ),
    manual:
      'Create 10-foot-reach claws; later melee spell attack deals 1d10 cold. No initial attack specified; track later attacks manually.',
  }),
  'kobold-press-deepm:claws-of-the-earth-dragon': deepMagicProfile('Claws of the Earth Dragon', {
    mechanics: {
      save: { ability: 'str', onSave: 'half' },
      ...reviewedDamage([{ formula: '6d8', type: 'bludgeoning' }], 5, [1]),
    },
    manual:
      'Failure prone and grounded, with additional falling damage manually; successful save prevents fall/prone. +1d8 damage and 10-foot range per higher slot.',
  }),
  'kobold-press-deepm:cloak-of-shadow': deepMagicProfile('Cloak of Shadow', {
    effect: ruleReminder(
      'Cloak of Shadow',
      'Stealth advantage only against sight-dependent creatures; apply conditional checks manually.',
      { type: 'rounds', rounds: 10 },
      'self',
      false,
      'up to 1 minute',
    ),
    manual:
      'Stealth advantage only against sight-dependent creatures; apply conditional checks manually.',
  }),
  'kobold-press-deepm:clockwork-bolt': deepMagicProfile('Clockwork Bolt', {
    manual:
      'Requires bow/crossbow weapon attack; embedded hit deals later 1d8 slashing at target next turn end unless removed by action. Caster-tier initial and later slashing bonuses manual.',
  }),
  'kobold-press-deepm:closing-in': deepMagicProfile('Closing In', {
    mechanics: { save: { ability: 'wis', onSave: 'negates' } },
    effect: ruleReminder(
      'Closing In',
      'Save disadvantage only in enclosed space. Failure attack/check disadvantage; later end-turn 2d6 psychic and repeat Wisdom save manual. Higher slots add targets.',
      { type: 'manual' },
      'enemy',
      true,
      'Track printed consequence and endpoint manually',
    ),
    manual:
      'Save disadvantage only in enclosed space. Failure attack/check disadvantage; later end-turn 2d6 psychic and repeat Wisdom save manual. Higher slots add targets.',
  }),
  'kobold-press-deepm:cobra-fangs': deepMagicProfile('Cobra Fangs', {
    manual:
      'Fails if poison bite already exists; unwilling target Wisdom save resists. Grant Strength-based d4 piercing bite; later Constitution save for 3d6 poison/half. Higher slots make bite magical; no initial bite.',
  }),
  'kobold-press-deepm:compelled-movement': deepMagicProfile('Compelled Movement', {
    mechanics: { save: { ability: 'cha', onSave: 'negates' } },
    effect: ruleReminder(
      'Compelled Movement',
      'Two living corporeal charm-susceptible targets approach each other; later adjacency fuses them with movement/reaction limits and conditional disadvantages. Action escape saves, refusion, and slots 5/7/9 targets manual.',
      { type: 'manual' },
      'enemy',
      true,
      'Track printed consequence and endpoint manually',
    ),
    manual:
      'Two living corporeal charm-susceptible targets approach each other; later adjacency fuses them with movement/reaction limits and conditional disadvantages. Action escape saves, refusion, and slots 5/7/9 targets manual.',
  }),
}
