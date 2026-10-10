// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import type { ReviewedSpellCasting } from '../reviewedSpells.ts'
import { sourceProfile, ruleReminder } from './reviewedProfile.ts'
import { condition, reminder } from '../effects.ts'

export const SPELLS_THAT_DONT_SUCK_3: Record<string, ReviewedSpellCasting> = {
  'somanyrobots-spells-that-dont-suck:false-foes': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'False Foes',
    {
      mechanics: { save: { ability: 'int', onSave: 'negates' } },
      effect: ruleReminder(
        'False Foes',
        'Everyone treated as enemy; mandatory opportunity attacks. Damage triggers Intelligence escape saves.',
        { type: 'manual' },
        'enemy',
        false,
      ),
      manual:
        'Select creature; fear immunity automatically succeeds, no Frightened condition applied. Failure treats everyone as enemies and must opportunity attack when provoked. Damage triggers Intelligence escape saves; alliances and reactions manual.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:fated-strike': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Fated Strike',
    {
      effect: ruleReminder(
        'Fated Strike',
        'Next attack before caster next turn end automatically hits; clear after use. Higher slots add uses, no guaranteed critical.',
        { type: 'manual' },
        'ally',
        false,
      ),
      manual:
        'Touch willing creature; next attack before caster next turn end automatically hits. No initial attack, numerical to-hit modifier, or guaranteed critical. Clear after use; higher slots grant more hits per two levels above 1st.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:fearsome-visage': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Fearsome Visage',
    {
      mechanics: { save: { ability: 'wis', onSave: 'negates' } },
      effect: {
        summary:
          'Frightened of caster; end-turn Wisdom escape, advantage only if more than 90 feet away.',
        targeting: 'enemy',
        multi: true,
        build: ({ source }) => [
          condition('Frightened', { source, duration: { type: 'rounds', rounds: 10 } }),
          reminder(
            'Fearsome Visage',
            'Frightened of caster; end-turn Wisdom escape, advantage only if more than 90 feet away.',
            { source, duration: { type: 'rounds', rounds: 10 } },
          ),
        ],
      },
      manual:
        'Select visible creature; failure Frightened of caster. End-turn Wisdom escape manual; over 90 feet grants advantage only on escape saves. Higher slots add targets.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:fiery-blade': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Fiery Blade',
    {
      effect: ruleReminder(
        'Fiery Blade',
        'Fiery finesse/light/thrown weapon: 2d6 fire, flammable target 1d6 turn-start fire until action douse. Bonus action reforms dropped/thrown blade.',
        { type: 'manual' },
        'self',
        false,
      ),
      manual:
        'Create simple finesse/light/thrown fiery weapon, not an initial spell attack. Later weapon hit 2d6 fire; flammable targets ignite for 1d6 turn-start fire until action douse. Dropped/thrown blade dissipates turn end; bonus action reforms. Higher slots scale both dice per two levels.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:fiery-quiver': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Fiery Quiver',
    {
      effect: ruleReminder(
        'Fiery Quiver',
        'Six ammunition uses, +2d6 fire on hit; one piece affected at a time. Ends on uses exhausted/recast.',
        { type: 'manual' },
        'ally',
        false,
      ),
      manual:
        'Touch quiver; later ammunition +2d6 fire on hit, only one affected piece at a time, ends after six used or recast. Track ammunition counter manually; higher slots add pieces, not damage. No initial attack/damage.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:find-in-nature': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Find in Nature',
    {
      manual:
        'Name/describe beast or plant; learn direction/distance to closest within 1 mile. Higher slots extend range. No save, damage, creature condition, or automatic map search.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:fireblast': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Fireblast',
    {
      mechanics: {
        save: { ability: 'dex', onSave: 'half' },
        damage: [{ formula: '7d6', type: 'fire' }],
        scaling: [
          { by: 'slot', level: 4, damage: [{ formula: '8d6', type: 'fire' }] },
          { by: 'slot', level: 5, damage: [{ formula: '9d6', type: 'fire' }] },
          { by: 'slot', level: 6, damage: [{ formula: '10d6', type: 'fire' }] },
          { by: 'slot', level: 7, damage: [{ formula: '11d6', type: 'fire' }] },
          { by: 'slot', level: 8, damage: [{ formula: '12d6', type: 'fire' }] },
          { by: 'slot', level: 9, damage: [{ formula: '13d6', type: 'fire' }] },
        ],
      },
      manual:
        'Select creatures within 20 feet of chosen point. Blast spreads around corners; ignite unworn/uncarried objects manually. +1d6 fire per slot above 3rd.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:fleeting-portals': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Fleeting Portals',
    {
      manual:
        'Manual linked 10-foot portals at two visible unoccupied ground points; choose usable sides. Bonus action close/open/move 60 feet. Ends beyond 500 feet from original caster location. No initial save/damage or automatic relocation.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:flickering-strikes': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Flickering Strikes',
    {
      manual:
        'Manual melee weapon attacks against up to five targets, each hit weapon damage plus 6d6 force. Spell attack bonus cannot substitute for weapon statistics. Teleport to final eligible space manually; no generic spell-attack resolver.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:force-weapon': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Force Weapon',
    {
      effect: ruleReminder(
        'Force Weapon',
        'Touched weapon +1 attack, +1d4 force on hits and optional light; bonus applies only to chosen weapon.',
        { type: 'manual' },
        'ally',
        false,
      ),
      manual:
        'Touch weapon: magical, +1 attack and +1d4 force on hits. Track weapon-only bonus, optional light and restoration manually; no global attack bonus or initial attack. Slots 4+/6+ change attack bonus and force die.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:form-of-fire': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Form of Fire',
    {
      effect: ruleReminder(
        'Form of Fire',
        'Fire immunity, terrain/space bypass, entry/melee retaliation 2d6 fire. Later action line Dexterity 6d6/half; one own-turn fire die maximized.',
        { type: 'manual' },
        'self',
        false,
      ),
      manual:
        'No initial save/damage. Track fire immunity, space entry/melee retaliation 2d6 fire, terrain bypass and light. Later action line Dexterity 6d6 fire/half; maximize one fire die on caster turn only. Apply defenses manually and restore at concentration end.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:form-of-ice': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Form of Ice',
    {
      effect: ruleReminder(
        'Form of Ice',
        'Cold immunity, ice/snow bypass, moving icy terrain aura. Later cone Constitution 4d8/half and failed half speed; own-turn cold die temporary HP.',
        { type: 'manual' },
        'self',
        false,
      ),
      manual:
        'No initial save/damage. Track cold immunity, ice/snow terrain bypass and moving icy difficult terrain aura. Later action cone Constitution 4d8 cold/half, failure half speed until caster next turn start. On own-turn cold roll gain chosen die temporary HP manually.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:form-of-stone': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Form of Stone',
    {
      effect: ruleReminder(
        'Form of Stone',
        'Nonmagical physical resistance and earth/stone movement. End movement inside solid material: eject/end/Stunned. Later spikes Dexterity 4d8 piercing/half.',
        { type: 'manual' },
        'self',
        false,
      ),
      manual:
        'No initial save/damage. Track nonmagical physical resistance and earth/stone movement; ending within solid material ejects, ends spell and Stuns until own next turn end. Later action spikes Dexterity 4d8 piercing/half with difficult terrain on both outcomes. Defenses manual.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:form-of-water': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Form of Water',
    {
      effect: ruleReminder(
        'Form of Water',
        'Nonmagical physical resistance, terrain/space bypass. Moving through eligible creature Strength against Prone. Later line Strength 5d6/half and failure Prone.',
        { type: 'manual' },
        'self',
        false,
      ),
      manual:
        'No initial save/damage. Track nonmagical physical resistance, terrain bypass, movement-through Large or smaller Strength save against Prone. Later action line Strength 5d6 bludgeoning/half and failure Prone. Restore defenses when concentration ends.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:form-of-wind': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Form of Wind',
    {
      effect: {
        summary:
          'Invisible, flying speed 60, terrain/space bypass; later action cone Strength 4d8 bludgeoning/half and failure push 15 feet.',
        targeting: 'self',
        multi: false,
        build: ({ source }) => [
          condition('Invisible', { source, duration: { type: 'rounds', rounds: 100 } }),
          reminder(
            'Form of Wind',
            'Invisible, flying speed 60, terrain/space bypass; later action cone Strength 4d8 bludgeoning/half and failure push 15 feet.',
            { source, duration: { type: 'rounds', rounds: 100 } },
          ),
        ],
      },
      manual:
        'Initially Invisible; track flying speed 60 and terrain/space bypass manually. Later action cone Strength 4d8 bludgeoning/half with failure push 15 feet; no initial blast. Remove flight and invisibility when concentration ends.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:fortune': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Fortune',
    {
      manual:
        'Manually reroll triggering d20 and use higher result, including original result. No initial attack/save or persistent advantage; reaction applies only to triggering roll.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:frost-shuriken': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Frost Shuriken',
    {
      mechanics: {
        attackRoll: true,
        damage: [
          { formula: '1d4', type: 'piercing' },
          { formula: '2d8', type: 'cold' },
        ],
        scaling: [
          {
            by: 'slot',
            level: 2,
            damage: [
              { formula: '1d4', type: 'piercing' },
              { formula: '3d8', type: 'cold' },
            ],
          },
          {
            by: 'slot',
            level: 3,
            damage: [
              { formula: '1d4', type: 'piercing' },
              { formula: '4d8', type: 'cold' },
            ],
          },
          {
            by: 'slot',
            level: 4,
            damage: [
              { formula: '1d4', type: 'piercing' },
              { formula: '5d8', type: 'cold' },
            ],
          },
          {
            by: 'slot',
            level: 5,
            damage: [
              { formula: '1d4', type: 'piercing' },
              { formula: '6d8', type: 'cold' },
            ],
          },
          {
            by: 'slot',
            level: 6,
            damage: [
              { formula: '1d4', type: 'piercing' },
              { formula: '7d8', type: 'cold' },
            ],
          },
          {
            by: 'slot',
            level: 7,
            damage: [
              { formula: '1d4', type: 'piercing' },
              { formula: '8d8', type: 'cold' },
            ],
          },
          {
            by: 'slot',
            level: 8,
            damage: [
              { formula: '1d4', type: 'piercing' },
              { formula: '9d8', type: 'cold' },
            ],
          },
          {
            by: 'slot',
            level: 9,
            damage: [
              { formula: '1d4', type: 'piercing' },
              { formula: '10d8', type: 'cold' },
            ],
          },
        ],
      },
      manual:
        'Primary ranged spell attack: 1d4 piercing plus 2d8 cold on hit. Hit or miss, other creatures within 5 feet separately Dexterity save to negate 2d8 cold manually; exclude primary from explosion. Higher slots add 1d8 cold to both instances.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:ghost-lights': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Ghost Lights',
    {
      manual:
        'Manual up to four dim lights, 15-foot radius each. Bonus action moves/extinguishes lights 60 feet; keep each within 30 feet of another and within range. Recasting removes old lights. No initial save/damage.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:ghost-touch': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Ghost Touch',
    {
      mechanics: {
        attackRoll: true,
        damage: [{ formula: '1d8', type: 'necrotic' }],
        scaling: [
          { by: 'character', level: 5, damage: [{ formula: '2d8', type: 'necrotic' }] },
          { by: 'character', level: 11, damage: [{ formula: '3d8', type: 'necrotic' }] },
          { by: 'character', level: 17, damage: [{ formula: '4d8', type: 'necrotic' }] },
        ],
      },
      effect: ruleReminder(
        'Ghost Touch',
        'No healing until caster next turn start. Undead hit: attack disadvantage only against caster until caster next turn end.',
        { type: 'untilSourceTurn', when: 'endOfTurn' },
        'enemy',
        false,
      ),
      manual:
        'Choose creature. Hit prevents healing until caster next turn start; undead hit additionally have attack disadvantage only against caster until caster next turn end. Manage different timers/relationship manually. Cantrip scaling at 5/11/17.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:glacial-orbs': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Glacial Orbs',
    {
      effect: ruleReminder(
        'Glacial Orbs',
        'Five shareable/throwable orbs; later impact Dexterity 3d8 cold/half and failure half speed until target next turn end. Remaining orbs evaporate at concentration end.',
        { type: 'manual' },
        'self',
        false,
      ),
      manual:
        'Create five throwable/shareable orbs. No initial save/damage. Each later impact explodes 15-foot radius: Dexterity 3d8 cold/half, failure half speed until target next turn end. Orbs evaporate when concentration ends; higher slots add orbs.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:glyph-of-power': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Glyph of Power',
    {
      manual:
        'Manual fixed glyph, trigger/exemptions/password and Investigation detection. No initial save/damage. On later trigger choose Weakness/Binding/Death/Bafflement/Rage/Stupor with distinct saves/outcomes, including death drop-to-zero versus success damage. Destroying glyph ends it; do not combine modes.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:grave-call': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Grave Call',
    {
      manual:
        'Manual Wisdom save to negate 1d8 necrotic, or 1d12 if target below half HP. Existing resolver has no cast-time HP-dependent damage choice; use printed die based on actual HP. Cantrip scaling increases number of selected dice at 5/11/17.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:great-wave': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Great Wave',
    {
      persistsAfterSave: true,
      mechanics: {
        save: { ability: 'str', onSave: 'half' },
        damage: [{ formula: '6d10', type: 'bludgeoning' }],
      },
      manual:
        'Select initial creatures in wave only: Strength 6d10/half. Wave persists on success. Later caster turn starts move wave/occupants 50 feet, Huge or smaller Strength save to negate declining 5d10, once per round. Height and duration depend on casting rounds; swimming check/fall/manual timers.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:hailstorm': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Hailstorm',
    {
      effect: ruleReminder(
        'Hailstorm',
        'Turn-start Dexterity 5d4 bludgeoning plus 5d4 cold/half in storm; difficult terrain. No creation damage.',
        { type: 'manual' },
        'self',
        false,
      ),
      manual:
        'No initial save/damage. Creature turn start within 20-foot radius/40-foot cylinder: Dexterity 5d4 bludgeoning plus 5d4 cold/half. Area difficult terrain; track 1-round storm and higher-slot dice/dimensions manually.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:hallucination': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Hallucination',
    {
      effect: ruleReminder(
        'Hallucination',
        'Target perceives phantasm; no damage/conditions. Action Investigation escape, advantage if able to touch. Bonus action changes illusion.',
        { type: 'manual' },
        'enemy',
        false,
      ),
      manual:
        'Choose visible non-undead/non-construct creature; no initial save or damage/condition. Phantasm is believed until action Investigation check succeeds, with advantage if close enough to touch. Bonus action adjusts phantasm; no invented psychic damage.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:holy-fire': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Holy Fire',
    {
      manual:
        'Manual choice of 8d8 fire, 8d8 radiant, or 4d8 each before Dexterity saves, half on success. Targets gain no cover benefit. Existing single profile cannot select types safely. Higher slots add 2d8 or 1d8 each per two levels above 5th.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:imbue-element': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Imbue Element',
    {
      effect: ruleReminder(
        'Imbue Element',
        'Chosen weapon elemental base type/+1d6 hits; once-per-round type rider, including acid delay and lightning reaction denial.',
        { type: 'manual' },
        'ally',
        false,
      ),
      manual:
        'Touch melee weapon; choose acid/cold/fire/lightning and replace base type, add 1d6 hit damage. Once per round type-specific rider: acid delay, cold half speed, fire extra damage, lightning no reactions. No initial save/damage; weapon modifiers and higher-slot bonus manual.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:impaling-spires': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Impaling Spires',
    {
      mechanics: {
        save: { ability: 'dex', onSave: 'half' },
        damage: [{ formula: '5d10', type: 'piercing' }],
      },
      manual:
        'Select creatures above spikes on creation; damage only once per creature. Restrained eligibility depends on size and spike count, applied manually. Track ceiling collision extra 2d10, disadvantage to escape, Athletics/Acrobatics action escape, AC 11/30 HP spikes, fall and destruction. Spikes last 1 hour; higher slots add spikes.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:incinerate': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Incinerate',
    {
      effect: ruleReminder(
        'Incinerate',
        'Target turn-start Dexterity 10d6 fire, success half and ends for target. Bonus action spreads within 10 feet. Zero HP becomes ash.',
        { type: 'manual' },
        'enemy',
        false,
      ),
      manual:
        'No initial save/damage. At target turn start Dexterity 10d6 fire, success half and ends for target; failure continues. Bonus action spreads to creature within 10 feet of affected target. Zero HP becomes ash. Track light, targets and concentration manually.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:inflict-disease': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Inflict Disease',
    {
      attackKind: 'melee',
      mechanics: { attackRoll: true },
      effect: {
        summary:
          'Chosen magical disease; end-turn Constitution success suppresses effects until next turn end. Three successes cure, three failures set for 7 days.',
        targeting: 'enemy',
        multi: false,
        build: ({ source }) => [
          {
            ...reminder(
              'Inflict Disease',
              'Chosen magical disease; end-turn Constitution success suppresses effects until next turn end. Three successes cure, three failures set for 7 days.',
              { source, duration: { type: 'manual' } },
            ),
            durationNote: 'Until cured; may set for 7 days',
          },
        ],
      },
      manual:
        'Initial melee spell attack has no immediate damage or initial save. On hit choose disease manually, excluding constructs/undead/disease immunity. Later Constitution saves suppress effects on success; track three successes to cure or three failures to set for 7 days. Conditional ability/attack penalties and Fire-eyes Blinded depend on chosen disease.',
    },
  ),
}
