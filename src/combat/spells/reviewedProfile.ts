// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import type { Spell, SpellMechanics } from '../../schema/spell.ts'
import type { ConditionName, EffectDuration } from '../../schema/effect.ts'
import type { ReviewedSpellCasting } from '../reviewedSpells.ts'
import type { SpellEffectDef } from './shared.ts'
import { condition, reminder } from '../effects.ts'

/** Author initial damage and its explicit slot or cantrip progression without reading spell prose. */
export function reviewedDamage(
  damage: NonNullable<SpellMechanics['damage']>,
  base: number,
  increments: number[],
): Pick<SpellMechanics, 'damage' | 'scaling'> {
  if (increments.every((increment) => increment === 0)) return { damage }
  return {
    damage,
    scaling: (base === 0
      ? [5, 11, 17]
      : Array.from({ length: 9 - base }, (_, i) => base + i + 1)
    ).map((level, step) => ({
      by: base === 0 ? 'character' : 'slot',
      level,
      damage: damage.map((part, index) => {
        const [count, rest] = part.formula.split('d')
        return {
          ...part,
          formula: `${Number(count) + (increments[index] ?? 0) * (step + 1)}d${rest}`,
        }
      }),
    })),
  }
}

/** Anchor a non-concentration condition to the affected creature’s next turn end. */
export function nextTurnCondition(state: ConditionName, multi = false): SpellEffectDef {
  return {
    summary: `${state} until the end of its next turn`,
    targeting: 'enemy',
    multi,
    build: ({ source, target }) => [
      condition(state, {
        source: target?.combatantId ?? source,
        duration: target ? { type: 'untilSourceTurn', when: 'endOfTurn' } : { type: 'manual' },
      }),
    ],
  }
}

/** Bind authored casting rules to one exact source, edition, and printed name. */
export function sourceProfile(
  source: Spell['source'],
  edition: Spell['edition'],
  name: string,
  profile: Omit<ReviewedSpellCasting, 'source' | 'edition' | 'name'>,
): ReviewedSpellCasting {
  return { ...profile, source, edition, name }
}

/** Keep conditional and later-triggered rules visible without applying broad modifiers. */
export function ruleReminder(
  name: string,
  note: string,
  duration: EffectDuration,
  targeting: SpellEffectDef['targeting'] = 'enemy',
  multi = false,
  durationNote?: string,
): SpellEffectDef {
  return {
    summary: note,
    targeting,
    multi,
    build: ({ source }) => [
      {
        ...reminder(name, note, { source, duration: { ...duration } }),
        ...(durationNote && { durationNote }),
      },
    ],
  }
}
