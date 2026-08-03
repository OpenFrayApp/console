// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import type { EffectPreset, PresetPart } from '../../schema/preset.ts'

/**
 * The three things _On Strong Waters and Potent Simples_ counts: the four levels of
 * Intoxication, the Craving a substance builds, and the three degrees an addiction
 * reaches. Offered in the Apply effect modal whenever that library is enabled.
 *
 * The book ships no stat blocks, so these presets and its eleven spells are the whole of
 * what the console runs. The first chapter owns the rules — the saving throw, the
 * thresholds, what an excess is — and a preset carries only what the board has to show.
 *
 * A creature holds one Intoxication level at a time and "the effects of a level include
 * those below it" (chapter 4), so each level is a bundle carrying the whole of what that
 * level does: one badge, mechanically complete on its own, replaced as the level moves.
 * The ability-scoped lines are real modifiers now; what still has no Effect shape — a
 * Speed reduction, Advantage against one condition, the degrees' day-without rules —
 * stays a reminder the Game Master adjudicates. Craving is hidden from the player view:
 * a count the table reads is a rule the table starts playing to.
 */

const SOURCE = 'openfray-strong-waters'

/** Disadvantage on the named ability checks — the track's recurring shape. */
function checksDisadvantage(name: string, abilities: ('wis' | 'dex' | 'cha')[]): PresetPart {
  return {
    kind: 'modifier',
    modifier: {
      name,
      mode: 'disadvantage',
      direction: 'outgoing',
      applies: 'abilityChecks',
      abilities,
    },
  }
}

/** Disadvantage on the named saving throws. */
function savesDisadvantage(name: string, abilities: ('wis' | 'dex')[]): PresetPart {
  return {
    kind: 'modifier',
    modifier: {
      name,
      mode: 'disadvantage',
      direction: 'outgoing',
      applies: 'savingThrows',
      abilities,
    },
  }
}

/** The level-1 line with no shape: Advantage against one condition only. */
const MERRY_NOTE: PresetPart = {
  kind: 'reminder',
  note: 'Advantage on saves vs. Frightened',
}

/** One level of Intoxication, carrying everything the level does, its own and inherited. */
function level(n: 1 | 2 | 3 | 4, parts: PresetPart[]): EffectPreset {
  return {
    id: `${SOURCE}:intoxication-${n}`,
    name: `Intoxication ${n}`,
    source: SOURCE,
    duration: { type: 'manual' },
    parts,
  }
}

/**
 * One degree of an addiction — a record, not a day's state. Its reminders describe the
 * days the creature goes without; they are cumulative, so each degree carries the whole
 * ladder up to itself. It carries no Exhaustion condition even though the second lays
 * one down: the degree is recorded permanently and the Exhaustion belongs only to a day
 * gone without, so the Game Master adds it on the days it is true.
 */
function degree(n: 1 | 2 | 3, notes: string[]): EffectPreset {
  return {
    id: `${SOURCE}:addicted-${n}`,
    name: `Addicted ${n}`,
    source: SOURCE,
    duration: { type: 'manual' },
    parts: notes.map((note) => ({ kind: 'reminder' as const, note })),
  }
}

// Telegraphic on purpose: these lines live on the board, and the book has the prose.
const HABIT = 'Day without: Disadvantage on WIS and CHA checks'
const NEED = 'Day without: 1 Exhaustion no Long Rest removes; pressed: save at Disadvantage'
const RUIN = 'Measure in reach: save or take it, with the entry’s excess'

export const STRONG_WATERS_PRESETS: EffectPreset[] = [
  {
    id: `${SOURCE}:craving`,
    name: 'Craving',
    source: SOURCE,
    duration: { type: 'manual' },
    parts: [{ kind: 'counter', name: 'Craving', gmOnly: true }],
  },

  // Intoxication — the fourth chapter's track. One level at a time; each level includes
  // the effects of those below it, so each bundle is complete on its own.
  level(1, [checksDisadvantage('Intoxication', ['wis']), MERRY_NOTE]),
  level(2, [
    checksDisadvantage('Intoxication', ['wis', 'dex']),
    savesDisadvantage('Intoxication', ['dex', 'wis']),
    MERRY_NOTE,
  ]),
  level(3, [
    { kind: 'condition', condition: 'Poisoned' },
    checksDisadvantage('Intoxication', ['wis', 'dex']),
    savesDisadvantage('Intoxication', ['dex', 'wis']),
    { kind: 'reminder', note: 'Speed −10 ft.' },
    MERRY_NOTE,
  ]),
  level(4, [
    { kind: 'condition', condition: 'Unconscious' },
    { kind: 'reminder', note: 'Unconscious 1d4 hours; damage doesn’t wake it' },
    { kind: 'reminder', note: 'DC 15 Medicine rouses it 1 min; 1 Exhaustion when it ends' },
    checksDisadvantage('Intoxication', ['wis', 'dex']),
    savesDisadvantage('Intoxication', ['dex', 'wis']),
    { kind: 'reminder', note: 'Speed −10 ft.' },
  ]),

  // The three degrees — the first chapter's, shared by both catalogs. Cumulative, and
  // every line describes a day the creature goes without.
  degree(1, [HABIT]),
  degree(2, [HABIT, NEED]),
  degree(3, [HABIT, NEED, RUIN]),
]
