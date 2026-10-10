// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import type { Spell } from '../../schema/spell.ts'
import { isReferenceOnlySpell } from '../../compendium/libraries.ts'
import { reviewedSpellCasting } from '../../combat/reviewedSpells.ts'

/** Show manual casting rules beside reviewed resolvers and unreviewed reference cards. */
export function SpellCastingNote({ spell }: { spell?: Spell }) {
  if (!spell) return null
  const reviewed = reviewedSpellCasting(spell)
  if (!reviewed && !isReferenceOnlySpell(spell)) return null
  const automated = reviewed?.mechanics || reviewed?.effect
  return (
    <p className="mb-3 text-sm text-slate-600 dark:text-slate-400">
      <strong>{automated ? 'GM resolution: ' : 'Manual spell: '}</strong>
      {reviewed?.manual ??
        'Resolve saves, checks, damage, and target effects manually. Casting records the spell and tracks concentration; it does not resolve these rules.'}
    </p>
  )
}
