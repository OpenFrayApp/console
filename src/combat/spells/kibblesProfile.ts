// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import type { ReviewedSpellCasting } from '../reviewedSpells.ts'
import { sourceProfile } from './reviewedProfile.ts'
export { reviewedDamage as kibblesDamage } from './reviewedProfile.ts'

/** Bind one authored Kibbles verdict to its approved identity. */
export function kibblesProfile(
  name: string,
  profile: Omit<ReviewedSpellCasting, 'source' | 'edition' | 'name'>,
): ReviewedSpellCasting {
  return sourceProfile('kibblestasty-casting-compendium-v2.3', '5.0', name, profile)
}
