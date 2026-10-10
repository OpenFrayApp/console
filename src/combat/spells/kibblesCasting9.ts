// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import type { ReviewedSpellCasting } from '../reviewedSpells.ts'
import { kibblesProfile, kibblesDamage } from './kibblesProfile.ts'
import { ruleReminder } from './reviewedProfile.ts'

export const KIBBLES_CASTING_9: Record<string, ReviewedSpellCasting> = {
  'kibblestasty-casting-compendium-v2.3:stone-forming': kibblesProfile('Stone Forming', {
    manual:
      'Shape Small/Tiny stone item or encase limbs for 1d8 bludgeoning unarmed strikes. Maximum three items/effects; fourth removes oldest durability. No initial attack or automatic weapon proficiency model.',
  }),
  'kibblestasty-casting-compendium-v2.3:stone-pillar': kibblesProfile('Stone Pillar', {
    mechanics: { save: { ability: 'dex', onSave: 'negates' } },
    manual:
      'Create pillar only on eligible ground, not under Large+ creature. Medium or smaller Dexterity failure lifted; ceiling collision separately deals 3d8 bludgeoning and restraint with action skill escape. Track pillar HP/armor/rubble manually; no unconditional collision damage.',
  }),
  'kibblestasty-casting-compendium-v2.3:storm-shot': kibblesProfile('Storm Shot', {
    manual:
      'Imbue ammunition/thrown weapon. First weapon hit adds 4d8 lightning, miss half. Both outcomes trigger nearby Strength saves for 2d8 lightning/20-foot launch, half/no launch on success. Weapon attack, secondary save and falling damage manual.',
  }),
  'kibblestasty-casting-compendium-v2.3:sudden-hazards': kibblesProfile('Sudden Hazards', {
    effect: ruleReminder(
      'Sudden Hazards',
      'No initial save/damage. Chosen targets in cube move half speed safely or take 1d8 psychic per 5 feet at normal speed. Turn-end Dexterity saves for 5d8 psychic plus separate Wisdom save to disbelieve. Track independent later checks manually.',
      { type: 'manual' },
      'self',
      false,
    ),
    manual:
      'No initial save/damage. Chosen targets in cube move half speed safely or take 1d8 psychic per 5 feet at normal speed. Turn-end Dexterity saves for 5d8 psychic plus separate Wisdom save to disbelieve. Track independent later checks manually.',
  }),
  'kibblestasty-casting-compendium-v2.3:suffocate': kibblesProfile('Suffocate', {
    manual:
      'Breathing required. Constitution failure loses untyped 5d8 HP and blocks speech/impairs checks; success described as half damage. Three consecutive failures incapacitate. Later action repeats save; no action allows automatic success at target next turn end. HP loss/damage ambiguity and lifecycle manual.',
  }),
  'kibblestasty-casting-compendium-v2.3:summon-archon': kibblesProfile('Summon Archon', {
    effect: ruleReminder(
      'Summon Archon',
      'Choose Hound/Lantern/Trumpet Archon Spirit and add separate combatant with printed slot-dependent stats. Acts after caster, obeys commands or Dodges; ends at zero HP/spell end. Trumpet save/temporary HP and other attacks happen on summon turn, not casting.',
      { type: 'manual' },
      'self',
      false,
    ),
    manual:
      'Choose Hound/Lantern/Trumpet Archon Spirit and add separate combatant with printed slot-dependent stats. Acts after caster, obeys commands or Dodges; ends at zero HP/spell end. Trumpet save/temporary HP and other attacks happen on summon turn, not casting.',
  }),
  'kibblestasty-casting-compendium-v2.3:summon-dragon': kibblesProfile('Summon Dragon', {
    effect: ruleReminder(
      'Summon Dragon',
      'Choose dragon color and add Dragon Spirit with printed slot-dependent stats, elemental immunity/breath. Acts after caster; no-command Dodge, zero HP/spell end removes. Printed breath table and action save conflict for some colors; resolve ambiguity manually. No initial breath attack.',
      { type: 'manual' },
      'self',
      false,
    ),
    manual:
      'Choose dragon color and add Dragon Spirit with printed slot-dependent stats, elemental immunity/breath. Acts after caster; no-command Dodge, zero HP/spell end removes. Printed breath table and action save conflict for some colors; resolve ambiguity manually. No initial breath attack.',
  }),
  'kibblestasty-casting-compendium-v2.3:summon-monstrosity': kibblesProfile('Summon Monstrosity', {
    effect: ruleReminder(
      'Summon Monstrosity',
      'Choose Blinker/Burrower/Displacer Monstrosity Spirit; add separate combatant with printed slot stats and subtype powers. Printed occupied-space placement remains GM decision. Acts after caster, Dodges without command; zero HP/spell end removes. No initial attack.',
      { type: 'manual' },
      'self',
      false,
    ),
    manual:
      'Choose Blinker/Burrower/Displacer Monstrosity Spirit; add separate combatant with printed slot stats and subtype powers. Printed occupied-space placement remains GM decision. Acts after caster, Dodges without command; zero HP/spell end removes. No initial attack.',
  }),
  'kibblestasty-casting-compendium-v2.3:summon-ooze': kibblesProfile('Summon Ooze', {
    effect: ruleReminder(
      'Summon Ooze',
      'Choose Green/Red/Yellow Ooze Spirit; add separate combatant with printed stats, immunities and defenses. Resolve printed ability modifier discrepancies manually. Acts after caster, Dodges without command; zero HP/spell end removes. No initial pseudopod attack.',
      { type: 'manual' },
      'self',
      false,
    ),
    manual:
      'Choose Green/Red/Yellow Ooze Spirit; add separate combatant with printed stats, immunities and defenses. Resolve printed ability modifier discrepancies manually. Acts after caster, Dodges without command; zero HP/spell end removes. No initial pseudopod attack.',
  }),
  'kibblestasty-casting-compendium-v2.3:summon-plant': kibblesProfile('Summon Plant', {
    effect: ruleReminder(
      'Summon Plant',
      'Choose Dryad/Shambling Mound/Treant Plant Spirit; add separate combatant with printed slot stats, subtype movement and grapple/engulf powers. Acts after caster, Dodges without commands; zero HP/spell end removes. No initial attack/grapple.',
      { type: 'manual' },
      'self',
      false,
    ),
    manual:
      'Choose Dryad/Shambling Mound/Treant Plant Spirit; add separate combatant with printed slot stats, subtype movement and grapple/engulf powers. Acts after caster, Dodges without commands; zero HP/spell end removes. No initial attack/grapple.',
  }),
  'kibblestasty-casting-compendium-v2.3:summon-swarm': kibblesProfile('Summon Swarm', {
    effect: ruleReminder(
      'Summon Swarm',
      'Choose Quippers/Spiders/Wasps Swarm Spirit; add separate combatant with printed slot stats and subtype speeds/attacks. Swarm cannot heal/gain temporary HP. Acts after caster, Dodges without command; zero HP/spell end removes. No initial attack.',
      { type: 'manual' },
      'self',
      false,
    ),
    manual:
      'Choose Quippers/Spiders/Wasps Swarm Spirit; add separate combatant with printed slot stats and subtype speeds/attacks. Swarm cannot heal/gain temporary HP. Acts after caster, Dodges without command; zero HP/spell end removes. No initial attack.',
  }),
  'kibblestasty-casting-compendium-v2.3:supernova': kibblesProfile('Supernova', {
    mechanics: {
      save: { ability: 'con', onSave: 'half' },
      ...kibblesDamage([{ formula: '30d8', type: 'radiant' }], 9, [0]),
    },
    effect: ruleReminder(
      'Supernova',
      'Initial Constitution save within 60 feet: failure blinded for 1 minute. End-turn Constitution saves can end blindness early; track timer and repeats manually.',
      { type: 'rounds', rounds: 10 },
      'enemy',
      true,
    ),
    manual:
      'Initial Constitution save within 60 feet: failure blinded for 1 minute. End-turn Constitution saves can end blindness early; track timer and repeats manually.',
  }),
  'kibblestasty-casting-compendium-v2.3:swapping-curse': kibblesProfile('Swapping Curse', {
    effect: ruleReminder(
      'Swapping Curse',
      'Both targets must fail Charisma saves, willing failure allowed, to swap souls. Body statistics/spellcasting, 1d4-turn disadvantage, end-turn escape advantage by relative CR/level, death reversion and 5d10 necrotic all manual. No single-target automatic control.',
      { type: 'manual' },
      'self',
      false,
    ),
    manual:
      'Both targets must fail Charisma saves, willing failure allowed, to swap souls. Body statistics/spellcasting, 1d4-turn disadvantage, end-turn escape advantage by relative CR/level, death reversion and 5d10 necrotic all manual. No single-target automatic control.',
  }),
  'kibblestasty-casting-compendium-v2.3:thunder-note': kibblesProfile('Thunder Note', {
    mechanics: {
      save: { ability: 'con', onSave: 'negates' },
      ...kibblesDamage([{ formula: '1d8', type: 'thunder' }], 0, [1]),
    },
    manual:
      'Failed save deafens until target next turn start; disadvantage only on concentration save caused by this damage. Track target timer and scoped disadvantage manually. Thunder +1d8 at levels 5/11/17.',
  }),
  'kibblestasty-casting-compendium-v2.3:thunder-pulse': kibblesProfile('Thunder Pulse', {
    mechanics: {
      save: { ability: 'con', onSave: 'half' },
      ...kibblesDamage([{ formula: '3d8', type: 'thunder' }], 3, [1]),
    },
    effect: ruleReminder(
      'Thunder Pulse',
      'Initial Constitution saves in 15-foot cone; failures pushed 10 feet. Later actions create new waves while concentrating, even after all initial saves succeed. Thunder +1d8 per slot above 3rd.',
      { type: 'manual' },
      'self',
      false,
    ),
    persistsAfterSave: true,
    manual:
      'Initial Constitution saves in 15-foot cone; failures pushed 10 feet. Later actions create new waves while concentrating, even after all initial saves succeed. Thunder +1d8 per slot above 3rd.',
  }),
  'kibblestasty-casting-compendium-v2.3:thunder-punch': kibblesProfile('Thunder Punch', {
    attackKind: 'melee',
    mechanics: {
      attackRoll: true,
      ...kibblesDamage([{ formula: '3d8', type: 'thunder' }], 1, [1]),
    },
    manual:
      'Melee spell attack; hit pushes 10 feet manually and audible boom out to 300 feet. Thunder +1d8 per higher slot.',
  }),
  'kibblestasty-casting-compendium-v2.3:thunderburst-mine': kibblesProfile('Thunderburst Mine', {
    manual:
      'Set object trap, no initial save/damage. Proximity/movement/keyed command detonates Constitution save for 3d8 thunder, half on success; extra mines same turn half damage. Track separation, command, disarm manually.',
  }),
  'kibblestasty-casting-compendium-v2.3:time-anchor': kibblesProfile('Time Anchor', {
    manual:
      'Anchor one object; activate to recall its original state even if consumed/destroyed. Current object vanishes. Cannot anchor same object twice; replacement removes previous anchor. Temporal object state manual.',
  }),
  'kibblestasty-casting-compendium-v2.3:time-bubble': kibblesProfile('Time Bubble', {
    manual:
      'Interrupt initiative for all creatures wholly inside bubble to take extra turn in initiative order, then resume current turn. Boundary attacks miss/spells fail; exit ends extra turn. Slot 9 gives two rounds. Initiative interruption and boundary effects manual.',
  }),
  'kibblestasty-casting-compendium-v2.3:time-loop': kibblesProfile('Time Loop', {
    mechanics: { save: { ability: 'wis', onSave: 'negates' } },
    effect: ruleReminder(
      'Time Loop',
      'Initial Wisdom failure compels repeating last turn as possible, avoiding obvious dangerous ground. Caster chooses precedence for conflicts. Track actions/movement and target next turn manually; no general action control.',
      { type: 'manual' },
      'enemy',
      true,
    ),
    manual:
      'Initial Wisdom failure compels repeating last turn as possible, avoiding obvious dangerous ground. Caster chooses precedence for conflicts. Track actions/movement and target next turn manually; no general action control.',
  }),
  'kibblestasty-casting-compendium-v2.3:time-skip': kibblesProfile('Time Skip', {
    effect: ruleReminder(
      'Time Skip',
      'Willing touched target vanishes until its next turn start, reappearing at same/nearest space. Higher slots add rounds; slot 9 lasts 24 hours. Target-owned timing and removal/reappearance manual.',
      { type: 'manual' },
      'ally',
      false,
    ),
    manual:
      'Willing touched target vanishes until its next turn start, reappearing at same/nearest space. Higher slots add rounds; slot 9 lasts 24 hours. Target-owned timing and removal/reappearance manual.',
  }),
  'kibblestasty-casting-compendium-v2.3:time-slip': kibblesProfile('Time Slip', {
    effect: ruleReminder(
      'Time Slip',
      '+2 armor class during concentration. Reaction can negate attack damage or failed save against level-2-or-lower spell, then ends spell; higher slots raise level cap. Apply defense/reversion manually.',
      { type: 'manual' },
      'self',
      false,
    ),
    manual:
      '+2 armor class during concentration. Reaction can negate attack damage or failed save against level-2-or-lower spell, then ends spell; higher slots raise level cap. Apply defense/reversion manually.',
  }),
  'kibblestasty-casting-compendium-v2.3:time-trap': kibblesProfile('Time Trap', {
    manual:
      'Trap empty cube; no initial save. First entry Wisdom failure stuns wholly contained creature or restrains partially contained, success halves speed. All end at target next turn start. Track detection, single trigger and different outcomes manually.',
  }),
  'kibblestasty-casting-compendium-v2.3:tornado': kibblesProfile('Tornado', {
    effect: ruleReminder(
      'Tornado',
      'No initial save/damage. Turn-start Strength save for 4d8 bludgeoning and random launch/falling, half/no launch on success. Bonus-action movement; ranged attacks through automatically miss, nearby ranged weapon attacks disadvantage. Apply geometric rules manually.',
      { type: 'manual' },
      'self',
      false,
    ),
    manual:
      'No initial save/damage. Turn-start Strength save for 4d8 bludgeoning and random launch/falling, half/no launch on success. Bonus-action movement; ranged attacks through automatically miss, nearby ranged weapon attacks disadvantage. Apply geometric rules manually.',
  }),
  'kibblestasty-casting-compendium-v2.3:tranquil-moment': kibblesProfile('Tranquil Moment', {
    manual:
      'Bonus action permits normally-action Wisdom/Intelligence check and ignores disadvantage only from time/pressure. Make check manually; no target save or universal advantage.',
  }),
  'kibblestasty-casting-compendium-v2.3:twisting-eruption': kibblesProfile('Twisting Eruption', {
    mechanics: { save: { ability: 'dex', onSave: 'negates' } },
    effect: ruleReminder(
      'Twisting Eruption',
      'Select chosen creatures in 60-foot radius for initial Dexterity restraint. Later restrained turn starts take 2d10 bludgeoning plus 2d10 necrotic, caster heals 1d4 per necrotic damage event. Action skill escape or tendril destruction frees; later turn ends recheck restraint. Track tendril defenses and healing manually; creation persists on successes.',
      { type: 'manual' },
      'self',
      false,
    ),
    persistsAfterSave: true,
    manual:
      'Select chosen creatures in 60-foot radius for initial Dexterity restraint. Later restrained turn starts take 2d10 bludgeoning plus 2d10 necrotic, caster heals 1d4 per necrotic damage event. Action skill escape or tendril destruction frees; later turn ends recheck restraint. Track tendril defenses and healing manually; creation persists on successes.',
  }),
  'kibblestasty-casting-compendium-v2.3:unburden': kibblesProfile('Unburden', {
    effect: ruleReminder(
      'Unburden',
      'Touch creature; ignore medium/heavy armor speed/Stealth penalties and double encumbrance capacity. Apply only these penalties manually; no blanket Dexterity modifier.',
      { type: 'manual' },
      'ally',
      false,
    ),
    manual:
      'Touch creature; ignore medium/heavy armor speed/Stealth penalties and double encumbrance capacity. Apply only these penalties manually; no blanket Dexterity modifier.',
  }),
  'kibblestasty-casting-compendium-v2.3:unholy-wave': kibblesProfile('Unholy Wave', {
    mechanics: {
      save: { ability: 'con', onSave: 'half' },
      ...kibblesDamage([{ formula: '4d6', type: 'necrotic' }], 2, [1]),
    },
    effect: ruleReminder(
      'Unholy Wave',
      'Initial Constitution failure wreathes black fire; later attack hit adds 1d6 necrotic once per turn. Initial necrotic +1d6 per higher slot; later rider unchanged.',
      { type: 'manual' },
      'enemy',
      true,
    ),
    manual:
      'Initial Constitution failure wreathes black fire; later attack hit adds 1d6 necrotic once per turn. Initial necrotic +1d6 per higher slot; later rider unchanged.',
  }),
  'kibblestasty-casting-compendium-v2.3:unlocked-potential': kibblesProfile('Unlocked Potential', {
    effect: ruleReminder(
      'Unlocked Potential',
      'Once per turn add 1d4 to chosen attack/damage/save then take 1 psychic. Apply choice and cost manually, not unconditional bonus to every roll.',
      { type: 'manual' },
      'ally',
      false,
    ),
    manual:
      'Once per turn add 1d4 to chosen attack/damage/save then take 1 psychic. Apply choice and cost manually, not unconditional bonus to every roll.',
  }),
  'kibblestasty-casting-compendium-v2.3:unstable-explosion': kibblesProfile('Unstable Explosion', {
    mechanics: { save: { ability: 'dex', onSave: 'half' } },
    manual:
      'Roll exploding d6 pool manually; each 6 adds a die and 5 feet radius before targets selected. Dexterity save halves actual total fire. Higher slots add base dice; no fixed damage/radius profile.',
  }),
}
