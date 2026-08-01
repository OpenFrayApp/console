// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import type { EffectPreset } from '../../schema/preset.ts'

/**
 * The brood diseases from _Brood & Bloom_, one preset per stage, plus the two counters
 * the book's broods are tracked with. Offered in the Apply effect modal whenever that
 * library is enabled.
 *
 * Most of what a stage does — a Speed reduction, a Hit Point maximum, a Vulnerability, a
 * spell slot that won't come back — has no Effect shape, and deliberately so: the app
 * models the six consequences and reminds the Game Master of everything else. So each
 * stage carries the conditions and modifiers it genuinely has, and its remaining text as
 * a reminder. A stage lasts until it is cured or it advances, so every one is `manual`.
 *
 * The text is condensed from the book's disease tables — chapter 4 for the Inquiline,
 * chapter 5 for the Sporophore. The Necrophore infects nobody and has no diseases.
 */

const SOURCE = 'openfray-brood-and-bloom'

/** One disease stage, with only the parts the app can genuinely apply. */
function stage(
  slug: string,
  disease: string,
  n: 1 | 2 | 3 | 4,
  note: string,
  extra: Partial<EffectPreset> = {},
): EffectPreset {
  return {
    id: `${SOURCE}:${slug}-${n}`,
    name: `${disease} ${n}`,
    source: SOURCE,
    conditions: [],
    modifier: null,
    note,
    duration: { type: 'manual' },
    ...extra,
  }
}

/**
 * A brood's counter — Depth for the Inquiline, Spore Load for the Sporophore. Six points
 * converts: the case contracts at stage 1, or advances one stage, and the counter resets.
 */
function broodCounter(slug: string, name: string): EffectPreset {
  return {
    id: `${SOURCE}:${slug}`,
    name,
    source: SOURCE,
    conditions: [],
    modifier: null,
    note: name,
    duration: { type: 'manual' },
    counter: true,
  }
}

export const BROOD_AND_BLOOM_PRESETS: EffectPreset[] = [
  broodCounter('depth', 'Depth'),
  broodCounter('spore-load', 'Spore Load'),

  // Inquiline — the sallow line.
  stage('sallow-rot', 'Sallow Rot', 1, 'Speed −5 ft. No benefit from a Short Rest.'),
  stage('sallow-rot', 'Sallow Rot', 2, 'Hit Point maximum −10. Speed −10 ft.'),
  stage('sallow-rot', 'Sallow Rot', 3, 'Hit Point maximum −30 in all. Healing received is halved.'),
  stage(
    'sallow-rot',
    'Sallow Rot',
    4,
    'The creature dies. The graft matures into a Quagdam after 1d4 days',
  ),

  // Inquiline — the chantry line.
  stage(
    'chantry-drought',
    'Chantry Drought',
    1,
    'Casting a spell of level 1 or higher costs 1d6 Necrotic damage per level of the spell. It can’t be reduced; Immunity to Necrotic prevents it',
  ),
  stage(
    'chantry-drought',
    'Chantry Drought',
    2,
    'One of the highest-level spell slots can’t be recovered on a Long Rest',
  ),
  stage(
    'chantry-drought',
    'Chantry Drought',
    3,
    'The two highest-level spell slots can’t be recovered on a Long Rest. Disadvantage on Constitution saves to maintain Concentration',
  ),
  stage(
    'chantry-drought',
    'Chantry Drought',
    4,
    'Spellcasting is lost. The creature does not die — it wakes as a Lacuna, and the graft emerges as a Psalter Tick, after 1d4 days',
    { conditions: ['Incapacitated', 'Unconscious'] },
  ),

  // Inquiline — the palimpsest line.
  stage(
    'the-forgetting',
    'The Forgetting',
    1,
    'Loses one language, tool proficiency, or skill proficiency of the Game Master’s choice. It forgets it ever had it',
  ),
  stage(
    'the-forgetting',
    'The Forgetting',
    2,
    'One mental ability score −2. Gains a proficiency belonging to a mind the line has eaten',
  ),
  stage(
    'the-forgetting',
    'The Forgetting',
    3,
    'A second mental ability score −2. It can no longer tell its own memories from the ones it was given',
  ),
  stage(
    'the-forgetting',
    'The Forgetting',
    4,
    'The creature does not die. It remains as an Amanuensis, and the graft emerges as a Palimpsest Wyrm, after 1d4 days',
  ),

  // Sporophore — the rotgill line.
  stage(
    'mortification',
    'Mortification',
    1,
    'Wounds stop closing. No benefit from a Short Rest, and 1d6 Necrotic damage at the end of each Long Rest',
  ),
  stage(
    'mortification',
    'Mortification',
    2,
    'Hit Point maximum −10. Disadvantage on Constitution saving throws — including the save to recede',
  ),
  stage(
    'mortification',
    'Mortification',
    3,
    'Hit Point maximum −30 in all. Healing received is halved',
    { conditions: ['Poisoned'] },
  ),
  stage(
    'mortification',
    'Mortification',
    4,
    'The creature dies. It rises as a Drowned Chorus after 1d4 days',
  ),

  // Sporophore — the ashcap line.
  stage(
    'calcination',
    'Calcination',
    1,
    'Merely warm or merely cool weather is extreme for it. DC 10 Constitution save at the end of each hour spent in it without suitable clothing, or 1 Exhaustion level',
  ),
  stage('calcination', 'Calcination', 2, 'Vulnerability to Fire damage. Speed −10 ft'),
  stage(
    'calcination',
    'Calcination',
    3,
    'Vulnerability to Bludgeoning damage as well. Speed is halved',
  ),
  stage(
    'calcination',
    'Calcination',
    4,
    'The creature dies, and the body does not fall. It walks as a Cinderwalk after 1d4 days',
  ),

  // Sporophore — the reredos line.
  stage('ankylosis', 'Ankylosis', 1, 'Speed −5 ft. Resistance to Piercing damage'),
  stage(
    'ankylosis',
    'Ankylosis',
    2,
    'Speed −10 ft. Resistance extends to Slashing damage. Disadvantage on Dexterity saving throws',
  ),
  stage('ankylosis', 'Ankylosis', 3, 'Speed −15 ft. Armor Class +2'),
  stage(
    'ankylosis',
    'Ankylosis',
    4,
    'Speed 0. The creature does not die — it hardens and stands as a Buttress after 1d4 days',
    { conditions: ['Incapacitated'] },
  ),

  // Sporophore — the orcshroom line.
  stage(
    'metaplasia',
    'Metaplasia',
    1,
    'Needs twice as much food each day. On any day it goes without the full amount, 1 Exhaustion level',
  ),
  stage(
    'metaplasia',
    'Metaplasia',
    2,
    'Drawn toward the colony that infected it. DC 12 Wisdom save at the end of each Long Rest, or it can’t willingly increase its distance from it',
  ),
  stage(
    'metaplasia',
    'Metaplasia',
    3,
    'Gains the Sporing trait (5 ft., DC 11). Orcshroom creatures don’t attack it unless it or its allies attack first',
  ),
  stage(
    'metaplasia',
    'Metaplasia',
    4,
    'The creature does not die, and knows the colony’s exact location. It stands as an Orcshroom after 1d4 days, under the Game Master’s control',
  ),
]
