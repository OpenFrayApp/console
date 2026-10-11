// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import type { ReviewedSpellCasting } from '../reviewedSpells.ts'
import { deepMagicProfile } from './deepMagic2020Profile.ts'
import { boardEffect } from './reviewedProfile.ts'

export const DEEP_MAGIC_2020_REMAINING_17: Record<string, ReviewedSpellCasting> = {
  'kobold-press-deepm:wresting-wind': deepMagicProfile('Wresting Wind', {
    mechanics: { save: { ability: 'str', onSave: 'negates' } },
  }),
  'kobold-press-deepm:writhing-arms': deepMagicProfile('Writhing Arms', {
    effect: boardEffect(
      'Writhing Arms',
      [
        {
          note: 'Tentacle arms: 1d10 necrotic; cannot hold items',
          duration: { type: 'rounds', rounds: 10 },
        },
      ],
      {
        summary: 'Tentacle arms: 1d10 necrotic; cannot hold items',
        targeting: 'self',
        multi: false,
      },
    ),
  }),
  'kobold-press-deepm:yellow-sign': deepMagicProfile('Yellow Sign', {
    mechanics: { save: { ability: 'wis', onSave: 'negates' } },
    effect: boardEffect(
      'Yellow Sign',
      [{ note: 'Long-term madness' }, { condition: 'Charmed', duration: { type: 'manual' } }],
      { summary: 'Long-term madness; Charmed', targeting: 'enemy', multi: true },
    ),
  }),
}
