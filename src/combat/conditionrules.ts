// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import type { ConditionName } from '../schema/effect.ts'
import type { Combatant } from '../schema/combatant.ts'
import type { AdvantageState } from '../dice/formula.ts'

export type AttackRange = 'melee' | 'ranged'

/**
 * Whether a melee hit on this creature is an automatic critical hit — 5e's rule
 * that any attack hitting a Paralyzed or Unconscious creature from within 5 ft is a
 * crit. We don't track positioning, but a melee action implies reach, so the caller
 * pairs this with a melee-kind action. Covers the Unconscious life-state (a downed
 * PC) and the Paralyzed condition (any creature).
 */
export function meleeHitAutoCrits(target: Combatant): boolean {
  if (target.status === 'unconscious') return true
  return target.effects.some((e) => e.icon === 'condition' && e.name === 'Paralyzed')
}

/**
 * How a 5e (2024) condition on a creature affects ATTACK ROLLS — both the
 * creature's own attacks ('attacker') and attacks made against it ('defender').
 * Returns the advantage/disadvantage it contributes, or null.
 *
 * Range matters for Prone: an attacker within 5 ft (melee) has Advantage, a
 * ranged attacker has Disadvantage. Defaults to melee when unspecified.
 *
 * Only the attack-roll consequences are modelled here. Auto-failed STR/DEX saves
 * and crit-on-hit-within-5-ft (Paralyzed/Unconscious) are separate and not folded
 * into the roll. Frightened assumes the source of fear is in sight (DM adjudicates).
 */
export function conditionAttackAdvantage(
  condition: ConditionName,
  role: 'attacker' | 'defender',
  range: AttackRange = 'melee',
): AdvantageState | null {
  if (role === 'attacker') {
    switch (condition) {
      case 'Blinded':
      case 'Frightened':
      case 'Poisoned':
      case 'Prone':
      case 'Restrained':
        return 'disadvantage'
      case 'Invisible':
        return 'advantage'
      default:
        return null
    }
  }

  switch (condition) {
    case 'Blinded':
    case 'Paralyzed':
    case 'Petrified':
    case 'Restrained':
    case 'Stunned':
    case 'Unconscious':
      return 'advantage'
    case 'Prone':
      return range === 'ranged' ? 'disadvantage' : 'advantage'
    case 'Invisible':
      return 'disadvantage'
    default:
      return null
  }
}
