// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { reminder } from '../effects.ts'
import { timedDuration, type SpellEffectTable } from './shared.ts'

/**
 * Marks and smites — the caster adds dice when they hit. We never auto-roll the
 * rider; the reminder badge is the consequence, and the GM adds the dice.
 */

export const RIDER_SPELLS: SpellEffectTable = {
  hex: {
    summary: '+1d6 necrotic on the caster’s hits; disadvantage on one ability',
    targeting: 'enemy',
    build: ({ source, spell }) => [
      reminder('Hex', '+1d6 necrotic on hits', { source, duration: timedDuration(spell) }),
    ],
  },
  "hunter's mark": {
    summary: '+1d6 to the caster’s weapon damage vs this target',
    targeting: 'enemy',
    build: ({ source, spell }) => [
      reminder("Hunter's Mark", '+1d6 from the caster', { source, duration: timedDuration(spell) }),
    ],
  },
  'divine favor': {
    summary: '+1d4 radiant on the caster’s weapon hits',
    targeting: 'self',
    build: ({ source, spell }) => [
      reminder('Divine Favor', '+1d4 radiant on hits', { source, duration: timedDuration(spell) }),
    ],
  },
  'searing smite': {
    summary: '+1d6 fire on the hit, and it burns each turn',
    targeting: 'self',
    build: ({ source, spell }) => [
      reminder('Searing Smite', '+1d6 fire on the hit', { source, duration: timedDuration(spell) }),
    ],
  },
  'branding smite': {
    summary: '+2d6 radiant on the next hit; the target sheds light',
    targeting: 'self',
    build: ({ source, spell }) => [
      reminder('Branding Smite', '+2d6 radiant on the hit', {
        source,
        duration: timedDuration(spell),
      }),
    ],
  },
  'shining smite': {
    summary: '+2d6 radiant on the hit; the target glows and can’t hide',
    targeting: 'self',
    build: ({ source, spell }) => [
      reminder('Shining Smite', '+2d6 radiant; visible', {
        source,
        duration: timedDuration(spell),
      }),
    ],
  },
}
