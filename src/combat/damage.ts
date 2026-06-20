// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import type { Combatant } from '../schema/combatant.ts'
import type { DamageType } from '../schema/primitives.ts'

/** How a target's defenses modify one type of incoming damage. */
export type DamageRelation = 'normal' | 'resistant' | 'immune' | 'vulnerable'

/**
 * A target's relation to a damage type, from its stat block.
 *
 * Monster resistances/immunities/vulnerabilities are board data we have, so they
 * are applied automatically. A **PC's** resistances come from race/class — their
 * *build* — which OpenFray deliberately does not track (the scope rule). So PC
 * damage is never auto-adjusted; the DM edits it from what the player declares.
 */
export function damageRelation(target: Combatant, type: DamageType): DamageRelation {
  if (target.isPC) return 'normal'
  const has = (list?: string[]): boolean =>
    (list ?? []).some((entry) => entry.toLowerCase() === type)
  const { creature } = target
  if (has(creature.immunities)) return 'immune'
  if (has(creature.vulnerabilities)) return 'vulnerable'
  if (has(creature.resistances)) return 'resistant'
  return 'normal'
}

/** Apply a defense relation to a damage amount (immune → 0, resist → half, vuln → ×2). */
export function adjustForDefense(amount: number, relation: DamageRelation): number {
  const dmg = Math.max(0, Math.floor(amount))
  switch (relation) {
    case 'immune':
      return 0
    case 'resistant':
      return Math.floor(dmg / 2)
    case 'vulnerable':
      return dmg * 2
    default:
      return dmg
  }
}

/** Short tag for the UI, e.g. "resist", or `null` when damage is unmodified. */
export function relationLabel(relation: DamageRelation): string | null {
  switch (relation) {
    case 'immune':
      return 'immune'
    case 'resistant':
      return 'resist'
    case 'vulnerable':
      return 'vuln'
    default:
      return null
  }
}
