// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import type { ConditionName } from '../../schema/effect.ts'
import type { SpellEffectDef } from './shared.ts'
import type { ReviewedSpellCasting } from '../reviewedSpells.ts'
import { sourceProfile } from './reviewedProfile.ts'
import { condition } from '../effects.ts'

/** Bind an authored Deep Magic verdict to its approved source, edition, and name. */
export function deepMagicProfile(
  name: string,
  rules: Omit<ReviewedSpellCasting, 'source' | 'edition' | 'name'>,
) {
  return sourceProfile('kobold-press-deepm', '5.0', name, rules)
}

/** Keep independent initial conditions on the printed caster or affected-creature turn boundary. */
export function deepMagicTurnConditions(
  states: ConditionName[],
  owner: 'caster' | 'target',
  when: 'startOfTurn' | 'endOfTurn',
  multi = false,
): SpellEffectDef {
  return {
    summary: `${states.join(' and ')} until ${owner === 'caster' ? 'caster' : 'affected creature'} next turn ${when === 'startOfTurn' ? 'start' : 'end'}`,
    targeting: 'enemy',
    multi,
    build: ({ source, target }) =>
      states.map((state) => ({
        ...condition(state, {
          source: owner === 'caster' ? source : (target?.combatantId ?? source),
          duration:
            owner === 'target' && !target ? { type: 'manual' } : { type: 'untilSourceTurn', when },
        }),
        concentration: false,
        durationNote: `Until ${owner === 'caster' ? 'caster' : 'affected creature'} next turn ${when === 'startOfTurn' ? 'start' : 'end'}`,
      })),
  }
}
