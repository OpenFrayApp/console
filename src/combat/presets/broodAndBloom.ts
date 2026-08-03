// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import type { EffectPreset, PresetPart } from '../../schema/preset.ts'

/**
 * The brood diseases from _Brood & Bloom_, one preset per stage, plus the two counters
 * the book's broods are tracked with. Offered in the Apply effect modal whenever that
 * library is enabled.
 *
 * A stage is a bundle: applied, it lands as one badge named for the stage, and it
 * carries its brood's counter with it — hidden from the player view, and left alone
 * when the creature already has one, so a tally survives the stage advancing. What a
 * stage does that has an Effect shape is a real part (a condition, a Disadvantage
 * narrowed to an ability); the rest — a Speed reduction, a Hit Point maximum, a
 * Vulnerability — stays a reminder, deliberately: the app models the six consequences
 * and reminds the Game Master of everything else.
 *
 * The text is condensed from the book's disease tables — chapter 4 for the Inquiline,
 * chapter 5 for the Sporophore. The Necrophore infects nobody and has no diseases.
 * A stage lasts until it is cured or it advances, so every one is `manual`.
 */

const SOURCE = 'openfray-brood-and-bloom'

/** The counter a brood tracks exposure with, as a hidden part of each stage. */
const DEPTH: PresetPart = { kind: 'counter', name: 'Depth', gmOnly: true }
const SPORE_LOAD: PresetPart = { kind: 'counter', name: 'Spore Load', gmOnly: true }

/** One disease stage: a bundle of the parts the app can genuinely hold. */
function stage(
  slug: string,
  disease: string,
  n: 1 | 2 | 3 | 4,
  counter: PresetPart,
  parts: PresetPart[],
): EffectPreset {
  return {
    id: `${SOURCE}:${slug}-${n}`,
    name: `${disease} ${n}`,
    source: SOURCE,
    duration: { type: 'manual' },
    parts: [...parts, counter],
  }
}

/** A reminder part, for the stage text with no Effect shape. */
function note(text: string): PresetPart {
  return { kind: 'reminder', note: text }
}

/**
 * A brood's counter on its own — for the exposure that comes before any disease. Six
 * points converts: the case contracts at stage 1, or advances one stage, and the
 * counter resets.
 */
function broodCounter(slug: string, name: string): EffectPreset {
  return {
    id: `${SOURCE}:${slug}`,
    name,
    source: SOURCE,
    duration: { type: 'manual' },
    parts: [{ kind: 'counter', name, gmOnly: true }],
  }
}

