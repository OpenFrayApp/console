// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import type { Ability } from '../../schema/primitives.ts'
import { condition, flatBonus, modifierEffect, reminder } from '../effects.ts'
import {
  CONSUME,
  MANUAL,
  dexModifier,
  is2024,
  timedDuration,
  type SpellEffectTable,
} from './shared.ts'

/**
 * Spells whose consequence lands on the caster or an ally. Notes are the badge text
 * on the combatant row, so they stay short; a condition effect carries no note at all
 * (the condition name is the label, and it hovers to the rules text). A spell that
 * leaves more than one effect lands them as one bundle named after it — that is
 * stamped in `spellEffectFor`, not here.
 */

/** Advantage on the target's own rolls of one kind (Enhance Ability, Foresight). */
const advOn = (
  name: string,
  applies: 'savingThrows' | 'abilityChecks' | 'attackRolls' | 'all',
  opts: {
    source?: string
    duration?: ReturnType<typeof timedDuration>
    note?: string
    abilities?: Ability[]
  },
) =>
  modifierEffect(
    { name, mode: 'advantage', direction: 'outgoing', applies, abilities: opts.abilities },
    opts,
  )

/** Attack rolls *against* the target are made at disadvantage (Blur, Holy Aura). */
const attackersDisadv = (
  name: string,
  opts: { source?: string; duration?: ReturnType<typeof timedDuration>; note?: string },
) =>
  modifierEffect(
    { name, mode: 'disadvantage', direction: 'incoming', applies: 'attackRolls' },
    { note: 'Attackers: disadvantage', ...opts },
  )

