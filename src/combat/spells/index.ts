// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import type { SpellEffectTable } from './shared.ts'
import { AREA_SPELLS } from './areas.ts'
import { BUFF_SPELLS } from './buffs.ts'
import { DEBUFF_SPELLS } from './debuffs.ts'
import { RIDER_SPELLS } from './riders.ts'

/** Merge the category tables, refusing a key that two files both claim. */
function merge(...tables: SpellEffectTable[]): SpellEffectTable {
  const out: SpellEffectTable = {}
  for (const table of tables) {
    for (const [key, def] of Object.entries(table)) {
      if (key in out) throw new Error(`Duplicate spell effect: ${key}`)
      out[key] = def
    }
  }
  return out
}

export const SPELL_EFFECTS = merge(BUFF_SPELLS, DEBUFF_SPELLS, RIDER_SPELLS, AREA_SPELLS)
