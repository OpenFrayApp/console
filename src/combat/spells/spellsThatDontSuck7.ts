// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import type { ReviewedSpellCasting } from '../reviewedSpells.ts'
import { sourceProfile } from './reviewedProfile.ts'

export const SPELLS_THAT_DONT_SUCK_7: Record<string, ReviewedSpellCasting> = {
  'somanyrobots-spells-that-dont-suck:wound': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Wound',
    {
      mechanics: {
        save: { ability: 'con', onSave: 'half' },
        damage: [{ formula: '14d6', type: 'necrotic' }],
      },
    },
  ),
}
