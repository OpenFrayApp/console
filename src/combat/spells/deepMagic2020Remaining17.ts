// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import type { ReviewedSpellCasting } from '../reviewedSpells.ts'
import { deepMagicProfile } from './deepMagic2020Profile.ts'
import { ruleReminder } from './reviewedProfile.ts'

export const DEEP_MAGIC_2020_REMAINING_17: Record<string, ReviewedSpellCasting> = {
  'kobold-press-deepm:wresting-wind': deepMagicProfile('Wresting Wind', {
    mechanics: { save: { ability: 'str', onSave: 'negates' } },
    manual:
      'Enemies in sphere failure drop all held items, landing 10 feet randomly. Inventory/position manual.',
  }),
  'kobold-press-deepm:writhing-arms': deepMagicProfile('Writhing Arms', {
    effect: ruleReminder(
      'Writhing Arms',
      'Transform arms, cannot hold weapons/items/components. Later action melee hit 1d10 necrotic/grapple, later action automatic grapple damage; +1d10 higher slots. No initial attack.',
      { type: 'rounds', rounds: 10 },
      'self',
      false,
      'up to 1 minute',
    ),
    manual:
      'Transform arms, cannot hold weapons/items/components. Later action melee hit 1d10 necrotic/grapple, later action automatic grapple damage; +1d10 higher slots. No initial attack.',
  }),
  'kobold-press-deepm:yellow-sign': deepMagicProfile('Yellow Sign', {
    mechanics: { save: { ability: 'wis', onSave: 'negates' } },
    effect: ruleReminder(
      'Yellow Sign',
      'Humanoid failure charmed and long-term madness for rolled 1d10 hours; combat versus caster/allies grants save advantage. Friendly harm ends charm, Remove Curse both; rolled timers/manual.',
      { type: 'manual' },
      'enemy',
      true,
      'Track printed consequence and endpoint manually',
    ),
    manual:
      'Humanoid failure charmed and long-term madness for rolled 1d10 hours; combat versus caster/allies grants save advantage. Friendly harm ends charm, Remove Curse both; rolled timers/manual.',
  }),
}
