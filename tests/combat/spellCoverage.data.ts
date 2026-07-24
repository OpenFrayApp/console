// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

/**
 * Every compendium spell we deliberately do *not* model, with why. Kept as test data
 * rather than in `src/` — it documents a decision and never ships in the bundle.
 *
 * The rule the list applies: **an effect is modelled when the spell leaves state on a
 * creature.** Area, object, terrain, summon, pure-information and instantaneous spells
 * have no combatant to hang a badge on, so they belong here.
 *
 * A new content library fails `spellCoverage.test.ts` until each of its spells is
 * either given an entry in `SPELL_EFFECTS` or added here.
 */

export const SKIP_REASONS = [
  'DAMAGE_ONLY',
  'HEALING',
  'SUMMON',
  'WALL_OR_TERRAIN',
  'OBJECT_OR_PLACE',
  'ILLUSION_OR_INFO',
  'TRAVEL',
  'NARRATIVE',
  'TRAP',
] as const

export type SkipReason = (typeof SKIP_REASONS)[number]

const skip = (reason: SkipReason, names: string[]): Record<string, SkipReason> =>
  Object.fromEntries(names.map((n) => [n, reason]))

export const NOT_MODELLED: Record<string, SkipReason> = {
  // The resolver already rolls the damage; nothing lingers on the target.
  ...skip('DAMAGE_ONLY', [
    'acid arrow',
    'acid splash',
    'blight',
    'burning hands',
    'call lightning',
    'chain lightning',
    'chill touch',
    'chromatic orb',
    'circle of death',
    'cone of cold',
    'delayed blast fireball',
    'disintegrate',
    'dissonant whispers',
    'divine smite',
    'divine word',
    'eldritch blast',
    'faithful hound',
    'finger of death',
    'fire bolt',
    'fire storm',
    'fireball',
    'flame strike',
    'flaming sphere',
    'freezing sphere',
    'guardian of faith',
    'gust of wind',
    'harm',
    'hellish rebuke',
    'ice knife',
    'ice storm',
    'inflict wounds',
    'lightning bolt',
    'magic missile',
    'meteor swarm',
    'moonbeam',
    'poison spray',
    'power word kill',
    'prismatic spray',
    'produce flame',
    'ray of frost',
    'ray of sickness',
    'sacred flame',
    'scorching ray',
    'shatter',
    'shocking grasp',
    'sorcerous burst',
    'starry wisp',
    'sunburst',
    'thunderwave',
    'vitriolic sphere',
  ]),

  // HP and condition removal are fields the GM edits, not effects to badge.
  ...skip('HEALING', [
    'create food and water',
    'cure wounds',
    'false life',
    'goodberry',
    'greater restoration',
    'heal',
    'healing word',
    'lesser restoration',
    'mass cure wounds',
    'mass heal',
    'mass healing word',
    'power word heal',
    'prayer of healing',
    'purify food and drink',
    'raise dead',
    'reincarnate',
    'resurrection',
    'revivify',
    'spare the dying',
    'true resurrection',
  ]),

  // The consequence is a new creature on the board — add it, don't badge the caster.
  ...skip('SUMMON', [
    'animate dead',
    'animate objects',
    'awaken',
    'clone',
    'conjure animals',
    'conjure celestial',
    'conjure woodland beings',
    'create undead',
    'find familiar',
    'find steed',
    'giant insect',
    'planar ally',
    'simulacrum',
    'summon dragon',
    'unseen servant',
  ]),

  // Shapes the map, not the creatures standing on it.
  ...skip('WALL_OR_TERRAIN', [
    'blade barrier',
    'control water',
    'control weather',
    'hallucinatory terrain',
    'mirage arcane',
    'move earth',
    'passwall',
    'plant growth',
    'prismatic wall',
    'reverse gravity',
    'rope trick',
    'stone shape',
    'tsunami',
    'wall of fire',
    'wall of force',
    'wall of ice',
    'wall of stone',
    'wall of thorns',
    'wind wall',
  ]),

  // Acts on an object or a place; no combatant carries it.
  ...skip('OBJECT_OR_PLACE', [
    'alarm',
    'arcane lock',
    'continual flame',
    'create or destroy water',
    'daylight',
    'demiplane',
    'druidcraft',
    'elementalism',
    'fabricate',
    'floating disk',
    'forbiddance',
    'gentle repose',
    'guards and wards',
    'hallow',
    'instant summons',
    'knock',
    'light',
    'mage hand',
    'magic mouth',
    'magnificent mansion',
    'mending',
    'message',
    'prestidigitation',
    'private sanctum',
    'secret chest',
    'teleportation circle',
    'thaumaturgy',
    'tiny hut',
  ]),

  // Returns information or paints a scene; the GM narrates the outcome.
  ...skip('ILLUSION_OR_INFO', [
    'augury',
    'commune',
    'commune with nature',
    'creation',
    'dancing lights',
    'divination',
    'find traps',
    'identify',
    'illusory script',
    'legend lore',
    'locate animals or plants',
    'major image',
    'minor illusion',
    'phantom steed',
    'programmed illusion',
    'sending',
    'silent image',
    'speak with dead',
    'speak with plants',
    'true strike',
  ]),

  // Moves someone somewhere; the board change is who is on it.
  ...skip('TRAVEL', [
    'dimension door',
    'misty step',
    'plane shift',
    'teleport',
    'transport via plants',
    'tree stride',
    'word of recall',
  ]),

  // Resolved by GM adjudication, not by board state.
  ...skip('NARRATIVE', [
    'counterspell',
    'dispel magic',
    'dream',
    'gate',
    'remove curse',
    'time stop',
    'wish',
  ]),

  // Lies dormant until triggered; nothing to track until it fires.
  ...skip('TRAP', ['glyph of warding', 'symbol']),
}
