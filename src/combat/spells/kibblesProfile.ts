// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import type { SpellMechanics } from '../../schema/spell.ts'
import type { ReviewedSpellCasting } from '../reviewedSpells.ts'
import { sourceProfile } from './reviewedProfile.ts'

/** Author initial damage and its explicit slot or cantrip progression without reading spell prose. */
export function kibblesDamage(
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

/** Bind one authored Kibbles verdict to its approved identity. */
export function kibblesProfile(
  name: string,
  profile: Omit<ReviewedSpellCasting, 'source' | 'edition' | 'name'>,
): ReviewedSpellCasting {
  return sourceProfile('kibblestasty-casting-compendium-v2.3', '5.0', name, profile)
}