export const BUFF_SPELLS: SpellEffectTable = {
  // — Abjuration —
  resistance: {
    summary: '+1d4 to one saving throw',
    targeting: 'ally',
    build: ({ source }) => [
      flatBonus('Resistance', '1d4', {
        source,
        applies: 'savingThrows',
        duration: CONSUME,
        note: '+1d4 to a saving throw',
      }),
    ],
  },
  'mage armor': {
    summary: 'AC 13 + Dex while unarmored',
    targeting: 'ally',
    // An alternative unarmored base: a PC with build facts derives it live (so
    // donning armor turns it off by itself); anyone else gets the worked-out note.
    build: ({ source, target }) => {
      const dex = dexModifier(target)
      const note = dex == null ? 'AC 13 + Dex unarmored' : `AC ${13 + dex} unarmored`
      return [
        modifierEffect(
          {
            name: 'Mage Armor',
            mode: 'flatBonus',
            direction: 'outgoing',
            applies: 'ac',
            acBase: 13,
          },
          { source, duration: MANUAL, note },
        ),
      ]
    },
  },
  'protection from evil and good': {
    summary: 'Aberrations, Fey, Fiends and Undead attack it at disadvantage',
    targeting: 'ally',
    build: ({ source, spell }) => [
      attackersDisadv('Protection from Evil and Good', {
        source,
        duration: timedDuration(spell),
        note: 'Disadv. from listed types',
      }),
    ],
  },
  sanctuary: {
    summary: 'Attackers must save or pick a new target',
    targeting: 'ally',
    build: ({ source, spell }) => [
      reminder('Sanctuary', 'Attackers save or divert', { source, duration: timedDuration(spell) }),
    ],
  },
  shield: {
    summary: '+5 AC until the start of its next turn',
    targeting: 'self',
    build: ({ source }) => [
      flatBonus('Shield', 5, {
        source,
        applies: 'ac',
        duration: { type: 'rounds', rounds: 1 },
        note: '+5 AC',
      }),
    ],
  },
  'shield of faith': {
    summary: '+2 bonus to AC for the duration',
    targeting: 'ally',
    build: ({ source, spell }) => [
      flatBonus('Shield of Faith', 2, {
        source,
        applies: 'ac',
        duration: timedDuration(spell),
        note: '+2 AC',
      }),
    ],
  },
  aid: {
    summary: 'HP maximum and current HP increase by 5',
    targeting: 'ally',
    multi: true,
    // The maximum moves on its own; the +5 current is the GM's edit, so the note says so.
    build: ({ source }) => [
      modifierEffect(
        { name: 'Aid', mode: 'flatBonus', direction: 'outgoing', applies: 'maxHp', value: 5 },
        { source, duration: MANUAL, note: '+5 HP max & current' },
      ),
    ],
  },
  'pass without trace': {
    summary: '+10 to Dexterity (Stealth) checks',
    targeting: 'ally',
    multi: true,
    build: ({ source, spell }) => [
      modifierEffect(
        {
          name: 'Pass without Trace',
          mode: 'flatBonus',
          direction: 'outgoing',
          applies: 'abilityChecks',
          value: 10,
          abilities: ['dex'],
        },
        { source, duration: timedDuration(spell), note: '+10 Stealth' },
      ),
    ],
  },
  'protection from poison': {
    summary: 'Advantage on saves against poison; resistance to Poison damage',
    targeting: 'ally',
    // The advantage is condition-scoped ("to avoid or end the Poisoned condition"),
    // which no roll category expresses — an auto-applied modifier would fire on every
    // save, so this reminds instead.
    build: ({ source }) => [
      reminder('Protection from Poison', 'Adv. vs poison; resist', {
        source,
        duration: MANUAL,
      }),
    ],
  },
  'warding bond': {
    summary: '+1 AC and saves; resistance to all damage, shared with the caster',
    targeting: 'ally',
    build: ({ source }) => [
      flatBonus('Warding Bond', 1, {
        source,
        applies: 'ac',
        duration: MANUAL,
        note: '+1 AC',
      }),
      flatBonus('Warding Bond', 1, {
        source,
        applies: 'savingThrows',
        duration: MANUAL,
        note: '+1 saves',
      }),
      reminder('Warding Bond', 'Resist all; caster shares dmg', { source, duration: MANUAL }),
    ],
  },
  'beacon of hope': {
    summary: 'Advantage on Wisdom and death saves; healing is maximised',
    targeting: 'ally',
    multi: true,
    // Death saves aren't ability-keyed, so the Wisdom narrowing carries them in the note.
    build: ({ source, spell }) => [
      advOn('Beacon of Hope', 'savingThrows', {
        source,
        duration: timedDuration(spell),
        note: 'Adv. Wis & death saves',
        abilities: ['wis'],
      }),
      reminder('Beacon of Hope', 'Healing is maximised', {
        source,
        duration: timedDuration(spell),
      }),
    ],
  },
  'magic circle': {
    summary: 'Warded against the chosen creature types',
    targeting: 'ally',
    multi: true,
    build: ({ source }) => [
      reminder('Magic Circle', 'Warded from listed types', { source, duration: MANUAL }),
    ],
  },
  nondetection: {
    summary: 'Hidden from divination magic',
    targeting: 'ally',
    build: ({ source }) => [
      reminder('Nondetection', 'Hidden from divination', { source, duration: MANUAL }),
    ],
  },
  'protection from energy': {
    summary: 'Resistance to one chosen damage type',
    targeting: 'ally',
    build: ({ source, spell }) => [
      reminder('Protection from Energy', 'Resist chosen damage', {
        source,
        duration: timedDuration(spell),
      }),
    ],
  },
  'aura of life': {
    summary: 'Resistance to Necrotic damage while in the aura',
    targeting: 'ally',
    multi: true,
    build: ({ source, spell }) => [
      reminder('Aura of Life', 'Resist necrotic (aura)', {
        source,
        duration: timedDuration(spell),
      }),
    ],
  },
  'death ward': {
    summary: 'The first drop to 0 HP leaves it at 1 instead',
    targeting: 'ally',
    build: ({ source }) => [
      reminder('Death Ward', 'Survives one drop to 0', { source, duration: MANUAL }),
    ],
  },
  'freedom of movement': {
    summary: 'Unaffected by Difficult Terrain, grapples and restraints',
    targeting: 'ally',
    build: ({ source }) => [
      reminder('Freedom of Movement', 'Ignores grapple/restrain', { source, duration: MANUAL }),
    ],
  },
  'antilife shell': {
    summary: 'Living creatures cannot pass or reach through the aura',
    targeting: 'self',
    build: ({ source, spell }) => [
      reminder('Antilife Shell', "Living can't reach you", {
        source,
        duration: timedDuration(spell),
      }),
    ],
  },
  'dispel evil and good': {
    summary: 'Celestials, Fey, Fiends and Undead attack it at disadvantage',
    targeting: 'self',
    build: ({ source, spell }) => [
      attackersDisadv('Dispel Evil and Good', {
        source,
        duration: timedDuration(spell),
        note: 'Disadv. for listed types',
      }),
    ],
  },
  contingency: {
    summary: 'A stored spell triggers on the chosen circumstance',
    targeting: 'self',
    build: ({ source }) => [
      reminder('Contingency', 'Contingent spell stored', { source, duration: MANUAL }),
    ],
  },
  'globe of invulnerability': {
    summary: 'Spells of level 5 or lower cannot cross the barrier',
    targeting: 'self',
    build: ({ source, spell }) => [
      reminder('Globe of Invulnerability', 'Blocks spells ≤ lvl 5', {
        source,
        duration: timedDuration(spell),
      }),
    ],
  },
  'antimagic field': {
    summary: 'No spells or magical effects inside the aura',
    targeting: 'self',
    build: ({ source, spell }) => [
      reminder('Antimagic Field', 'No magic within 10 ft', {
        source,
        duration: timedDuration(spell),
      }),
    ],
  },
  'holy aura': {
    summary: 'Advantage on saves; attackers have disadvantage',
    targeting: 'ally',
    multi: true,
    build: ({ source, spell }) => [
      advOn('Holy Aura', 'savingThrows', {
        source,
        duration: timedDuration(spell),
        note: 'Adv. on all saves',
      }),
      attackersDisadv('Holy Aura', { source, duration: timedDuration(spell) }),
    ],
  },
  'mind blank': {
    summary: 'Immune to Psychic damage and the Charmed condition',
    targeting: 'ally',
    build: ({ source, spell }) => [
      reminder('Mind Blank', 'Immune to Psychic & Charmed', {
        source,
        duration: timedDuration(spell),
      }),
    ],
  },

  // — Conjuration —
  'spirit guardians': {
    summary: 'Spirits in a 15-foot aura slow and damage enemies',
    targeting: 'self',
    build: ({ source, spell }) => [
      reminder('Spirit Guardians', '15 ft aura: half Speed', {
        source,
        duration: timedDuration(spell),
      }),
    ],
  },
  'conjure minor elementals': {
    summary: 'Extra damage against creatures in the 15-foot aura',
    targeting: 'self',
    build: ({ source, spell }) => [
      reminder('Conjure Minor Elementals', '+1d8 in the 15 ft aura', {
        source,
        duration: timedDuration(spell),
      }),
    ],
  },
  "heroes' feast": {
    summary: 'Immune to poison and fear; HP maximum increases',
    targeting: 'ally',
    multi: true,
    build: ({ source }) => [
      reminder("Heroes' Feast", 'Poison/fear immune; +HP', { source, duration: MANUAL }),
    ],
  },
  etherealness: {
    summary: 'Moves into the Border Ethereal',
    targeting: 'self',
    build: ({ source }) => [
      reminder('Etherealness', 'On the Ethereal Plane', { source, duration: MANUAL }),
    ],
  },

  // — Divination —
  guidance: {
    summary: '+1d4 to one ability check',
    targeting: 'ally',
    build: ({ source }) => [
      flatBonus('Guidance', '1d4', {
        source,
        applies: 'abilityChecks',
        duration: CONSUME,
        note: '+1d4 to an ability check',
      }),
    ],
  },
  'comprehend languages': {
    summary: 'Understands any language it hears or reads',
    targeting: 'self',
    build: ({ source }) => [
      reminder('Comprehend Languages', 'Understands any language', { source, duration: MANUAL }),
    ],
  },
  'detect evil and good': {
    summary: 'Senses Aberrations, Celestials, Fey, Fiends and Undead within 30 feet',
    targeting: 'self',
    build: ({ source, spell }) => [
      reminder('Detect Evil and Good', 'Senses listed types 30 ft', {
        source,
        duration: timedDuration(spell),
      }),
    ],
  },
  'detect magic': {
    summary: 'Senses magic within 30 feet',
    targeting: 'self',
    build: ({ source, spell }) => [
      reminder('Detect Magic', 'Senses magic within 30 ft', {
        source,
        duration: timedDuration(spell),
      }),
    ],
  },
  'detect poison and disease': {
    summary: 'Senses poison and contagion within 30 feet',
    targeting: 'self',
    build: ({ source, spell }) => [
      reminder('Detect Poison and Disease', 'Senses poison & disease', {
        source,
        duration: timedDuration(spell),
      }),
    ],
  },
  'speak with animals': {
    summary: 'Can communicate with Beasts',
    targeting: 'self',
    build: ({ source }) => [
      reminder('Speak with Animals', 'Can talk with beasts', { source, duration: MANUAL }),
    ],
  },
  'detect thoughts': {
    summary: 'Reads surface thoughts',
    targeting: 'self',
    build: ({ source, spell }) => [
      reminder('Detect Thoughts', 'Reading thoughts', { source, duration: timedDuration(spell) }),
    ],
  },
  'locate object': {
    summary: 'Senses the direction to the object',
    targeting: 'self',
    build: ({ source, spell }) => [
      reminder('Locate Object', 'Senses the object', { source, duration: timedDuration(spell) }),
    ],
  },
  'see invisibility': {
    summary: 'Sees invisible creatures and into the Ethereal Plane',
    targeting: 'self',
    build: ({ source }) => [
      reminder('See Invisibility', 'Sees invisible & ethereal', { source, duration: MANUAL }),
    ],
  },
  clairvoyance: {
    summary: 'An invisible sensor sees or hears a remote place',
    targeting: 'self',
    build: ({ source, spell }) => [
      reminder('Clairvoyance', 'Remote sensor active', { source, duration: timedDuration(spell) }),
    ],
  },
  tongues: {
    summary: 'Understands and is understood in any language',
    targeting: 'ally',
    build: ({ source }) => [
      reminder('Tongues', 'Understands any language', { source, duration: MANUAL }),
    ],
  },
  'arcane eye': {
    summary: 'An invisible eye scouts and relays what it sees',
    targeting: 'self',
    build: ({ source, spell }) => [
      reminder('Arcane Eye', 'Invisible eye scouting', { source, duration: timedDuration(spell) }),
    ],
  },
  'locate creature': {
    summary: 'Senses the direction to the creature',
    targeting: 'self',
    build: ({ source, spell }) => [
      reminder('Locate Creature', 'Senses the creature', {
        source,
        duration: timedDuration(spell),
      }),
    ],
  },
  'telepathic bond': {
    summary: 'Telepathic link among the chosen creatures',
    targeting: 'ally',
    multi: true,
    build: ({ source }) => [
      reminder('Telepathic Bond', 'Telepathic with the party', { source, duration: MANUAL }),
    ],
  },
  'find the path': {
    summary: 'Knows the shortest route to the named location',
    targeting: 'self',
    build: ({ source, spell }) => [
      reminder('Find the Path', 'Knows the route', { source, duration: timedDuration(spell) }),
    ],
  },
  'true seeing': {
    summary: 'Truesight out to 120 feet',
    targeting: 'ally',
    build: ({ source }) => [
      reminder('True Seeing', 'Truesight 120 ft', { source, duration: MANUAL }),
    ],
  },
  foresight: {
    summary: 'Advantage on its D20 tests; attackers have disadvantage',
    targeting: 'ally',
    build: ({ source }) => [
      advOn('Foresight', 'all', { source, duration: MANUAL, note: 'Adv. on all D20 tests' }),
      attackersDisadv('Foresight', { source, duration: MANUAL }),
    ],
  },

  // — Enchantment —
  bless: {
    summary: '+1d4 to attack rolls and saving throws',
    targeting: 'ally',
    multi: true,
    build: ({ source, spell }) => [
      flatBonus('Bless', '1d4', {
        source,
        duration: timedDuration(spell),
        note: '+1d4 to attacks & saves',
      }),
    ],
  },
  heroism: {
    summary: 'Immune to Frightened; temp HP each turn',
    targeting: 'ally',
    build: ({ source, spell }) => [
      reminder('Heroism', 'Immune to Frightened', { source, duration: timedDuration(spell) }),
    ],
  },
  glibness: {
    summary: 'Charisma checks count as at least 15',
    targeting: 'self',
    build: ({ source }) => [
      reminder('Glibness', 'Cha checks count as 15', { source, duration: MANUAL }),
    ],
  },

  // — Evocation —
  'flame blade': {
    summary: 'A fiery blade the caster attacks with',
    targeting: 'self',
    build: ({ source, spell }) => [
      reminder('Flame Blade', 'Fiery blade in hand', { source, duration: timedDuration(spell) }),
    ],
  },
  'spiritual weapon': {
    summary: 'A spectral weapon the caster attacks with as a Bonus Action',
    targeting: 'self',
    build: ({ source, spell }) => [
      reminder('Spiritual Weapon', 'Spectral weapon out', {
        source,
        duration: timedDuration(spell),
      }),
    ],
  },
  'fire shield': {
    summary: 'Damages attackers in melee; resistance to fire or cold',
    targeting: 'self',
    build: ({ source }) => [
      reminder('Fire Shield', 'Retaliates 2d8; resist', { source, duration: MANUAL }),
    ],
  },
  'arcane hand': {
    summary: 'A spectral hand the caster directs each turn',
    targeting: 'self',
    build: ({ source, spell }) => [
      reminder('Arcane Hand', 'Spectral hand active', { source, duration: timedDuration(spell) }),
    ],
  },
  'arcane sword': {
    summary: 'A spectral sword the caster attacks with each turn',
    targeting: 'self',
    build: ({ source, spell }) => [
      reminder('Arcane Sword', 'Spectral sword active', { source, duration: timedDuration(spell) }),
    ],
  },

  // — Illusion —
  'disguise self': {
    summary: 'Appears different until the spell ends',
    targeting: 'self',
    build: ({ source }) => [reminder('Disguise Self', 'Disguised', { source, duration: MANUAL })],
  },
  "arcanist's magic aura": {
    summary: 'Masks how the target reads to divination magic',
    targeting: 'ally',
    build: ({ source }) => [
      reminder("Arcanist's Magic Aura", 'Magic aura masked', { source, duration: MANUAL }),
    ],
  },
  blur: {
    summary: 'Attack rolls against it have disadvantage',
    targeting: 'self',
    build: ({ source, spell }) => [
      attackersDisadv('Blur', { source, duration: timedDuration(spell) }),
    ],
  },
  invisibility: {
    summary: 'Invisible',
    targeting: 'ally',
    build: ({ source, spell }) => [
      condition('Invisible', { source, duration: timedDuration(spell) }),
    ],
  },
  'mirror image': {
    summary: 'Three duplicates soak attacks aimed at it',
    targeting: 'self',
    build: ({ source }) => [
      reminder('Mirror Image', '3 mirror images', { source, duration: MANUAL }),
    ],
  },
  'greater invisibility': {
    summary: 'Invisible, and stays so when it attacks',
    targeting: 'ally',
    build: ({ source, spell }) => [
      condition('Invisible', { source, duration: timedDuration(spell) }),
    ],
  },
  mislead: {
    summary: 'Invisible, with an illusory double left behind',
    targeting: 'self',
    build: ({ source, spell }) => [
      condition('Invisible', { source, duration: timedDuration(spell) }),
      reminder('Mislead', 'Illusory double', { source, duration: timedDuration(spell) }),
    ],
  },
  seeming: {
    summary: 'Illusory appearance for each chosen creature',
    targeting: 'ally',
    multi: true,
    build: ({ source }) => [
      reminder('Seeming', 'Illusory appearance', { source, duration: MANUAL }),
    ],
  },
  'project image': {
    summary: 'An illusory copy the caster sees and speaks through',
    targeting: 'self',
    build: ({ source, spell }) => [
      reminder('Project Image', 'Illusory double elsewhere', {
        source,
        duration: timedDuration(spell),
      }),
    ],
  },

  // — Necromancy —
  'chantry tithe': {
    summary: 'The caster gains 5 temporary HP whenever another creature nearby casts a spell',
    targeting: 'self',
    build: ({ source, spell }) => [
      reminder('Chantry Tithe', '5 temp HP when others cast', {
        source,
        duration: timedDuration(spell),
      }),
    ],
  },
  'vampiric touch': {
    summary: 'Heals the caster half the necrotic damage dealt',
    targeting: 'self',
    build: ({ source, spell }) => [
      reminder('Vampiric Touch', 'Heals half damage dealt', {
        source,
        duration: timedDuration(spell),
      }),
    ],
  },
  'magic jar': {
    summary: 'The caster’s soul occupies the vessel',
    targeting: 'self',
    build: ({ source }) => [
      reminder('Magic Jar', 'Soul in the vessel', { source, duration: MANUAL }),
    ],
  },
  'astral projection': {
    summary: 'Projects into the Astral Plane, leaving the body behind',
    targeting: 'ally',
    multi: true,
    build: ({ source }) => [
      reminder('Astral Projection', 'Astral form (body left)', { source, duration: MANUAL }),
    ],
  },

  // — Transmutation —
  instar: {
    summary: '20 temporary HP, a 2d8 natural weapon, and advantage against Frightened and Charmed',
    targeting: 'self',
    build: ({ source, spell }) => [
      reminder('Instar', '20 temp HP & a natural weapon', {
        source,
        duration: timedDuration(spell),
      }),
    ],
  },
  preferment: {
    // The permanent cost — the caster's own case advances a stage — is the book's
    // disease counter, not board state, so only the minute of benefits is badged.
    summary: '+20 Speed, advantage on attacks and Constitution saves, 10 temporary HP each turn',
    targeting: 'self',
    build: ({ source, spell }) => [
      advOn('Preferment', 'attackRolls', {
        source,
        duration: timedDuration(spell),
        note: 'Advantage on attacks',
      }),
      advOn('Preferment', 'savingThrows', {
        source,
        duration: timedDuration(spell),
        note: 'Adv. on CON saves',
        abilities: ['con'],
      }),
      modifierEffect(
        {
          name: 'Preferment',
          mode: 'flatBonus',
          direction: 'outgoing',
          applies: 'speed',
          value: 20,
        },
        { source, duration: timedDuration(spell), note: '+20 ft Speed' },
      ),
      reminder('Preferment', '10 temp HP/turn; no fear/charm', {
        source,
        duration: timedDuration(spell),
      }),
    ],
  },
  shillelagh: {
    summary: 'The weapon uses the caster’s spellcasting ability',
    targeting: 'self',
    build: ({ source, spell }) => [
      reminder('Shillelagh', 'Club uses your spell mod', {
        source,
        duration: timedDuration(spell),
      }),
    ],
  },
  'expeditious retreat': {
    summary: 'Can Dash as a Bonus Action',
    targeting: 'self',
    build: ({ source, spell }) => [
      reminder('Expeditious Retreat', 'Dash as a Bonus Action', {
        source,
        duration: timedDuration(spell),
      }),
    ],
  },
  'feather fall': {
    summary: 'Falls slowly and takes no falling damage',
    targeting: 'ally',
    multi: true,
    build: ({ source, spell }) => [
      reminder('Feather Fall', 'Falls safely', { source, duration: timedDuration(spell) }),
    ],
  },
  jump: {
    summary: 'Can jump 30 feet for 10 feet of movement',
    targeting: 'ally',
    build: ({ source, spell }) => [
      reminder('Jump', 'Jumps 30 ft for 10 ft', { source, duration: timedDuration(spell) }),
    ],
  },
  longstrider: {
    summary: 'Speed increases by 10 feet',
    targeting: 'ally',
    multi: true,
    build: ({ source }) => [
      modifierEffect(
        {
          name: 'Longstrider',
          mode: 'flatBonus',
          direction: 'outgoing',
          applies: 'speed',
          value: 10,
        },
        { source, duration: MANUAL, note: '+10 ft Speed' },
      ),
    ],
  },
  'alter self': {
    summary: 'Altered form: aquatic, changed appearance, or natural weapons',
    targeting: 'self',
    build: ({ source, spell }) => [
      reminder('Alter Self', 'Altered form', { source, duration: timedDuration(spell) }),
    ],
  },
  barkskin: {
    // 2024 sets AC 17 with no concentration; 2014 is AC 16 and concentration.
    summary: 'Minimum AC while the spell lasts',
    targeting: 'ally',
    build: ({ source, spell }) => [
      reminder('Barkskin', is2024(spell) ? 'AC 17 minimum' : 'AC 16 minimum', {
        source,
        duration: timedDuration(spell),
      }),
    ],
  },
  darkvision: {
    // 2024 grants 150 feet; 2014 grants 60.
    summary: 'Gains Darkvision',
    targeting: 'ally',
    build: ({ source, spell }) => [
      reminder('Darkvision', is2024(spell) ? 'Darkvision 150 ft' : 'Darkvision 60 ft', {
        source,
        duration: MANUAL,
      }),
    ],
  },
  "dragon's breath": {
    summary: 'Can exhale a breath weapon of the chosen type',
    targeting: 'ally',
    build: ({ source, spell }) => [
      reminder("Dragon's Breath", 'Breath weapon ready', {
        source,
        duration: timedDuration(spell),
      }),
    ],
  },
  'enhance ability': {
    summary: 'Advantage on ability checks with the chosen ability',
    targeting: 'ally',
    build: ({ source, spell }) => [
      advOn('Enhance Ability', 'abilityChecks', {
        source,
        duration: timedDuration(spell),
        note: 'Adv. on chosen ability',
      }),
    ],
  },
  'magic weapon': {
    summary: '+1 to attack and damage rolls with the weapon',
    targeting: 'ally',
    build: ({ source }) => [
      flatBonus('Magic Weapon', 1, {
        source,
        applies: 'attackRolls',
        duration: MANUAL,
        note: '+1 attack & damage',
      }),
    ],
  },
  'spider climb': {
    summary: 'Can move on walls and ceilings',
    targeting: 'ally',
    build: ({ source, spell }) => [
      reminder('Spider Climb', 'Climbs walls & ceilings', {
        source,
        duration: timedDuration(spell),
      }),
    ],
  },
  blink: {
    summary: 'Vanishes to the Ethereal Plane on a 4–6 each turn',
    targeting: 'self',
    build: ({ source, spell }) => [
      reminder('Blink', '50%: on the Ethereal', { source, duration: timedDuration(spell) }),
    ],
  },
  fly: {
    summary: 'Fly Speed 60 ft. and can hover',
    targeting: 'ally',
    // A higher-level slot targets one extra creature per level above 3rd.
    multi: true,
    build: ({ source, spell }) => [
      reminder('Fly', 'Fly Speed 60, hovers', { source, duration: timedDuration(spell) }),
    ],
  },
  'gaseous form': {
    summary: 'Misty form: Fly Speed 10 ft. and resistance to B/P/S',
    targeting: 'ally',
    build: ({ source, spell }) => [
      reminder('Gaseous Form', 'Gaseous: Fly 10, resist', {
        source,
        duration: timedDuration(spell),
      }),
    ],
  },
  haste: {
    summary: 'Double Speed, +2 AC, advantage on Dex saves, and an extra action',
    targeting: 'ally',
    build: ({ source, spell }) => [
      flatBonus('Haste', 2, {
        source,
        applies: 'ac',
        duration: timedDuration(spell),
        note: '+2 AC',
      }),
      advOn('Haste', 'savingThrows', {
        source,
        duration: timedDuration(spell),
        note: 'Adv. on Dex saves',
        abilities: ['dex'],
      }),
      modifierEffect(
        {
          name: 'Haste',
          mode: 'flatBonus',
          direction: 'outgoing',
          applies: 'speed',
          value: 'double',
        },
        { source, duration: timedDuration(spell), note: 'Speed doubled' },
      ),
      reminder('Haste', 'Extra action; lethargy at end', {
        source,
        duration: timedDuration(spell),
      }),
    ],
  },
  'meld into stone': {
    summary: 'Merged into stone, out of reach',
    targeting: 'self',
    build: ({ source }) => [
      reminder('Meld into Stone', 'Melded into stone', { source, duration: MANUAL }),
    ],
  },
  'water breathing': {
    summary: 'Can breathe underwater',
    targeting: 'ally',
    multi: true,
    build: ({ source }) => [
      reminder('Water Breathing', 'Breathes underwater', { source, duration: MANUAL }),
    ],
  },
  'water walk': {
    summary: 'Can move across liquid surfaces',
    targeting: 'ally',
    multi: true,
    build: ({ source }) => [
      reminder('Water Walk', 'Walks on liquids', { source, duration: MANUAL }),
    ],
  },
  stoneskin: {
    // 2014 covers nonmagical B/P/S only; 2024 dropped that qualifier.
    summary: 'Resistance to Bludgeoning, Piercing and Slashing damage',
    targeting: 'ally',
    build: ({ source, spell }) => [
      reminder('Stoneskin', is2024(spell) ? 'Resist B/P/S' : 'Resist nonmagical B/P/S', {
        source,
        duration: timedDuration(spell),
      }),
    ],
  },
  'wind walk': {
    summary: 'Cloud form with a Fly Speed of 300 feet',
    targeting: 'ally',
    multi: true,
    build: ({ source }) => [
      reminder('Wind Walk', 'Cloud form: Fly 300 ft', { source, duration: MANUAL }),
    ],
  },
  regenerate: {
    summary: 'Regains 1 HP at the start of each of its turns',
    targeting: 'ally',
    build: ({ source }) => [
      reminder('Regenerate', 'Regains 1 HP per turn', { source, duration: MANUAL }),
    ],
  },
  sequester: {
    summary: 'Invisible and unconscious until the trigger',
    targeting: 'ally',
    build: ({ source }) => [
      reminder('Sequester', 'Hidden & unconscious', { source, duration: MANUAL }),
    ],
  },
  'animal shapes': {
    summary: 'Shape-shifted into a Beast',
    targeting: 'ally',
    multi: true,
    build: ({ source }) => [reminder('Animal Shapes', 'Beast form', { source, duration: MANUAL })],
  },
  shapechange: {
    summary: 'Shape-shifted into another creature',
    targeting: 'self',
    build: ({ source, spell }) => [
      reminder('Shapechange', 'Shapechanged', { source, duration: timedDuration(spell) }),
    ],
  },
}
