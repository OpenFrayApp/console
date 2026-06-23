// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import type { Combatant } from '../schema/combatant.ts'
import type { DamageType } from '../schema/primitives.ts'

/** How a target's defenses modify one type of incoming damage. */
export type DamageRelation = 'normal' | 'resistant' | 'immune' | 'vulnerable'

/**
 * A target's relation to a damage type. Monster defenses come from the stat
 * block; a PC's come from what the GM entered on the Add-PC form. A quick add
 * (no defenses) is always `normal`.
 */
export function damageRelation(target: Combatant, type: DamageType): DamageRelation {
  const src = target.isPC ? target : target.creature
  const has = (list?: string[]): boolean =>
    (list ?? []).some((entry) => entry.toLowerCase() === type)
  if (has(src.immunities)) return 'immune'
  if (has(src.vulnerabilities)) return 'vulnerable'
  if (has(src.resistances)) return 'resistant'
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
