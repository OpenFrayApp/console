// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import type { ReviewedSpellCasting } from '../reviewedSpells.ts'
import { sourceProfile, ruleReminder } from './reviewedProfile.ts'
import { condition, reminder } from '../effects.ts'

export const SPELLS_THAT_DONT_SUCK_6: Record<string, ReviewedSpellCasting> = {
  'somanyrobots-spells-that-dont-suck:spell-glyph': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Spell Glyph',
    {
      manual:
        'Manual stored-spell glyph, prepared spell/material constraints, trigger/exemptions/password and Investigation detection. No initial creature save/damage. Triggered stored concentration spell lasts full duration without caster concentration; destruction ends. Higher slots raise stored level/cost.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:spirit-remnant': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Spirit Remnant',
    {
      manual:
        'Choose eligible speaking non-undead corpse, not targeted in past ten days. Manually answer up to five questions from prior-life knowledge, cannot lie/refuse. No initial save/damage or resurrection.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:spreadshot': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Spreadshot',
    {
      manual:
        'Manual single ranged weapon attack roll against cone targets, 4d8 component-type damage on hit and half on miss. Weapon attack bonus, shared attack roll and miss damage cannot be a generic ranged spell attack. Higher slots +1d8.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:stinging-insects': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Stinging Insects',
    {
      mechanics: {
        save: { ability: 'con', onSave: 'negates' },
        damage: [
          { formula: '1d4', type: 'piercing' },
          { formula: '1d4', type: 'poison' },
        ],
        scaling: [
          {
            by: 'character',
            level: 5,
            damage: [
              { formula: '2d4', type: 'piercing' },
              { formula: '2d4', type: 'poison' },
            ],
          },
          {
            by: 'character',
            level: 11,
            damage: [
              { formula: '3d4', type: 'piercing' },
              { formula: '3d4', type: 'poison' },
            ],
          },
          {
            by: 'character',
            level: 17,
            damage: [
              { formula: '4d4', type: 'piercing' },
              { formula: '4d4', type: 'poison' },
            ],
          },
        ],
      },
      manual:
        'Choose visible creature. Failure moves 5 feet chosen direction avoiding obvious danger, manually. Both damage components scale together at caster levels 5/11/17; no damage/move on success.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:stone-pact': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Stone Pact',
    {
      manual:
        'Choose Stone Meld, Stone Armor or Stone Step. Meld eligible willing creatures with stone before next round end, Armor 10 temporary HP and nonmagical resistance while remaining, Step grounded Prone/forced-move immunity. Different forms and defenses require manual selection; no initial save/damage.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:stormcloud': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Stormcloud',
    {
      effect: ruleReminder(
        'Stormcloud',
        'Moving storm terrain/obscuration/Deafened. Later bonus-action lightning attack then area Constitution thunder save, regardless of attack hit.',
        { type: 'manual' },
        'self',
        false,
      ),
      manual:
        'No initial attack/save/damage. Moving storm is difficult terrain/lightly obscured and Deafened only inside. Later bonus-action lightning attack 2d12, advantage only inside, then area Constitution 4d8 thunder/half regardless of attack outcome. Higher slots scale separately per two levels.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:stream-of-flame': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Stream of Flame',
    {
      mechanics: {
        save: { ability: 'dex', onSave: 'half' },
        damage: [{ formula: '4d8', type: 'fire' }],
        scaling: [
          { by: 'slot', level: 3, damage: [{ formula: '5d8', type: 'fire' }] },
          { by: 'slot', level: 4, damage: [{ formula: '6d8', type: 'fire' }] },
          { by: 'slot', level: 5, damage: [{ formula: '7d8', type: 'fire' }] },
          { by: 'slot', level: 6, damage: [{ formula: '8d8', type: 'fire' }] },
          { by: 'slot', level: 7, damage: [{ formula: '9d8', type: 'fire' }] },
          { by: 'slot', level: 8, damage: [{ formula: '10d8', type: 'fire' }] },
          { by: 'slot', level: 9, damage: [{ formula: '11d8', type: 'fire' }] },
        ],
      },
      manual:
        'Select creatures in 30-by-5-foot line; ignite unworn/uncarried flammables manually. +1d8 damage and +5 feet line length per higher slot.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:summon-animal-spirit': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Summon Animal Spirit',
    {
      manual:
        'Manually add printed Earth/Sea/Sky Animal Spirit with slot-dependent statistics and attacks, turn after caster, verbal commands or Dodge/avoid hazards. Conditional Pack Tactics/Blood in Water and Flyby manual. No initial attack/save; remove when concentration ends or 0 HP.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:summon-golem': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Summon Golem',
    {
      manual:
        'Manually add Flesh/Stone/Iron Golem Spirit with slot-dependent statistics/attacks, turn after caster, verbal commands or Dodge. Track berserk below half HP, turn-end loss if no attack, Stone once-turn slowing saves, Iron poison and form immunities. No initial attack/save.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:summon-grave-spirit': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Summon Grave Spirit',
    {
      manual:
        'Manually add Ethereal/Ghoulish/Bone Grave Spirit with slot-dependent statistics, turn after caster, commands or Dodge. Track movement through objects, fear saves, poisoned-versus-paralyzed claws and conditional Bone revival. No initial attack/save; concentration/0 HP rules per form.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:symbol-of-resilience': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Symbol of Resilience',
    {
      effect: ruleReminder(
        'Symbol of Resilience',
        'Eligible living allies in symbol radius: Wisdom advantage, death-save modifier, maximum healing and once-only bonus-action Hit Die spending.',
        { type: 'manual' },
        'self',
        false,
      ),
      manual:
        'No initial heal/save. Track movable symbol and eligible non-hostile living creatures within 30 feet: Wisdom save advantage, casting modifier to death saves with special 20 rule, maximum healing. First turn start bonus-action Hit Die spending and below-half extra temporary HP manual; higher slots add Hit Dice.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:synaptic-shockwave': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Synaptic Shockwave',
    {
      mechanics: {
        save: { ability: 'int', onSave: 'half' },
        damage: [{ formula: '10d8', type: 'psychic' }],
      },
      effect: {
        summary:
          'Stunned; end-turn Intelligence loss then save using original score plus total reduction. Intelligence 0 dies; ability loss persists after stun.',
        targeting: 'enemy',
        multi: true,
        build: ({ source }) => [
          {
            ...condition('Stunned', { source, duration: { type: 'manual' } }),
            durationNote: 'Until escape save or Intelligence reaches 0',
          },
          {
            ...reminder(
              'Synaptic Shockwave',
              'Stunned; end-turn Intelligence loss then save using original score plus total reduction. Intelligence 0 dies; ability loss persists after stun.',
              { source, duration: { type: 'manual' } },
            ),
            durationNote: 'Until escape save or Intelligence reaches 0',
          },
        ],
      },
      manual:
        'Select creatures in 60-foot cone. Failure Stunned with no fixed round expiry. Later end turns lose 1d6 Intelligence then save using original score plus total reduction; zero Intelligence dies. Ability loss persists after stun ends; restoration/long-rest recovery manual.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:synaptic-spear': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Synaptic Spear',
    {
      mechanics: {
        save: { ability: 'int', onSave: 'half' },
        damage: [{ formula: '6d8', type: 'psychic' }],
        scaling: [
          { by: 'slot', level: 5, damage: [{ formula: '7d8', type: 'psychic' }] },
          { by: 'slot', level: 6, damage: [{ formula: '8d8', type: 'psychic' }] },
          { by: 'slot', level: 7, damage: [{ formula: '9d8', type: 'psychic' }] },
          { by: 'slot', level: 8, damage: [{ formula: '10d8', type: 'psychic' }] },
          { by: 'slot', level: 9, damage: [{ formula: '11d8', type: 'psychic' }] },
        ],
      },
      effect: {
        summary: 'Blinded and Deafened until caster next turn end.',
        targeting: 'enemy',
        multi: false,
        build: ({ source }) => [
          condition('Blinded', {
            source,
            duration: { type: 'untilSourceTurn', when: 'endOfTurn' },
          }),
          condition('Deafened', {
            source,
            duration: { type: 'untilSourceTurn', when: 'endOfTurn' },
          }),
          reminder('Synaptic Spear', 'Blinded and Deafened until caster next turn end.', {
            source,
            duration: { type: 'untilSourceTurn', when: 'endOfTurn' },
          }),
        ],
      },
      manual:
        'Choose one creature. Failure Blinded and Deafened until caster next turn end; successful save has no conditions. +1d8 psychic per higher slot.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:tempest': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Tempest',
    {
      effect: ruleReminder(
        'Tempest',
        'Turn-start thunder saves; later actions add storm effects, accumulating until concentration ends. No creation damage.',
        { type: 'manual' },
        'self',
        false,
      ),
      manual:
        'No initial save/damage. Turn-start Constitution failure 4d8 thunder/Deafened through target next turn start. Actions add persistent Lightning/Downpour/Hurricane/Hailstorm or repeatable Expansion. Later attacks/saves, movement/visibility, concentration-save disadvantage and accumulations manual.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:thought-wisp': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Thought Wisp',
    {
      manual:
        'Manually create Tiny thought object; choose permitted readers. Later action receives/disperses it, ending spell; thought-reading casters may access and Modify Memory may affect it. No initial attack/save or creature condition.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:thunder-burst': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Thunder Burst',
    {
      mechanics: {
        save: { ability: 'con', onSave: 'negates' },
        damage: [{ formula: '1d8', type: 'thunder' }],
        scaling: [
          { by: 'character', level: 5, damage: [{ formula: '2d8', type: 'thunder' }] },
          { by: 'character', level: 11, damage: [{ formula: '3d8', type: 'thunder' }] },
          { by: 'character', level: 17, damage: [{ formula: '4d8', type: 'thunder' }] },
        ],
      },
      effect: {
        summary: 'Deafened until end of affected creature next turn.',
        targeting: 'enemy',
        multi: true,
        build: ({ source, target }) => [
          condition('Deafened', {
            source: target?.combatantId ?? source,
            duration: target ? { type: 'untilSourceTurn', when: 'endOfTurn' } : { type: 'manual' },
          }),
          reminder('Thunder Burst', 'Deafened until end of affected creature next turn.', {
            source: target?.combatantId ?? source,
            duration: target ? { type: 'untilSourceTurn', when: 'endOfTurn' } : { type: 'manual' },
          }),
        ],
      },
      manual:
        'Select other creatures within 5 feet. Failure Deafened until target next turn end. Audible 300 feet; damage scales at caster levels 5/11/17.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:touch-of-filth': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Touch of Filth',
    {
      attackKind: 'melee',
      mechanics: {
        attackRoll: true,
        damage: [{ formula: '1d6', type: 'poison' }],
        scaling: [
          { by: 'slot', level: 3, damage: [{ formula: '2d6', type: 'poison' }] },
          { by: 'slot', level: 4, damage: [{ formula: '3d6', type: 'poison' }] },
          { by: 'slot', level: 5, damage: [{ formula: '4d6', type: 'poison' }] },
          { by: 'slot', level: 6, damage: [{ formula: '5d6', type: 'poison' }] },
          { by: 'slot', level: 7, damage: [{ formula: '6d6', type: 'poison' }] },
          { by: 'slot', level: 8, damage: [{ formula: '7d6', type: 'poison' }] },
          { by: 'slot', level: 9, damage: [{ formula: '8d6', type: 'poison' }] },
        ],
      },
      effect: {
        summary:
          'Poisoned on hit; end-turn Constitution escape saves, later action attacks manual.',
        targeting: 'enemy',
        multi: false,
        build: ({ source }) => [
          condition('Poisoned', { source, duration: { type: 'rounds', rounds: 10 } }),
          reminder(
            'Touch of Filth',
            'Poisoned on hit; end-turn Constitution escape saves, later action attacks manual.',
            { source, duration: { type: 'rounds', rounds: 10 } },
          ),
        ],
      },
      manual:
        'Initial melee spell attack: hit 1d6 poison and Poisoned. Later end-turn Constitution escape saves manual, and later action attacks handled separately. No initial save or later damage at casting; +1d6 poison per higher slot.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:twister': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Twister',
    {
      manual:
        'No initial save/damage. Start turn/entry on own turn Strength failure 10d6 bludgeoning; Large or smaller also Restrained/carried up. End-turn escape hurls 60 feet random direction. Track lift, movement, obscure area and automatic ranged misses; no invented half damage on success.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:unbridled-fury': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Unbridled Fury',
    {
      mechanics: { save: { ability: 'wis', onSave: 'negates' } },
      effect: {
        summary:
          'Charmed; activated rage causes later turn-start approach/attack nearest creature. End-turn Wisdom escape.',
        targeting: 'enemy',
        multi: false,
        build: ({ source }) => [
          condition('Charmed', { source, duration: { type: 'rounds', rounds: 10 } }),
          reminder(
            'Unbridled Fury',
            'Charmed; activated rage causes later turn-start approach/attack nearest creature. End-turn Wisdom escape.',
            { source, duration: { type: 'rounds', rounds: 10 } },
          ),
        ],
      },
      manual:
        'Select visible humanoid. Failure Charmed. Choose to activate rage on casting/later action; target later moves toward nearest creature and melee attacks, otherwise normal turn. End-turn Wisdom escape manual; slots 4+ may grant two attacks only if creature supports it.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:unearth-legend': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Unearth Legend',
    {
      manual:
        'Manual lore request to otherworldly entity; notebook records up to seven days of research. Knowledge/speed depend on prior information and entity, no initial save/damage or guaranteed exhaustive facts.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:unerring-sentry': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Unerring Sentry',
    {
      effect: ruleReminder(
        'Unerring Sentry',
        'Alarm sentry; later action melee 4d8 force attack or autonomous end-turn attack if caster unable to direct. Range/recast/dismissal limits.',
        { type: 'manual' },
        'self',
        false,
      ),
      manual:
        'No initial attack/save. Manually place sentry/designate allies and track invisible-to-others alarm detection, range/recast/dismissal ending. Later action moves 30 feet and melee spell attack 4d8 force; incapacitated caster triggers autonomous end-turn attack, not initial attack.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:wall-of-dust': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Wall of Dust',
    {
      effect: ruleReminder(
        'Wall of Dust',
        'Inside wall Blinded/Deafened; later entry/start Strength sets movement cost 6 or 3 feet per foot.',
        { type: 'manual' },
        'self',
        false,
      ),
      manual:
        'No initial save/damage. Manual wall geometry/line-of-sight and Blinded/Deafened while within. Entry/start turn Strength determines 6 versus 3 movement feet per foot; success still costly. Remove when concentration ends.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:warding-sigil': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Warding Sigil',
    {
      effect: ruleReminder(
        'Warding Sigil',
        'Separate 4-HP ward with physical resistance absorbs damage; overflow to caster at ward 0. Not temporary HP.',
        { type: 'manual' },
        'self',
        false,
      ),
      manual:
        'Manual separate ward with 4 HP and physical resistance. Ward absorbs damage, remaining damage spills to caster and ends spell at 0. This is not temporary HP or blanket caster resistance. Higher slots add 2d4 ward HP.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:water-wall': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Water Wall',
    {
      effect: ruleReminder(
        'Water Wall',
        'Later own-turn entry/start Strength 2d6 bludgeoning/half; ranged/fire/cold/lightning interactions manual.',
        { type: 'manual' },
        'self',
        false,
      ),
      manual:
        'No initial save/damage. Later own-turn entry/start Strength 2d6 bludgeoning/half. Manual wall movement cost, ranged disadvantage/half damage and fire/cold/lightning interactions; no blanket creature defense mutation.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:wayfinding': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Wayfinding',
    {
      manual:
        'Manual same-plane location and chosen Dowsing/Ascertainment/Forecast, switch as action. Shortest route ignores safety; moving destination to different plane fails. No initial save/damage or encounter condition.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:wellspring': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Wellspring',
    {
      effect: ruleReminder(
        'Wellspring',
        'Optional heal one pooled creature 2d4; pool depletes until caster turn start. Track availability, no automatic initial healing.',
        { type: 'manual' },
        'self',
        false,
      ),
      manual:
        'Manually place healing pool. Optional heal one creature in pool 2d4 at any time, depletes until caster turn start. No unconditional initial heal; track pool availability, position, higher-slot healing/radius.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:whirling-blades': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Whirling Blades',
    {
      effect: ruleReminder(
        'Whirling Blades',
        'Later entry/start automatic 4d4 slashing. Later action piercing attack/half on miss ends spell.',
        { type: 'manual' },
        'self',
        false,
      ),
      manual:
        'No initial save/damage. First entry/turn start 4d4 slashing automatically. Later action ranged spell attack 4d4 piercing/half on miss then ends spell. Miss-damage branch manual, no invented save. Higher slots +2d4.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:whirling-water': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Whirling Water',
    {
      effect: ruleReminder(
        'Whirling Water',
        'Later entry/start Strength against Restrained; target start-turn escape. Rolling/hurl/collision saves and damage manual; spell-end Prone.',
        { type: 'manual' },
        'self',
        false,
      ),
      manual:
        'No initial save/damage. Later own-turn entry/start Strength against Restrained; Huge-or-smaller partially within advantage, Gargantuan auto succeeds. Target turn-start escape, rolling collisions, hurling and secondary Dexterity damage manual. Spell end makes formerly restrained creatures Prone and douses fires.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:whirlpool': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Whirlpool',
    {
      effect: ruleReminder(
        'Whirlpool',
        'Later own-turn entry/start Strength failure 5d8 bludgeoning/pull 10 feet; no success damage. Existing water adds 1d8.',
        { type: 'manual' },
        'self',
        false,
      ),
      manual:
        'No initial save/damage. Own-turn entry/start Strength failure 5d8 bludgeoning and pull 10 feet; no half damage on success printed. Existing water adds 1d8, higher slots +1d8. Area difficult terrain; later saves/movement manual.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:withering-field': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Withering Field',
    {
      mechanics: {
        save: { ability: 'con', onSave: 'half' },
        damage: [{ formula: '12d8', type: 'necrotic' }],
      },
      effect: {
        summary:
          'Half speed and attack/check disadvantage until target next turn end. Zero HP under effect crumbles to dust.',
        targeting: 'enemy',
        multi: true,
        build: ({ source, target }) => [
          reminder(
            'Withering Field',
            'Half speed and attack/check disadvantage until target next turn end. Zero HP under effect crumbles to dust.',
            {
              source: target?.combatantId ?? source,
              duration: target
                ? { type: 'untilSourceTurn', when: 'endOfTurn' }
                : { type: 'manual' },
            },
          ),
        ],
      },
      manual:
        'Select creatures in 30-foot cube; constructs/undead auto succeed, plants disadvantage. Failure half speed and attack/check disadvantage until target next turn end, applied manually with target-owned timing. Zero HP under effect crumbles to dust.',
    },
  ),
}