export const BROOD_AND_BLOOM_PRESETS: EffectPreset[] = [
  broodCounter('depth', 'Depth'),
  broodCounter('spore-load', 'Spore Load'),

  // Inquiline — the sallow line.
  stage('sallow-rot', 'Sallow Rot', 1, DEPTH, [note('Speed −5 ft.; no Short Rest benefit')]),
  stage('sallow-rot', 'Sallow Rot', 2, DEPTH, [note('HP max −10; Speed −10 ft.')]),
  stage('sallow-rot', 'Sallow Rot', 3, DEPTH, [note('HP max −30 in all; healing halved')]),
  stage('sallow-rot', 'Sallow Rot', 4, DEPTH, [
    note('Dies; the graft matures into a Quagdam in 1d4 days'),
  ]),

  // Inquiline — the chantry line.
  stage('chantry-drought', 'Chantry Drought', 1, DEPTH, [
    note('Casting a level 1+ spell: 1d6 Necrotic per spell level; Necrotic Immunity prevents it'),
  ]),
  stage('chantry-drought', 'Chantry Drought', 2, DEPTH, [
    note('One highest-level slot doesn’t return on a Long Rest'),
  ]),
  stage('chantry-drought', 'Chantry Drought', 3, DEPTH, [
    note('Two highest slots don’t return on a Long Rest'),
    note('Disadvantage on CON saves for Concentration'),
  ]),
  stage('chantry-drought', 'Chantry Drought', 4, DEPTH, [
    { kind: 'condition', condition: 'Incapacitated' },
    { kind: 'condition', condition: 'Unconscious' },
    note('Spellcasting lost; wakes as a Lacuna, the graft a Psalter Tick, in 1d4 days'),
  ]),

  // Inquiline — the palimpsest line.
  stage('the-forgetting', 'The Forgetting', 1, DEPTH, [
    note('Loses one language or proficiency (GM’s pick); forgets it ever had it'),
  ]),
  stage('the-forgetting', 'The Forgetting', 2, DEPTH, [
    note('One mental score −2; gains a proficiency from a mind the line has eaten'),
  ]),
  stage('the-forgetting', 'The Forgetting', 3, DEPTH, [
    note('A second mental score −2; can’t tell its memories from the given ones'),
  ]),
  stage('the-forgetting', 'The Forgetting', 4, DEPTH, [
    note('Doesn’t die; remains an Amanuensis, the graft a Palimpsest Wyrm, in 1d4 days'),
  ]),

  // Sporophore — the rotgill line.
  stage('mortification', 'Mortification', 1, SPORE_LOAD, [
    note('Wounds don’t close; no Short Rest benefit; 1d6 Necrotic each Long Rest'),
  ]),
  stage('mortification', 'Mortification', 2, SPORE_LOAD, [
    {
      kind: 'modifier',
      modifier: {
        name: 'Mortification',
        mode: 'disadvantage',
        direction: 'outgoing',
        applies: 'savingThrows',
        abilities: ['con'],
      },
    },
    note('HP max −10; the CON-save Disadvantage includes the save to recede'),
  ]),
  stage('mortification', 'Mortification', 3, SPORE_LOAD, [
    { kind: 'condition', condition: 'Poisoned' },
    {
      kind: 'modifier',
      modifier: {
        name: 'Mortification',
        mode: 'disadvantage',
        direction: 'outgoing',
        applies: 'savingThrows',
        abilities: ['con'],
      },
    },
    note('HP max −30 in all; healing halved'),
  ]),
  stage('mortification', 'Mortification', 4, SPORE_LOAD, [
    note('Dies; rises as a Drowned Chorus in 1d4 days'),
  ]),

  // Sporophore — the ashcap line.
  stage('calcination', 'Calcination', 1, SPORE_LOAD, [
    note('Mild heat or cold is extreme for it: DC 10 CON save per unsuited hour or 1 Exhaustion'),
  ]),
  stage('calcination', 'Calcination', 2, SPORE_LOAD, [note('Vulnerable to Fire; Speed −10 ft.')]),
  stage('calcination', 'Calcination', 3, SPORE_LOAD, [
    note('Vulnerable to Bludgeoning too; Speed halved'),
  ]),
  stage('calcination', 'Calcination', 4, SPORE_LOAD, [
    note('Dies standing; walks as a Cinderwalk in 1d4 days'),
  ]),

  // Sporophore — the reredos line.
  stage('ankylosis', 'Ankylosis', 1, SPORE_LOAD, [note('Speed −5 ft.; Resistant to Piercing')]),
  stage('ankylosis', 'Ankylosis', 2, SPORE_LOAD, [
    {
      kind: 'modifier',
      modifier: {
        name: 'Ankylosis',
        mode: 'disadvantage',
        direction: 'outgoing',
        applies: 'savingThrows',
        abilities: ['dex'],
      },
    },
    note('Speed −10 ft.; Resistance extends to Slashing'),
  ]),
  stage('ankylosis', 'Ankylosis', 3, SPORE_LOAD, [
    {
      kind: 'modifier',
      modifier: {
        name: 'Ankylosis',
        mode: 'disadvantage',
        direction: 'outgoing',
        applies: 'savingThrows',
        abilities: ['dex'],
      },
    },
    note('Speed −15 ft.; AC +2'),
  ]),
  stage('ankylosis', 'Ankylosis', 4, SPORE_LOAD, [
    { kind: 'condition', condition: 'Incapacitated' },
    note('Speed 0; doesn’t die — hardens into a Buttress in 1d4 days'),
  ]),

  // Sporophore — the orcshroom line.
  stage('metaplasia', 'Metaplasia', 1, SPORE_LOAD, [
    note('Needs double food; a short day costs 1 Exhaustion'),
  ]),
  stage('metaplasia', 'Metaplasia', 2, SPORE_LOAD, [
    note('Drawn to the colony: DC 12 WIS save each Long Rest or can’t move farther from it'),
  ]),
  stage('metaplasia', 'Metaplasia', 3, SPORE_LOAD, [
    note('Gains Sporing (5 ft., DC 11); Orcshrooms don’t attack it unprovoked'),
  ]),
  stage('metaplasia', 'Metaplasia', 4, SPORE_LOAD, [
    note(
      'Doesn’t die; knows the colony’s place. Stands as an Orcshroom in 1d4 days, GM’s creature',
    ),
  ]),
]
