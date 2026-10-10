// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import type { ReviewedSpellCasting } from '../reviewedSpells.ts'
import { kibblesProfile, kibblesDamage } from './kibblesProfile.ts'
import { ruleReminder } from './reviewedProfile.ts'
import { condition } from '../effects.ts'

export const KIBBLES_CASTING_4: Record<string, ReviewedSpellCasting> = {
  'kibblestasty-casting-compendium-v2.3:electric-arc': kibblesProfile('Electric Arc', {
    attackKind: 'ranged',
    mechanics: {
      attackRoll: true,
      ...kibblesDamage([{ formula: '1d8', type: 'lightning' }], 0, [1]),
    },
    manual:
      'Resolve primary ranged attack for lightning. Only on hit, arc to another creature within 15 feet using same attack roll against its armor class for separate 1d4 lightning. Primary +1d8 and secondary +1d4 at character levels 5/11/17; secondary target/damage manual.',
  }),
  'kibblestasty-casting-compendium-v2.3:electrify': kibblesProfile('Electrify', {
    effect: ruleReminder(
      'Electrify',
      'Next melee hit before caster next turn start adds 1d12 lightning and then Constitution save against stunned until target next turn start. Ends on damage or caster next turn start. No initial attack/save or premature damage.',
      { type: 'untilSourceTurn', when: 'startOfTurn' },
      'self',
      false,
    ),
    manual:
      'Next melee hit before caster next turn start adds 1d12 lightning and then Constitution save against stunned until target next turn start. Ends on damage or caster next turn start. No initial attack/save or premature damage.',
  }),
  'kibblestasty-casting-compendium-v2.3:electrocute': kibblesProfile('Electrocute', {
    mechanics: {
      save: { ability: 'con', onSave: 'half' },
      ...kibblesDamage([{ formula: '4d12', type: 'lightning' }], 3, [1]),
    },
    effect: {
      summary: 'Stunned',
      targeting: 'enemy',
      multi: true,
      build: ({ source }) => [
        condition('Stunned', {
          source: source,
          duration: { type: 'untilSourceTurn', when: 'startOfTurn' },
        }),
      ],
    },
    manual:
      'Initial Constitution failure stuns until caster next turn start. Lightning +1d12 per higher slot.',
  }),
  'kibblestasty-casting-compendium-v2.3:elemental-barrage': kibblesProfile('Elemental Barrage', {
    manual:
      'Infuse ammunition until caster next turn start. Firing creates three separate weapon attacks of fire/cold/lightning types using normal weapon damage. No spell attacks or initial damage.',
  }),
  'kibblestasty-casting-compendium-v2.3:elemental-exhalation': kibblesProfile(
    'Elemental Exhalation',
    {
      mechanics: { save: { ability: 'dex', onSave: 'half' } },
      manual:
        'Requires breathing and uncovered mouth. Choose elemental type manually; 20-foot cone Dexterity save for 3d8 chosen type, half on success, +1d8 per higher slot. No fixed damage type.',
    },
  ),
  'kibblestasty-casting-compendium-v2.3:elemental-orb': kibblesProfile('Elemental Orb', {
    attackKind: 'ranged',
    mechanics: { attackRoll: true },
    manual:
      'Choose acid/cold/fire/lightning/poison manually, then ranged spell attack for 3d8 chosen type, +1d8 per higher slot. Attack-only resolver does not roll chosen-type damage.',
  }),
  'kibblestasty-casting-compendium-v2.3:entomb': kibblesProfile('Entomb', {
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
      'Medium or smaller only. Initial Strength failure restrains; end-turn 1d8 cold then Strength save to escape. Single instance of 5 fire/bludgeoning breaks ice. Higher slots increase later cold only; no initial damage.',
  }),
  'kibblestasty-casting-compendium-v2.3:erode': kibblesProfile('Erode', {
    mechanics: {
      save: { ability: 'dex', onSave: 'half' },
      ...kibblesDamage([{ formula: '8d4', type: 'acid' }], 3, [1]),
    },
    effect: ruleReminder(
      'Erode',
      'Failure: covered in acid until an action clears it; separate acid damage at each target turn end.',
      { type: 'manual' },
      'enemy',
      true,
      'Until acid is cleared',
    ),
    manual:
      'Initial Dexterity failure covers target in acid until action clears it. Separate 2d4 acid at each target turn end; both initial and later +1d4 per higher slot. Object handling, later damage, and indefinite consequence duration manual.',
  }),
  'kibblestasty-casting-compendium-v2.3:ethereal-immolation': kibblesProfile(
    'Ethereal Immolation',
    {
      effect: ruleReminder(
        'Ethereal Immolation',
        'No initial damage/save. Target casting spell takes 2d4 force plus 1d4 per spell level; concentrating at turn end adds 1d4 force. Resolve conditional later damage manually.',
        { type: 'manual' },
        'enemy',
        true,
      ),
      manual:
        'No initial damage/save. Target casting spell takes 2d4 force plus 1d4 per spell level; concentrating at turn end adds 1d4 force. Resolve conditional later damage manually.',
    },
  ),
  'kibblestasty-casting-compendium-v2.3:explode-heart': kibblesProfile('Explode Heart', {
    manual:
      'Heart required. Under 20 HP dies automatically; above 20 uses Constitution save for 10d6 necrotic and failure stunned until caster next turn start. Printed exactly-20-HP case unspecified. Apply threshold, conditional save, lethal effect, and stun manually.',
  }),
  'kibblestasty-casting-compendium-v2.3:explosive-deflection': kibblesProfile(
    'Explosive Deflection',
    {
      manual:
        'Roll 2d6 damage reduction manually; only if melee attack reduced to zero does excess become thunder against attacker. Increase 1d6 per slot above 2nd as printed, not above 1st. No initial target save.',
    },
  ),
  'kibblestasty-casting-compendium-v2.3:expunge-poison': kibblesProfile('Expunge Poison', {
    manual:
      'Willing creature just poisoned takes 5 necrotic and loses poisoned condition manually. No save or healing.',
  }),
  'kibblestasty-casting-compendium-v2.3:exsanguinate': kibblesProfile('Exsanguinate', {
    manual:
      'Requires blood. Constitution save controls untyped current/maximum HP reduction, not damage. Extra 6d6 current loss below half HP applies regardless of result. Maximum reduction ends after long rest/Greater Restoration; higher slots change failed-save reduction. Resolve HP reductions manually.',
  }),
  'kibblestasty-casting-compendium-v2.3:eyes-of-immolation': kibblesProfile('Eyes of Immolation', {
    mechanics: {
      save: { ability: 'dex', onSave: 'half' },
      ...kibblesDamage([{ formula: '3d6', type: 'fire' }], 1, [1]),
    },
    effect: ruleReminder(
      'Eyes of Immolation',
      'Failure: ablaze until an action douses flames; roll 1d6 later turn-end damage manually.',
      { type: 'manual' },
      'enemy',
      true,
      'Until flames are doused',
    ),
    manual:
      'Failed initial save sets ablaze; target turn-end 1d6 later damage until action douses it. Initial fire +1d6 per higher slot; later burning unchanged. No premature later damage.',
  }),
  'kibblestasty-casting-compendium-v2.3:fall': kibblesProfile('Fall', {
    effect: ruleReminder(
      'Fall',
      'Reorient gravity only until current turn end, falling up to 500 feet. Apply collisions/falling damage, holding objects and surface movement manually.',
      { type: 'untilSourceTurn', when: 'endOfTurn' },
      'self',
      false,
    ),
    manual:
      'Reorient gravity only until current turn end, falling up to 500 feet. Apply collisions/falling damage, holding objects and surface movement manually.',
  }),
  'kibblestasty-casting-compendium-v2.3:field-of-stars': kibblesProfile('Field of Stars', {
    effect: ruleReminder(
      'Field of Stars',
      'Create five luminous motes, no initial damage. Movement within 5 feet or nearby turn end detonates 4d12 radiant; simultaneous overlap damages once. Action rearrangement never detonates. Higher slots add mote/range; track positions and later automatic damage manually.',
      { type: 'manual' },
      'self',
      false,
    ),
    manual:
      'Create five luminous motes, no initial damage. Movement within 5 feet or nearby turn end detonates 4d12 radiant; simultaneous overlap damages once. Action rearrangement never detonates. Higher slots add mote/range; track positions and later automatic damage manually.',
  }),
  'kibblestasty-casting-compendium-v2.3:final-flame': kibblesProfile('Final Flame', {
    effect: ruleReminder(
      'Final Flame',
      'Place dormant ember, no initial damage/healing. Zero HP or carrier bonus action triggers Dexterity saves within 20 feet for 8d6 radiant and carrier 8d6 healing. Resolve trigger and healing manually.',
      { type: 'manual' },
      'ally',
      false,
    ),
    manual:
      'Place dormant ember, no initial damage/healing. Zero HP or carrier bonus action triggers Dexterity saves within 20 feet for 8d6 radiant and carrier 8d6 healing. Resolve trigger and healing manually.',
  }),
  'kibblestasty-casting-compendium-v2.3:fire-cyclone': kibblesProfile('Fire Cyclone', {
    mechanics: {
      save: { ability: 'str', onSave: 'half' },
      ...kibblesDamage([{ formula: '3d6', type: 'fire' }], 3, [1]),
    },
    effect: ruleReminder(
      'Fire Cyclone',
      'Initial Strength save in cylinder; failures fling in random direction and may suffer falling damage manually. Concentration persists on successes. Later entry repeats save; outside movement away costs extra, action moves cyclone. Higher slots increase fire and height.',
      { type: 'manual' },
      'self',
      false,
    ),
    persistsAfterSave: true,
    manual:
      'Initial Strength save in cylinder; failures fling in random direction and may suffer falling damage manually. Concentration persists on successes. Later entry repeats save; outside movement away costs extra, action moves cyclone. Higher slots increase fire and height.',
  }),
  'kibblestasty-casting-compendium-v2.3:fireburst-mine': kibblesProfile('Fireburst Mine', {
    manual:
      'Set object trap manually; no initial save/damage. Proximity, movement or keyed command detonates Dexterity save for 5d8 fire, half on success. Additional mines in same turn deal half damage; track placement, command and disarm.',
  }),
  'kibblestasty-casting-compendium-v2.3:fissure': kibblesProfile('Fissure', {
    mechanics: {
      save: { ability: 'dex', onSave: 'negates' },
      ...kibblesDamage([{ formula: '6d10', type: 'bludgeoning' }], 5, [0]),
    },
    effect: ruleReminder(
      'Fissure',
      'Failure: buried until dug out; separate 1d10 bludgeoning at turn end while buried. Track expiry manually.',
      { type: 'manual' },
      'enemy',
      true,
    ),
    manual:
      'Requires suitable ground at least 10 feet deep. Initial Dexterity failure buries in rubble; 25 feet movement digs free without burrowing speed. Later buried turn-end 1d10 bludgeoning separate. No invented Restrained.',
  }),
  'kibblestasty-casting-compendium-v2.3:fists-of-fire': kibblesProfile('Fists of Fire', {
    effect: ruleReminder(
      'Fists of Fire',
      'Hands become light simple natural weapons for 1d6 fire; held flammables ignite. Later turn-end grapple deals 1d4 fire, +1d4 at levels 5/11/17. No initial spell attack; apply weapon and grapple rules manually.',
      { type: 'manual' },
      'self',
      false,
    ),
    manual:
      'Hands become light simple natural weapons for 1d6 fire; held flammables ignite. Later turn-end grapple deals 1d4 fire, +1d4 at levels 5/11/17. No initial spell attack; apply weapon and grapple rules manually.',
  }),
  'kibblestasty-casting-compendium-v2.3:flamethrower': kibblesProfile('Flamethrower', {
    mechanics: {
      save: { ability: 'dex', onSave: 'half' },
      ...kibblesDamage([{ formula: '4d6', type: 'fire' }], 3, [1]),
    },
    effect: ruleReminder(
      'Flamethrower',
      'Select 30-by-10-foot line for initial Dexterity saves. Entry before caster next turn start repeats effect; subsequent actions create new lines. Concentration persists after successes. Fire +1d6 per higher slot; later damage manual.',
      { type: 'manual' },
      'self',
      false,
    ),
    persistsAfterSave: true,
    manual:
      'Select 30-by-10-foot line for initial Dexterity saves. Entry before caster next turn start repeats effect; subsequent actions create new lines. Concentration persists after successes. Fire +1d6 per higher slot; later damage manual.',
  }),
  'kibblestasty-casting-compendium-v2.3:flash-freeze': kibblesProfile('Flash Freeze', {
    mechanics: {
      save: { ability: 'con', onSave: 'half' },
      ...kibblesDamage([{ formula: '4d8', type: 'cold' }], 3, [1]),
    },
    effect: {
      summary: 'Restrained',
      targeting: 'enemy',
      multi: true,
      build: ({ source }) => [
        condition('Restrained', {
          source: source,
          duration: { type: 'untilSourceTurn', when: 'startOfTurn' },
        }),
      ],
    },
    manual:
      'Select 30-foot cone; failed initial saves restrain until caster next turn start. Cold +1d8 per higher slot.',
  }),
  'kibblestasty-casting-compendium-v2.3:flicker': kibblesProfile('Flicker', {
    effect: ruleReminder(
      'Flicker',
      'Until caster next turn start, including triggering damage: d4 result 2 grants resistance to that instance, 4 prevents it. Roll and apply per-instance defense manually; no permanent resistance.',
      { type: 'untilSourceTurn', when: 'startOfTurn' },
      'self',
      false,
    ),
    manual:
      'Until caster next turn start, including triggering damage: d4 result 2 grants resistance to that instance, 4 prevents it. Roll and apply per-instance defense manually; no permanent resistance.',
  }),
  'kibblestasty-casting-compendium-v2.3:flickering-strikes': kibblesProfile('Flickering Strikes', {
    manual:
      'Teleport and make up to five melee weapon attacks, normal weapon damage plus 6d6 force on each hit. Then teleport near a target. Not spell attacks; weapon-dependent damage and movement manual.',
  }),
  'kibblestasty-casting-compendium-v2.3:fling': kibblesProfile('Fling', {
    mechanics: { save: { ability: 'str', onSave: 'negates' } },
    manual:
      'Large or smaller initial Strength failure permits 40-foot upward or 20-foot other fling. Direction determines 4d6 falling or 2d6 damage and prone; early collision causes 3d6 bludgeoning to both. Resolve directional damage manually.',
  }),
  'kibblestasty-casting-compendium-v2.3:force-blade': kibblesProfile('Force Blade', {
    effect: ruleReminder(
      'Force Blade',
      'Create blade, no initial damage. Later action automatically deals 2d12 plus casting modifier force to one or two adjacent creatures, no save/attack. Higher slots change dice to 3d12 or 4d12. Resolve later actions manually.',
      { type: 'manual' },
      'self',
      false,
    ),
    manual:
      'Create blade, no initial damage. Later action automatically deals 2d12 plus casting modifier force to one or two adjacent creatures, no save/attack. Higher slots change dice to 3d12 or 4d12. Resolve later actions manually.',
  }),
  'kibblestasty-casting-compendium-v2.3:force-bolt': kibblesProfile('Force Bolt', {
    attackKind: 'ranged',
    mechanics: { attackRoll: true, ...kibblesDamage([{ formula: '2d4', type: 'force' }], 0, [2]) },
    manual:
      'Ranged spell attack against creature/object. Force dice +2d4 at character levels 5/11/17.',
  }),
  'kibblestasty-casting-compendium-v2.3:form-of-familiar': kibblesProfile('Form of Familiar', {
    effect: ruleReminder(
      'Form of Familiar',
      'Transform into contributing familiar, replace statistics except alignment/mental scores, record original HP/gear and overflow. Ends on zero HP/death or action reversion; no speech/spells/equipment benefits. Apply transformation manually.',
      { type: 'manual' },
      'self',
      false,
    ),
    manual:
      'Transform into contributing familiar, replace statistics except alignment/mental scores, record original HP/gear and overflow. Ends on zero HP/death or action reversion; no speech/spells/equipment benefits. Apply transformation manually.',
  }),
  'kibblestasty-casting-compendium-v2.3:form-of-fire': kibblesProfile('Form of Fire', {
    effect: ruleReminder(
      'Form of Fire',
      'Fire form grants fire immunity, movement through creatures/terrain, first-entry and melee-hit 2d6 fire, later action 6d6 fire line Dexterity save, and one maximized fire die on own turn. No initial attack/damage; track form, light and later triggers manually.',
      { type: 'manual' },
      'self',
      false,
    ),
    manual:
      'Fire form grants fire immunity, movement through creatures/terrain, first-entry and melee-hit 2d6 fire, later action 6d6 fire line Dexterity save, and one maximized fire die on own turn. No initial attack/damage; track form, light and later triggers manually.',
  }),
}
