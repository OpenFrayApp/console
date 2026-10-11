// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import type { ConditionName, EffectDuration, EffectModifier } from '../../schema/effect.ts'
import type { Ability } from '../../schema/primitives.ts'
import type { Spell, SpellMechanics } from '../../schema/spell.ts'
import { condition, modifierEffect, reminder } from '../effects.ts'
import type { ReviewedSpellCasting } from '../reviewedSpells.ts'
import { timedDuration, type SpellEffectDef } from './shared.ts'

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

type BoardConsequence = (
  | { condition: ConditionName; modifier?: never; note?: never }
  | { modifier: EffectModifier; condition?: never; note?: string }
  | { note: string; condition?: never; modifier?: never }
) & {
  duration?: EffectDuration | 'escape'
  fallbackDuration?: EffectDuration
  escapeAbility?: Ability
  turnOwner?: 'target'
  concentration?: false
  durationNote?: string
}

/** Build authored creature consequences using the same effect shapes as the Core tables. */
export function boardEffect(
  name: string,
  consequences: BoardConsequence[],
  options: Pick<SpellEffectDef, 'summary' | 'targeting' | 'multi'>,
): SpellEffectDef {
  return {
    ...options,
    build: ({ source, target, spell, save }) =>
      consequences.map((consequence) => {
        const duration =
          consequence.duration === 'escape'
            ? save
              ? {
                  type: 'saveEnds' as const,
                  save: { ...save, ability: consequence.escapeAbility ?? save.ability },
                  when: 'endOfTurn' as const,
                }
              : (consequence.fallbackDuration ?? timedDuration(spell))
            : (consequence.duration ?? timedDuration(spell))
        const opts = {
          source: consequence.turnOwner === 'target' ? (target?.combatantId ?? source) : source,
          duration:
            consequence.turnOwner === 'target' && !target
              ? { type: 'manual' as const }
              : { ...duration },
        }
        const effect = consequence.condition
          ? condition(consequence.condition, opts)
          : consequence.modifier
            ? modifierEffect({ name, ...consequence.modifier }, { ...opts, note: consequence.note })
            : reminder(name, consequence.note!, opts)
        return {
          ...effect,
          ...(consequence.concentration === false && { concentration: false as const }),
          ...(consequence.durationNote && { durationNote: consequence.durationNote }),
        }
      }),
  }
}
