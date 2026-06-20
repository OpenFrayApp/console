// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import type { ConditionName } from '../schema/effect.ts'
import type { AdvantageState } from '../dice/formula.ts'

export type AttackRange = 'melee' | 'ranged'

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
