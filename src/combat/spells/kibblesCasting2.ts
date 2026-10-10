// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import type { ReviewedSpellCasting } from '../reviewedSpells.ts'
import { kibblesProfile, kibblesDamage } from './kibblesProfile.ts'
import { ruleReminder } from './reviewedProfile.ts'
import { condition } from '../effects.ts'

export const KIBBLES_CASTING_2: Record<string, ReviewedSpellCasting> = {
  'kibblestasty-casting-compendium-v2.3:blade-mirage': kibblesProfile('Blade Mirage', {
    effect: ruleReminder(
      'Blade Mirage',
      'Feint on casting or bonus action: next weapon attack against chosen adjacent creature this turn has advantage. Action Investigation check can grant immunity; dropping weapon ends spell. No blanket advantage or initial spell attack.',
      { type: 'manual' },
      'self',
      false,
    ),
    manual:
      'Feint on casting or bonus action: next weapon attack against chosen adjacent creature this turn has advantage. Action Investigation check can grant immunity; dropping weapon ends spell. No blanket advantage or initial spell attack.',
  }),
  'kibblestasty-casting-compendium-v2.3:blade-vortex': kibblesProfile('Blade Vortex', {
    effect: ruleReminder(
      'Blade Vortex',
      'No initial damage. First entry on a turn or turn start within 10 feet deals 4d4 slashing automatically. Half cover only against ranged attacks until caster next turn start. Higher slots add 1d4; track triggers and cover manually.',
      { type: 'untilSourceTurn', when: 'startOfTurn' },
      'self',
      false,
    ),
    manual:
      'No initial damage. First entry on a turn or turn start within 10 feet deals 4d4 slashing automatically. Half cover only against ranged attacks until caster next turn start. Higher slots add 1d4; track triggers and cover manually.',
  }),
  'kibblestasty-casting-compendium-v2.3:blastwave': kibblesProfile('Blastwave', {
    mechanics: {
      save: { ability: 'dex', onSave: 'half' },
      ...kibblesDamage(
        [
          { formula: '4d8', type: 'thunder' },
          { formula: '4d8', type: 'fire' },
        ],
        5,
        [0, 0],
      ),
    },
    manual:
      'Select chosen creatures within 30 feet; push failed saves 10 feet manually. Both initial damage types are rolled together.',
  }),
  'kibblestasty-casting-compendium-v2.3:blazing-beacon': kibblesProfile('Blazing Beacon', {
    effect: ruleReminder(
      'Blazing Beacon',
      'No initial save. Targeting caster with attack or sight-required spell triggers Constitution save against blindness until attacker next turn start. Darkvision imposes disadvantage; eyeless creatures succeed automatically. Track light and triggers manually.',
      { type: 'manual' },
      'self',
      false,
    ),
    manual:
      'No initial save. Targeting caster with attack or sight-required spell triggers Constitution save against blindness until attacker next turn start. Darkvision imposes disadvantage; eyeless creatures succeed automatically. Track light and triggers manually.',
  }),
  'kibblestasty-casting-compendium-v2.3:blizzard': kibblesProfile('Blizzard', {
    effect: ruleReminder(
      'Blizzard',
      'No creation damage. Turn start or first entry on own turn triggers Constitution save for 6d8 cold, half on success. Track obscurity, terrain, cylinder, and +1d8 per higher slot manually.',
      { type: 'manual' },
      'self',
      false,
    ),
    manual:
      'No creation damage. Turn start or first entry on own turn triggers Constitution save for 6d8 cold, half on success. Track obscurity, terrain, cylinder, and +1d8 per higher slot manually.',
  }),
  'kibblestasty-casting-compendium-v2.3:blood-bolt': kibblesProfile('Blood Bolt', {
    attackKind: 'ranged',
    mechanics: {
      attackRoll: true,
      ...kibblesDamage(
        [
          { formula: '1d6', type: 'piercing' },
          { formula: '1d6', type: 'necrotic' },
        ],
        0,
        [1, 1],
      ),
    },
    manual:
      'Ranged spell attack; both piercing and necrotic components increase at character levels 5, 11, and 17. Track increasing blood component cost manually.',
  }),
  'kibblestasty-casting-compendium-v2.3:blood-diagnosis': kibblesProfile('Blood Diagnosis', {
    manual:
      'Read creature type, poisoned/diseased status at sample time, blood medical information, and relationship to previously tested blood manually. No attack, healing, or condition removal.',
  }),
  'kibblestasty-casting-compendium-v2.3:blood-divination': kibblesProfile('Blood Divination', {
    manual:
      'Read current condition/type/distance/direction manually. Samples over 24 hours require spellcasting check DC 10, over a week 15, over a month 20. No target save or damage.',
  }),
  'kibblestasty-casting-compendium-v2.3:blood-frenzy': kibblesProfile('Blood Frenzy', {
    effect: ruleReminder(
      'Blood Frenzy',
      'Touch willing creature: incoming attack advantage, immunity to charmed/frightened, melee weapon attack advantage, and Constitution save against falling to zero HP. Self-targeting prevents damage concentration loss. Apply scoped defenses, roll modifiers, and survival checks manually.',
      { type: 'manual' },
      'ally',
      false,
    ),
    manual:
      'Touch willing creature: incoming attack advantage, immunity to charmed/frightened, melee weapon attack advantage, and Constitution save against falling to zero HP. Self-targeting prevents damage concentration loss. Apply scoped defenses, roll modifiers, and survival checks manually.',
  }),
  'kibblestasty-casting-compendium-v2.3:blood-slash': kibblesProfile('Blood Slash', {
    attackKind: 'ranged',
    mechanics: {
      attackRoll: true,
      ...kibblesDamage(
        [
          { formula: '2d6', type: 'slashing' },
          { formula: '2d6', type: 'necrotic' },
        ],
        1,
        [1, 0],
      ),
    },
    manual: 'Ranged spell attack. Higher slots increase only slashing by 1d6, not necrotic.',
  }),
  'kibblestasty-casting-compendium-v2.3:blood-storm': kibblesProfile('Blood Storm', {
    mechanics: {
      save: { ability: 'dex', onSave: 'half' },
      ...kibblesDamage([{ formula: '3d8', type: 'slashing' }], 2, [1]),
    },
    manual:
      'Select 15-foot-radius vortex; caster immune only when centered on self. Initial slashing +1d8 per slot above 2nd.',
  }),
  'kibblestasty-casting-compendium-v2.3:blood-transfusion': kibblesProfile('Blood Transfusion', {
    manual:
      'Touch target heals twice HP expended as component; higher slots increase consumed HP by 5 each. Apply caster HP cost and target healing manually, never damage.',
  }),
  'kibblestasty-casting-compendium-v2.3:blood-wave': kibblesProfile('Blood Wave', {
    mechanics: {
      save: { ability: 'str', onSave: 'half' },
      ...kibblesDamage(
        [
          { formula: '2d6', type: 'bludgeoning' },
          { formula: '2d6', type: 'necrotic' },
        ],
        2,
        [0, 1],
      ),
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
      'Select 15-foot cone; failed saves knock prone. Manually expand cone for eligible kills/recent corpses, up to twice original. Higher slots add 5 feet and 1d6 necrotic only.',
  }),
  'kibblestasty-casting-compendium-v2.3:bloody-burst': kibblesProfile('Bloody Burst', {
    mechanics: {
      save: { ability: 'con', onSave: 'half' },
      ...kibblesDamage([{ formula: '4d6', type: 'necrotic' }], 2, [2]),
    },
    manual:
      'Requires blood. Resolve primary Constitution save only. On failure, nearby creatures separately make Dexterity saves against 2d6 necrotic spray; no spray on primary success. Higher slots add 2d6 primary and 1d6 spray, resolved manually later.',
  }),
  'kibblestasty-casting-compendium-v2.3:boil-blood': kibblesProfile('Boil Blood', {
    mechanics: { save: { ability: 'con', onSave: 'negates' } },
    effect: ruleReminder(
      'Boil Blood',
      'Requires recent slashing/piercing damage. Initial Constitution failure overheats blood; no initial damage. Target turn starts deal 3d4 fire and difficult terrain, +2d4 per higher slot. End-turn Constitution save ends effect; later damage manual.',
      { type: 'manual' },
      'enemy',
      true,
    ),
    manual:
      'Requires recent slashing/piercing damage. Initial Constitution failure overheats blood; no initial damage. Target turn starts deal 3d4 fire and difficult terrain, +2d4 per higher slot. End-turn Constitution save ends effect; later damage manual.',
  }),
  'kibblestasty-casting-compendium-v2.3:bond-item': kibblesProfile('Bond Item', {
    manual:
      'Bond item at most 100 pounds; bonus action recalls it. Later Charisma save by holder can end spell, advantage after 1 minute possession. No initial creature save.',
  }),
  'kibblestasty-casting-compendium-v2.3:bramble-barrier': kibblesProfile('Bramble Barrier', {
    manual:
      'Create six linked bramble squares manually. Entry deals 4d4 piercing and Constitution failure sets speed zero until turn end. Clear with labor/fire, unsuitable terrain withers after 1 day, recasting destroys old patches. Higher slots add squares. No initial save/damage.',
  }),
  'kibblestasty-casting-compendium-v2.3:bramble-binding': kibblesProfile('Bramble Binding', {
    mechanics: {
      save: { ability: 'dex', onSave: 'half' },
      ...kibblesDamage([{ formula: '4d4', type: 'piercing' }], 1, [1]),
    },
    effect: ruleReminder(
      'Bramble Binding',
      'Failure, Large or smaller: cannot move until freed. Action frees safely, half movement frees with separate piercing damage.',
      { type: 'manual' },
      'enemy',
      true,
      'Until freed',
    ),
    manual:
      'Failure entangles Large or smaller: cannot move, but not Restrained. Free as action or spend half movement and take separate 2d4 piercing. Initial and escape damage +1d4 per higher slot; later escape damage/manual duration independent of Instantaneous header.',
  }),
  'kibblestasty-casting-compendium-v2.3:brilliant-blade': kibblesProfile('Brilliant Blade', {
    manual:
      'Manual Constitution save for all creatures within 20 feet: failure blinded until caster next turn end, success blinded until caster current turn end. Both outcomes need different timers; no failure-only effect.',
  }),
  'kibblestasty-casting-compendium-v2.3:burial-barrage': kibblesProfile('Burial Barrage', {
    attackKind: 'ranged',
    mechanics: {
      attackRoll: true,
      ...kibblesDamage([{ formula: '1d12+1', type: 'bludgeoning' }], 5, [0]),
    },
    manual:
      'Resolve five ranged attacks separately for 1d12+1 bludgeoning; Large or smaller hits fall prone. Against prone targets use printed advantage and ignore distant-prone disadvantage manually. One additional object per higher slot.',
  }),
  'kibblestasty-casting-compendium-v2.3:burn': kibblesProfile('Burn', {
    attackKind: 'melee',
    mechanics: { attackRoll: true, ...kibblesDamage([{ formula: '1d12', type: 'fire' }], 0, [1]) },
    manual:
      'Melee spell attack against creature or object; fire dice increase at character levels 5, 11, and 17.',
  }),
  'kibblestasty-casting-compendium-v2.3:burning-strike': kibblesProfile('Burning Strike', {
    manual:
      'Imbue weapon/ammunition for next attack. Hit adds 4d4 fire and burning; miss deals half and no burn. Light weapon permits immediate weapon attack. Burning deals later 1d4 turn-end fire until extinguished by action. Higher slots increase both by 1d4 as printed; weapon-dependent attack manual.',
  }),
  'kibblestasty-casting-compendium-v2.3:carnivorous-garden': kibblesProfile('Carnivorous Garden', {
    attackKind: 'melee',
    mechanics: {
      attackRoll: true,
      ...kibblesDamage([{ formula: '2d8', type: 'piercing' }], 4, [0]),
    },
    effect: ruleReminder(
      'Carnivorous Garden',
      'Resolve each of four plants\u2019 creation attacks separately; melee spell attack for 2d8 piercing. Keep concentration even when attacks miss. Track four terrain squares, plant HP/defenses/regeneration, later end-turn attacks and reaction prevention manually. Higher slots add plants.',
      { type: 'manual' },
      'self',
      false,
    ),
    manual:
      'Resolve each of four plants’ creation attacks separately; melee spell attack for 2d8 piercing. Keep concentration even when attacks miss. Track four terrain squares, plant HP/defenses/regeneration, later end-turn attacks and reaction prevention manually. Higher slots add plants.',
  }),
  'kibblestasty-casting-compendium-v2.3:chromatic-breath': kibblesProfile('Chromatic Breath', {
    effect: ruleReminder(
      'Chromatic Breath',
      'Touch willing breathing creature with mouth. Choose elemental type; later action uses 15-foot cone Dexterity save for 3d6, half on success, +1d6 per higher slot. No initial breath or damage.',
      { type: 'manual' },
      'ally',
      false,
    ),
    manual:
      'Touch willing breathing creature with mouth. Choose elemental type; later action uses 15-foot cone Dexterity save for 3d6, half on success, +1d6 per higher slot. No initial breath or damage.',
  }),
  'kibblestasty-casting-compendium-v2.3:chrono-conjunction': kibblesProfile('Chrono Conjunction', {
    mechanics: { save: { ability: 'cha', onSave: 'negates' } },
    manual:
      'For unwilling target resolve Charisma resistance; willing target bypasses save manually. On failure replace triggering roll with chosen 1–20 value manually; no condition. Cannot cast again for 24 hours.',
  }),
  'kibblestasty-casting-compendium-v2.3:clay-touch': kibblesProfile('Clay Touch', {
    mechanics: { save: { ability: 'dex', onSave: 'negates' } },
    effect: ruleReminder(
      'Clay Touch',
      'Creature armor option uses initial Dexterity save; failure replaces armor class with 10 plus Dexterity modifier. Object option has no save and sets armor/check DC to 5. Apply replacement manually, never additive armor modifier.',
      { type: 'manual' },
      'enemy',
      true,
    ),
    manual:
      'Creature armor option uses initial Dexterity save; failure replaces armor class with 10 plus Dexterity modifier. Object option has no save and sets armor/check DC to 5. Apply replacement manually, never additive armor modifier.',
  }),
  'kibblestasty-casting-compendium-v2.3:cold-snap': kibblesProfile('Cold Snap', {
    mechanics: {
      save: { ability: 'con', onSave: 'half' },
      ...kibblesDamage([{ formula: '3d8', type: 'cold' }], 2, [1]),
    },
    effect: ruleReminder(
      'Cold Snap',
      'Failure: speed reduced by 10 feet until caster next turn start; ice/snow terrain has same endpoint.',
      { type: 'untilSourceTurn', when: 'startOfTurn' },
      'enemy',
      true,
    ),
    manual:
      'Select creatures in 5-foot sphere. Failures lose 10 feet speed until caster next turn start; ground becomes difficult terrain until same endpoint. Track speed/terrain manually. +1d8 cold per higher slot.',
  }),
  'kibblestasty-casting-compendium-v2.3:commandment': kibblesProfile('Commandment', {
    effect: ruleReminder(
      'Commandment',
      'No initial save/damage. Target must see/hear/understand order; impossible order ends spell. Intentional violation deals 4d6 radiant at most once until caster next turn start. Track order, violations, and extra targets per higher slot manually.',
      { type: 'manual' },
      'enemy',
      true,
    ),
    manual:
      'No initial save/damage. Target must see/hear/understand order; impossible order ends spell. Intentional violation deals 4d6 radiant at most once until caster next turn start. Track order, violations, and extra targets per higher slot manually.',
  }),
  'kibblestasty-casting-compendium-v2.3:compelled-convulsion': kibblesProfile(
    'Compelled Convulsion',
    {
      mechanics: { save: { ability: 'con', onSave: 'negates' } },
      manual:
        'Requires blood. Initial Constitution failure lets caster force target reaction to move up to 15 feet and make a weapon attack. Resolve movement/weapon attack manually; higher slots add targets.',
    },
  ),
  'kibblestasty-casting-compendium-v2.3:compelled-query': kibblesProfile('Compelled Query', {
    mechanics: { save: { ability: 'int', onSave: 'negates' } },
    manual:
      'Initial Intelligence failure gives truthful thought/image answering simple question. Each subsequent query in 24 hours adds cumulative +5 to save; enter that modifier manually.',
  }),
}
