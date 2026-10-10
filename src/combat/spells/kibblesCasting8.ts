// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import type { ReviewedSpellCasting } from '../reviewedSpells.ts'
import { kibblesProfile, kibblesDamage } from './kibblesProfile.ts'
import { ruleReminder } from './reviewedProfile.ts'
import { condition } from '../effects.ts'

export const KIBBLES_CASTING_8: Record<string, ReviewedSpellCasting> = {
  'kibblestasty-casting-compendium-v2.3:rotting-curse': kibblesProfile('Rotting Curse', {
    effect: ruleReminder(
      'Rotting Curse',
      'No initial save/damage. Each damage event adds 1d4 necrotic, healing halved, disadvantage only on social Charisma checks. Apply conditional consequences manually.',
      { type: 'manual' },
      'enemy',
      true,
    ),
    manual:
      'No initial save/damage. Each damage event adds 1d4 necrotic, healing halved, disadvantage only on social Charisma checks. Apply conditional consequences manually.',
  }),
  'kibblestasty-casting-compendium-v2.3:sanctified-charge': kibblesProfile('Sanctified Charge', {
    manual:
      'Move up to 20 feet straight; only collision triggers Strength save for 2d6 radiant/prone, half/no prone on success. No unconditional target save; resolve movement and collision manually.',
  }),
  'kibblestasty-casting-compendium-v2.3:sanguine-doom': kibblesProfile('Sanguine Doom', {
    mechanics: { save: { ability: 'wis', onSave: 'negates' } },
    effect: ruleReminder(
      'Sanguine Doom',
      'Failure: next attack hit becomes critical, then doom curse ends; track independent acid damage manually.',
      { type: 'manual' },
      'enemy',
      true,
      'Until the next attack hits',
    ),
    manual:
      'Automatic 4d6 acid to eligible creatures/objects, independent of Wisdom save. Failure dooms next hit into critical then ends curse. Apply acid and lighting manually before separate curse save; no invented acid negation.',
  }),
  'kibblestasty-casting-compendium-v2.3:sanguine-spears': kibblesProfile('Sanguine Spears', {
    effect: ruleReminder(
      'Sanguine Spears',
      'Create three spears, no initial attack/healing. Later action/bonus action launches ranged spell attack for 2d6 piercing plus 2d6 necrotic and heals 5 on hit. Higher slots pay extra HP for extra spears. Track remaining spears and costs manually.',
      { type: 'manual' },
      'self',
      false,
    ),
    manual:
      'Create three spears, no initial attack/healing. Later action/bonus action launches ranged spell attack for 2d6 piercing plus 2d6 necrotic and heals 5 on hit. Higher slots pay extra HP for extra spears. Track remaining spears and costs manually.',
  }),
  'kibblestasty-casting-compendium-v2.3:seeking-orb': kibblesProfile('Seeking Orb', {
    effect: ruleReminder(
      'Seeking Orb',
      'Create orb, no initial damage. Caster turn end moves 30 feet toward target; arrival deals automatic 6d4 force then ends. Failure to arrive increases 2d4 up to 10d4; concentration ending first harmless. Track movement/growth manually.',
      { type: 'manual' },
      'self',
      false,
    ),
    manual:
      'Create orb, no initial damage. Caster turn end moves 30 feet toward target; arrival deals automatic 6d4 force then ends. Failure to arrive increases 2d4 up to 10d4; concentration ending first harmless. Track movement/growth manually.',
  }),
  'kibblestasty-casting-compendium-v2.3:seeking-projectile': kibblesProfile('Seeking Projectile', {
    manual:
      'Imbue ammunition/thrown weapon for next ranged attack. Add caster modifier to d20 face, critical if adjusted face 20+. Ends after attack; apply special roll handling manually.',
  }),
  'kibblestasty-casting-compendium-v2.3:seismic-wave': kibblesProfile('Seismic Wave', {
    mechanics: {
      save: { ability: 'str', onSave: 'half' },
      ...kibblesDamage([{ formula: '4d10', type: 'bludgeoning' }], 3, [0]),
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
      'Select grounded creatures in 30-foot cone; failures prone. Large+ objects automatically fail and take double damage. Terrain remains until cleared. Printed upcast starts at slot 3 above level 2 despite level-3 base; resolve this ambiguity manually without invented variants.',
  }),
  'kibblestasty-casting-compendium-v2.3:sense-blood': kibblesProfile('Sense Blood', {
    effect: ruleReminder(
      'Sense Blood',
      'Perception/Insight advantage only against creatures with blood. Higher slots change duration to 8/24 hours. Apply scoped checks manually.',
      { type: 'manual' },
      'self',
      false,
    ),
    manual:
      'Perception/Insight advantage only against creatures with blood. Higher slots change duration to 8/24 hours. Apply scoped checks manually.',
  }),
  'kibblestasty-casting-compendium-v2.3:shadow-bind': kibblesProfile('Shadow Bind', {
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
      'Medium or smaller initial Strength failure restrains; end-turn Strength save ends effect. Higher slots choose extra targets or increased size category. Select eligible targets manually.',
  }),
  'kibblestasty-casting-compendium-v2.3:shadow-lash': kibblesProfile('Shadow Lash', {
    attackKind: 'melee',
    mechanics: {
      attackRoll: true,
      ...kibblesDamage([{ formula: '2d4', type: 'psychic' }], 0, [2]),
    },
    manual:
      'Melee spell attack; advantage only if target in dim light/darkness, set manually. Psychic +2d4 at levels 5/11/17.',
  }),
  'kibblestasty-casting-compendium-v2.3:shattering-shield': kibblesProfile('Shattering Shield', {
    manual:
      'Reduce triggering damage by 1d8 plus casting modifier manually. Only if not fully blocked, retaliate for blocked amount as cold. Higher slots add 1d8 blocked; no initial save or fixed target damage.',
  }),
  'kibblestasty-casting-compendium-v2.3:shockwave': kibblesProfile('Shockwave', {
    mechanics: {
      save: { ability: 'str', onSave: 'half' },
      ...kibblesDamage([{ formula: '8d6', type: 'bludgeoning' }], 5, [0]),
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
      'All selected creatures within 30 feet move 5 feet regardless of save. Failed saves also prone; apply universal movement manually before resolution.',
  }),
  'kibblestasty-casting-compendium-v2.3:sky-burst': kibblesProfile('Sky Burst', {
    mechanics: {
      save: { ability: 'dex', onSave: 'half' },
      ...kibblesDamage([{ formula: '4d12+4', type: 'lightning' }], 5, [0]),
    },
    manual:
      'Five chosen bolt points; select creatures within 5 feet of any bolt, overlap once. Higher slots add bolts, not damage.',
  }),
  'kibblestasty-casting-compendium-v2.3:sonic-shriek': kibblesProfile('Sonic Shriek', {
    mechanics: {
      save: { ability: 'con', onSave: 'half' },
      ...kibblesDamage([{ formula: '6d8', type: 'thunder' }], 5, [1]),
    },
    manual:
      'Select creatures in 120-foot cone. Beyond 60 feet automatically succeeds; apply half damage manually there without rolling save. Thunder +1d8 per higher slot.',
  }),
  'kibblestasty-casting-compendium-v2.3:spatial-manipulation': kibblesProfile(
    'Spatial Manipulation',
    {
      mechanics: { save: { ability: 'cha', onSave: 'negates' } },
      manual:
        'Select pairs; unwilling creatures separately resist with Charisma save, any success prevents swap. Willing bypass saves; higher slots add pairs. Resolve pair movement manually.',
    },
  ),
  'kibblestasty-casting-compendium-v2.3:spatial-swap': kibblesProfile('Spatial Swap', {
    mechanics: { save: { ability: 'cha', onSave: 'negates' } },
    manual:
      'Swap caster/visible creature only with sufficient space. Unwilling target resists with Charisma; willing bypasses. Apply movement manually, no condition.',
  }),
  'kibblestasty-casting-compendium-v2.3:spelltrap': kibblesProfile('Spelltrap', {
    effect: ruleReminder(
      'Spelltrap',
      'Mark caster; next save against level-1-or-lower spell absorbs all effects. Can recast absorbed spell only on next turn without slot; otherwise lost. Higher slots raise absorbable spell level. No initial save or blanket immunity.',
      { type: 'manual' },
      'self',
      false,
    ),
    manual:
      'Mark caster; next save against level-1-or-lower spell absorbs all effects. Can recast absorbed spell only on next turn without slot; otherwise lost. Higher slots raise absorbable spell level. No initial save or blanket immunity.',
  }),
  'kibblestasty-casting-compendium-v2.3:spider-bite': kibblesProfile('Spider Bite', {
    attackKind: 'melee',
    mechanics: {
      attackRoll: true,
      ...kibblesDamage([{ formula: '4d12', type: 'poison' }], 3, [1]),
    },
    manual:
      'Melee spell attack. Hit then separate Constitution save against 1-minute poisoned, end-turn repeat saves. Miss allows manually maintained concentration for retry despite non-concentration header; track this special lifecycle manually. Poison +1d12 per higher slot.',
  }),
  'kibblestasty-casting-compendium-v2.3:spirit-echo': kibblesProfile('Spirit Echo', {
    effect: ruleReminder(
      'Spirit Echo',
      'First weapon attack on own turn gets separate echo attack using same modifier, force damage equal to half rolled normal weapon damage. No initial attack; weapon-dependent modifiers/damage manual.',
      { type: 'manual' },
      'self',
      false,
    ),
    manual:
      'First weapon attack on own turn gets separate echo attack using same modifier, force damage equal to half rolled normal weapon damage. No initial attack; weapon-dependent modifiers/damage manual.',
  }),
  'kibblestasty-casting-compendium-v2.3:spiritual-consultation': kibblesProfile(
    'Spiritual Consultation',
    {
      effect: ruleReminder(
        'Spiritual Consultation',
        'Choose allowed skill; treat as proficient only while spirit communicates, or spirit makes Intelligence/Wisdom check at +5. Higher slots increase spirit bonus to maximum +9. No blanket ability modifier or derived build.',
        { type: 'manual' },
        'self',
        false,
      ),
      manual:
        'Choose allowed skill; treat as proficient only while spirit communicates, or spirit makes Intelligence/Wisdom check at +5. Higher slots increase spirit bonus to maximum +9. No blanket ability modifier or derived build.',
    },
  ),
  'kibblestasty-casting-compendium-v2.3:split-timeline': kibblesProfile('Split Timeline', {
    effect: ruleReminder(
      'Split Timeline',
      'Willing target gains duplicate only at its next turn start, until that turn end/zero HP. Shared abilities/resources; higher slots extend rounds. Manage duplicate separately and target-owned timing manually; no immediate duplicate.',
      { type: 'manual' },
      'ally',
      false,
    ),
    manual:
      'Willing target gains duplicate only at its next turn start, until that turn end/zero HP. Shared abilities/resources; higher slots extend rounds. Manage duplicate separately and target-owned timing manually; no immediate duplicate.',
  }),
  'kibblestasty-casting-compendium-v2.3:sprout-tree': kibblesProfile('Sprout Tree', {
    manual:
      'Create tree on eligible ground. Manual Dexterity save: Huge+ automatically succeeds; success requires adjacent space or fails; Large or smaller may fail willingly. Failure lifts 20 feet, success moves. Track cover, tree HP/armor and growth restrictions.',
  }),
  'kibblestasty-casting-compendium-v2.3:star-dust': kibblesProfile('Star Dust', {
    manual:
      'Automatic 3d4 force in printed cone; no save/attack. Next attack against each target before caster next turn start has advantage. Apply damage and one-use advantage manually.',
  }),
  'kibblestasty-casting-compendium-v2.3:star-scry': kibblesProfile('Star Scry', {
    manual:
      'Accurate description required, cannot repeat on same target within 24 hours. Navigator’s Tools Intelligence check DC 10/15/20 by familiarity locates general region. No target save or combat consequence.',
  }),
  'kibblestasty-casting-compendium-v2.3:starfall': kibblesProfile('Starfall', {
    mechanics: {
      save: { ability: 'dex', onSave: 'half' },
      ...kibblesDamage([{ formula: '4d8', type: 'radiant' }], 4, [0]),
    },
    effect: ruleReminder(
      'Starfall',
      'Initial three stars target distinct creatures within 60 feet; each creature at most once per turn. Later caster turn starts drop one star; higher slots add initial/later stars, not per-star damage. Concentration persists even after successful initial saves.',
      { type: 'manual' },
      'self',
      false,
    ),
    persistsAfterSave: true,
    manual:
      'Initial three stars target distinct creatures within 60 feet; each creature at most once per turn. Later caster turn starts drop one star; higher slots add initial/later stars, not per-star damage. Concentration persists even after successful initial saves.',
  }),
  'kibblestasty-casting-compendium-v2.3:static-field': kibblesProfile('Static Field', {
    effect: ruleReminder(
      'Static Field',
      'No initial save/damage. Action, reaction and movement of at least 5 feet within field each trigger 1d12 lightning, each once per turn. Track per-trigger uses manually.',
      { type: 'manual' },
      'self',
      false,
    ),
    manual:
      'No initial save/damage. Action, reaction and movement of at least 5 feet within field each trigger 1d12 lightning, each once per turn. Track per-trigger uses manually.',
  }),
  'kibblestasty-casting-compendium-v2.3:stinging-swarm': kibblesProfile('Stinging Swarm', {
    effect: ruleReminder(
      'Stinging Swarm',
      'Create indestructible swarm, no initial damage. Bonus action moves it; entering creature space deals automatic 2d4 piercing plus Constitution failure 6d4 poison, then cannot move until caster next turn start. Resolve both later components manually.',
      { type: 'manual' },
      'self',
      false,
    ),
    manual:
      'Create indestructible swarm, no initial damage. Bonus action moves it; entering creature space deals automatic 2d4 piercing plus Constitution failure 6d4 poison, then cannot move until caster next turn start. Resolve both later components manually.',
  }),
  'kibblestasty-casting-compendium-v2.3:stirge-swarm': kibblesProfile('Stirge Swarm', {
    effect: ruleReminder(
      'Stirge Swarm',
      'No initial save. First entry per turn/turn start triggers Dexterity save for printed blood-drain HP loss and caster 4/2 healing. Caster/bloodless immune; movement bonus action. Distinction between untyped loss and success damage remains manual.',
      { type: 'manual' },
      'self',
      false,
    ),
    manual:
      'No initial save. First entry per turn/turn start triggers Dexterity save for printed blood-drain HP loss and caster 4/2 healing. Caster/bloodless immune; movement bonus action. Distinction between untyped loss and success damage remains manual.',
  }),
  'kibblestasty-casting-compendium-v2.3:stone-coffin': kibblesProfile('Stone Coffin', {
    mechanics: { save: { ability: 'dex', onSave: 'negates' } },
    effect: ruleReminder(
      'Stone Coffin',
      'Large or smaller initial Dexterity failure trapped, blinded/restrained and total cover. Coffin AC 15/50 HP with scoped resistance; later bonus action crushes for 1d10 bludgeoning. Destruction or spell end frees target. Slot HP increase only above 5th as printed. Manage coffin/conditions manually.',
      { type: 'manual' },
      'enemy',
      true,
    ),
    manual:
      'Large or smaller initial Dexterity failure trapped, blinded/restrained and total cover. Coffin AC 15/50 HP with scoped resistance; later bonus action crushes for 1d10 bludgeoning. Destruction or spell end frees target. Slot HP increase only above 5th as printed. Manage coffin/conditions manually.',
  }),
  'kibblestasty-casting-compendium-v2.3:stone-fist': kibblesProfile('Stone Fist', {
    attackKind: 'melee',
    mechanics: {
      attackRoll: true,
      ...kibblesDamage([{ formula: '2d10', type: 'bludgeoning' }], 1, [1]),
    },
    manual:
      'Optional creation melee spell attack for bludgeoning; may decline manually. Reaction against slashing/piercing attack grants resistance to that attack until caster next turn start. Track self benefit even on miss; initial +1d10 per higher slot.',
  }),
}
