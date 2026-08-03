// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import type { ConditionName } from '../../schema/effect.ts'
import type { EffectPreset } from '../../schema/preset.ts'

/**
 * The three things _On Strong Waters and Potent Simples_ counts: the four levels of
 * Intoxication, the Craving a substance builds, and the three degrees an addiction
 * reaches. Offered in the Apply effect modal whenever that library is enabled.
 *
 * The book ships no stat blocks, so these presets and its eleven spells are the whole of
 * what the console runs. The first chapter owns the rules — the saving throw, the
 * thresholds, what an excess is — and a preset carries only what the board has to show.
 *
 * Ability-scoped Advantage and Disadvantage has no Effect shape: `applies` scopes to a
 * category of roll, never to an ability, so a modifier for "Disadvantage on Wisdom
 * checks" would reach every check the creature makes. Those lines are reminders instead,
 * exactly as a disease stage's Hit Point maximum is in `broodAndBloom.ts`.
 *
 * Two things about a reminder decide how these are worded. Applying one mints an Effect
 * whose *name* is the note, and that name is drawn on the combatant's row in the tracker
 * — so a note names its level or degree first, or the row shows a rule with nothing
 * saying which one it is, and a long note costs four lines of the row. Each therefore
 * states only what its own step adds; the ladder in full is the book's card in appendix
 * B, which is where a Game Master reads it rather than off a badge mid-fight.
 */

const SOURCE = 'openfray-strong-waters'

/** One level of Intoxication, stating what that level adds to the ones below it. */
function level(n: 1 | 2 | 3 | 4, note: string, conditions: ConditionName[] = []): EffectPreset {
  return {
    id: `${SOURCE}:intoxication-${n}`,
    name: `Intoxication ${n}`,
    source: SOURCE,
    conditions,
    modifier: null,
    note,
    duration: { type: 'manual' },
  }
}

/**
 * One degree of an addiction. It carries no Exhaustion condition even though the second
 * and third lay one down: the degree is recorded permanently and the Exhaustion belongs
 * only to a day gone without, so the Game Master adds it on the days it is true.
 */
function degree(n: 1 | 2 | 3, note: string): EffectPreset {
  return {
    id: `${SOURCE}:addicted-${n}`,
    name: `Addicted ${n}`,
    source: SOURCE,
    conditions: [],
    modifier: null,
    note,
    duration: { type: 'manual' },
  }
}

export const STRONG_WATERS_PRESETS: EffectPreset[] = [
  {
    id: `${SOURCE}:craving`,
    name: 'Craving',
    source: SOURCE,
    conditions: [],
    modifier: null,
    note: 'Craving',
    duration: { type: 'manual' },
    counter: true,
  },

  // Intoxication — the fourth chapter's track. A creature holds one level at a time, and
  // the track falls by a level for each hour it spends without drinking.
  level(
    1,
    'Intoxication 1, merry — Advantage on saves against being Frightened, Disadvantage on Wisdom checks',
  ),
  level(
    2,
    'Intoxication 2, loose — also Disadvantage on Dexterity checks, Dexterity saves and Wisdom saves',
  ),
  level(3, 'Intoxication 3, blind — also Speed −10 ft.', ['Poisoned']),
  level(
    4,
    'Intoxication 4, insensible — Unconscious 1d4 hours, and damage doesn’t end it. DC 15 Wisdom (Medicine) rouses it 1 minute. 1 Exhaustion level when it ends',
    ['Unconscious'],
  ),

  // The three degrees — the first chapter's, shared by both catalogs. Each describes a
  // day the creature goes without, and their effects are cumulative.
  degree(
    1,
    'Addicted 1, the habit — a day gone without gives Disadvantage on Wisdom and Charisma checks',
  ),
  degree(
    2,
    'Addicted 2, the need — also 1 Exhaustion level no Long Rest removes, and a pressed measure calls the saving throw with Disadvantage',
  ),
  degree(
    3,
    'Addicted 3, the ruin — also any measure within reach calls the saving throw; on a failure it takes one, with the entry’s excess',
  ),
]
